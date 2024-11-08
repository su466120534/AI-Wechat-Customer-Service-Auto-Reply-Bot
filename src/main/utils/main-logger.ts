import { LogLevel, LogItem, Logger, LoggerConfig } from '../../shared/types/logger';
import * as fs from 'fs';
import * as path from 'path';

export class MainLogger implements Logger {
  private logs: LogItem[] = [];
  private config: LoggerConfig = {
    level: 'info',
    enableConsole: true,
    maxLogItems: 1000,
    logToFile: true
  };
  private logFilePath: string;

  constructor(config?: Partial<LoggerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.logFilePath = path.join(process.cwd(), 'logs', 'app.log');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'success'];
    return levels.indexOf(level) >= levels.indexOf(this.config.level);
  }

  private createLogItem(level: LogLevel, category: string, message: string, details?: any): LogItem {
    return {
      level,
      category,
      message,
      timestamp: new Date().toISOString(),
      details
    };
  }

  private async addLogItem(item: LogItem) {
    this.logs.push(item);
    if (this.logs.length > (this.config.maxLogItems || 1000)) {
      this.logs.shift();
    }
    
    if (this.config.enableConsole) {
      const consoleMethod = this.getConsoleMethod(item.level);
      consoleMethod(`[${item.category}] ${item.message}`, item.details);
    }

    if (this.config.logToFile) {
      await this.writeToFile(item);
    }
  }

  debug(category: string, message: string, details?: any): void {
    if (this.shouldLog('debug')) {
      this.addLogItem(this.createLogItem('debug', category, message, details));
    }
  }

  info(category: string, message: string, details?: any): void {
    if (this.shouldLog('info')) {
      this.addLogItem(this.createLogItem('info', category, message, details));
    }
  }

  warning(category: string, message: string, details?: any): void {
    if (this.shouldLog('warning')) {
      this.addLogItem(this.createLogItem('warning', category, message, details));
    }
  }

  warn(category: string, message: string, details?: any): void {
    this.warning(category, message, details);
  }

  error(category: string, message: string, details?: any): void {
    if (this.shouldLog('error')) {
      this.addLogItem(this.createLogItem('error', category, message, details));
    }
  }

  success(category: string, message: string, details?: any): void {
    if (this.shouldLog('success')) {
      this.addLogItem(this.createLogItem('success', category, message, details));
    }
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getLevel(): LogLevel {
    return this.config.level;
  }

  getLogs(filter?: {
    level?: LogLevel;
    category?: string;
    startTime?: string;
    endTime?: string;
  }): LogItem[] {
    let filteredLogs = this.logs;
    
    if (filter) {
      filteredLogs = this.logs.filter(log => {
        if (filter.level && log.level !== filter.level) return false;
        if (filter.category && log.category !== filter.category) return false;
        if (filter.startTime && log.timestamp < filter.startTime) return false;
        if (filter.endTime && log.timestamp > filter.endTime) return false;
        return true;
      });
    }
    
    return filteredLogs;
  }

  clearLogs(): void {
    this.logs = [];
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    const methodMap: Record<LogLevel, keyof typeof console> = {
      debug: 'debug',
      info: 'info',
      warn: 'warn',
      warning: 'warn',
      error: 'error',
      success: 'log'
    };
    
    const method = (console[methodMap[level]] as Function).bind(console);
    return method;
  }

  private async writeToFile(logItem: LogItem) {
    if (!this.config.logToFile) return;

    const logString = `${logItem.timestamp} [${logItem.level.toUpperCase()}] [${logItem.category}] ${logItem.message}\n`;
    try {
      await fs.promises.appendFile(this.logFilePath, logString);
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }
}

// 导出单例实例
export const mainLogger = new MainLogger();