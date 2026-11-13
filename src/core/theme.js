/**
 * Theme palettes and color utilities. Pure functions, except `applyPalette`.
 * Every token maps to a CSS variable `--color-raw-<token>` declared in src/styles/main.css.
 * public/js/boot.js keeps a copy of TOKENS (verified by tests/theme.test.js).
 */
export const TOKENS = [
    "bg",
    "panel",
    "border",
    "deep",
    "text",
    "dim",
    "strong",
    "accent",
    "accent2",
    "ink",
    "string",
];

export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const BASES = {
    dark: {
        bg: "#0f1012",
        panel: "#16181d",
        border: "#2a2e37",
        deep: "#000000",
        text: "#e2e8f0",
        dim: "#8a94a6",
        strong: "#ffffff",
        string: "#fde047",
    },
    light: {
        bg: "#f4f1ea",
        panel: "#ffffff",
        border: "#d6d0c4",
        deep: "#e9e4d8",
        text: "#27272a",
        dim: "#57534e",
        strong: "#0f1012",
        string: "#92400e",
    },
};

export const BASE_NAMES = Object.keys(BASES);

/** Presets. `labelKey` is resolved through i18n (theme.presets.<id>). */
export const PRESETS = {
    acid: { base: "dark", colors: { accent: "#ccff00", accent2: "#ff3366" } },
    ocean: {
        base: "dark",
        colors: {
            bg: "#0b1220",
            panel: "#111a2e",
            border: "#22304d",
            deep: "#050a14",
            accent: "#38bdf8",
            accent2: "#f472b6",
        },
    },
    ember: {
        base: "dark",
        colors: {
            bg: "#120d0b",
            panel: "#1c1512",
            border: "#3a2a22",
            deep: "#080504",
            accent: "#ff9f1c",
            accent2: "#ff4d6d",
        },
    },
    matrix: {
        base: "dark",
        colors: {
            bg: "#050805",
            panel: "#0b120b",
            border: "#1b2e1b",
            deep: "#000000",
            text: "#d1fae5",
            dim: "#7fa88f",
            accent: "#00ff66",
            accent2: "#00c2ff",
        },
    },
    paper: { base: "light", colors: { accent: "#3f6212", accent2: "#be123c" } },
};

export const DEFAULT_THEME = Object.freeze({ preset: "acid" });

function channel(value) {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #rrggbb color. */
export function relativeLuminance(hex) {
    const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two #rrggbb colors (1–21). */
export function contrastRatio(first, second) {
    const [light, dark] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
    return (light + 0.05) / (dark + 0.05);
}

/** Picks the more readable text color to place on top of `background`. */
export function inkFor(background) {
    return contrastRatio(background, "#0f1012") >= contrastRatio(background, "#ffffff")
        ? "#0f1012"
        : "#ffffff";
}

/**
 * Normalizes a stored theme choice. Unknown or malformed values fall back to the default,
 * so tampered cookies can never inject arbitrary CSS.
 */
export function normalizeTheme(theme) {
    if (!theme || typeof theme !== "object") return { ...DEFAULT_THEME };
    if (theme.preset === "custom") {
        const base = BASE_NAMES.includes(theme.base) ? theme.base : "dark";
        const fallback = buildPalette(DEFAULT_THEME);
        return {
            preset: "custom",
            base,
            accent: HEX_COLOR.test(theme.accent) ? theme.accent.toLowerCase() : fallback.accent,
            accent2: HEX_COLOR.test(theme.accent2) ? theme.accent2.toLowerCase() : fallback.accent2,
        };
    }
    return Object.hasOwn(PRESETS, theme.preset) ? { preset: theme.preset } : { ...DEFAULT_THEME };
}

/** Resolves a theme choice into a complete token → color map. */
export function buildPalette(theme) {
    const choice = theme?.preset === "custom" ? theme : normalizeTheme(theme);
    let colors;
    let base;

    if (choice.preset === "custom") {
        base = BASE_NAMES.includes(choice.base) ? choice.base : "dark";
        colors = { ...BASES[base], accent: choice.accent, accent2: choice.accent2 };
    } else {
        const preset = PRESETS[choice.preset];
        base = preset.base;
        colors = { ...BASES[base], ...preset.colors };
    }

    return { ...colors, ink: inkFor(colors.accent), base };
}

/** Writes the palette to CSS variables on <html>. */
export function applyPalette(palette, root = document.documentElement) {
    TOKENS.forEach((token) => {
        if (HEX_COLOR.test(palette[token] ?? "")) {
            root.style.setProperty(`--color-raw-${token}`, palette[token]);
        }
    });
    root.dataset.base = palette.base === "light" ? "light" : "dark";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", palette.bg);
}
