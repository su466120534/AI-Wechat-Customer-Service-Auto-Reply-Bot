import { BrowserWindow } from 'electron'
import { logger } from './logger'
import ConfigManager from '../config'
import { startBot } from '../bot'
import { AppError, ErrorCode } from '../../shared/types/errors'

export class ErrorRecoveryManager {
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private async recoverBot(): Promise<void> {
    try {
      logger.info('Recovery', '尝试重新连接机器人');
      const config = ConfigManager.getConfig();
      
      if (!this.mainWindow) {
        throw new AppError('主窗口未初始化', ErrorCode.SYSTEM_ERROR);
      }
      
      await startBot(config, this.mainWindow);
    } catch (error) {
      logger.error('Recovery', '重连失败', error);
      throw error;
    }
  }

  // ... 其他代码保持不变
}

export const errorRecoveryManager = new ErrorRecoveryManager();