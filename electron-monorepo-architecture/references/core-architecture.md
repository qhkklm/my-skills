# Electron 物理架构

## 目标

Electron 的核心不是“文件分层”，而是“环境分层”。推荐优先把代码拆成 `main`、`preload`、`renderer`、`shared` 四个物理区域，再谈业务目录。

## 职责边界

### main

- 负责应用生命周期、窗口创建、托盘、系统通知、自动更新、文件系统、数据库、子进程、网络底层能力。
- 负责注册 IPC 处理器，但不承载复杂业务编排页面状态。
- 可以依赖 `shared`，不能依赖 `renderer`。

### preload

- 负责 `contextBridge` 白名单桥接。
- 只暴露最小能力，不透传 Electron 原生对象，不暴露 `ipcRenderer` 原始句柄。
- 可以依赖 `shared`，不能依赖 `renderer`，也不应依赖 `main` 的实现细节。

### renderer

- 负责路由、状态、交互、组件和业务页面。
- 通过 `window` 白名单 API 或封装后的 IPC 调用主进程能力。
- 可以依赖 `shared`，禁止直接调用 Node.js / Electron 主进程 API。

### shared

- 只放环境无关内容：IPC channel 常量、JSDoc 契约、纯函数、轻量 schema。
- 不读文件、不连数据库、不操作 DOM、不引用 Electron。
- 作为主进程、预加载、渲染层之间的“契约层”。

## 依赖矩阵

| 来源 | 允许依赖 | 禁止依赖 |
| --- | --- | --- |
| `main` | `shared` | `renderer` |
| `preload` | `shared` | `main` 业务实现、`renderer` |
| `renderer` | `shared` | `main`、Node.js 原生模块、Electron 主进程模块 |
| `shared` | 无环境依赖 | `main`、`preload`、`renderer`、Electron |

## 推荐目录树

```text
packages/
  shared/
    src/
      constants/
      contracts/
      utils/
  main/
    src/
      core/
      ipc/
      services/
  preload/
    src/
  renderer/
    src/
      core/
      common/
      components/
      modules/
```

## 关键判断

- 中大型 Electron 项目优先单仓多包，因为它能用物理目录强制隔离环境。
- 单包项目如果已经按 `src/electron` 与 `src/renderer` 分开，先把共享契约、IPC 白名单和渲染层模块边界收紧，再决定是否升级到 workspace。
- 不要把 Monorepo 当成唯一正确答案。团队规模小、生命周期短、系统边界稳定时，单包拆层也可以接受。
