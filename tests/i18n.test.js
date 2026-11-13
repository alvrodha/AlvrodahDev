import { afterEach, describe, expect, it } from "vitest";
import { pages } from "../site.config.js";
import en from "../src/locales/en.js";
import es from "../src/locales/es.js";
import fr from "../src/locales/fr.js";
import de from "../src/locales/de.js";
import { applyTranslations, detectLanguage, formatDate, setLanguage, t } from "../src/core/i18n.js";
import { flatten, read, root, walk } from "./helpers.js";

const locales = { es, fr, de };
const englishKeys = new Map(flatten(en));
const placeholders = (value) => [...String(value).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("locale files", () => {
    it.each(Object.keys(locales))("%s has exactly the same keys as English", (code) => {
        const keys = flatten(locales[code]).map(([key]) => key).sort();
        expect(keys).toEqual([...englishKeys.keys()].sort());
    });

    it.each(Object.keys(locales))("%s keeps every {placeholder} and has no empty strings", (code) => {
        for (const [key, value] of flatten(locales[code])) {
            expect(typeof value, key).toBe("string");
            expect(value.trim(), key).not.toBe("");
            expect(placeholders(value), key).toEqual(placeholders(englishKeys.get(key)));
        }
    });

    it("never contains HTML markup (translations are rendered as text)", () => {
        for (const locale of [en, ...Object.values(locales)]) {
            for (const [key, value] of flatten(locale)) {
                expect(value, key).not.toMatch(/<\/?[a-z][^>]*>/i);
            }
        }
    });
});

describe("translation keys used in markup and code", () => {
    const htmlFiles = [...pages.map((page) => page.file), ...walk(`${root}/partials`).map((file) => file.slice(root.length + 1))];

    it("every data-i18n / data-i18n-attr key exists in English", () => {
        const missing = [];
        for (const file of htmlFiles) {
            const html = read(file);
            for (const [, key] of html.matchAll(/data-i18n="([^"]+)"/g)) {
                if (!englishKeys.has(key)) missing.push(`${file}: ${key}`);
            }
            for (const [, pairs] of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
                for (const pair of pairs.split(";")) {
                    const key = pair.split(":")[1]?.trim();
                    if (!englishKeys.has(key)) missing.push(`${file}: ${key}`);
                }
            }
        }
        expect(missing).toEqual([]);
    });

    it("every static t('…') key used in JavaScript exists in English", () => {
        const missing = [];
        for (const file of walk(`${root}/src`, (path) => path.endsWith(".js"))) {
            const source = read(file.slice(root.length + 1));
            for (const [, key] of source.matchAll(/\bt\(\s*"([\w.-]+)"/g)) {
                if (!englishKeys.has(key)) missing.push(`${file}: ${key}`);
            }
        }
        expect(missing).toEqual([]);
    });
});

describe("i18n runtime", () => {
    afterEach(async () => {
        await setLanguage("en");
        document.body.replaceChildren();
    });

    it("interpolates placeholders and falls back to the key", () => {
        expect(t("blog.minRead", { minutes: 4 })).toBe("4 min read");
        expect(t("does.not.exist")).toBe("does.not.exist");
    });

    it("detects the language from the saved preference, then the browser", () => {
        expect(detectLanguage("fr", ["es-ES"])).toBe("fr");
        expect(detectLanguage(undefined, ["pt-BR", "de-AT"])).toBe("de");
        expect(detectLanguage("xx", ["ja"])).toBe("en");
        expect(detectLanguage("__proto__", [])).toBe("en");
    });

    it("translates text and attributes, updates <html lang>, and lazy-loads locales", async () => {
        document.body.innerHTML = `
            <h1 data-i18n="nav.blog">BLOG</h1>
            <input data-i18n-attr="placeholder:blog.searchPlaceholder;aria-label:blog.searchLabel">`;
        await setLanguage("es");
        expect(document.documentElement.lang).toBe("es");
        expect(document.querySelector("h1").textContent).toBe("BLOG");
        expect(document.querySelector("input").placeholder).toBe("Buscar artículos...");
        expect(document.querySelector("input").getAttribute("aria-label")).toBe("Buscar artículos");
        expect(t("nav.home")).toBe("INICIO");
    });

    it("refuses to set event-handler attributes through data-i18n-attr", () => {
        document.body.innerHTML = `<button data-i18n-attr="onclick:nav.home;ONmouseover:nav.home"></button>`;
        applyTranslations();
        const button = document.querySelector("button");
        expect(button.getAttribute("onclick")).toBeNull();
        expect(button.getAttribute("onmouseover")).toBeNull();
    });

    it("falls back to English for unsupported languages", async () => {
        expect(await setLanguage("xx")).toBe("en");
    });

    it("formats dates per language and tolerates invalid input", () => {
        expect(formatDate("2026-11-13", "en")).toBe("November 13, 2026");
        expect(formatDate("2026-11-13", "es")).toBe("13 de noviembre de 2026");
        expect(formatDate("not-a-date", "en")).toBe("not-a-date");
    });
});
