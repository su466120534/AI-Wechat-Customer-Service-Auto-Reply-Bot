import { notification } from '../components/notification';
import { ScheduleTask, TaskHistory } from '../../shared/types/config';

// 添加任务模板相关代码
interface TaskTemplate {
  id: string;
  name: string;
  roomName: string;
  message: string;
  cron: string;
}

export class ScheduleManager {
  private container: HTMLElement;
  private scheduleMessageInput: HTMLTextAreaElement;
  private scheduleRoomsInput: HTMLTextAreaElement;
  private addScheduleButton: HTMLButtonElement;
  private scheduleDate!: HTMLInputElement;
  private scheduleTime!: HTMLInputElement;
  private repeatType!: HTMLSelectElement;

  private readonly defaultTemplates: TaskTemplate[] = [
    {
      id: 'daily-morning',
      name: '每日早报',
      roomName: '',  // 由用户选择群聊
      message: '早上好！今天是 {date}，{weather}',
      cron: '0 0 8 * * *'
    },
    {
      id: 'weekly-summary',
      name: '周报提醒',
      roomName: '',
      message: '请各位同学准备本周工作总结',
      cron: '0 0 17 * * 5'  // 每周五下午5点
    }
  ];

  constructor(container: HTMLElement) {
    this.container = container;
    
    // 获取所有必需的元素
    this.scheduleMessageInput = document.getElementById('scheduleMessage') as HTMLTextAreaElement;
    this.scheduleRoomsInput = document.getElementById('scheduleRooms') as HTMLTextAreaElement;
    this.addScheduleButton = document.getElementById('addSchedule') as HTMLButtonElement;
    this.scheduleDate = document.getElementById('scheduleDate') as HTMLInputElement;
    this.scheduleTime = document.getElementById('scheduleTime') as HTMLInputElement;
    this.repeatType = document.getElementById('repeatType') as HTMLSelectElement;

    if (!this.scheduleMessageInput || !this.scheduleRoomsInput || !this.addScheduleButton ||
        !this.scheduleDate || !this.scheduleTime || !this.repeatType) {
        throw new Error('Required schedule elements not found');
    }

    // 添加调试日志
    console.log('初始化 ScheduleManager', {
        messageInput: !!this.scheduleMessageInput,
        roomsInput: !!this.scheduleRoomsInput,
        addButton: !!this.addScheduleButton
    });

    // 直接绑定点击事件
    this.addScheduleButton.onclick = async () => {
        console.log('添加任务按钮被点击');
        await this.handleAddTask();
    };

    // 绑定其他事件
    this.bindRepeatTypeEvents();

    // 添加任务状态更新监听
    window.electronAPI.on('task-status-update', async () => {
        console.log('收到任务状态更新通知，重新加载任务列表');
        await this.loadTasks();
    });

    // 添加刷新任务列表监听
    window.electronAPI.on('refresh-tasks', async () => {
        console.log('收到刷新任务列表通知');
        await this.loadTasks();
    });
  }

  private bindEvents() {
    // 定添加任务按钮事件
    this.addScheduleButton.addEventListener('click', async () => {
      console.log('Add schedule button clicked');
      await this.handleAddTask();
    });
    
    // 添加测试按钮
    const testButton = document.createElement('button');
    testButton.className = 'btn-test';
    testButton.textContent = '测试发送(立即)';
    testButton.onclick = () => this.testSendMessage();
    
    // 将测试按钮添加到表单中
    this.addScheduleButton.parentElement?.insertBefore(testButton, this.addScheduleButton.nextSibling);

    // 绑定群聊输入框验证事件
    this.scheduleRoomsInput.addEventListener('change', () => this.validateRooms());
  }

