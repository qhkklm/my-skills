import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

// 统一解析命令行参数，保证优先级始终是 CLI > 环境变量 > 默认值。
function parseCliArgs(argv) {
  const options = {};
  const positionals = [];

  for (const item of argv) {
    if (!item.startsWith('--')) {
      positionals.push(item);
      continue;
    }

    const [rawKey, ...restParts] = item.slice(2).split('=');
    const key = rawKey.trim();
    const value = restParts.length > 0 ? restParts.join('=') : 'true';
    options[key] = value;
  }

  return { options, positionals };
}

function readStringValue(cliValue, envValue, defaultValue) {
  if (cliValue !== undefined && cliValue !== '') {
    return cliValue;
  }

  if (envValue !== undefined && envValue !== '') {
    return envValue;
  }

  return defaultValue;
}

function readPortValue(cliValue, envValue, defaultValue) {
  const rawValue = readStringValue(cliValue, envValue, String(defaultValue));
  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`无效的远程调试端口：${rawValue}`);
  }

  return parsedValue;
}

function ensureDirectory(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

// 按平台准备一组常见安装路径；若调用方已经传入 CHROME_PATH，则始终优先使用它。
function getChromePath() {
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH;
  }

  const candidatesByPlatform = {
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ],
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    ]
  };

  const candidates = candidatesByPlatform[process.platform] || [];
  const matched = candidates.find((item) => fs.existsSync(item));

  if (!matched) {
    throw new Error('未找到 Chrome，请通过 CHROME_PATH 指定浏览器路径。');
  }

  return matched;
}

// 把所有路径推导集中到一个工厂函数里，避免入口函数承载过多细节。
function createLaunchConfig() {
  const { options, positionals } = parseCliArgs(process.argv.slice(2));
  const target = readStringValue(
    options.target ?? positionals[0],
    process.env.TARGET,
    'chrome-mv3'
  );
  const projectRoot = path.resolve(
    readStringValue(options['project-root'], process.env.PROJECT_ROOT, process.cwd())
  );
  const userDataDir = path.resolve(
    readStringValue(
      options['user-data-dir'],
      process.env.USER_DATA_DIR,
      path.join(projectRoot, '.chrome-dev-profile')
    )
  );
  const remoteDebuggingPort = readPortValue(
    options['remote-debugging-port'],
    process.env.REMOTE_DEBUGGING_PORT,
    9222
  );
  const extensionPath = path.resolve(projectRoot, '.output', target);

  return {
    target,
    projectRoot,
    userDataDir,
    remoteDebuggingPort,
    extensionPath
  };
}

function validateLaunchConfig(config) {
  ensureDirectory(config.userDataDir);

  if (!fs.existsSync(config.extensionPath)) {
    throw new Error(`扩展构建产物不存在：${config.extensionPath}`);
  }
}

function launchChrome() {
  const config = createLaunchConfig();
  validateLaunchConfig(config);

  const chromeArgs = [
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-restore-session-state',
    `--remote-debugging-port=${config.remoteDebuggingPort}`,
    `--load-extension=${config.extensionPath}`,
    `--user-data-dir=${config.userDataDir}`
  ];

  const chromeProcess = spawn(getChromePath(), chromeArgs, {
    detached: true,
    stdio: 'ignore'
  });

  chromeProcess.unref();
  console.log(`Chrome 已启动，当前加载目录：${config.target}，远程调试端口为 ${config.remoteDebuggingPort}。`);
}

try {
  launchChrome();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
