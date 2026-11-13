import { blog } from "../blog/service.js";
import { renderPostCard, renderSkeletonCards } from "../blog/render.js";
import { copyText, el } from "../core/dom.js";
import { LANGUAGE_EVENT, getLanguage, t } from "../core/i18n.js";

const STACK = {
    developer: "alvrodah",
    role: "Junior Developer",
    skills: ["Java", "JavaScript", "TypeScript", "Go", "React", "Node.js", "MySQL", "ServiceNow", "Git", "Docker (basic)", "Linux (basic)", "Bootstrap (basic)"],
};

function initCopyJson() {
    const button = document.getElementById("copy-json-btn");
    const status = document.getElementById("copy-json-status");
    button?.addEventListener("click", async () => {
        try {
            await copyText(JSON.stringify(STACK, null, 2));
            if (status) status.textContent = t("common.copied");
        } catch {
            if (status) status.textContent = t("common.copyFailed");
        }
    });
}

async function renderLatest() {
    const container = document.getElementById("latest-posts");
    if (!container) return;
    container.replaceChildren(...renderSkeletonCards(3));
    try {
        const { items } = await blog.listPosts({ language: getLanguage(), pageSize: 3 });
        container.replaceChildren(
            ...(items.length
                ? items.map((post) => renderPostCard(post, { headingLevel: 3 }))
                : [el("p", { className: "font-mono text-sm text-raw-dim", text: t("blog.empty") })]),
        );
    } catch (error) {
        console.error(error);
        container.replaceChildren(el("p", { className: "font-mono text-sm text-raw-accent2", text: t("blog.error") }));
    }
}

export async function init() {
    initCopyJson();
    window.addEventListener(LANGUAGE_EVENT, renderLatest);
    await renderLatest();
}
