import { notification } from '../components/notification';

// 添加任务模板相关代码
interface TaskTemplate {
  id: string;
  name: string;
  roomName: string;
  message: string;
  cron: string;
}

// 在文件顶部添加类型导入
interface ScheduleTask {
  id: string;
  roomName: string;
  message: string;
  cron: string;
  enabled: boolean;
  lastRun?: string;
  lastStatus?: 'success' | 'failed';
  histories?: TaskHistory[];
}

export class ScheduleManager {
  private container: HTMLElement;
  private scheduleRoomInput!: HTMLSelectElement | HTMLInputElement;
  private scheduleMessageInput!: HTMLTextAreaElement;
  private scheduleCronInput!: HTMLInputElement;
  private addScheduleButton!: HTMLButtonElement;
  private roomTagsContainer!: HTMLElement;
  private roomInput!: HTMLInputElement;
  private selectedRooms: Set<string> = new Set();

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
    
    // 初始化所有 DOM 元素，使用实际存在的 ID
    const messageInput = document.getElementById('scheduleMessage');
    const addButton = document.getElementById('addSchedule');
    const roomTags = document.getElementById('roomTags');
    const roomInputEl = document.getElementById('roomInput');

    // 类型检查和赋值
    if (!messageInput || !addButton || !roomTags || !roomInputEl) {
      throw new Error('必需的 DOM 元素未找到');
    }

    this.scheduleMessageInput = messageInput as HTMLTextAreaElement;
    this.addScheduleButton = addButton as HTMLButtonElement;
    this.roomTagsContainer = roomTags;
    this.roomInput = roomInputEl as HTMLInputElement;

