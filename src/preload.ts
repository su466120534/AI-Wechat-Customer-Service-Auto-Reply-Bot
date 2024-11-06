import { contextBridge, ipcRenderer } from 'electron'
import { LogItem } from './utils/logger'

contextBridge.exposeInMainWorld('electronAPI', {
  saveAitiwoKey: (key: string) => ipcRenderer.invoke('save-aitiwo-key', key),
  saveWhitelist: (contacts: string[], rooms: string[]) => 
    ipcRenderer.invoke('save-whitelist', { contacts, rooms }),
  getConfig: () => ipcRenderer.invoke('get-config'),
  startBot: () => ipcRenderer.invoke('start-bot'),
  onQrcodeGenerated: (callback: (qrcode: string) => void) => 
    ipcRenderer.on('qrcode-generated', (_event, qrcode) => callback(qrcode)),
  addScheduleTask: (task: any) => ipcRenderer.invoke('add-schedule-task', task),
  getScheduleTasks: () => ipcRenderer.invoke('get-schedule-tasks'),
  toggleScheduleTask: (taskId: string, enabled: boolean) => 
    ipcRenderer.invoke('toggle-schedule-task', taskId, enabled),
  deleteScheduleTask: (taskId: string) => 
    ipcRenderer.invoke('delete-schedule-task', taskId),
  onNewLog: (callback: (log: LogItem) => void) => 
    ipcRenderer.on('new-log', (_event, log) => callback(log)),
}) 