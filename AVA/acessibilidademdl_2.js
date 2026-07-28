

// A11yBar + DarkReader FULL (importa e controla darkreader real, modo noturno com split e funcionalidades avançadas)
(function () {
  'use strict';

  if (window.__A11Y_BAR_INIT__) return;
  window.__A11Y_BAR_INIT__ = true;

  const STORAGE_KEY = "a11y_prefs_v4_nightarrow";
  const BAR_HEIGHT_PX = 40;
  const DRAWER_TOGGLER_TOP = 110;
  const DRAWER_SIDEBAR_TOP = 100;

  const DARKREADER_URL = 'https://cdn.jsdelivr.net/npm/darkreader@4.9.77/darkreader.min.js';

  // Estado e prefs
  const prefs = {
    fontScale: 1,
    darkMode: false,
    darkModeEngine: 'dynamicTheme',
    darkModeBrightness: 100,
    darkModeContrast: 100,
    darkModeSepia: 0,
    grayscale: false,
    grayscaleScale: 100,
    reduceMotion: false,
    strongFocus: false,
    collapsed: false
  };

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  // Assegura que DarkReader está carregado, chama cb quando disponível
  let darkReaderLoadAttempts = 0;
  const DARKREADER_MAX_ATTEMPTS = 40; // ~5s de tentativas antes de desistir

  function ensureDarkReaderReady(cb) {
    if (window.DarkReader && typeof window.DarkReader.enable === "function") {
      darkReaderLoadAttempts = 0;
      cb();
      return;
    }
    if (!document.getElementById('darkreader-lib')) {
      const s = document.createElement('script');
      s.id = 'darkreader-lib';
      s.src = DARKREADER_URL;
      s.onload = () => setTimeout(() => cb(), 140); // darkreader precisa de tempo para montar internamente!
      s.onerror = () => {
        console.warn(
          '[A11yBar] Não foi possível carregar o DarkReader (' + DARKREADER_URL + '). ' +
          'Em instalações Moodle com Content Security Policy restritiva, é preciso liberar o domínio ' +
          '"cdn.jsdelivr.net" (script-src) para que o Modo Noturno funcione.'
        );
      };
      document.head.appendChild(s);
    } else if (darkReaderLoadAttempts < DARKREADER_MAX_ATTEMPTS) {
      darkReaderLoadAttempts++;
      setTimeout(() => ensureDarkReaderReady(cb), 120);
    } else {
      darkReaderLoadAttempts = 0;
      console.warn('[A11yBar] DarkReader não inicializou a tempo; Modo Noturno indisponível nesta página.');
    }
  }

  function updateDarkReaderPrefs() {
    if (!prefs.darkMode) return;
    ensureDarkReaderReady(() => {
      try {
        window.DarkReader.setFetchMethod(window.fetch);
        let engineValue = prefs.darkModeEngine || 'dynamicTheme';
        if (!['dynamicTheme', 'filter', 'filterPlus', 'staticTheme'].includes(engineValue)) engineValue = 'dynamicTheme';
        window.DarkReader.enable({
          brightness: Number(prefs.darkModeBrightness),
          contrast: Number(prefs.darkModeContrast),
          sepia: Number(prefs.darkModeSepia),
          mode: engineValue,
        });
      } catch(e) {}
    });
  }

  function enableDarkReader() {
    prefs.darkMode = true;
    ensureDarkReaderReady(() => {
      updateDarkReaderPrefs();
    });
  }

  function disableDarkReader() {
    prefs.darkMode = false;
    if (window.DarkReader && typeof window.DarkReader.disable === "function") {
      try { window.DarkReader.disable(); } catch(e){}
    }
  }

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
body{
  font-size: calc(1rem * var(--a11y-font-scale));
  filter: grayscale(var(--a11y-grayscale, 0%));
  transition: filter .24s cubic-bezier(.5,0,0,1);
}
.a11y-bar{
  position: fixed;
  top: 0; left: 0; right: 0;
  height: var(--a11y-bar-h);
  z-index: 99999;
  padding: 6px 10px;
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
  padding: 4px 8px;
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
  overflow: visible;
}
.a11y-btn{
  border: 1px solid rgba(15,23,42,.12);
  background: rgba(255,255,255,.85);
  color: var(--a11y-text);
  border-radius: var(--a11y-btn-radius);
  padding: 4px 8px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  user-select: none;
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,.06);
  font: inherit;
}
.a11y-btn:hover, .a11y-btn--split:hover{
  transform: translateY(-1px);
  border-color: rgba(15,23,42,.22);
  box-shadow: 0 7px 16px rgba(0,0,0,.10);
}
.a11y-btn:active{ transform: translateY(0); }
.a11y-btn:focus-visible, .a11y-btn--split:focus-visible{
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
.a11y-btn--primary{ background: rgba(13,110,253,.10); border-color: rgba(13,110,253,.22);}
.a11y-btn--ghost{ background: rgba(255,255,255,.55);}
.a11y-btn[aria-pressed="true"]{
  background: rgba(34,197,94,.12);
  border-color: rgba(34,197,94,.28);
}
.a11y-bar.is-collapsed .a11y-bar__actions .a11y-btn:not([data-action="toggle"]){
  display: none;
}
@media (max-width: 768px){
  .a11y-bar__hint{ display:none;}
  .a11y-btn__txt{ display:none;}
  .a11y-btn{ padding: 4px 7px;}
}
.drawer-toggles .drawer-toggler {
  position: fixed !important;
  top: var(--a11y-drawer-toggler-top, ${DRAWER_TOGGLER_TOP}px) !important;
  z-index: 99999;
}
@media (min-width: 992px) {
  .drawer-left, .drawer-right {
    top: var(--a11y-drawer-sidebar-top, ${DRAWER_SIDEBAR_TOP}px) !important;
    position: fixed !important;
  }
}
body.a11y-reduce-motion *, body.a11y-reduce-motion *::before, body.a11y-reduce-motion *::after{
  animation: none !important; transition: none !important; scroll-behavior: auto !important;
}
body.a11y-strong-focus :focus-visible{
  outline: 3px solid rgba(13,110,253,.85) !important; outline-offset: 3px !important;
}
.a11y-split-group{
  position: relative;
  display: inline-flex;
  vertical-align: middle;
}
.a11y-btn--split{
  border-left: 0;
  padding-left: 7px;
  border-radius: 0 var(--a11y-btn-radius) var(--a11y-btn-radius) 0;
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
  background: rgba(240,248,255,.85);
  border-color: rgba(15,23,42,.12);
  min-width:30px;
  width: 34px;
  max-width:38px;
  font-size: 1rem;
  align-items:center;
  justify-content:center;
  cursor: pointer;
}
.a11y-btn--night{
  border-radius: var(--a11y-btn-radius) 0 0 var(--a11y-btn-radius);
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  border-right: 0;
}
.a11y-ico--dropdown {
  transition: transform .18s cubic-bezier(.4,2,.4,1);
  margin-left: 0;
  vertical-align: middle;
  position:relative;
  left:0;top:0;
}
.a11y-split-group.open .a11y-ico--dropdown {
  transform: rotate(180deg);
}
.a11y-darkreader-dropdown {
  position: absolute;
  top: 36px;
  left: 0;
  min-width: 250px;
  background: #fff;
  border: 1px solid #dbe3ea;
  border-radius: 11px;
  box-shadow: 0 8px 38px 0 rgba(18,20,42,0.13);
  padding: 10px 16px 10px 16px;
  z-index: 107000;
  font-size: .97rem;
  color: #1a202c;
  display: none;
}
.a11y-split-group.open .a11y-darkreader-dropdown {
  display: block;
}
.a11y-darkreader-dropdown label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: .97rem;
  margin: 0;
  font-weight: 500;
  user-select: none;
}
.a11y-darkreader-dropdown .a11y-dd-slider {
  margin: 4px 0 12px 0;
  width: 100%;
  accent-color: #003cf0;
}
.a11y-darkreader-dropdown select {
  margin-left: 10px;
  border: 1px solid #c7cde0;
  border-radius: 6px;
  padding: 2px 6px;
  font-size: .98rem;
}
.a11y-darkreader-dropdown .a11y-dd-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}
.a11y-darkreader-dropdown .a11y-dd-reset {
  cursor: pointer;
  margin-top: 8px;
  color: #0040c3;
  display: inline-block;
  text-decoration: underline dotted #339;
  background: none;
  border: none;
  font-size: .97rem;
  font-weight: 600;
}
.a11y-darkreader-dropdown .a11y-dd-reset:hover {
  color: #2d68f4;
}
.a11y-darkreader-dropdown hr {
  border: none;
  border-top: 1px solid #dbe3ea;
  margin: 10px 0;
}
.a11y-dd-caption {
  color: #6b7280;
  display: block;
  font-size:.89em;
  margin-bottom:4px;
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
      <div class="a11y-split-group" id="a11y-night-split-wrap">
        <button type="button"
          class="a11y-btn a11y-btn--night"
          data-action="contrast"
          aria-pressed="false"
          aria-label="Modo Noturno (Alt+3)"
          title="Modo Noturno (Alt+3)"
          id="a11y-contrast-btn">
          <span class="a11y-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"></circle><path d="M14.5 9.5A3.5 3.5 0 1 1 9.5 14.5 6 6 0 1 0 14.5 9.5Z" fill="currentColor" opacity="0.5"></path></svg>
          </span>
          <span class="a11y-btn__txt">Modo Noturno</span>
        </button>
        <button type="button"
          class="a11y-btn a11y-btn--split"
          tabindex="0"
          id="a11y-contrast-arrow"
          aria-label="Abrir configurações do modo noturno"
          title="Configurações do modo noturno"
          aria-haspopup="true"
          aria-expanded="false"
        >
          <span class="a11y-ico a11y-ico--dropdown" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none"><path d="M7 8l3 3 3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
        </button>
        <div class="a11y-darkreader-dropdown" id="a11y-darkreader-dropdown" role="menu" aria-label="Configurações do modo noturno">
          <div class="a11y-dd-row">
            <label for="a11ydd-theme">Tema:</label>
            <select id="a11ydd-theme">
              <option value="dynamicTheme">Dinâmico</option>
              <option value="filter">Filtro (Rápido)</option>
              <option value="filterPlus">Filtro Avançado</option>
              <option value="staticTheme">Estático</option>
            </select>
          </div>
          <div>
            <label for="a11ydd-brightness">Brilho: <span id="a11y-dd-brightness-value">100</span>%</label>
            <input type="range" min="80" max="120" step="1" id="a11ydd-brightness" class="a11y-dd-slider" value="100">
            <label for="a11ydd-contrast">Contraste: <span id="a11y-dd-contrast-value">100</span>%</label>
            <input type="range" min="80" max="120" step="1" id="a11ydd-contrast" class="a11y-dd-slider" value="100">
            <label for="a11ydd-sepia">Sepia: <span id="a11y-dd-sepia-value">0</span>%</label>
            <input type="range" min="0" max="100" step="1" id="a11ydd-sepia" class="a11y-dd-slider" value="0">
          </div>
          <hr>
          <button type="button" class="a11y-dd-reset" id="a11ydd-darkreset">Restaurar Padrão</button>
        </div>
      </div>
      <div class="a11y-split-group" id="a11y-gray-split-wrap">
        <button type="button"
          class="a11y-btn"
          data-action="grayscale"
          aria-pressed="false"
          aria-label="Escala de cinza (Alt+4)"
          title="Escala de cinza (Alt+4)"
          id="a11y-gray-btn"
        >
          <span class="a11y-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 1 0 16 0A8 8 0 1 0 4 12Z" stroke="currentColor" stroke-width="2"/><path d="M12 4c-2.5 2-2.5 14 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 4c2.5 2 2.5 14 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".35"/></svg>
          </span>
          <span class="a11y-btn__txt">Cinza</span>
        </button>
        <button
          class="a11y-btn a11y-btn--split"
          id="a11y-gray-arrow"
          aria-label="Editar escala de cinza"
          tabindex="0" title="Editar escala de cinza" aria-haspopup="true" aria-expanded="false">
          <span class="a11y-ico a11y-ico--dropdown" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none"><path d="M7 8l3 3 3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
        </button>
        <div class="a11y-darkreader-dropdown" id="a11y-grayscale-dropdown" role="menu" aria-label="Escala de cinza personalizada">
          <label class="a11y-dd-caption" for="a11ydd-grayscale">Intensidade do cinza (<span id="a11y-dd-gray-value">100</span>%)</label>
          <input type="range" min="0" max="100" step="1" id="a11ydd-grayscale" class="a11y-dd-slider" value="100">
          <span style="font-size: .93em; color: #4c5563;">Arraste para menos para reduzir o efeito.</span>
        </div>
      </div>
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

  function setDropdownValuesFromPrefs() {
    if (!document.getElementById('a11y-darkreader-dropdown')) return;
    document.getElementById('a11ydd-theme').value = prefs.darkModeEngine || 'dynamicTheme';
    document.getElementById('a11ydd-brightness').value = prefs.darkModeBrightness;
    document.getElementById('a11y-dd-brightness-value').textContent = prefs.darkModeBrightness;
    document.getElementById('a11ydd-contrast').value = prefs.darkModeContrast;
    document.getElementById('a11y-dd-contrast-value').textContent = prefs.darkModeContrast;
    document.getElementById('a11ydd-sepia').value = prefs.darkModeSepia;
    document.getElementById('a11y-dd-sepia-value').textContent = prefs.darkModeSepia;
  }

  function setGrayDropdownFromPrefs() {
    const g = document.getElementById('a11ydd-grayscale');
    const v = document.getElementById('a11y-dd-gray-value');
    if (g) g.value = prefs.grayscaleScale;
    if (v) v.textContent = prefs.grayscaleScale;
  }

  function applyPrefs() {
    const root = document.documentElement;
    const body = document.body;
    const bar = document.querySelector(".a11y-bar");
    root.style.setProperty("--a11y-font-scale", String(prefs.fontScale));
    root.style.setProperty("--a11y-grayscale", prefs.grayscale ? Math.round(prefs.grayscaleScale) + "%" : "0%");

    if (prefs.darkMode) enableDarkReader();
    else                disableDarkReader();

    body.classList.toggle("a11y-reduce-motion", !!prefs.reduceMotion);
    body.classList.toggle("a11y-strong-focus", !!prefs.strongFocus);

    if (bar) {
      bar.classList.toggle("is-collapsed", !!prefs.collapsed);
      const tgl = bar.querySelector('.a11y-btn[data-action="toggle"]');
      if (tgl) tgl.setAttribute("aria-expanded", String(!prefs.collapsed));
    }
    setPressed("contrast", !!prefs.darkMode);
    setPressed("grayscale", prefs.grayscale);
    setPressed("reduce-motion", !!prefs.reduceMotion);
    setPressed("focus", !!prefs.strongFocus);

    setDropdownValuesFromPrefs();
    setGrayDropdownFromPrefs();
  }

  function handleAction(action) {
    switch (action) {
      case "font-inc":
        prefs.fontScale = clamp(Number((prefs.fontScale + 0.05).toFixed(2)), 0.85, 1.35);
        break;
      case "font-dec":
        prefs.fontScale = clamp(Number((prefs.fontScale - 0.05).toFixed(2)), 0.85, 1.35);
        break;
      case "contrast":
        prefs.darkMode = !prefs.darkMode;
        if (prefs.darkMode) enableDarkReader(); else disableDarkReader();
        break;
      case "grayscale":
        prefs.grayscale = !prefs.grayscale;
        break;
      case "reduce-motion":
        prefs.reduceMotion = !prefs.reduceMotion;
        break;
      case "focus":
        prefs.strongFocus = !prefs.strongFocus;
        break;
      case "toggle":
        prefs.collapsed = !prefs.collapsed;
        break;
      case "reset":
        prefs.fontScale = 1;
        prefs.darkMode = false;
        prefs.darkModeEngine = 'dynamicTheme';
        prefs.darkModeBrightness = 100;
        prefs.darkModeContrast = 100;
        prefs.darkModeSepia = 0;
        prefs.grayscale = false;
        prefs.grayscaleScale = 100;
        prefs.reduceMotion = false;
        prefs.strongFocus = false;
        prefs.collapsed = false;
        disableDarkReader();
        break;
      default: return;
    }
    savePrefs();
    applyPrefs();
  }

  function hideDropdown(dropType) {
    let wrap;
    if (dropType === 'night') {
      wrap = document.getElementById('a11y-night-split-wrap');
    } else if (dropType === 'gray') {
      wrap = document.getElementById('a11y-gray-split-wrap');
    }
    if (wrap) wrap.classList.remove('open');
    if (dropType === 'night') {
      const arrbtn = document.getElementById('a11y-contrast-arrow');
      if (arrbtn) arrbtn.setAttribute('aria-expanded', 'false');
    }
    if (dropType === 'gray') {
      const arrbtn = document.getElementById('a11y-gray-arrow');
      if (arrbtn) arrbtn.setAttribute('aria-expanded', 'false');
    }
  }

  function showDropdown(dropType) {
    let wrap;
    if (dropType === 'night') {
      wrap = document.getElementById('a11y-night-split-wrap');
    } else if (dropType === 'gray') {
      wrap = document.getElementById('a11y-gray-split-wrap');
    }
    if (wrap) wrap.classList.add('open');
    if (dropType === 'night') {
      const arrbtn = document.getElementById('a11y-contrast-arrow');
      if (arrbtn) arrbtn.setAttribute('aria-expanded', 'true');
      setDropdownValuesFromPrefs();
    }
    if (dropType === 'gray') {
      const arrbtn = document.getElementById('a11y-gray-arrow');
      if (arrbtn) arrbtn.setAttribute('aria-expanded', 'true');
      setGrayDropdownFromPrefs();
    }
  }

  function closeAllDropdowns() {
    hideDropdown('night');
    hideDropdown('gray');
  }

  function bindDropdowns() {
    // NIGHT MODE SPLIT
    const nightArrowBtn = document.getElementById('a11y-contrast-arrow');
    const nightSplitWrap = document.getElementById('a11y-night-split-wrap');
    if (nightArrowBtn && nightSplitWrap) {
      nightArrowBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = nightSplitWrap.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) showDropdown('night');
      });
    }
    // NIGHT MODE BTN (ativa/desativa night)
    const nightBtn = document.getElementById('a11y-contrast-btn');
    if (nightBtn) {
      nightBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        prefs.darkMode = !prefs.darkMode;
        if (prefs.darkMode) enableDarkReader(); else disableDarkReader();
        savePrefs(); applyPrefs();
      });
    }

    // GRAY SPLIT
    const grayArrowBtn = document.getElementById('a11y-gray-arrow');
    const graySplitWrap = document.getElementById('a11y-gray-split-wrap');
    if (grayArrowBtn && graySplitWrap) {
      grayArrowBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = graySplitWrap.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) showDropdown('gray');
      });
    }
    // GRAY main btn
    const grayBtn = document.getElementById('a11y-gray-btn');
    if (grayBtn) {
      grayBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        handleAction('grayscale');
      });
    }

    // OUT click = fecha
    document.addEventListener('click', function() { closeAllDropdowns(); });

    // darkreader/escala events
    // -- NIGHT DROPDOWN
    const themeSel = document.getElementById('a11ydd-theme');
    const bright = document.getElementById('a11ydd-brightness');
    const contr = document.getElementById('a11ydd-contrast');
    const sepia = document.getElementById('a11ydd-sepia');
    const brVal = document.getElementById('a11y-dd-brightness-value');
    const coVal = document.getElementById('a11y-dd-contrast-value');
    const seVal = document.getElementById('a11y-dd-sepia-value');
    const resetBtn = document.getElementById('a11ydd-darkreset');

    if (themeSel) themeSel.addEventListener('change', function() {
      prefs.darkModeEngine = themeSel.value;
      savePrefs(); updateDarkReaderPrefs();
    });
    if (bright) bright.addEventListener('input', function () {
      prefs.darkModeBrightness = Number(bright.value);
      if (brVal) brVal.textContent = String(bright.value);
      savePrefs(); updateDarkReaderPrefs();
    });
    if (contr) contr.addEventListener('input', function () {
      prefs.darkModeContrast = Number(contr.value);
      if (coVal) coVal.textContent = String(contr.value);
      savePrefs(); updateDarkReaderPrefs();
    });
    if (sepia) sepia.addEventListener('input', function () {
      prefs.darkModeSepia = Number(sepia.value);
      if (seVal) seVal.textContent = String(sepia.value);
      savePrefs(); updateDarkReaderPrefs();
    });
    if (resetBtn) resetBtn.addEventListener("click", function(e) {
      e.preventDefault();
      prefs.darkModeEngine = 'dynamicTheme';
      prefs.darkModeBrightness = 100;
      prefs.darkModeContrast = 100;
      prefs.darkModeSepia = 0;
      savePrefs(); updateDarkReaderPrefs(); setDropdownValuesFromPrefs();
    });

    //-- ESCALA CINZA
    const graySlider = document.getElementById('a11ydd-grayscale');
    const grayVal = document.getElementById('a11y-dd-gray-value');
    if (graySlider) graySlider.addEventListener('input', function () {
      prefs.grayscale = true;
      prefs.grayscaleScale = Number(graySlider.value);
      if (grayVal) grayVal.textContent = String(graySlider.value);
      savePrefs(); applyPrefs();
    });
  }

  function bindEvents() {
    document.addEventListener("click", (e) => {
      if (e.target.closest('.a11y-btn--split') || e.target.closest('.a11y-darkreader-dropdown')) return;
      const btn = e.target.closest(".a11y-btn[data-action]");
      if (!btn) return;
      handleAction(btn.getAttribute("data-action"));
    });
    document.addEventListener("keydown", (e) => {
      if (!e.altKey) return;
      const map = {
        "1":"font-dec",
        "2":"font-inc",
        "3":"contrast",
        "4":"grayscale",
        "5":"reduce-motion",
        "6":"focus",
        "7":"reset",
        "8":"toggle"
      };
      const action = map[e.key];
      if (action) { e.preventDefault(); handleAction(action); }
    });
  }

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
      let currentTop = cs.top;
      if (currentTop === "" || currentTop === "auto" || currentTop === "0px" || Number(currentTop) === 0) {
        el.style.top = BAR_HEIGHT_PX + "px";
      }
      if (cs.position === "sticky") el.style.zIndex = String(9999);
    });
  }

  // Guarda o padding-top original do tema (antes de qualquer alteração nossa)
  let originalBodyPaddingTop = null;

  // Soma a altura da nossa barra ao espaço que o tema Moodle já reserva para a navbar,
  // em vez de sobrescrever o padding-top do tema (o que empurrava a navbar para cima do conteúdo).
  function applyBodyOffset() {
    if (originalBodyPaddingTop === null) {
      originalBodyPaddingTop = window.getComputedStyle(document.body).paddingTop || "0px";
    }
    document.body.style.setProperty(
      "padding-top",
      `calc(${originalBodyPaddingTop} + ${BAR_HEIGHT_PX}px)`,
      "important"
    );
  }

  // Calcula, com base na altura real da navbar do Moodle (Boost e derivados),
  // onde os togglers do drawer e os painéis laterais devem ficar — evita valores
  // fixos que quebram em temas/logos com altura diferente.
  function updateDrawerOffsets() {
    const headers = getCandidateHeaders().filter(isFixedOrSticky);
    let headerBottom = BAR_HEIGHT_PX;
    headers.forEach(el => {
      const bottom = el.getBoundingClientRect().bottom;
      if (bottom > headerBottom) headerBottom = bottom;
    });
    const root = document.documentElement;
    root.style.setProperty("--a11y-drawer-toggler-top", (headerBottom + 10) + "px");
    root.style.setProperty("--a11y-drawer-sidebar-top", headerBottom + "px");
  }

  function refreshLayout() {
    pushHeaderDown();
    applyBodyOffset();
    updateDrawerOffsets();
  }

  function init() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", init, { once: true });
      return;
    }
    loadPrefs();
    injectCSS();
    injectBar();
    // Carregar darkreader se ativado
    if (prefs.darkMode) {
      ensureDarkReaderReady(() => {
        enableDarkReader();
        setTimeout(applyPrefs, 60);
      });
    } else {
      setTimeout(applyPrefs, 10);
    }
    setTimeout(bindDropdowns, 24);
    bindEvents();
    // Roda mais de uma vez: no Moodle, blocos do dashboard/relatórios e o drawer
    // às vezes terminam de renderizar um pouco depois do carregamento inicial.
    [0, 300, 1000].forEach(delay => setTimeout(refreshLayout, delay));
    window.addEventListener("resize", () => setTimeout(refreshLayout, 0));
  }

  init();
})();