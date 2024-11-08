import { describe, it, expect, beforeEach } from '@jest/globals';
import { RendererLogger } from '../renderer/utils/renderer-logger';
import { MainLogger } from '../main/utils/main-logger';
import { LogLevel, LogItem } from '../shared/types/logger';
import { LogAnalyzer } from '../shared/utils/log-analyzer';

describe('Logger Tests', () => {
  let rendererLogger: RendererLogger;
  let mainLogger: MainLogger;
  let logAnalyzer: LogAnalyzer;

  beforeEach(() => {
    rendererLogger = new RendererLogger({ enableConsole: false });
    mainLogger = new MainLogger({ enableConsole: false, logToFile: false });
    logAnalyzer = new LogAnalyzer();
  });

  describe('Basic Logging', () => {
    it('should create log entries with correct format', () => {
      rendererLogger.info('test', 'test message');
      const logs = rendererLogger.getLogs();
      
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: 'info',
        category: 'test',
        message: 'test message'
      });
    });

    it('should respect log level filtering', () => {
      rendererLogger.setLevel('warn');
      
      rendererLogger.debug('test', 'debug message');
      rendererLogger.info('test', 'info message');
      rendererLogger.warn('test', 'warn message');
      
      const logs = rendererLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('warn message');
    });
  });

  describe('Log Analysis', () => {
    it('should analyze logs correctly', () => {
      const testLogs: LogItem[] = [
        {
          level: 'error',
          category: 'test',
          message: 'error 1',
          timestamp: new Date().toISOString()
        },
        {
          level: 'error',
          category: 'test',
          message: 'error 1',
          timestamp: new Date().toISOString()
        },
        {
          level: 'info',
          category: 'test',
          message: 'info message',
          timestamp: new Date().toISOString()
        }
      ];

      const analysis = logAnalyzer.analyze(testLogs);
      
      expect(analysis.totalLogs).toBe(3);
      expect(analysis.errorCount).toBe(2);
      expect(analysis.errorFrequency['test:error 1']).toBe(2);
    });
  });

  describe('Log Filtering', () => {
    it('should filter logs by category', () => {
      rendererLogger.info('category1', 'message 1');
      rendererLogger.info('category2', 'message 2');
      
      const filtered = rendererLogger.getLogs({ category: 'category1' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].message).toBe('message 1');
    });

    it('should filter logs by time range', () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 3600000);
      
      rendererLogger.info('test', 'old message');
      const logs = rendererLogger.getLogs({
        startTime: hourAgo.toISOString(),
        endTime: now.toISOString()
      });
      
      expect(logs).toHaveLength(1);
    });
  });
}); 