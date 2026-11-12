export const components = [
    {
        id: "pointer-spotlight",
        category: "background",
        title: "Pointer spotlight",
        description:
            "A soft radial glow follows the pointer inside its container. Without JavaScript, the background still looks good.",
        tags: ["HTML", "CSS", "JavaScript"],
        preview: "spotlight",
        code: String.raw`<div class="spotlight" aria-hidden="true"></div>
<style>
.spotlight {
  min-height: 12rem;
  background:
    radial-gradient(
      circle at var(--x, 50%) var(--y, 50%),
      rgb(204 255 0 / 24%),
      transparent 35%
    ),
    #0f1012;
}
</style>
<script>
const spotlight = document.querySelector(".spotlight");

spotlight?.addEventListener("pointermove", (event) => {
  const bounds = spotlight.getBoundingClientRect();
  spotlight.style.setProperty("--x", event.clientX - bounds.left + "px");
  spotlight.style.setProperty("--y", event.clientY - bounds.top + "px");
});
</script>`,
    },
    {
        id: "login-card",
        category: "ui",
        title: "Minimal login card",
        description:
            "A responsive, accessible login form layout. This is a visual starter only; it does not authenticate users or submit data.",
        tags: ["HTML", "CSS", "UI only"],
        preview: "login",
        code: String.raw`<section class="login-card" aria-labelledby="login-title">
          <h2 id="login-title">Welcome back</h2>
  <label>
    Email
    <input
      type="email"
      name="email"
      autocomplete="email"
      placeholder="you@example.com"
      required
    >
  </label>
  <label>
    Password
    <input
      type="password"
      name="password"
      autocomplete="current-password"
      placeholder="Your password"
      required
    >
  </label>
  <button type="button">Sign in</button>
  <p>UI demo only — connect a secure authentication service before use.</p>
</section>
<style>
.login-card {
  display: grid;
  gap: 1rem;
  width: min(100% - 2rem, 24rem);
  margin: 2rem auto;
  padding: 1.5rem;
  color: #e2e8f0;
  background: #16181d;
  border: 1px solid #2a2e37;
  font: 1rem system-ui, sans-serif;
}
.login-card label { display: grid; gap: .4rem; }
.login-card input,
.login-card button {
  padding: .8rem;
  color: inherit;
  background: #0f1012;
  border: 1px solid #2a2e37;
  font: inherit;
}
.login-card input:focus-visible,
.login-card button:focus-visible { outline: 2px solid #ccff00; }
.login-card button { color: #0f1012; background: #ccff00; cursor: pointer; }
.login-card p { margin: 0; color: #8a94a6; font-size: .8rem; }
</style>`,
    },
    {
        id: "aurora-background",
        category: "background",
        title: "Animated aurora",
        description:
            "A layered, animated color wash for hero sections. Includes a reduced-motion fallback for accessibility.",
        tags: ["HTML", "CSS", "Motion"],
        preview: "aurora",
        code: String.raw`<div class="aurora" aria-hidden="true">
  <span></span><span></span><span></span>
</div>
<style>
.aurora {
  position: relative;
  min-height: 12rem;
  overflow: hidden;
  isolation: isolate;
  background: #0f1012;
}
.aurora span {
  position: absolute;
  inset: -50%;
  z-index: -1;
  border-radius: 50%;
  filter: blur(40px);
  opacity: .55;
  animation: drift 12s ease-in-out infinite alternate;
}
.aurora span:nth-child(1) { background: #ccff00; transform: translate(-20%, 10%); }
.aurora span:nth-child(2) { background: #ff3366; transform: translate(35%, 20%); animation-delay: -4s; }
.aurora span:nth-child(3) { background: #3867ff; transform: translate(5%, -30%); animation-delay: -8s; }
@keyframes drift {
  to { transform: translate(12%, 8%) scale(1.15); }
}
@media (prefers-reduced-motion: reduce) {
  .aurora span { animation: none; }
}
</style>`,
    },
    {
        id: "glow-button",
        category: "animation",
        title: "Glow-on-hover button",
        description:
            "A small hover and focus treatment for calls to action, with motion disabled when a visitor prefers reduced motion.",
        tags: ["HTML", "CSS", "Motion"],
        preview: "button",
        code: String.raw`<button class="glow-button" type="button">Explore more</button>
<style>
.glow-button {
  padding: .9rem 1.3rem;
  color: #0f1012;
  background: #ccff00;
  border: 0;
  font: 700 1rem system-ui, sans-serif;
  cursor: pointer;
  transition: box-shadow 180ms ease, transform 180ms ease;
}
.glow-button:hover {
  box-shadow: 0 0 1.5rem rgb(204 255 0 / 45%);
  transform: translateY(-2px);
}
.glow-button:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }
@media (prefers-reduced-motion: reduce) {
  .glow-button { transition: none; }
  .glow-button:hover { transform: none; }
}
</style>`,
    },
];
