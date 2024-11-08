import * as fs from 'fs';
import * as path from 'path';
import { LogItem } from '../../shared/types/logger';
import { app } from 'electron';
import archiver = require('archiver');

export class LogStorage {
  private baseLogPath: string;
  private currentLogFile: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private maxLogFiles: number = 30; // 保留30天的日志

  constructor() {
    this.baseLogPath = path.join(app.getPath('userData'), 'logs');
    this.currentLogFile = this.getLogFilePath();
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(this.baseLogPath)) {
      fs.mkdirSync(this.baseLogPath, { recursive: true });
    }
  }

  private getLogFilePath(date: Date = new Date()): string {
    const dateStr = date.toISOString().split('T')[0];
    return path.join(this.baseLogPath, `app-${dateStr}.log`);
  }

  async writeLog(logItem: LogItem): Promise<void> {
    const logFile = this.getLogFilePath();
    
    // 如果日期变化，切换日志文件
    if (logFile !== this.currentLogFile) {
      await this.rotateLogFiles();
      this.currentLogFile = logFile;
    }

    // 检查文件大小
    try {
      const stats = await fs.promises.stat(this.currentLogFile);
      if (stats.size >= this.maxFileSize) {
        await this.rotateLogFiles();
      }
    } catch (error) {
      // 文件不存在，继续写入
    }

    const logString = `${logItem.timestamp} [${logItem.level.toUpperCase()}] [${logItem.category}] ${logItem.message}\n`;
    await fs.promises.appendFile(this.currentLogFile, logString);
  }

  private async rotateLogFiles(): Promise<void> {
    // 获取所有日志文件
    const files = await fs.promises.readdir(this.baseLogPath);
    const logFiles = files.filter(f => f.startsWith('app-') && f.endsWith('.log'));

    // 按日期排序
    logFiles.sort().reverse();

    // 如果超过最大文件数，压缩旧文件
    if (logFiles.length >= this.maxLogFiles) {
      const oldFiles = logFiles.slice(this.maxLogFiles - 1);
      for (const file of oldFiles) {
        await this.archiveLogFile(file);
      }
    }
  }

  private async archiveLogFile(filename: string): Promise<void> {
    const filePath = path.join(this.baseLogPath, filename);
    const archivePath = path.join(this.baseLogPath, 'archives');
    
    if (!fs.existsSync(archivePath)) {
      fs.mkdirSync(archivePath, { recursive: true });
    }

    const archive = archiver('zip', { 
      zlib: { level: 9 } // 设置压缩级别
    });
    
    const output = fs.createWriteStream(
      path.join(archivePath, `${filename}.zip`)
    );

    return new Promise((resolve, reject) => {
      output.on('close', async () => {
        try {
          await fs.promises.unlink(filePath);
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      archive.on('error', reject);
      archive.pipe(output);
      archive.file(filePath, { name: filename });
      archive.finalize();
    });
  }

  async getLogs(startDate?: Date, endDate?: Date): Promise<LogItem[]> {
    const files = await fs.promises.readdir(this.baseLogPath);
    const logFiles = files
      .filter(f => f.startsWith('app-') && f.endsWith('.log'))
      .sort();

    const logs: LogItem[] = [];
    
    for (const file of logFiles) {
      const fileDate = new Date(file.slice(4, 14));
      if (startDate && fileDate < startDate) continue;
      if (endDate && fileDate > endDate) continue;

      const content = await fs.promises.readFile(
        path.join(this.baseLogPath, file),
        'utf-8'
      );
      
      const items = this.parseLogFile(content);
      logs.push(...items);
    }

    return logs;
  }

  private parseLogFile(content: string): LogItem[] {
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/^(.+?) \[(.+?)\] \[(.+?)\] (.+)$/);
        if (!match) return null;

        return {
          timestamp: match[1],
          level: match[2].toLowerCase() as any,
          category: match[3],
          message: match[4]
        };
      })
      .filter((item): item is LogItem => item !== null);
  }

  async cleanup(): Promise<void> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const files = await fs.promises.readdir(this.baseLogPath);
    
    for (const file of files) {
      if (!file.startsWith('app-') || !file.endsWith('.log')) continue;
      
      const fileDate = new Date(file.slice(4, 14));
      if (fileDate < thirtyDaysAgo) {
        const filePath = path.join(this.baseLogPath, file);
        await this.archiveLogFile(file);
      }
    }
  }
}

// 导出单例实例
export const logStorage = new LogStorage();