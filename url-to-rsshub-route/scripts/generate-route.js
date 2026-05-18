#!/usr/bin/env node

/**
 * Converts a structured URL analysis result into an RSSHub route draft.
 */

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const input = await readInput(args.input);
    const analysis = JSON.parse(input);
    const generated = generateDraft(analysis);
    const output = JSON.stringify(generated, null, 2);

    if (args.output) {
        await writeFile(args.output, output + '\n');
    }

    process.stdout.write(output + '\n');
}

function parseArgs(argv) {
    const args = {};

    for (let i = 0; i < argv.length; i++) {
        const current = argv[i];
        if (current === '--input') {
            args.input = argv[++i];
        } else if (current === '--output') {
            args.output = argv[++i];
        }
    }

    return args;
}

async function readInput(inputPath) {
    if (inputPath) {
        const { readFile } = await import('node:fs/promises');
        return readFile(inputPath, 'utf8');
    }

    return new Promise((resolve, reject) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => {
            data += chunk;
        });
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', reject);
    });
}

function generateDraft(analysis) {
    const namespaceName = analysis.namespaceCandidate || 'site';
    const namespaceTitle = titleCase(namespaceName);
    const routeSlug = inferRouteSlug(analysis);
    const routePath = `/${routeSlug}`;
    const category = 'other';
    const hostWithoutProtocol = analysis.site?.host || stripProtocol(analysis.normalizedUrl);
    const strategy = chooseStrategy(analysis);
    const handlerPlan = buildHandlerPlan({ analysis, strategy });
    const namespaceCode = buildNamespaceCode({
        namespaceTitle,
        hostWithoutProtocol,
        category,
    });
    const routeCode = buildRouteCode({
        analysis,
        routePath,
        routeSlug,
        category,
        strategy,
        handlerPlan,
        hostWithoutProtocol,
    });

    return {
        summary: {
            namespace: namespaceName,
            routePath,
            example: `/${namespaceName}/${routeSlug}`,
            strategy,
            requiresPuppeteer: Boolean(analysis.requiresPuppeteer && strategy === 'browser-fallback'),
        },
        namespaceCode,
        routeCode,
        implementationNotes: buildImplementationNotes({ analysis, strategy, routePath }),
        manualConfirmations: buildManualConfirmations({ analysis, routeSlug, category }),
    };
}

function inferRouteSlug(analysis) {
    const url = new URL(analysis.normalizedUrl);
    const segments = url.pathname
        .split('/')
        .filter(Boolean)
        .map((segment) => sanitizeName(segment))
        .filter(Boolean)
        .filter((segment) => !/^\d+$/.test(segment))
        .filter((segment) => segment !== analysis.namespaceCandidate);

    if (analysis.pageType === 'article' && segments.length > 1) {
        return segments[segments.length - 2] || 'articles';
    }

    return segments[segments.length - 1] || 'index';
}

function chooseStrategy(analysis) {
    if (analysis.pageType === 'api' || analysis.listExtraction?.strategy === 'api-first') {
        return 'api-first';
    }
    if (analysis.requiresPuppeteer) {
        return 'browser-fallback';
    }
    return 'html';
}

function buildNamespaceCode({ namespaceTitle, hostWithoutProtocol, category }) {
    return `export const namespace = {
    name: '${namespaceTitle}',
    url: '${hostWithoutProtocol}',
    categories: ['${category}'],
    description: 'Auto generated route draft from a single URL.',
    lang: 'en',
};
`;
}

function buildRouteCode({ analysis, routePath, routeSlug, category, strategy, handlerPlan, hostWithoutProtocol }) {
    const imports = buildImports(strategy);
    const features = buildFeatures(strategy);
    const routeName = formatRouteName(routeSlug);
    const radarSource = `${hostWithoutProtocol}${new URL(analysis.normalizedUrl).pathname}`;

    return `${imports}
export const route = {
    path: '${routePath}',
    categories: ['${category}'],
    example: '/${analysis.namespaceCandidate}/${routeSlug}',
    parameters: {},
    features: ${features},
    radar: [
        {
            source: ['${radarSource}'],
            target: '${routePath}',
        },
    ],
    name: '${routeName}',
    maintainers: ['your-github-id'],
    handler,
    url: '${hostWithoutProtocol}${new URL(analysis.normalizedUrl).pathname}',
    view: ViewType.Articles,
};

async function handler(ctx) {
${indent(handlerPlan, 4)}
}
`;
}

function buildImports(strategy) {
    const lines = ["import { ViewType } from '@/types';"];

    if (strategy === 'api-first') {
        lines.push("import got from '@/utils/got';");
    } else {
        lines.push("import { load } from 'cheerio';");
        lines.push("import got from '@/utils/got';");
    }

    lines.push("import cache from '@/utils/cache';");
    lines.push("import { parseDate } from '@/utils/parse-date';");

    return lines.join('\n');
}

