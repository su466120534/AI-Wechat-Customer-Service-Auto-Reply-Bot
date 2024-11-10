export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success' | 'warning';

export interface LoggerConfig {
    level: LogLevel;
    prefix?: string;
    timestamp?: boolean;
    enableConsole?: boolean;
    maxLogItems?: number;
    logToFile?: boolean;
}

export interface Logger {
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    success(message: string, ...args: any[]): void;
    warning(message: string, ...args: any[]): void;
}

export interface LogItem {
    timestamp: string;
    level: LogLevel;
    category: string;
    message: string;
    details?: any;
}

export type ConsoleMethodMap = Record<LogLevel, keyof Console>;

export const defaultConsoleMethodMap: ConsoleMethodMap = {
    info: 'info',
    warn: 'warn',
    error: 'error',
    debug: 'debug',
    success: 'info',
    warning: 'warn'
};

export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
    level: 'info',
    timestamp: true,
    enableConsole: true,
    maxLogItems: 1000,
    logToFile: true
}; 