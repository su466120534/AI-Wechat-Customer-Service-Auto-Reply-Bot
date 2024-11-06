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
const electron_1 = require("electron");
const path = __importStar(require("path"));
const config_manager_1 = __importDefault(require("./config-manager"));
const index_1 = require("./bot/index");
const electron_updater_1 = require("electron-updater");
const logger_1 = require("./utils/logger");
const update_logger_1 = require("./utils/update-logger");
const scheduler_1 = require("./utils/scheduler");
let mainWindow;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    const indexPath = process.env.NODE_ENV === 'development'
        ? path.join(__dirname, '..', 'index.html')
        : path.join(__dirname, 'index.html');
    console.log('加载页面路径:', indexPath);
    console.log('当前工作目录:', process.cwd());
    console.log('__dirname:', __dirname);
    mainWindow.loadFile(indexPath);
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('页面加载失败:', {
            errorCode,
            errorDescription,
            validatedURL,
            cwd: process.cwd(),
            dirname: __dirname
        });
    });
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
    mainWindow.webContents.on('dom-ready', () => {
        logger_1.logger.info('Window', 'DOM 准备就绪');
    });
    mainWindow.webContents.on('did-finish-load', () => {
        logger_1.logger.info('Window', '应用界面加载完成');
    });
    logger_1.logger.setMainWindow(mainWindow);
}
electron_1.ipcMain.handle('save-aitiwo-key', async (event, key) => {
    try {
        await config_manager_1.default.setAitiwoKey(key);
        logger_1.logger.info('Main', 'API Key 保存成功');
        return { success: true };
    }
    catch (error) {
        logger_1.logger.error('Main', 'API Key 保存失败', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '保存失败'
        };
    }
});
electron_1.ipcMain.handle('save-whitelist', async (event, { contacts, rooms }) => {
    try {
        config_manager_1.default.setWhitelists(contacts, rooms);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
});
electron_1.ipcMain.handle('get-config', async () => {
    return config_manager_1.default.getConfig();
});
electron_1.ipcMain.handle('start-bot', async () => {
    try {
        const config = config_manager_1.default.getConfig();
        if (!config.aitiwoKey) {
            throw new Error('请先设置 AITIWO API Key');
        }
        const qrcode = await (0, index_1.startBot)(config);
        mainWindow.webContents.send('qrcode-generated', qrcode);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
});
electron_1.ipcMain.handle('add-schedule-task', async (event, task) => {
    try {
        scheduler_1.scheduleManager.addTask(task);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
});
electron_1.ipcMain.handle('get-schedule-tasks', async () => {
    return config_manager_1.default.getConfig().schedules;
});
electron_1.ipcMain.handle('toggle-schedule-task', async (event, taskId, enabled) => {
    try {
        scheduler_1.scheduleManager.toggleTask(taskId, enabled);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
});
electron_1.ipcMain.handle('delete-schedule-task', async (event, taskId) => {
    try {
        scheduler_1.scheduleManager.deleteTask(taskId);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
});
function setupAutoUpdater() {
    electron_updater_1.autoUpdater.logger = update_logger_1.updateLogger;
    electron_updater_1.autoUpdater.on('checking-for-update', () => {
        logger_1.logger.info('Update', '正在检查更新...');
    });
    electron_updater_1.autoUpdater.on('update-available', (info) => {
        logger_1.logger.info('Update', '有可用更新', info);
        mainWindow.webContents.send('update-available');
    });
    electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
        logger_1.logger.info('Update', '更新已下载', info);
        mainWindow.webContents.send('update-downloaded');
    });
    electron_updater_1.autoUpdater.on('error', (err) => {
        logger_1.logger.error('Update', '更新错误', err);
    });
    setInterval(() => {
        electron_updater_1.autoUpdater.checkForUpdates();
    }, 60 * 60 * 1000);
}
electron_1.app.whenReady().then(() => {
    createWindow();
    setupAutoUpdater();
});
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Process', '未捕获的异常', error);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Process', '未处理的 Promise 拒绝', { reason, promise });
});
//# sourceMappingURL=main.js.map