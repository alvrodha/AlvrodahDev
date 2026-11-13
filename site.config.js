/**
 * Single source of truth for site-wide settings.
 * Imported by both the Vite build (Node) and the browser bundle, so keep it
 * free of Node-only or browser-only APIs.
 */
export const site = {
    /** Canonical origin, without a trailing slash. Used for canonical URLs, Open Graph, and the sitemap. */
    url: "https://www.alvrodahdev.com",
    name: "alvrodahDev",
    author: "Álvaro (alvrodah)",
    email: "contact@alvrodah.dev",
    github: "https://github.com/alvrodha",
    linkedin: "https://www.linkedin.com/in/alvrodah",
    gtmId: "GTM-N92NM2HC",
    defaultLanguage: "en",
    languages: [
        { code: "en", label: "English", short: "EN" },
        { code: "es", label: "Español", short: "ES" },
        { code: "fr", label: "Français", short: "FR" },
        { code: "de", label: "Deutsch", short: "DE" },
    ],
};

/**
 * Multi-page map. `file` is the HTML entry relative to the project root,
 * `path` is the public URL. Pages with `sitemap: false` are excluded from sitemap.xml.
 */
export const pages = [
    { id: "home", file: "index.html", path: "/", priority: "1.0", changefreq: "monthly" },
    { id: "about", file: "about/index.html", path: "/about/", priority: "0.8", changefreq: "monthly" },
    { id: "library", file: "library/index.html", path: "/library/", priority: "0.8", changefreq: "weekly" },
    { id: "blog", file: "blog/index.html", path: "/blog/", priority: "0.9", changefreq: "weekly" },
    { id: "post", file: "blog/post/index.html", path: "/blog/post/", sitemap: false },
    { id: "terminal", file: "terminal/index.html", path: "/terminal/", priority: "0.5", changefreq: "yearly" },
    { id: "contact", file: "contact/index.html", path: "/contact/", priority: "0.7", changefreq: "yearly" },
    { id: "notFound", file: "404.html", path: "/404.html", sitemap: false },
];

/** Public URL of a blog post. Keep in sync with the blog router in src/pages/blog-post.js. */
export function postPath(slug) {
    return `/blog/post/?slug=${encodeURIComponent(slug)}`;
}
