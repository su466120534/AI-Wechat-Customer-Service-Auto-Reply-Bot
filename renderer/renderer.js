const { ipcRenderer } = require('electron')

// 登录相关
document.getElementById('login-btn').addEventListener('click', () => {
    const username = document.getElementById('username').value
    const password = document.getElementById('password').value
    
    if (!username || !password) {
        alert('请输入用户名和密码')
        return
    }
    
    ipcRenderer.send('platform-login', { username, password })
})

// 服务控制
document.getElementById('start-service').addEventListener('click', () => {
    ipcRenderer.send('start-service')
    document.getElementById('start-service').disabled = true
    document.getElementById('stop-service').disabled = false
    addLog('正在启动服务...')
})

document.getElementById('stop-service').addEventListener('click', () => {
    ipcRenderer.send('stop-service')
    document.getElementById('start-service').disabled = false
    document.getElementById('stop-service').disabled = true
    addLog('服务已停止')
})

// 状态更新
ipcRenderer.on('platform-connected', (event, data) => {
    document.getElementById('platform-status').textContent = '已连接'
    document.getElementById('platform-status').className = 'status-success'
    document.getElementById('start-service').disabled = false
    addLog('平台连接成功')
})

ipcRenderer.on('qrcode-updated', (event, qrcode) => {
    document.getElementById('qrcode').innerHTML = `<img src="${qrcode}" alt="微信登录二维码">`
})

ipcRenderer.on('wechat-status', (event, status) => {
    document.getElementById('bot-status').textContent = status
    document.getElementById('bot-status').className = `status-${status === '已登录' ? 'success' : 'warning'}`
})

// 日志功能
function addLog(message, type = 'info') {
    const logContent = document.getElementById('log-content')
    const logItem = document.createElement('div')
    logItem.className = `log-item ${type}`
    logItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`
    logContent.appendChild(logItem)
    logContent.scrollTop = logContent.scrollHeight
}

// 接收主进程的日志
ipcRenderer.on('log', (event, {message, type}) => {
    addLog(message, type)
})

// 错误处理
ipcRenderer.on('error', (event, message) => {
    addLog(message, 'error')
    alert(`错误: ${message}`)
}) 