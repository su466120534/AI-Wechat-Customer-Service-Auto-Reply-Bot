import { contextBridge, ipcRenderer } from 'electron'
import { LogItem } from '../shared/types/logger'
import { ScheduleTask } from '../shared/types/config'

// 定义事件数据类型
interface BotEventData {
  userName?: string;
  text?: string;
  message?: string;
}

contextBridge.exposeInMainWorld('electronAPI', {
  saveAitiwoKey: (key: string) => ipcRenderer.invoke('save-aitiwo-key', key),
  saveWhitelist: (contacts: string[], rooms: string[]) => 
    ipcRenderer.invoke('save-whitelist', { contacts, rooms }),
  getConfig: () => ipcRenderer.invoke('get-config'),
  startBot: () => ipcRenderer.invoke('start-bot'),
  onQrcodeGenerated: (callback: (qrcode: string) => void) => 
    ipcRenderer.on('qrcode-generated', (_event, qrcode) => callback(qrcode)),
  addScheduleTask: (task: ScheduleTask) => ipcRenderer.invoke('add-schedule-task', task),
  getScheduleTasks: () => ipcRenderer.invoke('get-schedule-tasks'),
  toggleScheduleTask: (taskId: string, enabled: boolean) => 
    ipcRenderer.invoke('toggle-schedule-task', taskId, enabled),
  deleteScheduleTask: (taskId: string) => 
    ipcRenderer.invoke('delete-schedule-task', taskId),
  onNewLog: (callback: (log: LogItem) => void) => 
    ipcRenderer.on('new-log', (_event, log) => callback(log)),
  exportWhitelist: () => ipcRenderer.invoke('export-whitelist'),
  importWhitelist: (data: { contacts: string[]; rooms: string[] }) => 
    ipcRenderer.invoke('import-whitelist', data),
  onBotEvent: (callback: (event: string, data: BotEventData) => void) => {
    ipcRenderer.on('bot-event', (_event, eventName, eventData) => {
      callback(eventName, eventData);
    });
  }
}) 