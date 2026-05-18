#!/usr/bin/env node

/**
 * 输出推荐目录树。
 * 这个脚本用于让 agent 在不同场景下快速复用稳定目录文本，而不是每次手写。
 */

const trees = {
  monorepo: [
    'my-electron-app/',
    '├── package.json',
    '├── pnpm-workspace.yaml',
    '├── build/',
    '└── packages/',
    '    ├── shared/',
    '    │   └── src/',
    '    │       ├── constants/',
    '    │       ├── contracts/',
    '    │       └── utils/',
    '    ├── main/',
    '    │   └── src/',
    '    │       ├── core/',
    '    │       ├── ipc/',
    '    │       └── services/',
    '    ├── preload/',
    '    │   └── src/',
    '    └── renderer/',
    '        └── src/',
    '            ├── core/',
    '            ├── common/',
    '            │   ├── hooks/',
    '            │   └── styles/',
    '            ├── components/',
    '            └── modules/',
    '                └── workspace/',
    '                    ├── api/',
    '                    ├── store/',
    '                    ├── components/',
    '                    └── pages/',
    '                        └── task-center/',
    '                            └── index.jsx'
  ],
  'single-package': [
    'src/',
    '├── electron/',
    '│   ├── core/',
    '│   ├── ipc/',
    '│   ├── services/',
    '│   └── preload.js',
    '├── shared/',
    '│   ├── constants/',
    '│   ├── contracts/',
    '│   └── utils/',
    '└── renderer/',
    '    ├── core/',
    '    ├── common/',
    '    │   ├── hooks/',
    '    │   └── styles/',
    '    ├── components/',
    '    └── pages/',
    '        └── task-center/',
    '            └── index.jsx'
  ],
  'renderer-module': [
    'modules/',
    '└── workspace/',
    '    ├── api/',
    '    ├── store/',
    '    ├── components/',
    '    │   └── pro-task-status-badge.jsx',
    '    └── pages/',
    '        └── task-center/',
    '            └── index.jsx'
  ]
};

const mode = process.argv[2] || 'monorepo';

if (!trees[mode]) {
  console.error(`不支持的模式: ${mode}`);
  console.error(`可选模式: ${Object.keys(trees).join(', ')}`);
  process.exit(1);
}

console.log(trees[mode].join('\n'));
