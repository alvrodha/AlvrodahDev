import { beforeEach, describe, expect, it } from "vitest";
import { el, safeUrl, setJsonLd } from "../src/core/dom.js";
import { init as initTerminal, runCommand } from "../src/pages/terminal.js";
import { initLanguageMenu } from "../src/ui/language-menu.js";

describe("DOM helpers", () => {
    it("el() assigns text, never HTML", () => {
        const node = el("p", { text: "<b>bold</b>", attrs: { title: '"><script>' } });
        expect(node.innerHTML).toBe("&lt;b&gt;bold&lt;/b&gt;");
        expect(node.children.length).toBe(0);
    });

    it("safeUrl() blocks script URLs", () => {
        expect(safeUrl("javascript:alert(1)")).toBe("#");
        expect(safeUrl("data:text/html,<script>")).toBe("#");
        expect(safeUrl("https://example.com/a")).toBe("https://example.com/a");
        expect(safeUrl("mailto:a@b.c")).toBe("mailto:a@b.c");
    });

    it("setJsonLd() cannot be broken out of with </script>", () => {
        setJsonLd("test-ld", { headline: "</script><script>alert(1)</script>" });
        const script = document.getElementById("test-ld");
        expect(script.textContent).not.toContain("</script>");
        expect(JSON.parse(script.textContent).headline).toBe("</script><script>alert(1)</script>");
    });
});

describe("terminal", () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="terminal-body"></div>
            <form id="terminal-form"><input id="terminal-input"><button type="submit">RUN</button></form>`;
        initTerminal();
    });

    const submit = (value) => {
        document.getElementById("terminal-input").value = value;
        document.getElementById("terminal-form").dispatchEvent(new Event("submit", { cancelable: true }));
    };

    it("knows its commands", () => {
        expect(runCommand("help")).not.toBeNull();
        expect(runCommand("cat bio.txt")).not.toBeNull();
        expect(runCommand("rm -rf /")).toBeNull();
    });

    it("echoes hostile input as text only", () => {
        submit(`<img src=x onerror="window.pwned=1">`);
        const body = document.getElementById("terminal-body");
        expect(body.querySelector("img")).toBeNull();
        expect(window.pwned).toBeUndefined();
        expect(body.textContent).toContain("<img");
    });

    it("clears the output and caps history", () => {
        for (let index = 0; index < 150; index += 1) submit("skills");
        expect(document.getElementById("terminal-body").childElementCount).toBeLessThanOrEqual(200);
        submit("clear");
        expect(document.getElementById("terminal-body").childElementCount).toBe(0);
    });
});

describe("language menu", () => {
    it("builds an accessible menu and reports the selection", () => {
        document.body.innerHTML = `
            <button id="lang-button" aria-expanded="false"></button><span id="lang-current"></span>
            <ul id="lang-menu" hidden></ul>`;
        let selected;
        initLanguageMenu({ onSelect: (language) => (selected = language) });

        const button = document.getElementById("lang-button");
        const menu = document.getElementById("lang-menu");
        const items = menu.querySelectorAll('[role="menuitemradio"]');
        expect(items.length).toBe(4);
        expect(menu.querySelector('[data-lang="en"]').getAttribute("aria-checked")).toBe("true");

        button.click();
        expect(menu.hidden).toBe(false);
        expect(button.getAttribute("aria-expanded")).toBe("true");

        menu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(menu.hidden).toBe(true);

        button.click();
        menu.querySelector('[data-lang="de"]').click();
        expect(selected).toBe("de");
        expect(menu.hidden).toBe(true);
    });
});
