---
name: npm-scripts-hua
description: 将项目中的启动、依赖安装、构建、部署与校验流程抽离为清晰可维护的 npm scripts 与配套 JS 包装脚本。用于需要给非 Node 项目补 package.json 命令入口、统一 Jenkins 或本地调用口径、为跨平台环境封装 Python 或 Docker 命令、或排查 npm scripts 可用性问题的场景。
---

# npm scripts化

## Overview

把零散的运行命令整理成稳定的 `package.json` 与 `scripts/*.js` 入口，优先复用项目现有运行方式，而不是强行改造技术栈。

先确认真实启动链路、环境变量来源、平台差异与部署边界，再决定脚本命名、helper 抽象和验证方式。

## Workflow

1. 先探明项目事实
   - 读取 `package.json`、锁文件、`README`、部署文档、`Dockerfile`、CI 配置、环境变量示例。
   - 确认项目主语言、真实启动命令、生产启动命令、部署命令、是否已有脚本目录。
   - 如果仓库已有 `package.json`，先以现有命名和语义为准，不要无理由重命名。

2. 决定是否适合 npm scripts 化
   - 适合：需要统一本地开发、依赖安装、部署入口；已有 Python、Java、Go、Shell 等命令需要跨平台包装；Jenkins 或 CI 需要稳定调用入口。
   - 不适合：项目已由现成 task runner 完整覆盖，或用户明确要求保留原命令且不增加 Node 入口。

3. 设计脚本边界
   - `package.json` 只放短命令入口。
   - 复杂逻辑放到 `scripts/*.js`。
   - 统一抽一个 helper 负责项目根路径解析、子进程执行、`.env` 自动加载、平台差异处理，以及 Docker / Python 前置检查。

4. 保持技术口径一致
   - 不要把非 Node 项目误导成 Node 项目；`package.json` 只是调度层。
   - 生产启动命令要和现有容器或 CI 口径一致。
   - 若生产服务器在 Windows 不兼容某个工具，保留 Linux 生产口径，同时给本地 Windows 提供兼容回退。

5. 处理命名与语义
   - 优先短命名：`install`、`dev`、`dev:prod`、`docker:build`、`deploy`。
   - 若项目已有团队约定，也可使用 `install:deps`、`start`、`start:prod`。
   - 关键是语义稳定，文档、脚本、验证结果必须一致。

## Decision Rules

- 需要跨平台时：
  - 不要在 `package.json` 里硬写 Bash 风格复杂命令。
  - 用 JS helper 包装 `python`、`docker`、`java` 等命令。

- 需要 `.env` 时：
  - 显式环境变量优先。
  - `.env` 作为本地默认回退。
  - 启动命令缺关键变量时，给出明确报错。

- 需要生产服务器时：
  - 生产命令优先复用 `Dockerfile`、Compose、CI。
  - 本地自测若平台不兼容，可做条件分支，但要在文档里写清楚。

- 需要 Docker 时：
  - 在真正构建或运行前，先检查 Docker CLI 与守护进程。
  - 守护进程未启动时，返回可读性强的报错，不要只抛底层堆栈。

## Validation

至少验证以下项目：

- `npm run` 能列出目标脚本。
- `package.json` 能被正常解析。
- `scripts/*.js` 通过 `node --check`。
- 安装类命令至少完成一次真实执行或 `--dry-run` 验证。
- 启动类命令至少验证到“进入运行态”或“因明确前置条件退出”。
- Docker / 部署类命令至少验证前置检查与失败提示。

验证结果要按三类输出：

- 可直接使用
- 需要前置条件
- 当前不可用及原因

## Resources

- 脚本命名、helper 抽象与验证清单：查看 `references/patterns.md`
