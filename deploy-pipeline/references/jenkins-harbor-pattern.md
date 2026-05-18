# Jenkins 与 Harbor 发布模式

## 适用场景

当项目需要在 Jenkins 或兼容的 CI 平台中构建 Docker 镜像并推送到 Harbor 或私有仓库时，读取本参考。

## 推荐流程

1. 校验构建节点的运行时依赖，例如 `node`、`npm`、`pnpm`、`docker`
2. 仅在依赖缺失或声明文件变更时安装依赖
3. 生成构建版本号，优先使用外部注入变量
4. 规范化仓库地址，避免带 `http://` 或 `https://`
5. 构建镜像
6. 推送版本标签
7. 按需要推送 `latest`
8. 任一步失败立即退出，让 CI 标红

## 推荐变量契约

至少支持这些输入变量：

- `HARBOR_SOURCE` 或 `REGISTRY`
- `HARBOR_PROJECT` 或 `PROJECT`
- `HARBOR_IMAGE_NAME` 或 `IMAGE_NAME`
- `BUILD_TAG_VERSION` 或 `TAG`

可以按项目情况增加：

- `PNPM_VERSION`
- `DOCKER_BUILDKIT`
- `PUSH_LATEST`

## 实现细节建议

- 使用单独脚本封装构建与推送，避免 Jenkins 页面里堆积大量 shell
- 对包管理器做真可用性检查，不只检查命令是否存在
- 标签生成逻辑优先复用外部版本号，其次退回到 `git短哈希-时间戳`
- 仓库登录由平台前置步骤负责，发布脚本只做构建与推送

## 排查重点

- Jenkins 节点是否已登录目标仓库
- 构建节点是否启用了 BuildKit
- 包管理器是否命中错误 shim
- 标签是否被外部环境变量覆盖
- 仓库地址是否被错误地携带协议头