function buildFeatures(strategy) {
    return `{
        requireConfig: false,
        requirePuppeteer: ${strategy === 'browser-fallback' ? 'true' : 'false'},
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    }`;
}

function buildHandlerPlan({ analysis, strategy }) {
    const url = analysis.normalizedUrl;

    if (strategy === 'api-first') {
        const apiUrl = analysis.discoveredApis?.[0] || url;
        return `// Prefer the discovered API before falling back to HTML parsing.
const rootUrl = '${new URL(url).origin}';
const apiUrl = '${apiUrl}';
const response = await got(apiUrl);
const data = response.data ?? response.body ?? response;

// TODO: map the real list field from the API response.
const list = Array.isArray(data?.items) ? data.items : [];

const items = await Promise.all(
    list.map((item) =>
        cache.tryGet(item.link || item.url || item.id, async () => ({
            title: item.title || item.name,
            link: item.link || item.url,
            description: item.content || item.description,
            pubDate: item.publishedAt ? parseDate(item.publishedAt) : undefined,
            author: item.author?.name || item.author,
            category: item.tags || item.categories,
        }))
    )
);

return {
    title: '${escapeJs(analysis.site?.title || analysis.namespaceCandidate)}',
    link: '${url}',
    item: items,
};`;
    }

    if (strategy === 'browser-fallback') {
        return `// TODO: replace this draft with Puppeteer-based extraction after confirming selectors.
// Use browser rendering only when API and static HTML are both insufficient.
const response = await got('${url}');
const $ = load(response.data);
const list = [];

const items = await Promise.all(
    list.map((item) =>
        cache.tryGet(item.link, async () => ({
            title: item.title,
            link: item.link,
            description: item.description,
            pubDate: item.pubDate ? parseDate(item.pubDate) : undefined,
        }))
    )
);

return {
    title: '${escapeJs(analysis.site?.title || analysis.namespaceCandidate)}',
    link: '${url}',
    item: items,
};`;
    }

    return `const rootUrl = '${new URL(url).origin}';
const response = await got('${url}');
const $ = load(response.data);

// TODO: refine the list selector based on the page structure.
const list = [];

const items = await Promise.all(
    list.map((item) =>
        cache.tryGet(item.link, async () => {
            const detailResponse = await got(item.link);
            const detail = load(detailResponse.data);

            return {
                title: item.title,
                link: item.link,
                description: detail('article, .article, .post-content, .content').first().html() || '',
                pubDate: item.pubDate ? parseDate(item.pubDate) : undefined,
                author: detail('[rel="author"], .author, .byline').first().text() || undefined,
                category: [],
            };
        })
    )
);

return {
    title: '${escapeJs(analysis.site?.title || analysis.namespaceCandidate)}',
    link: '${url}',
    item: items,
};`;
}

function buildImplementationNotes({ analysis, strategy, routePath }) {
    const notes = [
        `推荐策略：${strategy}`,
        `建议 route path：${routePath}`,
        '草稿默认按单一分类输出，后续需人工收敛为真实分类。',
        '如果列表进入详情，草稿已经默认带上 cache.tryGet。',
        '需要确保 description 最终只保留正文，不要拼接 title、author、tags。',
    ];

    if (analysis.discoveredApis?.length) {
        notes.push(`已发现 API 线索：${analysis.discoveredApis.slice(0, 3).join('；')}`);
    }

    if (analysis.risks?.length) {
        notes.push(`当前风险：${analysis.risks.join('；')}`);
    }

    return notes;
}

function buildManualConfirmations({ analysis, routeSlug, category }) {
    const confirmations = [
        '将 maintainers 中的 your-github-id 替换成真实 GitHub 用户名。',
        `确认 categories 是否应继续使用默认值 ${category}。`,
        `确认 route path '/${routeSlug}' 是否符合现有 namespace 命名习惯。`,
        '确认列表选择器、详情选择器或 API 字段路径是否与真实页面一致。',
        '确认是否真的需要 Puppeteer，避免误开 requirePuppeteer。',
    ];

    if (analysis.pageType === 'article') {
        confirmations.push('当前 URL 更像详情页，需要补充稳定的列表来源或固定详情使用场景。');
    }

    return confirmations;
}

function titleCase(value) {
    return value
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatRouteName(value) {
    return titleCase(value).replace(/'/g, '');
}

function sanitizeName(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
}

function stripProtocol(value) {
    return value.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function indent(value, spaces) {
    const prefix = ' '.repeat(spaces);
    return value
        .split('\n')
        .map((line) => `${prefix}${line}`)
        .join('\n');
}

function escapeJs(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function writeFile(targetPath, content) {
    const { writeFile: fsWriteFile } = await import('node:fs/promises');
    await fsWriteFile(targetPath, content, 'utf8');
}

main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
});
