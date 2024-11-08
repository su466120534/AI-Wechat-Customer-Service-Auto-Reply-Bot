export type LogLevel = 'debug' | 'info' | 'warn' | 'warning' | 'error' | 'success';

export interface LoggerConfig {
  level: LogLevel;
  enableConsole?: boolean;
  maxLogItems?: number;
  logToFile?: boolean;
}

export interface LogItem {
  level: LogLevel;
  category: string;
  message: string;
  timestamp: string;
  details?: any;
}

export interface Logger {
  debug(category: string, message: string, details?: any): void;
  info(category: string, message: string, details?: any): void;
  warn(category: string, message: string, details?: any): void;
  warning(category: string, message: string, details?: any): void;
  error(category: string, message: string, details?: any): void;
  success(category: string, message: string, details?: any): void;
  
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  
  getLogs(filter?: {
    level?: LogLevel;
    category?: string;
    startTime?: string;
    endTime?: string;
  }): LogItem[];
  
  clearLogs(): void;
} 