#!/usr/bin/env node

/**
 * Extracts lightweight route-design signals from a URL.
 * The script is dependency-free on purpose so the skill can run in a clean environment.
 */

const DEFAULT_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.url) {
        throw new Error('Missing required argument: --url');
    }

    const normalizedUrl = normalizeUrl(args.url);
    const response = await fetchUrl(normalizedUrl);
    const analysis = await analyseResponse(normalizedUrl, response);
    const output = JSON.stringify(analysis, null, 2);

    if (args.output) {
        await writeFile(args.output, output + '\n');
    }

    process.stdout.write(output + '\n');
}

function parseArgs(argv) {
    const args = {};

    for (let i = 0; i < argv.length; i++) {
        const current = argv[i];
        if (current === '--url') {
            args.url = argv[++i];
        } else if (current === '--output') {
            args.output = argv[++i];
        }
    }

    return args;
}

function normalizeUrl(input) {
    const url = new URL(input);
    url.hash = '';
    return url.toString();
}

async function fetchUrl(url) {
    const response = await fetch(url, {
        redirect: 'follow',
        headers: {
            'user-agent': DEFAULT_USER_AGENT,
            accept: 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
        },
    });

    const body = await response.text();

    return {
        url: response.url,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body,
    };
}

async function analyseResponse(requestUrl, response) {
    const finalUrl = response.url || requestUrl;
    const finalUrlObject = new URL(finalUrl);
    const contentType = response.headers['content-type'] || '';
    const isJsonResponse = contentType.includes('application/json') || looksLikeJson(response.body);
    const html = isJsonResponse ? '' : response.body;
    const title = isJsonResponse ? finalUrlObject.hostname : extractTitle(html);
    const description = isJsonResponse ? '' : extractMetaContent(html, ['description', 'og:description', 'twitter:description']);
    const namespaceCandidate = inferNamespace(finalUrlObject.hostname);
    const pageType = inferPageType(finalUrlObject, html, isJsonResponse);
    const discoveredApis = isJsonResponse ? [finalUrl] : discoverApis(html, finalUrlObject);
    const minimumApiScore = pageType === 'article' ? 4 : 2;
    const relevantApis = discoveredApis.filter((apiUrl) => scoreApiCandidate(apiUrl, finalUrlObject) >= minimumApiScore);
    const requiresPuppeteer = !isJsonResponse && inferRequiresPuppeteer(html);
    const fields = inferFieldHints(html, isJsonResponse);
    const risks = inferRisks({
        status: response.status,
        html,
        finalUrlObject,
        isJsonResponse,
        discoveredApis,
        fields,
        requiresPuppeteer,
    });

    return {
        normalizedUrl: finalUrl,
        site: {
            host: finalUrlObject.host,
            hostname: finalUrlObject.hostname,
            origin: finalUrlObject.origin,
            title,
            description,
        },
        namespaceCandidate,
        pageType,
        discoveredApis,
        listExtraction: inferListExtraction({
            urlObject: finalUrlObject,
            html,
            isJsonResponse,
            discoveredApis,
            relevantApis,
            requiresPuppeteer,
        }),
        detailExtraction: inferDetailExtraction({
            urlObject: finalUrlObject,
            html,
            isJsonResponse,
            relevantApis,
            requiresPuppeteer,
        }),
        fields,
        requiresPuppeteer,
        risks,
    };
}

