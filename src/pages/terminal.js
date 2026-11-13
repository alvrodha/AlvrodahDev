/**
 * Terminal simulator. Output is built with DOM nodes only — user input is never
 * interpreted as HTML.
 */
import { site } from "../../site.config.js";
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";

const MAX_LINES = 200;

/** Returns DOM nodes for a command's output, or null when the command is unknown. */
export function runCommand(command) {
    switch (command) {
        case "help":
            return [
                el("p", { text: t("terminal.commands.helpTitle") }),
                el(
                    "ul",
                    {},
                    ["skills", "library", "blog", "cat bio.txt", "contact", "clear"].map((name) =>
                        el("li", {}, [
                            el("span", { text: "- " }),
                            el("span", { className: "text-raw-accent", text: name }),
                            el("span", { text: `: ${t(`terminal.commands.descriptions.${name === "cat bio.txt" ? "bio" : name}`)}` }),
                        ]),
                    ),
                ),
            ];
        case "skills":
            return [el("p", { text: t("terminal.commands.skills") })];
        case "library":
            return [el("p", { text: t("terminal.commands.library") })];
        case "blog":
            return [el("p", { text: t("terminal.commands.blog") })];
        case "cat bio.txt":
            return [el("p", { text: t("terminal.commands.bio") })];
        case "contact":
            return [el("p", { text: `Email: ${site.email} | GitHub: ${site.github.replace("https://", "")} | LinkedIn: ${site.linkedin.replace(/^https:\/\/(www\.)?/, "")}` })];
        default:
            return null;
    }
}

export function init() {
    const body = document.getElementById("terminal-body");
    const form = document.getElementById("terminal-form");
    const input = document.getElementById("terminal-input");
    if (!body || !form || !input) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const command = input.value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 100);
        input.value = "";
        if (!command) return;

        if (command === "clear") {
            body.replaceChildren();
            return;
        }

        body.append(
            el("div", { className: "text-raw-strong font-bold" }, [
                el("span", { className: "text-raw-accent", text: "visitor@alvrodah:~$" }),
                document.createTextNode(` ${command}`),
            ]),
        );

        const output = runCommand(command);
        body.append(
            el("div", { className: "text-raw-dim pl-2" }, output ?? [
                el("span", { className: "text-raw-accent2", text: t("terminal.notFound", { command }) }),
            ]),
        );

        while (body.childElementCount > MAX_LINES) body.firstElementChild?.remove();
        body.scrollTop = body.scrollHeight;
    });

    input.focus({ preventScroll: true });
}
