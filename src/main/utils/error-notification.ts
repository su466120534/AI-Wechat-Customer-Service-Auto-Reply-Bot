import { BrowserWindow, Notification } from 'electron'
import { AppError, ErrorCode } from '../../shared/types/errors'
import { logger } from './logger'

export class ErrorNotificationManager {
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  notify(error: AppError) {
    if (!error.shouldNotify) return;

    // 发送到渲染进程
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('error-notification', {
        title: this.getErrorTitle(error),
        message: error.message,
        type: this.getErrorType(error)
      });
    }

    // 系统通知
    if (Notification.isSupported()) {
      new Notification({
        title: this.getErrorTitle(error),
        body: error.message,
        urgency: this.getErrorUrgency(error)
      }).show();
    }

    // 记录日志
    logger.error('Notification', '发送错误通知', {
      code: error.code,
      message: error.message
    });
  }

  private getErrorTitle(error: AppError): string {
    switch (error.code) {
      case ErrorCode.BOT_DISCONNECTED:
        return '机器人连接断开';
      case ErrorCode.NETWORK_DISCONNECTED:
        return '网络连接断开';
      case ErrorCode.API_REQUEST_FAILED:
        return 'AI 服务请求失败';
      default:
        return '系统错误';
    }
  }

  private getErrorType(error: AppError): 'error' | 'warning' | 'info' {
    switch (error.code) {
      case ErrorCode.BOT_DISCONNECTED:
      case ErrorCode.NETWORK_DISCONNECTED:
        return 'error';
      case ErrorCode.API_REQUEST_FAILED:
        return 'warning';
      default:
        return 'info';
    }
  }

  private getErrorUrgency(error: AppError): 'normal' | 'critical' {
    switch (error.code) {
      case ErrorCode.BOT_DISCONNECTED:
      case ErrorCode.NETWORK_DISCONNECTED:
        return 'critical';
      default:
        return 'normal';
    }
  }
}

export const errorNotificationManager = new ErrorNotificationManager(); 