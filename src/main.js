import "./style.css";
import { components } from "./library.js";

const clockElement = document.getElementById("live-clock");

function updateClock() {
    if (!clockElement) return;

    clockElement.textContent = `${new Date().toUTCString().split(" ")[4]} UTC`;
}

updateClock();
setInterval(updateClock, 1000);

const menuButton = document.getElementById("mobile-menu-btn");
const mobileMenu = document.getElementById("mobile-menu");

menuButton?.addEventListener("click", () => {
    mobileMenu?.classList.toggle("hidden");
});

const componentGrid = document.getElementById("component-grid");
const componentResults = document.getElementById("component-results");
const componentSearch = document.getElementById("component-search");
const componentFilters = document.querySelectorAll(".component-filter");
const componentCards = [];

function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
}

function createPreview(component) {
    const preview = createElement("div", "component-preview");
    preview.setAttribute("role", "img");
    preview.setAttribute("aria-label", `${component.title} visual preview`);

    if (component.preview === "spotlight") {
        const spotlight = createElement("div", "library-spotlight");
        spotlight.addEventListener("pointermove", (event) => {
            const bounds = spotlight.getBoundingClientRect();
            spotlight.style.setProperty("--x", `${event.clientX - bounds.left}px`);
            spotlight.style.setProperty("--y", `${event.clientY - bounds.top}px`);
        });
        preview.append(spotlight);
    } else if (component.preview === "aurora") {
        for (let index = 0; index < 3; index += 1) {
            preview.append(createElement("span", "library-aurora"));
        }
    } else if (component.preview === "login") {
        const login = createElement("div", "library-login");
        login.append(createElement("strong", "", "Welcome back"));

        login.append(
            createElement("span", "library-login__field", "Email address"),
            createElement("span", "library-login__field", "Password"),
            createElement("span", "library-login__button", "Sign in"),
            createElement("small", "", "Visual demo only"),
        );
        preview.append(login);
    } else if (component.preview === "button") {
        preview.append(createElement("span", "library-glow-button", "Explore more"));
    }

    const label = createElement("span", "component-preview__label", "LIVE PREVIEW");
    label.setAttribute("aria-hidden", "true");
    preview.append(label);
    return preview;
}

async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const temporaryInput = document.createElement("textarea");
    temporaryInput.value = text;
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

    if (!copied) {
        throw new Error("Clipboard access is unavailable.");
    }
}

function createComponentCard(component) {
    const card = createElement("article", "component-card");
    card.dataset.category = component.category;
    card.dataset.search = [
        component.title,
        component.description,
        ...component.tags,
    ]
        .join(" ")
        .toLowerCase();

    const content = createElement("div", "component-card__content");
    content.append(
        createElement("p", "component-card__category", component.category),
        createPreview(component),
        createElement("h3", "", component.title),
        createElement("p", "component-card__description", component.description),
    );

    const tags = createElement("div", "component-card__tags");
    component.tags.forEach((tag) => {
        tags.append(createElement("span", "component-card__tag", tag));
    });
    content.append(tags);

    const codeDetails = document.createElement("details");
    codeDetails.className = "component-code";
    codeDetails.append(createElement("summary", "", "View and copy source"));

    const codeBlock = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = component.code;
    codeBlock.append(code);
    codeDetails.append(codeBlock);
    content.append(codeDetails);

    const actions = createElement("div", "component-card__actions");
    const copyButton = createElement("button", "component-copy", "Copy code");
    copyButton.type = "button";
    const status = createElement("span", "component-copy-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    copyButton.addEventListener("click", async () => {
        status.textContent = "Copying…";
        try {
            await copyText(component.code);
            status.textContent = "Copied to clipboard.";
        } catch {
            status.textContent = "Copy failed. Select the code above to copy it.";
        }
    });

    actions.append(copyButton, status);
    content.append(actions);
    card.append(content);
    return card;
}

