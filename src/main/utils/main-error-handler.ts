import { logger } from './logger'
import { AppError } from '../../shared/types'

export function handleError(error: unknown, context: string = '') {
  if (error instanceof AppError) {
    logger.error(context, `${error.code || 'ERROR'}: ${error.message}`);
  } else if (error instanceof Error) {
    logger.error(context, 'Unexpected Error', error);
  } else {
    logger.error(context, 'Unknown Error', { error });
  }
} 