function looksLikeJson(body) {
    const trimmed = body.trim();
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

function extractTitle(html) {
    return extractFirstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || extractMetaContent(html, ['og:title', 'twitter:title']) || '';
}

function extractMetaContent(html, names) {
    for (const name of names) {
        const pattern = new RegExp(`<meta[^>]+(?:name|property)=["']${escapeRegExp(name)}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
        const value = extractFirstMatch(html, pattern);
        if (value) {
            return decodeHtml(value.trim());
        }
    }
    return '';
}

function extractFirstMatch(source, pattern) {
    const match = source.match(pattern);
    return match?.[1]?.trim() || '';
}

function inferNamespace(hostname) {
    const parts = hostname.split('.').filter(Boolean);
    if (parts.length <= 2) {
        return sanitizeName(parts[0] || 'site');
    }

    const candidate = parts[parts.length - 2];
    return sanitizeName(candidate || parts[0] || 'site');
}

function sanitizeName(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-') || 'site';
}

function inferPageType(urlObject, html, isJsonResponse) {
    if (isJsonResponse || /\/api\/|\/graphql\b|\.json$/i.test(urlObject.pathname)) {
        return 'api';
    }

    const pathSegments = urlObject.pathname.split('/').filter(Boolean);
    const articleLikePath = pathSegments.some((segment) => /\d{4,}|[a-z0-9-]{16,}/i.test(segment));
    const hasArticleMeta =
        /<meta[^>]+property=["']og:type["'][^>]+content=["']article["']/i.test(html) ||
        /<article[\s>]/i.test(html) ||
        /datePublished|article:published_time/i.test(html);
    const linkCount = (html.match(/<a\b/gi) || []).length;

    if (articleLikePath || hasArticleMeta) {
        return 'article';
    }

    if (linkCount >= 25) {
        return 'list';
    }

    return 'unknown';
}

function discoverApis(html, urlObject) {
    const patterns = [
        /https?:\/\/[^"'`\s<>()]+/g,
        /["'`](\/[^"'`\s<>]*?(?:api|graphql|ajax|feed)[^"'`\s<>]*)["'`]/gi,
        /["'`](\/[^"'`\s<>]*?\.json(?:\?[^"'`\s<>]*)?)["'`]/gi,
    ];
    const results = new Set();

    for (const pattern of patterns) {
        for (const match of html.matchAll(pattern)) {
            const rawValue = match[1] || match[0];
            if (!rawValue) {
                continue;
            }
            if (!isLikelyApiEndpoint(rawValue)) {
                continue;
            }

            try {
                const resolved = new URL(rawValue, urlObject.origin).toString();
                results.add(resolved);
            } catch {
                continue;
            }
        }
    }

    return Array.from(results)
        .toSorted((left, right) => scoreApiCandidate(right, urlObject) - scoreApiCandidate(left, urlObject))
        .slice(0, 10);
}

function inferRequiresPuppeteer(html) {
    const textOnly = stripTags(html).replace(/\s+/g, ' ').trim();
    const hasHydrationMarkers = /__NEXT_DATA__|__NUXT__|window\.__INITIAL_STATE__|id=["']app["']|data-reactroot/i.test(html);
    const hasLittleText = textOnly.length < 500;

    return hasHydrationMarkers && hasLittleText;
}

function inferFieldHints(html, isJsonResponse) {
    if (isJsonResponse) {
        return {
            title: ['title', 'name', 'headline'],
            description: ['description', 'summary', 'content', 'body'],
            pubDate: ['pubDate', 'publishedAt', 'publishTime', 'date'],
            author: ['author', 'creator', 'byline'],
            category: ['category', 'categories', 'tags'],
            link: ['url', 'link', 'permalink'],
        };
    }

    return {
        title: collectHints(html, [
            /<meta[^>]+property=["']og:title["']/i,
            /<title[\s>]/i,
            /class=["'][^"']*(?:title|headline)[^"']*["']/i,
        ]),
        description: collectHints(html, [
            /<meta[^>]+(?:name|property)=["'](?:description|og:description)["']/i,
            /class=["'][^"']*(?:content|article|summary|excerpt)[^"']*["']/i,
        ]),
        pubDate: collectHints(html, [
            /article:published_time/i,
            /datePublished/i,
            /class=["'][^"']*(?:date|time|published)[^"']*["']/i,
            /<time[\s>]/i,
        ]),
        author: collectHints(html, [/author/i, /byline/i, /rel=["']author["']/i]),
        category: collectHints(html, [/tag/i, /category/i, /keyword/i]),
        link: ['anchor[href]', 'canonical', 'og:url'],
    };
}

function collectHints(html, patterns) {
    return patterns.filter((pattern) => pattern.test(html)).map((pattern) => pattern.toString());
}

function inferListExtraction({ urlObject, html, isJsonResponse, discoveredApis, relevantApis, requiresPuppeteer }) {
    if (isJsonResponse) {
        return {
            strategy: 'api',
            hints: ['response root', 'items[]', 'data[]'],
            shouldUseCache: true,
        };
    }

    if (relevantApis.length > 0) {
        return {
            strategy: 'api-first',
            hints: relevantApis.slice(0, 3),
            shouldUseCache: true,
        };
    }

    if (requiresPuppeteer) {
        return {
            strategy: 'browser-fallback',
            hints: ['hydrate page before selecting list items'],
            shouldUseCache: true,
        };
    }

    return {
        strategy: 'html',
        hints: inferListSelectors(html, urlObject.origin),
        shouldUseCache: true,
    };
}

function inferListSelectors(html, origin) {
    const anchors = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))
        .map((match) => ({
            href: match[1],
            text: stripTags(match[2]).trim(),
        }))
        .filter((item) => item.text.length > 10 && item.href && !item.href.startsWith('#'))
        .slice(0, 5)
        .map((item) => `${new URL(item.href, origin).pathname} => ${item.text}`);

    return anchors.length > 0 ? anchors : ['inspect repeated article anchors'];
}

function inferDetailExtraction({ urlObject, html, isJsonResponse, requiresPuppeteer }) {
    if (isJsonResponse) {
        return {
            strategy: 'api',
            hints: ['map body/content/description fields to description'],
            shouldUseCache: true,
        };
    }

    if (requiresPuppeteer) {
        return {
            strategy: 'browser-fallback',
            hints: ['wait for article container selector'],
            shouldUseCache: true,
        };
    }

    return {
        strategy: 'html',
        hints: [
            extractMetaContent(html, ['og:title']) ? 'og:title' : '',
            /<article[\s>]/i.test(html) ? 'article element' : '',
            /class=["'][^"']*(?:content|article|post-body)[^"']*["']/i.test(html) ? 'article/content class' : '',
        ].filter(Boolean),
        shouldUseCache: true,
    };
}

function inferRisks({ status, html, finalUrlObject, isJsonResponse, discoveredApis, fields, requiresPuppeteer }) {
    const risks = [];

    if (status >= 400) {
        risks.push(`HTTP ${status} returned from target URL`);
    }
    if (/captcha|cloudflare|challenge-platform|cf-chl|geetest/i.test(html)) {
        risks.push('page shows anti-bot or captcha markers');
    }
    if (/<input[^>]+type=["']password["']/i.test(html) || /sign in|login|登录/i.test(html)) {
        risks.push('page may require login or cookies');
    }
    if (requiresPuppeteer) {
        risks.push('page appears to rely on client-side rendering');
    }
    if (!isJsonResponse && discoveredApis.length === 0 && fields.pubDate.length === 0) {
        risks.push('publish date is not obviously exposed');
    }
    if (!isJsonResponse && inferLikelyDynamicTokens(html)) {
        risks.push('page may require dynamic token or build hash');
    }
    if (!isJsonResponse && inferLikelyDuplicateLinks(finalUrlObject.pathname, html)) {
        risks.push('list links may not be unique without extra guid handling');
    }

    return risks;
}

function isLikelyApiEndpoint(value) {
    return /(\/api(?:\/|$)|\/graphql(?:\/|$)|\/ajax(?:\/|$)|\.json(?:$|\?)|[?&](?:format|output)=json\b)/i.test(value);
}

function scoreApiCandidate(candidateUrl, currentUrlObject) {
    let score = 0;

    try {
        const candidate = new URL(candidateUrl, currentUrlObject.origin);
        const pathname = candidate.pathname.toLowerCase();
        const currentSegments = currentUrlObject.pathname.split('/').filter(Boolean);
        const candidateSegments = pathname.split('/').filter(Boolean);

        if (candidate.host === currentUrlObject.host) {
            score += 1;
        }
        if (/(\/api(?:\/|$)|\/graphql(?:\/|$)|\/ajax(?:\/|$)|\.json$)/i.test(pathname)) {
            score += 2;
        }
        if (currentSegments.length > 0 && candidateSegments.some((segment) => currentSegments.includes(segment))) {
            score += 1;
        }
        if (candidate.searchParams.get('format') === 'json' || candidate.searchParams.get('output') === 'json') {
            score += 1;
        }
    } catch {
        return 0;
    }

    return score;
}

function inferLikelyDynamicTokens(html) {
    return /authorization|x-signature|buildId|webpackHash|csrf-token|safeid/i.test(html);
}

function inferLikelyDuplicateLinks(pathname, html) {
    const matches = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)).map((item) => item[1]);
    const normalized = matches
        .map((value) => value.split('#')[0])
        .filter((value) => value && value !== pathname);
    return new Set(normalized).size < normalized.length / 2 && normalized.length > 6;
}

function stripTags(value) {
    return value.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
}

function decodeHtml(value) {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function writeFile(targetPath, content) {
    const { writeFile: fsWriteFile } = await import('node:fs/promises');
    await fsWriteFile(targetPath, content, 'utf8');
}

main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
});
