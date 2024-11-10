/// <reference types="../shared/types/global.d.ts" />

import { LoadingUI } from './components/loading';
import { notification } from './components/notification';
import { handleError } from './utils/renderer-error-handler';
import { AppError, ErrorCode } from '../shared/types';
import { Logger } from '../shared/types/logger';
import { ScheduleManager } from './modules/schedule';
import { BotStatus } from './modules/bot-status';
import { QRCodeManager } from './modules/qrcode';
import { ConfigManager } from './modules/config-manager';
import { LogLevel } from '../shared/types/logger';
import { LogViewer } from './modules/logger';
import { rendererLogger } from './utils/renderer-logger';
import { keyMessages } from './components/key-messages';

// 初始化UI组件
const loading = new LoadingUI();

class App {
  private logger: Logger;
  private scheduleManager: ScheduleManager | null = null;
  private botStatus: BotStatus | null = null;
  private qrcodeManager: QRCodeManager | null = null;
  private configManager: ConfigManager | null = null;
  private logViewer: LogViewer | null = null;

  constructor() {
    this.logger = rendererLogger;
    this.init();
  }

  private init() {
    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initComponents());
    } else {
      this.initComponents();
    }
  }

  private initComponents() {
    try {
        // 首先初始化 QRCodeManager
        const qrcodeContainer = document.getElementById('qrcode');
        if (!qrcodeContainer) {
            throw new Error('QRCode container not found');
        }
        this.qrcodeManager = new QRCodeManager(qrcodeContainer);
        console.log('QRCodeManager initialized');

        // 然后初始化其他组件
        const scheduleContainer = document.getElementById('scheduleItems');
        if (scheduleContainer) {
            this.scheduleManager = new ScheduleManager(scheduleContainer);
            window.scheduleManager = this.scheduleManager;
        }

        this.botStatus = new BotStatus();
        this.configManager = new ConfigManager();
        this.logViewer = new LogViewer('logViewer');

        // 绑定事件监听器
        this.initBotEventListeners();
        // 初始化标签切换
        this.initTabSwitching();
        // 绑定按钮事件
        this.bindEvents();
        // 立即检查初始配置
        this.checkInitialConfig();

        console.log('All components initialized');

    } catch (error) {
        this.logger.error('App', '初始化组件失败', error);
        notification.show('应用初始化失败，请刷新页面重试', 'error');
    }
  }

  private async checkInitialConfig() {
    try {
      const config = await window.electronAPI.getConfig();
      
      // 检查 API Key
      if (!config.aitiwoKey) {
        keyMessages.addMessage('请先设置 API Key。请到 https://qiye.aitiwo.com/ 机器人/创建智能体/发布智能体/API调用/创建API。', 'warning');
      } else {
        keyMessages.addMessage('API Key 已配置', 'success');
      }

      // 检查白名单
      if (config.contactWhitelist.length === 0 && config.roomWhitelist.length === 0) {
        keyMessages.addMessage('提示：当前未设置白名单，机器人将不会响应任何消息。请在"白名单配置"中设置。', 'warning');
      }
    } catch (error) {
      this.logger.error('App', '检查配置失败', error);
      keyMessages.addMessage('检查配置失败，请检查网络连接', 'error');
    }
  }

  private bindEvents() {
    // 启动机器人按钮事件
    const startBotButton = document.getElementById('startBot');
    if (startBotButton) {
        console.log('Binding start button event');
        startBotButton.addEventListener('click', () => {
            console.log('Start button clicked');
            this.handleStartBot();
        });
    } else {
        console.error('Start button not found');
    }

    // 添加停止按钮事件
    const stopBotButton = document.getElementById('stopBot');
    if (stopBotButton) {
        console.log('Binding stop button event');
        stopBotButton.addEventListener('click', () => {
            console.log('Stop button clicked');
            this.handleStopBot();
        });
    } else {
        console.error('Stop button not found');
    }
  }

  private initConfigListeners() {
    // API Key 输入框
    const apiKeyInput = document.getElementById('aitiwoKey') as HTMLInputElement;
    if (apiKeyInput) {
      apiKeyInput.addEventListener('change', async () => {
        try {
          const result = await window.electronAPI.invoke('save-aitiwo-key', apiKeyInput.value);
          if (result.success) {
            keyMessages.addMessage('API Key 设置成功，已通过验证', 'success');
            keyMessages.addMessage('现在您可以点击"启动机器人"按钮开始使用了', 'info');
          }
        } catch (error) {
          keyMessages.addMessage('API Key 设置失败，请检查是否正确', 'error');
        }
      });
    }
  }

  private async handleStartBot() {
    if (!this.botStatus) return;
    try {
        // 更新状态和显示消息
        this.logger.info('bot', '启动机器人...');
        this.botStatus.updateStatus('waiting', '正在启动机器人...');
        keyMessages.addMessage('正在启动机器人...', 'info');
        
        const result = await window.electronAPI.startBot();
        
        if (result.success) {
            // 更新状态为运行中
            this.botStatus.updateStatus('running', '机器人已启动');
            keyMessages.addMessage('机器人启动成功', 'success');
            
            // 检查配置状态
            const config = await window.electronAPI.getConfig();
            
            // 检查 API Key
            if (config.aitiwoKey) {
                keyMessages.addMessage('API Key 已配置并验证通过', 'success');
            }
            
            // 检查白名单
            if (config.contactWhitelist.length > 0 || config.roomWhitelist.length > 0) {
                keyMessages.addMessage(`白名单已配置：${config.roomWhitelist.length}个群聊，${config.contactWhitelist.length}个联系人`, 'success');
            }
            
            // 如果需要扫码
            if (result.message?.includes('扫码')) {
                keyMessages.addMessage('请使用微信扫描二维码登录', 'info');
            } else {
                // 如果已经登录
                keyMessages.addMessage('检测到已登录状态，机器人开始工作', 'success');
                keyMessages.addMessage('机器人将自动回复消息', 'info');
            }
        } else {
            throw new Error(result.error || '启动失败');
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        this.logger.error('bot', `启动失败: ${errorMessage}`);
        this.botStatus.updateStatus('error', `启动失败: ${errorMessage}`);
        keyMessages.addMessage(`启动失败: ${errorMessage}`, 'error');
    }
  }

  private async handleStopBot() {
    if (!this.botStatus) return;
    try {
      this.logger.info('bot', '正在停止机器人...');
      this.botStatus.updateStatus('waiting', '正在停止机器人...');
      keyMessages.addMessage('正在停止机器人自动回复...', 'info');
      
      const result = await window.electronAPI.stopBot();
      
      if (result.success) {
        this.logger.info('bot', '机器人已停止自动回复消息');
        this.botStatus.updateStatus('stopped', '机器人已停止自动回复消息');
        keyMessages.addMessage('机器人已停止自动回复，微信仍保持登录状态', 'warning');
        keyMessages.addMessage('如需退出微信登录，请在手机微信上操作', 'info');
      } else {
        throw new Error(result.error || '停止失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.logger.error('bot', `停止失败: ${errorMessage}`);
      this.botStatus.updateStatus('error', `停止失败: ${errorMessage}`);
      keyMessages.addMessage(`停止失败: ${errorMessage}`, 'error');
    }
  }

  private initBotEventListeners() {
    if (!this.qrcodeManager) {
        console.error('QRCodeManager not initialized');
        return;
    }

    console.log('Initializing bot event listeners');

    // 监听机器人事件
    window.electronAPI.onBotEvent((event: string, data: any) => {
        console.log('Received bot event:', event, data);
        
        switch (event) {
            case 'login':
                console.log('Processing login event:', data);
                this.handleLoginEvent(data);
                break;
            case 'logout':
                console.log('Processing logout event:', data);
                this.handleLogoutEvent(data);
                break;
            default:
                console.log('Unhandled event type:', event, data);
        }
    });

    // 监听关键消息
    window.electronAPI.on('key-message', (data: { type: string, message: string }) => {
        console.log('Received key message:', data);
        keyMessages.addMessage(data.message, data.type as any);
    });

    // 监听二维码事件
    window.electronAPI.onQrcodeGenerated((qrcode: string) => {
        console.log('Received QR code');
        if (this.qrcodeManager) {
            this.qrcodeManager.show(qrcode);
        }
    });

    console.log('Bot event listeners initialized');
  }

  private handleLoginEvent(data: any) {
    console.log('Starting login event handling:', data);
    
    if (!this.qrcodeManager) {
        console.error('QRCodeManager not initialized');
        return;
    }

    if (!this.botStatus) {
        console.error('BotStatus not initialized');
        return;
    }

    // 关闭二维码显示
    console.log('Hiding QR code');
    this.qrcodeManager.hide();
    
    // 更新按钮状态为运行中（红色停止按钮）
    console.log('Updating bot status to running');
    this.botStatus.updateStatus('running', '机器人已登录并运行中');
    
    // 添加状态消息
    console.log('Adding status messages');
    keyMessages.addMessage(`微信登录成功，用户：${data.userName}`, 'success');
    keyMessages.addMessage('机器人已启动并正在运行', 'success');
    keyMessages.addMessage('机器人将自动回复消息', 'info');
    
    console.log('Login event handling completed');
  }

  private handleLogoutEvent(data: any) {
    console.log('Starting logout event handling:', data);
    
    if (!this.botStatus) {
        console.error('BotStatus not initialized');
        return;
    }
    
    this.logger.warning('bot', `用户已登出: ${data.userName}`);
    this.botStatus.updateStatus('stopped', '机器人已登出');
    keyMessages.addMessage(`微信已登出，用户：${data.userName}`, 'warning');
    
    console.log('Logout event handling completed');
  }

  private handleMessageEvent(data: any) {
    this.logger.info('bot', `收到新消息: ${data.text}`);
  }

  private handleErrorEvent(data: any) {
    if (!this.botStatus) return;
    const errorMessage = data.message || '发生错误';
    this.logger.error('bot', errorMessage);
    this.botStatus.updateStatus('error', errorMessage);
    keyMessages.addMessage(errorMessage, 'error');
  }

  private handleStatusEvent(data: any) {
    console.log('Starting status event handling:', data);
    
    if (!this.botStatus) {
        console.error('BotStatus not initialized');
        return;
    }

    if (data.message.includes('API Key')) {
        console.log('Handling API Key status');
        this.botStatus.updateStatus('waiting', data.message);
        keyMessages.addMessage(data.message, 'warning');
    } else if (data.message.includes('重新连接')) {
        console.log('Handling reconnection status');
        this.botStatus.updateStatus('waiting');
        keyMessages.addMessage('检测到连接断开，正在尝试重新连接...', 'warning');
    } else if (data.message.includes('重连成功')) {
        console.log('Handling reconnection success');
        this.botStatus.updateStatus('running');
        keyMessages.addMessage('网络连接已恢复', 'success');
    }
    
    console.log('Status event handling completed');
  }

  private handleWarningEvent(data: any) {
    if (!this.botStatus) return;
    keyMessages.addMessage(data.message, 'warning');
  }

  private initTabSwitching() {
    document.querySelector('.tabs')?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.tab-btn');
      
      if (!button) return;
      
      const tabId = button.getAttribute('data-tab');
      if (!tabId) return;

      // 更新按钮状态
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      button.classList.add('active');

      // 更新内容显示
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });

      const targetContent = document.getElementById(tabId);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  }
}

// 创建应用实例
const app = new App();

// 在文件加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // ... 其他初始化代码 ...

    // 初始化定时任务管理器
    const scheduleContainer = document.getElementById('schedule');
    if (scheduleContainer) {
        console.log('初始化定时任务管理器');
        window.scheduleManager = new ScheduleManager(scheduleContainer);
    } else {
        console.error('找不到定时任务容器');
    }
});