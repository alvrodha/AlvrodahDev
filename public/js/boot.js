/*
 * Runs synchronously in <head> before first paint to apply the saved theme and
 * hide the page briefly while a non-English language loads. Kept tiny and
 * dependency-free. The token list and cookie name must match src/core/theme.js
 * and src/core/prefs.js (enforced by tests/boot.test.js).
 */
(function () {
    "use strict";

    var COOKIE = "adev_prefs";
    var TOKENS = ["bg", "panel", "border", "deep", "text", "dim", "strong", "accent", "accent2", "ink", "string"];
    var LANGUAGES = ["en", "es", "fr", "de"];
    var HEX = /^#[0-9a-f]{6}$/i;
    var root = document.documentElement;
    var prefs = {};

    try {
        var match = document.cookie.match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([^;]{1,4096})"));
        if (match) prefs = JSON.parse(decodeURIComponent(match[1])) || {};
    } catch (error) {
        prefs = {};
    }

    if (prefs.colors && typeof prefs.colors === "object") {
        for (var i = 0; i < TOKENS.length; i += 1) {
            var value = prefs.colors[TOKENS[i]];
            if (typeof value === "string" && HEX.test(value)) {
                root.style.setProperty("--color-raw-" + TOKENS[i], value);
            }
        }
        root.setAttribute("data-base", prefs.base === "light" ? "light" : "dark");
    }

    var language = LANGUAGES.indexOf(prefs.lang) !== -1 ? prefs.lang : null;
    if (!language) {
        var preferred = navigator.languages || [navigator.language || "en"];
        for (var j = 0; j < preferred.length && !language; j += 1) {
            var code = String(preferred[j]).toLowerCase().split("-")[0];
            if (LANGUAGES.indexOf(code) !== -1) language = code;
        }
    }

    if (language && language !== "en") {
        root.lang = language;
        root.classList.add("i18n-pending");
        // Never keep the page hidden if the bundle fails to load.
        window.setTimeout(function () {
            root.classList.remove("i18n-pending");
        }, 1500);
    }
})();
