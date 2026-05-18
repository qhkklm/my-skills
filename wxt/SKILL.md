---
name: wxt
description: WXT 现代扩展脚手架搭建与自定义启动
---

### 1. 初始化基础脚手架 (WXT + React)

首先，使用 WXT 官方 CLI 初始化 React 模板，建议使用 `pnpm` 进行包管理以保证依赖的扁平化和安装速度。

```bash
npx wxt@latest init ${文件夹名称} -t react
cd ${文件夹名称}
pnpm install
```

### 2. 集成 UnoCSS 和 Semi UI

WXT 底层使用的是 Vite，因此我们可以直接以 Vite 插件的形式接入 UnoCSS。

**安装依赖：**

```bash
pnpm add unocss @douyinfe/semi-ui @douyinfe/semi-icons
```

**配置 UnoCSS：**

在根目录创建 `uno.config.ts`：

```typescript
// uno.config.ts
import { defineConfig, presetUno, presetAttributify } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
  ],
  // 避免 UnoCSS 覆盖 Semi UI 的基础样式
  preflight: false, 
});
```

**修改 WXT 配置接入 Vite 插件：**

打开 `wxt.config.ts`，配置 Vite 插件：

```typescript
// wxt.config.ts
import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite';

export default defineConfig({
  vite: () => ({
    plugins: [
      react(),
      UnoCSS(),
    ],
  }),
  // 指定打包输出目录，方便后续脚本引用
  outDir: '.output', 
});
```

**在入口文件引入样式：**

修改你的 UI 入口文件（例如 `entrypoints/popup/main.tsx`），确保引入 UnoCSS 和 Semi UI 的样式：

```tsx
// entrypoints/popup/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// 引入 UnoCSS 样式
import 'virtual:uno.css';
// 引入 Semi UI 基础样式
import '@douyinfe/semi-ui/dist/css/semi.min.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 3. 工程化核心：自定义浏览器启动脚本

为了满足你不使用 `wxt dev` 且需开启 `9222` 端口的需求，我们需要将**构建流程（Watch Mode）**和**浏览器启动流程**解耦。

在根目录创建 `scripts/launch.mjs`，利用 Node.js 的 `child_process` 原生启动 Chrome：

```javascript
// scripts/launch.mjs
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. 路径定义
// WXT 默认会将 manifest v3 编译到 .output/chrome-mv3
const extensionPath = path.resolve(__dirname, '../.output/chrome-mv3');
// 创建独立的 Chrome 用户数据目录，避免污染日常使用的浏览器状态
const userDataDir = path.resolve(__dirname, '../.chrome-dev-profile');

// 确保目录存在，否则 Chrome 可能会报错
if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}

// 2. 匹配不同操作系统的 Chrome 默认安装路径
const getChromePath = () => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  
  switch (process.platform) {
    case 'darwin': // macOS
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    case 'win32':  // Windows
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    case 'linux':  // Linux
      return '/usr/bin/google-chrome';
    default:
      throw new Error('Unsupported platform');
  }
};

const chromePath = getChromePath();

// 3. 配置 Chrome 启动参数
const chromeArgs = [
  `--no-first-run`,
  `--no-default-browser-check`,
  `--disable-restore-session-state`,
  // 关键：开启 9222 远程调试端口
  `--remote-debugging-port=9222`,
  // 关键：加载本地未打包的扩展程序
  `--load-extension=${extensionPath}`,
  // 关键：使用独立的开发者 Profile
  `--user-data-dir=${userDataDir}`
];

console.log(`🚀 [Dev Script] Starting Chrome...`);
console.log(`🔗 Remote Debugging Port: 9222`);
console.log(`📦 Loading Extension from: ${extensionPath}`);

// 4. 启动进程
const child = spawn(chromePath, chromeArgs, {
  stdio: 'ignore', // 忽略 Chrome 输出的冗杂日志
  detached: true,  // 允许父进程退出后 Chrome 继续运行
});

child.unref();
console.log(`✅ Chrome launched successfully.`);
```

### 4. 组合 NPM Scripts 实现自动化流

为了让开发体验如丝般顺滑，我们需要同时运行 WXT 的热更新编译（Watch）和我们的自定义启动脚本。

安装并发执行工具：

```bash
pnpm add -D concurrently npm-run-all
```

修改 `package.json` 的 `scripts`：

```json
{
  "scripts": {
    "dev": "npm-run-all build:once dev:start",
    "build:once": "wxt build",
    "dev:start": "concurrently \"npm run watch\" \"npm run launch:delay\"",
    "watch": "wxt build --watch",
    "launch:delay": "node -e \"setTimeout(()=>require('./scripts/launch.mjs'), 1500)\"",
    "build": "wxt build",
    "zip": "wxt zip"
  }
}
```

*工程化考量说明：*
* `dev` 指令会先执行一次全量编译 (`build:once`)，确保 `.output/chrome-mv3` 文件夹和资源就绪。
* 然后并行启动 `wxt build --watch` (负责代码热重载编译) 和 `launch:delay`。
* 加入延时 (`launch:delay`) 是为了确保 Watch 模式的初始准备工作不被阻塞，避免扩展加载失败。

### 5. 补充工程化细节 (.gitignore)

由于我们自定义了用户数据目录（`.chrome-dev-profile`），你需要确保它不会被提交到 Git 仓库，以免造成代码库臃肿。

在 `.gitignore` 末尾添加：

```text
# Chrome Dev Profile
.chrome-dev-profile/

# WXT Output
.output/
.wxt/
```

### 🎉 运行与验证

一切就绪后，只需在终端运行：

```bash
pnpm run dev
```

**预期效果：**
1. WXT 将代码编译到 `.output/chrome-mv3` 并进入监听状态。
2. 自定义脚本自动唤起 Chrome 浏览器。
3. 浏览器打开后自动安装你的扩展，且环境是干净的（因为使用了 `.chrome-dev-profile`）。
4. 你现在可以在浏览器中打开 `http://localhost:9222/json`，你会看到当前 Chrome 暴露出的远程调试 Target 列表。你可以使用 VS Code 或者 Puppeteer 连接这个端口进行深度调试或自动化。