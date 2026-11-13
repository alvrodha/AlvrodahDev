import { components } from "../data/library.js";
import { copyText, el } from "../core/dom.js";
import { LANGUAGE_EVENT, getLanguage, t } from "../core/i18n.js";

function createPreview(component) {
    const preview = el("div", {
        className: "component-preview",
        attrs: { role: "img", "aria-label": t("library.previewLabel", { title: t(`library.items.${component.id}.title`) }) },
    });

    if (component.preview === "spotlight") {
        const spotlight = el("div", { className: "library-spotlight" });
        spotlight.addEventListener("pointermove", (event) => {
            const bounds = spotlight.getBoundingClientRect();
            spotlight.style.setProperty("--x", `${event.clientX - bounds.left}px`);
            spotlight.style.setProperty("--y", `${event.clientY - bounds.top}px`);
        });
        preview.append(spotlight);
    } else if (component.preview === "aurora") {
        preview.append(...Array.from({ length: 3 }, () => el("span", { className: "library-aurora" })));
    } else if (component.preview === "login") {
        preview.append(
            el("div", { className: "library-login" }, [
                el("strong", { text: "Welcome back" }),
                el("span", { className: "library-login__field", text: "Email address" }),
                el("span", { className: "library-login__field", text: "Password" }),
                el("span", { className: "library-login__button", text: "Sign in" }),
                el("small", { text: "Visual demo only" }),
            ]),
        );
    } else if (component.preview === "button") {
        preview.append(el("span", { className: "library-glow-button", text: "Explore more" }));
    }

    preview.append(el("span", { className: "component-preview__label", text: t("library.livePreview"), attrs: { "aria-hidden": "true" } }));
    return preview;
}

function createCard(component) {
    const title = t(`library.items.${component.id}.title`);
    const description = t(`library.items.${component.id}.description`);
    const status = el("span", { className: "component-copy-status", attrs: { role: "status", "aria-live": "polite" } });
    const copyButton = el("button", { className: "component-copy", text: t("library.copy"), attrs: { type: "button" } });

    copyButton.addEventListener("click", async () => {
        status.textContent = t("library.copying");
        try {
            await copyText(component.code);
            status.textContent = t("common.copied");
        } catch {
            status.textContent = t("library.copyFailed");
        }
    });

    const card = el(
        "article",
        {
            className: "component-card",
            dataset: {
                category: component.category,
                search: [title, description, component.title, ...component.tags].join(" ").toLowerCase(),
            },
        },
        [
            el("div", { className: "component-card__content" }, [
                el("p", { className: "component-card__category", text: t(`library.filters.${component.category}`) }),
                createPreview(component),
                el("h2", { className: "text-xl font-bold text-raw-strong mb-2", text: title }),
                el("p", { className: "component-card__description", text: description }),
                el("div", { className: "component-card__tags" }, component.tags.map((tag) => el("span", { className: "component-card__tag", text: tag }))),
                el("details", { className: "component-code" }, [
                    el("summary", { text: t("library.viewSource") }),
                    el("pre", {}, [el("code", { text: component.code })]),
                ]),
                el("div", { className: "component-card__actions" }, [copyButton, status]),
            ]),
        ],
    );
    return card;
}

export function init() {
    const grid = document.getElementById("component-grid");
    const results = document.getElementById("component-results");
    const search = document.getElementById("component-search");
    const filters = [...document.querySelectorAll(".component-filter")];
    if (!grid || !results) return;

    let activeFilter = "all";
    let cards = [];

    function update() {
        const term = search?.value.trim().toLowerCase() ?? "";
        let visible = 0;
        cards.forEach((card) => {
            card.hidden = !(activeFilter === "all" || card.dataset.category === activeFilter) || !card.dataset.search.includes(term);
            if (!card.hidden) visible += 1;
        });
        const rule = new Intl.PluralRules(getLanguage()).select(visible) === "one" ? "one" : "other";
        results.textContent = t(`library.results.${rule}`, { count: visible });
    }

    function render() {
        cards = components.map(createCard);
        grid.replaceChildren(...cards);
        update();
    }

    filters.forEach((button) => {
        button.addEventListener("click", () => {
            activeFilter = button.dataset.filter ?? "all";
            filters.forEach((item) => {
                item.classList.toggle("is-active", item === button);
                item.setAttribute("aria-pressed", String(item === button));
            });
            update();
        });
    });
    search?.addEventListener("input", update);
    window.addEventListener(LANGUAGE_EVENT, render);
    render();
}
