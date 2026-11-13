/**
 * User preferences (language + theme) persisted in a first-party cookie.
 *
 * A cookie (rather than localStorage) is used so a future backend can read the
 * preference and render the right language/theme server-side. It is a functional
 * cookie set only after an explicit user choice, contains no identifiers, and is
 * never trusted blindly: every read goes through `sanitizePrefs`.
 *
 * Cookie value: encodeURIComponent(JSON.stringify({ v, lang?, theme?, base?, colors? }))
 * `colors`/`base` are a pre-resolved palette so public/js/boot.js can paint the
 * page before the module bundle loads (no flash of the default theme).
 */
import { site } from "../../site.config.js";
import { TOKENS, buildPalette, normalizeTheme } from "./theme.js";

export const PREFS_COOKIE = "adev_prefs";
export const PREFS_VERSION = 1;
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const LANGUAGE_CODES = new Set(site.languages.map((language) => language.code));

/** Keeps only known, well-formed fields. Never throws. */
export function sanitizePrefs(value) {
    const prefs = {};
    if (!value || typeof value !== "object" || Array.isArray(value)) return prefs;
    if (typeof value.lang === "string" && LANGUAGE_CODES.has(value.lang)) prefs.lang = value.lang;
    if (value.theme && typeof value.theme === "object") prefs.theme = normalizeTheme(value.theme);
    return prefs;
}

export function parsePrefsCookie(cookieString) {
    const prefix = `${PREFS_COOKIE}=`;
    const entry = String(cookieString ?? "")
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix));
    if (!entry || entry.length > 4096) return {};

    try {
        return sanitizePrefs(JSON.parse(decodeURIComponent(entry.slice(prefix.length))));
    } catch {
        return {};
    }
}

export function serializePrefs(prefs) {
    const clean = sanitizePrefs(prefs);
    const payload = { v: PREFS_VERSION, ...clean };
    if (clean.theme) {
        const palette = buildPalette(clean.theme);
        payload.base = palette.base;
        payload.colors = Object.fromEntries(TOKENS.map((token) => [token, palette[token]]));
    }
    return encodeURIComponent(JSON.stringify(payload));
}

export function readPrefs() {
    return parsePrefsCookie(document.cookie);
}

/** Merges `update` into the stored preferences and returns the sanitized result. */
export function savePrefs(update) {
    const next = sanitizePrefs({ ...readPrefs(), ...update });
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${PREFS_COOKIE}=${serializePrefs(next)}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax${secure}`;
    return next;
}

export function clearPrefs() {
    document.cookie = `${PREFS_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}
