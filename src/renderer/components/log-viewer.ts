import { LogLevel, LogItem } from '../../shared/types/logger';
import { rendererLogger } from '../utils/renderer-logger';

export class LogViewer {
  private container: HTMLElement;
  private logList!: HTMLElement;
  private filterForm!: HTMLFormElement;
  private levelSelect!: HTMLSelectElement;
  private categoryInput!: HTMLInputElement;
  private startTimeInput!: HTMLInputElement;
  private endTimeInput!: HTMLInputElement;
  
  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLElement;
    if (!this.container) {
      console.error(`Container element with id "${containerId}" not found`);
      throw new Error(`Container element with id "${containerId}" not found`);
    }
    
    this.initializeUI();
    this.bindEvents();
    
    // 订阅日志更新
    rendererLogger.subscribe(this.addLog.bind(this));
  }

  private initializeUI() {
    // 创建过滤器表单
    this.container.innerHTML = `
      <div class="log-viewer">
        <div class="log-filters">
          <form class="filter-form">
            <select class="level-select">
              <option value="">所有级别</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
              <option value="success">Success</option>
            </select>
            <input type="text" class="category-input" placeholder="分类过滤">
            <input type="datetime-local" class="start-time">
            <input type="datetime-local" class="end-time">
            <button type="button" class="export-btn">导出日志</button>
            <button type="button" class="clear-btn">清空日志</button>
          </form>
        </div>
        <div class="log-list"></div>
      </div>
    `;

    // 获取元素引用
    this.filterForm = this.container.querySelector('.filter-form') as HTMLFormElement;
    this.logList = this.container.querySelector('.log-list') as HTMLElement;
    this.levelSelect = this.container.querySelector('.level-select') as HTMLSelectElement;
    this.categoryInput = this.container.querySelector('.category-input') as HTMLInputElement;
    this.startTimeInput = this.container.querySelector('.start-time') as HTMLInputElement;
    this.endTimeInput = this.container.querySelector('.end-time') as HTMLInputElement;

    // 添加样式
    this.addStyles();
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .log-viewer {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      
      .log-filters {
        padding: 10px;
        background: #f5f5f5;
        border-bottom: 1px solid #ddd;
      }
      
      .filter-form {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      
      .log-list {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        font-family: monospace;
      }
      
      .log-item {
        padding: 4px 8px;
        margin: 2px 0;
        border-radius: 4px;
        font-size: 13px;
      }
      
      .log-item.debug { color: #666; }
      .log-item.info { color: #0066cc; }
      .log-item.warn { color: #ff9900; background: #fff9e6; }
      .log-item.error { color: #cc0000; background: #ffe6e6; }
      .log-item.success { color: #006600; background: #e6ffe6; }
    `;
    document.head.appendChild(style);
  }

  private bindEvents() {
    // 过滤器变化事件
    this.filterForm.addEventListener('change', () => this.updateLogs());
    this.categoryInput.addEventListener('input', () => this.updateLogs());
    
    // 导出按钮事件
    this.container.querySelector('.export-btn')?.addEventListener('click', () => this.exportLogs());
    
    // 清空按钮事件
    this.container.querySelector('.clear-btn')?.addEventListener('click', () => this.clearLogs());
  }

  private updateLogs() {
    const logs = rendererLogger.getLogs({
      level: this.levelSelect.value as LogLevel || undefined,
      category: this.categoryInput.value || undefined,
      startTime: this.startTimeInput.value || undefined,
      endTime: this.endTimeInput.value || undefined
    });
    
    this.renderLogs(logs);
  }

  private renderLogs(logs: LogItem[]) {
    this.logList.innerHTML = logs.map(log => `
      <div class="log-item ${log.level}">
        <span class="timestamp">${new Date(log.timestamp).toLocaleString()}</span>
        [${log.category}] ${log.message}
        ${log.details ? `<pre>${JSON.stringify(log.details, null, 2)}</pre>` : ''}
      </div>
    `).join('');
    
    // 滚动到底部
    this.logList.scrollTop = this.logList.scrollHeight;
  }

  private async exportLogs() {
    const logs = rendererLogger.getLogs({
      level: this.levelSelect.value as LogLevel || undefined,
      category: this.categoryInput.value || undefined,
      startTime: this.startTimeInput.value || undefined,
      endTime: this.endTimeInput.value || undefined
    });

    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private clearLogs() {
    if (confirm('确定要清空所有日志吗？')) {
      rendererLogger.clearLogs();
      this.updateLogs();
    }
  }

  // 公共方法：添加新日志时调用
  public addLog(log: LogItem) {
    const logs = rendererLogger.getLogs();
    this.renderLogs(logs);
  }
} 