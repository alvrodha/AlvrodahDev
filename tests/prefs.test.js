import { afterEach, describe, expect, it, vi } from "vitest";
import { PREFS_COOKIE, clearPrefs, parsePrefsCookie, readPrefs, sanitizePrefs, savePrefs, serializePrefs } from "../src/core/prefs.js";
import { TOKENS } from "../src/core/theme.js";

const cookieOf = (value) => `other=1; ${PREFS_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; x=y`;

describe("preferences cookie: parsing & sanitizing", () => {
    it("reads a valid cookie among others", () => {
        expect(parsePrefsCookie(cookieOf({ v: 1, lang: "es", theme: { preset: "ocean" } }))).toEqual({
            lang: "es",
            theme: { preset: "ocean" },
        });
    });

    it.each([
        ["missing cookie", "foo=bar"],
        ["empty string", ""],
        ["undefined", undefined],
        ["not JSON", `${PREFS_COOKIE}=%7Bnot-json`],
        ["bad URI encoding", `${PREFS_COOKIE}=%E0%A4%A`],
        ["JSON array", cookieOf([1, 2, 3])],
        ["JSON string", cookieOf("es")],
        ["oversized", `${PREFS_COOKIE}=${"a".repeat(5000)}`],
    ])("returns {} for %s", (_, cookie) => {
        expect(parsePrefsCookie(cookie)).toEqual({});
    });

    it("drops unknown languages and unknown fields", () => {
        expect(sanitizePrefs({ lang: "xx", admin: true, theme: null })).toEqual({});
        expect(sanitizePrefs({ lang: "<script>" })).toEqual({});
    });

    it("rejects CSS injection through custom colors", () => {
        const prefs = sanitizePrefs({
            theme: { preset: "custom", base: "dark", accent: "red;background:url(https://evil.example)", accent2: "#123" },
        });
        expect(prefs.theme.accent).toMatch(/^#[0-9a-f]{6}$/);
        expect(prefs.theme.accent2).toMatch(/^#[0-9a-f]{6}$/);
        expect(JSON.stringify(prefs)).not.toContain("evil");
    });

    it("falls back to the default preset for unknown presets and prototype keys", () => {
        expect(sanitizePrefs({ theme: { preset: "nope" } }).theme).toEqual({ preset: "acid" });
        expect(sanitizePrefs({ theme: { preset: "__proto__" } }).theme).toEqual({ preset: "acid" });
        expect(sanitizePrefs({ theme: { preset: "constructor" } }).theme).toEqual({ preset: "acid" });
    });

    it("is not vulnerable to prototype pollution", () => {
        parsePrefsCookie(`${PREFS_COOKIE}=${encodeURIComponent('{"__proto__":{"polluted":true},"lang":"en"}')}`);
        expect({}.polluted).toBeUndefined();
    });
});

describe("preferences cookie: writing", () => {
    afterEach(() => {
        clearPrefs();
        vi.restoreAllMocks();
    });

    it("serializes a resolved palette so the boot script can paint early", () => {
        const payload = JSON.parse(decodeURIComponent(serializePrefs({ lang: "fr", theme: { preset: "paper" } })));
        expect(payload).toMatchObject({ v: 1, lang: "fr", theme: { preset: "paper" }, base: "light" });
        expect(Object.keys(payload.colors).sort()).toEqual([...TOKENS].sort());
        Object.values(payload.colors).forEach((color) => expect(color).toMatch(/^#[0-9a-f]{6}$/i));
    });

    it("stays well under the 4 KB cookie limit", () => {
        const value = serializePrefs({ lang: "de", theme: { preset: "custom", base: "light", accent: "#123456", accent2: "#abcdef" } });
        expect(value.length).toBeLessThan(1500);
    });

    it("writes a first-party cookie with safe attributes and merges updates", () => {
        const writes = [];
        const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
        vi.spyOn(document, "cookie", "set").mockImplementation((value) => {
            writes.push(value);
            descriptor.set.call(document, value);
        });

        savePrefs({ lang: "es" });
        const merged = savePrefs({ theme: { preset: "matrix" } });

        expect(merged).toEqual({ lang: "es", theme: { preset: "matrix" } });
        expect(readPrefs()).toEqual({ lang: "es", theme: { preset: "matrix" } });
        for (const cookie of writes) {
            expect(cookie).toMatch(new RegExp(`^${PREFS_COOKIE}=`));
            expect(cookie).toContain("Path=/");
            expect(cookie).toContain("SameSite=Lax");
            expect(cookie).toMatch(/Max-Age=31536000/);
        }
    });
});
