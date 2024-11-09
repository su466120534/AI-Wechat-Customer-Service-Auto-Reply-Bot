// 机器人状态相关功能
export class BotStatus {
  private startButton: HTMLButtonElement;
  private stopButton: HTMLButtonElement;

  constructor() {
    this.startButton = document.getElementById('startBot') as HTMLButtonElement;
    this.stopButton = document.getElementById('stopBot') as HTMLButtonElement;
    
    // 确保按钮初始状态正确
    this.startButton.style.display = 'inline-block';
    this.stopButton.style.display = 'none';

    // 添加调试日志
    console.log('BotStatus initialized with buttons:', { 
      startButton: this.startButton, 
      stopButton: this.stopButton 
    });
  }

  updateStatus(status: 'running' | 'stopped' | 'error' | 'waiting', message?: string) {
    if (!this.startButton || !this.stopButton) return;

    console.log('Updating bot status:', status, message);  // 添加调试日志

    switch (status) {
      case 'running':
        // 隐藏启动按钮，显示停止按钮
        this.startButton.style.display = 'none';
        this.stopButton.style.display = 'inline-block';
        this.stopButton.disabled = false;
        this.stopButton.className = 'btn-stop';
        break;
        
      case 'stopped':
        // 显示启动按钮，隐藏停止按钮
        this.startButton.style.display = 'inline-block';
        this.startButton.disabled = false;
        this.startButton.className = 'btn-primary';
        this.startButton.textContent = '启动机器人';
        this.stopButton.style.display = 'none';
        break;
        
      case 'waiting':
        // 禁用启动按钮，显示等待状态
        this.startButton.disabled = true;
        this.startButton.textContent = '请稍候...';
        this.stopButton.style.display = 'none';
        break;
        
      case 'error':
        // 显示错误状态
        this.startButton.style.display = 'inline-block';
        this.startButton.disabled = false;
        this.startButton.textContent = '重新启动';
        this.stopButton.style.display = 'none';
        break;
    }
  }

  // 移除不需要的方法
  updateConnectionStatus() {}
  showWarning() {}
} 