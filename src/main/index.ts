process.env.WECHATY_PUPPET = 'wechaty-puppet-wechat4u'

import { app, BrowserWindow, ipcMain, Notification, dialog } from 'electron'
import * as path from 'path'
import axios from 'axios'
import { Wechaty, Message, Contact, Room } from 'wechaty'
import { autoUpdater } from 'electron-updater'
import ConfigManager from './config'
import { logger } from './utils/logger'
import { updateLogger } from './utils/update-logger'
import { scheduleManager } from './utils/scheduler'
import { AppError, ErrorCode, ErrorRecoveryStrategy } from '../shared/types/errors'
import QRCode from 'qrcode'
import { errorRecoveryManager } from './utils/error-recovery'
import { errorNotificationManager } from './utils/error-notification'
import { errorMonitor } from './utils/error-monitor'
import * as dotenv from 'dotenv';
import { Puppet } from 'wechaty-puppet';
import { AitiwoService } from './services/aitiwo';
import { CronJob } from 'cron';
import { Config } from '../shared/types/config';
import { LogItem } from '../shared/types/logger';
import * as fs from 'fs';

// 添加 Contact 类型扩展
interface ExtendedContact extends Contact {
    say(text: string): Promise<void | Message>;
}

// 改 ExtendedWechaty 接口定义
interface ExtendedWechaty extends Wechaty {
  isEnabled: boolean;
  puppet: {
    isLoggedIn: boolean;
  } & Puppet;
  userSelf: () => Promise<Contact>;
  currentUser: () => Promise<Contact>;
  stop(): Promise<void>;
  on(event: 'scan', listener: (qrcode: string, status: number) => void): this;
  on(event: 'login', listener: (user: Contact) => void): this;
  on(event: 'logout', listener: (user: Contact) => void): this;
  on(event: 'message', listener: (message: Message) => void): this;
}

// 在文件顶部声明 wechaty 相关的变量
const wechaty = require('wechaty')
const { WechatyBuilder } = wechaty
const { ScanStatus } = require('wechaty-puppet')
export let botInstance: ExtendedWechaty | null = null;
let qrcodeWindow: BrowserWindow | null = null;
let isStarting = false;


// 在文件顶部声明接口
interface MainWindow extends BrowserWindow {
  webContents: Electron.WebContents
}

interface PlatformAPI {
  BASE_URL: string
  LOGIN: string
  GET_KB_CONFIG: string
}

// 全局变量声明（只声明一次）
let mainWindow: MainWindow
let botProcess: Wechaty | null = null
let connectionCheckInterval: NodeJS.Timeout | null = null
let reconnectTimer: NodeJS.Timeout | null = null
let retryCount = 0
let consecutiveFailures = 0;

// 添加二维码相关的变量声明
let qrcodePromise: Promise<string>;
let qrcodeResolve: (value: string) => void;
let qrcodeReject: (reason?: any) => void;

// 常量声明
const MAX_RETRIES = 5
const CHECK_INTERVAL = 30000
const RECONNECT_INTERVAL = 30000

const PLATFORM_API: PlatformAPI = {
  BASE_URL: 'https://your-platform-api.com',
  LOGIN: '/api/login',
  GET_KB_CONFIG: '/api/kb/config'
}

let qrcodeData: string | null = null

// 添加重连相关的函数
async function reconnectBot(): Promise<void> {
  try {
    logger.info('Recovery', '尝试重新连接机器人');
    const config = ConfigManager.getConfig();
    await startBot(config, mainWindow);
  } catch (error) {
    logger.error('Recovery', '重连失败', error);
    throw error;
  }
}

async function checkNetworkAndReconnect(): Promise<void> {
  try {
    logger.info('Recovery', '检查网络连');
    // 添加检查
    if (!mainWindow) {
      throw new AppError('主口未初始化', ErrorCode.SYSTEM_ERROR);
    }
    const config = ConfigManager.getConfig();
    // 添加 mainWindow 参数
    await startBot(config, mainWindow);
  } catch (error) {
    logger.error('Recovery', '网络检查失败', error);
    throw error;
  }
}

// 定义错误复策略
const defaultRecoveryStrategy: ErrorRecoveryStrategy = {
  maxRetries: 3,
  retryDelay: 5000,
  shouldRetry: (error: AppError) => error.recoverable,
  onRetry: (error: AppError, attempt: number) => {
    logger.warn('Recovery', `尝试恢复 (${attempt})`, {
      error: error.message,
      code: error.code
    });
  },
  onMaxRetriesExceeded: (error: AppError) => {
    logger.error('Recovery', '超过最重试次数', {
      error: error.message,
      code: error.code
    });
  }
};

