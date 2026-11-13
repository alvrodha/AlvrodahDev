/**
 * Minimal i18n runtime.
 *
 * Markup conventions (all values are written with textContent / setAttribute, never innerHTML):
 *   <h1 data-i18n="home.title">Fallback English text</h1>
 *   <input data-i18n-attr="placeholder:contact.form.namePlaceholder;aria-label:contact.form.name">
 * `data-i18n` must only be used on elements whose children are plain text.
 *
 * English ships in the main bundle (it is also the fallback); other locales are lazy-loaded.
 */
import { site } from "../../site.config.js";
import en from "../locales/en.js";

const loaders = {
    en: async () => en,
    es: () => import("../locales/es.js").then((module) => module.default),
    fr: () => import("../locales/fr.js").then((module) => module.default),
    de: () => import("../locales/de.js").then((module) => module.default),
};

export const SUPPORTED_LANGUAGES = site.languages.map((language) => language.code);
export const LANGUAGE_EVENT = "app:languagechange";

let currentLanguage = site.defaultLanguage;
let dictionary = en;

function lookup(source, key) {
    return key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), source);
}

/** Translates `key`, falling back to English and then to the key itself. `{name}` placeholders are interpolated. */
export function t(key, vars = {}) {
    let value = lookup(dictionary, key);
    if (typeof value !== "string" && !Array.isArray(value)) value = lookup(en, key);
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return key;
    return value.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

export function getLanguage() {
    return currentLanguage;
}

/** Saved preference first, then the browser's preferred languages, then the site default. */
export function detectLanguage(saved, browserLanguages = navigator.languages ?? [navigator.language]) {
    if (SUPPORTED_LANGUAGES.includes(saved)) return saved;
    for (const tag of browserLanguages ?? []) {
        const code = String(tag).toLowerCase().split("-")[0];
        if (SUPPORTED_LANGUAGES.includes(code)) return code;
    }
    return site.defaultLanguage;
}

export function applyTranslations(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((element) => {
        const value = t(element.dataset.i18n);
        if (typeof value === "string") element.textContent = value;
    });

    root.querySelectorAll("[data-i18n-attr]").forEach((element) => {
        element.dataset.i18nAttr.split(";").forEach((pair) => {
            const [attribute, key] = pair.split(":").map((part) => part.trim());
            if (attribute && key && !attribute.toLowerCase().startsWith("on")) {
                element.setAttribute(attribute, t(key));
            }
        });
    });
}

export async function setLanguage(code) {
    const language = SUPPORTED_LANGUAGES.includes(code) ? code : site.defaultLanguage;
    try {
        dictionary = await loaders[language]();
        currentLanguage = language;
    } catch (error) {
        console.error(`Could not load the "${language}" translations.`, error);
        dictionary = en;
        currentLanguage = "en";
    }

    document.documentElement.lang = currentLanguage;
    applyTranslations();
    document.documentElement.classList.remove("i18n-pending");
    window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: { language: currentLanguage } }));
    return currentLanguage;
}

export function formatDate(isoDate, language = currentLanguage) {
    const date = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return isoDate;
    return new Intl.DateTimeFormat(language, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(date);
}
