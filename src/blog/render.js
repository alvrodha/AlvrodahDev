/**
 * DOM renderers for blog content. Everything is built with createElement +
 * textContent, so post data (including future API data) cannot inject markup.
 */
import { postPath } from "../../site.config.js";
import { el } from "../core/dom.js";
import { formatDate, t } from "../core/i18n.js";

function meta(post) {
    return el("p", { className: "post-card__meta" }, [
        el("time", { text: formatDate(post.publishedAt), attrs: { datetime: post.publishedAt } }),
        el("span", { text: t("blog.minRead", { minutes: post.readingMinutes }) }),
    ]);
}

function tagList(tags, { className = "post-card__tags" } = {}) {
    if (!tags.length) return null;
    return el(
        "ul",
        { className, attrs: { "aria-label": t("blog.tagsLabel") } },
        tags.map((tag) =>
            el("li", {}, [
                el("a", {
                    className: "component-card__tag relative z-10 hover:text-raw-accent",
                    text: `#${tag}`,
                    attrs: { href: `/blog/?tag=${encodeURIComponent(tag)}` },
                }),
            ]),
        ),
    );
}

/** @param {import("./model.js").PostSummary} post */
export function renderPostCard(post, { headingLevel = 2 } = {}) {
    return el("article", { className: "post-card", attrs: { lang: post.language } }, [
        meta(post),
        el(`h${headingLevel}`, {}, [el("a", { text: post.title, attrs: { href: postPath(post.slug) } })]),
        el("p", { className: "post-card__excerpt", text: post.excerpt }),
        tagList(post.tags),
    ]);
}

export function renderSkeletonCards(count = 3) {
    return Array.from({ length: count }, () =>
        el("div", { className: "post-card", attrs: { "aria-hidden": "true" } }, [
            el("div", { className: "skeleton h-3 w-32" }),
            el("div", { className: "skeleton h-7 w-full" }),
            el("div", { className: "skeleton h-3 w-full" }),
            el("div", { className: "skeleton h-3 w-4/5" }),
        ]),
    );
}

/** @param {import("./model.js").Block[]} blocks */
export function renderBlocks(blocks) {
    const fragment = document.createDocumentFragment();
    blocks.forEach((block) => {
        switch (block.type) {
            case "p":
            case "h2":
            case "h3":
                fragment.append(el(block.type, { text: block.text }));
                break;
            case "quote":
                fragment.append(el("blockquote", {}, [el("p", { text: block.text })]));
                break;
            case "ul":
            case "ol":
                fragment.append(el(block.type, {}, block.items.map((item) => el("li", { text: item }))));
                break;
            case "code":
                fragment.append(
                    el("pre", { attrs: { "data-language": block.language || null } }, [
                        el("code", { text: block.text, className: block.language ? `language-${block.language}` : "" }),
                    ]),
                );
                break;
            default:
                break;
        }
    });
    return fragment;
}

/** @param {import("./model.js").Post} post */
export function renderPost(post) {
    const header = el("header", { className: "space-y-4 mb-10 pb-8 border-b border-raw-border" }, [
        el("p", { className: "post-card__meta" }, [
            el("span", { text: t("post.publishedOn") }),
            el("time", { text: formatDate(post.publishedAt), attrs: { datetime: post.publishedAt } }),
            el("span", { text: "·" }),
            el("span", { text: t("blog.minRead", { minutes: post.readingMinutes }) }),
        ]),
        el("h1", { className: "text-3xl sm:text-5xl font-extrabold text-raw-strong leading-tight", text: post.title }),
        el("p", { className: "font-mono text-raw-dim leading-relaxed", text: post.excerpt }),
        el("p", { className: "font-mono text-xs text-raw-dim", text: t("post.by", { author: post.author }) }),
        tagList(post.tags, { className: "post-card__tags" }),
    ]);

    const children = [header];
    if (post.isFallback) {
        children.push(
            el("p", {
                className: "font-mono text-xs p-3 mb-8 border border-raw-accent2 text-raw-accent2",
                text: t("post.languageNotice"),
                attrs: { role: "note" },
            }),
        );
    }

    const body = el("div", { className: "prose-raw", attrs: { lang: post.language } });
    body.append(renderBlocks(post.body));
    children.push(body);

    if (post.updatedAt && post.updatedAt !== post.publishedAt) {
        children.push(
            el("p", { className: "font-mono text-xs text-raw-dim mt-10" }, [
                el("span", { text: `${t("post.updatedOn")} ` }),
                el("time", { text: formatDate(post.updatedAt), attrs: { datetime: post.updatedAt } }),
            ]),
        );
    }
    return children;
}
