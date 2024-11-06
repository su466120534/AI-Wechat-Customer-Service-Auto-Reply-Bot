"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleManager = void 0;
const nodeSchedule = __importStar(require("node-schedule"));
const logger_1 = require("./logger");
const config_manager_1 = __importDefault(require("../config-manager"));
class ScheduleManager {
    constructor() {
        this.tasks = new Map();
        this.bot = null;
        this.initTasks();
    }
    setBot(bot) {
        this.bot = bot;
    }
    initTasks() {
        const config = config_manager_1.default.getConfig();
        const schedules = config.schedules;
        schedules.forEach(task => {
            if (task.enabled) {
                this.scheduleTask({
                    id: task.id,
                    roomName: task.roomName,
                    message: task.message,
                    cron: task.time,
                    enabled: task.enabled
                });
            }
        });
    }
    async scheduleTask(task) {
        try {
            const scheduledTask = nodeSchedule.scheduleJob(task.cron, async () => {
                try {
                    if (!this.bot) {
                        logger_1.logger.error('Schedule', '机器人未初始化');
                        return;
                    }
                    const room = await this.bot.Room.find({ topic: task.roomName });
                    if (room) {
                        await room.say(task.message);
                        logger_1.logger.info('Schedule', `定时消息已发送到群 ${task.roomName}`);
                    }
                    else {
                        logger_1.logger.error('Schedule', `找不到群 ${task.roomName}`);
                    }
                }
                catch (error) {
                    logger_1.logger.error('Schedule', '发送定时消息失败', error);
                }
            });
            if (scheduledTask) {
                this.tasks.set(task.id, scheduledTask);
                logger_1.logger.info('Schedule', `定时任务 ${task.id} 已启动`);
            }
            else {
                logger_1.logger.error('Schedule', `定时任务 ${task.id} 创建失败`);
            }
        }
        catch (error) {
            logger_1.logger.error('Schedule', `启动定时任务 ${task.id} 失败`, error);
        }
    }
    addTask(task) {
        const config = config_manager_1.default.getConfig();
        const configTask = {
            id: task.id,
            roomName: task.roomName,
            message: task.message,
            time: task.cron,
            enabled: task.enabled
        };
        const schedules = config.schedules;
        schedules.push(configTask);
        config_manager_1.default.saveConfig();
        if (task.enabled) {
            this.scheduleTask(task);
        }
    }
    updateTask(task) {
        const config = config_manager_1.default.getConfig();
        const schedules = config.schedules;
        const index = schedules.findIndex(t => t.id === task.id);
        if (index !== -1) {
            const configTask = {
                id: task.id,
                roomName: task.roomName,
                message: task.message,
                time: task.cron,
                enabled: task.enabled
            };
            schedules[index] = configTask;
            config_manager_1.default.saveConfig();
            const existingTask = this.tasks.get(task.id);
            if (existingTask) {
                existingTask.cancel();
            }
            if (task.enabled) {
                this.scheduleTask(task);
            }
        }
    }
    deleteTask(taskId) {
        const config = config_manager_1.default.getConfig();
        const schedules = config.schedules;
        config.schedules = schedules.filter(t => t.id !== taskId);
        config_manager_1.default.saveConfig();
        const existingTask = this.tasks.get(taskId);
        if (existingTask) {
            existingTask.cancel();
            this.tasks.delete(taskId);
        }
    }
    toggleTask(taskId, enabled) {
        const config = config_manager_1.default.getConfig();
        const schedules = config.schedules;
        const configTask = schedules.find(t => t.id === taskId);
        if (configTask) {
            configTask.enabled = enabled;
            config_manager_1.default.saveConfig();
            const existingTask = this.tasks.get(taskId);
            if (existingTask) {
                existingTask.cancel();
                this.tasks.delete(taskId);
            }
            if (enabled) {
                this.scheduleTask({
                    id: configTask.id,
                    roomName: configTask.roomName,
                    message: configTask.message,
                    cron: configTask.time,
                    enabled: configTask.enabled
                });
            }
        }
    }
}
exports.scheduleManager = new ScheduleManager();
//# sourceMappingURL=scheduler.js.map