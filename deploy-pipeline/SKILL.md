---
name: deploy-pipeline
description: 通用部署流水线抽离与落地技能。用于把现有项目的 Docker 一体化部署、docker-compose 编排、Jenkins 或其他 CI 镜像发布、Harbor 或私有仓库推送流程抽成可复用骨架；也用于给新项目补部署方案、迁移现有 Harbor 发布链、增加容器启动自检与验收检查。
---

# 部署流水线

## 概览

在需要“抽离部署方式”而不是只改某个单一脚本时使用本 skill。目标是基于项目现状整理出可复用的部署骨架，优先复用仓库里的 Dockerfile、Compose、启动脚本、环境变量命名和 CI 逻辑，而不是从零重写一套模板。

默认输出应覆盖以下内容：

- 部署结构
- 环境变量清单
- 构建步骤
- 发布步骤
- 验收命令
- 失败排查点

当用户直接给出 `deploy.sh` 片段、明确要求“按这个模板”，或者目标是远程服务器直接拉镜像替换容器时，必须优先输出同构的 `deploy.sh` 单机部署脚本，不要擅自改成 `docker-compose.yml`、`Jenkinsfile` 或其他风格。

## 工作流

### 第 1 步：先摸清项目边界

优先读取最小范围的真实材料：

- `Dockerfile`、`Dockerfile.*`
- `docker-compose.yml`、`docker-compose.*.yml`
- 启动脚本，例如 `start.sh`、`entrypoint.sh`
- CI 配置，例如 `Jenkinsfile`、`.github/workflows/*`
- 项目文档中的部署章节

识别以下关键事实：

- 项目是纯前端、纯后端，还是前后端一体化
- 是否依赖 Nginx、Caddy 或其他反向代理
- 是否有镜像仓库与发布链
- 环境变量是单文件覆盖还是分环境分层
- 是否已有启动自检、健康检查和日志约定
- 用户是否已经提供了既定的 `deploy.sh` 模板或命令顺序

如果仓库已经存在可复用脚本，优先抽象它们的输入输出契约，不要直接推翻重写。

### 第 2 步：按三类能力建模

把部署内容拆成 3 个能力层：

1. `Docker 一体化部署`
2. `Compose 编排与运行时映射`
3. `CI/仓库发布链`
4. `deploy.sh 单机拉镜像部署`

建议按下列方式归纳：

- 把构建阶段和运行阶段分开
- 把运行变量和发布变量分开
- 把项目特有默认值抽成占位变量
- 把验收命令和排查命令固定下来

若项目只覆盖其中一类能力，也保持同样的抽象方式，只输出存在的部分。

如果用户已经提供 `deploy.sh` 模板，则把它视为最高优先级约束：输出的脚本结构、变量命名和命令顺序都应尽量贴近用户模板。

### 第 3 步：统一最小契约

部署骨架里至少要统一这些契约。

环境变量分层：

- 基础运行变量：端口、主机、卷目录、运行模式
- 镜像仓库变量：`REGISTRY` 或 `HARBOR_SOURCE`、`PROJECT`、`IMAGE_NAME`、`TAG`
- CI 注入变量：构建版本、提交哈希、流水线环境变量

Compose 最小契约：

- `ports`
- `volumes`
- `env_file`
- `restart`
- `healthcheck` 或等价健康探针

启动脚本最小契约：

- 入口文件存在性检查
- 代理配置或模板渲染检查
- 主进程退出联动回收
- 失败时返回非零退出码

`deploy.sh` 单机部署最小契约：

- 必须使用 `#!/bin/sh`
- 必须使用 `set -eu`
- 必须先声明 `CONTAINER_NAME` 与 `IMAGE`
- 必须准备独立 `DOCKER_CONFIG`
- 必须先生成 `config.json` 再执行 `docker pull`
- 必须先 `docker rm -f` 再 `docker run -d`
- 必须在末尾输出 `docker ps -a | grep "$CONTAINER_NAME"` 或等价校验命令
- 当用户给出样例时，变量命名和命令顺序尽量保持一致

CI 发布最小流程：

- 检查包管理器或构建依赖
- 仅在必要时安装依赖
- 构建镜像
- 推送版本标签
- 视需要推送 `latest`
- 任一步失败立即退出

### 第 4 步：复用本 skill 的资源

按场景加载对应资源，不要一次性全读完。

- Compose 结构与变量组织：读取 `references/docker-compose-pattern.md`
- Jenkins/Harbor 发布模式：读取 `references/jenkins-harbor-pattern.md`
- 验收与排查清单：读取 `references/deploy-checklist.md`
- 单机容器替换部署：优先读取 `scripts/deploy-container.sh`

需要生成或补脚本时，优先参考：

- `scripts/check-runtime.sh`
- `scripts/build-and-push-image.sh`
- `scripts/deploy-container.sh`
- `scripts/render-env-example.sh`

这些脚本是通用骨架。若用户没有给定具体值，不要把项目专属目录名、固定仓库地址、固定端口和明文凭据写死进去；若用户已提供明确值并要求按模板成稿，可以按输入原样展开。

## 输出要求

最终交付的部署方案必须显式给出：

- 当前项目的部署类型判断
- 复用的现有文件或脚本
- 新增或调整的环境变量
- 需要保留的默认行为
- 验收命令
- 常见故障排查入口

如果你生成的是文档或迁移方案，必须把“哪些是通用骨架，哪些是项目特例”写清楚。

如果你生成的是代码或脚本，必须：

- 给关键步骤加简洁注释
- 保持变量名可替换
- 避免硬编码私有仓库地址、镜像名、目录名

如果输出的是 `deploy.sh`：

- 默认按 `scripts/deploy-container.sh` 的结构生成
- 优先保留 `CONTAINER_NAME`、`IMAGE`、`DOCKER_CONFIG`、`docker pull`、`docker rm -f`、`docker run -d`、`docker ps -a | grep`
- 用户已经给出脚本模板时，不要重排步骤，不要替换成 Compose 语义
- 认证串、数据库 DSN、Redis 密码等默认写成占位变量；只有用户明确给出具体值并要求成稿时，才原样写入

## 触发剧本补充

优先选择 `deploy.sh` 模式的场景：

- 用户发来现成的 `deploy.sh` 片段或说“按这个模板”
- 仓库没有 `docker-compose.yml`、`Jenkinsfile`，但目标是远程服务器直接拉镜像运行
- 部署要求包含私有仓库认证、容器替换重启、单命令上线

仍优先选择 Compose 或 CI 的场景：

- 仓库已有 `docker-compose.yml`，且用户目标是维护编排
- 仓库已有 `Jenkinsfile` 或工作流，且用户目标是维护发布链
- 用户明确要求生成 Compose、Jenkins 或 Harbor 构建脚本，而不是单机部署脚本

## 当前项目经验如何迁移

以下经验可以作为抽象来源，但不能原样硬编码到别的项目：

- 前端构建后由反向代理统一对外暴露
- 后端在同容器或同网络内提供 API
- 通过启动脚本在容器启动前做配置自检
- 通过 Jenkins 脚本做依赖探测、镜像构建、双标签推送
- 通过脚本统一规范仓库地址，兼容是否带协议头

当你在别的项目里看到类似形态时，优先迁移“模式”，不是迁移“字面常量”。
