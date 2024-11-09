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
import { LogViewer } from './components/log-viewer';
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
      // 初始化各个组件
      const scheduleContainer = document.getElementById('scheduleItems');
      if (scheduleContainer) {
        this.scheduleManager = new ScheduleManager(scheduleContainer);
        // 暴露给全局使用
        window.scheduleManager = this.scheduleManager;
      }

      this.botStatus = new BotStatus();
      
      const qrcodeContainer = document.getElementById('qrcode');
      if (qrcodeContainer) {
        this.qrcodeManager = new QRCodeManager(qrcodeContainer);
      }

      this.configManager = new ConfigManager();
      this.logViewer = new LogViewer('logViewer');

      // 绑定事件
      this.bindEvents();
      // 初始化标签切换
      this.initTabSwitching();

      // 检查初始配置
      this.checkInitialConfig();

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
        keyMessages.addMessage('请先设置 API Key。您可以前往 qiye.aitiwo.com 创建机器人并获取 API Key。', 'warning');
      }

      // 检查白名单
      if (config.contactWhitelist.length === 0 && config.roomWhitelist.length === 0) {
        keyMessages.addMessage('提示：当前未设置白名单，机器人将不会响应任何消息。请在"白名单配置"中设置。', 'warning');
      }
    } catch (error) {
      this.logger.error('App', '检查配置失败', error);
    }
  }

  private bindEvents() {
    // 启动机器人按钮事件
    const startBotButton = document.getElementById('startBot');
    if (startBotButton) {
      startBotButton.addEventListener('click', () => this.handleStartBot());
    }

    // 添加停止按钮事件
    const stopBotButton = document.getElementById('stopBot');
    if (stopBotButton) {
      stopBotButton.addEventListener('click', () => this.handleStopBot());
    }

    // 监听机器人事件
    this.initBotEventListeners();

    // 监听配置变更
    this.initConfigListeners();
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
      this.logger.info('bot', '正在启动机器人...');
      this.botStatus.updateStatus('waiting', '正在启动机器人...');
      keyMessages.addMessage('正在启动机器人...', 'info');
      
      const result = await window.electronAPI.startBot();
      
      if (result.success) {
        const message = result.message || '机器人启动成功';
        this.logger.info('bot', message);
        this.botStatus.updateStatus('waiting', message);
        keyMessages.addMessage(message, 'success');
        keyMessages.addMessage('请使用微信扫描二维码登录', 'info');
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
    if (!this.qrcodeManager) return;

    // 监听二维码生成
    window.electronAPI.onQrcodeGenerated((qrcode: string) => {
      this.qrcodeManager?.show(qrcode);
      keyMessages.addMessage('二维码已生成，请使用微信扫码登录', 'info');
    });

    // 监听机器人事件
    window.electronAPI.onBotEvent((event: string, data: any) => {
      switch (event) {
        case 'login':
          this.handleLoginEvent(data);
          break;
        case 'logout':
          this.handleLogoutEvent(data);
          break;
        case 'message':
          this.handleMessageEvent(data);
          break;
        case 'error':
          this.handleErrorEvent(data);
          break;
        case 'status':
          this.handleStatusEvent(data);
          break;
        case 'warning':
          this.handleWarningEvent(data);
          break;
      }
    });

    // 监听关键消息
    window.electronAPI.on('key-message', (data: { type: 'info' | 'success' | 'warning' | 'error', message: string }) => {
      keyMessages.addMessage(data.message, data.type);
    });
  }

  private handleLoginEvent(data: any) {
    if (!this.qrcodeManager || !this.botStatus) return;
    this.qrcodeManager.hide();
    this.logger.info('bot', `微信登录成功: ${data.userName}`);
    this.botStatus.updateStatus('running', '机器人已登录并运行中');
    keyMessages.addMessage(`微信登录成功，用户：${data.userName}`, 'success');
    keyMessages.addMessage('机器人开始工作，将自动回复消息', 'info');
  }

  private handleLogoutEvent(data: any) {
    if (!this.botStatus) return;
    this.logger.warning('bot', `用户已登出: ${data.userName}`);
    this.botStatus.updateStatus('stopped', '机器人已登出');
    keyMessages.addMessage(`微信已登出，用户：${data.userName}`, 'warning');
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
    if (!this.botStatus) return;
    if (data.message.includes('API Key')) {
      this.botStatus.updateStatus('waiting', data.message);
      keyMessages.addMessage(data.message, 'warning');
    } else if (data.message.includes('重新连接')) {
      this.botStatus.updateStatus('waiting');
      keyMessages.addMessage('检测到连接断开，正在尝试重新连接...', 'warning');
    } else if (data.message.includes('重连成功')) {
      this.botStatus.updateStatus('running');
      keyMessages.addMessage('网络连接已恢复', 'success');
    }
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