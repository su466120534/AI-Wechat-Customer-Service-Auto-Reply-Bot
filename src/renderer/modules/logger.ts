import { LogItem } from '../../shared/types/logger';

export class LogViewer {
    private container: HTMLElement;
    private logList!: HTMLElement;

    constructor(containerId: string) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error('Log container not found');
        
        this.container = container;
        this.initUI();
        this.bindEvents();
    }

    private initUI() {
        this.container.innerHTML = `
            <div class="logs-header">
                <h3>系统日志</h3>
                <div class="logs-controls">
                    <button class="log-export btn-primary">导出日志</button>
                </div>
            </div>
            <div class="logs-container">
                <div class="log-list scrollable"></div>
            </div>
        `;

        this.logList = this.container.querySelector('.log-list')!;
        
        // 绑定导出按钮事件
        const exportBtn = this.container.querySelector('.log-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportLogs());
        }
    }

    private bindEvents() {
        // 只保留日志监听功能
        window.electronAPI.on('new-log', (logItem: LogItem) => {
            this.addLogEntry(logItem);
        });
    }

    private addLogEntry(logItem: LogItem) {
        const entry = document.createElement('div');
        entry.className = `log-entry ${logItem.level}`;
        entry.innerHTML = `
            <span class="log-time">${new Date(logItem.timestamp).toLocaleString()}</span>
            <span class="log-level">${logItem.level.toUpperCase()}</span>
            <span class="log-category">[${logItem.category}]</span>
            <span class="log-message">${logItem.message}</span>
            ${logItem.details ? `<pre class="log-details">${JSON.stringify(logItem.details, null, 2)}</pre>` : ''}
        `;
        this.logList.insertBefore(entry, this.logList.firstChild);
    }

    private async exportLogs() {
        try {
            // 收集所有日志条目
            const logs = Array.from(this.logList.children).map(entry => {
                return {
                    time: entry.querySelector('.log-time')?.textContent,
                    level: entry.querySelector('.log-level')?.textContent,
                    category: entry.querySelector('.log-category')?.textContent,
                    message: entry.querySelector('.log-message')?.textContent,
                    details: entry.querySelector('.log-details')?.textContent
                };
            });

            // 转换为CSV格式
            const csv = this.convertToCSV(logs);
            
            // 使用新的 exportLogs API
            const result = await window.electronAPI.exportLogs(csv);
            if (!result.success) {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('导出日志失败:', error);
        }
    }

    private convertToCSV(logs: any[]) {
        const headers = ['时间', '级别', '类别', '消息', '详情'];
        const rows = logs.map(log => [
            log.time || '',
            log.level || '',
            log.category || '',
            log.message || '',
            log.details || ''
        ]);
        
        return [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');
    }
} 