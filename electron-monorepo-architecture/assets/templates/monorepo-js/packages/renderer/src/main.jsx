import React from 'react';
import ReactDOM from 'react-dom/client';
import { app } from './app.jsx';
import './common/styles/index.css';

// 入口文件只负责挂载与加载全局样式。
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {app}
  </React.StrictMode>
);
