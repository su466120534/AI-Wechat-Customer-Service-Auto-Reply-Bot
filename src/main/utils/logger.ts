import * as log4js from 'log4js'
import * as path from 'path'
import { app, BrowserWindow } from 'electron'
import { LogLevel, LogItem } from '../../shared/types/logger'
import { AppError, ErrorCode } from '../../shared/types/errors'
import * as fs from 'fs'

interface ErrorLogFormat {
  timestamp: string;
  level: string;
  category: string;
  message: string;
  errorCode?: ErrorCode;
  errorName?: string;
  stack?: string;
  details?: any;
}

class Logger {
  private mainWindow: BrowserWindow | null = null;
  private logger: log4js.Logger;

  constructor() {
    // 配置 log4js
    log4js.configure({
      appenders: {
        file: {
          type: 'dateFile',
          filename: path.join(app.getPath('userData'), 'logs/app.log'),
          pattern: 'yyyy-MM-dd',
          layout: {
            type: 'pattern',
            pattern: '[%d] [%p] %c - %m'
          }
        },
        console: {
          type: 'console',
          layout: {
            type: 'pattern',
            pattern: '%[[%d] [%p] %c - %m%]'
          }
        }
      },
      categories: {
        default: { appenders: ['file', 'console'], level: 'info' }
      }
    });

    this.logger = log4js.getLogger();

    this.configureLogger();

    // 初始化时执行一次清理，并设置每天凌晨2点清理
    this.cleanOldLogs();
    this.scheduleLogsCleaning();
  }

  private configureLogger() {
    log4js.configure({
      appenders: {
        file: {
          type: 'dateFile',
          filename: path.join(app.getPath('userData'), 'logs/app.log'),
          pattern: 'yyyy-MM-dd',
          layout: {
            type: 'pattern',
            pattern: '[%d] [%p] %c - %m'
          }
        },
        console: {
          type: 'console',
          layout: {
            type: 'pattern',
            pattern: '%[[%d] [%p] %c - %m%]'
          }
        }
      },
      categories: {
        default: { appenders: ['file', 'console'], level: 'info' }
      }
    });
  }

  private formatError(error: Error | AppError): ErrorLogFormat {
    const now = new Date();
    const baseFormat: ErrorLogFormat = {
      timestamp: now.toISOString(),
      level: 'ERROR',
      category: 'Error',
      message: error.message,
      errorName: error.name,
      stack: error.stack
    };

    if (error instanceof AppError) {
      return {
        ...baseFormat,
        errorCode: error.code,
        details: {
          recoverable: error.recoverable,
          shouldNotify: error.shouldNotify
        }
      };
    }

    return baseFormat;
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  private createLogItem(level: LogLevel, category: string, message: string, details?: any): LogItem {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details
    }
  }

  private sendToRenderer(logItem: LogItem) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('new-log', logItem)
    }
  }

  info(category: string, message: string, details?: any) {
    const logItem = this.createLogItem('info', category, message, details)
    this.logger.info(`[${category}] ${message}`)
    this.sendToRenderer(logItem)
  }

  warn(category: string, message: string, details?: any) {
    const logItem = this.createLogItem('warn', category, message, details)
    this.logger.warn(`[${category}] ${message}`)
    this.sendToRenderer(logItem)
  }

  error(category: string, message: string, details?: any) {
    const logItem = this.createLogItem('error', category, message, details)
    this.logger.error(`[${category}] ${message}`)
    if (details) {
      this.logger.error(details)
    }
    this.sendToRenderer(logItem)
  }

  debug(category: string, message: string, details?: any) {
    const logItem = this.createLogItem('debug', category, message, details)
    this.logger.debug(`[${category}] ${message}`)
    this.sendToRenderer(logItem)
  }

  async getLogs(limit: number = 100): Promise<LogItem[]> {
    // 从文件读取最近的日志
    // 这里简化处理，实际应用中可能需要更复杂的日志检索逻辑
    return []
  }

  /**
   * 清理旧的日志文件
   * @param maxDays 保留的最大天数，默认7天
   */
  private cleanOldLogs(maxDays: number = 7): void {
    try {
      const logsDir = path.join(app.getPath('userData'), 'logs');
      
      // 确保日志目录存在
      if (!fs.existsSync(logsDir)) {
        return;
      }

      const files = fs.readdirSync(logsDir);
      const now = new Date();

      files.forEach(file => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = (now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        if (fileAge > maxDays) {
          fs.unlinkSync(filePath);
          this.info('LogCleaner', `已删除过期日志文件: ${file}`);
        }
      });
    } catch (error) {
      this.error('LogCleaner', '清理日志文件时发生错误', error);
    }
  }

  /**
   * 设置定期清理日志的调度
   */
  private scheduleLogsCleaning(): void {
    setInterval(() => {
      const now = new Date();
      // 每天凌晨2点执行清理
      if (now.getHours() === 2 && now.getMinutes() === 0) {
        this.cleanOldLogs();
      }
    }, 60 * 1000); // 每分钟检查一次
  }
}

export const logger = new Logger() 