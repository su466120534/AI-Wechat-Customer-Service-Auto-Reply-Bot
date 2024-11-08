import { logger } from './logger'

interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  shouldRetry?: (error: any) => boolean;
}

export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    shouldRetry = () => true
  } = options;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      logger.warn('Retry', `操作失败，${delay/1000}秒后重试，剩余重试次数: ${maxAttempts - attempt}`, {
        error,
        attempt
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
} 