---
name: chrome-extension-launcher
description: 为 Chrome 扩展与 WXT 项目提供本地调试浏览器启动脚本、延迟启动脚本与统一接入约定。用于新增或规范开发期扩展加载脚本、统一 Chrome 9222 调试启动流程、复用已验证的扩展启动实现，而不是在每个项目里重复手写一套启动逻辑。
---

# Chrome Extension Launcher

## Overview

复用这个 skill，为已经完成构建的 Chrome 扩展项目补齐本地浏览器启动能力。优先直接复用 `scripts/launch-chrome.mjs` 与 `scripts/launch-delay.mjs`，只在项目目录结构不同的时候做最小改动。

## Workflow

1. 先确认项目已经产出 `.output/<target>` 目录，再决定是否需要启动浏览器。
2. 若项目的首轮构建存在落盘延迟，优先使用 `scripts/launch-delay.mjs`。
3. 若项目只缺少启动脚本，直接复用 skill 内脚本，不重复现场手写实现。
4. 若项目已经存在启动脚本，优先对齐现有参数名、目录约定与 `package.json` 调用方式。

## Constraints

- 只生成 JavaScript，不使用 TypeScript。
- 只负责启动已构建好的扩展调试实例，不负责构建、监听或打包流程。
- 默认扩展产物目录为 `<project-root>/.output/<target>`。
- 默认浏览器用户目录为 `<project-root>/.chrome-dev-profile`。
- 默认远程调试端口为 `9222`。

## Resources

- 需要查看参数、环境变量与接入示例时，读取 `references/usage.md`。
- 需要直接复用实现时，使用 `scripts/launch-chrome.mjs` 与 `scripts/launch-delay.mjs`。
- 需要为现有项目补齐 `package.json` 命令时，优先围绕这两个脚本做薄封装。

## Delivery Notes

- 先保留调用方项目已有脚本，再评估是否替换为 skill 版本。
- 若项目结构不是 `.output/<target>`，只调整参数或路径推导，不扩散改动范围。
- 若用户已通过 `CHROME_PATH` 指定浏览器路径，始终优先使用该值。
