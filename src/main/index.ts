process.env.WECHATY_PUPPET = 'wechaty-puppet-wechat4u'

import { app, BrowserWindow, ipcMain, Notification } from 'electron'
import * as path from 'path'
import axios from 'axios'
import { Wechaty } from 'wechaty'
import { autoUpdater } from 'electron-updater'
import ConfigManager from './config'
import { logger } from './utils/logger'
import { updateLogger } from './utils/update-logger'
import { scheduleManager } from './utils/scheduler'
import { AppError, ErrorCode, NetworkError, BotError, ErrorRecoveryStrategy } from '../shared/types/errors'
import QRCode from 'qrcode'
import { errorRecoveryManager } from './utils/error-recovery'
import { errorNotificationManager } from './utils/error-notification'
import { errorMonitor } from './utils/error-monitor'
import * as dotenv from 'dotenv';
import { Message, Contact, Room } from 'wechaty';
import { types } from 'wechaty-puppet';
import { AitiwoService } from './services/aitiwo';
import { CronJob } from 'cron';

// 添加 ExtendedWechaty 接口定义
interface ExtendedWechaty extends Wechaty {
  isEnabled?: boolean;
  isLoggedIn?: boolean;
  stop(): Promise<void>;
  on(event: 'scan', listener: (qrcode: string, status: number) => void): this;
  on(event: 'login', listener: (user: Contact) => void): this;
  on(event: 'logout', listener: (user: Contact) => void): this;
  on(event: 'message', listener: (message: Message) => void): this;
}

// 在顶部声明 wechaty 相关的变量
const wechaty = require('wechaty')
const { WechatyBuilder } = wechaty
let botInstance: ExtendedWechaty | null = null;
let qrcodeWindow: BrowserWindow | null = null;
let isStarting = false;  // 添加启动状态标志


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

