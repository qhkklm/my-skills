# 参数与接入说明

## 支持的参数

`scripts/launch-chrome.mjs`

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `target` | 扩展产物目录名。支持位置参数或 `--target=` 形式。 | `chrome-mv3` |
| `--project-root=` | 调用方项目根目录。 | 当前工作目录 |
| `--user-data-dir=` | Chrome 独立用户目录。 | `<project-root>/.chrome-dev-profile` |
| `--remote-debugging-port=` | Chrome 远程调试端口。 | `9222` |

`scripts/launch-delay.mjs`

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `target` | 透传给主启动脚本的扩展产物目录名。支持位置参数或 `--target=`。 | `chrome-mv3` |
| `--delay-ms=` | 延迟毫秒数。 | `1500` |
| `--project-root=` | 透传给主启动脚本。 | 当前工作目录 |
| `--user-data-dir=` | 透传给主启动脚本。 | `<project-root>/.chrome-dev-profile` |
| `--remote-debugging-port=` | 透传给主启动脚本。 | `9222` |

## 环境变量说明

| 环境变量 | 说明 |
| --- | --- |
| `CHROME_PATH` | 显式指定 Chrome 可执行文件路径，优先级最高。 |
| `TARGET` | 未传 CLI 参数时的默认扩展产物目录名。 |
| `PROJECT_ROOT` | 未传 `--project-root` 时的项目根目录。 |
| `USER_DATA_DIR` | 未传 `--user-data-dir` 时的用户目录。 |
| `REMOTE_DEBUGGING_PORT` | 未传 `--remote-debugging-port` 时的调试端口。 |
| `DELAY_MS` | 未传 `--delay-ms` 时的延迟毫秒数。 |

## 默认目录规则

- 扩展目录：`<project-root>/.output/<target>`
- 用户目录：`<project-root>/.chrome-dev-profile`
- 规则优先级：CLI 参数 > 环境变量 > 默认值

## 典型调用示例

```bash
node ./scripts/launch-chrome.mjs chrome-mv3
node ./scripts/launch-chrome.mjs --target=chrome-mv3-dev --project-root=D:/project/demo
node ./scripts/launch-delay.mjs chrome-mv3-dev --delay-ms=1800
CHROME_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" node ./scripts/launch-chrome.mjs
```

## WXT 项目接入建议

推荐把 WXT 的构建与 Chrome 拉起解耦：

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run launch:delay:dev\"",
    "dev:server": "wxt --browser chrome",
    "launch:dev": "node ./scripts/launch-chrome.mjs chrome-mv3-dev",
    "launch:delay:dev": "node ./scripts/launch-delay.mjs chrome-mv3-dev"
  }
}
```

如果项目已经有自定义输出目录或 profile 目录，只调整参数，不重写主逻辑。

## 何时使用延迟版

- 首轮构建需要时间，扩展目录可能尚未落盘时，使用 `launch-delay.mjs`。
- 扩展目录已稳定存在，只需立刻启动浏览器时，直接使用 `launch-chrome.mjs`。
