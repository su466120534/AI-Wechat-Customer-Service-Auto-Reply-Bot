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
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const log4js = __importStar(require("log4js"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
const LOG_DIR = path.join(electron_1.app.getPath('userData'), 'logs');
class Logger {
    constructor() {
        this.mainWindow = null;
        // 配置 log4js
        log4js.configure({
            appenders: {
                file: {
                    type: 'dateFile',
                    filename: path.join(LOG_DIR, 'app.log'),
                    pattern: 'yyyy-MM-dd',
                    compress: true,
                    keepFileExt: true,
                    alwaysIncludePattern: true,
                    layout: {
                        type: 'pattern',
                        pattern: '[%d] [%p] %c - %m'
                    }
                },
                console: {
                    type: 'console',
                    layout: {
                        type: 'pattern',
                        pattern: '%[[%d] [%p] %c%] - %m'
                    }
                }
            },
            categories: {
                default: {
                    appenders: ['file', 'console'],
                    level: 'info',
                    enableCallStack: true
                }
            }
        });
        this.logger = log4js.getLogger();
    }
    setMainWindow(window) {
        this.mainWindow = window;
    }
    createLogItem(level, category, message, details) {
        return {
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            details
        };
    }
    sendToRenderer(logItem) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('new-log', logItem);
        }
    }
    info(category, message, details) {
        const logItem = this.createLogItem('info', category, message, details);
        this.logger.info(`[${category}] ${message}`);
        this.sendToRenderer(logItem);
    }
    warn(category, message, details) {
        const logItem = this.createLogItem('warn', category, message, details);
        this.logger.warn(`[${category}] ${message}`);
        this.sendToRenderer(logItem);
    }
    error(category, message, details) {
        const logItem = this.createLogItem('error', category, message, details);
        this.logger.error(`[${category}] ${message}`);
        if (details) {
            this.logger.error(details);
        }
        this.sendToRenderer(logItem);
    }
    debug(category, message, details) {
        const logItem = this.createLogItem('debug', category, message, details);
        this.logger.debug(`[${category}] ${message}`);
        this.sendToRenderer(logItem);
    }
    async getLogs(limit = 100) {
        // 从文件读取最近的日志
        // 这里简化处理，实际应用中可能需要更复杂的日志检索逻辑
        return [];
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map