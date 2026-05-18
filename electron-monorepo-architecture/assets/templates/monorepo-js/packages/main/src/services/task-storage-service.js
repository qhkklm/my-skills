import { normalizeTaskName } from '@sample-app/shared/utils/task-name';

// 基础设施服务只关心存储动作，不关心页面交互。
export class TaskStorageService {
  constructor() {
    this.taskList = [
      { id: 'task-1', name: '默认任务', status: 'idle' }
    ];
  }

  async list() {
    return this.taskList;
  }

  async save(payload) {
    const normalizedName = normalizeTaskName(payload?.name);
    this.taskList = this.taskList.filter((item) => item.id !== payload.id);
    this.taskList.push({
      id: payload.id,
      name: normalizedName,
      status: 'idle'
    });
    return { success: true };
  }
}
