import * as log4js from 'log4js'
import * as path from 'path'
import { app, BrowserWindow } from 'electron'
import { LogLevel, LogItem } from '../../shared/types/logger'
import { AppError, ErrorCode } from '../../shared/types/errors'
import * as fs from 'fs'
import { EventEmitter } from 'events'

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

class Logger extends EventEmitter {
  private mainWindow: BrowserWindow | null = null;
  private logger: log4js.Logger;

  constructor() {
    super();

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
    this.log('info' as LogLevel, category, message, details);
  }

  warn(category: string, message: string, details?: any) {
    this.log('warn' as LogLevel, category, message, details);
  }

  error(category: string, message: string, details?: any) {
    this.log('error' as LogLevel, category, message, details);
  }

  debug(category: string, message: string, details?: any) {
    this.log('debug' as LogLevel, category, message, details);
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

  // 添加序列化检查
  private sanitizeLogData(data: any): any {
    try {
        // 测试是否可以序列化
        JSON.stringify(data);
        return data;
    } catch (error) {
        // 如果无法序列化，返回简化版本
        return {
            error: '无法序列化的数据',
            type: typeof data
        };
    }
  }

  log(level: LogLevel, category: string, message: string, details?: any) {
    const logItem: LogItem = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details: details ? this.sanitizeLogData(details) : undefined
    };
    
    // 只通过一种方式发送日志
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('new-log', logItem);
    }
  }
}

export const logger = new Logger() 