import { LogItem, LogLevel } from '../../shared/types/logger';

export class Logger {
  private container: HTMLElement;
  private allLogs: LogItem[] = [];
  private currentFilter: LogLevel | 'all' = 'all';
  private searchText = '';
  
  private logLevelSelect: HTMLSelectElement;
  private logSearchInput: HTMLInputElement;
  private clearLogsButton: HTMLButtonElement;
  private exportLogsButton: HTMLButtonElement;
  private totalLogsSpan: HTMLElement;
  private filteredLogsSpan: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    
    // 初始化DOM元素
    this.logLevelSelect = document.getElementById('logLevel') as HTMLSelectElement;
    this.logSearchInput = document.getElementById('logSearch') as HTMLInputElement;
    this.clearLogsButton = document.getElementById('clearLogs') as HTMLButtonElement;
    this.exportLogsButton = document.getElementById('exportLogs') as HTMLButtonElement;
    this.totalLogsSpan = document.getElementById('totalLogs') as HTMLElement;
    this.filteredLogsSpan = document.getElementById('filteredLogs') as HTMLElement;

    this.bindEvents();
    this.initLogLevel();
  }

  private bindEvents() {
    this.logLevelSelect.addEventListener('change', () => {
      this.currentFilter = this.logLevelSelect.value as LogLevel | 'all';
      this.filterLogs();
    });

    this.logSearchInput.addEventListener('input', () => {
      this.searchText = this.logSearchInput.value;
      this.filterLogs();
    });

    this.clearLogsButton.addEventListener('click', () => this.clearLogs());
    this.exportLogsButton.addEventListener('click', () => this.exportLogs());
  }

  private initLogLevel() {
    const savedLevel = localStorage.getItem('preferredLogLevel');
    if (savedLevel) {
      this.currentFilter = savedLevel as LogLevel | 'all';
      this.logLevelSelect.value = this.currentFilter;
    }
  }

  addLog(log: LogItem) {
    this.allLogs.unshift(log);
    if (this.allLogs.length > 1000) {
      this.allLogs.pop();
    }
    this.filterLogs();
  }

  private renderLogItem(log: LogItem): HTMLElement {
    const logItem = document.createElement('div');
    logItem.className = `log-item ${log.level}`;
    
    const timestamp = document.createElement('span');
    timestamp.className = 'log-timestamp';
    timestamp.textContent = new Date(log.timestamp).toLocaleTimeString();
    
    const category = document.createElement('span');
    category.className = 'log-category';
    category.textContent = `[${log.category}]`;
    
    const content = document.createElement('span');
    content.className = 'log-content';
    content.textContent = log.message;
    
    logItem.appendChild(timestamp);
    logItem.appendChild(category);
    logItem.appendChild(content);
    
    if (log.details) {
      const details = document.createElement('div');
      details.className = 'log-details';
      details.textContent = typeof log.details === 'string' 
        ? log.details 
        : JSON.stringify(log.details, null, 2);
      
      logItem.appendChild(details);
      logItem.addEventListener('click', () => {
        logItem.classList.toggle('expanded');
      });
    }
    
    return logItem;
  }

  filterLogs() {
    const filteredLogs = this.allLogs.filter(log => {
      const levelMatch = this.currentFilter === 'all' || log.level === this.currentFilter;
      const searchMatch = !this.searchText || 
        log.message.toLowerCase().includes(this.searchText.toLowerCase()) ||
        log.category.toLowerCase().includes(this.searchText.toLowerCase());
      return levelMatch && searchMatch;
    });
    
    this.totalLogsSpan.textContent = this.allLogs.length.toString();
    this.filteredLogsSpan.textContent = (this.allLogs.length - filteredLogs.length).toString();
    
    this.container.innerHTML = '';
    filteredLogs.forEach(log => {
      this.container.appendChild(this.renderLogItem(log));
    });
  }

  async exportLogs() {
    try {
      const content = this.allLogs.map(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const details = log.details ? `\nDetails: ${JSON.stringify(log.details, null, 2)}` : '';
        return `[${timestamp}] [${log.level.toUpperCase()}] ${log.category} - ${log.message}${details}`;
      }).join('\n');

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `wechat-bot-logs-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出日志失败:', error);
    }
  }

  clearLogs() {
    if (confirm('确定要清除所有日志吗？')) {
      this.allLogs = [];
      this.filterLogs();
    }
  }
} 