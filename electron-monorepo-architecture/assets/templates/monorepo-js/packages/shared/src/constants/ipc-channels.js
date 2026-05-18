// 统一维护 IPC channel，避免渲染层与主进程各自手写字符串。
export const IPC_CHANNELS = Object.freeze({
  taskList: 'task:list',
  taskSave: 'task:save'
});
