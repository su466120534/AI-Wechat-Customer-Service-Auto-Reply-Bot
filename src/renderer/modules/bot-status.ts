// 机器人状态相关功能
export class BotStatus {
  private statusIcon: HTMLElement;
  private statusMessage: HTMLElement;
  private startButton: HTMLButtonElement;
  private connectionStatus: HTMLElement;

  constructor() {
    this.statusIcon = document.querySelector('.status-icon') as HTMLElement;
    this.statusMessage = document.querySelector('.status-message') as HTMLElement;
    this.startButton = document.getElementById('startBot') as HTMLButtonElement;
    this.connectionStatus = document.querySelector('.connection-status') as HTMLElement;
  }

  updateStatus(status: 'running' | 'stopped' | 'error' | 'waiting', message?: string) {
    if (!this.statusIcon || !this.statusMessage || !this.startButton) return;

    switch (status) {
      case 'running':
        this.statusIcon.className = 'status-icon running';
        this.statusMessage.textContent = message || '机器人运行中';
        this.startButton.disabled = true;
        this.startButton.textContent = '机器人运行中';
        break;
      case 'stopped':
        this.statusIcon.className = 'status-icon';
        this.statusMessage.textContent = message || '机器人已停止';
        this.startButton.disabled = false;
        this.startButton.textContent = '启动机器人';
        break;
      case 'waiting':
        this.statusIcon.className = 'status-icon waiting';
        this.statusMessage.textContent = message || '正在等待...';
        this.startButton.disabled = true;
        this.startButton.textContent = '请稍候...';
        break;
      case 'error':
        this.statusIcon.className = 'status-icon error';
        this.statusMessage.textContent = message || '机器人发生错误';
        this.startButton.disabled = false;
        this.startButton.textContent = '重新启动';
        break;
    }
  }
  
  updateConnectionStatus(status: 'connecting' | 'reconnected' | 'disconnected', message: string) {
    if (!this.connectionStatus) return;
    
    this.connectionStatus.className = `connection-status ${status}`;
    this.connectionStatus.textContent = message;
    
    // 自动隐藏重连成功的提示
    if (status === 'reconnected') {
      setTimeout(() => {
        this.connectionStatus.className = 'connection-status';
      }, 3000);
    }
  }

  getErrorMessage(error: string): string {
    // 网络错误
    if (error.includes('DISCONNECTED')) {
      return '网络连接断开，正在尝试重新连接';
    }
    if (error.includes('TIMEOUT')) {
      return '网络连接超时，正在尝试重新连接';
    }
    if (error.includes('ECONNREFUSED')) {
      return '无法连接到服务器，请检查网络连接';
    }
    
    // API 错误
    if (error.includes('API Key')) {
      return 'API Key 无效，请检查配置';
    }
    if (error.includes('请求超时')) {
      return 'AI 服务响应超时，请稍后重试';
    }
    if (error.includes('服务暂时不可用')) {
      return 'AI 服务暂时不可用，请稍后重试';
    }
    
    // 默认错误
    return error || '发生未知错误，请稍后重试';
  }
} 