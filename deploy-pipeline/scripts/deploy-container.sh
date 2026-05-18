#!/bin/sh
set -eu

# 保持与常见单机部署脚本一致，便于直接替换变量后落地。
CONTAINER_NAME="${CONTAINER_NAME:-demo-app}"
IMAGE="${IMAGE:-932101613.xyz:1080/http/demo-app:latest}"

# 使用独立 Docker 配置目录，避免污染宿主机默认登录态。
DOCKER_CONFIG="${DOCKER_CONFIG:-/tmp/${CONTAINER_NAME}-docker-config}"
REGISTRY_HOST="${REGISTRY_HOST:-932101613.xyz:1080}"
REGISTRY_USERNAME="${REGISTRY_USERNAME:-admin}"
REGISTRY_PASSWORD="${REGISTRY_PASSWORD:-1234456}"

# 必须导出给 docker 子进程，否则仍会读取宿主机默认登录态。
export DOCKER_CONFIG

# 端口和环境变量保持显式展开，方便按项目复制后直接改值。
HOST_PORT="${HOST_PORT:-8080}"
CONTAINER_PORT="${CONTAINER_PORT:-8000}"

mkdir -p "$DOCKER_CONFIG"

cat > "$DOCKER_CONFIG/config.json" <<EOF
{
  "auths": {
    "${REGISTRY_HOST}": {
      "auth": "$(printf '%s' "${REGISTRY_USERNAME}:${REGISTRY_PASSWORD}" | base64 | tr -d '\n')"
    }
  }
}
EOF

docker pull "$IMAGE"
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  -e APP_ENV="${APP_ENV:-production}" \
  -e APP_CONFIG="${APP_CONFIG:-replace-with-config}" \
  "$IMAGE"

docker ps -a | grep "$CONTAINER_NAME"
