// 基础错误类型
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly shouldNotify: boolean = true,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 详细的错误代码
export enum ErrorCode {
  // 配置相关错误
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_SAVE_FAILED = 'CONFIG_SAVE_FAILED',
  
  // API 相关错误
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  
  // 机器人相关错误
  BOT_INIT_FAILED = 'BOT_INIT_FAILED',
  BOT_MESSAGE_FAILED = 'BOT_MESSAGE_FAILED',
  BOT_DISCONNECTED = 'BOT_DISCONNECTED',
  
  // 定时任务相关错误
  SCHEDULE_INVALID = 'SCHEDULE_INVALID',
  SCHEDULE_SAVE_FAILED = 'SCHEDULE_SAVE_FAILED',
  
  // 系统错误
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_DISCONNECTED = 'NETWORK_DISCONNECTED',
  SYSTEM_RESOURCE_ERROR = 'SYSTEM_RESOURCE_ERROR',
  AI_RESPONSE_INVALID = 'AI_RESPONSE_INVALID',
  
  // 兼容旧版错误码
  INVALID_INPUT = 'INVALID_INPUT',
  BOT_ERROR = 'BOT_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  SCHEDULE_ERROR = 'SCHEDULE_ERROR'
}

// 特定错误类型
export class NetworkError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.NETWORK_DISCONNECTED) {
    super(message, code, true);
    this.name = 'NetworkError';
  }
}

export class ConfigError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.CONFIG_INVALID) {
    super(message, code, true);
    this.name = 'ConfigError';
  }
}

export class BotError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.BOT_INIT_FAILED) {
    super(message, code, true);
    this.name = 'BotError';
  }
}

export class AiServiceError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.API_REQUEST_FAILED) {
    super(message, code, true);
    this.name = 'AiServiceError';
  }
}

// 错误恢复策略
export interface ErrorRecoveryStrategy {
  maxRetries: number;
  retryDelay: number;
  shouldRetry: (error: AppError) => boolean;
  onRetry: (error: AppError, attempt: number) => void;
  onMaxRetriesExceeded: (error: AppError) => void;
} 