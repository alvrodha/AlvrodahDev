import { describe, expect, it } from "vitest";
import { PRESETS, TOKENS, applyPalette, buildPalette, contrastRatio, inkFor, normalizeTheme } from "../src/core/theme.js";
import { read } from "./helpers.js";

describe("color math", () => {
    it("computes WCAG contrast ratios", () => {
        expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
        expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
        expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
    });

    it("picks a readable ink color for any accent", () => {
        expect(inkFor("#ccff00")).toBe("#0f1012");
        expect(inkFor("#1e3a8a")).toBe("#ffffff");
    });
});

describe("palettes", () => {
    it.each(Object.keys(PRESETS))("preset %s defines every token as #rrggbb", (preset) => {
        const palette = buildPalette({ preset });
        TOKENS.forEach((token) => expect(palette[token], token).toMatch(/^#[0-9a-f]{6}$/i));
    });

    it.each(Object.keys(PRESETS))("preset %s meets WCAG AA for body text and buttons", (preset) => {
        const palette = buildPalette({ preset });
        expect(contrastRatio(palette.text, palette.bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(palette.dim, palette.bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(palette.strong, palette.bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(palette.accent, palette.bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(palette.ink, palette.accent)).toBeGreaterThanOrEqual(4.5);
    });

    it("builds custom palettes on the chosen base", () => {
        const palette = buildPalette(normalizeTheme({ preset: "custom", base: "light", accent: "#1E3A8A", accent2: "#be123c" }));
        expect(palette).toMatchObject({ base: "light", accent: "#1e3a8a", ink: "#ffffff" });
    });

    it("applies variables to <html> and ignores malformed values", () => {
        applyPalette({ ...buildPalette({ preset: "ocean" }), accent: "url(javascript:alert(1))" });
        const style = document.documentElement.style;
        expect(style.getPropertyValue("--color-raw-bg")).toBe("#0b1220");
        expect(style.getPropertyValue("--color-raw-accent")).toBe("");
        expect(document.documentElement.dataset.base).toBe("dark");
    });
});

describe("boot script stays in sync with the app", () => {
    const boot = read("public/js/boot.js");

    it("uses the same token list", () => {
        const tokens = JSON.parse(boot.match(/var TOKENS = (\[[^\]]+\])/)[1]);
        expect(tokens).toEqual(TOKENS);
    });

    it("uses the same cookie name and languages", async () => {
        const { PREFS_COOKIE } = await import("../src/core/prefs.js");
        const { site } = await import("../site.config.js");
        expect(boot).toContain(`var COOKIE = "${PREFS_COOKIE}"`);
        expect(JSON.parse(boot.match(/var LANGUAGES = (\[[^\]]+\])/)[1])).toEqual(site.languages.map((language) => language.code));
    });

    it("declares every token in the stylesheet", () => {
        const css = read("src/styles/main.css");
        TOKENS.forEach((token) => expect(css).toContain(`--color-raw-${token}:`));
    });
});
