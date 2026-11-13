/**
 * Google Tag Manager loader (external module instead of an inline snippet, so the
 * Content-Security-Policy does not need 'unsafe-inline').
 *
 * NOTE (EU/GDPR): GTM tags that set analytics or advertising cookies need prior consent.
 * Configure Consent Mode or a consent banner in GTM before enabling such tags.
 */
import { site } from "../../site.config.js";

export function initAnalytics(containerId = site.gtmId) {
    if (!/^GTM-[A-Z0-9]+$/.test(containerId ?? "") || import.meta.env.DEV) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
    document.head.append(script);
}
