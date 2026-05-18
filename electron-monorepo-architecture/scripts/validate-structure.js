#!/usr/bin/env node

/**
 * 校验 Electron 目录结构是否满足命名、JS-only 和边界规则。
 * 目标不是做完整 lint，而是快速阻止明显越权和错误范式。
 */

import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(process.argv[2] || process.cwd());
const ignoredNames = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.codex',
  '.serena',
  '.cdp-profile-9222'
]);
const pageEntryNames = new Set(['index.js', 'index.jsx', 'index.vue']);
const kebabCasePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const allowedLooseFiles = new Set([
  'package.json',
  'pnpm-workspace.yaml',
  'index.html',
  'index.js',
  'index.jsx',
  'index.vue',
  'main.js',
  'main.jsx',
  'main.vue',
  'app.js',
  'app.jsx',
  'app.vue'
]);
const codeExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.vue']);

/**
 * 收集所有文件路径。
 * @param {string} currentPath 当前扫描路径。
 * @param {string[]} bucket 收集结果。
 */
function walk(currentPath, bucket) {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoredNames.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      bucket.push(absolutePath);
      walk(absolutePath, bucket);
      continue;
    }

    bucket.push(absolutePath);
  }
}

/**
 * 判断当前文件或目录名是否符合 kebab-case 例外规则。
 * @param {string} entryName 文件或目录名。
 * @returns {boolean}
 */
function isNameAllowed(entryName) {
  if (entryName.startsWith('.')) {
    return true;
  }

  if (allowedLooseFiles.has(entryName)) {
    return true;
  }

  const extension = path.extname(entryName);
  const baseName = extension ? entryName.slice(0, -extension.length) : entryName;

  return kebabCasePattern.test(baseName);
}

/**
 * 根据路径判断代码所有者。
 * @param {string} absolutePath 绝对路径。
 * @returns {string}
 */
function getOwner(absolutePath) {
  const normalizedPath = absolutePath.split(path.sep).join('/');

  if (normalizedPath.includes('/packages/shared/')) {
    return 'shared';
  }

  if (normalizedPath.includes('/packages/main/')) {
    return 'main';
  }

  if (normalizedPath.includes('/packages/preload/')) {
    return 'preload';
  }

  if (normalizedPath.includes('/packages/renderer/')) {
    return 'renderer';
  }

  if (normalizedPath.includes('/src/electron/')) {
    return normalizedPath.includes('/src/electron/preload') ? 'preload' : 'electron';
  }

  if (normalizedPath.includes('/src/renderer/')) {
    return 'renderer';
  }

  if (normalizedPath.includes('/src/shared/')) {
    return 'shared';
  }

  return 'unknown';
}

/**
 * 解析代码中的相对导入。
 * @param {string} absolutePath 文件绝对路径。
 * @param {string} sourceCode 文件内容。
 * @returns {string[]}
 */
function collectRelativeImports(absolutePath, sourceCode) {
  const importMatches = [];
  const importPattern = /(?:from\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\))/g;
  let match = importPattern.exec(sourceCode);

  while (match) {
    const request = match[1] || match[2] || match[3];

    if (request && request.startsWith('.')) {
      importMatches.push(path.resolve(path.dirname(absolutePath), request));
    }

    match = importPattern.exec(sourceCode);
  }

  return importMatches;
}

const entries = [];
const failures = [];
walk(rootDir, entries);

for (const absolutePath of entries) {
  const relativePath = path.relative(rootDir, absolutePath);
  const stats = fs.statSync(absolutePath);
  const entryName = path.basename(absolutePath);
  const normalizedRelativePath = relativePath.split(path.sep).join('/');

  if (!isNameAllowed(entryName)) {
    failures.push(`命名不符合 kebab-case: ${normalizedRelativePath}`);
  }

  if (!stats.isDirectory()) {
    if (normalizedRelativePath.endsWith('.ts') || normalizedRelativePath.endsWith('.tsx') || normalizedRelativePath.endsWith('.d.ts')) {
      failures.push(`发现 TypeScript 痕迹: ${normalizedRelativePath}`);
    }

    if ((normalizedRelativePath.includes('/src/renderer/components/') || normalizedRelativePath.includes('/packages/renderer/src/components/'))
      && !entryName.startsWith('pro-')) {
      failures.push(`公共组件未使用 pro- 前缀: ${normalizedRelativePath}`);
    }

    if (normalizedRelativePath.includes('/pages/')) {
      const segments = normalizedRelativePath.split('/');
      const pagesIndex = segments.indexOf('pages');

      if (pagesIndex >= 0 && segments.length - pagesIndex === 3 && !pageEntryNames.has(entryName)) {
        failures.push(`页面入口必须命名为 index: ${normalizedRelativePath}`);
      }
    }
  }
}

for (const absolutePath of entries) {
  const stats = fs.statSync(absolutePath);
  const extension = path.extname(absolutePath);

  if (stats.isDirectory() || !codeExtensions.has(extension)) {
    continue;
  }

  const sourceCode = fs.readFileSync(absolutePath, 'utf8');
  const owner = getOwner(absolutePath);
  const imports = collectRelativeImports(absolutePath, sourceCode);
  const normalizedRelativePath = path.relative(rootDir, absolutePath).split(path.sep).join('/');

  for (const importedPath of imports) {
    const targetOwner = getOwner(importedPath);

    if (owner === 'renderer' && ['main', 'preload', 'electron'].includes(targetOwner)) {
      failures.push(`渲染层越权引用主进程代码: ${normalizedRelativePath}`);
    }

    if (owner === 'preload' && ['main', 'renderer', 'electron'].includes(targetOwner)) {
      failures.push(`preload 越权引用其他环境实现: ${normalizedRelativePath}`);
    }

    if ((owner === 'main' || owner === 'electron') && ['renderer', 'preload'].includes(targetOwner)) {
      failures.push(`主进程越权引用其他环境实现: ${normalizedRelativePath}`);
    }

    if (owner === 'shared' && ['main', 'preload', 'renderer', 'electron'].includes(targetOwner)) {
      failures.push(`shared 必须保持环境无关: ${normalizedRelativePath}`);
    }
  }
}

if (failures.length > 0) {
  console.error('结构校验失败:');

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log('结构校验通过。');
