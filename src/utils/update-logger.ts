import { logger } from './logger'

export const updateLogger = {
  info(message: string) {
    logger.info('Update', message)
  },
  warn(message: string) {
    logger.warn('Update', message)
  },
  error(message: string) {
    logger.error('Update', message)
  },
  debug(message: string) {
    logger.debug('Update', message)
  }
} 