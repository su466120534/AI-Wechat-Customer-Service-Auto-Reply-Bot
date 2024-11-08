import { AppError, ErrorCode } from '../../shared/types/errors'
import { logger } from './logger'

interface ErrorStats {
  count: number;
  lastOccurred: Date;
  recoveryAttempts: number;
  recoverySuccess: number;
}

type ErrorThresholds = {
  [key in ErrorCode]?: number;
};

export class ErrorMonitor {
  private errorStats = new Map<ErrorCode, ErrorStats>();
  private readonly statsResetInterval = 24 * 60 * 60 * 1000; // 24小时

  // 定义错误阈值
  private readonly thresholds: ErrorThresholds = {
    [ErrorCode.BOT_DISCONNECTED]: 5,
    [ErrorCode.NETWORK_DISCONNECTED]: 3,
    [ErrorCode.API_REQUEST_FAILED]: 10,
    [ErrorCode.NETWORK_TIMEOUT]: 5,
    [ErrorCode.BOT_INIT_FAILED]: 3,
    [ErrorCode.CONFIG_INVALID]: 3,
    // 可以根据需要添加其他错误类型的阈值
  };

  constructor() {
    // 定期重置统计
    setInterval(() => this.resetStats(), this.statsResetInterval);
  }

  trackError(error: AppError) {
    const stats = this.errorStats.get(error.code) || {
      count: 0,
      lastOccurred: new Date(),
      recoveryAttempts: 0,
      recoverySuccess: 0
    };

    stats.count++;
    stats.lastOccurred = new Date();
    this.errorStats.set(error.code, stats);

    // 记录错误统计
    logger.info('Monitor', '错误统计更新', {
      code: error.code,
      stats
    });

    // 检查错误阈值
    this.checkErrorThreshold(error.code, stats);
  }

  trackRecoveryAttempt(error: AppError, success: boolean) {
    const stats = this.errorStats.get(error.code);
    if (stats) {
      stats.recoveryAttempts++;
      if (success) {
        stats.recoverySuccess++;
      }
      this.errorStats.set(error.code, stats);
    }
  }

  getStats(errorCode?: ErrorCode) {
    if (errorCode) {
      return this.errorStats.get(errorCode);
    }
    return Object.fromEntries(this.errorStats);
  }

  private checkErrorThreshold(code: ErrorCode, stats: ErrorStats) {
    const threshold = this.thresholds[code];
    if (threshold && stats.count >= threshold) {
      logger.warn('Monitor', '错误次数超过阈值', {
        code,
        count: stats.count,
        threshold
      });
    }
  }

  private resetStats() {
    this.errorStats.clear();
    logger.info('Monitor', '错误统计已重置');
  }
}

export const errorMonitor = new ErrorMonitor(); 