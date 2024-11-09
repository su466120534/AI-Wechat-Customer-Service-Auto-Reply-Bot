// 机器人状态相关功能
export class BotStatus {
  private startButton: HTMLButtonElement;
  private stopButton: HTMLButtonElement;

  constructor() {
    this.startButton = document.getElementById('startBot') as HTMLButtonElement;
    this.stopButton = document.getElementById('stopBot') as HTMLButtonElement;
  }

  updateStatus(status: 'running' | 'stopped' | 'error' | 'waiting', message?: string) {
    if (!this.startButton || !this.stopButton) return;

    switch (status) {
      case 'running':
        this.startButton.disabled = true;
        this.stopButton.style.display = 'inline-block';
        this.stopButton.disabled = false;
        this.startButton.textContent = '运行中';
        break;
      case 'stopped':
        this.startButton.disabled = false;
        this.stopButton.style.display = 'none';
        this.startButton.textContent = '启动机器人';
        break;
      case 'waiting':
        this.startButton.disabled = true;
        this.startButton.textContent = '请稍候...';
        break;
      case 'error':
        this.startButton.disabled = false;
        this.startButton.textContent = '重新启动';
        break;
    }
  }

  // 添加这些方法，但实际上不执行任何操作，因为状态消息已经通过 key-messages 显示
  updateConnectionStatus(status: 'connecting' | 'reconnected' | 'disconnected', message: string) {
    // 不需要执行任何操作，状态消息已经通过 key-messages 显示
  }

  showWarning(message: string) {
    // 不需要执行任何操作，警告消息已经通过 key-messages 显示
  }
} 