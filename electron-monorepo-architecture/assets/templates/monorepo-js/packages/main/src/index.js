import { app } from 'electron';
import { createMainWindow } from './core/create-main-window.js';
import { registerTaskIpc } from './ipc/register-task-ipc.js';
import { TaskStorageService } from './services/task-storage-service.js';

// 主入口只编排启动顺序，不直接承载窗口和存储细节。
const taskStorageService = new TaskStorageService();

app.whenReady().then(() => {
  registerTaskIpc(taskStorageService);
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
