import { AppError, ErrorCode } from '../types/errors';
import { Logger } from '../types/logger';

interface StackFrame {
  function: string;
  file: string;
  line: number;
  column: number;
}

export class ErrorLogger {
  constructor(private logger: Logger) {}

  logError(error: Error | AppError, context?: string) {
    if (error instanceof AppError) {
      this.logAppError(error, context);
    } else {
      this.logSystemError(error, context);
    }
  }

  private logAppError(error: AppError, context?: string) {
    const details = {
      code: error.code,
      recoverable: error.recoverable,
      context,
      stack: this.formatStack(error.stack)
    };

    this.logger.error('error', error.message, details);
  }

  private logSystemError(error: Error, context?: string) {
    const details = {
      type: error.name,
      context,
      stack: this.formatStack(error.stack)
    };

    this.logger.error('system', error.message, details);
  }

  private formatStack(stack?: string): Array<string | StackFrame> | undefined {
    if (!stack) return undefined;
    
    return stack
      .split('\n')
      .slice(1) // 移除第一行（错误消息）
      .map(line => line.trim())
      .filter(line => line.startsWith('at '))
      .map(line => {
        // 提取文件路径和行号
        const match = line.match(/at (.+?) \((.+?):(\d+):(\d+)\)/);
        if (match) {
          return {
            function: match[1],
            file: match[2],
            line: parseInt(match[3]),
            column: parseInt(match[4])
          };
        }
        return line;
      });
  }
}

export const createErrorLogger = (logger: Logger): ErrorLogger => {
  return new ErrorLogger(logger);
}; 