// 错误恢复处理
async function handleErrorWithRecovery(
  error: Error, 
  strategy: ErrorRecoveryStrategy = defaultRecoveryStrategy,
  attempt: number = 1
) {
  if (!(error instanceof AppError) || !strategy.shouldRetry(error)) {
    handleGlobalError(error);
    return;
  }

  if (attempt <= strategy.maxRetries) {
    strategy.onRetry(error as AppError, attempt);
    await new Promise(resolve => setTimeout(resolve, strategy.retryDelay));
    
    try {
      // 根据错误类型执行恢复操作
      switch ((error as AppError).code) {
        case ErrorCode.BOT_DISCONNECTED:
          await reconnectBot();
          break;
        case ErrorCode.NETWORK_DISCONNECTED:
          await checkNetworkAndReconnect();
          break;
        // ... 其他恢复操作
      }
    } catch (retryError) {
      if (retryError instanceof Error) {
        await handleErrorWithRecovery(retryError, strategy, attempt + 1);
      } else {
        throw new AppError('未错', ErrorCode.SYSTEM_RESOURCE_ERROR);
      }
    }
  } else {
    strategy.onMaxRetriesExceeded(error as AppError);
  }

  if (error.message.includes('memory-card')) {
    logger.warn('Bot', '检测到 memory-card 错误，尝试清理并重新启动');
    const memoryCardPath = path.join(app.getPath('userData'), 'WechatEveryDay.memory-card.json');
    if (fs.existsSync(memoryCardPath)) {
      fs.unlinkSync(memoryCardPath);
    }
    
    // 重新启动机器人
    const config = ConfigManager.getConfig();
    if (!mainWindow) {
      throw new Error('主窗口未初始化');
    }
    await startBot(config, mainWindow);
  }
}

// 全错误处理
function handleGlobalError(error: Error) {
  logger.error('Global', '未捕获的错误', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });
}

// Promise 错误处理
function handleUnhandledRejection(reason: any) {
  logger.error('Global', '未处理的 Promise 拒绝', {
    reason: reason instanceof Error ? {
      name: reason.name,
      message: reason.message,
      stack: reason.stack
    } : reason
  });
}

// IPC 错误处理
function handleIpcError(error: Error, methodName: string) {
  logger.error('IPC', `${methodName} 调用失败`, {
    name: error.name,
    message: error.message,
    stack: error.stack
  });

  return {
    success: false,
    error: error instanceof AppError ? error.message : '操作失败，请稍后重试'
  };
}

// 注册全局错误处理器
process.on('uncaughtException', handleGlobalError);
process.on('unhandledRejection', handleUnhandledRejection);

// 使用错误处理包装 IPC 处理器
function wrapIpcHandler(methodName: string, handler: (...args: any[]) => Promise<any>) {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleIpcError(error as Error, methodName);
    }
  };
}

// 窗口错误处理
function handleWindowError(window: BrowserWindow) {
  window.webContents.on('crashed', (event) => {
    logger.error('Window', '渲染进程崩溃', event);
    // 可以选择重新加载关闭窗口
    window.reload();
  });

  window.on('unresponsive', () => {
    logger.error('Window', '窗口无响应');
    // 可以选择重新加载或关闭窗口
    window.reload();
  });

  window.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error('Window', '页面加载失败', {
      errorCode,
      errorDescription
    });
  });
}

function createWindow(): void {
  // 检查否已经存在窗口
  if (mainWindow) {
    // 如果窗口已存在，只需要显示它
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    }
  }) as MainWindow;

  const indexPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '..', 'index.html')
    : path.join(__dirname, '..', 'index.html');

  logger.info('Window', `加载页面路径: ${indexPath}`);
  mainWindow.loadFile(indexPath).catch(err => {
    logger.error('Window', '加载页面失败', err);
    logger.error('Window', '路径信息', {
      __dirname,
      indexPath,
      exists: fs.existsSync(indexPath)
    });
  });

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on('dom-ready', () => {
    logger.info('Window', 'DOM 准备');
  });

  logger.setMainWindow(mainWindow);
  errorNotificationManager.setMainWindow(mainWindow);
  errorRecoveryManager.setMainWindow(mainWindow);
  scheduleManager.setMainWindow(mainWindow);

  handleWindowError(mainWindow);

  // 修改 CSP 设置方式
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        // 删任现有的 CSP 头
        'Content-Security-Policy': [''],
        // 添加新的 CSP 头
        'content-security-policy': [
          "default-src 'self';",
          "img-src 'self' data: blob: https:;",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
          "style-src 'self' 'unsafe-inline';",
          "connect-src 'self' data: blob:;"
        ].join(' ')
      }
    });
  });
}

