/**
 * Builds the site into a temp folder and audits the output (SEO + security).
 * Runs the real Vite build, so it also catches broken partials or entries.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "vite";
import { pages, site } from "../site.config.js";
import { root, walk } from "./helpers.js";

let outDir;
const docs = {};
const parse = (html) => new DOMParser().parseFromString(html, "text/html");

beforeAll(async () => {
    outDir = mkdtempSync(join(tmpdir(), "alvrodah-build-"));
    await build({ root, logLevel: "silent", build: { outDir, emptyOutDir: true } });
    for (const page of pages) {
        const html = readFileSync(join(outDir, page.file), "utf8");
        docs[page.id] = { html, doc: parse(html) };
    }
}, 60000);

afterAll(() => outDir && rmSync(outDir, { recursive: true, force: true }));

const indexable = pages.filter((page) => !["post", "notFound"].includes(page.id));

describe("SEO", () => {
    it.each(indexable)("$id has a unique title (≤ 70 chars) and description (50–160 chars)", ({ id }) => {
        const { doc } = docs[id];
        const title = doc.title.trim();
        const description = doc.querySelector('meta[name="description"]')?.content ?? "";
        expect(title.length).toBeGreaterThan(10);
        expect(title.length).toBeLessThanOrEqual(70);
        expect(description.length).toBeGreaterThanOrEqual(50);
        expect(description.length).toBeLessThanOrEqual(160);
        const others = indexable.filter((page) => page.id !== id).map((page) => docs[page.id].doc.title);
        expect(others).not.toContain(title);
    });

    it.each(indexable)("$id has an absolute canonical URL matching its path, and Open Graph tags", ({ id, path }) => {
        const { doc } = docs[id];
        expect(doc.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(site.url + path);
        expect(doc.querySelector('meta[property="og:url"]')?.content).toBe(site.url + path);
        for (const property of ["og:title", "og:description", "og:type", "og:site_name"]) {
            expect(doc.querySelector(`meta[property="${property}"]`)?.content, property).toBeTruthy();
        }
    });

    it.each(pages)("$id has lang, viewport, favicon, one <main>, and at most one <h1>", ({ id }) => {
        const { doc } = docs[id];
        expect(doc.documentElement.lang).toBe("en");
        expect(doc.querySelector('meta[name="viewport"]')).not.toBeNull();
        expect(doc.querySelector('link[rel="icon"]')).not.toBeNull();
        expect(doc.querySelectorAll("main").length).toBe(1);
        expect(doc.querySelectorAll("h1").length).toBeLessThanOrEqual(1);
        if (id !== "post") expect(doc.querySelectorAll("h1").length).toBe(1);
    });

    it.each(pages)("$id has valid JSON-LD (if any)", ({ id }) => {
        docs[id].doc.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
            const data = JSON.parse(script.textContent);
            expect(data["@context"]).toBe("https://schema.org");
            expect(script.textContent).not.toContain("%SITE_");
        });
    });

    it("404 page is not indexable", () => {
        expect(docs.notFound.doc.querySelector('meta[name="robots"]')?.content).toBe("noindex");
    });

    it("emits robots.txt, sitemap.xml and feed.xml with absolute URLs", () => {
        const robots = readFileSync(join(outDir, "robots.txt"), "utf8");
        expect(robots).toContain(`Sitemap: ${site.url}/sitemap.xml`);

        const sitemap = new DOMParser().parseFromString(readFileSync(join(outDir, "sitemap.xml"), "utf8"), "application/xml");
        const locations = [...sitemap.querySelectorAll("loc")].map((node) => node.textContent);
        expect(sitemap.querySelector("parsererror")).toBeNull();
        expect(locations).toContain(`${site.url}/blog/`);
        expect(locations.some((url) => url.includes("/blog/post/?slug="))).toBe(true);
        expect(locations).not.toContain(`${site.url}/404.html`);
        locations.forEach((url) => expect(url.startsWith(site.url)).toBe(true));

        const feed = new DOMParser().parseFromString(readFileSync(join(outDir, "feed.xml"), "utf8"), "application/xml");
        expect(feed.querySelector("parsererror")).toBeNull();
        expect(feed.querySelectorAll("item").length).toBeGreaterThan(0);
    });

    it("every internal link and asset resolves to a built file", () => {
        const broken = [];
        for (const page of pages) {
            const { doc } = docs[page.id];
            const refs = [...doc.querySelectorAll("a[href], link[href], script[src]")].map((node) => node.getAttribute("href") ?? node.getAttribute("src"));
            for (const ref of refs) {
                if (!ref.startsWith("/") || ref.startsWith("//") || ref.startsWith("/#")) continue;
                const path = ref.split(/[?#]/)[0];
                const file = path.endsWith("/") ? `${path}index.html` : path;
                if (!existsSync(join(outDir, file))) broken.push(`${page.file} → ${ref}`);
            }
        }
        expect(broken).toEqual([]);
    });

    it.each(pages)("$id links the built stylesheet", ({ id }) => {
        expect(docs[id].doc.querySelector('link[rel="stylesheet"]')?.getAttribute("href"))
            .toMatch(/^\/assets\/.+\.css$/);
    });
});

describe("security", () => {
    it.each(pages)("$id ships a strict Content-Security-Policy", ({ id }) => {
        const csp = docs[id].doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content ?? "";
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("object-src 'none'");
        expect(csp).toContain("base-uri 'self'");
        expect(csp).not.toContain("unsafe-inline");
        expect(csp).not.toContain("unsafe-eval");
    });

    it.each(pages)("$id loads no third-party scripts/styles and has no inline scripts or handlers", ({ id }) => {
        const { doc, html } = docs[id];
        doc.querySelectorAll("script").forEach((script) => {
            if (script.type === "application/ld+json") return;
            expect(script.getAttribute("src"), "inline script").toBeTruthy();
            expect(script.getAttribute("src").startsWith("/")).toBe(true);
        });
        doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => expect(link.getAttribute("href").startsWith("/")).toBe(true));
        expect(html).not.toMatch(/\son[a-z]+\s*=/i);
        expect(html).not.toMatch(/\sstyle\s*=/i);
        expect(html).not.toMatch(/cdn\.tailwindcss|unpkg\.com|fonts\.googleapis/);
    });

    it.each(pages)("$id opens external links safely", ({ id }) => {
        docs[id].doc.querySelectorAll('a[target="_blank"]').forEach((link) => {
            expect(link.rel).toContain("noopener");
            expect(link.rel).toContain("noreferrer");
        });
    });

    it.each(pages)("$id leaves no unresolved build placeholders", ({ id }) => {
        expect(docs[id].html).not.toMatch(/@include|%SITE_|%YEAR%/);
    });

    it("bundled JavaScript has no innerHTML/eval sinks or secrets", () => {
        const offenders = [];
        for (const file of walk(join(outDir, "assets"), (path) => path.endsWith(".js"))) {
            const source = readFileSync(file, "utf8");
            if (/\beval\(|new Function\(/.test(source)) offenders.push(`${file}: eval`);
            if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}/.test(source)) offenders.push(`${file}: secret`);
        }
        for (const file of walk(join(root, "src"), (path) => path.endsWith(".js"))) {
            const source = readFileSync(file, "utf8");
            if (/\.innerHTML\s*=|insertAdjacentHTML|document\.write/.test(source)) offenders.push(`${file}: HTML sink`);
        }
        expect(offenders).toEqual([]);
    });

    it("does not publish source maps or env files", () => {
        const files = walk(outDir).map((file) => file.slice(outDir.length + 1).replaceAll("\\", "/"));
        expect(files.filter((file) => /\.map$|(^|\/)\.env/.test(file))).toEqual([]);
    });
});
