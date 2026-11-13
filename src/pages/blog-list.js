/**
 * Blog index. Filter state (tag, search, page) lives in the URL query string so
 * every view is shareable/bookmarkable and pagination uses real crawlable links.
 */
import { blog } from "../blog/service.js";
import { renderPostCard, renderSkeletonCards } from "../blog/render.js";
import { normalizeQuery } from "../blog/model.js";
import { el } from "../core/dom.js";
import { LANGUAGE_EVENT, getLanguage, t } from "../core/i18n.js";

function readState() {
    const params = new URLSearchParams(window.location.search);
    return normalizeQuery({ page: params.get("page"), tag: params.get("tag"), query: params.get("q") ?? "" });
}

function stateUrl({ page, tag, query }) {
    const params = new URLSearchParams();
    if (tag) params.set("tag", tag);
    if (query) params.set("q", query);
    if (page > 1) params.set("page", String(page));
    const search = params.toString();
    return `${window.location.pathname}${search ? `?${search}` : ""}`;
}

export async function init() {
    const list = document.getElementById("blog-list");
    const status = document.getElementById("blog-status");
    const tagsContainer = document.getElementById("blog-tags");
    const pagination = document.getElementById("blog-pagination");
    const searchForm = document.getElementById("blog-search-form");
    const searchInput = document.getElementById("blog-search");
    if (!list || !status) return;

    let state = readState();
    let tags = [];
    let requestId = 0;
    if (searchInput) searchInput.value = state.query;

    function renderTags() {
        if (!tagsContainer) return;
        const options = [null, ...tags];
        tagsContainer.replaceChildren(
            ...options.map((tag) => {
                const active = state.tag === tag;
                const button = el("button", {
                    className: `blog-tag${active ? " is-active" : ""}`,
                    text: tag ? `#${tag}` : t("blog.allTags"),
                    attrs: { type: "button", "aria-pressed": String(active) },
                });
                button.addEventListener("click", () => navigate({ ...state, tag, page: 1 }));
                return button;
            }),
        );
    }

    function renderPagination({ page, totalPages }) {
        if (!pagination) return;
        pagination.hidden = totalPages <= 1;
        if (totalPages <= 1) return pagination.replaceChildren();

        const link = (targetPage, labelKey, rel) => {
            if (targetPage < 1 || targetPage > totalPages) {
                return el("span", { className: "text-raw-border", text: t(labelKey), attrs: { "aria-disabled": "true" } });
            }
            const anchor = el("a", { className: "btn-secondary !py-2 !px-4", text: t(labelKey), attrs: { href: stateUrl({ ...state, page: targetPage }), rel } });
            anchor.addEventListener("click", (event) => {
                event.preventDefault();
                navigate({ ...state, page: targetPage });
                document.getElementById("main")?.scrollIntoView({ block: "start" });
            });
            return anchor;
        };

        pagination.replaceChildren(
            link(page - 1, "blog.prev", "prev"),
            el("span", { className: "text-raw-dim", text: t("blog.pageOf", { page, total: totalPages }) }),
            link(page + 1, "blog.next", "next"),
        );
    }

    async function load() {
        const current = ++requestId;
        list.setAttribute("aria-busy", "true");
        list.replaceChildren(...renderSkeletonCards(3));
        status.textContent = t("blog.loading");

        try {
            const result = await blog.listPosts({ language: getLanguage(), ...state });
            if (current !== requestId) return; // a newer request superseded this one

            if (state.page > result.totalPages) {
                navigate({ ...state, page: result.totalPages });
                return;
            }

            list.replaceChildren(
                ...(result.items.length
                    ? result.items.map((post) => renderPostCard(post))
                    : [el("p", { className: "font-mono text-sm text-raw-dim col-span-full", text: t("blog.empty") })]),
            );
            const rule = new Intl.PluralRules(getLanguage()).select(result.total) === "one" ? "one" : "other";
            status.textContent = t(`blog.results.${rule}`, { count: result.total });
            renderPagination(result);
        } catch (error) {
            if (current !== requestId) return;
            console.error(error);
            const retry = el("button", { className: "btn-secondary !py-2 !px-4 mt-4", text: t("blog.retry"), attrs: { type: "button" } });
            retry.addEventListener("click", load);
            list.replaceChildren(el("div", { className: "col-span-full font-mono text-sm text-raw-accent2" }, [el("p", { text: t("blog.error") }), retry]));
            status.textContent = "";
        } finally {
            if (current === requestId) list.setAttribute("aria-busy", "false");
        }
    }

    function navigate(next, { replace = false } = {}) {
        state = normalizeQuery(next);
        const url = stateUrl(state);
        if (url !== `${window.location.pathname}${window.location.search}`) {
            history[replace ? "replaceState" : "pushState"](null, "", url);
        }
        renderTags();
        load();
    }

    let debounce;
    searchInput?.addEventListener("input", () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => navigate({ ...state, query: searchInput.value, page: 1 }, { replace: true }), 250);
    });
    searchForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        clearTimeout(debounce);
        navigate({ ...state, query: searchInput?.value ?? "", page: 1 });
    });

    window.addEventListener("popstate", () => {
        state = readState();
        if (searchInput) searchInput.value = state.query;
        renderTags();
        load();
    });

    window.addEventListener(LANGUAGE_EVENT, () => {
        renderTags();
        load();
    });

    try {
        tags = await blog.listTags();
    } catch (error) {
        console.error(error);
    }
    renderTags();
    await load();
}
