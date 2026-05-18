import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@sample-app/shared/constants/ipc-channels';

// IPC 只做注册与桥接，不在这里塞复杂业务编排。
export function registerTaskIpc(taskStorageService) {
  ipcMain.handle(IPC_CHANNELS.taskList, async () => taskStorageService.list());
  ipcMain.handle(IPC_CHANNELS.taskSave, async (_event, payload) => taskStorageService.save(payload));
}
