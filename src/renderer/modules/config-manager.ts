import { notification } from '../components/notification';
import { LoadingUI } from '../components/loading';
import { AppError, ErrorCode, ConfigError } from '../../shared/types';
import { keyMessages } from '../components/key-messages';

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
    this.initHelpText();
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
      keyMessages.addMessage('请先设置 API Key。请到 https://qiye.aitiwo.com/ 机器人/创建智能体/发布智能体/API调用/创建API。', 'warning');
      this.aitiwoKeyInput.classList.add('invalid');
      return;
    }

    // 简单的格式验证（可以根据实际的 API Key 格式要求调整）
    if (!/^[A-Za-z0-9-_]{10,}$/.test(value)) {
      keyMessages.addMessage('API Key 格式不正确，请检查是否正确复制', 'error');
      this.aitiwoKeyInput.classList.add('invalid');
      return;
    }

    try {
      const result = await window.electronAPI.saveAitiwoKey(value);
      
      if (result.success) {
        keyMessages.addMessage('API Key 验证成功', 'success');
        keyMessages.addMessage('现在您可以点击"启动机器人"按钮开始使用了', 'info');
        this.aitiwoKeyInput.classList.remove('invalid');
        this.aitiwoKeyInput.classList.add('valid');
      } else {
        throw new Error(result.error || '验证失败');
      }
    } catch (error) {
      keyMessages.addMessage('API Key 验证失败，请检查是否正确', 'error');
      this.aitiwoKeyInput.classList.add('invalid');
      this.aitiwoKeyInput.classList.remove('valid');
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

  private initHelpText() {
    const helpText = document.querySelector('.help-text');
    if (helpText) {
      helpText.addEventListener('click', () => {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.innerHTML = `
          <div class="tooltip-header">获取 API Key 步骤：</div>
          <ol class="tooltip-steps">
            <li>访问 <a href="#" class="tooltip-link">qiye.aitiwo.com</a></li>
            <li>进入"机器人"页面</li>
            <li>创建或选择智能体</li>
            <li>发布智能体</li>
            <li>在"API调用"中创建 API Key</li>
          </ol>
        `;
        
        const rect = helpText.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 5}px`;
        
        document.body.appendChild(tooltip);
        tooltip.classList.add('show');
        
        // 添加链接点击事件
        const link = tooltip.querySelector('.tooltip-link');
        if (link) {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            // 使用 electron 的 shell 模块打开外部链接
            window.electronAPI.openExternal('https://qiye.aitiwo.com/');
          });
        }
        
        // 点击其他地方关闭提示
        const closeTooltip = (e: MouseEvent) => {
          if (!tooltip.contains(e.target as Node)) {
            tooltip.remove();
            document.removeEventListener('click', closeTooltip);
          }
        };
        
        setTimeout(() => {
          document.addEventListener('click', closeTooltip);
        }, 0);
      });
    }
  }
} 