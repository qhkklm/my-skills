# Window API 契约

## 目标

预加载层暴露的是“白名单能力”，不是 Electron 原始对象。不要再使用 `env.d.ts` 一类类型声明文件去描述桥接能力，改用 JSDoc 契约和实际 API 封装文件。

## 推荐组织

```text
shared/
  src/
    contracts/
      preload-api.js
preload/
  src/
    index.js
```

## 约束

- `preload-api.js` 负责定义可暴露能力的形状、参数和返回值语义。
- `preload/index.js` 只负责把这些能力通过 `contextBridge` 注入到 `window` 上。
- `renderer` 通过轻量适配器访问 `window.appBridge`，而不是在页面里直接散用 `window`。

## 推荐暴露方式

- 使用 `window.appBridge` 这类中性命名。
- 项目已经有品牌桥接名时，可以沿用现有命名，但仍要保持 JSDoc 契约单点收敛。
- 每个能力都应是具体动作，例如 `task.list()`、`task.save()`，不要暴露底层 `invoke(channel, payload)`。

## 不要做的事

- 不要把 `ipcRenderer` 原样挂到 `window`。
- 不要把文件路径、数据库连接、原生句柄暴露给渲染层。
- 不要让 `renderer` 自己拼接 channel 字符串。
