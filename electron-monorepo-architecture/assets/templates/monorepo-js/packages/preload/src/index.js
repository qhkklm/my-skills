import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@sample-app/shared/constants/ipc-channels';
import { createPreloadApi } from '@sample-app/shared/contracts/preload-api';

// preload 只暴露白名单 API，不暴露原始 ipcRenderer。
const appBridge = createPreloadApi(
  (channel, payload) => ipcRenderer.invoke(channel, payload),
  {
    taskList: IPC_CHANNELS.taskList,
    taskSave: IPC_CHANNELS.taskSave
  }
);

contextBridge.exposeInMainWorld('appBridge', appBridge);
