// 新建一个 KeyMessages 组件来管理运行状态消息
export class KeyMessages {
  private container: HTMLElement;
  private messageList: HTMLElement;
  private maxMessages: number = 5;  // 限制显示最近的5条消息
  private messageTimeouts: Map<HTMLElement, NodeJS.Timeout> = new Map();  // 添加超时管理

  constructor() {
    const container = document.getElementById('keyMessages');
    if (!container) {
      console.error('KeyMessages container not found');
      this.container = this.createDefaultContainer();
    } else {
      this.container = container;
    }

    const messageList = this.container.querySelector('.message-list');
    if (!messageList) {
      this.messageList = document.createElement('div');
      this.messageList.className = 'message-list';
      this.container.appendChild(this.messageList);
    } else {
      this.messageList = messageList as HTMLElement;
    }

    // 添加初始消息，不设置自动消失
    this.addMessage('等待启动...', 'info', false);
  }

  private createDefaultContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'keyMessages';
    container.className = 'key-messages';
    
    const messageList = document.createElement('div');
    messageList.className = 'message-list';
    container.appendChild(messageList);

    // 将容器添加到合适的位置
    const botStatusBox = document.querySelector('.bot-status-box');
    if (botStatusBox) {
      botStatusBox.appendChild(container);
    } else {
      document.body.appendChild(container);
    }

    return container;
  }

  addMessage(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', autoRemove: boolean = false) {
    // 判断是否为需要保持显示的重要消息
    const keepMessage = message.includes('机器人已启动') || 
                       message.includes('微信登录成功') || 
                       message.includes('API Key 已配置') ||
                       message.includes('白名单已配置') ||
                       message.includes('机器人正在运行');

    const messageElement = document.createElement('div');
    messageElement.className = `key-message ${type}`;
    
    const time = new Date().toLocaleTimeString();
    
    // 处理消息中的链接
    const processedMessage = this.processMessageLinks(message);
    
    messageElement.innerHTML = `
      <span class="time">[${time}]</span>
      <span class="message">${processedMessage}</span>
    `;

    // 添加到列表开头
    this.messageList.insertBefore(messageElement, this.messageList.firstChild);

    // 限制消息数量
    while (this.messageList.children.length > this.maxMessages) {
      const lastChild = this.messageList.lastChild as HTMLElement;
      if (lastChild) {
        // 清除该消息的定时器
        const timeout = this.messageTimeouts.get(lastChild);
        if (timeout) {
          clearTimeout(timeout);
          this.messageTimeouts.delete(lastChild);
        }
        this.messageList.removeChild(lastChild);
      }
    }

    // 如果需要自动移除且不是重要消息，设置定时器
    if (autoRemove && !keepMessage) {
      const timeout = setTimeout(() => {
        messageElement.classList.add('fade-out');
        setTimeout(() => {
          if (messageElement.parentNode === this.messageList) {
            this.messageList.removeChild(messageElement);
          }
          this.messageTimeouts.delete(messageElement);
        }, 300); // 等待淡出动画完成
      }, 3000); // 3秒后开始淡出

      this.messageTimeouts.set(messageElement, timeout);
    }

    // 平滑滚动效果
    messageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  private processMessageLinks(message: string): string {
    // 替换 URL 为可点击的链接
    return message.replace(
      /(https?:\/\/[^\s]+)/g, 
      url => `<a href="#" class="message-link" data-url="${url}">${url}</a>`
    );
  }

  clear() {
    // 清除所有定时器
    this.messageTimeouts.forEach(timeout => clearTimeout(timeout));
    this.messageTimeouts.clear();
    // 清空消息列表
    this.messageList.innerHTML = '';
  }
}

export const keyMessages = new KeyMessages(); 