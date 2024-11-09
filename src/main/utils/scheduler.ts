import * as nodeSchedule from 'node-schedule'
import { Wechaty } from 'wechaty'
import { logger } from './logger'
import ConfigManager from '../config'
import { ScheduleTask } from '../../shared/types/config'
import { AppError, ErrorCode } from '../../shared/types/errors'
import { BrowserWindow } from 'electron'

interface TaskHistory {
  taskId: string;
  executionTime: string;
  status: 'success' | 'failed';
  error?: string;
}

class ScheduleManager {
  private tasks: Map<string, nodeSchedule.Job> = new Map()
  private bot: Wechaty | null = null;
  private taskHistory: Map<string, TaskHistory[]> = new Map();
  private readonly MAX_RETRY = 3;
  private readonly RETRY_DELAY = 60000; // 1分钟
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.initTasks()
  }

  setBot(bot: Wechaty) {
    this.bot = bot;
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private async executeTask(task: ScheduleTask) {
    try {
      logger.info('Schedule', `开始执行定时任务`, {
        taskId: task.id,
        roomNames: task.roomNames
      });

      if (!this.bot) {
        logger.error('Schedule', '机器人未初始化');
        throw new AppError('机器人未初始化', ErrorCode.BOT_NOT_INITIALIZED);
      }

      // 遍历所有目标群聊
      for (const roomName of task.roomNames) {
        try {
          logger.info('Schedule', `查找群聊`, {
            taskId: task.id,
            roomName
          });

          const room = await this.bot.Room.find({ topic: roomName });
          if (!room) {
            logger.error('Schedule', `找不到群聊`, {
              taskId: task.id,
              roomName
            });
            continue;
          }

          // 发送消息
          logger.info('Schedule', `开始发送消息`, {
            taskId: task.id,
            roomName,
            message: task.message
          });

          await room.say(task.message);
          
          logger.info('Schedule', `消息发送成功`, {
            taskId: task.id,
            roomName
          });
        } catch (error) {
          logger.error('Schedule', `向群发送消息失败`, {
            taskId: task.id,
            roomName,
            error: error instanceof Error ? error.message : '未知错误'
          });
          throw error;  // 抛出错误以触发重试机制
        }
      }

      // 记录成功执行
      this.recordTaskHistory(task.id, {
        taskId: task.id,
        executionTime: new Date().toISOString(),
        status: 'success'
      });

      logger.info('Schedule', `定时任务执行完成`, {
        taskId: task.id
      });

    } catch (error) {
      // 记录错误
      logger.error('Schedule', '定时任务执行失败', {
        taskId: task.id,
        error: error instanceof Error ? error.message : '未知错误',
      });

      // 记录失败历史
      this.recordTaskHistory(task.id, {
        taskId: task.id,
        executionTime: new Date().toISOString(),
        status: 'failed',
        error: error instanceof Error ? error.message : '未知错误'
      });

      // 根据错误类型决定是否重试
      if (this.shouldRetry(error)) {
        const delay = this.calculateRetryDelay();
        logger.info('Schedule', `将在 ${delay/1000} 秒后重试`, {
          taskId: task.id,
          attempt: 1,
          maxRetries: this.MAX_RETRY
        });

        setTimeout(() => {
          this.executeTask(task);
        }, delay);
      } else {
        // 达到最大重试次数或不需要重试的错误
        logger.error('Schedule', '任务执行最终失败', {
          taskId: task.id,
          maxRetriesExceeded: true,
          error: error instanceof Error ? error.message : '未知错误'
        });

        // 通知用户
        this.notifyTaskFailure(task, error);
      }
    }
  }

  private shouldRetry(error: any): boolean {
    // 可以重试的错误类型
    const retryableErrors = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.BOT_NOT_INITIALIZED,
      ErrorCode.BOT_NOT_LOGGED_IN,
      ErrorCode.ROOM_NOT_FOUND
    ];

    if (error instanceof AppError) {
      return retryableErrors.includes(error.code);
    }

    // 网络错误也可以重试
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    return false;
  }

  private calculateRetryDelay(): number {
    // 指数退避策略
    return Math.min(1000 * Math.pow(2, 0), 30000);
  }

  private notifyTaskFailure(task: ScheduleTask, error: any) {
    if (!this.bot) return;

    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const notification = {
      type: 'task_failure',
      taskId: task.id,
      roomName: task.roomNames[0],
      error: errorMessage,
      time: new Date().toISOString()
    };

    // 发送到主进程
    if (this.mainWindow) {
      this.mainWindow.webContents.send('schedule-error', notification);
    }
  }

  private recordTaskHistory(taskId: string, history: TaskHistory) {
    if (!this.taskHistory.has(taskId)) {
      this.taskHistory.set(taskId, []);
    }
    const histories = this.taskHistory.get(taskId)!;
    histories.unshift(history);
    
    // 只保留最近 10 条记录
    if (histories.length > 10) {
      histories.pop();
    }
  }

  getTaskHistory(taskId: string): TaskHistory[] {
    return this.taskHistory.get(taskId) || [];
  }

  private scheduleTask(task: ScheduleTask) {
    try {
      logger.info('Schedule', `开始创建定时任务`, {
        taskId: task.id,
        cron: task.cron,
        roomNames: task.roomNames
      });

      // 验证 cron 表达式
      try {
        const parser = require('cron-parser');
        const interval = parser.parseExpression(task.cron);
        const nextRun = interval.next().toDate();
        logger.info('Schedule', `下次执行时间`, {
          taskId: task.id,
          nextRun: nextRun.toLocaleString()
        });
      } catch (error) {
        logger.error('Schedule', `Cron 表达式无效`, {
          taskId: task.id,
          cron: task.cron,
          error: error instanceof Error ? error.message : '未知错误'
        });
        return;
      }

      const scheduledTask = nodeSchedule.scheduleJob(task.cron, () => {
        logger.info('Schedule', `触发定时任务`, {
          taskId: task.id,
          time: new Date().toLocaleString()
        });
        this.executeTask(task);
      });
      
      if (scheduledTask) {
        this.tasks.set(task.id, scheduledTask);
        const nextRun = scheduledTask.nextInvocation();
        logger.info('Schedule', `定时任务创建成功`, {
          taskId: task.id,
          nextRun: nextRun.toLocaleString()
        });
      } else {
        logger.error('Schedule', `定时任务创建失败`, {
          taskId: task.id
        });
      }
    } catch (error) {
      logger.error('Schedule', `创建定时任务失败`, {
        taskId: task.id,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  private initTasks() {
    const config = ConfigManager.getConfig()
    const schedules = config.schedules as ScheduleTask[]
    schedules.forEach(task => {
      if (task.enabled) {
        this.scheduleTask({
          id: task.id,
          roomNames: task.roomNames,
          message: task.message,
          cron: task.cron,
          enabled: task.enabled
        })
      }
    })
  }

  addTask(task: ScheduleTask) {
    const config = ConfigManager.getConfig()
    const configTask: ScheduleTask = {
      id: task.id,
      roomNames: task.roomNames,
      message: task.message,
      cron: task.cron,
      enabled: task.enabled
    }
    
    const schedules = config.schedules as ScheduleTask[]
    schedules.push(configTask)
    ConfigManager.saveConfig()

    if (task.enabled) {
      this.scheduleTask(task)
    }
  }

  updateTask(task: ScheduleTask) {
    const config = ConfigManager.getConfig()
    const schedules = config.schedules as ScheduleTask[]
    const index = schedules.findIndex(t => t.id === task.id)
    if (index !== -1) {
      const configTask: ScheduleTask = {
        id: task.id,
        roomNames: task.roomNames,
        message: task.message,
        cron: task.cron,
        enabled: task.enabled
      }
      schedules[index] = configTask
      ConfigManager.saveConfig()

      const existingTask = this.tasks.get(task.id)
      if (existingTask) {
        existingTask.cancel()
      }

      if (task.enabled) {
        this.scheduleTask(task)
      }
    }
  }

  deleteTask(taskId: string) {
    const config = ConfigManager.getConfig()
    const schedules = config.schedules as ScheduleTask[]
    config.schedules = schedules.filter(t => t.id !== taskId)
    ConfigManager.saveConfig()

    const existingTask = this.tasks.get(taskId)
    if (existingTask) {
      existingTask.cancel()
      this.tasks.delete(taskId)
    }
  }

  toggleTask(taskId: string, enabled: boolean) {
    const config = ConfigManager.getConfig()
    const schedules = config.schedules as ScheduleTask[]
    const configTask = schedules.find(t => t.id === taskId)
    if (configTask) {
      configTask.enabled = enabled
      ConfigManager.saveConfig()

      const existingTask = this.tasks.get(taskId)
      if (existingTask) {
        existingTask.cancel()
        this.tasks.delete(taskId)
      }

      if (enabled) {
        this.scheduleTask({
          id: configTask.id,
          roomNames: configTask.roomNames,
          message: configTask.message,
          cron: configTask.cron,
          enabled: configTask.enabled
        })
      }
    }
  }
}

export const scheduleManager = new ScheduleManager()