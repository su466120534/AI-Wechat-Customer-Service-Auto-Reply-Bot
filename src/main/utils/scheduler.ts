import * as nodeSchedule from 'node-schedule'
import { Wechaty, Room } from 'wechaty'
import { logger } from './logger'
import ConfigManager from '../config'
import { ScheduleTask, TaskHistory } from '../../shared/types/config'
import { AppError, ErrorCode } from '../../shared/types/errors'
import { BrowserWindow } from 'electron'

// 扩展 Wechaty 类型
interface ExtendedWechaty extends Wechaty {
    puppet?: {
        isLoggedIn: boolean;
    };
}

// 扩展 Room 类型
interface ExtendedRoom extends Room {
    id: string;
}

class ScheduleManager {
    private tasks: Map<string, NodeJS.Timeout> = new Map();
    private bot: ExtendedWechaty | null = null;
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
                roomNames: task.roomNames,
                message: task.message,
                time: new Date().toLocaleString()
            });

            if (!this.bot) {
                const error = new Error('机器人未初始化');
                this.updateTaskStatus(task, 'failed', error);
                return;
            }

            // 先获取所有群聊列表
            logger.info('Schedule', '开始获取所有群聊列表');
            const allRooms = await (this.bot.Room as any).findAll() as ExtendedRoom[];
            logger.info('Schedule', `获取到 ${allRooms.length} 个群聊`);

            let hasError = false;
            let errorMessage = '';

            // 遍历目标群聊
            for (const roomName of task.roomNames) {
                try {
                    // 添加随机延时，让发送更自然
                    if (task.roomNames.indexOf(roomName) > 0) {
                        const delay = this.getRandomDelay(task.roomNames.indexOf(roomName));
                        logger.info('Schedule', `等待随机延时后发送下一条消息`, {
                            roomName,
                            delay: `${delay / 1000} 秒`
                        });
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }

                    logger.info('Schedule', `开始查找目标群聊: ${roomName}`);
                    let targetRoom = await this.bot.Room.find({ topic: roomName });

                    if (!targetRoom) {
                        const error = new Error(`找不到群聊: ${roomName}`);
                        logger.error('Schedule', error.message);
                        hasError = true;
                        errorMessage += `${roomName}: 群聊不存在; `;
                        continue;
                    }

                    // 发送消息前记录日志
                    logger.info('AI', `准备发送消息`, {
                        taskId: task.id,
                        roomName,
                        message: task.message,
                        type: 'scheduled_task'
                    });

                    // 发送消息
                    await targetRoom.say(task.message);
                    
                    // 发送成功后记录日志
                    logger.info('AI', `消息发送成功`, {
                        taskId: task.id,
                        roomName,
                        message: task.message,
                        type: 'scheduled_task',
                        status: 'success',
                        time: new Date().toLocaleString()
                    });

                    // 每发送10条消息后添加较长的延时
                    if ((task.roomNames.indexOf(roomName) + 1) % 10 === 0) {
                        const longDelay = this.getLongDelay();
                        logger.info('Schedule', `已发送10条消息，添加较长延时`, {
                            delay: `${longDelay / 1000} 秒`
                        });
                        await new Promise(resolve => setTimeout(resolve, longDelay));
                    }

                } catch (error) {
                    hasError = true;
                    errorMessage += `${roomName}: ${error instanceof Error ? error.message : '发送失败'}; `;
                    logger.error('Schedule', `向群 ${roomName} 发送消息失败`, error);
                    // 发送失败记录错误日志
                    logger.error('AI', `消息发送失败`, {
                        taskId: task.id,
                        roomName,
                        message: task.message,
                        type: 'scheduled_task',
                        error: error instanceof Error ? error.message : '发送失败',
                        stack: error instanceof Error ? error.stack : undefined,
                        time: new Date().toLocaleString()
                    });
                }
            }

            // 更新任务状态
            if (hasError) {
                this.updateTaskStatus(task, 'failed', new Error(errorMessage));
            } else {
                this.updateTaskStatus(task, 'success');
            }

        } catch (error) {
            const err = error instanceof Error ? error : new Error('未知错误');
            this.updateTaskStatus(task, 'failed', err);
            logger.error('Schedule', '执行定时任务失败', error);
        }
    }

    // 添加任务状态更新方法
    private updateTaskStatus(task: ScheduleTask, status: 'success' | 'failed', error?: Error) {
        task.completed = true;
        task.completedAt = new Date().toISOString();
        task.lastRun = new Date().toISOString();
        task.lastStatus = status;
        if (error) {
            task.error = error.message;
        }

        // 更新配置
        const config = ConfigManager.getConfig();
        const taskIndex = config.schedules.findIndex(t => t.id === task.id);
        if (taskIndex !== -1) {
            config.schedules[taskIndex] = task;
            ConfigManager.saveConfig();

            // 通知渲染进程
            if (this.mainWindow) {
                this.mainWindow.webContents.send('task-status-update', {
                    taskId: task.id,
                    status,
                    message: error ? error.message : '任务执行完成'
                });

                // 通知刷新任务列表
                this.mainWindow.webContents.send('refresh-tasks');
            }
        }

        // 从活动任务中移除
        this.tasks.delete(task.id);
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

    private async scheduleTask(task: ScheduleTask) {
        try {
            logger.info('Schedule', `开始创建定时任务`, {
                taskId: task.id,
                message: task.message,
                roomNames: task.roomNames
            });

            // 解析执行时间
            const [minute, hour, day, month] = task.cron.split(' ');
            const targetTime = new Date();
            targetTime.setMonth(parseInt(month) - 1);  // 月份从0开始
            targetTime.setDate(parseInt(day));
            targetTime.setHours(parseInt(hour));
            targetTime.setMinutes(parseInt(minute));
            targetTime.setSeconds(0);

            const now = new Date();
            const delay = targetTime.getTime() - now.getTime();

            logger.info('Schedule', `任务时间信息`, {
                taskId: task.id,
                currentTime: now.toLocaleString(),
                targetTime: targetTime.toLocaleString(),
                delay: `${delay / 1000} 秒`
            });

            // 如果时间已过，直接执行
            if (delay <= 0) {
                logger.info('Schedule', `任务立即执行`, { taskId: task.id });
                await this.executeTask(task);
                return;
            }

            // 检查任务是否已存在
            if (this.tasks.has(task.id)) {
                const existingTimer = this.tasks.get(task.id);
                if (existingTimer) {
                    clearTimeout(existingTimer);  // 使用 clearTimeout
                    this.tasks.delete(task.id);
                }
            }

            // 设置定时器
            const timer = setTimeout(async () => {
                logger.info('Schedule', `定时器触发，开始执行任务`, {
                    taskId: task.id,
                    executionTime: new Date().toLocaleString()
                });
                await this.executeTask(task);
                
                // 任务执行完成后清理
                this.tasks.delete(task.id);
                task.completed = true;
                task.completedAt = new Date().toISOString();
                
                // 更新配置
                const config = ConfigManager.getConfig();
                const taskIndex = config.schedules.findIndex(t => t.id === task.id);
                if (taskIndex !== -1) {
                    config.schedules[taskIndex] = task;
                    ConfigManager.saveConfig();
                }
            }, delay);

            // 保存定时器引用
            this.tasks.set(task.id, timer);
            logger.info('Schedule', `任务已设置定时器`, {
                taskId: task.id,
                executeAt: targetTime.toLocaleString()
            });

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
                    enabled: task.enabled,
                    isOneTime: task.isOneTime,
                    createdAt: task.createdAt
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
            enabled: task.enabled,
            isOneTime: task.isOneTime,
            createdAt: task.createdAt
        }
        
        const schedules = config.schedules as ScheduleTask[]
        schedules.push(configTask)
        ConfigManager.saveConfig()

        if (task.enabled) {
            this.scheduleTask(task)
        }
    }

    updateTask(task: ScheduleTask) {
        const config = ConfigManager.getConfig();
        const schedules = config.schedules as ScheduleTask[];
        const index = schedules.findIndex(t => t.id === task.id);
        if (index !== -1) {
            const configTask: ScheduleTask = {
                id: task.id,
                roomNames: task.roomNames,
                message: task.message,
                cron: task.cron,
                enabled: task.enabled,
                isOneTime: task.isOneTime,
                createdAt: task.createdAt
            };
            schedules[index] = configTask;
            ConfigManager.saveConfig();

            const existingTimer = this.tasks.get(task.id);
            if (existingTimer) {
                clearTimeout(existingTimer);  // 使用 clearTimeout 替代 cancel
                this.tasks.delete(task.id);
            }

            if (task.enabled) {
                this.scheduleTask(task);
            }
        }
    }

    deleteTask(taskId: string) {
        try {
            logger.info('Schedule', `开始删除任务`, { taskId });

            // 1. 先取消定时任务
            const existingTimer = this.tasks.get(taskId);
            if (existingTimer) {
                logger.info('Schedule', `取消定时任务`, { taskId });
                clearTimeout(existingTimer);  // 使用 clearTimeout
                this.tasks.delete(taskId);  // 从 Map 中移除
            }

            // 2. 从配置中删除
            const config = ConfigManager.getConfig();
            config.schedules = config.schedules.filter(t => t.id !== taskId);
            ConfigManager.saveConfig();

            logger.info('Schedule', `任务删除成功`, { taskId });
        } catch (error) {
            logger.error('Schedule', `删除任务失败`, {
                taskId,
                error: error instanceof Error ? error.message : '未知错误'
            });
            throw error;
        }
    }

    toggleTask(taskId: string, enabled: boolean) {
        const config = ConfigManager.getConfig();
        const schedules = config.schedules as ScheduleTask[];
        const configTask = schedules.find(t => t.id === taskId);
        if (configTask) {
            configTask.enabled = enabled;
            ConfigManager.saveConfig();

            const existingTimer = this.tasks.get(taskId);
            if (existingTimer) {
                clearTimeout(existingTimer);  // 使用 clearTimeout
                this.tasks.delete(taskId);
            }

            if (enabled) {
                this.scheduleTask({
                    ...configTask,
                    enabled: true
                });
            }
        }
    }

    // 添加辅助方法来列出所有可用群聊
    private async listAllRooms(): Promise<string[]> {
        try {
            if (!this.bot) return [];
            // 使用类型断言
            const rooms = await (this.bot.Room as any).findAll() as ExtendedRoom[];
            const roomNames = await Promise.all(rooms.map(async (room: ExtendedRoom) => await room.topic()));
            return roomNames;
        } catch (error) {
            logger.error('Schedule', '获取群聊列表失败', error);
            return [];
        }
    }

    // 添加直接测试方法
    public async testDirectSend(roomName: string, message: string) {
        try {
            logger.info('Test', '开始直接发送测试', {
                roomName,
                message,
                time: new Date().toLocaleString()
            });

            if (!this.bot) {
                logger.error('Test', '机器人未初始化');
                throw new Error('机器人未初始化');
            }

            // 检查登录状态
            const isLoggedIn = this.bot.puppet?.isLoggedIn;
            logger.info('Test', '机器人登录状态', { isLoggedIn });

            // 获取所有群聊列表
            logger.info('Test', '开始获取群聊列表');
            const allRooms = await (this.bot.Room as any).findAll() as ExtendedRoom[];
            logger.info('Test', `获取到 ${allRooms.length} 个群聊`);

            // 打印所有群名
            for (const room of allRooms) {
                const topic = await room.topic();
                logger.info('Test', `发现群聊: ${topic}`, {
                    roomId: room.id
                });
            }

            // 查找目标群聊
            logger.info('Test', `开始查找目标群聊: ${roomName}`);
            const room = await this.bot.Room.find({ topic: roomName });

            if (!room) {
                logger.error('Test', `找不到群聊: ${roomName}`);
                throw new Error(`找不到群聊: ${roomName}`);
            }

            logger.info('Test', `找到群聊，准备发送消息`, {
                roomName,
                message
            });

            // 发送消息
            await room.say(message);
            logger.info('Test', '消息发送成功');

            return {
                success: true,
                message: '测试消息发送成功'
            };

        } catch (error) {
            logger.error('Test', '测试发送失败', {
                error: error instanceof Error ? error.message : '未知错误',
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }

    // 添加辅助方法
    private async findSimilarRoom(rooms: ExtendedRoom[], targetName: string): Promise<Room> {
        for (const room of rooms) {
            const topic = await room.topic();
            // 简单的包含关系检查
            if (topic.includes(targetName) || targetName.includes(topic)) {
                return room;  // Room 类型
            }
        }
        throw new Error(`找不到匹配的群聊: ${targetName}`);  // 如果找不到，抛出错误
    }

    // 获取随机延时（2-5秒）
    private getRandomDelay(index: number): number {
        const minDelay = 2000;  // 最小延时2秒
        const maxDelay = 5000;  // 最大延时5秒
        return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    }

    // 获取较长延时（30-60秒）
    private getLongDelay(): number {
        const minDelay = 30000;  // 最小延时30秒
        const maxDelay = 60000;  // 最大延时60秒
        return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    }
}

export const scheduleManager = new ScheduleManager()