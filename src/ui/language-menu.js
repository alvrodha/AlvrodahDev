/**
 * Accessible language dropdown (WAI-ARIA menu button with menuitemradio items).
 * Keyboard: Enter/Space/ArrowDown opens, Arrow keys move, Home/End jump, Escape closes.
 */
import { site } from "../../site.config.js";
import { el } from "../core/dom.js";
import { getLanguage } from "../core/i18n.js";

export function initLanguageMenu({ onSelect }) {
    const button = document.getElementById("lang-button");
    const menu = document.getElementById("lang-menu");
    const current = document.getElementById("lang-current");
    if (!button || !menu) return { update() {} };

    const items = site.languages.map((language) =>
        el("li", { attrs: { role: "none" } }, [
            el(
                "button",
                {
                    className: "lang-menu__item",
                    attrs: { type: "button", role: "menuitemradio", lang: language.code, tabindex: "-1" },
                    dataset: { lang: language.code },
                },
                [el("span", { text: language.label }), el("span", { className: "text-raw-dim", text: language.short })],
            ),
        ]),
    );
    menu.replaceChildren(...items);
    const buttons = items.map((item) => item.firstElementChild);

    const isOpen = () => !menu.hidden;
    const focusItem = (index) => buttons[(index + buttons.length) % buttons.length]?.focus();

    function open(focusIndex) {
        menu.hidden = false;
        button.setAttribute("aria-expanded", "true");
        const selected = buttons.findIndex((item) => item.dataset.lang === getLanguage());
        focusItem(focusIndex ?? Math.max(selected, 0));
    }

    function close({ restoreFocus = true } = {}) {
        if (!isOpen()) return;
        menu.hidden = true;
        button.setAttribute("aria-expanded", "false");
        if (restoreFocus) button.focus();
    }

    function update() {
        const language = getLanguage();
        buttons.forEach((item) => item.setAttribute("aria-checked", String(item.dataset.lang === language)));
        if (current) current.textContent = site.languages.find((item) => item.code === language)?.short ?? language;
    }

    button.addEventListener("click", () => (isOpen() ? close() : open()));
    button.addEventListener("keydown", (event) => {
        if (["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            open(event.key === "ArrowUp" ? buttons.length - 1 : undefined);
        }
    });

    menu.addEventListener("click", (event) => {
        const item = event.target.closest("[data-lang]");
        if (!item) return;
        close();
        onSelect(item.dataset.lang);
    });

    menu.addEventListener("keydown", (event) => {
        const index = buttons.indexOf(document.activeElement);
        const actions = {
            ArrowDown: () => focusItem(index + 1),
            ArrowUp: () => focusItem(index - 1),
            Home: () => focusItem(0),
            End: () => focusItem(buttons.length - 1),
            Escape: () => close(),
            Tab: () => close({ restoreFocus: false }),
        };
        if (actions[event.key]) {
            if (event.key !== "Tab") event.preventDefault();
            actions[event.key]();
        }
    });

    document.addEventListener("click", (event) => {
        if (isOpen() && !menu.contains(event.target) && !button.contains(event.target)) close({ restoreFocus: false });
    });

    update();
    return { update };
}
