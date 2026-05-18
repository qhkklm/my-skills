#!/bin/sh
set -eu

# 校验必需命令是否可用，避免脚本执行到中途才失败。
require_command() {
  command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "缺少必需命令: $command_name" >&2
    exit 1
  fi
}

# 通过环境变量传入待检查文件，便于复用于不同项目。
require_file() {
  file_path="$1"
  if [ ! -f "$file_path" ]; then
    echo "缺少必需文件: $file_path" >&2
    exit 1
  fi
}

# 代理配置检查支持关闭，便于没有代理层的项目复用。
validate_nginx_config() {
  if [ "${CHECK_NGINX_CONFIG:-0}" = "1" ]; then
    require_command nginx
    nginx -t
  fi
}

main() {
  require_command sh

  if [ -n "${REQUIRED_FILE:-}" ]; then
    require_file "${REQUIRED_FILE}"
  fi

  validate_nginx_config
  echo "运行时检查通过"
}

main "$@"
