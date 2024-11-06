import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import axios from 'axios'
import { logger } from './utils/logger'

interface Config {
    aitiwoKey: string;
    contactWhitelist: string[];
    roomWhitelist: string[];
    schedules: Schedule[];
}

interface Schedule {
    id: string;
    roomName: string;
    message: string;
    time: string;
    enabled: boolean;
}

class ConfigManager {
    private config: Config = {
        aitiwoKey: '',
        contactWhitelist: [],
        roomWhitelist: [],
        schedules: []
    };
    private configPath: string;

    constructor() {
        this.configPath = path.join(app.getPath('userData'), 'config.json');
        this.loadConfig();
    }

    private loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
                logger.info('Config', '配置文件加载成功');
            } else {
                this.saveConfig();
                logger.info('Config', '创建了新的配置文件');
            }
        } catch (error) {
            logger.error('Config', '加载配置文件失败', error);
            throw new Error('配置文件加载失败');
        }
    }

    public saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            logger.info('Config', '配置保存成功');
        } catch (error) {
            logger.error('Config', '保存配置文件失败', error);
            throw new Error('配置保存失败');
        }
    }

    public getConfig(): Config {
        return this.config;
    }

    public async setAitiwoKey(key: string) {
        if (!key.trim()) {
            throw new Error('API Key 不能为空');
        }

        // 验证 API Key
        try {
            await this.validateAitiwoKey(key);
            this.config.aitiwoKey = key;
            this.saveConfig();
            logger.info('Config', 'AITIWO API Key 设置成功');
        } catch (error) {
            logger.error('Config', 'AITIWO API Key 验证失败', error);
            throw error;
        }
    }

    private async validateAitiwoKey(key: string): Promise<void> {
        try {
            // 调用 AITIWO 的验证接口
            const response = await axios.post('https://qiye.aitiwo.com/api/validate', null, {
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status !== 200 || !response.data.success) {
                throw new Error('API Key 无效');
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    throw new Error('API Key 无效');
                } else {
                    throw new Error('API Key 验证失败，请检查网络连接');
                }
            }
            throw new Error('API Key 验证过程中发生错误');
        }
    }

    public setWhitelists(contacts: string[], rooms: string[]) {
        this.config.contactWhitelist = contacts;
        this.config.roomWhitelist = rooms;
        this.saveConfig();
        logger.info('Config', '白名单设置已更新');
    }
}

export default new ConfigManager(); 