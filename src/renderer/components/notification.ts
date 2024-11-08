type NotificationType = 'success' | 'error' | 'warning' | 'info';

class NotificationUI {
  private container: HTMLDivElement;
  private timeout: number = 3000;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
    `;
    document.body.appendChild(this.container);
  }

  show(message: string, type: NotificationType = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    this.container.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        this.container.removeChild(notification);
      }, 300);
    }, this.timeout);
  }
}

export const notification = new NotificationUI(); 