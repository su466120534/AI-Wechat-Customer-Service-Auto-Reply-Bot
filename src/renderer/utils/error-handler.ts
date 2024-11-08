import { notification } from '../components/notification'
import { AppError, ErrorCode } from '../../shared/types/errors'

export function handleError(error: unknown, context: string) {
  if (error instanceof AppError) {
    if (error.shouldNotify) {
      notification.show(error.message, 'error');
    }
    console.error(`[${context}] ${error.code}: ${error.message}`);
  } else if (error instanceof Error) {
    notification.show('操作失败，请稍后重试', 'error');
    console.error(`[${context}] Unexpected Error:`, error);
  } else {
    notification.show('发生未知错误', 'error');
    console.error(`[${context}] Unknown Error:`, error);
  }
}

// 注册全局错误处理
window.onerror = (message, source, line, column, error) => {
  handleError(error || message, 'WindowError');
  return false;
};

window.onunhandledrejection = (event) => {
  handleError(event.reason, 'UnhandledRejection');
}; 