/**
 * Blog service — the only module pages should import to read posts.
 * Swapping the data source (local JSON ↔ backend API) requires no page changes:
 * set VITE_BLOG_API_URL (e.g. in .env.production) to switch to the API.
 */
import { isValidSlug, normalizeQuery } from "./model.js";
import { createApiSource } from "./sources/api.js";
import { createLocalSource } from "./sources/local.js";

/** Wraps a data source with argument validation so sources never see unsafe input. */
export function createBlogService(source) {
    return {
        /** @returns {Promise<import("./model.js").PostPage>} */
        listPosts({ language = "en", ...options } = {}) {
            return source.list({ language, ...normalizeQuery(options) });
        },

        /** @returns {Promise<import("./model.js").Post|null>} */
        async getPost(slug, language = "en") {
            if (!isValidSlug(slug)) return null;
            return source.get(slug, language);
        },

        /** @returns {Promise<string[]>} */
        listTags() {
            return source.tags();
        },
    };
}

const apiUrl = import.meta.env?.VITE_BLOG_API_URL;

export const blog = createBlogService(apiUrl ? createApiSource(apiUrl) : createLocalSource());