if (componentGrid && componentResults) {
    components.forEach((component) => {
        const card = createComponentCard(component);
        componentCards.push(card);
        componentGrid.append(card);
    });

    let activeFilter = "all";

    function updateComponents() {
        const searchTerm = componentSearch?.value.trim().toLowerCase() ?? "";
        let visibleCount = 0;

        componentCards.forEach((card) => {
            const matchesFilter =
                activeFilter === "all" || card.dataset.category === activeFilter;
            const matchesSearch = card.dataset.search.includes(searchTerm);
            card.hidden = !matchesFilter || !matchesSearch;
            if (!card.hidden) visibleCount += 1;
        });

        componentResults.textContent = `${visibleCount} ${visibleCount === 1 ? "snippet" : "snippets"} shown`;
    }

    componentFilters.forEach((button) => {
        button.addEventListener("click", () => {
            activeFilter = button.dataset.filter ?? "all";
            componentFilters.forEach((filterButton) => {
                const isActive = filterButton === button;
                filterButton.classList.toggle("is-active", isActive);
                filterButton.setAttribute("aria-pressed", String(isActive));
            });
            updateComponents();
        });
    });

    componentSearch?.addEventListener("input", updateComponents);
    updateComponents();
}

const terminalBody = document.getElementById("terminal-body");
const terminalInput = document.getElementById("terminal-input");
const terminalSubmit = document.getElementById("terminal-submit");

const commands = {
    help: 'Available commands: <br/>- <span class="text-raw-accent">skills</span>: See technologies I have worked with<br/>- <span class="text-raw-accent">library</span>: Browse reusable snippets<br/>- <span class="text-raw-accent">cat bio.txt</span>: Read a short bio<br/>- <span class="text-raw-accent">clear</span>: Clear terminal window<br/>- <span class="text-raw-accent">contact</span>: Show contact links',
    skills:
        "WORKED WITH: Java, JavaScript, TypeScript, Go, Node.js, React, Next.js, MySQL, PostgreSQL, Redis, ServiceNow, Git. Basic experience: Docker, Linux, Bootstrap.",
    library:
        "The component library has copyable snippets for pointer-reactive backgrounds, an animated aurora, a login UI demo, and a glow button. Type 'clear' to reset this terminal.",
    "cat bio.txt":
        "Álvaro (alvrodah) is a junior developer learning by building, exploring web development, and sharing reusable interface experiments.",
    contact:
        "Email: contact@alvrodah.dev | GitHub: github.com/alvrodah | LinkedIn: linkedin.com/in/alvrodah",
};

function processCommand() {
    if (!terminalInput || !terminalBody) return;

    const command = terminalInput.value.trim().toLowerCase();
    if (!command) return;

    const echoLine = document.createElement("div");
    echoLine.className = "text-raw-white font-bold";

    const prompt = document.createElement("span");
    prompt.className = "text-raw-accent";
    prompt.textContent = "visitor@alvrodah:~$";
    echoLine.append(prompt, document.createTextNode(` ${command}`));
    terminalBody.append(echoLine);

    if (command === "clear") {
        terminalBody.replaceChildren();
        terminalInput.value = "";
        return;
    }

    const responseLine = document.createElement("div");
    responseLine.className = "text-raw-dim pl-2";

    if (Object.hasOwn(commands, command)) {
        responseLine.innerHTML = commands[command];
    } else {
        const error = document.createElement("span");
        error.className = "text-raw-accent2";
        error.textContent = `Command not found: '${command}'. Type 'help' for available commands.`;
        responseLine.append(error);
    }

    terminalBody.append(responseLine);
    terminalInput.value = "";
    terminalBody.scrollTop = terminalBody.scrollHeight;
}

terminalSubmit?.addEventListener("click", processCommand);
terminalInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") processCommand();
});

const copyButton = document.getElementById("copy-json-btn");

copyButton?.addEventListener("click", () => {
    const text = JSON.stringify(
        {
            developer: "alvrodah",
            role: "Junior Developer",
            skills: [
                "Java",
                "JavaScript",
                "TypeScript",
                "Go",
                "React",
                "Node.js",
                "MySQL",
                "ServiceNow",
                "Git",
                "Docker (basic)",
                "Linux (basic)",
                "Bootstrap (basic)",
            ],
        },
        null,
        2,
    );
    const copyStatus = document.getElementById("copy-json-status");

    copyText(text)
        .then(() => {
            if (copyStatus) copyStatus.textContent = "Copied.";
        })
        .catch(() => {
            if (copyStatus) copyStatus.textContent = "Copy failed.";
        });
});

const contactForm = document.getElementById("contact-form");
const formStatus = document.getElementById("form-status");

contactForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    formStatus?.classList.remove("hidden");
    contactForm.reset();
    window.setTimeout(() => formStatus?.classList.add("hidden"), 5000);
});

window.lucide?.createIcons();
