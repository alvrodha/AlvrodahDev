/**
 * REST API data source. Enabled by setting VITE_BLOG_API_URL at build time.
 * Expected endpoints (see docs/blog-api.md):
 *   GET {base}/posts?lang=&page=&pageSize=&tag=&q=  → { items: Post[], total, page, pageSize }
 *   GET {base}/posts/{slug}?lang=                    → Post   (404 when missing)
 *   GET {base}/tags                                  → string[]
 * Every response is validated through the model before it reaches the UI.
 */
import { isValidSlug, normalizePost, toSummary } from "../model.js";

export class BlogApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = "BlogApiError";
        this.status = status;
    }
}

export function createApiSource(baseUrl, { fetchImpl = (...args) => globalThis.fetch(...args), timeoutMs = 8000 } = {}) {
    const base = new URL(String(baseUrl).replace(/\/+$/, "") + "/");
    if (!["https:", "http:"].includes(base.protocol)) throw new Error("Blog API URL must use http(s).");

    async function request(path, params = {}) {
        const url = new URL(path, base);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== "") url.searchParams.set(key, String(value));
        });

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetchImpl(url, {
                headers: { Accept: "application/json" },
                credentials: "omit",
                signal: controller.signal,
            });
            if (response.status === 404) return null;
            if (!response.ok) throw new BlogApiError(`Blog API responded with ${response.status}`, response.status);
            return await response.json();
        } finally {
            clearTimeout(timer);
        }
    }

    return {
        async list({ language, page, pageSize, tag, query }) {
            const data = await request("posts", { lang: language, page, pageSize, tag, q: query });
            const items = (Array.isArray(data?.items) ? data.items : [])
                .map((item) => normalizePost(item, { requestedLanguage: language }))
                .filter(Boolean)
                .map(toSummary);
            const total = Number.isInteger(data?.total) && data.total >= 0 ? data.total : items.length;
            return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
        },

        async get(slug, language) {
            if (!isValidSlug(slug)) return null;
            const data = await request(`posts/${encodeURIComponent(slug)}`, { lang: language });
            return data ? normalizePost(data, { requestedLanguage: language }) : null;
        },

        async tags() {
            const data = await request("tags");
            return Array.isArray(data) ? data.filter((tag) => typeof tag === "string" && isValidSlug(tag)) : [];
        },
    };
}
