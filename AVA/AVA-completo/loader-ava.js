(function (root, factory) {
  // Universal Module Definition (AMD/CommonJS/Global)
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.AVA_LOADER = factory();
  }
}(this, function () {
  'use strict';

  // ================ BASE URL ===================
  function detectBaseURL() {
    let script = document.currentScript;
    if (!script) {
      const scripts = document.querySelectorAll('script[src*="loader-ava"]');
      script = scripts[scripts.length - 1];
    }
    if (script && script.src) {
      return script.src.split('/').slice(0, -1).join('/') + '/';
    }
    if (typeof document !== 'undefined' && document.location) {
      const href = document.location.href;
      const path = document.location.pathname || '';
      if (/\/buttonAVA\/|\/buttonAVA\//.test(path)) {
        return href.replace(/\/[^/]*$/, '/').replace(/[^/]+\/$/, '../');
      }
      return href.replace(/\/[^/]*$/, '/');
    }
    return '';
  }
  const BASE_URL = detectBaseURL();

  // ================ UTILITÁRIOS ===================
  function escapeHtml(text) {
    if (text == null || text === '') return '';
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
  }

  function escapeUrl(url) {
    if (url == null || url === '') return '#';
    const s = String(url).trim();
    if (/^(https?|mailto|tel):/i.test(s)) return s;
    if (/^#[a-z0-9\-_]*$/i.test(s)) return s;
    return '#';
  }

  function escapeSrc(url) {
    if (url == null || url === '') return '';
    const s = String(url).trim();
    if (/^\s*(javascript|data:text\/html|data:application)/i.test(s)) return '';
    return s;
  }

  // Função para inline de CSS para melhorar compatibilidade com Moodle
  async function inlineCSS(url, target = document.head) {
    try {
      // Checa se já foi injetado
      if (document.querySelector(`style[data-inline-css="${url}"]`)) return;
      const response = await fetch(url, { cache: "reload" });
      if (!response.ok) throw new Error('Erro ao carregar CSS: ' + url);
      let css = await response.text();

      // CORRIGE FONT URL: Sobrescreve o font-face do slick-carousel
      if (url.includes('slick-theme.css')) {
        css = css.replaceAll(
          './fonts/',
          'https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/fonts/'
        );
      }

      const style = document.createElement('style');
      style.setAttribute('data-inline-css', url);
      style.textContent = css;
      target.appendChild(style);
    } catch(e) {
      // fallback para link tradicional se fetch falhar
      if (!document.querySelector(`link[href="${url}"]`)) {
        const l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = url;
        target.appendChild(l);
      }
    }
  }

  function loadCSS(url) {
    // Prioriza inline CSS por causa de problemas no Moodle
    return inlineCSS(url);
  }

  function loadJS(url, checkFn) {
    if (checkFn && checkFn()) return Promise.resolve();
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

  async function fetchJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("Erro ao carregar JSON: " + url);
    return r.json();
  }

  async function fetchText(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("Erro ao carregar HTML: " + url);
    return r.text();
  }

  // ================ PARSE DE PLACEHOLDER ===================
  function parsePlaceholders() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach(node => {
      const text = node.nodeValue;
      if (!text.includes('{{')) return;
      const frag = document.createDocumentFragment();
      const regex = /\{\{ava:([^:}]+):([^}]+)\}\}/g;
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const [full, component, config] = match;
        // Texto antes do placeholder
        frag.appendChild(
          document.createTextNode(text.substring(lastIndex, match.index))
        );
        // Cria container para o componente
        const div = document.createElement("div");
        div.className = "ava-component";
        div.dataset.component = component;
        div.dataset.config = config;
        frag.appendChild(div);
        lastIndex = regex.lastIndex;
      }
      frag.appendChild(
        document.createTextNode(text.substring(lastIndex))
      );
      if (node.parentNode) {
        node.parentNode.replaceChild(frag, node);
      }
    });
  }

  // ================ INICIALIZAÇÃO DE COMPONENTES ===================
  async function initComponents() {
    const components = document.querySelectorAll(".ava-component");
    for (const comp of components) {
      const component = comp.dataset.component;
      const config = comp.dataset.config;
      try {
        if (component === "bannerAVA") {
          await initBanner(comp, config);
        } else if (component === "buttonAVA") {
          await initButtons(comp, config);
        }
      } catch (e) {
        console.error("Erro componente:", component, e);
      }
    }
  }

  // ================ BANNER (Slick carregado 1x) ===================
  let _slickLoaded = false;
  async function ensureSlickLoaded() {
    if (_slickLoaded) return;
    await loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css");
    await loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css");
    await loadJS(
      "https://code.jquery.com/jquery-3.6.0.min.js",
      () => window.jQuery
    );
    await loadJS(
      "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js",
      () => window.jQuery?.fn?.slick
    );
    _slickLoaded = true;
  }

  async function initBanner(container, configName) {
    // Valida BASE_URL
    if (!BASE_URL) {
      console.error("AVA Loader: BASE_URL vazia.");
      return;
    }
    const componentPath = BASE_URL + "bannerAVA/";

    // Carrega CSS customizado do banner
    await loadCSS(componentPath + "bannerava.css");
    // Garante slick carregado 1x
    await ensureSlickLoaded();

    const template = `
      <div class="slick-banner"> 
        <div class="Slick-Principal"></div>
      </div>
    `;

    let config;
    try {
      config = await fetchJSON(
        componentPath + configName + ".json?v=" + Date.now()
      );
    } catch (e) {
      console.error("Erro ao carregar config do banner:", e);
      container.innerHTML = "";
      return;
    }

    container.innerHTML = template;

    const slickEl = container.querySelector(".Slick-Principal");
    if (!slickEl) {
      console.error("AVA Loader: .Slick-Principal não encontrado.");
      return;
    }

    // ---------- Função parsing de datas flexível ----------
    function parseDateFlexible(dateStr, endOfDay = false) {
      if (!dateStr) return null;
      // Formato brasileiro dd/mm/aaaa
      if (dateStr.includes("/")) {
        const [day, month, year] = dateStr.split("/").map(Number);
        return endOfDay
          ? new Date(year, month - 1, day, 23, 59, 59)
          : new Date(year, month - 1, day, 0, 0, 0);
      }
      // Formato ISO aaaa-mm-dd
      if (dateStr.includes("-")) {
        return endOfDay
          ? new Date(dateStr + "T23:59:59")
          : new Date(dateStr + "T00:00:00");
      }
      return null;
    }

    // ---------- Filtra slides por período ----------
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const slides = (config.slides || []).filter(slide => {
      if (!slide.inicio || !slide.fim) return true;
      const inicio = parseDateFlexible(slide.inicio, false);
      const fim = parseDateFlexible(slide.fim, true);
      if (!inicio || !fim) return true;
      return hoje >= inicio && hoje <= fim;
    });

    if (!slides.length) {
      container.innerHTML = "";
      return;
    }

    // ---------- Monta os slides ----------
    /*slides.forEach(slide => {
      const link = escapeUrl(slide.link);
      const desktop = escapeSrc(slide.desktop) || "";
      const mobile = escapeSrc(slide.mobile) || desktop;
      const alt = escapeHtml(slide.alt || "");
      slickEl.insertAdjacentHTML("beforeend",
        '<div><a href="' + link + '" target="_blank" rel="noopener">' +
          '<picture>' +
            '<source media="(min-width:600px)" srcset="' + desktop + '">' +
            '<img src="' + mobile + '" alt="' + alt + '">' +
          '</picture>' +
        '</a></div>'
      );
    });*/
        // ---------- Monta os slides com prioridade de carregamento ----------
    slides.forEach((slide, index) => {
      const link = escapeUrl(slide.link);
      const desktop = escapeSrc(slide.desktop) || "";
      const mobile = escapeSrc(slide.mobile) || desktop;
      const alt = escapeHtml(slide.alt || "");

      // Primeira imagem com maior prioridade, demais em lazy
      const isFirst = index === 0;
      const loadingAttr = isFirst ? 'eager' : 'lazy';
      const fetchPriorityAttr = isFirst ? 'high' : 'low';

      slickEl.insertAdjacentHTML("beforeend",
        '<div><a href="' + link + '" target="_blank" rel="noopener">' +
          '<picture>' +
            '<source media="(min-width:600px)" srcset="' + desktop + '">' +
            '<img src="' + mobile + '" alt="' + alt + '" loading="' + loadingAttr + '" fetchpriority="' + fetchPriorityAttr + '" decoding="async">' +
          '</picture>' +
        '</a></div>'
      );
    });
    // ---------- Inicializa Slick ----------
    window.jQuery(slickEl).slick({
        dots: true,
        arrows: true,
        infinite: slides.length > 1,
        speed: 800,
        slidesToShow: 1,
        adaptiveHeight: true,
        autoplay: config.autoplay !== false,
        autoplaySpeed: config.tempo || 4000
      });
    }

  // ================ BUTTONS (Botões customizados) ===================
  // Carrega e injeta o CSS customizado dos botões do AVA
  async function ensureButtonAVACssLoaded() {
    if (!BASE_URL) {
      console.error("AVA Loader: BASE_URL vazia.");
      return;
    }
    await loadCSS(BASE_URL + "buttonAVA/buttonava.css");
  }

  // Inicializa botões customizados
  async function initButtons(container, configName) {
    if (!BASE_URL) {
      console.error("AVA Loader: BASE_URL vazia.");
      return;
    }
    const componentPath = BASE_URL + "buttonAVA/";

    // Certifica-se de carregar o CSS (carrega apenas uma vez)
    await ensureButtonAVACssLoaded();

    let data;
    try {
      data = await fetchJSON(componentPath + configName + ".json?v=" + Date.now());
      if (!data) throw new Error("JSON vazio");
    } catch (e) {
      console.error("Erro ao carregar config dos botões:", e);
      container.innerHTML = "";
      return;
    }

    const botoes = data.botoes || [];

    const buttonsHtml = botoes.map(btn => `
      <a href="${escapeUrl(btn.url)}" class="btn-card btn-ava">
        <div class="icon-container">
          <i class="${escapeHtml(btn.icone)}"></i>
        </div>
        <span class="btn-text">${escapeHtml(btn.titulo)}</span>
      </a>
    `).join("");

    container.innerHTML = `<div class="buttonava-wrapper"><div class="buttonava-grid">${buttonsHtml}</div></div>`;
  }

  // ================ INICIALIZAÇÃO GERAL ===================
  let _initDone = false;

  async function init() {
    if (_initDone) return;
    _initDone = true;
    parsePlaceholders();
    await initComponents();
  }

  function resetInit() {
    _initDone = false;
  }

  // ================ AUTO-START (se não for AMD) ===================
  if (typeof define !== "function" || !define.amd) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  return { init, resetInit };
}));
