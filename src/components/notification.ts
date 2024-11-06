export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export class NotificationUI {
  private container: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'notification-container';
    document.body.appendChild(this.container);
  }

  show(message: string, type: NotificationType = 'info', duration: number = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = this.getIcon(type);
    const content = document.createElement('span');
    content.textContent = message;
    
    notification.appendChild(icon);
    notification.appendChild(content);
    
    this.container.appendChild(notification);

    // 动画效果
    setTimeout(() => notification.classList.add('show'), 10);

    // 自动关闭
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        this.container.removeChild(notification);
      }, 300);
    }, duration);
  }

  private getIcon(type: NotificationType): HTMLSpanElement {
    const icon = document.createElement('span');
    icon.className = 'notification-icon';
    
    switch (type) {
      case 'success':
        icon.innerHTML = '✓';
        break;
      case 'error':
        icon.innerHTML = '✕';
        break;
      case 'warning':
        icon.innerHTML = '!';
        break;
      default:
        icon.innerHTML = 'i';
    }
    
    return icon;
  }
}

// 创建全局单例
export const notification = new NotificationUI(); 