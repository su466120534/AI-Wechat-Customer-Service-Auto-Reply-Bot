const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const axios = require('axios')
const { WechatyBuilder } = require('wechaty')

let mainWindow
let botProcess = null
let connectionCheckInterval = null
let reconnectTimer = null
let retryCount = 0

const MAX_RETRIES = 5
const CHECK_INTERVAL = 30000  // 30秒检查一次
const RECONNECT_INTERVAL = 30000  // 30秒后重试

// 平台API配置
const PLATFORM_API = {
  BASE_URL: 'https://your-platform-api.com',
  LOGIN: '/api/login',
  GET_KB_CONFIG: '/api/kb/config'
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('renderer/index.html')
}

// 检查连接状态
function startConnectionCheck() {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval)
  }

  connectionCheckInterval = setInterval(async () => {
    try {
      if (botProcess) {
        const isLoggedIn = await botProcess.logonoff()
        mainWindow.webContents.send('wechat-status', isLoggedIn ? '已登录' : '未登录')
        
        if (!isLoggedIn) {
          handleDisconnect(new Error('微信登录状态已失效'))
        }
      }
    } catch (error) {
      handleDisconnect(error)
    }
  }, CHECK_INTERVAL)
}

// 处理断开连接
function handleDisconnect(error) {
  mainWindow.webContents.send('log', {
    type: 'error',
    message: '连接断开，正在尝试重连...'
  })

  if (retryCount < MAX_RETRIES) {
    scheduleReconnect()
  } else {
    mainWindow.webContents.send('log', {
      type: 'error',
      message: '重连失败，请手动重启服务'
    })
  }
}

// 安排重连
function scheduleReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
  }

  reconnectTimer = setTimeout(async () => {
    retryCount++
    try {
      await restartBot()
      retryCount = 0
      mainWindow.webContents.send('log', {
        type: 'success',
        message: '重连成功'
      })
    } catch (error) {
      handleDisconnect(error)
    }
  }, RECONNECT_INTERVAL)
}

// 重启机器人
async function restartBot() {
  if (botProcess) {
    await botProcess.stop()
  }
  await startBot()
}

// 处理平台登录
ipcMain.on('platform-login', async (event, credentials) => {
  try {
    const response = await axios.post(PLATFORM_API.LOGIN, credentials)
    const config = await axios.get(PLATFORM_API.GET_KB_CONFIG, {
      headers: { Authorization: `Bearer ${response.data.token}` }
    })
    
    event.reply('platform-connected')
    mainWindow.webContents.send('log', {
      type: 'success',
      message: '平台连接成功'
    })
  } catch (error) {
    event.reply('platform-error', error.message)
  }
})

// 启动服务
ipcMain.on('start-service', async (event) => {
  try {
    await startBot()
    startConnectionCheck()  // 启动连接检查
    event.reply('service-started')
  } catch (error) {
    event.reply('service-error', error.message)
  }
})

// 启动机器人
async function startBot() {
  botProcess = WechatyBuilder.build({
    name: 'wechat-bot',
    puppet: 'wechaty-puppet-wechat4u',
    puppetOptions: { uos: true }
  })

  botProcess.on('scan', (qrcode, status) => {
    mainWindow.webContents.send('qrcode-updated', qrcode)
  })

  botProcess.on('login', (user) => {
    mainWindow.webContents.send('wechat-status', '已登录')
    retryCount = 0  // 登录成功后重置重试次数
  })

  botProcess.on('logout', () => {
    mainWindow.webContents.send('wechat-status', '已登出')
  })

  await botProcess.start()
}

// 停止服务
ipcMain.on('stop-service', async (event) => {
  try {
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval)
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
    }
    if (botProcess) {
      await botProcess.stop()
      botProcess = null
    }
    retryCount = 0
    event.reply('service-stopped')
  } catch (error) {
    event.reply('service-error', error.message)
  }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})