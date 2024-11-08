import { notification } from '../components/notification';
import { LoadingUI } from '../components/loading';
import { AppError, ErrorCode, ConfigError } from '../../shared/types';

export class ConfigManager {
  private aitiwoKeyInput: HTMLInputElement;
  private contactWhitelistTextarea: HTMLTextAreaElement;
  private roomWhitelistTextarea: HTMLTextAreaElement;
  private loading: LoadingUI;

  constructor() {
    this.aitiwoKeyInput = document.getElementById('aitiwoKey') as HTMLInputElement;
    this.contactWhitelistTextarea = document.getElementById('contactWhitelist') as HTMLTextAreaElement;
    this.roomWhitelistTextarea = document.getElementById('roomWhitelist') as HTMLTextAreaElement;
    this.loading = new LoadingUI();

    this.bindEvents();
  }

  private bindEvents() {
    // API Key 相关事件
    this.aitiwoKeyInput.addEventListener('input', () => this.handleApiKeyInput());
    this.aitiwoKeyInput.addEventListener('blur', () => this.handleApiKeyBlur());

    // 白名单导入导出事件
    document.getElementById('exportWhitelist')?.addEventListener('click', () => this.exportWhitelist());
    document.getElementById('importWhitelist')?.addEventListener('click', () => this.importWhitelist());
  }

  private async handleApiKeyInput() {
    const value = this.aitiwoKeyInput.value.trim();
    if (!value) {
      notification.show('请输入 API Key', 'warning');
      return;
    }

    try {
      await window.electronAPI.saveAitiwoKey(value);
      notification.show('API Key 验证成功', 'success');
    } catch (error) {
      notification.show('API Key 验证失败', 'error');
    }
  }

  private async handleApiKeyBlur() {
    const value = this.aitiwoKeyInput.value.trim();
    try {
      if (!value) {
        throw new ConfigError('API Key 不能为空', ErrorCode.API_KEY_INVALID);
      }
      
      this.loading.show('正在验证 API Key...');
      const result = await window.electronAPI.saveAitiwoKey(value);
      
      if (!result.success) {
        throw new ConfigError(result.error || '保存失败', ErrorCode.CONFIG_SAVE_FAILED);
      }
      
      notification.show('API Key 设置成功', 'success');
    } catch (error) {
      if (error instanceof AppError) {
        notification.show(error.message, 'error');
      } else {
        notification.show('API Key 验证失败', 'error');
      }
      this.aitiwoKeyInput.classList.add('invalid');
    } finally {
      this.loading.hide();
    }
  }

  private async exportWhitelist() {
    try {
      const result = await window.electronAPI.exportWhitelist();
      if (!result.success) {
        throw new Error(result.error);
      }

      // 创建下载文件
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
      notification.show('白名单导出失败', 'error');
    }
  }

  private async importWhitelist() {
    try {
      // 创建文件输入元素
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            const result = await window.electronAPI.importWhitelist(data);
            
            if (!result.success) {
              throw new Error(result.error);
            }

            // 更新界面
            await this.loadConfig();
            notification.show('白名单导入成功', 'success');
          } catch (error) {
            notification.show('白名单导入失败', 'error');
          }
        };
        reader.readAsText(file);
      };

      input.click();
    } catch (error) {
      notification.show('白名单导入失败', 'error');
    }
  }

  async loadConfig() {
    try {
      const config = await window.electronAPI.getConfig();
      this.aitiwoKeyInput.value = config.aitiwoKey;
      this.contactWhitelistTextarea.value = config.contactWhitelist.join('\n');
      this.roomWhitelistTextarea.value = config.roomWhitelist.join('\n');
    } catch (error) {
      notification.show('加载配置失败', 'error');
    }
  }

  async saveWhitelist() {
    try {
      const contacts = this.contactWhitelistTextarea.value.split('\n').filter(line => line.trim());
      const rooms = this.roomWhitelistTextarea.value.split('\n').filter(line => line.trim());
      
      const result = await window.electronAPI.saveWhitelist(contacts, rooms);
      if (!result.success) {
        throw new AppError(result.error || '保存失败', ErrorCode.CONFIG_ERROR);
      }
      
      notification.show('白名单保存成功', 'success');
    } catch (error) {
      if (error instanceof AppError) {
        notification.show(error.message, 'error');
      } else {
        notification.show('保存白名单失败', 'error');
      }
    }
  }
} 