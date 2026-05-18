#!/bin/sh
set -eu

# 用统一格式生成示例环境变量，方便迁移到新项目时先补契约。
cat <<'EOF'
# 基础运行变量
APP_PORT=8080
APP_HOST=0.0.0.0
RUN_MODE=production

# 数据目录变量
DATA_DIR=./data
LOG_DIR=./logs

# 镜像仓库变量
REGISTRY=registry.example.com
PROJECT=demo
IMAGE_NAME=app
TAG=latest

# CI 注入变量
BUILD_TAG_VERSION=
PUSH_LATEST=1
EOF
