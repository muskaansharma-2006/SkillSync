(() => {
  const storageKey = "skillsync-logo-intro-shown";
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  try {
    if (sessionStorage.getItem(storageKey) || prefersReducedMotion) return;
    sessionStorage.setItem(storageKey, "true");
  } catch (error) {
    if (prefersReducedMotion) return;
  }

  const overlay = document.createElement("div");
  overlay.className = "skillsync-intro-overlay";
  overlay.setAttribute("role", "presentation");
  overlay.innerHTML = `
    <div class="skillsync-intro-brand" aria-label="SkillSync">
      <div class="skillsync-intro-mark"><i class="fa-solid fa-bolt" aria-hidden="true"></i></div>
      <div class="skillsync-intro-wordmark">SkillSync</div>
    </div>
  `;
  document.body.appendChild(overlay);

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    overlay.classList.add("is-leaving");
    window.removeEventListener("keydown", dismiss);
    overlay.addEventListener("transitionend", () => overlay.remove(), { once: true });
    window.setTimeout(() => overlay.remove(), 450);
  };

  overlay.addEventListener("click", dismiss, { once: true });
  window.addEventListener("keydown", dismiss, { once: true });
  window.setTimeout(dismiss, 1500);
})();
