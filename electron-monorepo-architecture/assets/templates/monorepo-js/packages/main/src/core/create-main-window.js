import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow } from 'electron';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

// 窗口创建逻辑归位到 core，避免主入口巨石化。
export function createMainWindow() {
  const windowInstance = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      // 模板假设 preload 构建产物输出到 dist，可按实际构建链调整。
      preload: path.resolve(currentDirPath, '../../../preload/dist/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  windowInstance.loadURL('http://localhost:5173');
  return windowInstance;
}
