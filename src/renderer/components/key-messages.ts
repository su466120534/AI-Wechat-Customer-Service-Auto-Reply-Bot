// 新建一个 KeyMessages 组件来管理运行状态消息
export class KeyMessages {
  private container: HTMLElement;
  private messageList: HTMLElement;
  private maxMessages: number = 50;  // 增加消息数量限制

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

    // 只在这里添加一次初始消息
    this.addMessage('等待启动...', 'info');
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

  addMessage(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const messageElement = document.createElement('div');
    messageElement.className = `key-message ${type}`;
    
    const time = new Date().toLocaleTimeString();
    messageElement.innerHTML = `
      <span class="time">[${time}]</span>
      <span class="message">${message}</span>
    `;

    this.messageList.appendChild(messageElement);

    // 限制消息数量
    while (this.messageList.children.length > this.maxMessages) {
      this.messageList.removeChild(this.messageList.firstChild as Node);
    }

    // 滚动到最新消息
    messageElement.scrollIntoView({ behavior: 'smooth' });
  }

  clear() {
    this.messageList.innerHTML = '';
  }
}

export const keyMessages = new KeyMessages(); 