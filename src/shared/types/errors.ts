// 基础错误类型
export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public recoverable: boolean = true,
    public shouldNotify: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 详细的错误代码
export enum ErrorCode {
  UNKNOWN = 'UNKNOWN',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_SAVE_FAILED = 'CONFIG_SAVE_FAILED',
  BOT_INIT_FAILED = 'BOT_INIT_FAILED',
  BOT_MESSAGE_FAILED = 'BOT_MESSAGE_FAILED',
  BOT_DISCONNECTED = 'BOT_DISCONNECTED',
  BOT_NOT_INITIALIZED = 'BOT_NOT_INITIALIZED',
  BOT_NOT_LOGGED_IN = 'BOT_NOT_LOGGED_IN',
  NETWORK_DISCONNECTED = 'NETWORK_DISCONNECTED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  SYSTEM_RESOURCE_ERROR = 'SYSTEM_RESOURCE_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  AI_RESPONSE_INVALID = 'AI_RESPONSE_INVALID',
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND'
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