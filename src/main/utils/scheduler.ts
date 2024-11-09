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

  private async executeTask(task: ScheduleTask, retryCount = 0) {
    try {
      if (!this.bot) {
        throw new AppError('机器人未初始化', ErrorCode.BOT_NOT_INITIALIZED);
      }

      // 检查机器人状态
      try {
        // 使用 Room.find 来检查机器人状态，如果能找到群，说明机器人在线
        const testRoom = await this.bot.Room.find({ topic: task.roomName });
        if (!testRoom) {
          throw new AppError('机器人未登录或未准备就绪', ErrorCode.BOT_NOT_LOGGED_IN);
        }

        // 发送消息
        await testRoom.say(task.message);
        
        // 记录成功执行
        this.recordTaskHistory(task.id, {
          taskId: task.id,
          executionTime: new Date().toISOString(),
          status: 'success'
        });

        logger.info('Schedule', '定时消息发送成功', {
          taskId: task.id,
          room: task.roomName,
          message: task.message
        });

      } catch (error) {
        // 记录错误
        logger.error('Schedule', '定时任务执行失败', {
          taskId: task.id,
          error: error instanceof Error ? error.message : '未知错误',
          retryCount
        });

        // 记录失败历史
        this.recordTaskHistory(task.id, {
          taskId: task.id,
          executionTime: new Date().toISOString(),
          status: 'failed',
          error: error instanceof Error ? error.message : '未知错误'
        });

        // 根据错误类型决定是否重试
        if (this.shouldRetry(error) && retryCount < this.MAX_RETRY) {
          const delay = this.calculateRetryDelay(retryCount);
          logger.info('Schedule', `将在 ${delay/1000} 秒后重试`, {
            taskId: task.id,
            attempt: retryCount + 1,
            maxRetries: this.MAX_RETRY
          });

          setTimeout(() => {
            this.executeTask(task, retryCount + 1);
          }, delay);
        } else {
          // 达到最大重试次数或不需要重试的错误
          logger.error('Schedule', '任务执行最终失败', {
            taskId: task.id,
            maxRetriesExceeded: retryCount >= this.MAX_RETRY,
            error: error instanceof Error ? error.message : '未知错误'
          });

          // 通知用户
          this.notifyTaskFailure(task, error);
        }
      }
    } catch (error) {
      logger.error('Schedule', `启动定时任务 ${task.id} 失败`, error);
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

  private calculateRetryDelay(retryCount: number): number {
    // 指数退避策略
    return Math.min(1000 * Math.pow(2, retryCount), 30000);
  }

  private notifyTaskFailure(task: ScheduleTask, error: any) {
    if (!this.bot) return;

    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const notification = {
      type: 'task_failure',
      taskId: task.id,
      roomName: task.roomName,
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
      const scheduledTask = nodeSchedule.scheduleJob(task.cron, () => {
        this.executeTask(task);
      });
      
      if (scheduledTask) {
        this.tasks.set(task.id, scheduledTask);
        
        // 计算下次执行时间
        const nextRun = scheduledTask.nextInvocation();
        logger.info('Schedule', `定时任务 ${task.id} 已启动，下次执行时间: ${nextRun}`);
      } else {
        logger.error('Schedule', `定时任务 ${task.id} 创建失败`);
      }
    } catch (error) {
      logger.error('Schedule', `启动定时任务 ${task.id} 失败`, error);
    }
  }

  private initTasks() {
    const config = ConfigManager.getConfig()
    const schedules = config.schedules as ScheduleTask[]
    schedules.forEach(task => {
      if (task.enabled) {
        this.scheduleTask({
          id: task.id,
          roomName: task.roomName,
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
      roomName: task.roomName,
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
        roomName: task.roomName,
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
          roomName: configTask.roomName,
          message: configTask.message,
          cron: configTask.cron,
          enabled: configTask.enabled
        })
      }
    }
  }
}

export const scheduleManager = new ScheduleManager()