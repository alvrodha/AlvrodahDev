/** Creates an element. Text is always assigned with textContent (never parsed as HTML). */
export function el(tagName, options = {}, children = []) {
    const element = document.createElement(tagName);
    const { className, text, attrs, dataset } = options;
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    Object.entries(attrs ?? {}).forEach(([name, value]) => {
        if (value !== undefined && value !== null && value !== false) element.setAttribute(name, String(value));
    });
    Object.assign(element.dataset, dataset ?? {});
    element.append(...children.filter(Boolean));
    return element;
}

/** Only allows http(s), mailto, and same-origin relative URLs. Anything else becomes "#". */
export function safeUrl(value) {
    try {
        const url = new URL(String(value), window.location.origin);
        return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : "#";
    } catch {
        return "#";
    }
}

export async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const temporaryInput = document.createElement("textarea");
    temporaryInput.value = text;
    temporaryInput.setAttribute("readonly", "");
    temporaryInput.style.position = "fixed";
    temporaryInput.style.opacity = "0";
    document.body.append(temporaryInput);
    let copied = false;
    try {
        temporaryInput.select();
        copied = document.execCommand("copy");
    } finally {
        temporaryInput.remove();
    }

    if (!copied) throw new Error("Clipboard access is unavailable.");
}

/** Sets or creates a <meta> tag in <head>. `attr` is "name" or "property". */
export function setMeta(attr, key, content) {
    let meta = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, key);
        document.head.append(meta);
    }
    meta.setAttribute("content", content);
}

export function setCanonical(href) {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.append(link);
    }
    link.href = href;
}

/** Replaces the page's JSON-LD block with `data`. JSON.stringify output is escaped so `</script>` cannot break out. */
export function setJsonLd(id, data) {
    let script = document.getElementById(id);
    if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.id = id;
        document.head.append(script);
    }
    script.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
}
