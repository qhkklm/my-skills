---
name: url-to-rsshub-route
description: 当用户希望只提供一个 URL，就自动分析站点结构、选择 API/HTML/Puppeteer 提取策略，并生成适合 RSSHub 的 namespace 与 route 草稿时使用。适用于新建 RSSHub 路由、快速验证某个链接能否接入 RSSHub、为列表页或文章页生成抓取实现框架。
---

# URL To RSSHub Route

## 概览

这个 skill 用来把“一个 URL”转成“可继续完善的 RSSHub route 草稿”。

目标不是一次性产出可直接合并的最终代码，而是稳定完成下面几件事：

- 识别 URL 所属站点与候选 namespace
- 判断更适合走 API、静态 HTML，还是 Puppeteer
- 提取 feed 级与 item 级结构化线索
- 生成符合 RSSHub 约束的 `namespace.ts` 与 route 草稿
- 输出风险说明与待人工确认项

## 何时使用

在下列场景触发这个 skill：

- 用户说“把这个 URL 接成 RSSHub”
- 用户说“为这个链接生成 RSSHub route”
- 用户只给出一个网页 URL，希望自动提取内容并集成到当前 RSSHub 项目

如果用户已经明确指定现有 namespace、现有 route 文件，且只是在改 bug 或补字段，不用这个 skill，直接按项目代码修改流程处理。

## 工作流

### 1. 收集最少输入

默认只需要一个 URL。

如果用户已经处在 RSSHub 仓库中，默认以当前仓库为目标项目，不额外追问分类、维护者、参数说明等信息。

### 2. 先跑 URL 分析脚本

运行：

```powershell
node scripts/extract-url.js --url "<目标 URL>"
```

必要时保存结果：

```powershell
node scripts/extract-url.js --url "<目标 URL>" --output ".\\analysis.json"
```

脚本会输出：

- 归一化 URL
- 站点与 namespace 候选
- 页面类型
- API 线索
- feed 与 item 提取线索
- 是否建议 Puppeteer
- 风险列表

### 3. 再生成 RSSHub 草稿

将分析结果传给生成脚本：

```powershell
node scripts/generate-route.js --input ".\\analysis.json"
```

如果不落文件，也可以走管道：

```powershell
node scripts/extract-url.js --url "<目标 URL>" | node scripts/generate-route.js
```

生成结果应包含：

- `namespace.ts` 草稿
- route 文件草稿
- 生成理由
- 风险与待确认项

### 4. 按 RSSHub 约束复核

复核前先读取：

- `references/rsshub-route-checklist.md`

重点检查：

- `example` 必须是 RSSHub 路径
- `namespace.ts` 的 `url` 不带协议
- 只给一个 `categories`
- 列表进详情默认给出 `cache.tryGet`
- `description` 只保留正文
- 日期优先走 `parseDate`
- `requirePuppeteer` 只在确认必须时开启

### 5. 输出给用户

输出时优先给：

- 推荐策略
- 生成的 route 草稿
- 风险
- 待人工确认项

不要把内部长篇推理原样暴露给用户。

## 失败与回退规则

如果分析脚本拿不到稳定 HTML 或正文：

- 先检查是否被登录、验证码、Cloudflare、重定向拦截
- 再根据结果标记 `requiresPuppeteer`
- 仍然无法确定时，只输出 route 框架、风险和人工补齐建议，不要臆造字段映射

如果页面本身是详情页：

- 优先识别其父级列表段名，生成固定 route 草稿
- 无法识别稳定列表来源时，明确标记“仅详情页可见，列表接口待补”

如果 URL 本身就是 JSON/API：

- 直接按 API route 思路生成草稿
- 不要再优先推荐 HTML 抓取

## 资源说明

### `scripts/extract-url.js`

负责 URL 归一化、页面探测、API 线索发现、风险分析，并输出结构化 JSON。

### `scripts/generate-route.js`

负责把结构化 JSON 映射成 RSSHub route 草稿与实施建议。

### `references/rsshub-route-checklist.md`

只在需要复核 RSSHub 规范时读取，避免把长约束放进主说明。