// 定义错误恢复策略
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
    logger.error('Recovery', '超过最大重试次数', {
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
        throw new AppError('未错误', ErrorCode.SYSTEM_RESOURCE_ERROR);
      }
    }
  } else {
    strategy.onMaxRetriesExceeded(error as AppError);
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
    // 可以选择重新加或关闭窗口
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
  // 检查是否已经存在窗口
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
    : path.join(__dirname, 'index.html');

  logger.info('Window', `加载页面路径: ${indexPath}`);
  mainWindow.loadFile(indexPath);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on('dom-ready', () => {
    logger.info('Window', 'DOM 准备就绪');
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
        // 删任何现有的 CSP 头
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
    logger.info('Bot', '开始创建机器人实例...');
    
    // API Key 检查
    if (!config.aitiwoKey) {
      logger.warn('Bot', 'API Key 未设置');
      mainWindow.webContents.send('key-message', {
        type: 'warning',
        message: '请先设置 API Key。您可以前往 qiye.aitiwo.com 创建机器人并获取 API Key。'
      });
      throw new AppError('请先设 API Key', ErrorCode.CONFIG_INVALID);
    }

    // 白名单检查
    if (config.contactWhitelist.length === 0 && config.roomWhitelist.length === 0) {
      logger.warn('Bot', '白名单未设置');
      mainWindow.webContents.send('key-message', {
        type: 'warning',
        message: '提示：当前未设置白名单，机器人将不会响应任何消息。请在"白名单配置"中设置。'
      });
    }

    // 检查是否已有实例在运行
    if (botInstance && await checkBotStatus()) {
      logger.info('Bot', '机器人例已存在且在线');
      return '';
    }

    // 初始化 Promise
    qrcodePromise = new Promise<string>((resolve, reject) => {
      qrcodeResolve = resolve;
      qrcodeReject = reject;
    });

    // 创建新实例
    botInstance = WechatyBuilder.build({
      name: 'wechat-bot',
      puppet: 'wechaty-puppet-wechat4u',
      puppetOptions: {
        uos: true
      }
    }) as ExtendedWechaty;

    // 添加自定义属性
    botInstance.isEnabled = true;

    // 使用类型断言来处理事件绑定
    if (botInstance) {
      (botInstance as Wechaty)
        .on('scan', async (qrcode: string, status: number) => {
          try {
            logger.info('Bot', '收到扫码事件', { status });
            const dataUrl = await QRCode.toDataURL(qrcode);
            qrcodeResolve(dataUrl);
          } catch (error) {
            logger.error('Bot', '生成二维码失败', error);
            qrcodeReject(new AppError('生成二维码失败', ErrorCode.BOT_INIT_FAILED));
          }
        })
        .on('login', (user: any) => {
          logger.info('Bot', '登录成功', { userName: user.name() });
          closeQRCodeWindow();
          mainWindow.webContents.send('key-message', {
            type: 'success',
            message: `微信登录成功，用户：${user.name()}`
          });
          mainWindow.webContents.send('bot-event', 'login', { 
            userName: user.name(),
            status: 'running',
            message: '机器人已启动并正在运行'
          });
        })
        .on('logout', (user: any) => {
          logger.info('Bot', '已登出', { userName: user.name() });
          mainWindow.webContents.send('bot-event', 'logout', { userName: user.name() });
        })
        .on('message', async (message: any) => {
          try {
            // 使用正确的枚举值
            if (message.type() === types.Message.Unknown || message.type() === types.Message.Recalled) {
              logger.debug('Bot', '忽略未知消息或撤回消息');
              return;
            }

            const talker = message.talker() as Contact;
            const room = message.room() as Room;
            const text = message.text();

            // 如果消息内容为空，直接返回
            if (!text.trim()) {
              return;
            }
            
            // 详细的日志记录
            logger.info('Bot', '收到新消息', {
              from: talker?.name(),
              text: text,
              room: room ? await room.topic() : undefined,
              messageType: message.type(),
              timestamp: message.date()
            });

            // 过滤自己发送的消息
            if (message.self()) {
              logger.debug('Bot', '忽略自己发送的消息');
              return;
            }

            // 获取最新配置，避免使用缓存的白名单
            const config = ConfigManager.getConfig();

            // 白名单验证
            try {
              const talkerName = talker?.name() || '';
              let roomTopic = '';
              
              if (room) {
                try {
                  roomTopic = await room.topic();
                } catch (error) {
                  logger.error('Bot', '获取群名失败', error);
                  roomTopic = (room as any).id || '未知群聊';
                }
              }

              // 详细的白名单检查日志
              logger.debug('Bot', '白名单检查', {
                talkerName,
                roomTopic,
                inContactWhitelist: config.contactWhitelist.includes(talkerName),
                inRoomWhitelist: config.roomWhitelist.includes(roomTopic)
              });

              const isAllowedContact = talker && config.contactWhitelist.includes(talkerName);
              const isAllowedRoom = room && config.roomWhitelist.includes(roomTopic);

              if (!isAllowedContact && !isAllowedRoom) {
                logger.info('Bot', '消息源不在白名单中，忽略', {
                  contact: talkerName,
                  room: roomTopic
                });
                return;
              }

              // 处理群名变更情况
              if (room && !isAllowedRoom && roomTopic) {
                // 检查是否是群��变更导致的不匹配
                const similarRoom = config.roomWhitelist.find(name => 
                  name.toLowerCase().replace(/\s+/g, '') === roomTopic.toLowerCase().replace(/\s+/g, '')
                );
                
                if (similarRoom) {
                  logger.info('Bot', '检测到群名变更', {
                    oldName: similarRoom,
                    newName: roomTopic
                  });
                  
                  // 更新白名单中的群名
                  const updatedRooms = config.roomWhitelist.map(name => 
                    name === similarRoom ? roomTopic : name
                  );
                  
                  await ConfigManager.setWhitelists(config.contactWhitelist, updatedRooms);
                  logger.info('Bot', '已更新群名白名单');
                }
              }

              // 调用 AI 接口获取回复
              try {
                const response = await callAIWithRetry(text);

                // 发送回复
                if (room) {
                  await room.say(response);
                  logger.info('Bot', '群聊回复成功', {
                    room: roomTopic,
                    message: response
                  });
                } else if (talker) {
                  await (talker as any).say(response);
                  logger.info('Bot', '私聊回复成功', {
                    contact: talkerName,
                    message: response
                  });
                }

              } catch (error) {
                logger.error('Bot', 'AI 回复失败', {
                  error: error instanceof Error ? error.message : '未知错误',
                  contact: talkerName,
                  room: roomTopic,
                  originalMessage: text
                });
                
                const errorMessage = '抱歉，我现在无法回复，请稍后再试';
                try {
                  if (room) {
                    await room.say(errorMessage);
                  } else if (talker) {
                    await (talker as any).say(errorMessage);
                  }
                } catch (sendError) {
                  logger.error('Bot', '发送错误消息失败', sendError);
                }
              }

            } catch (error) {
              logger.error('Bot', '白名单验证失败', error);
            }

          } catch (error) {
            logger.error('Bot', '处消息失败', error);
          }
        });

      await (botInstance as Wechaty).start();
      logger.info('Bot', '机器人启动成功');

      return await qrcodePromise;
    }

    throw new Error('创建机器人实例失败');
  } catch (error) {
    // 如果出错，确保 reject Promise
    if (qrcodeReject) {
      qrcodeReject(error);
    }
    logger.error('Bot', '创建机器人实例失败', error);
    throw new AppError('创建机器人实例失败', ErrorCode.BOT_INIT_FAILED);
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
      message: '重连失败，请手动重启服务'
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
    logger.info('Update', '更新下', info)
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
    
    // 创建窗口 - 只在这里创建一次
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

// 错误处理
process.on('uncaughtException', (error) => {
  logger.error('Process', '未捕获的异常', error)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Process', '未处理的 Promise 拒绝', { reason, promise })
})

// 修改二维码窗口创建函数
function createQRCodeWindow(qrcodeDataUrl: string) {
  // 如果已存在窗口，先关闭
  if (qrcodeWindow && !qrcodeWindow.isDestroyed()) {
    qrcodeWindow.close();
  }

  qrcodeWindow = new BrowserWindow({
    width: 400,
    height: 500,
    title: '微信登录',
    autoHideMenuBar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false  // 允许加载 data URL
    }
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
          <h3>请使用微信扫码登录</h3>
          <img src="${qrcodeDataUrl}" alt="微信登录二维码">
          <p class="status">扫码后请在手机上确认登录</p>
        </div>
      </body>
    </html>
  `;

  qrcodeWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  
  // 窗口关闭时清理引用
  qrcodeWindow.on('closed', () => {
    qrcodeWindow = null;
  });

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

// 显示重试按钮
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
    logger.info('Recovery', '尝试重新连接机器人');
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

// 修改状态检查函数
async function checkBotStatus(): Promise<boolean> {
  if (!botInstance) {
    return false;
  }
  try {
    // 等待实例准备就绪
    await new Promise(resolve => setTimeout(resolve, 1000));  // 给予初始化时间
    return botInstance.isLoggedIn || false;
  } catch (error) {
    return false;  // 静默失败，返回未登录状态
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
      logger.info('App', '应用退出，保持微信登录状态');
    } catch (error) {
      logger.error('App', '应用退出处理失败', error);
    }
  }
});

// 添加窗口关闭事件处理
app.on('window-all-closed', () => {
  if (qrcodeWindow && !qrcodeWindow.isDestroyed()) {
    qrcodeWindow.close();
  }
  
  // 在 macOS 上点击关闭按钮时不退出应用
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 添加应用激活事件处理（macOS）
app.on('activate', () => {
  // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，
  // 通常在应用程序中重新创建一个窗口。
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 添加件发送函数
function sendBotEvent(event: string, data: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('bot-event', event, data);
  }
}

// 修改配置迁移函数
async function migrateWhitelistConfig() {
  try {
    // 加载 .env 文件
    dotenv.config();
    
    // 获取白名单配置，如果为空则使用默认值
    const aliasWhitelist = process.env.ALIAS_WHITELIST || 'iamsujiang';
    const roomWhitelist = process.env.ROOM_WHITELIST || 'AI测试';

    // 验证和清理白名单数据
    const contacts = aliasWhitelist
      .split(',')
      .map(item => item.trim())
      .filter(item => {
        // 过滤掉空值和特殊字符
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
          logger.warn('Config', `群聊白名单包含无效值: ${item}`);
        }
        return isValid;
      });

    // 获取当前配置
    const currentConfig = ConfigManager.getConfig();
    
    // 如果当前配置中没有白名单据，则进行迁移
    if (currentConfig.contactWhitelist.length === 0 && currentConfig.roomWhitelist.length === 0) {
      logger.info('Config', '开始迁移白名单配置');
      
      // 使用默认值或环境变量中的值
      const defaultContacts = contacts.length > 0 ? contacts : ['iamsujiang'];
      const defaultRooms = rooms.length > 0 ? rooms : ['AI测试'];
      
      // 设置白名单
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
    logger.error('Config', '白名单配置迁移失败', error);
    // 记录错误但不中断应用启动
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('config-migration-failed', {
        error: error instanceof Error ? error.message : '配置迁移失败'
      });
    }
  }
}

async function callAIWithRetry(message: string, retryCount = 3) {
  const config = ConfigManager.getConfig();
  const aiService = new AitiwoService(config.aitiwoKey);
  
  try {
    return await aiService.chat(message);
  } catch (error) {
    logger.error('Bot', 'AI 调用失败', error);
    throw error;
  }
}


// 添加关闭二维码窗口的函数
function closeQRCodeWindow() {
  if (qrcodeWindow && !qrcodeWindow.isDestroyed()) {
    qrcodeWindow.close();
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
  
  // 机器人相关
  START_BOT: 'startBot',
  STOP_BOT: 'stopBot',
  
  // 定时任务相关
  GET_SCHEDULE_TASKS: 'getScheduleTasks',
  ADD_SCHEDULE_TASK: 'addScheduleTask',
  TOGGLE_SCHEDULE_TASK: 'toggleScheduleTask',
  DELETE_SCHEDULE_TASK: 'deleteScheduleTask'
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
      throw new AppError('请先设置 API Key', ErrorCode.CONFIG_INVALID);
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
    ConfigManager.addScheduleTask(task);
    return { success: true };
  },

  [IPC_CHANNELS.TOGGLE_SCHEDULE_TASK]: async (event: any, taskId: string, enabled: boolean) => {
    ConfigManager.updateScheduleTask(taskId, enabled);
    return { success: true };
  },

  [IPC_CHANNELS.DELETE_SCHEDULE_TASK]: async (event: any, taskId: string) => {
    ConfigManager.deleteScheduleTask(taskId);
    return { success: true };
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
  
  // 注册新的处理器
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
    logger.error('App', '应用启动失败', error);
    app.quit();
  }
});