import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import ConfigManager from './config-manager'
import { startBot } from './bot/index'
import { autoUpdater } from 'electron-updater'
import { logger } from './utils/logger'
import { updateLogger } from './utils/update-logger'
import { scheduleManager } from './utils/scheduler'

let mainWindow: BrowserWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

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
    logger.info('Window', 'DOM 准备就绪');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    logger.info('Window', '应用界面加载完成');
  });

  logger.setMainWindow(mainWindow)
}

ipcMain.handle('save-aitiwo-key', async (event, key: string) => {
  try {
    await ConfigManager.setAitiwoKey(key)
    logger.info('Main', 'API Key 保存成功');
    return { success: true }
  } catch (error) {
    logger.error('Main', 'API Key 保存失败', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '保存失败'
    }
  }
})

ipcMain.handle('save-whitelist', async (event, { contacts, rooms }) => {
  try {
    ConfigManager.setWhitelists(contacts, rooms)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('get-config', async () => {
  return ConfigManager.getConfig()
})

ipcMain.handle('start-bot', async () => {
  try {
    const config = ConfigManager.getConfig()
    if (!config.aitiwoKey) {
      throw new Error('请先设置 AITIWO API Key')
    }
    
    const qrcode = await startBot(config)
    mainWindow.webContents.send('qrcode-generated', qrcode)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('add-schedule-task', async (event, task) => {
  try {
    scheduleManager.addTask(task)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('get-schedule-tasks', async () => {
  return ConfigManager.getConfig().schedules
})

ipcMain.handle('toggle-schedule-task', async (event, taskId, enabled) => {
  try {
    scheduleManager.toggleTask(taskId, enabled)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('delete-schedule-task', async (event, taskId) => {
  try {
    scheduleManager.deleteTask(taskId)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

function setupAutoUpdater() {
  autoUpdater.logger = updateLogger
  
  autoUpdater.on('checking-for-update', () => {
    logger.info('Update', '正在检查更新...')
  })

  autoUpdater.on('update-available', (info) => {
    logger.info('Update', '有可用更新', info)
    mainWindow.webContents.send('update-available')
  })

  autoUpdater.on('update-downloaded', (info) => {
    logger.info('Update', '更新已下载', info)
    mainWindow.webContents.send('update-downloaded')
  })

  autoUpdater.on('error', (err) => {
    logger.error('Update', '更新错误', err)
  })

  setInterval(() => {
    autoUpdater.checkForUpdates()
  }, 60 * 60 * 1000)
}

app.whenReady().then(() => {
  createWindow()
  setupAutoUpdater()
})

process.on('uncaughtException', (error) => {
  logger.error('Process', '未捕获的异常', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Process', '未处理的 Promise 拒绝', { reason, promise });
}); 