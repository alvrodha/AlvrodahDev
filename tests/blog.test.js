import { describe, expect, it, vi } from "vitest";
import posts from "../src/content/posts.json";
import { normalizeBlocks, normalizePost, normalizeQuery } from "../src/blog/model.js";
import { renderBlocks, renderPostCard } from "../src/blog/render.js";
import { createBlogService } from "../src/blog/service.js";
import { createApiSource } from "../src/blog/sources/api.js";
import { createLocalSource, localizeRecord } from "../src/blog/sources/local.js";

const XSS = `<img src=x onerror="alert(1)"><script>alert(1)</script>`;

function record(slug, publishedAt, { tags = ["js"], languages = ["en"] } = {}) {
    return {
        slug,
        publishedAt,
        tags,
        translations: Object.fromEntries(
            languages.map((language) => [language, { title: `${slug} ${language}`, excerpt: `excerpt ${language}`, body: [{ type: "p", text: "hello world" }] }]),
        ),
    };
}

const fixtures = [
    record("first-post", "2026-01-01", { tags: ["meta"] }),
    record("second-post", "2026-02-01", { languages: ["en", "es"] }),
    record("third-post", "2026-03-01"),
    { ...record("draft-post", "2026-04-01"), draft: true },
];
const localService = () => createBlogService(createLocalSource(async () => fixtures));

describe("content file", () => {
    it("every post is valid, has a unique slug and an English translation", () => {
        const slugs = new Set();
        for (const post of posts) {
            expect(slugs.has(post.slug), post.slug).toBe(false);
            slugs.add(post.slug);
            expect(post.translations.en, post.slug).toBeDefined();
            for (const language of Object.keys(post.translations)) {
                const localized = localizeRecord(post, language);
                expect(localized, `${post.slug}/${language}`).not.toBeNull();
                expect(localized.body.length).toBe(post.translations[language].body.length);
                expect(localized.excerpt.length).toBeLessThanOrEqual(200);
            }
        }
    });
});

describe("model validation", () => {
    it("drops unknown block types, including raw HTML blocks", () => {
        const blocks = normalizeBlocks([
            { type: "html", html: XSS },
            { type: "script", text: "alert(1)" },
            { type: "p", text: "ok" },
            { type: "ul", items: ["a", 42, "b"] },
            { type: "code", language: 'js" onload="x', text: "let a = 1;" },
            null,
        ]);
        expect(blocks).toEqual([
            { type: "p", text: "ok" },
            { type: "ul", items: ["a", "b"] },
            { type: "code", language: "jsonloadx", text: "let a = 1;" },
        ]);
    });

    it("rejects posts with invalid slugs or missing fields", () => {
        expect(normalizePost({ slug: "../../etc/passwd", title: "x", publishedAt: "2026-01-01" })).toBeNull();
        expect(normalizePost({ slug: "ok", title: "", publishedAt: "2026-01-01" })).toBeNull();
        expect(normalizePost({ slug: "ok", title: "x", publishedAt: "yesterday" })).toBeNull();
    });

    it("filters invalid tags and computes reading time", () => {
        const post = normalizePost({ slug: "ok", title: "T", publishedAt: "2026-01-01", tags: ["good", "<bad>", 1, "good"], body: [{ type: "p", text: "word ".repeat(450) }] });
        expect(post.tags).toEqual(["good"]);
        expect(post.readingMinutes).toBe(2);
    });

    it("clamps pagination input", () => {
        expect(normalizeQuery({ page: "-3", pageSize: "9999", tag: "<x>", query: "  hi  " })).toEqual({ page: 1, pageSize: 50, tag: null, query: "hi" });
    });
});