// 修改 startBot 函数
async function startBot(config: Config, mainWindow: BrowserWindow): Promise<string> {
    try {
        // 检查并清理损坏的 memory-card 文件
        const memoryCardPath = path.join(app.getPath('userData'), 'WechatEveryDay.memory-card.json');
        if (fs.existsSync(memoryCardPath)) {
            try {
                // 尝试读取文件验证 JSON 格式
                const content = fs.readFileSync(memoryCardPath, 'utf-8');
                JSON.parse(content);
            } catch (error) {
                // JSON 解析失败，说明文件损坏，删除它
                logger.warn('Bot', 'Memory card 文件损坏，正在删除');
                fs.unlinkSync(memoryCardPath);
            }
        }

        logger.info('Bot', '开始创建机器人实例...');
        
        // API Key 检查
        if (!config.aitiwoKey) {
            logger.warn('Bot', 'API Key 未置');
            mainWindow.webContents.send('key-message', {
                type: 'warning',
                message: '请先设置 API Key。您可以前往 qiye.aitiwo.com 创建机器人并获取 API Key。'
            });
            throw new AppError('请先设置 API Key', ErrorCode.CONFIG_INVALID);
        }

        // 如果已有实例在运行，先停止
        if (botInstance) {
            logger.info('Bot', '停止现有机器人实例');
            await botInstance.stop();
            botInstance = null;
        }

        // 创建新实例
        botInstance = WechatyBuilder.build({
            name: 'wechat-bot',
            puppet: 'wechaty-puppet-wechat4u',
            puppetOptions: {
                uos: true
            }
        }) as ExtendedWechaty;

        // 设置事件监听
        botInstance
            .on('scan', async (qrcode: string, status: any) => {
                logger.info('Bot', '收到扫码事件');
                try {
                    const qrcodeDataUrl = await QRCode.toDataURL(qrcode);
                    logger.info('Bot', '二维码图片生成成功');
                    createQRCodeWindow(qrcodeDataUrl);
                } catch (error) {
                    logger.error('Bot', '生成二维码失败', error);
                }
            })
            .on('login', async (user: any) => {
                logger.info('Bot', '登录成功，开始处理登录事件', { userName: user.name() });
                
                // 确保���闭二维码窗口
                try {
                    closeQRCodeWindow();
                } catch (error) {
                    logger.error('Bot', '关闭二维码窗口失败', error);
                }

                // 更新配置中的登录状态
                ConfigManager.updateBotStatus({
                    isLoggedIn: true,
                    userName: user.name()
                });

                // 确保 mainWindow 存在
                if (!mainWindow) {
                    throw new Error('主窗口未初始化');
                }

                // 发送登录���功消息到渲染进程
                mainWindow.webContents.send('key-message', {
                    type: 'success',
                    message: `微信登录成功，用户：${user.name()}`
                });

                // 发送状态更新事件
                mainWindow.webContents.send('bot-event', 'login', { 
                    userName: user.name(),
                    status: 'running',
                    message: '机器人已启动并正在运行'
                });

                // 设置机器人实例到调度管理器
                scheduleManager.setBot(botInstance as unknown as Wechaty);

                logger.info('Bot', '登录事件处理完成，已发送所有通知');
            })
            .on('message', async (message: Message) => {
                try {
                    // 如果消息来自自己，忽略
                    if (message.self()) {
                        return;
                    }

                    // 获取配置
                    const config = ConfigManager.getConfig();
                    const aiService = new AitiwoService(config.aitiwoKey);

                    // 获取消息本
                    const text = message.text();
                    if (!text) return;

                    // 检查是否来自群聊
                    const room = message.room();
                    if (room) {
                        const topic = await room.topic();
                        // 检查群是否在白名单中
                        if (!config.roomWhitelist.includes(topic)) {
                            return;
                        }

                        // 检查是否 @ 了机器人
                        const botName = config.botName;
                        if (botName && !text.includes(`@${botName}`)) {
                            return;  // 如果设置了机器人名称但消息中没有 @ 机器人，则忽略
                        }

                        // 移除 @ 部分，只留实际消息内容
                        let actualMessage = botName ? text.replace(`@${botName}`, '').trim() : text;

                        // 检查前缀匹配
                        const prefix = config.autoReplyPrefix;
                        if (prefix && !actualMessage.startsWith(prefix)) {
                            return;  // 如果设置了前缀但消息不以前缀开头，则忽略
                        }

                        // 如果有前缀，移除前缀
                        if (prefix) {
                            actualMessage = actualMessage.substring(prefix.length).trim();
                        }

                        logger.info('Bot', '收到群消息', {
                            room: topic,
                            message: actualMessage
                        });

                        // 记录收到的消息
                        logger.info('AI', `收到消息`, {
                            type: 'group_chat',
                            from: topic,
                            message: actualMessage,
                            time: new Date().toLocaleString()
                        });

                        // 调用 AI 服前记录
                        logger.info('AI', `开始处理消息`, {
                            type: 'group_chat',
                            from: topic,
                            message: actualMessage,
                            time: new Date().toLocaleString()
                        });

                        // 调用 AI 服务
                        const reply = await aiService.chat(actualMessage);
                        
                        // 记录 AI 回复
                        logger.info('AI', `生成回复`, {
                            type: 'group_chat',
                            from: topic,
                            originalMessage: actualMessage,
                            reply: reply,
                            time: new Date().toLocaleString()
                        });

                        // 发送回复
                        await room.say(reply);
                        
                        logger.info('Bot', '已回复群消息', {
                            room: topic,
                            reply
                        });

                        // 记录发送成功
                        logger.info('AI', `回复发送成功`, {
                            type: 'group_chat',
                            to: topic,
                            reply: reply,
                            time: new Date().toLocaleString()
                        });
                    } else {
                        // 私聊消息处理
                        const talker = message.talker();
                        if (!config.contactWhitelist.includes(talker.name())) {
                            return;
                        }

                        // 检查前缀匹配（私聊消息）
                        const prefix = config.autoReplyPrefix;
                        if (prefix && !text.startsWith(prefix)) {
                            return;
                        }

                        // 如果有前缀，移除前缀
                        const actualMessage = prefix ? text.substring(prefix.length).trim() : text;

                        // 记录收到的消息
                        logger.info('AI', `收到私聊消息`, {
                            type: 'private_chat',
                            from: talker.name(),
                            message: actualMessage,
                            time: new Date().toLocaleString()
                        });

                        // 调用 AI 服务并回复
                        const reply = await aiService.chat(actualMessage);

                        // 记录 AI 回复
                        logger.info('AI', `生成私聊回复`, {
                            type: 'private_chat',
                            to: talker.name(),
                            originalMessage: actualMessage,
                            reply: reply,
                            time: new Date().toLocaleString()
                        });

                        // 使用 Contact 的 say 方法发送回复
                        await (talker as any).say(reply);

                        // 记录发送成功
                        logger.info('AI', `私聊回复发送成功`, {
                            type: 'private_chat',
                            to: talker.name(),
                            reply: reply,
                            time: new Date().toLocaleString()
                        });
                    }
                } catch (error) {
                    logger.error('Bot', '处理消息失败', error);
                }
            });

        // 启动机器人并开始状态监控
        await botInstance.start();
        logger.info('Bot', '机器人启动成功');
        
        // 启动稳定性措施
        startHeartbeat();
        startStatusMonitor();
        
        return '';
    } catch (error) {
        logger.error('Bot', '启动失败', error);
        throw error;
    }
}

