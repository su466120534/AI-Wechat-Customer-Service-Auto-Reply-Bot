import { ipcMain } from 'electron';
import { LogLevel, LogItem } from '../../shared/types/logger';
import { mainLogger } from '../utils/main-logger';
import { logStorage } from '../utils/log-storage';

export function setupLogHandlers() {
  // 接收渲染进程的日志
  ipcMain.handle('log:add', async (_, logItem: LogItem) => {
    try {
      await logStorage.writeLog(logItem);
      const logger = mainLogger as unknown as Record<LogLevel, (category: string, message: string, details?: any) => void>;
      logger[logItem.level](logItem.category, logItem.message, logItem.details);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to write log' 
      };
    }
  });

  // 获取日志
  ipcMain.handle('log:get', async (_, filter?: {
    level?: LogLevel;
    category?: string;
    startTime?: string;
    endTime?: string;
  }) => {
    try {
      const logs = await logStorage.getLogs(
        filter?.startTime ? new Date(filter.startTime) : undefined,
        filter?.endTime ? new Date(filter.endTime) : undefined
      );

      // 应用过滤
      const filteredLogs = logs.filter(log => {
        if (filter?.level && log.level !== filter.level) return false;
        if (filter?.category && log.category !== filter.category) return false;
        return true;
      });

      return { success: true, data: filteredLogs };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get logs' 
      };
    }
  });

  // 清理日志
  ipcMain.handle('log:cleanup', async () => {
    try {
      await logStorage.cleanup();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to cleanup logs' 
      };
    }
  });

  // 设置日志级别
  ipcMain.handle('log:setLevel', (_, level: LogLevel) => {
    try {
      mainLogger.setLevel(level);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to set log level' 
      };
    }
  });
} 