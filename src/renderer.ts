import { LoadingUI } from './components/loading'
import { notification } from './components/notification'
import { handleError, AppError, ErrorCodes } from './utils/error-handler'
import { LogItem, LogLevel } from './utils/logger'

const loading = new LoadingUI()

// 类型声明
declare global {
  interface Window {
    electronAPI: {
      saveAitiwoKey: (key: string) => Promise<{ success: boolean; error?: string }>;
      saveWhitelist: (contacts: string[], rooms: string[]) => Promise<{ success: boolean; error?: string }>;
      getConfig: () => Promise<any>;
      startBot: () => Promise<{ success: boolean; error?: string }>;
      onQrcodeGenerated: (callback: (qrcode: string) => void) => void;
      addScheduleTask: (task: ScheduleTask) => Promise<{ success: boolean; error?: string }>;
      getScheduleTasks: () => Promise<ScheduleTask[]>;
      toggleScheduleTask: (taskId: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      deleteScheduleTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
      onNewLog: (callback: (log: LogItem) => void) => void;
    };
    toggleTask: (taskId: string, enabled: boolean) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;
  }
}

// DOM 元素
const aitiwoKeyInput = document.getElementById('aitiwoKey') as HTMLInputElement
const startBotButton = document.getElementById('startBot') as HTMLButtonElement
const contactWhitelistTextarea = document.getElementById('contactWhitelist') as HTMLTextAreaElement
const roomWhitelistTextarea = document.getElementById('roomWhitelist') as HTMLTextAreaElement
const saveWhitelistButton = document.getElementById('saveWhitelist') as HTMLButtonElement
const qrcodeDiv = document.getElementById('qrcode') as HTMLDivElement
const scheduleRoomInput = document.getElementById('scheduleRoom') as HTMLInputElement
const scheduleMessageInput = document.getElementById('scheduleMessage') as HTMLTextAreaElement
const scheduleCronInput = document.getElementById('scheduleCron') as HTMLInputElement
const addScheduleButton = document.getElementById('addSchedule') as HTMLButtonElement
const scheduleItemsContainer = document.getElementById('scheduleItems') as HTMLDivElement
const logsContainer = document.getElementById('logsContainer') as HTMLDivElement
const logLevelSelect = document.getElementById('logLevel') as HTMLSelectElement
const clearLogsButton = document.getElementById('clearLogs') as HTMLButtonElement
const exportLogsButton = document.getElementById('exportLogs') as HTMLButtonElement

// 标签页切换
function initTabSwitching() {
  console.log('初始化标签页切换...');
  
  // 使用事件委托
  document.querySelector('.tabs')?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('.tab-btn');
    
    if (!button) {
      console.log('点击的不是标签按钮');
      return;
    }

    console.log('点击了标签按钮:', button);
    
    const tabId = button.getAttribute('data-tab');
    console.log('目标标签页:', tabId);

    if (!tabId) {
      console.error('标签页ID未定义');
      return;
    }

    // 更新按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
      console.log('移除按钮激活状态:', btn.textContent);
    });
    button.classList.add('active');
    console.log('添加按钮激活状态:', button.textContent);

    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
      console.log('移除内容激活状态:', content.id);
    });

    const targetContent = document.getElementById(tabId);
    if (targetContent) {
      targetContent.classList.add('active');
      console.log('添加内容激活状态:', tabId);
    } else {
      console.error('找不到对应的内容区域:', tabId);
    }
  });
}

// 确保在 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 加载完成');
  initTabSwitching();
  console.log('标签页切换初始化完成');
});

// 加载配置
async function loadConfig() {
  console.log('开始加载配置...');
  try {
    const config = await window.electronAPI.getConfig();
    console.log('配置加载成功:', config);
    
    aitiwoKeyInput.value = config.aitiwoKey;
    contactWhitelistTextarea.value = config.contactWhitelist.join('\n');
    roomWhitelistTextarea.value = config.roomWhitelist.join('\n');
  } catch (error) {
    console.error('配置加载失败:', error);
    handleError(error, 'loadConfig');
  }
}

