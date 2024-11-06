import * as log4js from 'log4js'
import * as path from 'path'
import { app } from 'electron'
import { BrowserWindow } from 'electron'

const LOG_DIR = path.join(app.getPath('userData'), 'logs')

// 定义日志级别类型
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// 定义日志项接口
export interface LogItem {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
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
          filename: path.join(LOG_DIR, 'app.log'),
          pattern: 'yyyy-MM-dd',
          compress: true,
          keepFileExt: true,
          alwaysIncludePattern: true,
          layout: {
            type: 'pattern',
            pattern: '[%d] [%p] %c - %m'
          }
        },
        console: {
          type: 'console',
          layout: {
            type: 'pattern',
            pattern: '%[[%d] [%p] %c%] - %m'
          }
        }
      },
      categories: {
        default: {
          appenders: ['file', 'console'],
          level: 'info',
          enableCallStack: true
        }
      }
    })

    this.logger = log4js.getLogger()
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
}

export const logger = new Logger() 