function startConnectionCheck(): void {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval)
  }

  connectionCheckInterval = setInterval(async () => {
    try {
      if (botProcess) {
        const isLoggedIn = await (botProcess as any).isLoggedIn()
        mainWindow.webContents.send('wechat-status', isLoggedIn ? '已登录' : '未登录')
        
        if (!isLoggedIn) {
          handleDisconnect(new Error('微信登录状态已失效'))
        }
      }
    } catch (error) {
      handleDisconnect(error as Error)
    }
  }, CHECK_INTERVAL)
}

function handleDisconnect(error: Error): void {
  logger.error('Bot', '连接断开', error)
  mainWindow.webContents.send('log', {
    type: 'error',
    message: '连接断开，正在尝试重连...'
  })

  if (retryCount < MAX_RETRIES) {
    scheduleReconnect()
  } else {
    mainWindow.webContents.send('log', {
      type: 'error',
      message: '重连失败，请手���重启服务'
    })
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
  }

  reconnectTimer = setTimeout(async () => {
    retryCount++
    try {
      const config = ConfigManager.getConfig()
      await startBot(config, mainWindow)
      retryCount = 0
      mainWindow.webContents.send('log', {
        type: 'success',
        message: '重连成功'
      })
    } catch (error) {
      handleDisconnect(error as Error)
    }
  }, RECONNECT_INTERVAL)
}

function setupAutoUpdater(): void {
  autoUpdater.logger = updateLogger

  autoUpdater.on('checking-for-update', () => {
    logger.info('Update', '正在检查更新...')
  })

  autoUpdater.on('update-available', (info) => {
    logger.info('Update', '有可用更新', info)
    mainWindow.webContents.send('update-available')
  })

  autoUpdater.on('update-downloaded', (info) => {
    logger.info('Update', '更新', info)
    mainWindow.webContents.send('update-downloaded')
  })

  autoUpdater.on('error', (err) => {
    logger.error('Update', '更新错误', err)
  })

  setInterval(() => {
    autoUpdater.checkForUpdates()
  }, 60 * 60 * 1000)
}

