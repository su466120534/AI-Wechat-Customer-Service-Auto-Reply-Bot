import { notification } from '../components/notification';
import { LoadingUI } from '../components/loading';
import { AppError, ErrorCode, ConfigError } from '../../shared/types';

interface Config {
  aitiwoKey?: string;
  contactWhitelist: string[];
  roomWhitelist: string[];
  schedules: ScheduleTask[];  // 添加定时任务数组
}

export class ConfigManager {
  private aitiwoKeyInput: HTMLInputElement;
  private contactWhitelistTextarea: HTMLTextAreaElement;
  private roomWhitelistTextarea: HTMLTextAreaElement;
  private importWhitelistButton: HTMLButtonElement;
  private exportWhitelistButton: HTMLButtonElement;
  private saveTimeout: NodeJS.Timeout | null = null;
  private config: Config = {
    contactWhitelist: [],
    roomWhitelist: [],
    schedules: []
  };

  constructor() {
    this.aitiwoKeyInput = document.getElementById('aitiwoKey') as HTMLInputElement;
    this.contactWhitelistTextarea = document.getElementById('contactWhitelist') as HTMLTextAreaElement;
    this.roomWhitelistTextarea = document.getElementById('roomWhitelist') as HTMLTextAreaElement;
    this.importWhitelistButton = document.getElementById('importWhitelist') as HTMLButtonElement;
    this.exportWhitelistButton = document.getElementById('exportWhitelist') as HTMLButtonElement;

    this.bindEvents();
    this.loadConfig();
  }

  private bindEvents() {
    this.contactWhitelistTextarea.addEventListener('input', () => this.handleWhitelistChange());
    this.roomWhitelistTextarea.addEventListener('input', () => this.handleWhitelistChange());
    this.importWhitelistButton.addEventListener('click', () => this.handleImportWhitelist());
    this.exportWhitelistButton.addEventListener('click', () => this.handleExportWhitelist());
    this.aitiwoKeyInput.addEventListener('blur', () => this.handleApiKeyInput());
    this.aitiwoKeyInput.addEventListener('input', () => {
      this.aitiwoKeyInput.classList.remove('invalid');
    });
  }

  async loadConfig() {
    try {
      const config = await window.electronAPI.getConfig();
      this.contactWhitelistTextarea.value = config.contactWhitelist.join('\n');
      this.roomWhitelistTextarea.value = config.roomWhitelist.join('\n');
      this.aitiwoKeyInput.value = config.aitiwoKey || '';
    } catch (error) {
      notification.show('加载配置失败', 'error');
    }
  }

  private handleWhitelistChange() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(async () => {
      try {
        const contacts = this.contactWhitelistTextarea.value
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean);
          
        const rooms = this.roomWhitelistTextarea.value
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean);

        const result = await window.electronAPI.saveWhitelist({ contacts, rooms });
        
        if (result.success) {
          notification.show('白名单已自动保存', 'success', 2000);
        } else {
          throw new Error(result.error || '保存失败');
        }
      } catch (error) {
        notification.show(error instanceof Error ? error.message : '保存失败', 'error');
      }
    }, 500);
  }

  private async handleImportWhitelist() {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            
            if (!Array.isArray(data.contacts) || !Array.isArray(data.rooms)) {
              throw new Error('无效的白名单数据格式');
            }

            this.contactWhitelistTextarea.value = data.contacts.join('\n');
            this.roomWhitelistTextarea.value = data.rooms.join('\n');

            const result = await window.electronAPI.importWhitelist(data);
            
            if (result.success) {
              notification.show('白名单导入成功', 'success');
              await this.loadConfig();
            } else {
              throw new Error(result.error || '导入失败');
            }
          } catch (error) {
            notification.show(error instanceof Error ? error.message : '导入失败', 'error');
          }
        };
        reader.readAsText(file);
      };

      input.click();
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '导入失败', 'error');
    }
  }

  private async handleExportWhitelist() {
    try {
      const result = await window.electronAPI.exportWhitelist();
      
      if (!result.success) {
        throw new Error(result.error || '导出失败');
      }

      const data = JSON.stringify(result.data, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `whitelist-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      notification.show('白名单导出成功', 'success');
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '导出失败', 'error');
    }
  }

  private updateWhitelistStatus() {
    const contacts = this.contactWhitelistTextarea.value
      .split('\n')
      .filter(Boolean).length;
    const rooms = this.roomWhitelistTextarea.value
      .split('\n')
      .filter(Boolean).length;

    const statusEl = document.querySelector('.whitelist-status');
    if (statusEl) {
      statusEl.textContent = `当前配置：${contacts} 个联系人，${rooms} 个群组`;
    }
  }

  private async handleApiKeyInput() {
    const value = this.aitiwoKeyInput.value.trim();
    
    if (!value) {
      notification.show('请输入 API Key', 'warning');
      return;
    }

    try {
      const result = await window.electronAPI.saveAitiwoKey(value);
      
      if (result.success) {
        notification.show('API Key 验证成功', 'success');
        window.electronAPI.onBotEvent((event: string, data: any) => {
          console.log('Bot event:', event, data);
          // 在这里处理事件和数据
        });
      } else {
        throw new Error(result.error || '验证失败');
      }
    } catch (error) {
      notification.show('API Key 验证失败', 'error');
      this.aitiwoKeyInput.classList.add('invalid');
    }
  }

  async getSchedules(): Promise<ScheduleTask[]> {
    try {
      const config = await window.electronAPI.getConfig();
      return config.schedules || [];
    } catch (error) {
      console.error('Failed to get schedules:', error);
      return [];
    }
  }

  async setSchedules(schedules: ScheduleTask[]): Promise<void> {
    try {
      const config = await window.electronAPI.getConfig();
      config.schedules = schedules;
      await window.electronAPI.invoke('save-config', config);
    } catch (error) {
      console.error('Failed to save schedules:', error);
      throw error;
    }
  }

  async addSchedule(task: ScheduleTask): Promise<void> {
    try {
      const schedules = await this.getSchedules();
      schedules.push(task);
      await this.setSchedules(schedules);
    } catch (error) {
      console.error('Failed to add schedule:', error);
      throw error;
    }
  }

  async updateSchedule(taskId: string, updates: Partial<ScheduleTask>): Promise<void> {
    try {
      const schedules = await this.getSchedules();
      const index = schedules.findIndex(t => t.id === taskId);
      if (index !== -1) {
        schedules[index] = { ...schedules[index], ...updates };
        await this.setSchedules(schedules);
      }
    } catch (error) {
      console.error('Failed to update schedule:', error);
      throw error;
    }
  }

  async deleteSchedule(taskId: string): Promise<void> {
    try {
      const schedules = await this.getSchedules();
      const filtered = schedules.filter(t => t.id !== taskId);
      await this.setSchedules(filtered);
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      throw error;
    }
  }

  async toggleSchedule(taskId: string, enabled: boolean): Promise<void> {
    try {
      await this.updateSchedule(taskId, { enabled });
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
      throw error;
    }
  }
} 