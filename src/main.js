/**
 * Shared entry point for every page. Initializes the layout (theme, language,
 * navigation, icons) and lazy-loads the module for the current page, picked from
 * <body data-page="…">, so each page only downloads the code it needs.
 */
import "./styles/main.css";
import { initAnalytics } from "./core/analytics.js";
import { renderIcons } from "./core/icons.js";
import { LANGUAGE_EVENT, detectLanguage, setLanguage } from "./core/i18n.js";
import { readPrefs, savePrefs } from "./core/prefs.js";
import { DEFAULT_THEME, applyPalette, buildPalette, normalizeTheme } from "./core/theme.js";
import { initLanguageMenu } from "./ui/language-menu.js";
import { initClock, initNav } from "./ui/nav.js";
import { initThemeDialog } from "./ui/theme-dialog.js";

const pageModules = {
    home: () => import("./pages/home.js"),
    library: () => import("./pages/library.js"),
    terminal: () => import("./pages/terminal.js"),
    contact: () => import("./pages/contact.js"),
    blog: () => import("./pages/blog-list.js"),
    post: () => import("./pages/blog-post.js"),
};

async function start() {
    initAnalytics();

    const prefs = readPrefs();
    let theme = normalizeTheme(prefs.theme ?? DEFAULT_THEME);
    applyPalette(buildPalette(theme));

    const themeDialog = initThemeDialog({
        getTheme: () => theme,
        onPreview: (preview) => applyPalette(buildPalette(preview)),
        onChange: (next) => {
            theme = normalizeTheme(next);
            applyPalette(buildPalette(theme));
            savePrefs({ theme });
        },
    });

    const languageMenu = initLanguageMenu({
        onSelect: async (language) => {
            savePrefs({ lang: language });
            await setLanguage(language);
        },
    });

    window.addEventListener(LANGUAGE_EVENT, () => {
        languageMenu.update();
        themeDialog.refresh();
    });

    initNav();
    initClock();
    renderIcons();

    // Language must be resolved before page modules render translated content.
    await setLanguage(detectLanguage(prefs.lang));

    const page = document.body.dataset.page;
    if (Object.hasOwn(pageModules, page)) {
        const module = await pageModules[page]();
        await module.init?.();
        renderIcons();
    }
}

start().catch((error) => {
    document.documentElement.classList.remove("i18n-pending");
    console.error(error);
});
