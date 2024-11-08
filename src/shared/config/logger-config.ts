import { LogLevel } from '../types/logger';

export interface LoggerConfigOptions {
  level: LogLevel;
  enableConsole: boolean;
  maxLogItems: number;
  logToFile: boolean;
  rotateSize: number;
  maxFiles: number;
  retentionDays: number;
  format: 'json' | 'text';
  categories: {
    [key: string]: {
      level: LogLevel;
      enabled: boolean;
    };
  };
}

export const DEFAULT_LOGGER_CONFIG: LoggerConfigOptions = {
  level: 'info',
  enableConsole: true,
  maxLogItems: 1000,
  logToFile: true,
  rotateSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 30,
  retentionDays: 30,
  format: 'json',
  categories: {
    system: { level: 'info', enabled: true },
    bot: { level: 'info', enabled: true },
    api: { level: 'info', enabled: true },
    schedule: { level: 'info', enabled: true }
  }
};

export class LoggerConfigManager {
  private config: LoggerConfigOptions;

  constructor(initialConfig?: Partial<LoggerConfigOptions>) {
    this.config = {
      ...DEFAULT_LOGGER_CONFIG,
      ...initialConfig
    };
  }

  getConfig(): LoggerConfigOptions {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<LoggerConfigOptions>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }

  shouldLog(level: LogLevel, category?: string): boolean {
    if (category && this.config.categories[category]) {
      const categoryConfig = this.config.categories[category];
      if (!categoryConfig.enabled) return false;
      
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'success'];
      return levels.indexOf(level) >= levels.indexOf(categoryConfig.level);
    }

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'success'];
    return levels.indexOf(level) >= levels.indexOf(this.config.level);
  }
}

export const loggerConfig = new LoggerConfigManager(); 