// 保存 API Key
aitiwoKeyInput.addEventListener('change', async () => {
  try {
    loading.show('正在验证 API Key...');
    
    if (!aitiwoKeyInput.value.trim()) {
      throw new AppError('API Key 不能为空', ErrorCodes.INVALID_INPUT);
    }
    
    const result = await window.electronAPI.saveAitiwoKey(aitiwoKeyInput.value)
    if (!result.success) {
      throw new AppError(result.error || '保存失败', ErrorCodes.CONFIG_ERROR);
    }
    
    notification.show('API Key 设置成功', 'success');
  } catch (error) {
    handleError(error, 'saveApiKey');
    aitiwoKeyInput.value = ''; // 清空无效的输入
  } finally {
    loading.hide();
  }
});

// 保存白名单
saveWhitelistButton.addEventListener('click', async () => {
  try {
    const contacts = contactWhitelistTextarea.value.split('\n').filter(line => line.trim())
    const rooms = roomWhitelistTextarea.value.split('\n').filter(line => line.trim())
    
    const result = await window.electronAPI.saveWhitelist(contacts, rooms)
    if (!result.success) {
      throw new AppError(result.error || '保存失败', ErrorCodes.CONFIG_ERROR);
    }
    
    notification.show('白名单保存成功', 'success');
  } catch (error) {
    handleError(error, 'saveWhitelist');
  }
});

// 启动机器人
startBotButton.addEventListener('click', async () => {
  try {
    loading.show('正在启动机器人...');
    startBotButton.disabled = true;
    
    const result = await window.electronAPI.startBot()
    if (!result.success) {
      throw new AppError(result.error || '启动失败', ErrorCodes.BOT_ERROR);
    }
    
    notification.show('机器人启动成功，请扫描二维码登录', 'info');
  } catch (error) {
    handleError(error, 'startBot');
    startBotButton.disabled = false;
    startBotButton.textContent = '启动机器人';
  } finally {
    loading.hide();
  }
});

// 监听二维码生成
window.electronAPI.onQrcodeGenerated((qrcode: string) => {
  qrcodeDiv.innerHTML = `<img src="${qrcode}" alt="登录二维码">`
  startBotButton.textContent = '请扫码登录'
})

// 添加定时任务
addScheduleButton.addEventListener('click', async () => {
  try {
    // 输入验证
    if (!scheduleRoomInput.value.trim()) {
      throw new AppError('请输入群名称', ErrorCodes.INVALID_INPUT);
    }
    if (!scheduleMessageInput.value.trim()) {
      throw new AppError('请输入消息内容', ErrorCodes.INVALID_INPUT);
    }
    if (!scheduleCronInput.value.trim()) {
      throw new AppError('请输入定时规则', ErrorCodes.INVALID_INPUT);
    }
    
    loading.show('添加定时任务...');
    
    const task: ScheduleTask = {
      id: Date.now().toString(),
      roomName: scheduleRoomInput.value.trim(),
      message: scheduleMessageInput.value.trim(),
      cron: scheduleCronInput.value.trim(),
      enabled: true
    };

    const result = await window.electronAPI.addScheduleTask(task)
    if (!result.success) {
      throw new AppError(result.error || '添加失败', ErrorCodes.SCHEDULE_ERROR);
    }

    notification.show('定时任务添加成功', 'success');
    scheduleRoomInput.value = '';
    scheduleMessageInput.value = '';
    scheduleCronInput.value = '';
    
    await loadScheduleTasks();
  } catch (error) {
    handleError(error, 'addScheduleTask');
  } finally {
    loading.hide();
  }
});

// 加载定时任务列表
async function loadScheduleTasks() {
  const tasks = await window.electronAPI.getScheduleTasks()
  scheduleItemsContainer.innerHTML = tasks.map(task => `
    <div class="schedule-item ${task.enabled ? '' : 'disabled'}" data-id="${task.id}">
      <div class="schedule-item-info">
        <div><strong>群名称:</strong> ${task.roomName}</div>
        <div><strong>消息:</strong> ${task.message}</div>
        <div><strong>定时:</strong> ${task.cron}</div>
        <div><strong>状态:</strong> <span class="status-badge ${task.enabled ? 'active' : 'inactive'}">${task.enabled ? '已启用' : '已禁用'}</span></div>
      </div>
      <div class="schedule-item-actions">
        <button class="btn-${task.enabled ? 'warning' : 'success'}" onclick="toggleTask('${task.id}', ${!task.enabled})">
          ${task.enabled ? '禁用' : '启用'}
        </button>
        <button class="btn-danger" onclick="deleteTask('${task.id}')">删除</button>
      </div>
    </div>
  `).join('')
}

