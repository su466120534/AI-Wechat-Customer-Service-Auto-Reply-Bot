import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { logger } from '../utils/logger'
import { AppError, ErrorCode } from '../../shared/types/errors'
import { AitiwoService } from '../services/aitiwo'

// 在文件开头添加 Config 接口定义
interface Config {
    aitiwoKey: string;
    contactWhitelist: string[];
    roomWhitelist: string[];
    schedules: ScheduleTask[];
    botStatus: {
        isLoggedIn: boolean;
        lastLoginTime?: string;
        userName?: string;
    };
}

class ConfigManager {
    private config: Config;
    private configPath: string;
    private aitiwoService: AitiwoService | null = null;

    constructor() {
        this.configPath = path.join(app.getPath('userData'), 'config.json');
        this.config = {
            aitiwoKey: '',
            contactWhitelist: [],
            roomWhitelist: [],
            schedules: [],
            botStatus: {
                isLoggedIn: false
            }
        };
        this.loadConfig();
    }

    private loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf-8');
                const loadedConfig = JSON.parse(data);
                this.config = {
                    aitiwoKey: loadedConfig.aitiwoKey || '',
                    contactWhitelist: loadedConfig.contactWhitelist || [],
                    roomWhitelist: loadedConfig.roomWhitelist || [],
                    schedules: loadedConfig.schedules || [],
                    botStatus: loadedConfig.botStatus || { isLoggedIn: false }
                };
                logger.info('Config', '配置文件加载成功');
            } else {
                this.saveConfig();
                logger.info('Config', '创建了新的配置文件');
            }
        } catch (error) {
            logger.error('Config', '加载配置文件失败', error);
            throw new AppError('配置文件加载失败', ErrorCode.CONFIG_INVALID);
        }
    }

    public saveConfig(newConfig?: Config) {
        try {
            if (newConfig) {
                this.config = newConfig;
            }
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            logger.info('Config', '配置保存成功');
        } catch (error) {
            logger.error('Config', '保存配置文件失败', error);
            throw new AppError('配置保存失败', ErrorCode.CONFIG_SAVE_FAILED);
        }
    }

    public getConfig(): Config {
        return { ...this.config };
    }

    public setAitiwoKey(key: string) {
        if (!key.trim()) {
            throw new AppError('API Key 不能为空', ErrorCode.CONFIG_INVALID);
        }
        this.config.aitiwoKey = key;
        this.saveConfig();
    }

    public setWhitelists(contacts: string[], rooms: string[]) {
        this.config.contactWhitelist = [...contacts];
        this.config.roomWhitelist = [...rooms];
        this.saveConfig();
    }

    public addScheduleTask(task: ScheduleTask) {
        this.config.schedules.push(task);
        this.saveConfig();
    }

    public updateScheduleTask(taskId: string, enabled: boolean) {
        const task = this.config.schedules.find(t => t.id === taskId);
        if (task) {
            task.enabled = enabled;
            this.saveConfig();
        }
    }

    public deleteScheduleTask(taskId: string) {
        this.config.schedules = this.config.schedules.filter(t => t.id !== taskId);
        this.saveConfig();
    }

    public getAitiwoService(): AitiwoService {
        if (!this.aitiwoService) {
            this.aitiwoService = new AitiwoService(this.config.aitiwoKey);
        }
        return this.aitiwoService;
    }

    public updateBotStatus(status: {
        isLoggedIn: boolean;
        userName?: string;
    }) {
        this.config.botStatus = {
            ...status,
            lastLoginTime: status.isLoggedIn ? new Date().toISOString() : undefined
        };
        this.saveConfig();
    }

    public getBotStatus() {
        return this.config.botStatus;
    }

    public handleLogout() {
        this.config.botStatus = {
            isLoggedIn: false
        };
        this.saveConfig();
    }
}

export default new ConfigManager(); 