import { rendererLogger } from './renderer-logger'
import { notification } from '../components/notification'

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly shouldNotify: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(error: unknown, context: string = '') {
  if (error instanceof AppError) {
    if (error.shouldNotify) {
      notification.show(error.message, 'error');
    }
    rendererLogger.error(context, `${error.code || 'ERROR'}: ${error.message}`);
  } else if (error instanceof Error) {
    notification.show('操作失败，请稍后重试', 'error');
    rendererLogger.error(context, 'Unexpected Error', error);
  } else {
    notification.show('发生未知错误', 'error');
    rendererLogger.error(context, 'Unknown Error', { error });
  }
}

export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  BOT_ERROR: 'BOT_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
  SCHEDULE_ERROR: 'SCHEDULE_ERROR'
} as const; 