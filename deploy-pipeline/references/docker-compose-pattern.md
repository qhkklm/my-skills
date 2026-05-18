# Docker Compose 通用模式

## 适用场景

当项目已经使用 Docker 部署，或者计划引入 `docker compose` 统一本地、测试或生产环境编排时，读取本参考。

## 最小结构

推荐至少包含以下元素：

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    env_file:
      - .env
    environment:
      - APP_PORT=${APP_PORT}
    ports:
      - "${HOST_PORT}:80"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

## 设计原则

- `build` 与 `image` 的选择要与发布链一致
- `env_file` 放默认变量，`environment` 放需要显式覆盖的关键变量
- `ports` 只暴露对外必需的端口
- `volumes` 明确区分持久化数据与临时缓存
- `restart` 默认使用 `unless-stopped` 或与平台策略保持一致
- 如果服务依赖代理或后端健康状态，补 `healthcheck` 或外部探针

## 常见抽象位

把以下内容提炼为变量，而不是写死：

- 宿主机端口
- 容器端口
- 数据目录挂载位置
- 环境文件路径
- 服务名

## 与一体化镜像配合时的建议

如果镜像里已经集成前端静态资源、代理层和后端：

- 对外统一暴露代理端口
- 容器内部端口与宿主机端口分开描述
- 通过 volume 只挂载用户数据和输出目录
- 不要把构建阶段的缓存目录误当成持久化目录

## 排查重点

- `docker compose config` 是否渲染正确
- `ports` 是否与宿主机已有服务冲突
- `env_file` 是否被正确加载
- volume 目标路径是否与容器内真实目录一致
