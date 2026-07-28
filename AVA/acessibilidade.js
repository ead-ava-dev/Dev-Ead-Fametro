
(function () {
  "use strict";

  if (window.__A11Y_BAR_INIT__) return;
  window.__A11Y_BAR_INIT__ = true;

  const STORAGE_KEY = "a11y_prefs_v1";
  const BAR_HEIGHT_PX = 40; // reduzido para 40px

  const prefs = {
    fontScale: 1,
    contrast: false,
    grayscale: false,
    reduceMotion: false,
    strongFocus: false,
    collapsed: false
  };

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      Object.assign(prefs, data);
    } catch (e) {}
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }

  function injectCSS() {
    if (document.getElementById("a11y-bar-style")) return;

    const css = `
:root{
  --a11y-bg: rgba(255,255,255,.78);
  --a11y-border: rgba(15,23,42,.10);
  --a11y-text: #0f172a;
  --a11y-muted: rgba(15,23,42,.65);
  --a11y-shadow: 0 10px 24px rgba(0,0,0,.10);
  --a11y-radius: 12px;
  --a11y-gap: .45rem;
  --a11y-btn-radius: 11px;
  --a11y-focus: 0 0 0 .20rem rgba(13,110,253,.20);
  --a11y-font-scale: 1;
  --a11y-bar-h: ${BAR_HEIGHT_PX}px;
}

/* Reserva espaço no topo (não cobre o header/conteúdo) */
body{
  padding-top: var(--a11y-bar-h) !important;
  font-size: calc(1rem * var(--a11y-font-scale));
}

/* Barra fixa (40px) */
.a11y-bar{
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--a11y-bar-h);
  z-index: 99999;
  padding: 6px 10px;         /* compacto */
  backdrop-filter: blur(10px);
  background: transparent;
  display: flex;
  align-items: center;
}

.a11y-bar__inner{
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  border: 1px solid var(--a11y-border);
  border-radius: var(--a11y-radius);
  background: var(--a11y-bg);
  box-shadow: var(--a11y-shadow);

  padding: 4px 8px;          /* compacto */
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  height: 100%;
}

.a11y-bar__left{
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 140px;
}

.a11y-bar__label{
  font-weight: 800;
  color: var(--a11y-text);
  letter-spacing: .2px;
  font-size: .86rem;
  line-height: 1;
}

.a11y-bar__hint{
  color: var(--a11y-muted);
  font-size: .78rem;
  line-height: 1;
}

.a11y-bar__actions{
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--a11y-gap);
  flex-wrap: nowrap;
  overflow: hidden;
}

/* Botões: altura reduzida para caber com folga em 40px */
.a11y-btn{
  border: 1px solid rgba(15,23,42,.12);
  background: rgba(255,255,255,.85);
  color: var(--a11y-text);
  border-radius: var(--a11y-btn-radius);

  padding: 4px 8px;
  height: 28px;              /* importante */
  display: inline-flex;
  align-items: center;
  gap: 7px;

  cursor: pointer;
  user-select: none;
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,.06);
  font: inherit;
}

.a11y-btn:hover{
  transform: translateY(-1px);
  border-color: rgba(15,23,42,.22);
  box-shadow: 0 7px 16px rgba(0,0,0,.10);
}
.a11y-btn:active{ transform: translateY(0); }

.a11y-btn:focus-visible{
  outline: none;
  box-shadow: var(--a11y-focus), 0 7px 16px rgba(0,0,0,.10);
}

.a11y-btn__txt{
  font-weight: 700;
  font-size: .82rem;
  white-space: nowrap;
}

.a11y-ico{ width: 16px; height: 16px; display: inline-block; }
.a11y-ico svg{ width: 16px; height: 16px; display: block; }

.a11y-btn--primary{ background: rgba(13,110,253,.10); border-color: rgba(13,110,253,.22); }
.a11y-btn--ghost{ background: rgba(255,255,255,.55); }

.a11y-btn[aria-pressed="true"]{
  background: rgba(34,197,94,.12);
  border-color: rgba(34,197,94,.28);
}

.a11y-bar.is-collapsed .a11y-bar__actions .a11y-btn:not([data-action="toggle"]){
  display: none;
}

@media (max-width: 768px){
  .a11y-bar__hint{ display:none; }
  .a11y-btn__txt{ display:none; }
  .a11y-btn{ padding: 4px 7px; }
}

/* Recursos */
body.a11y-contrast{ background: #000 !important; color: #fff !important; }
body.a11y-contrast *{ background-color: transparent; color: inherit; border-color: rgba(255,255,255,.35) !important; }
body.a11y-contrast a{ color: #9ae6ff !important; text-decoration: underline; }
body.a11y-grayscale{ filter: grayscale(100%); }
body.a11y-reduce-motion *, body.a11y-reduce-motion *::before, body.a11y-reduce-motion *::after{
  animation: none !important; transition: none !important; scroll-behavior: auto !important;
}
body.a11y-strong-focus :focus-visible{
  outline: 3px solid rgba(13,110,253,.85) !important; outline-offset: 3px !important;
}
    `.trim();

    const style = document.createElement("style");
    style.id = "a11y-bar-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function barHTML() {
    return `
<div class="a11y-bar" role="region" aria-label="Barra de acessibilidade">
  <div class="a11y-bar__inner">
    <div class="a11y-bar__left">
      <span class="a11y-bar__label">Acessibilidade</span>
      <span class="a11y-bar__hint">Alt+1…Alt+8</span>
    </div>

    <div class="a11y-bar__actions" role="toolbar" aria-label="Ações de acessibilidade">
      <button type="button" class="a11y-btn" data-action="font-dec" aria-label="Diminuir fonte (Alt+1)" title="Diminuir fonte (Alt+1)">
        <span class="a11y-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M6 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 19l4-14h2l4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <span class="a11y-btn__txt">A-</span>
      </button>

      <button type="button" class="a11y-btn" data-action="font-inc" aria-label="Aumentar fonte (Alt+2)" title="Aumentar fonte (Alt+2)">
        <span class="a11y-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M6 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10 8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 19l4-14h2l4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <span class="a11y-btn__txt">A+</span>
      </button>

      <button type="button" class="a11y-btn" data-action="contrast" aria-pressed="false" aria-label="Alternar alto contraste (Alt+3)" title="Alto contraste (Alt+3)">
        <span class="a11y-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 20a8 8 0 1 1 0-16v16Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 4a8 8 0 0 1 0 16" stroke="currentColor" stroke-width="2"/></svg>
        </span>
        <span class="a11y-btn__txt">Contraste</span>
      </button>

      <button type="button" class="a11y-btn" data-action="grayscale" aria-pressed="false" aria-label="Alternar escala de cinza (Alt+4)" title="Escala de cinza (Alt+4)">
        <span class="a11y-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 1 0 16 0A8 8 0 1 0 4 12Z" stroke="currentColor" stroke-width="2"/><path d="M12 4c-2.5 2-2.5 14 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 4c2.5 2 2.5 14 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".35"/></svg>
        </span>
        <span class="a11y-btn__txt">Cinza</span>
      </button>

      <button type="button" class="a11y-btn" data-action="reduce-motion" aria-pressed="false" aria-label="Pausar animações (Alt+5)" title="Pausar animações (Alt+5)">
        <span class="a11y-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M6 5h4v14H6V5Z" stroke="currentColor" stroke-width="2"/><path d="M14 5h4v14h-4V5Z" stroke="currentColor" stroke-width="2"/></svg>
        </span>
        <span class="a11y-btn__txt">Animações</span>
      </button>

      <button type="button" class="a11y-btn" data-action="focus" aria-pressed="false" aria-label="Realçar foco do teclado (Alt+6)" title="Foco visível (Alt+6)">
        <span class="a11y-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 3v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 18v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M3 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0Z" stroke="currentColor" stroke-width="2"/></svg>
        </span>
        <span class="a11y-btn__txt">Foco</span>
      </button>

      <button type="button" class="a11y-btn a11y-btn--ghost" data-action="reset" aria-label="Resetar preferências (Alt+7)" title="Resetar (Alt+7)">
        <span class="a11y-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 1 1-3-6.7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M21 3v6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <span class="a11y-btn__txt">Reset</span>
      </button>

      <button type="button" class="a11y-btn a11y-btn--primary" data-action="toggle" aria-expanded="true" aria-label="Minimizar barra (Alt+8)" title="Minimizar (Alt+8)">
        <span class="a11y-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6l6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <span class="a11y-btn__txt">Minimizar</span>
      </button>
    </div>
  </div>
</div>
    `.trim();
  }

  function injectBar() {
    if (document.querySelector(".a11y-bar")) return;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = barHTML();
    const bar = wrapper.firstElementChild;
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function setPressed(action, value) {
    const btn = document.querySelector(`.a11y-btn[data-action="${action}"]`);
    if (btn) btn.setAttribute("aria-pressed", value ? "true" : "false");
  }

  function applyPrefs() {
    const root = document.documentElement;
    const body = document.body;
    const bar = document.querySelector(".a11y-bar");

    root.style.setProperty("--a11y-font-scale", String(prefs.fontScale));

    body.classList.toggle("a11y-contrast", !!prefs.contrast);
    body.classList.toggle("a11y-grayscale", !!prefs.grayscale);
    body.classList.toggle("a11y-reduce-motion", !!prefs.reduceMotion);
    body.classList.toggle("a11y-strong-focus", !!prefs.strongFocus);

    if (bar) {
      bar.classList.toggle("is-collapsed", !!prefs.collapsed);
      const tgl = bar.querySelector('.a11y-btn[data-action="toggle"]');
      if (tgl) tgl.setAttribute("aria-expanded", String(!prefs.collapsed));
    }

    setPressed("contrast", prefs.contrast);
    setPressed("grayscale", prefs.grayscale);
    setPressed("reduce-motion", prefs.reduceMotion);
    setPressed("focus", prefs.strongFocus);
  }

  function handleAction(action) {
    switch (action) {
      case "font-inc": prefs.fontScale = clamp(Number((prefs.fontScale + 0.05).toFixed(2)), 0.85, 1.35); break;
      case "font-dec": prefs.fontScale = clamp(Number((prefs.fontScale - 0.05).toFixed(2)), 0.85, 1.35); break;
      case "contrast": prefs.contrast = !prefs.contrast; break;
      case "grayscale": prefs.grayscale = !prefs.grayscale; break;
      case "reduce-motion": prefs.reduceMotion = !prefs.reduceMotion; break;
      case "focus": prefs.strongFocus = !prefs.strongFocus; break;
      case "toggle": prefs.collapsed = !prefs.collapsed; break;
      case "reset":
        prefs.fontScale = 1; prefs.contrast = false; prefs.grayscale = false;
        prefs.reduceMotion = false; prefs.strongFocus = false; prefs.collapsed = false;
        break;
      default: return;
    }
    savePrefs();
    applyPrefs();
  }

  function bindEvents() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".a11y-btn[data-action]");
      if (!btn) return;
      handleAction(btn.getAttribute("data-action"));
    });

    document.addEventListener("keydown", (e) => {
      if (!e.altKey) return;
      const map = {"1":"font-dec","2":"font-inc","3":"contrast","4":"grayscale","5":"reduce-motion","6":"focus","7":"reset","8":"toggle"};
      const action = map[e.key];
      if (action) { e.preventDefault(); handleAction(action); }
    });
  }

  // Ajuste do header fixo/sticky do tema (empurra para baixo 40px)
  function getCandidateHeaders() {
    const selectors = [
      ".navbar.fixed-top",
      ".navbar.sticky-top",
      "header.navbar",
      "header#page-header",
      "#page-header",
      "#header",
      ".site-header",
      "header",
      ".navbar"
    ];
    const found = [];
    selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => found.push(el)));
    return Array.from(new Set(found));
  }

  function isFixedOrSticky(el) {
    const cs = window.getComputedStyle(el);
    return cs.position === "fixed" || cs.position === "sticky";
  }

  function pushHeaderDown() {
    const headers = getCandidateHeaders();
    headers.forEach(el => {
      if (!isFixedOrSticky(el)) return;
      const cs = window.getComputedStyle(el);
      const currentTop = parseFloat(cs.top) || 0;
      el.style.top = (currentTop + BAR_HEIGHT_PX) + "px";
      if (cs.position === "sticky") el.style.zIndex = String(9999);
    });
  }

  function init() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", init, { once: true });
      return;
    }

    loadPrefs();
    injectCSS();
    injectBar();
    bindEvents();
    applyPrefs();

    setTimeout(pushHeaderDown, 0);
    window.addEventListener("resize", () => setTimeout(pushHeaderDown, 0));
  }

  init();
})();

