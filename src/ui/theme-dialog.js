/**
 * Theme customizer modal (native <dialog>: focus trap, Escape and backdrop are built in).
 * Changes preview live; they are persisted through `onChange` → prefs cookie.
 */
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { DEFAULT_THEME, PRESETS, buildPalette, contrastRatio, normalizeTheme } from "../core/theme.js";

export function initThemeDialog({ getTheme, onPreview, onChange }) {
    const dialog = document.getElementById("theme-dialog");
    const trigger = document.getElementById("theme-button");
    const presetsContainer = document.getElementById("theme-presets");
    const accentInput = document.getElementById("theme-accent");
    const accent2Input = document.getElementById("theme-accent2");
    const baseInputs = [...document.querySelectorAll('input[name="theme-base"]')];
    const contrastOutput = document.getElementById("theme-contrast");
    const resetButton = document.getElementById("theme-reset");
    if (!dialog || !trigger || !presetsContainer) return { refresh() {} };

    const presetIds = [...Object.keys(PRESETS), "custom"];
    const presetButtons = presetIds.map((id) => {
        const palette = id === "custom" ? null : buildPalette({ preset: id });
        const swatches = palette
            ? el("span", { className: "theme-preset__swatches", attrs: { "aria-hidden": "true" } },
                ["bg", "panel", "accent", "accent2"].map((token) => {
                    const swatch = el("span");
                    swatch.style.background = palette[token];
                    return swatch;
                }))
            : el("span", { className: "theme-preset__swatches theme-preset__swatches--custom", attrs: { "aria-hidden": "true" } }, [
                el("span", { className: "bg-linear-to-r from-raw-accent to-raw-accent2" }),
            ]);
        return el("button", { className: "theme-preset", attrs: { type: "button", "aria-pressed": "false" }, dataset: { preset: id } }, [
            swatches,
            el("span", { className: "text-xs", dataset: { i18n: `theme.presets.${id}` }, text: t(`theme.presets.${id}`) }),
        ]);
    });
    presetsContainer.replaceChildren(...presetButtons);

    function customFromInputs() {
        return normalizeTheme({
            preset: "custom",
            base: baseInputs.find((input) => input.checked)?.value ?? "dark",
            accent: accentInput.value,
            accent2: accent2Input.value,
        });
    }

    function refresh() {
        const theme = getTheme();
        const palette = buildPalette(theme);
        presetButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.preset === theme.preset)));
        accentInput.value = palette.accent;
        accent2Input.value = palette.accent2;
        baseInputs.forEach((input) => {
            input.checked = input.value === palette.base;
        });

        const ratio = contrastRatio(palette.accent, palette.bg);
        const key = ratio >= 4.5 ? "theme.contrastGood" : ratio >= 3 ? "theme.contrastLarge" : "theme.contrastLow";
        contrastOutput.textContent = t(key, { ratio: ratio.toFixed(1) });
    }

    presetsContainer.addEventListener("click", (event) => {
        const button = event.target.closest("[data-preset]");
        if (!button) return;
        onChange(button.dataset.preset === "custom" ? customFromInputs() : { preset: button.dataset.preset });
        refresh();
    });

    // `input` fires continuously while dragging → preview only; `change` commits.
    [accentInput, accent2Input].forEach((input) => {
        input.addEventListener("input", () => onPreview(customFromInputs()));
        input.addEventListener("change", () => {
            onChange(customFromInputs());
            refresh();
        });
    });
    baseInputs.forEach((input) =>
        input.addEventListener("change", () => {
            onChange(customFromInputs());
            refresh();
        }),
    );

    resetButton?.addEventListener("click", () => {
        onChange({ ...DEFAULT_THEME });
        refresh();
    });

    trigger.addEventListener("click", () => {
        refresh();
        dialog.showModal();
    });

    // Click on the backdrop closes the dialog.
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => trigger.focus());

    return { refresh };
}