  async loadTasks() {
    try {
      const tasks = await window.electronAPI.getScheduleTasks();
      if (Array.isArray(tasks)) {
        const validTasks = tasks.map(task => ({
          ...task,
          isOneTime: task.isOneTime || false,
          createdAt: task.createdAt || new Date().toISOString()
        }));
        this.renderTasks(validTasks);
      } else {
        console.error('Invalid tasks data:', tasks);
        this.renderTasks([]);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      this.renderTasks([]);
    }
  }

  private renderTasks(tasks: ScheduleTask[]) {
    try {
        // 先去重，避免重复显示
        const uniqueTasks = tasks.reduce((acc: ScheduleTask[], curr) => {
            if (!acc.find(t => t.id === curr.id)) {
                acc.push(curr);
            }
            return acc;
        }, []);

        // 按状态分类任务
        const completedTasks = uniqueTasks.filter(t => 
            t.status === 'completed' ||  // 已标记为完成的任务
            (t.isOneTime && t.lastStatus === 'success') ||  // 一次性任务且执行成功
            (t.isOneTime && t.archived)  // 已归档的一次性任务
        );

        const failedTasks = uniqueTasks.filter(t => 
            t.status === 'failed' &&  // 已标记为失败的任务
            !t.archived  // 未归档的失败任务
        );

        const pendingTasks = uniqueTasks.filter(t => 
            t.status === 'pending' &&  // 待执行的任务
            t.enabled &&  // 已启用
            !t.archived &&  // 未归档
            (!t.isOneTime || !t.lastRun)  // 不是一次性任务或未执行过
        );

        // 只更新任务列表部分，不影响表单
        const scheduleItems = document.getElementById('scheduleItems');
        if (scheduleItems) {
            scheduleItems.innerHTML = `
                <div class="tasks-section">
                    <h3>待执行任务 (${pendingTasks.length})</h3>
                    <div class="tasks-list pending-tasks">
                        ${pendingTasks.map(task => this.renderTaskItem(task)).join('')}
                    </div>
                </div>

                <div class="tasks-section">
                    <h3>已完成任务 (${completedTasks.length})</h3>
                    <div class="tasks-list completed-tasks">
                        ${completedTasks.map(task => this.renderTaskItem(task)).join('')}
                    </div>
                </div>

                <div class="tasks-section">
                    <h3>执行失败任务 (${failedTasks.length})</h3>
                    <div class="tasks-list failed-tasks">
                        ${failedTasks.map(task => this.renderTaskItem(task, true)).join('')}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to render tasks:', error);
    }
  }

  private renderTaskItem(task: ScheduleTask, showError: boolean = false): string {
    const roomNames = task.roomNames || [];
    const nextRunTime = this.getNextRunTime(task.cron);
    const status = this.getTaskStatus(task, nextRunTime);
    
    // 添加重复类型显示
    const repeatTypeText = {
        'once': '单次',
        'daily': '每日',
        'weekly': '每周',
        'monthly': '每月'
    }[task.repeatType || 'once'];
    
    return `
        <div class="schedule-item ${status.className}" data-id="${task.id}">
            <div class="task-header">
                <div class="task-title">
                    发送至: ${roomNames.join(', ')}
                    <span class="repeat-type-badge">${repeatTypeText}</span>
                </div>
                <div class="task-controls">
                    <button class="btn-delete" onclick="window.scheduleManager.deleteTask('${task.id}')">删除</button>
                </div>
            </div>
            <div class="task-content">${task.message}</div>
            <div class="task-footer">
                <div class="task-info">
                    <div class="task-schedule">执行时间: ${this.cronToReadableText(task.cron)}</div>
                    <div class="task-next-run">
                        <span class="status-badge ${status.className}">${status.text}</span>
                        ${nextRunTime && task.status === 'pending' ? `<span class="countdown">距离下次执行: ${this.getTimeRemaining(nextRunTime)}</span>` : ''}
                    </div>
                    ${task.lastRun ? `
                        <div class="task-last-run">
                            上次执行: ${new Date(task.lastRun).toLocaleString()}
                            <span class="status-badge ${task.lastStatus || ''}">${task.lastStatus === 'success' ? '成功' : '失败'}</span>
                        </div>
                    ` : ''}
                    ${showError && task.error ? `
                        <div class="task-error">
                            失败原因: ${task.error}
                        </div>
                    ` : ''}
                </div>
                <div class="task-status">
                    <label class="switch">
                        <input type="checkbox" 
                            ${task.enabled ? 'checked' : ''} 
                            onchange="window.scheduleManager.toggleTask('${task.id}', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        </div>
    `;
  }

  private cronToReadableText(cron: string): string {
    const parts = cron.split(' ');
    if (parts.length !== 5) return cron;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // 修改这里：添加对具体日期的处理
    if (dayOfMonth !== '*' && month !== '*' && dayOfWeek === '*') {
        // 如果是具体日期（不重复的情况）
        const monthNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
        return `${monthNames[parseInt(month) - 1]}月${dayOfMonth}日 ${hour}:${minute}`;
    } else if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        // 每天执行
        return `每天 ${hour}:${minute}`;
    } else if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
        // 每周执行
        const weekdays = ['周', '周一', '周二', '周三', '周四', '周五', '周六'];
        const days = dayOfWeek.split(',').map(d => weekdays[parseInt(d)]);
        return `每${days.join('、')} ${hour}:${minute}`;
    } else if (dayOfWeek.includes('L')) {
        // 每月最后一个星期几
        const weekday = dayOfWeek.replace('L', '');
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return `每月最后一个${weekdays[parseInt(weekday)]} ${hour}:${minute}`;
    } else if (dayOfWeek.includes('#')) {
        // 每月第几个星期几
        const [w, n] = dayOfWeek.split('#');
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return `每月第${n}个${weekdays[parseInt(w)]} ${hour}:${minute}`;
    }

    return cron;
  }

  private validateCron(cron: string): boolean {
    try {
      const parser = require('cron-parser');
      parser.parseExpression(cron);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async handleAddTask() {
    try {
      console.log('开始处理添加任务');
      
      // 验证群聊
      const validRooms = await this.validateRooms();
      if (validRooms.length === 0) {
        throw new Error('请输入有效的群聊名称');
      }

      const message = this.scheduleMessageInput.value.trim();
      if (!message) {
        throw new Error('请输入消息内容');
      }

      const cronExpression = this.generateCronExpression();
      const repeatType = this.repeatType.value;

      console.log('创建任务', {
        rooms: validRooms,
        message,
        cron: cronExpression,
        repeatType
      });

      // 创建任务
      const task: ScheduleTask = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        roomNames: validRooms,
        message,
        cron: cronExpression,
        enabled: true,
        isOneTime: repeatType === 'once',
        createdAt: new Date().toISOString(),
        repeatType: repeatType as 'daily' | 'weekly' | 'monthly' | 'once',
        status: 'pending',
        executionHistory: []
      };

      const result = await window.electronAPI.addScheduleTask(task);
      if (!result.success) {
        throw new Error(result.error || '添加任务失败');
      }

      notification.show('定时任务添加成功', 'success', 2000);
      this.clearForm();
      await this.loadTasks();
    } catch (error) {
      console.error('添加任务失败:', error);
      notification.show(error instanceof Error ? error.message : '添加失败', 'error', 5000);
    }
  }

  private clearForm() {
    if (this.scheduleMessageInput) this.scheduleMessageInput.value = '';
    if (this.scheduleRoomsInput) this.scheduleRoomsInput.value = '';
    if (this.scheduleDate) this.scheduleDate.value = '';
    if (this.scheduleTime) this.scheduleTime.value = '';
    if (this.repeatType) this.repeatType.value = 'once';
  }

  async toggleTask(taskId: string, enabled: boolean) {
    try {
      const result = await window.electronAPI.toggleScheduleTask(taskId, enabled);
      
      if (result.success) {
        notification.show(
          `任务已${enabled ? '启用' : '禁用'}`,
          'success',
          2000  // 成功类消息显示2秒
        );
        await this.loadTasks();
      } else {
        throw new Error(result.error || '操作失败');
      }
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '操作失败', 'error', 5000);  // 错误类消息显示5秒
    }
  }

  async deleteTask(taskId: string) {
    if (!confirm('确定删除这个任务吗？')) {
      return;
    }
    
    try {
      const result = await window.electronAPI.deleteScheduleTask(taskId);
      
      if (result.success) {
        notification.show('任务已删除', 'success', 2000);  // 成功类消息示2秒
        await this.loadTasks();
      } else {
        throw new Error(result.error || '删除失败');
      }
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '删除失败', 'error', 5000);  // 错误类消息显示5秒
    }
  }

  async editTask(taskId: string) {
    const task = await this.getTask(taskId);
    if (!task) return;

    // 填充表单，加值检查
    if (this.scheduleMessageInput) this.scheduleMessageInput.value = task.message;
    
    // 解析 cron 表达式并填充表单
    const cronParts = task.cron.split(' ');
    if (cronParts.length === 5) {
      const [minute, hour, dayOfMonth, month, dayOfWeek] = cronParts;
      
      // 设置时间
      if (this.scheduleTime) {
        this.scheduleTime.value = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
      }
      
      // 根据 cron 设置重复类型和日期
      if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        this.repeatType.value = 'daily';
      } else if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
        this.repeatType.value = 'weekly';
        // 设置周几的选择
      } else if (dayOfMonth !== '*' && month !== '*') {
        this.repeatType.value = 'once';
        if (this.scheduleDate) {
          const year = new Date().getFullYear();
          this.scheduleDate.value = `${year}-${month.padStart(2, '0')}-${dayOfMonth.padStart(2, '0')}`;
        }
      }
    }
    
    // 切换按钮状态
    if (this.addScheduleButton) {
      this.addScheduleButton.textContent = '保存修改';
      this.addScheduleButton.dataset.editId = taskId;
    }
    
    // 滚动到表单
    this.scheduleMessageInput?.scrollIntoView({ behavior: 'smooth' });
  }

  private async getTask(taskId: string): Promise<ScheduleTask | null> {
    try {
      const tasks = await window.electronAPI.getScheduleTasks();
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        return {
          ...task,
          isOneTime: task.isOneTime || false,
          createdAt: task.createdAt || new Date().toISOString()
        };
      }
      return null;
    } catch (error) {
      notification.show('获取任务失败', 'error');
      return null;
    }
  }

  private getTimeRemaining(nextRunTime: string): string {
    const now = new Date().getTime();
    const next = new Date(nextRunTime).getTime();
    const diff = next - now;

    // 如果时间无效或已过
    if (isNaN(diff) || diff < 0) {
      return '过期';
    }

    // 计算时间差
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    // 格式化输出
    const parts = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分钟`);

    return parts.length > 0 ? parts.join(' ') : '即将执行';
  }

  private initErrorHandling() {
    // 监听定时任务错误
    window.electronAPI.onScheduleError((error: any) => {
      const errorMessage = this.formatErrorMessage(error);
      notification.show(errorMessage, 'error');
      
      // 更新任务状态显示
      this.updateTaskStatus(error.taskId, 'failed', errorMessage);
    });
  }

  private formatErrorMessage(error: any): string {
    switch (error.type) {
      case 'task_failure':
        return `定时任务执行失 - ${error.roomName}: ${error.error}`;
      case 'bot_error':
        return `机器人错误: ${error.error}`;
      default:
        return '未知错误';
    }
  }

  private async updateTaskStatus(taskId: string, status: 'success' | 'failed', error?: string) {
    try {
        const tasks = await window.electronAPI.getScheduleTasks();
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // 更新任务状态
        task.lastRun = new Date().toISOString();
        task.lastStatus = status;
        task.error = error;

        // 添加执行历史
        if (!task.executionHistory) {
            task.executionHistory = [];
        }
        task.executionHistory.push({
            timestamp: new Date().toISOString(),
            status,
            error
        });

        // 处理一次性任务的完成状态
        if (task.isOneTime) {
            task.status = status === 'success' ? 'completed' : 'failed';
            task.archived = status === 'success';  // 成功的一次性任务自动归档
        }

        // 保存更新后的任务
        await window.electronAPI.updateScheduleTask(task);
        
        // 刷显示
        await this.loadTasks();
    } catch (error) {
        console.error('Failed to update task status:', error);
    }
  }

  private renderTaskHistory(task: ScheduleTask): string {
    const histories = task.executionHistory || [];
    if (histories.length === 0) {
        return '';
    }

    return `
        <div class="task-history">
            <h4>执行历史</h4>
            <div class="history-list">
                ${histories.map(history => `
                    <div class="history-item ${history.status}">
                        <span class="history-time">${new Date(history.timestamp).toLocaleString()}</span>
                        <span class="history-status">${history.status === 'success' ? '成功' : '失败'}</span>
                        ${history.error ? `<span class="history-error">${history.error}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
  }

  private startCountdownTimer(taskElement: HTMLElement, nextRunTime: string) {
    const countdownEl = taskElement.querySelector('.countdown');
    if (!countdownEl) return;

    const updateCountdown = () => {
      const timeRemaining = this.getTimeRemaining(nextRunTime);
      countdownEl.textContent = timeRemaining;
    };

    // 每钟更新一次
    const timerId = setInterval(updateCountdown, 60000);
    
    // 使用自定义属性存储定时器ID
    (taskElement as any).timerData = timerId;
    updateCountdown(); // 立即执行一次
  }

  // 在任务删除时清理定时器
  private cleanupTask(taskId: string) {
    const taskElement = this.container.querySelector(`[data-id="${taskId}"]`);
    if (!taskElement) return;

    const timerId = (taskElement as any).timerData;
    if (timerId) {
      clearInterval(timerId);
    }
  }

  async exportTasks() {
    try {
      const tasks = await window.electronAPI.getScheduleTasks();
      const data = JSON.stringify(tasks, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `schedule-tasks-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      notification.show('任务导出成功', 'success');
    } catch (error) {
      notification.show('导出失', 'error');
    }
  }

  async importTasks() {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const tasks = JSON.parse(e.target?.result as string);
            
            // 验证任务格式
            if (!Array.isArray(tasks) || !tasks.every(this.isValidTask)) {
              throw new Error('无效的任务数据格式');
            }

            // 量添任务
            for (const task of tasks) {
              await window.electronAPI.addScheduleTask(task);
            }

            notification.show('任务导入成功', 'success');
            await this.loadTasks();
          } catch (error) {
            notification.show('导入失败', 'error');
          }
        };
        reader.readAsText(file);
      };

