import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

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

function readDelayValue(cliValue, envValue, defaultValue) {
  const rawValue = readStringValue(cliValue, envValue, String(defaultValue));
  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new Error(`无效的延迟时间：${rawValue}`);
  }

  return parsedValue;
}

function buildForwardArgs() {
  const { options, positionals } = parseCliArgs(process.argv.slice(2));
  const target = readStringValue(
    options.target ?? positionals[0],
    process.env.TARGET,
    'chrome-mv3'
  );
  const forwardArgs = [target];

  // 延迟脚本只负责等待和转发，其余启动细节完全交给主脚本处理。
  if (options['project-root']) {
    forwardArgs.push(`--project-root=${options['project-root']}`);
  }

  if (options['user-data-dir']) {
    forwardArgs.push(`--user-data-dir=${options['user-data-dir']}`);
  }

  if (options['remote-debugging-port']) {
    forwardArgs.push(`--remote-debugging-port=${options['remote-debugging-port']}`);
  }

  return {
    delayMs: readDelayValue(options['delay-ms'], process.env.DELAY_MS, 1500),
    forwardArgs
  };
}

async function main() {
  const { delayMs, forwardArgs } = buildForwardArgs();
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const launchScriptPath = path.resolve(currentDir, 'launch-chrome.mjs');

  await delay(delayMs);

  const child = spawn(process.execPath, [launchScriptPath, ...forwardArgs], {
    stdio: 'inherit'
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  child.on('error', (error) => {
    console.error(error);
    process.exit(1);
  });
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
