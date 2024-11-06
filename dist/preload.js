"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    saveAitiwoKey: (key) => electron_1.ipcRenderer.invoke('save-aitiwo-key', key),
    saveWhitelist: (contacts, rooms) => electron_1.ipcRenderer.invoke('save-whitelist', { contacts, rooms }),
    getConfig: () => electron_1.ipcRenderer.invoke('get-config'),
    startBot: () => electron_1.ipcRenderer.invoke('start-bot'),
    onQrcodeGenerated: (callback) => electron_1.ipcRenderer.on('qrcode-generated', (_event, qrcode) => callback(qrcode)),
    addScheduleTask: (task) => electron_1.ipcRenderer.invoke('add-schedule-task', task),
    getScheduleTasks: () => electron_1.ipcRenderer.invoke('get-schedule-tasks'),
    toggleScheduleTask: (taskId, enabled) => electron_1.ipcRenderer.invoke('toggle-schedule-task', taskId, enabled),
    deleteScheduleTask: (taskId) => electron_1.ipcRenderer.invoke('delete-schedule-task', taskId),
    onNewLog: (callback) => electron_1.ipcRenderer.on('new-log', (_event, log) => callback(log)),
});
//# sourceMappingURL=preload.js.map