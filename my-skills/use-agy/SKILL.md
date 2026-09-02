---
name: use-agy
description: "通过 Antigravity CLI（agy）直接执行当前工作区任务，并在执行后用 agy 审查结果；适用于用户明确要求使用 AGY/Antigravity CLI 的场景。"
metadata:
  short-description: "直接调用 agy 执行并审查任务"
---

# use-agy

<!-- 本 Skill 固化一次执行加一次审查的直调流程，不负责代理编排。 -->

## 适用范围

用户明确要求使用 Antigravity CLI、AGY 或 `agy` 时使用本 Skill。默认在当前工作目录执行任务，并在执行后追加一次独立的 AGY 结果审查。

不要把本 Skill 用作普通 Codex 编码任务的默认代理，也不要把它扩展成 agents/subagents 的调度器。

## 不可变约束

- 直接调用 `agy`，不调用 `agy agent`、`agy agents`、`agy models`，不传 `--agent`。
- 不使用 `/agents`、`/boost`、`/teamwork-preview` 或其他多智能体编排能力。
- 每个请求最多执行一次 AGY 任务和一次 AGY 审查；不自动换模型、换提示词或重试。
- 不执行 `git add`、`git commit`、创建、切换或删除分支。
- 失败必须原样暴露进程退出码、stderr、JSON 解析错误或 AGY 返回状态；禁止伪造成功或静默降级。
- 生成或修改的文本使用 UTF-8，不添加作者、时间、版本等无关元数据。

## 固定工作流

### 1. 检查 CLI

只检查 `agy` 是否可用，不通过试探其他命令名来兜底。

PowerShell：

```powershell
Get-Command agy -ErrorAction Stop
```

macOS/Linux：

```bash
command -v agy
```

如果命令不存在，直接报告并给出官方安装命令：

```powershell
irm https://antigravity.google/cli/install.ps1 | iex
```

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

安装失败或 PATH 未更新时停止，不调用替代代理。

无交互模式需要已有缓存认证。若返回认证错误，报告原始错误，并让用户先单独运行一次 `agy` 完成认证；不要自动重试。

### 2. 一次性执行

默认使用无交互 JSON 输出和用户已确认的全量权限放行：

```bash
agy --print "<任务提示词>" --output-format json --dangerously-skip-permissions
```

`--dangerously-skip-permissions` 会自动批准工具调用、文件写入和命令执行，必须在实际命令中显式可见。用户要求收紧权限时，移除该参数或改用 `--sandbox`，不得自行扩大权限。

长提示词应作为一个完整的 shell 参数传入。PowerShell 使用 here-string 变量，POSIX shell 使用带引号的变量，避免跨平台转义破坏任务内容；不要把提示词拼接进临时脚本或临时文件。

提示词使用以下固定结构，替换尖括号内容：

```text
在当前工作目录完成以下任务。

目标：<用户目标>
验收标准：
- <可验证结果 1>
- <可验证结果 2>

约束：
- 只处理当前任务相关文件。
- 不创建、切换或删除 Git 分支。
- 不执行 git add 或 git commit。
- 不调用 agent、subagent 或多智能体编排。
- 遇到错误立即停止并返回原始错误及已完成步骤。

完成后报告：修改文件、关键变更、执行的检查/测试及其结果。
```

默认不指定 `--model` 或 `--effort`。只有用户明确给出值时才透传；未知模型或无效参数必须让 CLI 直接失败。

### 3. 读取执行结果

解析 JSON 输出中的 `status`、`response`、`conversation_id` 和 `error`：

- 进程非零退出、JSON 无法解析、缺少 `status` 或状态非成功，均视为失败。
- 不以 `response` 中的“完成”文字代替状态和文件证据。
- 保存 `conversation_id`，仅供用户明确要求继续时使用。

需要人读文本时可将输出格式改为 `text`。需要实时消费事件时使用：

```bash
agy --input-format stream-json --output-format stream-json
```

NDJSON 流按 `init`、`step_update`、`result` 处理；stream 模式的提示词必须通过 stdin 的 `user` 事件发送，不能同时传 `--print`。不向 stream 输入 slash command 或 control event。

### 4. 按需续接

只有用户明确要求继续同一会话时，使用以下二选一方式：

```bash
agy --print "<后续任务>" --conversation "<conversation_id>" --output-format json --dangerously-skip-permissions
```

```bash
agy --print "<后续任务>" --continue --output-format json --dangerously-skip-permissions
```

不要同时传 `--conversation` 与 `--continue`，不要为了恢复失败会话自动重复调用。

### 5. 用 AGY 审查执行结果

执行调用结束后，固定追加一次只读审查。审查命令仍显式使用已确认的默认权限参数，但提示词必须禁止修改：

```bash
agy --print "审查当前工作区上一阶段的执行结果。只读检查 git status --short、git diff、git diff --check、任务相关测试或构建结果。不要修改文件，不要执行 git add 或 git commit，不要创建或切换分支，不要调用 agent、subagent 或多智能体编排。若测试没有运行，明确标记为未验证。输出 verdict: PASS、FAIL 或 BLOCKED，并列出 evidence、findings、unverified。" --output-format json --dangerously-skip-permissions
```

审查结果必须同时满足以下条件才算通过：

- JSON 进程和 `status` 成功。
- `response` 明确给出 `PASS`。
- 有实际文件差异、命令输出或测试结果等证据。
- 没有未解决的 findings，也没有把未运行测试伪装成通过。

审查返回 `FAIL`、`BLOCKED`、非成功状态、解析失败或证据不足时，整体任务保持未完成并直接报告，不进入自动修复循环。

### 6. 当前 Codex 本地验收

AGY 审查后，当前 Codex 仍需独立执行：

```bash
git status --short
git diff --check
git diff
```

随后依据仓库已有配置运行相关测试、构建或静态检查，不凭空发明项目命令。AGY 审查与本地验收必须都通过；两者证据冲突时，以可复现的命令输出和实际差异为准，并报告冲突。

## 常见失败处理

| 现象 | 处理 |
| --- | --- |
| `agy` 不存在 | 给出官方安装命令并停止 |
| 需要认证 | 报告原始错误，要求用户先运行交互式 `agy`，不自动重试 |
| 未知模型或参数 | 原样报告 CLI 错误，不换模型 |
| 权限被拒绝 | 报告被拒绝的工具和允许方式，不静默跳过 |
| 进程非零或 JSON 解析失败 | 视为失败，保留 stdout/stderr 和退出码 |
| 审查非 PASS 或证据不足 | 整体未完成，不自动修复或重复调用 |

## 官方参考

- [Antigravity CLI 安装与认证](https://www.antigravity.google/docs/cli/install/)
- [Antigravity CLI Headless 模式](https://www.agy.dev/docs/cli/headless/)
- [Antigravity CLI 命令参考](https://www.agy.dev/docs/cli/reference/)