// 切换任务状态
window.toggleTask = async function(taskId: string, enabled: boolean) {
  try {
    loading.show('更新任务状态...');
    const result = await window.electronAPI.toggleScheduleTask(taskId, enabled)
    if (!result.success) {
      throw new AppError(result.error || '更新失败', ErrorCodes.SCHEDULE_ERROR);
    }
    
    notification.show(
      `任务已${enabled ? '启用' : '禁用'}`,
      'success'
    );
    
    await loadScheduleTasks();
  } catch (error) {
    handleError(error, 'toggleTask');
  } finally {
    loading.hide();
  }
}

// 删除任务
window.deleteTask = async function(taskId: string) {
  if (!confirm('确定要删除这个任务吗？')) {
    return;
  }
  
  try {
    loading.show('删除任务...');
    const result = await window.electronAPI.deleteScheduleTask(taskId)
    if (!result.success) {
      throw new AppError(result.error || '删除失败', ErrorCodes.SCHEDULE_ERROR);
    }
    
    notification.show('任务已删除', 'success');
    await loadScheduleTasks();
  } catch (error) {
    handleError(error, 'deleteTask');
  } finally {
    loading.hide();
  }
}

// 日志过滤和渲染
let currentLogs: LogItem[] = []
let filterLevel: LogLevel | 'all' = 'all'

function renderLog(log: LogItem): string {
  const timestamp = new Date(log.timestamp).toLocaleString()
  return `
    <div class="log-item level-${log.level}" data-level="${log.level}">
      <div class="log-header">
        <span class="timestamp">${timestamp}</span>
        <span class="category">[${log.category}]</span>
        <span class="message">${log.message}</span>
      </div>
      ${log.details ? `
        <div class="log-details">
          ${typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
        </div>
      ` : ''}
    </div>
  `
}

function filterLogs() {
  const filteredLogs = filterLevel === 'all' 
    ? currentLogs 
    : currentLogs.filter(log => log.level === filterLevel)
  
  logsContainer.innerHTML = filteredLogs.map(renderLog).join('')
}

// 监听日志级别变化
logLevelSelect.addEventListener('change', () => {
  filterLevel = logLevelSelect.value as LogLevel | 'all'
  filterLogs()
})

// 清除日志
clearLogsButton.addEventListener('click', () => {
  if (confirm('确定要清除所有日志吗？')) {
    currentLogs = []
    filterLogs()
  }
})

// 导出日志
exportLogsButton.addEventListener('click', async () => {
  try {
    const content = currentLogs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString()
      return `[${timestamp}] [${log.level.toUpperCase()}] ${log.category} - ${log.message}${log.details ? '\nDetails: ' + JSON.stringify(log.details, null, 2) : ''}`
    }).join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `wechat-bot-logs-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    handleError(error, 'exportLogs')
  }
})

// 展开/折叠日志详情
logsContainer.addEventListener('click', (event) => {
  const logItem = (event.target as HTMLElement).closest('.log-item')
  if (logItem && logItem.querySelector('.log-details')) {
    logItem.classList.toggle('expanded')
  }
})

// 监听新日志
window.electronAPI.onNewLog((log: LogItem) => {
  currentLogs.unshift(log)
  if (currentLogs.length > 1000) {
    currentLogs.pop()
  }
  filterLogs()
})

// 初始化加载
loadConfig() 

// 初始化时加载任务列表
loadScheduleTasks()

// 在 DOM 元素获取后添加验证
console.log('正在初始化 DOM 元素...');
if (!aitiwoKeyInput) console.error('找不到 aitiwoKey 输入框');
if (!startBotButton) console.error('找不到启动按钮');
if (!contactWhitelistTextarea) console.error('找不到联系人白名单输入框');
if (!roomWhitelistTextarea) console.error('找不到群聊白名单输入框');
if (!saveWhitelistButton) console.error('找不到保存白名单按钮');
if (!qrcodeDiv) console.error('找不到二维码容器');
if (!scheduleItemsContainer) console.error('找不到定时任务列表容器');
if (!logsContainer) console.error('找不到日志容器');