    // 初始化
    this.bindEvents();
    this.loadTasks();
    this.initRoomTags();
  }

  private initElements() {
    this.scheduleRoomInput = document.getElementById('scheduleRoom') as HTMLSelectElement | HTMLInputElement;
    this.scheduleMessageInput = document.getElementById('scheduleMessage') as HTMLTextAreaElement;
    this.scheduleCronInput = document.getElementById('scheduleCron') as HTMLInputElement;
    this.addScheduleButton = document.getElementById('addSchedule') as HTMLButtonElement;
  }

  private validateElements(): boolean {
    if (!this.scheduleRoomInput || !this.scheduleMessageInput || 
        !this.scheduleCronInput || !this.addScheduleButton) {
      console.error('Schedule elements not found');
      return false;
    }
    return true;
  }

  private bindEvents() {
    if (!this.addScheduleButton) return;

    this.addScheduleButton.addEventListener('click', () => this.handleAddTask());
    
    // 绑定重复类型事件
    this.bindRepeatTypeEvents();
  }

  async loadTasks() {
    try {
      const tasks = await window.electronAPI.getScheduleTasks();
      this.renderTasks(tasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }

  private renderTasks(tasks: ScheduleTask[]) {
    this.container.innerHTML = tasks.map(task => this.renderTaskItem(task)).join('');
  }

  private renderTaskItem(task: ScheduleTask): string {
    const nextRunTime = this.getNextRunTime(task.cron);
    const lastRunStatus = task.lastStatus ? 
      `<span class="status-badge ${task.lastStatus}">${task.lastStatus === 'success' ? '执行成功' : '执行失败'}</span>` : '';
    
    // 添加进度条
    const now = new Date().getTime();
    const nextRun = new Date(nextRunTime).getTime();
    const lastRun = task.lastRun ? new Date(task.lastRun).getTime() : now;
    const progress = Math.min(100, ((now - lastRun) / (nextRun - lastRun)) * 100);
    
    return `
      <div class="schedule-item ${task.enabled ? '' : 'disabled'}" data-id="${task.id}">
        <div class="schedule-item-info">
          <div class="schedule-item-header">
            <span class="room-name"><strong>群名称:</strong> ${task.roomName}</span>
            <span class="status-badge ${task.enabled ? 'active' : 'inactive'}">
              ${task.enabled ? '已启用' : '已禁用'}
            </span>
          </div>
          <div class="message"><strong>消息:</strong> ${task.message}</div>
          <div class="cron"><strong>定时规则:</strong> ${task.cron}</div>
          <div class="execution-info">
            ${task.lastRun ? `<div class="last-run"><strong>上次执行:</strong> ${new Date(task.lastRun).toLocaleString()} ${lastRunStatus}</div>` : ''}
            <div class="next-run"><strong>下次执行:</strong> ${nextRunTime}</div>
          </div>
          <div class="execution-progress">
            <div class="progress-bar">
              <div class="progress" style="width: ${progress}%"></div>
            </div>
            <span class="progress-text">距离下次执行: ${this.getTimeRemaining(nextRunTime)}</span>
          </div>
        </div>
        <div class="schedule-item-actions">
          <button class="btn-icon edit-task" title="编辑任务" onclick="window.scheduleManager.editTask('${task.id}')">
            <i class="icon-edit"></i>
          </button>
          <button class="btn-icon copy-task" title="复制任务" onclick="window.scheduleManager.copyTask('${task.id}')">
            <i class="icon-copy"></i>
          </button>
          <button class="btn-${task.enabled ? 'warning' : 'success'} toggle-task">
            ${task.enabled ? '禁用' : '启用'}
          </button>
          <button class="btn-danger delete-task">删除</button>
        </div>
      </div>
    `;
  }

  private getNextRunTime(cronExpression: string): string {
    try {
      const parser = require('cron-parser');
      const interval = parser.parseExpression(cronExpression);
      return interval.next().toDate().toLocaleString();
    } catch (error) {
      return '无效的定时规则';
    }
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
      if (this.selectedRooms.size === 0) {
        throw new Error('请选择至少一个群聊');
      }

      const message = this.scheduleMessageInput?.value.trim() || '';
      const cronExpression = this.generateCronExpression(); // 使用新的方法生成 cron 表达式

      // 输入验证
      if (!message) {
        throw new Error('请输入消息内容');
      }

      // 为每个选中的群聊创建任务
      for (const roomName of this.selectedRooms) {
        const task: ScheduleTask = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          roomName,
          message,
          cron: cronExpression,
          enabled: true
        };

        const result = await window.electronAPI.addScheduleTask(task);
        if (!result.success) {
          throw new Error(`添加任务失败: ${result.error}`);
        }
      }

      notification.show('定时任务添加成功', 'success');
      this.clearForm();
      await this.loadTasks();
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '添加失败', 'error');
    }
  }

  private clearForm() {
    if (this.scheduleRoomInput) this.scheduleRoomInput.value = '';
    if (this.scheduleMessageInput) this.scheduleMessageInput.value = '';
    if (this.scheduleCronInput) this.scheduleCronInput.value = '';
  }

  async toggleTask(taskId: string, enabled: boolean) {
    try {
      const result = await window.electronAPI.toggleScheduleTask(taskId, enabled);
      
      if (result.success) {
        notification.show(
          `任务已${enabled ? '启用' : '禁用'}`,
          'success'
        );
        await this.loadTasks();
      } else {
        throw new Error(result.error || '操作失败');
      }
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '操作失败', 'error');
    }
  }

  async deleteTask(taskId: string) {
    if (!confirm('确定要删除这个任务吗？')) {
      return;
    }
    
    try {
      const result = await window.electronAPI.deleteScheduleTask(taskId);
      
      if (result.success) {
        notification.show('任务已删除', 'success');
        await this.loadTasks();
      } else {
        throw new Error(result.error || '删除失败');
      }
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '删除失败', 'error');
    }
  }

  private async initRoomTags() {
    try {
      const config = await window.electronAPI.getConfig();
      config.roomWhitelist.forEach((room: string) => {
        this.selectedRooms.add(room);
        this.addRoomTag(room);
      });
    } catch (error) {
      console.error('Failed to load room list:', error);
    }
  }

  private addRoomTag(roomName: string) {
    const tag = document.createElement('div');
    tag.className = 'room-tag';
    tag.innerHTML = `
      <span class="room-name">${roomName}</span>
      <span class="remove-tag" onclick="event.stopPropagation(); window.scheduleManager.removeRoom('${roomName}')">×</span>
    `;
    this.roomTagsContainer.appendChild(tag);
  }

  removeRoom(roomName: string) {
    this.selectedRooms.delete(roomName);
    const tags = this.roomTagsContainer.querySelectorAll('.room-tag');
    tags.forEach(tag => {
      if (tag.querySelector('.room-name')?.textContent === roomName) {
        tag.remove();
      }
    });
  }

  private bindRoomInputEvents() {
    this.roomInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.roomInput.value.trim()) {
        const roomName = this.roomInput.value.trim();
        if (!this.selectedRooms.has(roomName)) {
          this.selectedRooms.add(roomName);
          this.addRoomTag(roomName);
        }
        this.roomInput.value = '';
      }
    });
  }

  async editTask(taskId: string) {
    const task = await this.getTask(taskId);
    if (!task) return;

    // 填充表单，添加空值检查
    if (this.scheduleRoomInput) this.scheduleRoomInput.value = task.roomName;
    if (this.scheduleMessageInput) this.scheduleMessageInput.value = task.message;
    if (this.scheduleCronInput) this.scheduleCronInput.value = task.cron;
    
    // 切换按钮状态
    if (this.addScheduleButton) {
      this.addScheduleButton.textContent = '保存修改';
      this.addScheduleButton.dataset.editId = taskId;
    }
    
    // 滚动到表单
    this.scheduleRoomInput?.scrollIntoView({ behavior: 'smooth' });
  }

  async copyTask(taskId: string) {
    const task = await this.getTask(taskId);
    if (!task) return;

    const newTask: ScheduleTask = {
      ...task,
      id: Date.now().toString(),
      roomName: `${task.roomName} (副本)`,
    };

    const result = await window.electronAPI.addScheduleTask(newTask);
    if (result.success) {
      notification.show('任务复制成功', 'success');
      await this.loadTasks();
    } else {
      notification.show(result.error || '复制失败', 'error');
    }
  }

  private async getTask(taskId: string): Promise<ScheduleTask | null> {
    try {
      const tasks = await window.electronAPI.getScheduleTasks();
      return tasks.find((task: ScheduleTask) => task.id === taskId) || null;
    } catch (error) {
      notification.show('获取任务失败', 'error');
      return null;
    }
  }

  private getTimeRemaining(nextRunTime: string): string {
    const now = new Date().getTime();
    const next = new Date(nextRunTime).getTime();
    const diff = next - now;

    // 如果时间无效或已过期
    if (isNaN(diff) || diff < 0) {
      return '已过期';
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
        return `定时任务执行失败 - ${error.roomName}: ${error.error}`;
      case 'bot_error':
        return `机器人错误: ${error.error}`;
      default:
        return '未知错误';
    }
  }

  private updateTaskStatus(taskId: string, status: 'success' | 'failed', message?: string) {
    const taskElement = this.container.querySelector(`[data-id="${taskId}"]`);
    if (!taskElement) return;

    const statusBadge = taskElement.querySelector('.status-badge');
    if (statusBadge) {
      statusBadge.className = `status-badge ${status}`;
      statusBadge.textContent = status === 'success' ? '执行成功' : '执行失败';
    }

    if (message) {
      const errorInfo = document.createElement('div');
      errorInfo.className = 'task-error-info';
      errorInfo.textContent = message;
      taskElement.appendChild(errorInfo);

      // 5秒后自动隐藏错误信息
      setTimeout(() => {
        errorInfo.remove();
      }, 5000);
    }
  }

  private renderTaskHistory(task: ScheduleTask): string {
    const histories = task.histories || [];
    if (histories.length === 0) {
      return '';
    }

    return `
      <div class="task-history">
        <h4>执行历史</h4>
        <div class="history-list">
          ${histories.map((history: TaskHistory) => `
            <div class="history-item ${history.status}">
              <span class="history-time">${new Date(history.executionTime).toLocaleString()}</span>
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

    // 每分钟更新一次
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
      notification.show('导出失败', 'error');
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

            // 量添加任务
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

  // 添加模板选择UI
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

    // 填充单，添加空值检查
    if (this.scheduleRoomInput) this.scheduleRoomInput.value = template.roomName;
    if (this.scheduleMessageInput) this.scheduleMessageInput.value = this.processTemplateMessage(template.message);
    if (this.scheduleCronInput) this.scheduleCronInput.value = template.cron;

    // 关闭模板选择器
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
    // 监听任务状态更新
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
    const time = (document.getElementById('scheduleTime') as HTMLInputElement).value;
    const [hours, minutes] = time.split(':');
    const repeatType = (document.getElementById('repeatType') as HTMLSelectElement).value;

    switch (repeatType) {
      case 'once': {
        // 单次执行，需要包含具体日期
        const now = new Date();
        const [year, month, date] = [
          now.getFullYear(),
          now.getMonth() + 1,
          now.getDate()
        ];
        return `${minutes} ${hours} ${date} ${month} *`;
      }
      
      case 'daily':
        // 每天执行
        return `${minutes} ${hours} * * *`;
      
      case 'weekly': {
        // 获取选中的星期
        const weekdays = Array.from(document.querySelectorAll('.weekday-selector input:checked'))
          .map(cb => (cb as HTMLInputElement).value)
          .join(',');
        return `${minutes} ${hours} * * ${weekdays || '*'}`;
      }
      
      case 'monthly': {
        const monthlyType = (document.getElementById('monthlyType') as HTMLSelectElement).value;
        if (monthlyType === 'date') {
          // 每月指定日期
          const date = (document.getElementById('monthlyDate') as HTMLInputElement).value;
          return `${minutes} ${hours} ${date} * *`;
        } else {
          // 每月指定星期
          const order = (document.getElementById('weekOrder') as HTMLSelectElement).value;
          const weekday = (document.getElementById('weekDay') as HTMLSelectElement).value;
          // 这里需要更复杂的 cron 表达式来表示第几个星期几
          return this.generateMonthlyWeekCron(minutes, hours, parseInt(order), parseInt(weekday));
        }
      }
      
      default:
        throw new Error('无效的重复类型');
    }
  }

  private generateMonthlyWeekCron(minutes: string, hours: string, order: number, weekday: number): string {
    if (order === -1) {
      // 最后一个星期几
      return `${minutes} ${hours} * * ${weekday}L`;
    } else {
      // 第几个星期几
      return `${minutes} ${hours} * * ${weekday}#${order}`;
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
}

// 为了支持全局访问
declare global {
  interface Window {
    scheduleManager: ScheduleManager;
  }
} 