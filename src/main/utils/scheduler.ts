import * as nodeSchedule from 'node-schedule'
import { Wechaty } from 'wechaty'
import { logger } from './logger'
import ConfigManager from '../config'
import { ScheduleTask } from '../../shared/types/config'

class ScheduleManager {
  private tasks: Map<string, nodeSchedule.Job> = new Map()
  private bot: Wechaty | null = null;

  constructor() {
    this.initTasks()
  }

  setBot(bot: Wechaty) {
    this.bot = bot;
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

  private async scheduleTask(task: ScheduleTask) {
    try {
      const scheduledTask = nodeSchedule.scheduleJob(task.cron, async () => {
        try {
          if (!this.bot) {
            logger.error('Schedule', '机器人未初始化')
            return
          }

          const room = await this.bot.Room.find({ topic: task.roomName })
          if (room) {
            await room.say(task.message)
            logger.info('Schedule', `定时消息已发送到群 ${task.roomName}`)
          } else {
            logger.error('Schedule', `找不到群 ${task.roomName}`)
          }
        } catch (error) {
          logger.error('Schedule', '发送定时消息失败', error)
        }
      })
      
      if (scheduledTask) {
        this.tasks.set(task.id, scheduledTask)
        logger.info('Schedule', `定时任务 ${task.id} 已启动`)
      } else {
        logger.error('Schedule', `定时任务 ${task.id} 创建失败`)
      }
    } catch (error) {
      logger.error('Schedule', `启动定时任务 ${task.id} 失败`, error)
    }
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