import React from 'react';
import { createHashRouter } from 'react-router-dom';
import { ProShellLayout } from '../components/pro-shell-layout.jsx';
import { TaskCenterPage } from '../modules/workspace/pages/task-center/index.jsx';

// Electron 优先使用 hash 路由，减少文件协议和深链路兼容问题。
export const router = createHashRouter([
  {
    path: '/',
    element: <ProShellLayout />,
    children: [
      {
        index: true,
        element: <TaskCenterPage />
      }
    ]
  }
]);
