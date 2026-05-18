# 部署验收清单

## 目标

在输出部署方案、部署脚本或 CI 发布链之后，使用这份清单做最小验收。清单重点不是替代测试，而是保证部署骨架具备可运行、可发布、可排查的基本质量。

## 结构检查

- 已明确项目部署形态：纯前端、纯后端、前后端一体化
- 已明确入口文件、运行命令、容器端口和外部映射端口
- 已明确环境变量来源：`.env`、CI 注入、Compose `environment` 或启动脚本
- 已明确镜像构建入口：`Dockerfile`、`docker build`、`docker compose build`
- 已明确镜像推送入口：脚本、Jenkins 步骤或其他 CI job

## 容器运行检查

- 入口文件存在性检查已覆盖
- 反向代理配置校验已覆盖，例如 `nginx -t`
- 主进程退出时，其余子进程会被回收
- 失败时脚本会返回非零退出码
- 健康检查地址或探针命令已定义

常用验收命令示例：

```bash
docker compose config
docker compose up --build -d
docker compose ps
docker logs <service-name> --tail=200
curl -f http://127.0.0.1:<port>/health
```

## 镜像发布检查

- 仓库地址支持不带协议头的镜像引用格式
- 镜像名、项目名、标签都可通过变量覆盖
- 发布脚本会在依赖不可用时快速失败
- 构建成功后至少推送一个版本标签
- 如果业务要求 `latest`，需要与版本标签一起推送

常用验收命令示例：

```bash
docker image inspect <registry>/<project>/<image>:<tag>
docker push <registry>/<project>/<image>:<tag>
```

## 失败排查入口

- 查看 Compose 渲染结果：`docker compose config`
- 查看容器启动日志：`docker logs <container>`
- 查看代理配置：`nginx -T`
- 查看环境变量是否生效：`env | sort`
- 查看 CI 注入变量与构建号

## 通用交付要求

最终交付中必须显式出现：

- 可替换变量位
- 验收命令
- 失败排查入口
- 当前项目特例说明
