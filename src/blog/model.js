/**
 * Blog domain model + validation. Shared by every data source so pages always
 * receive the same, sanitized shapes — whether data comes from the bundled JSON
 * or from a future backend API.
 *
 * @typedef {{ type: "p"|"h2"|"h3"|"quote", text: string }
 *         | { type: "ul"|"ol", items: string[] }
 *         | { type: "code", language: string, text: string }} Block
 *
 * @typedef {object} PostSummary
 * @property {string} slug
 * @property {string} title
 * @property {string} excerpt
 * @property {string} publishedAt  ISO date (YYYY-MM-DD)
 * @property {string} updatedAt    ISO date (YYYY-MM-DD)
 * @property {string} author
 * @property {string[]} tags
 * @property {number} readingMinutes
 * @property {string} language       Language of the returned content
 * @property {boolean} isFallback    True when the requested language was unavailable
 *
 * @typedef {PostSummary & { body: Block[] }} Post
 *
 * @typedef {object} PostPage
 * @property {PostSummary[]} items
 * @property {number} total
 * @property {number} page
 * @property {number} pageSize
 * @property {number} totalPages
 */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DEFAULT_PAGE_SIZE = 6;
export const MAX_PAGE_SIZE = 50;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;
const TEXT_BLOCKS = new Set(["p", "h2", "h3", "quote"]);
const LIST_BLOCKS = new Set(["ul", "ol"]);
const MAX_TEXT = 20000;

const text = (value, max = MAX_TEXT) => (typeof value === "string" ? value.slice(0, max) : "");

export function isValidSlug(slug) {
    return typeof slug === "string" && slug.length <= 120 && SLUG_PATTERN.test(slug);
}

/** Drops unknown block types and coerces fields to strings. Never returns HTML. */
export function normalizeBlocks(blocks) {
    if (!Array.isArray(blocks)) return [];
    return blocks.flatMap((block) => {
        if (!block || typeof block !== "object") return [];
        if (TEXT_BLOCKS.has(block.type)) return [{ type: block.type, text: text(block.text) }];
        if (LIST_BLOCKS.has(block.type) && Array.isArray(block.items)) {
            return [{ type: block.type, items: block.items.map((item) => text(item, 2000)).filter(Boolean) }];
        }
        if (block.type === "code") {
            return [{ type: "code", language: text(block.language, 30).replace(/[^\w+#-]/g, ""), text: text(block.text) }];
        }
        return [];
    });
}

function countWords(blocks) {
    return blocks
        .flatMap((block) => (block.items ? block.items : [block.text]))
        .join(" ")
        .split(/\s+/)
        .filter(Boolean).length;
}

/**
 * Normalizes an already-localized post (flat fields, as a backend would return them).
 * Returns null when required fields are missing or invalid.
 * @returns {Post|null}
 */
export function normalizePost(raw, { requestedLanguage } = {}) {
    if (!raw || typeof raw !== "object" || !isValidSlug(raw.slug)) return null;
    const title = text(raw.title, 300).trim();
    const publishedAt = ISO_DATE.test(raw.publishedAt ?? "") ? raw.publishedAt.slice(0, 10) : null;
    if (!title || !publishedAt) return null;

    const body = normalizeBlocks(raw.body);
    const language = text(raw.language, 10) || requestedLanguage || "en";
    const readingMinutes = Number.isInteger(raw.readingMinutes) && raw.readingMinutes > 0
        ? raw.readingMinutes
        : Math.max(1, Math.round(countWords(body) / 200));

    return {
        slug: raw.slug,
        title,
        excerpt: text(raw.excerpt, 1000).trim(),
        publishedAt,
        updatedAt: ISO_DATE.test(raw.updatedAt ?? "") ? raw.updatedAt.slice(0, 10) : publishedAt,
        author: text(raw.author, 120) || "alvrodah",
        tags: Array.isArray(raw.tags)
            ? [...new Set(raw.tags.filter((tag) => typeof tag === "string" && SLUG_PATTERN.test(tag)))]
            : [],
        readingMinutes,
        language,
        isFallback: Boolean(requestedLanguage && language !== requestedLanguage),
        body,
    };
}

/** Removes the body for list views. @returns {PostSummary} */
export function toSummary(post) {
    const { body, ...summary } = post;
    return summary;
}

/** Clamps pagination/filter arguments coming from the URL or the UI. */
export function normalizeQuery({ page, pageSize, tag, query } = {}) {
    const safePage = Number.parseInt(page, 10);
    const safeSize = Number.parseInt(pageSize, 10);
    return {
        page: Number.isFinite(safePage) && safePage > 0 ? safePage : 1,
        pageSize: Number.isFinite(safeSize) && safeSize > 0 ? Math.min(safeSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE,
        tag: typeof tag === "string" && SLUG_PATTERN.test(tag) ? tag : null,
        query: typeof query === "string" ? query.trim().slice(0, 80) : "",
    };
}

/** Lowercases and strips accents so "Cómo" matches "como". */
export function foldText(value) {
    return String(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
