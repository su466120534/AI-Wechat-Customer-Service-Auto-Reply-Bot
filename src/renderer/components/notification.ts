export class Notification {
  private container: HTMLElement;
  private timeout: NodeJS.Timeout | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'notification-container';
    document.body.appendChild(this.container);
  }

  show(message: string, type: 'success' | 'error' | 'warning' = 'success', duration: number = 3000) {
    // 清除现有的超时
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // 添加到容器
    this.container.appendChild(notification);

    // 添加动画类
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    // 设置自动消失
    this.timeout = setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        this.container.removeChild(notification);
      }, 300); // 等待淡出动画完成
    }, duration);
  }
}

export const notification = new Notification(); 