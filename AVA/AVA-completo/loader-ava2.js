(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else {
    root.AVA_LOADER = factory();
  }
})(this, function () {
  "use strict";

  /* ================= BASE URL ================= */

  function detectBaseURL() {
    let script = document.currentScript;

    if (!script) {
      const scripts = document.querySelectorAll('script[src*="loader-ava"]');
      script = scripts[scripts.length - 1];
    }

    if (script && script.src) {
      return script.src.split("/").slice(0, -1).join("/") + "/";
    }

    if (document?.location) {
      return document.location.href.replace(/\/[^/]*$/, "/");
    }

    return "";
  }

  const BASE_URL = detectBaseURL();

  /* ================= UTIL ================= */

  function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
  }

  function escapeUrl(url) {
    if (!url) return "#";
    const s = String(url).trim();
    if (/^(https?|mailto|tel):/i.test(s)) return s;
    if (/^#[a-z0-9\-_]*$/i.test(s)) return s;
    return "#";
  }

  function escapeSrc(url) {
    if (!url) return "";
    const s = String(url).trim();
    if (/^\s*(javascript|data:text\/html)/i.test(s)) return "";
    return s;
  }

  function isDeadLink(href) {
    if (!href) return true;

    const h = href.trim().toLowerCase();

    return (
      h === "" ||
      h === "#" ||
      h === "/#" ||
      h === "/linksemdestino" ||
      h === "javascript:void(0)" ||
      h === "javascript:;"
    );
  }

  /* ================= CSS / JS ================= */

  async function inlineCSS(url, target = document.head) {
    try {
      if (document.querySelector(`style[data-inline-css="${url}"]`)) return;

      const r = await fetch(url, { cache: "reload" });
      if (!r.ok) throw new Error();

      const css = await r.text();

      const style = document.createElement("style");
      style.setAttribute("data-inline-css", url);
      style.textContent = css;

      target.appendChild(style);
    } catch {
      if (!document.querySelector(`link[href="${url}"]`)) {
        const l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = url;
        target.appendChild(l);
      }
    }
  }

  function loadCSS(url) {
    return inlineCSS(url);
  }

  function loadJS(url, check) {
    if (check && check()) return Promise.resolve();

    if (document.querySelector(`script[src="${url}"]`)) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.defer = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /* ================= JSON5 ================= */

  let _json5Loaded = false;

  async function ensureJSON5() {
    if (_json5Loaded) return;

    await loadJS(
      "https://cdn.jsdelivr.net/npm/json5@2/dist/index.min.js",
      () => window.JSON5
    );

    _json5Loaded = true;
  }

  async function fetchJSON(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("Erro JSON: " + url);

    const text = await r.text();

    try {
      return JSON.parse(text);
    } catch {
      await ensureJSON5();
      return JSON5.parse(text);
    }
  }

  /* ================= PLACEHOLDERS ================= */

  function parsePlaceholders() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    const nodes = [];

    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      const text = node.nodeValue;

      if (!text.includes("{{")) return;

      const frag = document.createDocumentFragment();

      const regex = /\{\{ava:([^:}]+):([^}]+)\}\}/g;

      let last = 0;
      let match;

      while ((match = regex.exec(text))) {
        const [, component, config] = match;

        frag.appendChild(
          document.createTextNode(text.substring(last, match.index))
        );

        const div = document.createElement("div");
        div.className = "ava-component";
        div.dataset.component = component;
        div.dataset.config = config;

        frag.appendChild(div);

        last = regex.lastIndex;
      }

      frag.appendChild(document.createTextNode(text.substring(last)));

      node.parentNode.replaceChild(frag, node);
    });
  }

  /* ================= COMPONENTS ================= */

  async function initComponents() {
    const comps = document.querySelectorAll(".ava-component");

    for (const comp of comps) {
      const type = comp.dataset.component;
      const config = comp.dataset.config;

      try {
        if (type === "bannerAVA") await initBanner(comp, config);
        if (type === "buttonAVA") await initButtons(comp, config);
      } catch (e) {
        console.error("Erro componente:", type, e);
      }
    }
  }

  /* ================= SLICK ================= */

  let _slickLoaded = false;

  async function ensureSlick() {
    if (_slickLoaded) return;

    await loadCSS(
      "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css"
    );
    await loadCSS(
      "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css"
    );

    await loadJS("https://code.jquery.com/jquery-3.6.0.min.js", () => window.jQuery);

    await loadJS(
      "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js",
      () => window.jQuery?.fn?.slick
    );

    _slickLoaded = true;
  }

  /* ================= BANNER ================= */

  async function initBanner(container, configName) {
    const path = BASE_URL + "bannerAVA/";

    await loadCSS(path + "bannerava.css");

    let config;

    try {
      config = await fetchJSON(path + configName + ".json?v=" + Date.now());
    } catch (e) {
      console.error("Erro banner config:", e);
      return;
    }

    const slides = config.slides || [];

    if (!slides.length) return;

    container.innerHTML = `
    <div class="slick-banner">
      <div class="Slick-Principal"></div>
    </div>
    `;

    const slickEl = container.querySelector(".Slick-Principal");

    const renderSlide = (slide) => {
      const rawLink = (slide.link || "").trim().toLowerCase();

      const desktop = escapeSrc(slide.desktop);
      const mobile = escapeSrc(slide.mobile) || desktop;

      const alt = escapeHtml(slide.alt);

      let html;

      if (isDeadLink(rawLink)) {
        html = `
        <div>
          <picture>
            <source media="(min-width:600px)" srcset="${desktop}">
            <img src="${mobile}" alt="${alt}">
          </picture>
        </div>
        `;
      } else {
        const link = escapeUrl(slide.link);

        html = `
        <div>
          <a href="${link}" target="_blank" rel="noopener">
            <picture>
              <source media="(min-width:600px)" srcset="${desktop}">
              <img src="${mobile}" alt="${alt}">
            </picture>
          </a>
        </div>
        `;
      }

      slickEl.insertAdjacentHTML("beforeend", html);
    };

    slides.forEach(renderSlide);

    if (slides.length === 1) return;

    await ensureSlick();

    window.jQuery(slickEl).slick({
      dots: true,
      arrows: true,
      infinite: true,
      speed: 800,
      slidesToShow: 1,
      autoplay: true,
      autoplaySpeed: 4000,
    });
  }

  /* ================= BUTTONS ================= */

  async function initButtons(container, configName) {
    const path = BASE_URL + "buttonAVA/";

    await loadCSS(path + "buttonava.css");

    let data;

    try {
      data = await fetchJSON(path + configName + ".json?v=" + Date.now());
    } catch (e) {
      console.error("Erro botões:", e);
      return;
    }

    const botoes = data.botoes || [];

    const html = botoes
      .map((btn) => {
        const href = (btn.url || "").trim().toLowerCase();

        const disabled = isDeadLink(href);

        const url = disabled ? "#" : escapeUrl(btn.url);

        return `
      <a href="${url}" 
         class="btn-card btn-ava ${disabled ? "btn-disabled" : ""}"
         ${disabled ? 'style="pointer-events:none;cursor:default"' : ""}>
        <div class="icon-container">
          <i class="${escapeHtml(btn.icone)}"></i>
        </div>
        <span class="btn-text">${escapeHtml(btn.titulo)}</span>
      </a>
      `;
      })
      .join("");

    container.innerHTML = `
    <div class="buttonava-wrapper">
      <div class="buttonava-grid">
        ${html}
      </div>
    </div>
    `;
  }

  /* ================= INIT ================= */

  let started = false;

  async function init() {
    if (started) return;
    started = true;

    parsePlaceholders();

    await initComponents();
  }

  function resetInit() {
    started = false;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return { init, resetInit };
});