// 在用启动时检查环境
app.whenReady().then(async () => {
  try {
    // 注册所有 IPC 处理器
    registerIpcHandlers();
    
    // 创建口 - 只在这里创建一次
    createWindow();
    
    // 设置自动更新
    setupAutoUpdater();
  } catch (error) {
    logger.error('App', '应用启动失败', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 错处理
process.on('uncaughtException', (error) => {
  logger.error('Process', '未捕获的异常', error)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Process', '未处理 Promise 拒绝', { reason, promise })
})

// 修改二维码窗口创建函数
function createQRCodeWindow(qrcodeDataUrl: string) {
    logger.info('Bot', '开始创建二维码窗口');
    
    // 先关闭已存在的窗口
    closeQRCodeWindow();

    qrcodeWindow = new BrowserWindow({
        width: 400,
        height: 500,
        title: '微信登录',
        autoHideMenuBar: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false
        }
    });

    // 添加窗口事件监听
    qrcodeWindow.on('closed', () => {
        logger.info('Bot', '二维码窗口被关闭');
        qrcodeWindow = null;
    });

    // 添加错误处理
    qrcodeWindow.webContents.on('crashed', () => {
        logger.error('Bot', '二维码窗口崩溃');
        closeQRCodeWindow();
    });

    qrcodeWindow.webContents.on('did-fail-load', () => {
        logger.error('Bot', '二维码窗口加载失败');
        closeQRCodeWindow();
    });

    // 修改 HTML 内容
    const html = `
        <!DOCTYPE html>
        <html>
            <head>
                <title>微信登录</title>
                <meta charset="utf-8">
                <style>
                    body {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        background: #f5f5f5;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }
                    .container {
                        text-align: center;
                        padding: 20px;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    img {
                        max-width: 280px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        padding: 10px;
                        background: white;
                    }
                    h3 {
                        color: #333;
                        margin: 0 0 20px;
                    }
                    p {
                        color: #666;
                        margin: 20px 0 0;
                        font-size: 14px;
                    }
                    .status {
                        margin-top: 10px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h3>请用微信扫码登录</h3>
                    <img src="${qrcodeDataUrl}" alt="微信登录二维码">
                    <p class="status">扫码后请在手机上确认登录</p>
                </div>
            </body>
        </html>
    `;

    qrcodeWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    
    // 设置超时自动关闭
    setupQRCodeTimeout();
    
    return qrcodeWindow;
}

// 更新二维码状态
function updateQRCodeStatus(status: string) {
    if (qrcodeWindow && !qrcodeWindow.isDestroyed()) {
        qrcodeWindow.webContents.executeJavaScript(`
            document.querySelector('.status').textContent = '${status}';
        `);
    }
}

// 显重试按钮
function showRetryButton() {
    if (qrcodeWindow && !qrcodeWindow.isDestroyed()) {
        qrcodeWindow.webContents.executeJavaScript(`
            document.querySelector('.retry-button').style.display = 'inline-block';
        `);
    }
}

// 重试制

// 添加在 retryStartBot 函数之前
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 5000; // 5秒

async function retryStartBot() {
    try {
        logger.info('Recovery', '试重新连机器人');
        const config = ConfigManager.getConfig();
        
        if (!mainWindow) {
            throw new AppError('主窗口未初始化', ErrorCode.SYSTEM_ERROR);
        }
        
        await startBot(config, mainWindow);  // 添加 mainWindow 参数
    } catch (error) {
        logger.error('Recovery', '重连失败', error);
        throw error;
    }
}

// 监听主窗口关闭事件，同时关闭二维码口
app.on('window-all-closed', () => {
    if (qrcodeWindow && !qrcodeWindow.isDestroyed()) {
        qrcodeWindow.close();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 修改状态查函数
async function checkBotStatus(): Promise<boolean> {
    if (!botInstance) {
        return false;
    }
    try {
        // 添加更详细的调试志
        logger.info('Bot', '检查登录状态', {
            botInstance: !!botInstance,
            puppet: !!botInstance.puppet,
            isLoggedIn: botInstance.puppet?.isLoggedIn
        });

        // 用 puppet 的登录状态
        const isLoggedIn = botInstance.puppet?.isLoggedIn;
        
        // 如果已登录发送状更新
        if (isLoggedIn && mainWindow) {
            const user = await botInstance.currentUser();
            mainWindow.webContents.send('bot-event', 'login', {
                userName: user.name(),
                status: 'running',
                message: '机器人已启动并正在运行'
            });
        }

        logger.info('Bot', '登录状态检查结果:', { isLoggedIn });
        return !!isLoggedIn;
    } catch (error) {
        logger.error('Bot', '检查登录状态失败', error);
        return false;
    }
}

// 修改获取实数
async function getBotInstance(config: any): Promise<any> {
    try {
        // 防止重复启动
        if (isStarting) {
            logger.info('Bot', '机器人正在启动中...');
            return botInstance;
        }

        // 如果例存在且已登录，直接返回
        if (botInstance && await checkBotStatus()) {
            logger.info('Bot', '使用现有登录状态');
            return botInstance;
        }

        // 如果有旧实例，先停止
        if (botInstance) {
            await botInstance.stop();
            botInstance = null;
        }

        isStarting = true;
        logger.info('Bot', '创建新的机器人实例...');
        
        botInstance = WechatyBuilder.build({
            name: 'wechat-bot',
            puppet: 'wechaty-puppet-wechat4u',
            puppetOptions: {
                uos: true
            }
        });

        return botInstance;
    } catch (error) {
        logger.error('Bot', '获取机器人实例失败', error);
        throw new AppError('获取机器人实例失败', ErrorCode.BOT_INIT_FAILED);
    } finally {
        isStarting = false;
    }
}

// 修改应用退出时的处理
app.on('before-quit', async () => {
    if (botInstance) {
        try {
            // 不调用 stop()，只清理引用
            botInstance = null;
            logger.info('App', '应用退出，保持微信登录状');
        } catch (error) {
            logger.error('App', '应用退出处理失败', error);
        }
    }
});

// 添加窗口关闭事件理
app.on('window-all-closed', () => {
    if (qrcodeWindow && !qrcodeWindow.isDestroyed()) {
        qrcodeWindow.close();
    }
    
    // 在 macOS 上点击关闭按钮时不退出应用
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 添加件发送函数
function sendBotEvent(event: string, data: any) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('bot-event', event, data);
    }
}

// 修改配置迁函数
async function migrateWhitelistConfig() {
    try {
        // 加载 .env 文件
        dotenv.config();
        
        // 获取白名单配置，如果为空则使用默认值
        const aliasWhitelist = process.env.ALIAS_WHITELIST || 'iamsujiang';
        const roomWhitelist = process.env.ROOM_WHITELIST || 'AI测试';

        // 证和清理白名单数据
        const contacts = aliasWhitelist
            .split(',')
            .map(item => item.trim())
            .filter(item => {
                // 滤掉值和特殊字符
                const isValid = item && !/[<>:"/\\|?*]/.test(item);
                if (!isValid && item) {
                    logger.warn('Config', `联系人白名单包含无效值: ${item}`);
                }
                return isValid;
            });

        const rooms = roomWhitelist
            .split(',')
            .map(item => item.trim())
            .filter(item => {
                // 过滤掉空值和特殊字符
                const isValid = item && !/[<>:"/\\|?*]/.test(item);
                if (!isValid && item) {
                    logger.warn('Config', `聊白名单包含无效值: ${item}`);
                }
                return isValid;
            });

        // 获当前配置
        const currentConfig = ConfigManager.getConfig();
        
        // 如果当前配置中没有白��单据，则进行迁
        if (currentConfig.contactWhitelist.length === 0 && currentConfig.roomWhitelist.length === 0) {
            logger.info('Config', '开始迁移白名单配置');
            
            // 使用默认值或环境变中的值
            const defaultContacts = contacts.length > 0 ? contacts : ['iamsujiang'];
            const defaultRooms = rooms.length > 0 ? rooms : ['AI测试'];
            
            // 设白名单
            await ConfigManager.setWhitelists(defaultContacts, defaultRooms);
            
            logger.info('Config', '白名单配置迁移成功', {
                contacts: defaultContacts,
                rooms: defaultRooms
            });

            // 通过主窗口通知用户
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('config-migrated', {
                    contacts: defaultContacts,
                    rooms: defaultRooms
                });
            }
        } else {
            logger.info('Config', '已存在白名单配置，跳过迁移');
        }
    } catch (error) {
        logger.error('Config', '白名单配迁移失败', error);
        // 记录误但不中断应用启动
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('config-migration-failed', {
                error: error instanceof Error ? error.message : '配置迁移失败'
            });
        }
    }
}

// 在文件顶部添加 AI 服务相关的常量
const AI_SERVICE_CONFIG = {
  maxRetries: 3,
  retryDelay: 2000,
  timeout: 30000
};

// 修改 callAIWithRetry 函数
async function callAIWithRetry(message: string, retryCount = 0): Promise<string> {
  const config = ConfigManager.getConfig();
  const aiService = new AitiwoService(config.aitiwoKey);
  
  try {
    // 添加超时控制
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI 服务请求超时')), AI_SERVICE_CONFIG.timeout);
    });

    const responsePromise = aiService.chat(message);
    const response = await Promise.race([responsePromise, timeoutPromise]);
    
    return response as string;
  } catch (error) {
    logger.error('Aitiwo', 'AI 服务调用失败', {
      error: error instanceof Error ? error.message : String(error),
      retryCount,
      message: message.slice(0, 100) // 只记录前100个字符
    });

    // 检查是否还可以重试
    if (retryCount < AI_SERVICE_CONFIG.maxRetries) {
      await new Promise(resolve => setTimeout(resolve, AI_SERVICE_CONFIG.retryDelay));
      return callAIWithRetry(message, retryCount + 1);
    }

    throw new AppError('AI 服务暂时不可用，请稍后重试', ErrorCode.AI_SERVICE_ERROR);
  }
}

// 添加 AI 服务状态监控
let aiServiceFailureCount = 0;
const AI_SERVICE_FAILURE_THRESHOLD = 5;

function monitorAiServiceStatus(error: Error) {
  aiServiceFailureCount++;
  
  if (aiServiceFailureCount >= AI_SERVICE_FAILURE_THRESHOLD) {
    logger.error('Aitiwo', 'AI 服务可能存在问题', {
      failureCount: aiServiceFailureCount,
      lastError: error.message
    });
    
    // 通知前端
    mainWindow?.webContents.send('key-message', {
      type: 'error',
      message: 'AI 服务可能存在问题，请检查配置或联系技术支持'
    });
    
    // 重置计数器
    aiServiceFailureCount = 0;
  }
}

// 定期重置失败计数
setInterval(() => {
  if (aiServiceFailureCount > 0) {
    aiServiceFailureCount = 0;
  }
}, 3600000); // 每小时重置一次

// 添加关闭二维码窗口的函数
function closeQRCodeWindow() {
    try {
        if (qrcodeWindow) {
            // 先检查窗口是已经被销毁
            if (!qrcodeWindow.isDestroyed()) {
                // 先移除所有监听器，防止关闭事件触发其他操作
                qrcodeWindow.removeAllListeners();
                
                // 如果口还在显示，则关闭它
                if (qrcodeWindow.isVisible()) {
                    qrcodeWindow.close();
                }
            }
            // 无论如何都清空引用
            qrcodeWindow = null;
        }
        logger.info('Bot', '二维码窗口已关闭');
    } catch (error) {
        logger.error('Bot', '关闭二维码窗口时出错', error);
        // 确保清空引用
        qrcodeWindow = null;
    }
}


// 1. 在文件顶部定义所有 IPC 通道名称
const IPC_CHANNELS = {
    // 配置相关
    GET_CONFIG: 'getConfig',
    SAVE_WHITELIST: 'save-whitelist',
    SAVE_AITIWO_KEY: 'save-aitiwo-key',
    IMPORT_WHITELIST: 'import-whitelist',
    EXPORT_WHITELIST: 'export-whitelist',
    EXPORT_LOGS: 'export-logs',
    
    // 机器人相关
    START_BOT: 'startBot',
    STOP_BOT: 'stopBot',
    
    // 定时任务相关
    GET_SCHEDULE_TASKS: 'getScheduleTasks',
    ADD_SCHEDULE_TASK: 'addScheduleTask',
    TOGGLE_SCHEDULE_TASK: 'toggleScheduleTask',
    DELETE_SCHEDULE_TASK: 'deleteScheduleTask',

    'test-direct-send': 'test-direct-send'
} as const;

// 2. 集中定义所有 IPC 处理器
const ipcHandlers = {
    // 配置相关处理器
    [IPC_CHANNELS.GET_CONFIG]: async () => {
        const config = ConfigManager.getConfig();
        return {
            roomWhitelist: config.roomWhitelist || [],
            contactWhitelist: config.contactWhitelist || [],
            aitiwoKey: config.aitiwoKey,
            schedules: config.schedules || []
        };
    },

    [IPC_CHANNELS.SAVE_WHITELIST]: async (event: any, { contacts, rooms }: any) => {
        await ConfigManager.setWhitelists(contacts, rooms);
        // 发送白名单更新通知
        mainWindow?.webContents.send('whitelist-updated');
        return { success: true };
    },

    [IPC_CHANNELS.SAVE_AITIWO_KEY]: async (event: any, key: string) => {
        await ConfigManager.setAitiwoKey(key);
        return { success: true };
    },

    // 机器人相关处理器
    [IPC_CHANNELS.START_BOT]: async () => {
        const config = ConfigManager.getConfig();
        if (!config.aitiwoKey) {
            throw new AppError('请设置 API Key', ErrorCode.CONFIG_INVALID);
        }
        if (!mainWindow) {
            throw new AppError('主窗口未初始化', ErrorCode.SYSTEM_ERROR);
        }
        const qrcode = await startBot(config, mainWindow);
        return { 
            success: true,
            message: qrcode ? '请扫码登录' : '机器人已启动'
        };
    },

    [IPC_CHANNELS.STOP_BOT]: async () => {
        if (!botInstance) {
            return { success: true, message: '机器人已经停止' };
        }
        botInstance.isEnabled = false;
        return { success: true, message: '机器人已暂停自动回复' };
    },

    // 定时任务相关处理器
    [IPC_CHANNELS.GET_SCHEDULE_TASKS]: async () => {
        return ConfigManager.getConfig().schedules || [];
    },

    [IPC_CHANNELS.ADD_SCHEDULE_TASK]: async (event: any, task: any) => {
        try {
            // 1. 保存到配置
            ConfigManager.addScheduleTask(task);
            
            // 2. 通知 scheduleManager 创建新任务
            scheduleManager.addTask(task);
            
            logger.info('Schedule', '新任务已创建', {
                taskId: task.id,
                roomNames: task.roomNames,
                executionTime: task.cron
            });
            
            return { success: true };
        } catch (error) {
            logger.error('Schedule', '创建任务失败', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '创建任务失败'
            };
        }
    },

    [IPC_CHANNELS.TOGGLE_SCHEDULE_TASK]: async (event: any, taskId: string, enabled: boolean) => {
        ConfigManager.updateScheduleTask(taskId, enabled);
        return { success: true };
    },

    [IPC_CHANNELS.DELETE_SCHEDULE_TASK]: async (event: any, taskId: string) => {
        ConfigManager.deleteScheduleTask(taskId);
        return { success: true };
    },

    'test-direct-send': async (event: any, roomName: string, message: string) => {
        try {
            return await scheduleManager.testDirectSend(roomName, message);
        } catch (error) {
            logger.error('Bot', '测试发送失败', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '发送失败'
            };
        }
    },

    // 添加导出日志处理器
    [IPC_CHANNELS.EXPORT_LOGS]: async (event: any, content: string) => {
        try {
            const { filePath } = await dialog.showSaveDialog({
                title: '导出日志',
                defaultPath: `logs-${new Date().toISOString().split('T')[0]}.csv`,
                filters: [
                    { name: 'CSV 文件', extensions: ['csv'] }
                ]
            });

            if (!filePath) {
                return { success: false, error: '未选择保存位置' };
            }

            await fs.promises.writeFile(filePath, content, 'utf-8');
            return { success: true };
        } catch (error) {
            logger.error('Export', '导出日志失败', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : '导出失败'
            };
        }
    }
};

// 3. 统一的错误处理包装器
function wrapHandler(handler: (...args: any[]) => Promise<any>) {
    return async (...args: any[]) => {
        try {
            return await handler(...args);
        } catch (error) {
            logger.error('IPC', '处理器执行失败', error);
            return {
                success: false,
                error: error instanceof AppError ? error.message : '操作失败，请稍后重试'
            };
        }
    };
}

// 4. 统一注册所有处理器
function registerIpcHandlers() {
    // 在注册前先移除所有已存在的处理器
    for (const channel of Object.values(IPC_CHANNELS)) {
        ipcMain.removeHandler(channel);
    }
    
    // 注新的处理器
    Object.entries(ipcHandlers).forEach(([channel, handler]) => {
        ipcMain.handle(channel, wrapHandler(handler));
    });
}

// 5. 在应用启动时注册
app.whenReady().then(async () => {
    try {
        // 注册所有 IPC 处理器
        registerIpcHandlers();
        
        // 创建窗口
        createWindow();
        
        // 设置自动更新
        setupAutoUpdater();
    } catch (error) {
        logger.error('App', '用启动失败', error);
        app.quit();
    }
});

// 在文件顶部添加日转发设置
logger.on('newLog', (logItem: LogItem) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('new-log', logItem);
    }
});

function setupIPC() {
    // ... 其他 IPC 处理程序 ...

    // 添加导出日志的 IPC 处理
    ipcMain.handle('export-logs', async (_, content: string) => {
        try {
            const { filePath } = await dialog.showSaveDialog({
                title: '导出日志',
                defaultPath: `logs-${new Date().toISOString().split('T')[0]}.csv`,
                filters: [
                    { name: 'CSV 文件', extensions: ['csv'] }
                ]
            });

            if (filePath) {
                await fs.promises.writeFile(filePath, content, 'utf-8');
                return { success: true };
            }
            return { success: false, error: '未选择保存位置' };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    });
}

// 在文件顶部添加配置
const STABILITY_CONFIG = {
    reconnectInterval: 300000,    // 重连间隔改为 5 分钟
    maxRetries: 3,               // 最大重试次数保持 3 次
    heartbeatInterval: 600000,   // 心跳间隔改为 10 分钟
    checkStatusInterval: 900000, // 状态检查间隔改为 15 分钟
    consecutiveFailuresLimit: 5  // 连续失败次数限制保持 5 次
};

// 改进心跳检测函数，减少不必要的操作
function startHeartbeat() {
    setInterval(async () => {
        try {
            if (botInstance?.puppet?.isLoggedIn) {
                // 只检查登录状态，不执行额外操作
                logger.debug('Bot', '心跳检测成功');
            }
        } catch (error) {
            // 心跳失败不立即报警，只记录日志
            logger.debug('Bot', '心跳检测失败', error);
        }
    }, STABILITY_CONFIG.heartbeatInterval);
}

// 改进状态监控函数，减少敏感度
function startStatusMonitor() {
    if (!botInstance) {
        logger.error('Bot', '无法启动状态监控：机器人实例不存在');
        return;
    }

    setInterval(async () => {
        try {
            if (!botInstance) {
                logger.error('Bot', '机器人实例不存在');
                return;
            }

            const isLoggedIn = botInstance.puppet?.isLoggedIn;
            
            // 只在明确是登出状态时才增加失败计数
            if (isLoggedIn === false) {
                consecutiveFailures++;
                logger.warn('Bot', `状态检查失败 (${consecutiveFailures}/${STABILITY_CONFIG.consecutiveFailuresLimit})`);
                
                if (consecutiveFailures >= STABILITY_CONFIG.consecutiveFailuresLimit) {
                    logger.error('Bot', '连续多次检测到异常，开始重连');
                    await handleReconnect();
                }
            } else {
                // 重置失败计数
                if (consecutiveFailures > 0) {
                    consecutiveFailures = 0;
                    logger.info('Bot', '状态恢复正常');
                }
            }
        } catch (error) {
            // 错误不计入失败次数，只记录日志
            logger.error('Bot', '状态监控出错', error);
        }
    }, STABILITY_CONFIG.checkStatusInterval);
}

// 改进重连处理函数，添加延迟
async function handleReconnect() {
    try {
        logger.info('Bot', '准备开始重连流程');
        
        // 添加随机延迟，避免同时重连
        const delay = Math.floor(Math.random() * 30000) + 15000; // 15-45秒随机延迟
        logger.info('Bot', `等待 ${delay/1000} 秒后开始重连`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // 重置失败计数
        consecutiveFailures = 0;
        
        // 如果在等待期间状态已恢复，则取消重连
        if (botInstance?.puppet?.isLoggedIn) {
            logger.info('Bot', '状态已恢复，取消重连');
            return;
        }
        
        // 如果存在旧实例，尝试优雅关闭
        if (botInstance) {
            try {
                await botInstance.stop();
            } catch (error) {
                logger.warn('Bot', '关闭旧实例失败', error);
            }
            botInstance = null;
        }

        // 重新启动
        const config = ConfigManager.getConfig();
        if (!mainWindow) {
            throw new Error('主窗口未初始化');
        }
        await startBot(config, mainWindow);
        
        logger.info('Bot', '重连成功');
        
        // 通知前端
        mainWindow.webContents.send('key-message', {
            type: 'success',
            message: '机器人重连成功'
        });
    } catch (error) {
        logger.error('Bot', '重连失败', error);
        mainWindow?.webContents.send('key-message', {
            type: 'error',
            message: '重连失败，请手动重启机器人'
        });
    }
}

// 添加定时检查，确保二维码窗口不会一直开着
function setupQRCodeTimeout() {
    const QRCODE_TIMEOUT = 5 * 60 * 1000; // 5分钟超时
    setTimeout(() => {
        if (qrcodeWindow) {
            logger.warn('Bot', '二维码窗口超时，自动关闭');
            closeQRCodeWindow();
        }
    }, QRCODE_TIMEOUT);
}
