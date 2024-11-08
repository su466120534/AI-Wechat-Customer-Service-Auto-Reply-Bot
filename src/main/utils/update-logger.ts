import { logger } from './logger'
import { AppError } from '../../shared/types'

export const updateLogger = {
  info: (message: string) => {
    logger.info('Update', message);
  },
  warn: (message: string) => {
    logger.warn('Update', message);
  },
  error: (error: Error) => {
    logger.error('Update', error instanceof AppError ? error.message : error.toString());
  }
}; 