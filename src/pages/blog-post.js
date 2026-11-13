/**
 * Single post view: /blog/post/?slug=<slug>
 * Renders the post and updates per-post SEO metadata (title, description,
 * canonical, Open Graph, BlogPosting JSON-LD).
 */
import { postPath, site } from "../../site.config.js";
import { blog } from "../blog/service.js";
import { renderPost } from "../blog/render.js";
import { el, setCanonical, setJsonLd, setMeta } from "../core/dom.js";
import { LANGUAGE_EVENT, getLanguage, t } from "../core/i18n.js";

function updateSeo(post) {
    const url = site.url + postPath(post.slug);
    document.title = `${post.title} | ${site.name}`;
    setMeta("name", "description", post.excerpt);
    setCanonical(url);
    setMeta("property", "og:url", url);
    setMeta("property", "og:title", post.title);
    setMeta("property", "og:description", post.excerpt);
    setMeta("property", "article:published_time", post.publishedAt);
    setMeta("property", "article:modified_time", post.updatedAt);
    setJsonLd("post-jsonld", {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        inLanguage: post.language,
        keywords: post.tags.join(", "),
        mainEntityOfPage: url,
        url,
        author: { "@type": "Person", name: post.author, url: `${site.url}/about/` },
        publisher: { "@id": `${site.url}/#person` },
        isPartOf: { "@id": `${site.url}/blog/#blog` },
        breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
                { "@type": "ListItem", position: 2, name: "Blog", item: `${site.url}/blog/` },
                { "@type": "ListItem", position: 3, name: post.title, item: url },
            ],
        },
    });
}

function renderNotFound(article) {
    document.title = `${t("post.notFoundTitle")} | ${site.name}`;
    setMeta("name", "robots", "noindex");
    article.replaceChildren(
        el("div", { className: "text-center space-y-4 py-12" }, [
            el("p", { className: "font-mono text-xs text-raw-accent2", text: "ERROR 404" }),
            el("h1", { className: "text-4xl font-extrabold text-raw-strong", text: t("post.notFoundTitle") }),
            el("p", { className: "font-mono text-sm text-raw-dim", text: t("post.notFoundText") }),
        ]),
    );
}

export async function init() {
    const article = document.getElementById("post");
    const breadcrumb = document.getElementById("post-breadcrumb");
    if (!article) return;
    const slug = new URLSearchParams(window.location.search).get("slug") ?? "";

    async function load() {
        article.setAttribute("aria-busy", "true");
        try {
            const post = await blog.getPost(slug, getLanguage());
            if (!post) return renderNotFound(article);
            article.lang = post.language;
            article.replaceChildren(...renderPost(post));
            if (breadcrumb) breadcrumb.textContent = post.title;
            updateSeo(post);
        } catch (error) {
            console.error(error);
            article.replaceChildren(el("p", { className: "font-mono text-sm text-raw-accent2", text: t("blog.error") }));
        } finally {
            article.setAttribute("aria-busy", "false");
        }
    }

    window.addEventListener(LANGUAGE_EVENT, load);
    await load();
}
