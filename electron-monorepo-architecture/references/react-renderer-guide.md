# React 渲染层指南

## 目标

React 渲染层采用“公共壳层 + 业务域模块”的组织方式。公共区只放跨业务复用能力，业务域目录内部自洽闭环。

## 推荐目录

```text
packages/renderer/src/
  core/
    router.js
  common/
    hooks/
    styles/
  components/
    pro-shell-layout.jsx
    pro-pagination.jsx
  modules/
    workspace/
      api/
      store/
      components/
      pages/
        task-center/
          index.jsx
```

## 目录原则

- `core/`：放路由、Provider、全局守卫、根级中间层。
- `common/`：放 hooks、样式、工具性配置，不放业务状态。
- `components/`：放公共 UI 组件，必须使用 `pro-*` 命名。
- `modules/<domain>/`：放业务域代码，内部优先按 `api / store / components / pages` 分层。

## 页面规则

- 页面必须目录化：`pages/<kebab-case>/index.jsx`。
- 页面专属弹窗、表格、局部表单放同级 `components/`。
- 页面内部复杂逻辑优先在模块内部闭环，不要把局部业务状态上提到全局壳层。

## 业务域建议

- `api/`：封装网络请求或 IPC 调用，不直接写到页面里。
- `store/`：只放当前业务域状态。
- `components/`：只放当前业务域可复用组件。
- `pages/`：只放页面入口和页面级编排。

## React + Semi + UnoCSS 约束

- UI 组件优先复用 Semi 组件，再做轻量封装。
- 全局布局和间距遵守后台紧凑规范，不要引入营销页式大片留白。
- UnoCSS 负责原子化布局和状态样式，组件结构仍由 React 组件边界承载。
