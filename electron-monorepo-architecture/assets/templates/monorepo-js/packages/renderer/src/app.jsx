import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './core/router.js';

// 根组件只承担路由壳，不在这里堆业务细节。
export const app = <RouterProvider router={router} />;
