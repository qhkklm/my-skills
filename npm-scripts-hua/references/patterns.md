# npm scripts 化参考模式

## 1. 常见输入材料

- `package.json`
- `README.md`
- `Dockerfile`
- `docker-compose.yml`
- `.github/workflows/*`
- `Jenkinsfile`
- `.env.example`
- 启动入口文件

先从这些文件推导真实运行链路，再决定如何抽成 npm scripts。

## 2. 推荐目录结构

```text
package.json
scripts/
  script-helpers.js
  install-deps.js
  start-app.js
  start-prod.js
  docker-build.js
  deploy.js
```

## 3. helper 层职责

建议统一沉淀这些能力：

- 读取项目根目录
- 解析 `.env`
- 合并子进程环境变量
- 运行 `python` / `docker`
- 检查 Docker 守护进程
- 生成友好的错误信息

## 4. 命名建议

优先使用：

- `install`
- `install:dev`
- `dev`
- `dev:prod`
- `docker:build`
- `docker:push`
- `deploy`
- `deploy:run`

如果项目已有成熟约定，再考虑：

- `install:deps`
- `start`
- `start:prod`

## 5. 跨平台注意点

- Windows 下避免依赖 Bash 专有语法。
- Python 输出中文和特殊符号时，优先注入：
  - `PYTHONIOENCODING=utf-8`
  - `PYTHONUTF8=1`
- 某些 Unix-only 服务器在 Windows 不可用时，允许本地回退到兼容实现，但必须保持文档透明。

## 6. 验证清单

- `npm run`
- `node --check scripts/*.js`
- `npm run install`
- `npm run dev`
- `npm run dev:prod`
- `npm run docker:build`
- `npm run deploy`

每项都要记录：

- 是否通过
- 失败原因
- 是否属于环境前置条件
