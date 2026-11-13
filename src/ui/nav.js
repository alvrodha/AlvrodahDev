import { t } from "../core/i18n.js";

export function initNav() {
    const button = document.getElementById("mobile-menu-btn");
    const menu = document.getElementById("mobile-menu");

    const setOpen = (open) => {
        if (!button || !menu) return;
        menu.hidden = !open;
        button.setAttribute("aria-expanded", String(open));
        button.setAttribute("aria-label", t(open ? "nav.closeMenu" : "nav.menu"));
    };

    button?.addEventListener("click", () => setOpen(menu?.hidden ?? false));
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && menu && !menu.hidden) {
            setOpen(false);
            button?.focus();
        }
    });
    window.matchMedia("(min-width: 768px)").addEventListener("change", (event) => {
        if (event.matches) setOpen(false);
    });
}

export function initClock() {
    const clock = document.getElementById("live-clock");
    if (!clock) return;
    const tick = () => {
        clock.textContent = `${new Date().toISOString().slice(11, 19)} UTC`;
    };
    tick();
    setInterval(tick, 1000);
}
