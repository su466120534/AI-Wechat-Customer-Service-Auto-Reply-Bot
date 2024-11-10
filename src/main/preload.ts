import { contextBridge, ipcRenderer, shell } from 'electron'
import { Config, ScheduleTask } from '../shared/types/config'

// 定义所有 IPC 通道名称，与主进程保持一致
const IPC_CHANNELS = {
  // 机器人相关
  START_BOT: 'startBot',
  STOP_BOT: 'stopBot',
  
  // 配置相关
  GET_CONFIG: 'getConfig',
  SAVE_WHITELIST: 'save-whitelist',
  IMPORT_WHITELIST: 'import-whitelist',
  EXPORT_WHITELIST: 'export-whitelist',
  SAVE_AITIWO_KEY: 'save-aitiwo-key',
  
  // 定时任务相关
  GET_SCHEDULE_TASKS: 'getScheduleTasks',
  ADD_SCHEDULE_TASK: 'addScheduleTask',
  TOGGLE_SCHEDULE_TASK: 'toggleScheduleTask',
  DELETE_SCHEDULE_TASK: 'deleteScheduleTask'
} as const;

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 机器人相关
  startBot: () => ipcRenderer.invoke(IPC_CHANNELS.START_BOT),
  stopBot: () => ipcRenderer.invoke(IPC_CHANNELS.STOP_BOT),
  onQrcodeGenerated: (callback: (qrcode: string) => void) => 
    ipcRenderer.on('qrcode-generated', (_event, qrcode) => callback(qrcode)),
  onBotEvent: (callback: (event: string, data: any) => void) =>
    ipcRenderer.on('bot-event', (_event, eventName, data) => callback(eventName, data)),
  
  // 通用 IPC
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: any[]) => void) =>
    ipcRenderer.on(channel, (_event, ...args) => callback(...args)),
  
  // 配置相关
  getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CONFIG),
  saveWhitelist: (data: { contacts: string[]; rooms: string[] }) => 
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_WHITELIST, data),
  importWhitelist: (data: any) => 
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_WHITELIST, data),
  exportWhitelist: () => 
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_WHITELIST),
  saveAitiwoKey: (key: string) => 
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_AITIWO_KEY, key),
  
  // 定时任务相关
  getScheduleTasks: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SCHEDULE_TASKS),
  addScheduleTask: (task: any) => 
    ipcRenderer.invoke(IPC_CHANNELS.ADD_SCHEDULE_TASK, task),
  toggleScheduleTask: (taskId: string, enabled: boolean) => 
    ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_SCHEDULE_TASK, taskId, enabled),
  deleteScheduleTask: (taskId: string) => 
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_SCHEDULE_TASK, taskId),
  onScheduleError: (callback: (error: any) => void) =>
    ipcRenderer.on('schedule-error', (_event, error) => callback(error)),
  onTaskStatusUpdate: (callback: (update: any) => void) =>
    ipcRenderer.on('task-status-update', (_event, update) => callback(update)),
  
  // 添加打开外部链接的方法
  openExternal: (url: string) => shell.openExternal(url),
  
  // 添加测试发送方法
  testDirectSend: async (roomName: string, message: string) => {
    try {
      return await ipcRenderer.invoke('test-direct-send', roomName, message);
    } catch (error) {
      console.error('Test send failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '发送失败'
      };
    }
  }
}) 