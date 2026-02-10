(async function () {

  const CONTAINER_ID = "bannerAVA";
  const BASE_URL = "https://ead-ava-dev.github.io/Dev-Ead-Fametro/AVA/bannerAVAv2";
  //const BASE_URL = "";

  function loadCSS(url) {
    return new Promise((resolve, reject) => {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = url;
      l.onload = resolve;
      l.onerror = () => reject(new Error("CSS falhou: " + url));
      document.head.appendChild(l);
    });
  }

  function loadJS(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.onload = resolve;
      s.onerror = () => reject(new Error("JS falhou: " + url));
      document.body.appendChild(s);
    });
  }

  try {
    await loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css");
    await loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css");

    // Em ambientes como o Moodle, o jQuery normalmente já está carregado.
    // Para evitar conflitos (como botões exibindo [object Promise] ao sobrescrever o $),
    // só carregamos nossa própria versão se NÃO existir jQuery na página.
    if (typeof window.jQuery === "undefined" && typeof window.$ === "undefined") {
      await loadJS("https://code.jquery.com/jquery-1.11.0.min.js");
      await loadJS("https://code.jquery.com/jquery-migrate-1.2.1.min.js");
    }

    await loadJS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js");
  } catch (e) {
    console.error("[Banner AVA] Erro ao carregar dependências:", e);
    return;
  }

  // Suporte a marcadores de texto como {{data-ajax-EAD}} no HTML.
  // Qualquer ocorrência de {{data-ajax-NOME}} será substituída por
  // <div id="bannerAVA" data-ajax="NOME"></div> antes de inicializar os banners.
  if (document.body && document.body.innerHTML) {
    document.body.innerHTML = document.body.innerHTML.replace(
      /{{\s*data-ajax-([A-Za-z0-9_-]+)\s*}}/g,
      function (_match, nome) {
        return '<div id="bannerAVA" data-ajax="' + nome + '"></div>';
      }
    );
  }

  const containers = document.querySelectorAll('#' + CONTAINER_ID);
  if (!containers.length) {
    console.error("[Banner AVA] Nenhum container #" + CONTAINER_ID + " encontrado.");
    return;
  }

  const base = BASE_URL ? BASE_URL.replace(/\/?$/, '') + '/' : '';

  // Carrega o HTML base uma vez só
  let html;
  try {
    const htmlRes = await fetch(`${base}bannerAVA.html`);
    if (!htmlRes.ok) throw new Error("bannerAVA.html: " + htmlRes.status);
    html = await htmlRes.text();
  } catch (e) {
    console.error("[Banner AVA] Erro ao carregar bannerAVA.html. Use um servidor HTTP (Laragon). file:// não funciona.", e);
    containers.forEach(c => {
      c.innerHTML = '<p style="padding:20px;color:#c00;">Banner: erro ao carregar. Abra via servidor</p>';
    });
    return;
  }

  const jq = window.jQuery || window.$;
  if (typeof jq === 'undefined') {
    console.error("[Banner AVA] jQuery não disponível.");
    return;
  }

  // Função auxiliar para inicializar cada container individualmente
  async function initContainer(container) {
    const ajaxName = container.dataset.ajax || "EAD";

    let config;
    try {
      const configRes = await fetch(`${base}${ajaxName}.json`);
      if (!configRes.ok) throw new Error(ajaxName + ".json: " + configRes.status);
      config = await configRes.json();
    } catch (e) {
      console.error("[Banner AVA] Erro ao carregar dados para", ajaxName, e);
      container.innerHTML = '<p style="padding:20px;color:#c00;">Banner: erro ao carregar (' + ajaxName + ')</p>';
      return;
    }

    if (!config.slides || !Array.isArray(config.slides)) {
      console.error("[Banner AVA] JSON inválido: falta 'slides' para", ajaxName);
      return;
    }

    container.innerHTML = html;
    const banner = container.querySelector(".Slick-Principal");
    if (!banner) {
      console.error("[Banner AVA] Elemento .Slick-Principal não encontrado no HTML para", ajaxName);
      return;
    }

    config.slides.forEach(slide => {
      const div = document.createElement("div");
      div.innerHTML = `
        <a href="${slide.link}" target="_blank">
          <picture>
            <source media="(min-width:600px)" srcset="${slide.desktop}">
            <img src="${slide.mobile}" alt="${slide.alt}" style="width:100%;height:auto;display:block;">
          </picture>
        </a>
      `;
      banner.appendChild(div);
    });

    // Inicializa o slick apenas dentro deste container
    const slickElem = container.querySelector('.slick-banner');
    if (slickElem) {
      jq(slickElem).slick({
        dots: true,
        arrows: true,
        infinite: true,
        speed: 800,
        slidesToShow: 1,
        adaptiveHeight: true,
        autoplay: config.autoplay ?? true,
        autoplaySpeed: config.tempo ?? 4000
      });
    } else {
      console.error("[Banner AVA] .slick-banner não encontrada dentro do container para", ajaxName);
    }
  }

  // Inicializa todos os containers em paralelo
  await Promise.all(Array.from(containers).map(initContainer));

})();

