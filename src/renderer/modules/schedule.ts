import { ScheduleTask } from '../../shared/types/config';
import { notification } from '../components/notification';
import { LoadingUI } from '../components/loading';

export class ScheduleManager {
  private container: HTMLElement;
  private loading: LoadingUI;
  
  private scheduleRoomInput: HTMLInputElement;
  private scheduleMessageInput: HTMLTextAreaElement;
  private scheduleCronInput: HTMLInputElement;
  private addScheduleButton: HTMLButtonElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.loading = new LoadingUI();

    // 初始化DOM元素
    this.scheduleRoomInput = document.getElementById('scheduleRoom') as HTMLInputElement;
    this.scheduleMessageInput = document.getElementById('scheduleMessage') as HTMLTextAreaElement;
    this.scheduleCronInput = document.getElementById('scheduleCron') as HTMLInputElement;
    this.addScheduleButton = document.getElementById('addSchedule') as HTMLButtonElement;

    this.bindEvents();
  }

  private bindEvents() {
    this.addScheduleButton.addEventListener('click', () => this.handleAddTask());
  }

  private async handleAddTask() {
    try {
      // 输入验证
      if (!this.scheduleRoomInput.value.trim()) {
        throw new Error('请输入群名称');
      }
      if (!this.scheduleMessageInput.value.trim()) {
        throw new Error('请输入消息内容');
      }
      if (!this.scheduleCronInput.value.trim()) {
        throw new Error('请输入定时规则');
      }
      
      this.loading.show('添加定时任务...');
      
      const task: ScheduleTask = {
        id: Date.now().toString(),
        roomName: this.scheduleRoomInput.value.trim(),
        message: this.scheduleMessageInput.value.trim(),
        cron: this.scheduleCronInput.value.trim(),
        enabled: true
      };

      const result = await window.electronAPI.addScheduleTask(task);
      if (!result.success) {
        throw new Error(result.error || '添加失败');
      }

      notification.show('定时任务添加成功', 'success');
      this.clearInputs();
      await this.loadTasks();
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '添加失败', 'error');
    } finally {
      this.loading.hide();
    }
  }

  private clearInputs() {
    this.scheduleRoomInput.value = '';
    this.scheduleMessageInput.value = '';
    this.scheduleCronInput.value = '';
  }

  async loadTasks() {
    const tasks = await window.electronAPI.getScheduleTasks();
    this.container.innerHTML = tasks.map(task => this.renderTask(task)).join('');
  }

  private renderTask(task: ScheduleTask): string {
    return `
      <div class="schedule-item ${task.enabled ? '' : 'disabled'}" data-id="${task.id}">
        <div class="schedule-item-info">
          <div><strong>群名称:</strong> ${task.roomName}</div>
          <div><strong>消息:</strong> ${task.message}</div>
          <div><strong>定时:</strong> ${task.cron}</div>
          <div><strong>状态:</strong> <span class="status-badge ${task.enabled ? 'active' : 'inactive'}">${task.enabled ? '已启用' : '已禁用'}</span></div>
        </div>
        <div class="schedule-item-actions">
          <button class="btn-${task.enabled ? 'warning' : 'success'}" onclick="window.scheduleManager.toggleTask('${task.id}', ${!task.enabled})">
            ${task.enabled ? '禁用' : '启用'}
          </button>
          <button class="btn-danger" onclick="window.scheduleManager.deleteTask('${task.id}')">删除</button>
        </div>
      </div>
    `;
  }

  async toggleTask(taskId: string, enabled: boolean) {
    try {
      this.loading.show('更新任务状态...');
      const result = await window.electronAPI.toggleScheduleTask(taskId, enabled);
      if (!result.success) {
        throw new Error(result.error || '更新失败');
      }
      
      notification.show(
        `任务已${enabled ? '启用' : '禁用'}`,
        'success'
      );
      
      await this.loadTasks();
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '更新失败', 'error');
    } finally {
      this.loading.hide();
    }
  }

  async deleteTask(taskId: string) {
    if (!confirm('确定要删除这个任务吗？')) {
      return;
    }
    
    try {
      this.loading.show('删除任务...');
      const result = await window.electronAPI.deleteScheduleTask(taskId);
      if (!result.success) {
        throw new Error(result.error || '删除失败');
      }
      
      notification.show('任务已删除', 'success');
      await this.loadTasks();
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '删除失败', 'error');
    } finally {
      this.loading.hide();
    }
  }
}

// 为了支持全局访问
declare global {
  interface Window {
    scheduleManager: ScheduleManager;
  }
} 