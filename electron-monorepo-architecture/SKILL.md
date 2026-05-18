---
name: electron-monorepo-architecture
description: 为 Electron 中大型项目设计或审查单仓多包目录、main/preload/renderer/shared 物理边界、共享契约与渐进迁移步骤。用于新建 Electron 项目需要确定 pnpm workspaces 范式、现有 src/electron + src/renderer 单包项目需要评估是否升级为 workspace、或需要为 React/Semi/UnoCSS 渲染层规划业务模块目录时。
---

# Electron 单仓多包架构

## 核心定位

用这个 skill 输出 Electron 架构决策，而不是直接改造仓库。

- 模式一：为新项目输出单仓多包目录树、包职责和最小模板。
- 模式二：为存量单包项目输出渐进迁移步骤、停靠点和风险提示。

## 先做判断

1. 先识别项目形态：已有 `pnpm-workspace.yaml` 说明已是单仓多包；只有 `src/electron + src/renderer` 说明仍是单包拆层。
2. 再识别渲染层框架：默认按 React 叙述；如果用户明确要求 Vue，再读取 [references/vue-delta-guide.md](references/vue-delta-guide.md)。
3. 再识别约束强度：如果目标仓库有自己的命名、分页、弹窗等硬约束，把这些约束作为项目级补充规则单独挂接，不要污染通用目录范式。

## 固定输出

每次都按下面 3 类输出组织答案：

1. `推荐目录树`：给出适合当前规模的目录树。
2. `边界说明`：说明 main、preload、renderer、shared 的职责、允许依赖和禁止依赖。
3. `迁移步骤/风险点`：如果是存量项目，给出分阶段迁移步骤、每阶段回滚点和风险。

## 工作流

### 新项目模板

1. 读取 [references/core-architecture.md](references/core-architecture.md)。
2. 如果是 React + Semi + UnoCSS，继续读取 [references/react-renderer-guide.md](references/react-renderer-guide.md)。
3. 如果用户要求说明 `window` 白名单暴露方式，读取 [references/window-api.md](references/window-api.md)。
4. 需要最小目录骨架时，直接复用 `assets/templates/monorepo-js/`。

### 存量迁移顾问

1. 先判断项目是否已经通过目录把主进程与渲染层拆开。
2. 读取 [references/single-package-migration.md](references/single-package-migration.md)。
3. 如果目标仓库带有项目专属 UI 或命名规范，再额外整理一份项目级补充规则。
4. 默认只输出迁移方案，不直接执行真实目录搬迁，除非用户明确要求实施。

## 关键约束

- 术语固定使用“单仓多包”，不要写“单体多仓库”。
- 全部示例使用纯 JavaScript / JSDoc，禁止 `.ts`、`.tsx`、`.d.ts`、`enum`、接口声明。
- `shared` 只放环境无关内容，优先使用 `contracts/`、`constants/`、`utils/`。
- `renderer` 的公共 UI 组件放根级 `components/`，名称统一 `pro-*`；通用 hooks 和 styles 放 `common/`。
- 页面入口统一采用目录化入口：`pages/<kebab-case>/index.jsx` 或 `index.vue`。

## 资源导航

- [references/core-architecture.md](references/core-architecture.md)：物理边界与依赖矩阵。
- [references/react-renderer-guide.md](references/react-renderer-guide.md)：React 渲染层目录与模块拆分。
- [references/vue-delta-guide.md](references/vue-delta-guide.md)：Vue 差分说明。
- [references/window-api.md](references/window-api.md)：preload 白名单 API 与 `window` 契约。
- [references/single-package-migration.md](references/single-package-migration.md)：单包到单仓多包的渐进迁移。
- `scripts/print-scaffold-tree.js`：输出推荐目录树。
- `scripts/validate-structure.js`：校验目录命名、JS-only 和越权引用。
- `assets/templates/monorepo-js/`：最小 JS 模板骨架。
