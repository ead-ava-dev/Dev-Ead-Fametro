(function (root, factory) {
  // Universal Module Definition (AMD/CommonJS/Global)
  if (typeof define === 'function' && define.amd) {
    // Define compatível com RequireJS/Moodle/YUI e outros loaders
    define('loader-ava', [], factory);
  } else {
    root.AVA_LOADER = factory();
  }
}(this, function () {
  'use strict';

  // ================ BASE URL ===================
  // Detecta a base do script mesmo em contextos embarcados (ex: script no Github, em CDN, no Moodle)
  function detectBaseURL() {
    // Tentativa com currentScript
    let script = document.currentScript;
    if (!script) {
      // Busca o último src que contenha "loader-ava" (ajuda quando importado em Moodle, Github...)
      const scripts = document.querySelectorAll('script[src*="loader-ava"]');
      script = scripts[scripts.length - 1];
    }
    if (script && script.src) {
      // Suporta caminhos absolutos/relativos/Github/CMS/Moodle
      return script.src.split('/').slice(0, -1).join('/') + '/';
    }
    if (typeof document !== 'undefined' && document.location) {
      // Fallback "relativo", nunca ideal, mas mantém algum funcionamento
      return (document.location.href || '').replace(/\/[^/]*$/, '/');
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
    // Bloqueia javascript, data e fontes potencialmente perigosas
    if (/^\s*(javascript|data:text\/html|data:application)/i.test(s)) return '';
    return s;
  }

  // Função para inline de CSS visando máxima compatibilidade com Moodle (filtros, CSP, etc)
  async function inlineCSS(url, target) {
    // target = elemento para inserir o <style>, default: <head>
    target = target || document.head;
    try {
      if (document.querySelector(`style[data-inline-css="${url}"]`)) return;
      const response = await fetch(url, { cache: "reload" }); // cache reload para Moodle não usar CSS antigo
      if (!response.ok) throw new Error('Erro ao carregar CSS: ' + url);
      let css = await response.text();
      // Ajusta fontes do slick, sempre força path CDN para evitar erros no Moodle
      if (url.includes('slick-theme.css')) {
        css = css.replace(/\.\/fonts\//g,
          'https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/fonts/');
      }
      const style = document.createElement('style');
      style.setAttribute('data-inline-css', url);
      style.textContent = css;
      target.appendChild(style);
    } catch (e) {
      // Fallback: tenta <link>, caso fetch falhar (ex: CSP moodle, CORS...)
      if (!document.querySelector(`link[href="${url}"]`)) {
        const l = document.createElement('link');
        l.rel = "stylesheet";
        l.href = url;
        target.appendChild(l);
      }
    }
  }

  function loadCSS(url) {
    // Sempre prioriza inline para evitar problemas com Moodle e CSP
    return inlineCSS(url);
  }

  // Carregador universal de JS (evita duplicação, checks, etc)
  function loadJS(url, checkFn) {
    if (checkFn && checkFn()) return Promise.resolve();
    if (document.querySelector(`script[src="${url}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.defer = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // Suporte fetch para JSON (moodles antigos/muito customizados podem precisar polyfill)
  async function fetchJSON(url) {
    const r = await fetch(url, { cache: "reload" }); // força reload por cache agressivo de proxy Moodle
    if (!r.ok) throw new Error("Erro ao carregar JSON: " + url);
    return r.json();
  }

  // Suporte fetch para HTML/textos (fallback não necessário ao menos em Moodle 3.0+)
  async function fetchText(url) {
    const r = await fetch(url, { cache: "reload" });
    if (!r.ok) throw new Error("Erro ao carregar HTML: " + url);
    return r.text();
  }

  // ================ PARSE DE PLACEHOLDER ===================
  function parsePlaceholders() {
    // Percorre todo o corpo do DOM (apenas após DOM pronto), substitui {{ava:component:config}}
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
        frag.appendChild(
          document.createTextNode(text.substring(lastIndex, match.index))
        );
        // Usa <div> para content filtering do Moodle, nunca <script/template>
        const div = document.createElement("div");
        div.className = "ava-component";
        // dataset é compatível mesmo em Moodle antigo
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
        // Mais detalhes para debugging em Moodle
        let extraMsg = "";
        if (e && (e.message || '').includes("Failed to fetch")) {
          extraMsg = "\nPossível erro de CORS (verifique se o arquivo está público no Github ou CDN).";
        }
        console.error("Erro componente:", component, e, extraMsg);
        if ((location.hostname === 'localhost' || location.protocol === 'file:') && component) {
          alert('Erro ao carregar componente: ' + component + '\n' + (e && e.message ? e.message : e));
        }
      }
    }
  }

  // ================ SLICK ===================
  // Carrega slick-carousel e jQuery de CDN, mas nunca duplica, compatível com AMD/Moodle/RequireJS
  let _slickLoaded = false;

  async function ensureJQueryLoaded() {
    if (window.jQuery) return;
    // Tenta pegar jQuery via requirejs (usado pelo Moodle/YUI)
    if (typeof define === "function" && define.amd && typeof require === "function") {
      return new Promise((resolve, reject) => {
        try {
          require(['jquery'], function ($) {
            window.jQuery = $;
            resolve();
          }, reject);
        } catch (e) { reject(e); }
      });
    }
    // Se não, carrega CDN
    await loadJS(
      "https://code.jquery.com/jquery-3.6.0.min.js",
      () => window.jQuery
    );
  }

  async function ensureSlickLoaded() {
    if (_slickLoaded) return;
    await ensureJQueryLoaded();
    await loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css");
    await loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css");

    // AMD: use requirejs se disponível (compatível com Moodle + CDN fallback p/ github/raw)
    if (typeof define === 'function' && define.amd && typeof require === "function") {
      return new Promise((resolve, reject) => {
        // Só tenta se slick-carousel já registrado (caso YUI do Moodle)
        require(['slick-carousel'], function () {
          _slickLoaded = true;
          resolve();
        }, function(err) {
          // Fallback: tenta CDN se falhar
          loadJS(
            "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js",
            () => window.jQuery && window.jQuery.fn && window.jQuery.fn.slick
          ).then(() => {
            _slickLoaded = true;
            resolve();
          }).catch(reject);
        });
      });
    }
    await loadJS(
      "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js",
      () => window.jQuery && window.jQuery.fn && window.jQuery.fn.slick
    );
    _slickLoaded = true;
  }

  // ================ BANNER ===================
  async function initBanner(container, configName) {
    if (!BASE_URL) return;
    const componentPath = BASE_URL + "bannerAVA/";

    // Carrega CSS separado (de preferência inline - compatível com filtro HTML Moodle)
    await loadCSS(componentPath + "bannerava.css");
    await ensureSlickLoaded();

    let config;
    try {
      config = await fetchJSON(
        componentPath + configName + ".json?v=1"
      );
    } catch (e) {
      container.innerHTML = '<div style="color:red;font-size:14px;">Erro ao carregar os banners.<br>' +
        'Verifique se o arquivo JSON está acessível para este domínio.<br>' +
        'Erro: ' + (e && e.message ? e.message : e) + '</div>';
      return;
    }

    // Ajuste: template HTML compatível com edição online do Moodle (sem <script>, só <div>)
    container.innerHTML = '<div class="slick-banner"><div class="Slick-Principal"></div></div>';

    const slickEl = container.querySelector(".Slick-Principal");
    if (!slickEl) return;

    // Função robusta para data (aceita BR e ISO)
    function parseDateFlexible(dateStr, endOfDay) {
      if (!dateStr) return null;
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/').map(Number);
        return endOfDay
          ? new Date(year, month - 1, day, 23, 59, 59)
          : new Date(year, month - 1, day, 0, 0, 0);
      }
      if (dateStr.includes('-')) {
        return endOfDay
          ? new Date(dateStr + "T23:59:59")
          : new Date(dateStr + "T00:00:00");
      }
      return null;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Filtro de disponibilidade (corte por data inicio/fim)
    const slides = (config.slides || []).filter(slide => {
      if (!slide.inicio || !slide.fim) return true;
      const inicio = parseDateFlexible(slide.inicio, false);
      const fim = parseDateFlexible(slide.fim, true);
      if (!inicio || !fim) return true;
      return hoje >= inicio && hoje <= fim;
    });

    if (!slides.length) {
      container.innerHTML = '';
      return;
    }

    // Monta os slides (no DOM, nunca via innerHTML vazio para evitar filtros do Moodle)
    slides.forEach(slide => {
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
    });

    // Inicializa slick (jQuery já garantida!)
    if (window.jQuery && window.jQuery.fn && window.jQuery.fn.slick) {
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
  }

  // ================ BUTTONS (Botões customizados) ===================
  async function ensureButtonAVACssLoaded() {
    if (!BASE_URL) return;
    await loadCSS(BASE_URL + "buttonAVA/buttonava.css");
  }

  async function initButtons(container, configName) {
    if (!BASE_URL) return;
    const componentPath = BASE_URL + "buttonAVA/";
    await ensureButtonAVACssLoaded();

    let data;
    try {
      data = await fetchJSON(componentPath + configName + ".json");
      if (!data) throw new Error("JSON vazio");
    } catch (e) {
      container.innerHTML = '<div style="color:red;font-size:14px;">Erro ao carregar botões.<br>' +
        'Verifique se o arquivo .json está público e correto.<br>' +
        'Erro: ' + (e && e.message ? e.message : e) + '</div>';
      return;
    }

    const botoes = data.botoes || [];
    // Lista SEM scripts, icons seguros para Moodle (ex: fontawesome ou similar)
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

  // ================ AUTO-START ===================
  // Não tenta iniciar automaticamente caso seja AMD em uso (ex: RequireJS do Moodle)
  if (typeof define !== "function" || !define.amd) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  return { init, resetInit };
}));
// AVA Loader 100% Compatível Moodle 4.5, pronto para hospedagem no GitHub (adaptado para evitar conflitos, dependências globais e maximizar compatibilidade)

(function (root, factory) {
  // Universal Module Definition (AMD/CommonJS/Global)
  if (typeof define === 'function' && define.amd) {
    define('loader-ava', [], factory);
  } else {
    root.AVA_LOADER = factory();
  }
}(typeof window !== "undefined" ? window : this, function () {
  'use strict';

  // ================ BASE URL ===================
  function detectBaseURL() {
    // Tenta detectar o caminho do loader-ava.js (ideal para uso via CDN ou repositório raw do GitHub)
    let script = document.currentScript;
    if (!script) {
      const scripts = document.querySelectorAll('script[src*="loader-ava"]');
      script = scripts[scripts.length - 1];
    }
    if (script && script.src) {
      // Remove query params por compatibilidade comodules
      return script.src.split('/').slice(0, -1).join('/') + '/';
    }
    // fallback Moodle: usa localização do documento
    if (typeof document !== 'undefined' && document.location) {
      const href = document.location.href;
      return href.replace(/\/[^/]*$/, '/');
    }
    return '';
  }
  const BASE_URL = detectBaseURL();

  // ================ UTILITÁRIOS ===================
  function escapeHtml(txt) {
    if (!txt && txt !== 0) return '';
    const div = document.createElement('div');
    div.textContent = String(txt);
    return div.innerHTML;
  }
  function escapeUrl(url) {
    if (!url) return '#';
    const s = String(url).trim();
    if (/^(https?|mailto|tel):/i.test(s)) return s;
    if (/^#[a-z0-9\-_]*$/i.test(s)) return s;
    return '#';
  }
  function escapeSrc(url) {
    if (!url) return '';
    const s = String(url).trim();
    if (/^\s*(javascript|data:text\/html|data:application)/i.test(s)) return '';
    return s;
  }
  // Por padrão, para compatibilidade absoluta e override de CSS do Moodle, sempre força inline
  async function inlineCSS(url, target = document.head) {
    try {
      if (document.querySelector(`style[data-inline-css="${url}"]`)) return;
      // No Moodle, force cache-busting sempre
      const bust = url.includes('?') ? '&cb=' + Date.now() : '?cb=' + Date.now();
      const response = await fetch(url + bust, { cache: "no-store" });
      if (!response.ok) throw new Error("Erro ao carregar CSS: " + url);
      let css = await response.text();
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
      // Fallback: link tradicional se fetch falhar
      if (!document.querySelector(`link[href="${url}"]`)) {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = url;
        l.setAttribute('data-fallback-css', '1');
        target.appendChild(l);
      }
    }
  }
  function loadCSS(url) {
    return inlineCSS(url);
  }
  function loadJS(url, checkFn) {
    // Evita conflitos se já carregado
    if (checkFn && checkFn()) return Promise.resolve();
    if (document.querySelector(`script[src="${url}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.defer = true;
      s.async = false; // previne conflitos de ordem!
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  async function fetchJSON(url) {
    // Força cache-busting por padrão em Moodle/GitHub
    const bust = url.includes('?') ? '&cb=' + Date.now() : '?cb=' + Date.now();
    const r = await fetch(url + bust, {cache: "no-store"});
    if (!r.ok) throw new Error("Erro ao carregar JSON: " + url);
    return r.json();
  }
  async function fetchText(url) {
    const bust = url.includes('?') ? '&cb=' + Date.now() : '?cb=' + Date.now();
    const r = await fetch(url + bust, {cache: "no-store"});
    if (!r.ok) throw new Error("Erro ao carregar HTML: " + url);
    return r.text();
  }

  // ================ PARSE DE PLACEHOLDER ===================
  // Substitui só em elementos no DOM visível para evitar conflitos com scripts Moodle
  function parsePlaceholders() {
    // Seleciona apenas dentro de elementos que de fato renderizam conteúdo do usuário
    const body = document.body;
    if (!body) return;
    const walker = document.createTreeWalker(
      body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const text = node.nodeValue;
      if (!text || text.indexOf('{{ava:') === -1) return;
      const frag = document.createDocumentFragment();
      const regex = /\{\{ava:([a-zA-Z0-9]+):([^}]+)\}\}/g;
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const [full, component, config] = match;
        frag.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
        const div = document.createElement("div");
        div.className = "ava-component";
        div.dataset.component = component;
        div.dataset.config = config;
        frag.appendChild(div);
        lastIndex = regex.lastIndex;
      }
      frag.appendChild(document.createTextNode(text.substring(lastIndex)));
      if (node.parentNode) node.parentNode.replaceChild(frag, node);
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
        // Em Moodle, não deixe o erro travar a execução geral
        comp.innerHTML = "<div style='color:#900;font-size:14px;'>Falha ao carregar componente AVA (" + escapeHtml(component) + ").</div>";
        console.error("Erro componente:", component, e);
      }
    }
  }

  // ================ SLICK BANNER (Garanta JQuery não global no window!) ===================
  let _slickLoaded = false;
  async function ensureSlickLoaded() {
    if (_slickLoaded) return;
    // Carrega CSS
    await loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css");
    await loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css");

    // Força JQ estar disponível localmente e referenciado sem poluir window/jquery global
    if (typeof window.jQuery === "undefined" || !window.jQuery.fn || !window.jQuery.fn.jquery) {
      // Moodle 4.5 já inclui jQuery, mas nem sempre no <head>!
      // Força carregar e usa CDN só se não existir versão mínima exigida
      try {
        var minVersion = "3.5.1";
        var jq = window.jQuery;
        if (!jq || (jq && (jq.fn && !jq.fn.jquery || jq.fn.jquery < minVersion))) {
          await loadJS("https://code.jquery.com/jquery-3.6.0.min.js", () => window.jQuery && window.jQuery.fn && window.jQuery.fn.jquery >= minVersion);
        }
      } catch (e) {
        await loadJS("https://code.jquery.com/jquery-3.6.0.min.js", () => window.jQuery && window.jQuery.fn.slick);
      }
    }

    // Carrega o slick apenas se ainda não está "embutido"
    await loadJS(
      "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js",
      () => !!window.jQuery && !!window.jQuery.fn && !!window.jQuery.fn.slick
    );
    _slickLoaded = true;
  }

  // ================ BANNER COMPONENT ===============
  async function initBanner(container, configName) {
    if (!BASE_URL) {
      container.innerHTML = "<div style='color:#900;font-size:14px;'>BASE_URL não detectada.</div>";
      return;
    }
    const componentPath = BASE_URL + "bannerAVA/";
    await loadCSS(componentPath + "bannerava.css");
    await ensureSlickLoaded();

    // Template separado para facilitar debug no inspector Moodle
    const template =
      '<div class="slick-banner">'+
        '<div class="Slick-Principal"></div>'+
      '</div>';
    container.innerHTML = template;

    let config;
    try {
      config = await fetchJSON(componentPath + configName + ".json");
    } catch (e) {
      container.innerHTML = "<div style='color:#900;font-size:14px;'>Não foi possível carregar configurações de banners.</div>";
      return;
    }

    function parseDateFlexible(dateStr, endOfDay = false) {
      if (!dateStr) return null;
      if (dateStr.includes("/")) {
        const [day, month, year] = dateStr.split("/").map(Number);
        return endOfDay ? new Date(year, month-1, day, 23,59,59) : new Date(year, month-1, day, 0,0,0);
      }
      if (dateStr.includes("-")) {
        return endOfDay ? new Date(dateStr+"T23:59:59") : new Date(dateStr+"T00:00:00");
      }
      return null;
    }

    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    const slides = (config.slides||[]).filter(slide => {
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

    const slickEl = container.querySelector(".Slick-Principal");
    slides.forEach(slide => {
      const link = escapeUrl(slide.link);
      const desktop = escapeSrc(slide.desktop)||"";
      const mobile = escapeSrc(slide.mobile)||desktop;
      const alt = escapeHtml(slide.alt||"");
      slickEl.insertAdjacentHTML("beforeend",
        '<div><a href="'+link+'" target="_blank" rel="noopener">'+
          '<picture>'+
            '<source media="(min-width:600px)" srcset="'+desktop+'">'+
            '<img src="'+mobile+'" alt="'+alt+'">'+
          '</picture>'+
        '</a></div>');
    });

    // Inicializa slick usando o jQuery nativo do Moodle 4.5 (ou CDN)
    window.jQuery(slickEl).slick({
      dots: true,
      arrows: true,
      infinite: slides.length > 1,
      speed: 800,
      slidesToShow: 1,
      adaptiveHeight: true,
      autoplay: config.autoplay!==false,
      autoplaySpeed: config.tempo||4000
    });
  }

  // ================ BOTÕES (ButtonAVA) ===================
  async function ensureButtonAVACssLoaded() {
    if (!BASE_URL) {
      console.error("BASE_URL vazia.");
      return;
    }
    await loadCSS(BASE_URL + "buttonAVA/buttonava.css");
  }

  async function initButtons(container, configName) {
    if (!BASE_URL) {
      container.innerHTML = "<div style='color:#900;font-size:14px;'>BASE_URL não detectada.</div>";
      return;
    }
    const componentPath = BASE_URL + "buttonAVA/";
    await ensureButtonAVACssLoaded();

    let data;
    try {
      data = await fetchJSON(componentPath + configName + ".json");
      if (!data) throw new Error("JSON vazio");
    } catch (e) {
      container.innerHTML = "<div style='color:#900;font-size:14px;'>Não foi possível carregar botões.</div>";
      return;
    }

    const botoes = data.botoes || [];
    // Atenção para evitar conflitos de CSS do Moodle
    const buttonsHtml = botoes.map(btn => `
      <a href="${escapeUrl(btn.url)}" class="btn-card btn-ava" target="_blank" rel="noopener">
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

  // ============== AUTO-START SEGUNDA PASSAGEM ==============
  // Em Moodle 4.5, cada bloco pode ser carregado dinâmico! Não poluir escopo global nem declarar variáveis em window!
  if (typeof define !== 'function' || !define.amd) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function(){
        setTimeout(init, 10); // atraso reduz risco de conflito no carregamento dos blocos
      });
    } else {
      setTimeout(init, 0);
    }
  }

  // Exporte init/reset apenas! Não exponha objetos globais
  return { init, resetInit };
}));
