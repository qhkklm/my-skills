// 使用 JSDoc 维护 preload 白名单能力契约，替代 TypeScript 类型声明文件。

/**
 * @typedef {Object} TaskApi
 * @property {() => Promise<Array<{ id: string, name: string, status: string }>>} list 查询任务列表。
 * @property {(payload: { id: string, name: string }) => Promise<{ success: boolean }>} save 保存任务。
 */

/**
 * @typedef {Object} AppBridge
 * @property {TaskApi} task 任务白名单能力。
 */

/**
 * 创建稳定的白名单 API。
 * @param {(channel: string, payload?: unknown) => Promise<unknown>} invoke IPC 调用函数。
 * @param {{ taskList: string, taskSave: string }} channels IPC channel 映射。
 * @returns {AppBridge}
 */
export function createPreloadApi(invoke, channels) {
  return {
    task: {
      async list() {
        return invoke(channels.taskList);
      },
      async save(payload) {
        return invoke(channels.taskSave, payload);
      }
    }
  };
}

/**
 * 运行时校验 `window` 上挂载的桥接能力，避免页面直接散用未知结构。
 * @param {unknown} value 任意待校验对象。
 * @returns {AppBridge}
 */
export function assertPreloadApi(value) {
  if (!value || typeof value !== 'object' || typeof value.task?.list !== 'function' || typeof value.task?.save !== 'function') {
    throw new Error('window.appBridge 不符合预期契约。');
  }

  return value;
}
