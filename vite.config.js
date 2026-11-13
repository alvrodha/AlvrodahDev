import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { pages, postPath, site } from "./site.config.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const partialsDir = resolve(root, "partials");

const htmlTokens = {
    "%SITE_URL%": site.url,
    "%SITE_NAME%": site.name,
    "%SITE_AUTHOR%": site.author,
    "%SITE_EMAIL%": site.email,
    "%SITE_GITHUB%": site.github,
    "%SITE_LINKEDIN%": site.linkedin,
    "%YEAR%": String(new Date().getFullYear()),
};

function replaceTokens(html) {
    return Object.entries(htmlTokens).reduce(
        (output, [token, value]) => output.replaceAll(token, value),
        html,
    );
}

/**
 * Inlines shared HTML partials (`<!-- @include header -->`), replaces site tokens,
 * and marks the current page's navigation links with aria-current="page".
 * Runs before Vite processes the HTML, so scripts and styles in partials are bundled.
 */
/**
 * Content-Security-Policy, injected as a <meta> tag in production builds only
 * (Vite's dev server needs inline styles for HMR). Static hosting cannot send
 * headers, so frame-ancestors/HSTS must be configured at the host/CDN — see README.
 */
export function buildCsp({ apiOrigin } = {}) {
    const google = ["https://www.googletagmanager.com", "https://*.google-analytics.com", "https://*.analytics.google.com"];
    const directives = {
        "default-src": ["'self'"],
        "script-src": ["'self'", "https://www.googletagmanager.com"],
        "style-src": ["'self'"],
        "img-src": ["'self'", "data:", ...google],
        "font-src": ["'self'"],
        "connect-src": ["'self'", ...google, ...(apiOrigin ? [apiOrigin] : [])],
        "frame-src": ["https://www.googletagmanager.com"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
        "upgrade-insecure-requests": [],
    };
    return Object.entries(directives)
        .map(([name, values]) => [name, ...values].join(" "))
        .join("; ");
}

function htmlPartials({ csp }) {
    const include = (html, depth = 0) =>
        html.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, name) => {
            if (depth > 5) throw new Error(`Partial include depth exceeded at "${name}"`);
            return include(readFileSync(resolve(partialsDir, `${name}.html`), "utf8"), depth + 1);
        });

    return {
        name: "html-partials",
        transformIndexHtml: {
            order: "pre",
            handler(html, context) {
                let output = replaceTokens(include(html));
                if (!context.server && csp) {
                    output = output.replace(
                        /<meta charset="UTF-8">/i,
                        `$&\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`,
                    );
                }
                const page = output.match(/<body[^>]*\sdata-page="([\w-]+)"/)?.[1];
                if (page) {
                    output = output.replaceAll(`data-nav="${page}"`, `data-nav="${page}" aria-current="page"`);
                }
                return output;
            },
        },
        handleHotUpdate({ file, server }) {
            if (file.startsWith(partialsDir)) server.ws.send({ type: "full-reload" });
        },
    };
}

const escapeXml = (value) => String(value).replace(/[<>&'"]/g, (char) => `&#${char.charCodeAt(0)};`);

/** Builds an RSS 2.0 feed (English content) from the local posts. */
export function buildRss(posts) {
    const items = posts
        .filter((post) => !post.draft)
        .sort((first, second) => second.publishedAt.localeCompare(first.publishedAt))
        .map((post) => {
            const content = post.translations.en ?? Object.values(post.translations)[0];
            const link = site.url + postPath(post.slug);
            return [
                "    <item>",
                `      <title>${escapeXml(content.title)}</title>`,
                `      <link>${escapeXml(link)}</link>`,
                `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
                `      <pubDate>${new Date(`${post.publishedAt}T00:00:00Z`).toUTCString()}</pubDate>`,
                `      <description>${escapeXml(content.excerpt)}</description>`,
                ...(post.tags ?? []).map((tag) => `      <category>${escapeXml(tag)}</category>`),
                "    </item>",
            ].join("\n");
        });

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        "  <channel>",
        `    <title>${escapeXml(site.name)} blog</title>`,
        `    <link>${site.url}/blog/</link>`,
        `    <atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/>`,
        "    <description>Notes on learning and building software.</description>",
        "    <language>en</language>",
        ...items,
        "  </channel>",
        "</rss>",
        "",
    ].join("\n");
}

/** Emits sitemap.xml, robots.txt and feed.xml from the page map and the local blog posts. */
function seoFiles() {
    return {
        name: "seo-files",
        apply: "build",
        generateBundle() {
            const posts = JSON.parse(readFileSync(resolve(root, "src/content/posts.json"), "utf8")).filter((post) => !post.draft);
            const today = new Date().toISOString().slice(0, 10);
            const entries = [
                ...pages
                    .filter((page) => page.sitemap !== false)
                    .map((page) => ({ loc: page.path, lastmod: today, ...page })),
                ...posts.map((post) => ({
                    loc: postPath(post.slug),
                    lastmod: post.updatedAt ?? post.publishedAt,
                    changefreq: "yearly",
                    priority: "0.6",
                })),
            ];
            const sitemap = [
                '<?xml version="1.0" encoding="UTF-8"?>',
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
                ...entries.map(
                    (entry) =>
                        `  <url><loc>${escapeXml(site.url + entry.loc)}</loc><lastmod>${entry.lastmod}</lastmod>` +
                        `<changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`,
                ),
                "</urlset>",
                "",
            ].join("\n");

            this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemap });
            this.emitFile({
                type: "asset",
                fileName: "robots.txt",
                source: `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`,
            });
            this.emitFile({ type: "asset", fileName: "feed.xml", source: buildRss(posts) });
        },
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, root, "VITE_");
    const apiOrigin = env.VITE_BLOG_API_URL ? new URL(env.VITE_BLOG_API_URL).origin : null;

    return {
        plugins: [htmlPartials({ csp: buildCsp({ apiOrigin }) }), tailwindcss(), seoFiles()],
        build: {
            rollupOptions: {
                input: Object.fromEntries(pages.map((page) => [page.id, resolve(root, page.file)])),
            },
        }
    };
});
