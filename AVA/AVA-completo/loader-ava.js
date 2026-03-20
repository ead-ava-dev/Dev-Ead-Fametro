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

  // Carrega CSS DE FORMA ASSÍNCRONA, mas injeta link rel="stylesheet" imediatamente (instantâneo visualmente)
  function loadCSS(url) {
    // Usar <link rel="stylesheet"> imediato, sem travar o JS
    if (!document.querySelector(`link[data-instant-css="${url}"]`)) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = url;
      l.setAttribute("data-instant-css", url);
      l.media = "all";
      document.head.appendChild(l);
    }
    return Promise.resolve(); // Para manter compatibilidade
  }

  // Também carrega JS de forma não bloqueante
  function loadJS(url, checkFn) {
    if (checkFn && checkFn()) return Promise.resolve();
    if (document.querySelector(`script[src="${url}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.async = true; // async para não travar o carregamento
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function fetchJSON(url) {
    const r = await fetch(url, { cache: 'reload' });
    if (!r.ok) throw new Error("Erro ao carregar JSON: " + url);
    return r.json();
  }

  async function fetchText(url) {
    const r = await fetch(url, { cache: 'reload' });
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
  function initComponentsInstant() {
    // NÃO AWAIT: chama a inicialização mas deixa carregar recursos pesados depois (banner).
    const components = document.querySelectorAll(".ava-component");
    components.forEach(comp => {
      const component = comp.dataset.component;
      const config = comp.dataset.config;
      // ButtonAVA é instantâneo
      if (component === "buttonAVA") {
        initButtons(comp, config);
      } else if (component === "bannerAVA") {
        // Renderiza o layout base imediatamente, depois carrega slides
        initBanner(comp, config);
      }
    });
  }

  // ================ BANNER (Slick só depois) ===================
  let _slickLoaded = false;
  let _slickLoadingPromise = null;
  function ensureSlickLoaded() {
    // Carrega slick e jQuery somente se necessário e somente uma vez
    if (_slickLoaded) return Promise.resolve();
    if (_slickLoadingPromise) return _slickLoadingPromise;
    _slickLoadingPromise = Promise.all([
      loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css"),
      loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css"),
      loadJS(
        "https://code.jquery.com/jquery-3.6.0.min.js",
        () => window.jQuery
      ),
      loadJS(
        "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js",
        () => window.jQuery?.fn?.slick
      )
    ]).then(() => { _slickLoaded = true; });
    return _slickLoadingPromise;
  }

  async function initBanner(container, configName) {
    // Valida BASE_URL
    if (!BASE_URL) {
      console.error("AVA Loader: BASE_URL vazia.");
      return;
    }
    const componentPath = BASE_URL + "bannerAVA/";

    // Carrega CSS customizado do banner
    loadCSS(componentPath + "bannerava.css"); // instantâneo, não aguarda

    // Coloca o template instantaneamente para espaço reservado
    const template = `
      <div class="slick-banner"> 
        <div class="Slick-Principal"></div>
      </div>
    `;
    container.innerHTML = template;
    const slickEl = container.querySelector(".Slick-Principal");
    if (!slickEl) {
      console.error("AVA Loader: .Slick-Principal não encontrado.");
      return;
    }

    // Carrega config e slides no background (async, não bloqueia DOM)
    fetchJSON(
      componentPath + configName + ".json?v=" + Date.now()
    )
    .then(config => {
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

      // ---------- Monta os slides rapidamente ----------
      const renderSlide = (slide) => {
        const rawLink = (slide.link || "").trim().toLowerCase();

        const isDead =
          rawLink === "" ||
          rawLink === "#" ||
          rawLink === "/#" ||
          rawLink === "/linksemdestino" ||
          rawLink === "javascript:void(0)" ||
          rawLink === "javascript:;";

        const desktop = escapeSrc(slide.desktop) || "";
        const mobile = escapeSrc(slide.mobile) || desktop;
        const alt = escapeHtml(slide.alt || "");

        let html;
        if (isDead) {
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

      // Se apenas um slide: mostrar estático rapidão
      if (slides.length === 1) {
        renderSlide(slides[0]);
        return;
      }

      // Vários slides: renderizar imediatamente e depois ativa slick
      slides.forEach(renderSlide);

      // Não bloqueia rendering: inicializa Slick no próximo tick
      setTimeout(() => {
        ensureSlickLoaded().then(() => {
          const autoplay = (config.autoplay === undefined)
            ? true
            : !!config.autoplay;
          const autoplaySpeed = Number(config.tempo) || 4000;
          if (window.jQuery?.fn?.slick) {
            window.jQuery(slickEl).slick({
              dots: true,
              arrows: true,
              infinite: true,
              speed: 800,
              slidesToShow: 1,
              adaptiveHeight: true,
              autoplay,
              autoplaySpeed
            });
          }
        });
      }, 0); // Não espera nada, só agenda para tick seguinte

    }).catch(e => {
      console.error("Erro ao carregar config do banner:", e);
      container.innerHTML = "";
    });
  }

  // ================ BUTTONS (Botões customizados) ===================
  // Carrega e injeta CSS imediato (não await) para máxima velocidade
  function ensureButtonAVACssLoaded() {
    if (!BASE_URL) {
      console.error("AVA Loader: BASE_URL vazia.");
      return;
    }
    loadCSS(BASE_URL + "buttonAVA/buttonava.css");
  }

  // Inicialização mais rápida: já mostra, busca json em paralelo
  function initButtons(container, configName) {
    if (!BASE_URL) {
      console.error("AVA Loader: BASE_URL vazia.");
      return;
    }
    const componentPath = BASE_URL + "buttonAVA/";

    // Carrega CSS
    ensureButtonAVACssLoaded();

    // Espaço reservado inicial: esqueleto
    container.innerHTML = `<div class="buttonava-wrapper"><div class="buttonava-grid"></div></div>`;

    // Tenta carregar json e renderiza de fato quando disponível, sem travar render do DOM
    fetchJSON(componentPath + configName + ".json?v=" + Date.now())
      .then(data => {
        if (!data) throw new Error("JSON vazio");
        if (data.theme && typeof data.theme === "object") {
          Object.entries(data.theme).forEach(([key, value]) => {
            if (key.startsWith("--")) {
              container.style.setProperty(key, value);
            }
          });
        }
        const botoes = data.botoes || [];

        function isDeadLink(rawLink) {
          const link = (rawLink || "").trim().toLowerCase();
          return (
            link === "" ||
            link === "#" ||
            link === "/#" ||
            link === "/linksemdestino" ||
            link === "javascript:void(0)" ||
            link === "javascript:;"
          );
        }

        const buttonsHtml = botoes.map(btn => {
          const icon = escapeHtml(btn.icone);
          const titulo = escapeHtml(btn.titulo);
          const rawUrl = btn.url || "";
          const dead = isDeadLink(rawUrl);

          if (dead) {
            return `
              <div class="btn-card btn-ava btn-ava-disabled" tabindex="0" aria-disabled="true" style="cursor: default;">
                <div class="icon-container">
                  <i class="${icon}"></i>
                </div>
                <span class="btn-text">${titulo}</span>
              </div>
            `;
          } else {
            const url = escapeUrl(btn.url);
            return `
              <a href="${url}" class="btn-card btn-ava">
                <div class="icon-container">
                  <i class="${icon}"></i>
                </div>
                <span class="btn-text">${titulo}</span>
              </a>
            `;
          }
        }).join("");

        container.innerHTML =
          `<div class="buttonava-wrapper">
            <div class="buttonava-grid">
              ${buttonsHtml}
            </div>
          </div>`;
      })
      .catch(e => {
        console.error("Erro ao carregar config dos botões:", e);
        container.innerHTML = "";
      });
  }

  // ================ INICIALIZAÇÃO GERAL ===================
  let _initDone = false;

  function init() {
    if (_initDone) return;
    _initDone = true;

    document.addEventListener("click", function(e) {
      const link = e.target.closest("a");
      if (!link) return;
      const href = (link.getAttribute("href") || "").toLowerCase();
      if (href.includes("/#")) {
        e.preventDefault();
        e.stopPropagation();
        link.style.cursor = "default";
      }
    });

    // Rapidez: marca placeholders, depois já renderiza componentes (tudo não bloqueante pelo JS principal)
    parsePlaceholders();
    initComponentsInstant();
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