      input.click();
    } catch (error) {
      notification.show('导入失败', 'error');
    }
  }

  private isValidTask(task: any): boolean {
    return (
      typeof task.id === 'string' &&
      typeof task.roomName === 'string' &&
      typeof task.message === 'string' &&
      typeof task.cron === 'string' &&
      typeof task.enabled === 'boolean'
    );
  }

  // 添加模选择UI
  private renderTemplateSelector(): string {
    return `
      <div class="template-selector">
        <button class="btn-secondary template-btn" onclick="window.scheduleManager.showTemplates()">
          使用模板 <span class="icon-down"></span>
        </button>
        <div class="template-dropdown">
          ${this.defaultTemplates.map(template => `
            <div class="template-item" onclick="window.scheduleManager.useTemplate('${template.id}')">
              <div class="template-name">${template.name}</div>
              <div class="template-info">
                <span class="template-cron">${template.cron}</span>
                <span class="template-message">${template.message}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 使用模板创建任务
  async useTemplate(templateId: string) {
    const template = this.defaultTemplates.find(t => t.id === templateId);
    if (!template) return;

    // 填充消息内容
    if (this.scheduleMessageInput) {
        this.scheduleMessageInput.value = this.processTemplateMessage(template.message);
    }

    // 解析 cron 表达式并填充表单
    const cronParts = template.cron.split(' ');
    if (cronParts.length === 5) {
        const [minute, hour, dayOfMonth, month, dayOfWeek] = cronParts;
        
        // 设置时间
        if (this.scheduleTime) {
            this.scheduleTime.value = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
        }
        
        // 根据 cron 设置重复类型和日期
        if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
            this.repeatType.value = 'daily';
        } else if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
            this.repeatType.value = 'weekly';
            // 设置周几的选择
        } else if (dayOfMonth !== '*' && month !== '*') {
            this.repeatType.value = 'once';
            if (this.scheduleDate) {
                const year = new Date().getFullYear();
                this.scheduleDate.value = `${year}-${month.padStart(2, '0')}-${dayOfMonth.padStart(2, '0')}`;
            }
        }
    }

    // 关模板选择器
    document.querySelector('.template-dropdown')?.classList.remove('show');
  }

  // 处理模板消息中的变量
  private processTemplateMessage(message: string): string {
    const now = new Date();
    return message
      .replace('{date}', now.toLocaleDateString())
      .replace('{weather}', '天气信息待更新');  // 可以接入天气API
  }

  showTemplates() {
    document.querySelector('.template-dropdown')?.classList.toggle('show');
  }

  private initTaskStatusUpdate() {
    // 监听任务态更新
    window.electronAPI.onTaskStatusUpdate((update: {
      taskId: string;
      status: 'running' | 'success' | 'failed';
      message?: string;
      progress?: number;
    }) => {
      const taskElement = this.container.querySelector(`[data-id="${update.taskId}"]`);
      if (!taskElement) return;

      // 更新状态标签
      const statusBadge = taskElement.querySelector('.status-badge');
      if (statusBadge) {
        statusBadge.className = `status-badge ${update.status}`;
        statusBadge.textContent = this.getStatusText(update.status);
      }

      // 更新进度条
      if (update.progress !== undefined) {
        const progressBar = taskElement.querySelector('.progress') as HTMLElement;
        if (progressBar) {
          progressBar.style.width = `${update.progress}%`;
        }
      }

      // 显示消息
      if (update.message) {
        const messageEl = document.createElement('div');
        messageEl.className = `task-message ${update.status}`;
        messageEl.textContent = update.message;
        taskElement.appendChild(messageEl);

        // 5秒后淡出
        setTimeout(() => {
          messageEl.classList.add('fade-out');
          setTimeout(() => messageEl.remove(), 300);
        }, 5000);
      }
    });
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'running': return '执行中';
      case 'success': return '执行成功';
      case 'failed': return '执行失败';
      default: return '未知状态';
    }
  }

  private generateCronExpression(): string {
    const date = (document.getElementById('scheduleDate') as HTMLInputElement).value;
    const time = (document.getElementById('scheduleTime') as HTMLInputElement).value;
    const repeatType = (document.getElementById('repeatType') as HTMLSelectElement).value;

    if (!time) return '';

    const [hours, minutes] = time.split(':');
    const [year, month, day] = date ? date.split('-') : ['*', '*', '*'];

    switch (repeatType) {
        case 'once':
            // 修改这里：指定日期执行一次时，应该使用具体的日期和月份
            if (!date) {
                throw new Error('请选择执行日期');
            }
            return `${minutes} ${hours} ${day} ${month} *`;
            
        case 'daily':
            return `${minutes} ${hours} * * *`;
            
        case 'weekly':
            const weekdays = Array.from(document.querySelectorAll('.weekday-selector input:checked'))
                .map(cb => (cb as HTMLInputElement).value)
                .join(',');
            return `${minutes} ${hours} * * ${weekdays || '*'}`;
            
        case 'monthly':
            const monthlyType = (document.getElementById('monthlyType') as HTMLSelectElement).value;
            if (monthlyType === 'date') {
                const monthlyDate = (document.getElementById('monthlyDate') as HTMLInputElement).value;
                return `${minutes} ${hours} ${monthlyDate} * *`;
            } else {
                const weekOrder = (document.getElementById('weekOrder') as HTMLSelectElement).value;
                const weekDay = (document.getElementById('weekDay') as HTMLSelectElement).value;
                if (weekOrder === '-1') {
                    return `${minutes} ${hours} * * ${weekDay}L`;
                } else {
                    return `${minutes} ${hours} * * ${weekDay}#${weekOrder}`;
                }
            }
            
        default:
            return '';
    }
  }

  private bindRepeatTypeEvents() {
    const repeatSelect = document.getElementById('repeatType') as HTMLSelectElement;
    const weeklyOptions = document.querySelector('.repeat-weekly') as HTMLElement;
    const monthlyOptions = document.querySelector('.repeat-monthly') as HTMLElement;

    repeatSelect.addEventListener('change', () => {
      weeklyOptions.style.display = repeatSelect.value === 'weekly' ? 'block' : 'none';
      monthlyOptions.style.display = repeatSelect.value === 'monthly' ? 'block' : 'none';
    });

    // 处理月重复类型切换
    const monthlyType = document.getElementById('monthlyType') as HTMLSelectElement;
    const monthlyDate = document.querySelector('.monthly-date') as HTMLElement;
    const monthlyWeek = document.querySelector('.monthly-week') as HTMLElement;

    monthlyType.addEventListener('change', () => {
      monthlyDate.style.display = monthlyType.value === 'date' ? 'block' : 'none';
      monthlyWeek.style.display = monthlyType.value === 'week' ? 'block' : 'none';
    });
  }

  // 获取任务下次执行时间
  private getNextRunTime(cron: string): string | null {
    try {
        const parser = require('cron-parser');
        const interval = parser.parseExpression(cron);
        return interval.next().toDate().toISOString();
    } catch (error) {
        return null;
    }
  }

  // 获取任务状态
  private getTaskStatus(task: ScheduleTask, nextRunTime: string | null): { className: string; text: string } {
    // 如果任务已经执行过
    if (task.lastRun) {
        // 如果执行成功
        if (task.lastStatus === 'success') {
            return { className: 'completed', text: '已完成' };
        }
        // 如果执行失败
        if (task.lastStatus === 'failed') {
            return { className: 'failed', text: '执行失败' };
        }
    }

    // 如果是一次性任务，检查是否过期
    if (task.isOneTime && nextRunTime) {
        const now = new Date().getTime();
        const next = new Date(nextRunTime).getTime();
        if (next < now) {
            return { className: 'expired', text: '已过期' };
        }
    }

    if (!task.enabled) {
        return { className: 'disabled', text: '已禁用' };
    }
    
    if (!nextRunTime) {
        return { className: 'error', text: '时间设置错误' };
    }

    return { className: 'pending', text: '等待执行' };
  }

  // 排序任务
  async sortTasks(sortBy: 'next' | 'added') {
    const tasks = await window.electronAPI.getScheduleTasks();
    
    const validTasks = tasks.map(task => ({
        ...task,
        isOneTime: task.isOneTime || false,
        createdAt: task.createdAt || new Date().toISOString()
    }));

    const sortedTasks = [...validTasks].sort((a, b) => {
        if (sortBy === 'next') {
            const nextA = this.getNextRunTime(a.cron);
            const nextB = this.getNextRunTime(b.cron);
            return (nextA ? new Date(nextA).getTime() : 0) - (nextB ? new Date(nextB).getTime() : 0);
        } else {
            return parseInt(a.id) - parseInt(b.id);
        }
    });

    this.renderTasks(sortedTasks);
  }

  // 修改测试方法，添加更多日志
  async testSendMessage() {
    try {
        const validRooms = await this.validateRooms();
        if (validRooms.length === 0) {
            notification.show('请输入有效的群聊名称', 'error');
            return;
        }

        const message = this.scheduleMessageInput.value.trim();
        if (!message) {
            notification.show('请输入消息内容', 'error');
            return;
        }

        // 调用测试发送
        const result = await window.electronAPI.testDirectSend(
            validRooms[0],  // 使用第一个有效群聊
            message
        );

        if (result.success) {
            notification.show('测试消息发送成功', 'success', 5000);
        } else {
            throw new Error(result.error || '发送失败');
        }
    } catch (error) {
        console.error('测试发送消息失败:', error);
        notification.show(error instanceof Error ? error.message : '测试失败', 'error', 5000);
    }
  }

  private async validateRooms(): Promise<string[]> {
    const inputRooms = this.scheduleRoomsInput.value
        .split('\n')
        .map(room => room.trim())
        .filter(room => room.length > 0);

    try {
        const config = await window.electronAPI.getConfig();
        const invalidRooms = inputRooms.filter(room => !config.roomWhitelist.includes(room));
        
        // 显示无效群聊提示
        const existingError = this.scheduleRoomsInput.nextElementSibling;
        if (existingError?.classList.contains('invalid-room')) {
            existingError.remove();
        }

        if (invalidRooms.length > 0) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-room';
            errorDiv.textContent = `以下群聊不在白名单中：${invalidRooms.join(', ')}`;
            this.scheduleRoomsInput.parentElement?.appendChild(errorDiv);
            return [];
        }

        return inputRooms;
    } catch (error) {
        console.error('验证群聊失败:', error);
        return [];
    }
  }

  // 添加辅助方法判断任务是否过期
  private isTaskExpired(task: ScheduleTask): boolean {
    if (!task.isOneTime) return false;
    const nextRunTime = this.getNextRunTime(task.cron);
    if (!nextRunTime) return false;
    
    // 如果已经执行过，就认为已过期
    if (task.lastRun) return true;
    
    // 否则检查时间是否过期
    return new Date(nextRunTime).getTime() < new Date().getTime();
  }
}

// 确保在全局作用域中注册实例
declare global {
    interface Window {
        scheduleManager: ScheduleManager;
    }
} 