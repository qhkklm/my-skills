# Vue 差分指南

## 只说明差分

这个文件只覆盖 Vue 与 React 的差异，未提及的部分沿用 React 指南。

## 目录差分

- 页面入口仍然使用 `pages/<kebab-case>/index.vue`。
- 公共 UI 组件仍放根级 `components/`，命名仍然使用 `pro-*`。
- 业务域仍按 `api / store / components / pages` 组织。

## 组件写法

- 推荐使用 `<script setup>`，但必须保持纯 JavaScript，禁止 `lang=\"ts\"`。
- 业务逻辑型组合函数放 `common/hooks/` 或模块内 `hooks/`，不要把 Vue 特有状态散落到页面模板中。

## 状态与路由

- 局部状态优先留在模块内部。
- 全局路由守卫与根级 Provider 类逻辑，仍放 `core/`。

## 迁移提醒

- 如果团队同时维护 React 与 Vue 项目，不要试图做一份完全相同的文件模板。
- 应共享的是目录边界和职责规则，不是组件语法本身。
