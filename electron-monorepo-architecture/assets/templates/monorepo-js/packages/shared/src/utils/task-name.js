// 共享纯函数只能处理字符串和数据，不接触 Electron 或浏览器对象。

/**
 * 归一化任务名称，避免主进程和渲染层各自实现一套规则。
 * @param {string} rawName 用户输入的原始名称。
 * @returns {string}
 */
export function normalizeTaskName(rawName) {
  return String(rawName || '').trim().replace(/\s+/g, ' ');
}
