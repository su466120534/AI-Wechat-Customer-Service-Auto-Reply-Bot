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

// 初始化UI组件
const loading = new LoadingUI();

class App {
  private logger: Logger;
  private scheduleManager: ScheduleManager;
  private botStatus: BotStatus;
  private qrcodeManager: QRCodeManager;
  private configManager: ConfigManager;
  private logViewer: LogViewer;

  constructor() {
    // 初始化各个模块
    this.logger = rendererLogger;
    this.scheduleManager = new ScheduleManager(document.getElementById('scheduleItems') as HTMLElement);
    this.botStatus = new BotStatus();
    this.qrcodeManager = new QRCodeManager(document.getElementById('qrcode') as HTMLElement);
    this.configManager = new ConfigManager();
    this.logViewer = new LogViewer('logViewer');

    // 暴露给全局使用
    window.scheduleManager = this.scheduleManager;

    this.bindEvents();
  }

  private bindEvents() {
    // 启动机器人按钮事件
    const startBotButton = document.getElementById('startBot') as HTMLButtonElement;
    startBotButton.addEventListener('click', () => this.handleStartBot());

    // 监听机器人事件
    this.initBotEventListeners();
  }

  private async handleStartBot() {
    try {
      this.logger.info('bot', '正在启动机器人...');
      this.botStatus.updateStatus('waiting', '正在启动机器人...');
      
      const result = await window.electronAPI.startBot();
      
      if (result.success) {
        const message = result.message || '机器人启动成功';
        this.logger.info('bot', message);
        this.botStatus.updateStatus('waiting', message);
      } else {
        throw new Error(result.error || '启动失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.logger.error('bot', `启动失败: ${errorMessage}`);
      this.botStatus.updateStatus('error', `启动失败: ${errorMessage}`);
    }
  }

  private initBotEventListeners() {
    // 监听二维码生成
    window.electronAPI.onQrcodeGenerated((qrcode: string) => {
      this.qrcodeManager.show(qrcode);
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
      }
    });
  }

  private handleLoginEvent(data: any) {
    this.qrcodeManager.hide();
    this.logger.info('bot', `微信登录成功: ${data.userName}`);
    this.botStatus.updateStatus('running', '机器人已登录并运行中');
  }

  private handleLogoutEvent(data: any) {
    this.logger.warning('bot', `用户已登出: ${data.userName}`);
    this.botStatus.updateStatus('stopped', '机器人已登出');
  }

  private handleMessageEvent(data: any) {
    this.logger.info('bot', `收到新消息: ${data.text}`);
  }

  private handleErrorEvent(data: any) {
    this.logger.error('bot', data.message || '发生错误');
    this.botStatus.updateStatus('error', data.message);
  }

  private handleStatusEvent(data: any) {
    if (data.message.includes('重新连接')) {
      this.botStatus.updateConnectionStatus('connecting', '正在重新连接...');
      this.logger.warning('bot', '检测到连接断开，正在尝试重新连接');
    } else if (data.message.includes('重连成功')) {
      this.botStatus.updateConnectionStatus('reconnected', '连接已恢复');
      this.logger.success('bot', '连接已恢复');
    }
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

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.initTabSwitching();
      this.configManager.loadConfig();
      this.scheduleManager.loadTasks();
    });
  }
}

// 创建并初始化应用
const app = new App();
app.init();