(function (root, factory) {
  // Universal Module Definition — compatível com AMD (RequireJS/Moodle) e Global
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.AVA_LOADER = factory();
  }
}(this, function () {
  'use strict';

  // ─── CONSTANTES ────────────────────────────────────────────────────────────

  const VERSION = '2.0.0';

  // Esquemas permitidos em URLs externas
  const SAFE_URL_SCHEMES = /^(https?|mailto|tel):/i;

  // Esquemas proibidos em src de recursos
  const DANGEROUS_SRC = /^\s*(javascript|vbscript|data:text\/html|data:application)/i;

  // Regex de placeholder: {{ava:componente:config}}
  const PLACEHOLDER_RE = /\{\{ava:([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)\}\}/g;

  // Componentes registrados (extensível futuramente)
  const COMPONENTS = {
    bannerAVA: initBanner,
    buttonAVA: initButtons,
  };

  // ─── DETECÇÃO DE BASE URL ───────────────────────────────────────────────────

  /**
   * Detecta a URL base do loader, necessária para carregar assets relativos.
   * Prioriza document.currentScript; fallback para varredura de scripts.
   * @returns {string} URL base com barra final, ou string vazia.
   */
  function detectBaseURL() {
    const current = document.currentScript;
    if (current && current.src) {
      return current.src.split('/').slice(0, -1).join('/') + '/';
    }

    // Fallback: procura qualquer script cujo src contenha "loader-ava"
    const scripts = document.querySelectorAll('script[src*="loader-ava"]');
    const last = scripts[scripts.length - 1];
    if (last && last.src) {
      return last.src.split('/').slice(0, -1).join('/') + '/';
    }

    // Último recurso: usa pathname da página
    if (typeof document !== 'undefined' && document.location) {
      return document.location.href.replace(/\/[^/]*$/, '/');
    }

    return '';
  }

  const BASE_URL = detectBaseURL();

  // ─── UTILITÁRIOS DE SEGURANÇA ───────────────────────────────────────────────

  /**
   * Escapa texto para inserção segura como conteúdo HTML (textContent).
   * @param {*} text
   * @returns {string}
   */
  function escapeHtml(text) {
    if (text == null || text === '') return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  /**
   * Valida e retorna uma URL segura para uso em href.
   * Aceita apenas http, https, mailto, tel e âncoras simples.
   * @param {*} url
   * @returns {string}
   */
  function escapeUrl(url) {
    if (url == null || url === '') return '#';
    const s = String(url).trim();
    if (SAFE_URL_SCHEMES.test(s)) return s;
    if (/^#[a-z0-9\-_]*$/i.test(s)) return s;
    return '#';
  }

  /**
   * Valida uma URL para uso em src de imagens/iframes.
   * Bloqueia esquemas perigosos.
   * @param {*} url
   * @returns {string}
   */
  function escapeSrc(url) {
    if (url == null || url === '') return '';
    const s = String(url).trim();
    if (DANGEROUS_SRC.test(s)) return '';
    return s;
  }

  /**
   * Valida um nome de classe CSS — aceita apenas caracteres seguros.
   * Impede injeção de atributos adicionais via campo icone/classe.
   * @param {*} cls
   * @returns {string}
   */
  function escapeCssClass(cls) {
    if (cls == null || cls === '') return '';
    // Permite apenas letras, dígitos, hífens, underscores e espaços entre classes
    return String(cls).replace(/[^a-zA-Z0-9\-_ ]/g, '');
  }

  // ─── CARREGAMENTO DE RECURSOS ───────────────────────────────────────────────

  /**
   * Faz inline de CSS para contornar restrições de CORS do Moodle 4.x.
   * Em caso de falha, injeta <link> como fallback.
   * @param {string} url
   * @param {HTMLElement} [target=document.head]
   * @returns {Promise<void>}
   */
  async function inlineCSS(url, target = document.head) {
    if (document.querySelector(`style[data-inline-css="${CSS.escape(url)}"]`)) return;

    try {
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status} ao carregar CSS: ${url}`);

      let css = await response.text();

      // Corrige URLs de fontes do slick-carousel quando necessário
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
    } catch (err) {
      console.warn('[AVA Loader] Falha ao fazer inline do CSS, usando <link> como fallback:', url, err);
      if (!document.querySelector(`link[href="${CSS.escape(url)}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        target.appendChild(link);
      }
    }
  }

  /**
   * Alias para inlineCSS — mantém a API interna semântica.
   */
  function loadCSS(url) {
    return inlineCSS(url);
  }

  /**
   * Carrega um script JS dinamicamente, evitando duplicatas.
   * @param {string} url
   * @param {Function} [checkFn] — se retornar truthy, considera já carregado
   * @returns {Promise<void>}
   */
  function loadJS(url, checkFn) {
    if (checkFn && checkFn()) return Promise.resolve();
    if (document.querySelector(`script[src="${CSS.escape(url)}"]`)) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Falha ao carregar script: ${url}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Faz fetch e parseia JSON. Lança erro com mensagem descritiva.
   * @param {string} url
   * @returns {Promise<any>}
   */
  async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} ao carregar JSON: ${url}`);
    return response.json();
  }

  /**
   * Faz fetch e retorna texto. Lança erro com mensagem descritiva.
   * @param {string} url
   * @returns {Promise<string>}
   */
  async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} ao carregar HTML: ${url}`);
    return response.text();
  }

  // ─── VALIDAÇÃO DE SCHEMA ────────────────────────────────────────────────────

  /**
   * Valida o schema do JSON de configuração do banner.
   * @param {any} config
   * @returns {{ valid: boolean, errors: string[] }}
   */
  function validateBannerConfig(config) {
    const errors = [];
    if (!config || typeof config !== 'object') {
      return { valid: false, errors: ['Config não é um objeto válido'] };
    }
    if (!Array.isArray(config.slides)) {
      errors.push('Campo "slides" ausente ou não é um array');
    } else {
      config.slides.forEach((slide, i) => {
        if (typeof slide !== 'object' || slide === null) {
          errors.push(`slides[${i}]: não é um objeto`);
          return;
        }
        if (!slide.desktop && !slide.mobile) {
          errors.push(`slides[${i}]: ausência de "desktop" e "mobile"`);
        }
      });
    }
    if (config.tempo !== undefined && typeof config.tempo !== 'number') {
      errors.push('Campo "tempo" deve ser número (ms)');
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Valida o schema do JSON de configuração dos botões.
   * @param {any} data
   * @returns {{ valid: boolean, errors: string[] }}
   */
  function validateButtonsConfig(data) {
    const errors = [];
    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Config não é um objeto válido'] };
    }
    if (!Array.isArray(data.botoes)) {
      errors.push('Campo "botoes" ausente ou não é um array');
    } else {
      data.botoes.forEach((btn, i) => {
        if (typeof btn !== 'object' || btn === null) {
          errors.push(`botoes[${i}]: não é um objeto`);
          return;
        }
        if (!btn.url) errors.push(`botoes[${i}]: campo "url" ausente`);
        if (!btn.titulo) errors.push(`botoes[${i}]: campo "titulo" ausente`);
      });
    }
    return { valid: errors.length === 0, errors };
  }

  // ─── PARSE DE PLACEHOLDERS ──────────────────────────────────────────────────

  /**
   * Varre o DOM em busca de text nodes contendo {{ava:componente:config}}
   * e os substitui por <div class="ava-component"> para hidratação posterior.
   */
  function parsePlaceholders() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.includes('{{')) {
        nodes.push(node);
      }
    }

    nodes.forEach(textNode => {
      const text = textNode.nodeValue;
      const frag = document.createDocumentFragment();
      let lastIndex = 0;
      let match;

      PLACEHOLDER_RE.lastIndex = 0;
      while ((match = PLACEHOLDER_RE.exec(text)) !== null) {
        const [, component, config] = match;

        // Texto anterior ao placeholder
        if (match.index > lastIndex) {
          frag.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
        }

        // Valida que o componente é registrado antes de criar o container
        if (!COMPONENTS[component]) {
          console.warn(`[AVA Loader] Componente desconhecido ignorado: "${component}"`);
          frag.appendChild(document.createTextNode(match[0]));
          lastIndex = PLACEHOLDER_RE.lastIndex;
          continue;
        }

        const div = document.createElement('div');
        div.className = 'ava-component';
        div.dataset.component = component;
        div.dataset.config = config;
        div.setAttribute('aria-busy', 'true');
        frag.appendChild(div);

        lastIndex = PLACEHOLDER_RE.lastIndex;
      }

      // Texto restante
      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.substring(lastIndex)));
      }

      if (textNode.parentNode) {
        textNode.parentNode.replaceChild(frag, textNode);
      }
    });
  }

  // ─── INICIALIZAÇÃO DE COMPONENTES ───────────────────────────────────────────

  /**
   * Itera todos os .ava-component no DOM e inicializa cada um.
   */
  async function initComponents() {
    const elements = document.querySelectorAll('.ava-component');

    for (const el of elements) {
      const { component, config } = el.dataset;
      const handler = COMPONENTS[component];

      if (!handler) {
        console.warn(`[AVA Loader] Componente não registrado: "${component}"`);
        el.removeAttribute('aria-busy');
        continue;
      }

      try {
        await handler(el, config);
      } catch (err) {
        console.error(`[AVA Loader] Erro ao inicializar componente "${component}":`, err);
        el.innerHTML = '';
      } finally {
        el.removeAttribute('aria-busy');
      }
    }
  }

  // ─── SWIPER (carregado uma única vez) ───────────────────────────────────────

  let _swiperLoaded = false;

  async function ensureSwiperLoaded() {
    if (_swiperLoaded) return;
    await Promise.all([
      loadCSS('https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css'),
      loadJS(
        'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
        () => typeof window.Swiper !== 'undefined'
      ),
    ]);
    _swiperLoaded = true;
  }

  // ─── BANNER AVA ─────────────────────────────────────────────────────────────

  /**
   * Parseia uma data no formato dd/mm/aaaa ou aaaa-mm-dd.
   * @param {string} dateStr
   * @param {boolean} [endOfDay=false]
   * @returns {Date|null}
   */
  function parseDateFlexible(dateStr, endOfDay = false) {
    if (!dateStr || typeof dateStr !== 'string') return null;

    if (dateStr.includes('/')) {
      const parts = dateStr.split('/').map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return null;
      const [day, month, year] = parts;
      return endOfDay
        ? new Date(year, month - 1, day, 23, 59, 59)
        : new Date(year, month - 1, day, 0, 0, 0);
    }

    if (dateStr.includes('-')) {
      const suffix = endOfDay ? 'T23:59:59' : 'T00:00:00';
      const d = new Date(dateStr + suffix);
      return isNaN(d.getTime()) ? null : d;
    }

    return null;
  }

  /**
   * Filtra slides que estão dentro do período de exibição.
   * @param {Array} slides
   * @returns {Array}
   */
  function filterActiveSlides(slides) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return (slides || []).filter(slide => {
      if (!slide.inicio && !slide.fim) return true;
      const inicio = parseDateFlexible(slide.inicio, false);
      const fim = parseDateFlexible(slide.fim, true);
      if (!inicio || !fim) return true;
      return hoje >= inicio && hoje <= fim;
    });
  }

  /**
   * Inicializa o componente bannerAVA.
   * @param {HTMLElement} container
   * @param {string} configName
   */
  async function initBanner(container, configName) {
    if (!BASE_URL) {
      console.error('[AVA Loader] BASE_URL não detectada — banner não pode ser inicializado.');
      return;
    }

    const componentPath = BASE_URL + 'bannerAVA/';

    await Promise.all([
      loadCSS(componentPath + 'bannerava.css'),
      ensureSwiperLoaded(),
    ]);

    let config;
    try {
      // Sem cache-busting agressivo: usa cache do browser normalmente
      config = await fetchJSON(componentPath + configName + '.json');
    } catch (err) {
      console.error('[AVA Loader] Erro ao carregar config do banner:', err);
      container.innerHTML = '';
      return;
    }

    const validation = validateBannerConfig(config);
    if (!validation.valid) {
      console.error('[AVA Loader] Config do banner inválida:', validation.errors);
      container.innerHTML = '';
      return;
    }

    const slides = filterActiveSlides(config.slides);
    if (!slides.length) {
      container.innerHTML = '';
      return;
    }

    // Monta estrutura do Swiper
    container.innerHTML = `
      <div class="slick-banner">
        <div class="swiper-container ava-swiper-container" role="region" aria-label="Banner">
          <div class="swiper-wrapper"></div>
          <div class="swiper-pagination"></div>
          <div class="swiper-button-next" aria-label="Próximo slide"></div>
          <div class="swiper-button-prev" aria-label="Slide anterior"></div>
        </div>
      </div>
    `;

    const swiperWrapper = container.querySelector('.swiper-wrapper');

    slides.forEach(slide => {
      const link = escapeUrl(slide.link);
      const desktop = escapeSrc(slide.desktop) || '';
      const mobile = escapeSrc(slide.mobile) || desktop;
      const alt = escapeHtml(slide.alt || '');
      const isExternal = link !== '#' && !link.startsWith(window.location.origin);

      swiperWrapper.insertAdjacentHTML('beforeend', `
        <div class="swiper-slide">
          <a href="${link}"${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>
            <picture>
              <source media="(min-width: 600px)" srcset="${desktop}">
              <img src="${mobile}" alt="${alt}" loading="lazy">
            </picture>
          </a>
        </div>
      `);
    });

    new window.Swiper(container.querySelector('.swiper-container'), {
      speed: 800,
      loop: slides.length > 1,
      pagination: {
        el: container.querySelector('.swiper-pagination'),
        clickable: true,
      },
      navigation: {
        nextEl: container.querySelector('.swiper-button-next'),
        prevEl: container.querySelector('.swiper-button-prev'),
      },
      slidesPerView: 1,
      adaptiveHeight: true,
      autoplay: config.autoplay !== false
        ? { delay: config.tempo || 4000, disableOnInteraction: false }
        : false,
      a11y: {
        prevSlideMessage: 'Slide anterior',
        nextSlideMessage: 'Próximo slide',
      },
      observer: true,
      observeParents: true,
    });
  }

  // ─── BUTTON AVA ─────────────────────────────────────────────────────────────

  let _buttonCssLoaded = false;

  async function ensureButtonCssLoaded() {
    if (_buttonCssLoaded) return;
    if (!BASE_URL) {
      console.error('[AVA Loader] BASE_URL não detectada — CSS de botões não pode ser carregado.');
      return;
    }
    await loadCSS(BASE_URL + 'buttonAVA/buttonava.css');
    _buttonCssLoaded = true;
  }

  /**
   * Inicializa o componente buttonAVA.
   * @param {HTMLElement} container
   * @param {string} configName
   */
  async function initButtons(container, configName) {
    if (!BASE_URL) {
      console.error('[AVA Loader] BASE_URL não detectada — botões não podem ser inicializados.');
      return;
    }

    const componentPath = BASE_URL + 'buttonAVA/';

    await ensureButtonCssLoaded();

    let data;
    try {
      data = await fetchJSON(componentPath + configName + '.json');
    } catch (err) {
      console.error('[AVA Loader] Erro ao carregar config dos botões:', err);
      container.innerHTML = '';
      return;
    }

    const validation = validateButtonsConfig(data);
    if (!validation.valid) {
      console.error('[AVA Loader] Config dos botões inválida:', validation.errors);
      container.innerHTML = '';
      return;
    }

    const botoes = data.botoes || [];

    const buttonsHtml = botoes.map(btn => {
      const url = escapeUrl(btn.url);
      const titulo = escapeHtml(btn.titulo);
      // escapeCssClass impede injeção de atributos via campo de ícone
      const icone = escapeCssClass(btn.icone);
      const isExternal = url !== '#' && !url.startsWith(window.location.origin);

      return `
        <a href="${url}"
           class="btn-card btn-ava"
           ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''}
           aria-label="${titulo}">
          <div class="icon-container" aria-hidden="true">
            <i class="${icone}"></i>
          </div>
          <span class="btn-text">${titulo}</span>
        </a>
      `;
    }).join('');

    container.innerHTML = `
      <div class="buttonava-wrapper">
        <div class="buttonava-grid" role="list">
          ${buttonsHtml}
        </div>
      </div>
    `;

    // Adiciona role="listitem" nos filhos diretos do grid
    container.querySelectorAll('.btn-card').forEach(el => {
      el.setAttribute('role', 'listitem');
    });
  }

  // ─── INICIALIZAÇÃO GERAL ────────────────────────────────────────────────────

  let _initDone = false;

  /**
   * Ponto de entrada principal.
   * Idempotente — chamadas repetidas são ignoradas.
   * @returns {Promise<void>}
   */
  async function init() {
    if (_initDone) return;
    _initDone = true;

    try {
      parsePlaceholders();
      await initComponents();
    } catch (err) {
      console.error('[AVA Loader] Erro na inicialização:', err);
    }
  }

  /**
   * Reseta o estado interno — útil para testes e recarregamento dinâmico.
   */
  function resetInit() {
    _initDone = false;
    _swiperLoaded = false;
    _buttonCssLoaded = false;
  }

  // ─── AUTO-START ─────────────────────────────────────────────────────────────

  if (typeof define !== 'function' || !define.amd) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  // ─── API PÚBLICA ────────────────────────────────────────────────────────────

  return {
    version: VERSION,
    init,
    resetInit,
    // Expostos para testes unitários
    _internal: {
      escapeHtml,
      escapeUrl,
      escapeSrc,
      escapeCssClass,
      parseDateFlexible,
      filterActiveSlides,
      validateBannerConfig,
      validateButtonsConfig,
      detectBaseURL,
    },
  };
}));
