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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("./utils/logger");
class ConfigManager {
    constructor() {
        this.config = {
            aitiwoKey: '',
            contactWhitelist: [],
            roomWhitelist: [],
            schedules: []
        };
        this.configPath = path.join(electron_1.app.getPath('userData'), 'config.json');
        this.loadConfig();
    }
    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
                logger_1.logger.info('Config', '配置文件加载成功');
            }
            else {
                this.saveConfig();
                logger_1.logger.info('Config', '创建了新的配置文件');
            }
        }
        catch (error) {
            logger_1.logger.error('Config', '加载配置文件失败', error);
            throw new Error('配置文件加载失败');
        }
    }
    saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            logger_1.logger.info('Config', '配置保存成功');
        }
        catch (error) {
            logger_1.logger.error('Config', '保存配置文件失败', error);
            throw new Error('配置保存失败');
        }
    }
    getConfig() {
        return this.config;
    }
    async setAitiwoKey(key) {
        if (!key.trim()) {
            throw new Error('API Key 不能为空');
        }
        // 验证 API Key
        try {
            await this.validateAitiwoKey(key);
            this.config.aitiwoKey = key;
            this.saveConfig();
            logger_1.logger.info('Config', 'AITIWO API Key 设置成功');
        }
        catch (error) {
            logger_1.logger.error('Config', 'AITIWO API Key 验证失败', error);
            throw error;
        }
    }
    async validateAitiwoKey(key) {
        try {
            // 调用 AITIWO 的验证接口
            const response = await axios_1.default.post('https://qiye.aitiwo.com/api/validate', null, {
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.status !== 200 || !response.data.success) {
                throw new Error('API Key 无效');
            }
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    throw new Error('API Key 无效');
                }
                else {
                    throw new Error('API Key 验证失败，请检查网络连接');
                }
            }
            throw new Error('API Key 验证过程中发生错误');
        }
    }
    setWhitelists(contacts, rooms) {
        this.config.contactWhitelist = contacts;
        this.config.roomWhitelist = rooms;
        this.saveConfig();
        logger_1.logger.info('Config', '白名单设置已更新');
    }
}
exports.default = new ConfigManager();
//# sourceMappingURL=config-manager.js.map