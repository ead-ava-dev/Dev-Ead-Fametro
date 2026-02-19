(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD: Exporta como módulo AMD para requireJS/etc
    // Corrigir: definir um nome para o módulo anônimo para evitar mismatched anonymous define()
    define("ava-loader", [], factory);
  } else {
    // Standalone: Exporta global
    root.AVA_LOADER = factory();
  }
}(this, function () {
  'use strict';

  /* ================= BASE URL ================= */

  function detectBaseURL() {
    let script = document.currentScript;
    if (!script) {
      const scripts = document.querySelectorAll('script[src*="loader-ava"]');
      script = scripts[scripts.length - 1];
    }
    if (script && script.src) {
      return script.src.split('/').slice(0, -1).join('/') + '/';
    }
    return '';
  }

  const BASE_URL = detectBaseURL();

  /* ================= UTIL ================= */

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
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

  async function loadCSS(url) {
    if (document.querySelector(`link[href="${url}"]`)) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = url;
    document.head.appendChild(l);
  }

  function loadJS(url, checkFn) {
    if (checkFn && checkFn()) return Promise.resolve();
    // Corrigir: caso AMD, NÃO injetar loader externo para slick (para evitar conflito de define)
    if (
      document.querySelector(`script[src="${url}"]`) ||
      (typeof define === 'function' && define.amd && /slick\.min\.js/.test(url))
    ) {
      return Promise.resolve();
    }

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
    // CORS error handling
    try {
      const r = await fetch(url, { credentials: 'same-origin' });
      if (!r.ok) throw new Error("Erro JSON: " + url + " [" + r.status + "]");
      return r.json();
    } catch (error) {
      if (location.hostname === 'localhost' || location.protocol === 'file:') {
        alert('[AVA] Falha ao carregar configuração: ' + url + "\n" +
              'Motivo provável: o navegador bloqueou por CORS ou o arquivo não existe.\n' +
              'Contate o responsável do AVA para ajustar a configuração do servidor ou habilitar CORS.\n\n' +
              'Erro: ' + (error && error.message ? error.message : error)
        );
      }
      throw error;
    }
  }

  /* =============== Espera pelo jQuery se necessário =============== */
  function ensureJQueryLoaded() {
    return new Promise(async (resolve, reject) => {
      if (window.jQuery && window.jQuery.fn) return resolve();
      // Para AMD (requirejs), jQuery pode ser definido como 'define.amd.jQuery'
      if (typeof define === 'function' && define.amd && typeof require === 'function') {
        // se usar requirejs e jQuery já está registrado lá
        try {
          require(['jquery'], function($) {
            if ($) {
              window.jQuery = $;
              resolve();
            } else {
              reject('jQuery não encontrado via requirejs');
            }
          });
          return;
        } catch(e) { /* Fallback para injeção normal */ }
      }
      // Fallback: Injetar via CDN
      if (!document.querySelector('script[src*="code.jquery.com/jquery"]')) {
        await loadJS("https://code.jquery.com/jquery-3.7.1.min.js", () => window.jQuery && window.jQuery.fn);
      }
      // Espera até realmente estar disponível (máx 3s)
      let tries = 0;
      function check() {
        tries++;
        if (window.jQuery && window.jQuery.fn) return resolve();
        if (tries >= 60) return reject("jQuery não carregou");
        setTimeout(check, 50);
      }
      check();
    });
  }

  /* ================= PLACEHOLDER ================= */

  function parsePlaceholders() {
    if (document.querySelector('.ava-component')) return;
    const scope = document.querySelector('.course-content') || document.body;
    const walker = document.createTreeWalker(
      scope,
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

  /* ================= INIT COMPONENTS ================= */

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
        let extraMsg = "";
        if (e && (e.message || "").includes("Failed to fetch")) {
          extraMsg = "\nPossível erro de CORS (a origem do servidor não permite requisições deste domínio).";
        }
        console.error("Erro componente:", component, e, extraMsg);
        if ((location.hostname === 'localhost' || location.protocol === 'file:') && component) {
          alert('Erro ao carregar componente: ' + component + '\n' + (e && e.message ? e.message : e));
        }
      }
    }
  }

  /* ================= SLICK ================= */

  let _slickLoaded = false;

  async function ensureSlickLoaded() {
    if (_slickLoaded) return;
    // Aguarda jQuery para evitar erro (slick depende dele)
    await ensureJQueryLoaded();

    await loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css");
    await loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css");

    // Evite carregar via script quando em AMD/RequireJS, use require if present
    if (typeof define === 'function' && define.amd && typeof require === 'function') {
      // Se slick já está registrado no require, use pelo requirejs
      return new Promise((resolve, reject) => {
        require(['slick-carousel'], function () {
          _slickLoaded = true;
          resolve();
        }, function(err) {
          // fallback: ao falhar tente CDN mesmo na AMD, mas não carregue de novo se já houve erro!
          loadJS(
            "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js",
            () => window.jQuery && window.jQuery.fn && window.jQuery.fn.slick
          ).then(() => {
            _slickLoaded = true;
            resolve();
          }).catch(reject);
        });
      });
    } else {
      await loadJS(
        "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js",
        () => window.jQuery && window.jQuery.fn && window.jQuery.fn.slick
      );
      _slickLoaded = true;
    }
  }

  /* ================= BANNER ================= */

  async function initBanner(container, configName) {
    if (!BASE_URL) return;
    const componentPath = BASE_URL + "bannerAVA/";

    await loadCSS(componentPath + "bannerava.css");
    await ensureSlickLoaded();

    let config;
    try {
      config = await fetchJSON(componentPath + configName + ".json?v=1");
    } catch (e) {
      container.innerHTML = '<div style="color:red;font-size:14px;">Erro ao carregar os banners.<br>' +
        'Verifique se o arquivo JSON está acessível para este domínio.<br>' +
        'Erro: ' + (e && e.message ? e.message : e) + '</div>';
      return;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    function parseDateFlexible(dateStr, endOfDay = false) {
      if (!dateStr) return null;
      if (dateStr.includes("/")) {
        const [day, month, year] = dateStr.split("/").map(Number);
        return endOfDay
          ? new Date(year, month - 1, day, 23, 59, 59)
          : new Date(year, month - 1, day);
      }
      if (dateStr.includes("-")) {
        return endOfDay
          ? new Date(dateStr + "T23:59:59")
          : new Date(dateStr + "T00:00:00");
      }
      return null;
    }

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

    container.innerHTML = `
      <div class="slick-banner">
        <div class="Slick-Principal"></div>
      </div>
    `;

    const slickEl = container.querySelector(".Slick-Principal");
    slides.forEach(slide => {
      slickEl.insertAdjacentHTML("beforeend",
        `<div>
          <a href="${escapeUrl(slide.link)}" target="_blank" rel="noopener">
            <picture>
              <source media="(min-width:600px)" srcset="${escapeSrc(slide.desktop)}">
              <img src="${escapeSrc(slide.mobile || slide.desktop)}" alt="${escapeHtml(slide.alt)}">
            </picture>
          </a>
        </div>`
      );
    });

    // Usa jQuery explicitamente, não $
    window.jQuery(slickEl).slick({
      dots: true,
      arrows: true,
      infinite: slides.length > 1,
      speed: 600,
      slidesToShow: 1,
      adaptiveHeight: true,
      autoplay: config.autoplay !== false,
      autoplaySpeed: config.tempo || 4000
    });
  }

  /* ================= BUTTONS ================= */

  async function initButtons(container, configName) {
    if (!BASE_URL) return;
    const componentPath = BASE_URL + "buttonAVA/";

    await loadCSS(BASE_URL + "buttonAVA/buttonava.css");

    let data;
    try {
      data = await fetchJSON(componentPath + configName + ".json?v=1");
    } catch(e) {
      container.innerHTML = '<div style="color:red;font-size:14px;">Erro ao carregar botões.<br>' +
        'Verifique se o arquivo JSON está acessível para este domínio.<br>' +
        'Erro: ' + (e && e.message ? e.message : e) + '</div>';
      return;
    }

    const botoes = data.botoes || [];

    const html = botoes.map(btn => `
      <a href="${escapeUrl(btn.url)}" class="btn-card btn-ava">
        <div class="icon-container">
          <i class="${escapeHtml(btn.icone)}"></i>
        </div>
        <span class="btn-text">${escapeHtml(btn.titulo)}</span>
      </a>
    `).join("");

    container.innerHTML =
      `<div class="buttonava-wrapper">
        <div class="buttonava-grid">${html}</div>
      </div>`;
  }

  /* ================= INIT ================= */

  let _initDone = false;

  async function startStandalone() {
    if (_initDone) return;
    _initDone = true;
    await ensureJQueryLoaded();
    parsePlaceholders();
    await initComponents();
  }

  async function startAmd(require, exports, module) {
    // AMD: carrega jQuery nativamente via require
    if (typeof require === 'function') {
      require(['jquery'], function($) {
        window.jQuery = $;
        parsePlaceholders();
        initComponents();
      });
    }
  }

  function resetInit() {
    _initDone = false;
  }

  // Detecção: executa de acordo com ambiente (AMD/requirejs/etc ou standalone)
  if (typeof define === 'function' && define.amd) {
    // Em ambiente requirejs/AMD: exporta init próprio via módulo nomeado
    return {
      init: startAmd,
      resetInit
    };
  } else {
    // Standalone/browser comum
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startStandalone);
    } else {
      startStandalone();
    }
    return { init: startStandalone, resetInit };
  }
}));
