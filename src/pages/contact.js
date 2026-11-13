/**
 * Contact form (demo). There is no backend yet, so submissions are validated
 * client-side and the visitor is pointed to email. When a backend exists, send
 * `Object.fromEntries(new FormData(form))` to it here (with server-side validation,
 * rate limiting and CSRF/anti-spam protection).
 */
import { site } from "../../site.config.js";
import { t } from "../core/i18n.js";

export function init() {
    const form = document.getElementById("contact-form");
    const status = document.getElementById("form-status");
    if (!form || !status) return;

    let timer;
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        status.textContent = t("contact.form.demo", { email: site.email });
        status.hidden = false;
        form.reset();
        clearTimeout(timer);
        timer = setTimeout(() => {
            status.hidden = true;
        }, 8000);
    });
}
