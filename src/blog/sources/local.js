/**
 * Local data source: reads the bundled src/content/posts.json and emulates the
 * same contract as the REST API source (filtering, search, pagination).
 */
import { foldText, normalizePost, toSummary } from "../model.js";

const DEFAULT_LANGUAGE = "en";

/** Picks the requested translation, falling back to English, then to any translation. */
export function localizeRecord(record, language) {
    const translations = record?.translations ?? {};
    const resolvedLanguage = [language, DEFAULT_LANGUAGE, ...Object.keys(translations)].find(
        (code) => code && Object.hasOwn(translations, code),
    );
    if (!resolvedLanguage) return null;
    const { translations: _omit, ...shared } = record;
    return normalizePost(
        { ...shared, ...translations[resolvedLanguage], language: resolvedLanguage },
        { requestedLanguage: language },
    );
}

/** @param {() => Promise<object[]>} load */
export function createLocalSource(load = () => import("../../content/posts.json").then((module) => module.default)) {
    let cache;
    const records = async () => {
        cache ??= load().then((data) =>
            (Array.isArray(data) ? data : [])
                .filter((record) => record && !record.draft)
                .sort((first, second) => String(second.publishedAt).localeCompare(String(first.publishedAt))),
        );
        return cache;
    };
    const localized = async (language) =>
        (await records()).map((record) => localizeRecord(record, language)).filter(Boolean);

    return {
        async list({ language, page, pageSize, tag, query }) {
            const needle = foldText(query);
            const matches = (await localized(language)).filter(
                (post) =>
                    (!tag || post.tags.includes(tag)) &&
                    (!needle || foldText([post.title, post.excerpt, ...post.tags].join(" ")).includes(needle)),
            );
            const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
            const start = (page - 1) * pageSize;
            return {
                items: matches.slice(start, start + pageSize).map(toSummary),
                total: matches.length,
                page,
                pageSize,
                totalPages,
            };
        },

        async get(slug, language) {
            const record = (await records()).find((item) => item.slug === slug);
            return record ? localizeRecord(record, language) : null;
        },

        async tags() {
            return [...new Set((await records()).flatMap((record) => record.tags ?? []))].sort();
        },
    };
}
