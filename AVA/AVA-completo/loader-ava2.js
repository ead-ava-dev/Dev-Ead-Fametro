(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.AVA_LOADER = factory();
  }
}(this, function () {
  'use strict';

  // ================= BASE URL =================
  function detectBaseURL() {
    // 1. tenta currentScript
    let script = document.currentScript;
  
    // 2. fallback: último script com loader-ava
    if (!script) {
      const scripts = document.querySelectorAll('script[src]');
      script = Array.from(scripts).find(s => s.src.includes('loader-ava'));
    }
  
    // 3. fallback mais agressivo (último script da página)
    if (!script) {
      const scripts = document.getElementsByTagName('script');
      script = scripts[scripts.length - 1];
    }
  
    // 4. extrai BASE_URL
    if (script && script.src) {
      return script.src.split('/').slice(0, -1).join('/') + '/';
    }
  
    // 5. fallback final (não ideal, mas seguro)
    return window.location.origin + '/';
  }

  const BASE_URL = window.AVA_BASE_URL || detectBaseURL();

  // ================= JSON5 =================
  let _json5Loaded = false;
  let _json5LoadingPromise = null;

  function ensureJSON5Loaded() {
    if (_json5Loaded || (window.JSON5 && window.JSON5.parse)) {
      _json5Loaded = true;
      return Promise.resolve();
    }

    if (_json5LoadingPromise) return _json5LoadingPromise;

    _json5LoadingPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");

      // tenta local primeiro
      s.src = BASE_URL + "libs/json5.min.js";

      s.onerror = function () {
        // fallback CDN
        const cdn = document.createElement("script");
        cdn.src = "https://cdn.jsdelivr.net/npm/json5@2.2.3/dist/index.min.js";
        cdn.onload = () => resolve();
        cdn.onerror = () => reject("Erro JSON5");
        document.head.appendChild(cdn);
      };

      s.onload = () => resolve();

      document.head.appendChild(s);
    });

    return _json5LoadingPromise;
  }

  // ================= UTILS =================
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || '';
    return div.innerHTML;
  }

  function escapeUrl(url) {
    if (!url) return '#';
    if (/^(https?|mailto|tel):/i.test(url)) return url;
    if (/^#[a-z0-9\-_]*$/i.test(url)) return url;
    return '#';
  }

  function escapeSrc(url) {
    if (!url) return '';
    if (/^(javascript|data:text\/html)/i.test(url)) return '';
    return url;
  }

  function loadCSS(url) {
    if (!document.querySelector(`link[data-css="${url}"]`)) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = url;
      l.setAttribute("data-css", url);
      document.head.appendChild(l);
    }
  }

  function loadJS(url, check) {
    if (check && check()) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // ================= FETCH =================
  const cache = new Map();

  async function fetchJSON(url) {
    if (cache.has(url)) return cache.get(url);

    const r = await fetch(url);
    if (!r.ok) throw new Error("Erro: " + url);

    const text = await r.text();
    await ensureJSON5Loaded();

    const data = window.JSON5.parse(text);
    cache.set(url, data);

    return data;
  }

  // ================= PLACEHOLDER =================
  function parsePlaceholders() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];

    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const text = node.nodeValue;
      if (!text.includes('{{ava:')) return;

      const frag = document.createDocumentFragment();
      const regex = /\{\{ava:([^:}]+):([^}]+)\}\}/g;

      let lastIndex = 0, match;

      while ((match = regex.exec(text))) {
        frag.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));

        const div = document.createElement("div");
        div.className = "ava-component";
        div.dataset.component = match[1];
        div.dataset.config = match[2];

        frag.appendChild(div);
        lastIndex = regex.lastIndex;
      }

      frag.appendChild(document.createTextNode(text.substring(lastIndex)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  // ================= BUTTON =================
  function initButtons(container, configName) {
    loadCSS(BASE_URL + "buttonAVA/buttonava.css");

    container.innerHTML = `<div class="buttonava-wrapper"><div class="buttonava-grid"></div></div>`;

    fetchJSON(BASE_URL + "buttonAVA/" + configName + ".json")
      .then(data => {
        const html = (data.botoes || []).map(btn => {
          const dead = !btn.url || btn.url.includes('#');

          if (dead) {
            return `<div class="btn-card btn-ava-disabled">${btn.titulo}</div>`;
          }

          return `<a href="${escapeUrl(btn.url)}" class="btn-card">${btn.titulo}</a>`;
        }).join('');

        container.querySelector('.buttonava-grid').innerHTML = html;
      });
  }

  // ================= BANNER =================
  let _slickLoaded = false;

  function ensureSlick() {
    if (_slickLoaded) return Promise.resolve();

    return Promise.all([
      loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css"),
      loadJS("https://code.jquery.com/jquery-3.6.0.min.js", () => window.jQuery || window.$),
      loadJS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js",
        () => (window.jQuery || window.$)?.fn?.slick)
    ]).then(() => _slickLoaded = true);
  }

  function initBanner(container, configName) {
    loadCSS(BASE_URL + "bannerAVA/bannerava.css");

    container.innerHTML = `<div class="slick-banner"><div class="Slick-Principal"></div></div>`;

    const el = container.querySelector(".Slick-Principal");

    fetchJSON(BASE_URL + "bannerAVA/" + configName + ".json")
      .then(config => {
        const slides = config.slides || [];

        slides.forEach(s => {
          el.insertAdjacentHTML("beforeend", `
            <div><img src="${escapeSrc(s.desktop)}"></div>
          `);
        });

        if (slides.length > 1) {
          setTimeout(() => {
            ensureSlick().then(() => {
              const $ = window.jQuery || window.$;
              $ && $(el).slick();
            });
          }, 0);
        }
      });
  }

  // ================= INIT =================
  let _init = false;

  function init() {
    if (_init) return;
    _init = true;

    document.addEventListener("click", function (e) {
      const link = e.target.closest("a");
      if (!link) return;

      const href = (link.getAttribute("href") || "").toLowerCase();

      if (/^\/?#$/.test(href) || href.includes("javascript:void")) {
        e.preventDefault();
      }
    });

    function renderAll() {
      parsePlaceholders();

      document.querySelectorAll(".ava-component").forEach(el => {
        const type = el.dataset.component;
        const config = el.dataset.config;

        if (type === "buttonAVA") initButtons(el, config);
        if (type === "bannerAVA") initBanner(el, config);
      });
    }

    renderAll();

    // 🔥 MutationObserver (nível absurdo)
    const observer = new MutationObserver(() => renderAll());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ================= AUTO START =================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return { init };

}));
