#!/bin/sh
set -eu

# 统一把仓库地址处理成 Docker 可识别的格式。
normalize_registry() {
  printf "%s" "$1" | sed -e 's#^https\?://##' -e 's#/*$##'
}

# 保持变量契约清晰，便于不同项目直接覆盖。
: "${REGISTRY:=}"
: "${PROJECT:=}"
: "${IMAGE_NAME:=}"
: "${TAG:=latest}"
: "${DOCKERFILE_PATH:=Dockerfile}"
: "${BUILD_CONTEXT:=.}"
: "${PUSH_LATEST:=1}"

if [ -z "${REGISTRY}" ] || [ -z "${PROJECT}" ] || [ -z "${IMAGE_NAME}" ]; then
  echo "REGISTRY、PROJECT、IMAGE_NAME 不能为空" >&2
  exit 1
fi

normalized_registry="$(normalize_registry "${REGISTRY}")"
target_image="${normalized_registry}/${PROJECT}/${IMAGE_NAME}:${TAG}"
latest_image="${normalized_registry}/${PROJECT}/${IMAGE_NAME}:latest"

# 构建命令单独打印，方便在 CI 日志中快速定位问题。
echo "开始构建镜像: ${target_image}"
docker build -f "${DOCKERFILE_PATH}" -t "${target_image}" "${BUILD_CONTEXT}"

echo "开始推送镜像: ${target_image}"
docker push "${target_image}"

if [ "${PUSH_LATEST}" = "1" ] && [ "${TAG}" != "latest" ]; then
  echo "补推 latest 标签: ${latest_image}"
  docker tag "${target_image}" "${latest_image}"
  docker push "${latest_image}"
fi

echo "镜像发布完成: ${target_image}"