describe("local source", () => {
    it("lists newest first, hides drafts, and paginates", async () => {
        const page1 = await localService().listPosts({ pageSize: 2 });
        expect(page1.items.map((post) => post.slug)).toEqual(["third-post", "second-post"]);
        expect(page1).toMatchObject({ total: 3, totalPages: 2, page: 1 });
        expect(page1.items[0].body).toBeUndefined();
        const page2 = await localService().listPosts({ pageSize: 2, page: 2 });
        expect(page2.items.map((post) => post.slug)).toEqual(["first-post"]);
    });

    it("filters by tag and accent-insensitive search", async () => {
        expect((await localService().listPosts({ tag: "meta" })).items.map((post) => post.slug)).toEqual(["first-post"]);
        const service = createBlogService(createLocalSource(async () => [{ ...record("cafe", "2026-01-01"), translations: { en: { title: "Café notes", excerpt: "", body: [] } } }]));
        expect((await service.listPosts({ query: "CAFE" })).total).toBe(1);
    });

    it("localizes and flags fallbacks", async () => {
        const service = localService();
        expect(await service.getPost("second-post", "es")).toMatchObject({ language: "es", isFallback: false, title: "second-post es" });
        expect(await service.getPost("first-post", "de")).toMatchObject({ language: "en", isFallback: true });
    });

    it("returns null for unknown, draft-hidden, or malicious slugs", async () => {
        const service = localService();
        expect(await service.getPost("nope")).toBeNull();
        expect(await service.getPost("draft-post")).toBeNull();
        expect(await service.getPost("../secret")).toBeNull();
        expect(await service.getPost({ toString: () => "first-post" })).toBeNull();
    });

    it("lists unique, sorted tags", async () => {
        expect(await localService().listTags()).toEqual(["js", "meta"]);
    });
});

describe("API source (backend-ready)", () => {
    const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

    it("calls the documented endpoints with encoded params and no credentials", async () => {
        const fetchImpl = vi.fn(async () => json({ items: [], total: 0 }));
        const service = createBlogService(createApiSource("https://api.example.com/v1/", { fetchImpl }));
        await service.listPosts({ language: "es", page: 2, pageSize: 5, tag: "js", query: "a&b=c" });
        const [url, options] = fetchImpl.mock.calls[0];
        expect(url.href).toBe("https://api.example.com/v1/posts?lang=es&page=2&pageSize=5&tag=js&q=a%26b%3Dc");
        expect(options.credentials).toBe("omit");
    });

    it("never requests malicious slugs and maps 404 to null", async () => {
        const fetchImpl = vi.fn(async () => json(null, 404));
        const service = createBlogService(createApiSource("https://api.example.com", { fetchImpl }));
        expect(await service.getPost("../../admin")).toBeNull();
        expect(fetchImpl).not.toHaveBeenCalled();
        expect(await service.getPost("missing")).toBeNull();
        expect(fetchImpl.mock.calls[0][0].href).toBe("https://api.example.com/posts/missing?lang=en");
    });

    it("sanitizes untrusted API payloads", async () => {
        const fetchImpl = vi.fn(async () =>
            json({ items: [{ slug: "ok", title: "Hi", publishedAt: "2026-01-01", body: [{ type: "html", html: XSS }] }, { slug: "bad slug", title: "x" }, "junk"], total: "lots" }),
        );
        const service = createBlogService(createApiSource("https://api.example.com", { fetchImpl }));
        const result = await service.listPosts();
        expect(result.items.map((item) => item.slug)).toEqual(["ok"]);
        expect(result.total).toBe(1);
    });

    it("throws on server errors so the UI can show a retry", async () => {
        const service = createBlogService(createApiSource("https://api.example.com", { fetchImpl: async () => json({}, 500) }));
        await expect(service.listPosts()).rejects.toThrow("500");
    });

    it("rejects non-http base URLs", () => {
        expect(() => createApiSource("javascript:alert(1)")).toThrow();
    });
});

describe("rendering is XSS-safe", () => {
    it("renders block text as text nodes, never as markup", () => {
        const container = document.createElement("div");
        container.append(renderBlocks([{ type: "p", text: XSS }, { type: "code", language: "html", text: XSS }, { type: "ul", items: [XSS] }]));
        expect(container.querySelector("img, script")).toBeNull();
        expect(container.textContent).toContain("<script>");
    });

    it("renders post cards with safe links", () => {
        const card = renderPostCard(normalizePost({ slug: "ok", title: XSS, excerpt: XSS, publishedAt: "2026-01-01", tags: ["js"] }));
        expect(card.querySelector("img, script")).toBeNull();
        expect(card.querySelector("h2 a").getAttribute("href")).toBe("/blog/post/?slug=ok");
        expect(card.querySelector(".post-card__tags a").getAttribute("href")).toBe("/blog/?tag=js");
    });
});
