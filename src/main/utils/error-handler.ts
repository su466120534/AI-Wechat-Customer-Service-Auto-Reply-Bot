import { logger } from './logger'
import { AppError, ErrorCode } from '../../shared/types/errors'

export function handleError(error: unknown, context: string) {
  if (error instanceof AppError) {
    logger.error(context, `${error.code}: ${error.message}`);
  } else if (error instanceof Error) {
    logger.error(context, 'Unexpected Error', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  } else {
    logger.error(context, 'Unknown Error', { error });
  }
}

// 注册全局错误处理
process.on('uncaughtException', (error) => {
  handleError(error, 'UncaughtException');
});

process.on('unhandledRejection', (reason) => {
  handleError(reason, 'UnhandledRejection');
}); 