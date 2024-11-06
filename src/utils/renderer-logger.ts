import { LogLevel, LogItem } from './logger'

class RendererLogger {
  info(category: string, message: string, details?: any) {
    this.log('info', category, message, details);
  }

  warn(category: string, message: string, details?: any) {
    this.log('warn', category, message, details);
  }

  error(category: string, message: string, details?: any) {
    this.log('error', category, message, details);
  }

  debug(category: string, message: string, details?: any) {
    this.log('debug', category, message, details);
  }

  private log(level: LogLevel, category: string, message: string, details?: any) {
    // 在渲染进程中，只需要通过 console 输出日志
    console[level](`[${category}] ${message}`, details);
  }
}

export const rendererLogger = new RendererLogger(); 