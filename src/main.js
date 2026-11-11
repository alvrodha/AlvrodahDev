import "./style.css";

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

const filterButtons = document.querySelectorAll(".skill-filter-btn");
const skillCards = document.querySelectorAll(".skill-card");

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        filterButtons.forEach((filterButton) => {
            filterButton.classList.remove("bg-raw-accent", "text-black", "font-bold");
            filterButton.classList.add("text-raw-dim", "border-raw-border");
        });

        button.classList.add("bg-raw-accent", "text-black", "font-bold");
        button.classList.remove("text-raw-dim", "border-raw-border");

        const filter = button.getAttribute("data-filter");

        skillCards.forEach((card) => {
            card.style.display =
                filter === "all" || card.getAttribute("data-category") === filter
                    ? "block"
                    : "none";
        });
    });
});

const canvas = document.getElementById("project-canvas");
const context = canvas?.getContext("2d");

if (canvas && context) {
    let width = 0;
    let height = 0;
    const particles = [];

    function resizeCanvas() {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    for (let index = 0; index < 35; index += 1) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            radius: Math.random() * 2 + 1,
        });
    }

    function drawParticles() {
        context.clearRect(0, 0, width, height);
        context.fillStyle = "#CCFF00";
        context.strokeStyle = "rgba(204, 255, 0, 0.15)";

        for (let index = 0; index < particles.length; index += 1) {
            const particle = particles[index];
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < 0 || particle.x > width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > height) particle.vy *= -1;

            context.beginPath();
            context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            context.fill();

            for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
                const nextParticle = particles[nextIndex];
                const distance = Math.hypot(
                    particle.x - nextParticle.x,
                    particle.y - nextParticle.y,
                );

                if (distance < 80) {
                    context.beginPath();
                    context.moveTo(particle.x, particle.y);
                    context.lineTo(nextParticle.x, nextParticle.y);
                    context.stroke();
                }
            }
        }

        requestAnimationFrame(drawParticles);
    }

    drawParticles();
}

const terminalBody = document.getElementById("terminal-body");
const terminalInput = document.getElementById("terminal-input");
const terminalSubmit = document.getElementById("terminal-submit");

const commands = {
    help: 'Available commands: <br/>- <span class="text-raw-accent">skills</span>: Display core stack<br/>- <span class="text-raw-accent">projects</span>: View featured projects<br/>- <span class="text-raw-accent">cat bio.txt</span>: Print developer bio<br/>- <span class="text-raw-accent">clear</span>: Clear terminal window<br/>- <span class="text-raw-accent">contact</span>: Show contact links',
    skills:
        "CORE TECH: TypeScript, Rust, Node.js, Python, React, Next.js, Docker, PostgreSQL, Redis.",
    projects:
        "1. KINETIC-ENGINE (Rust/WASM Canvas)<br/>2. HYPER-QUEUE (Node/Redis Dispatcher)<br/>3. DEV-DOCK (Next.js Dashboard)<br/>4. LOG-SYNAPSE (FastAPI Log Parser)",
    "cat bio.txt":
        "Álvaro (alvrodah) is a full-stack engineer specializing in high-throughput backend services and modern frontend user experiences. Obsessed with clean architecture and performance.",
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
    const text =
        '{ "developer": "alvrodah", "role": "Senior Engineer", "skills": ["TypeScript", "Rust", "Node.js", "React"] }';
    const temporaryInput = document.createElement("textarea");
    temporaryInput.value = text;
    document.body.append(temporaryInput);
    temporaryInput.select();
    document.execCommand("copy");
    temporaryInput.remove();

    copyButton.innerHTML =
        '<i data-lucide="check" class="w-3.5 h-3.5 text-raw-accent"></i> Copied!';
    window.setTimeout(() => {
        copyButton.innerHTML =
            '<i data-lucide="copy" class="w-3.5 h-3.5"></i> Copy Stack JSON';
        window.lucide?.createIcons();
    }, 2000);
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
