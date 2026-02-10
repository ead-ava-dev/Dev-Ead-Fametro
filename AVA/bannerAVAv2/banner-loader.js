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
  
  const container = document.getElementById(CONTAINER_ID);
  if (!container) {
    console.error("[Banner AVA] Container #" + CONTAINER_ID + " não encontrado.");
    return;
  }

  const ajaxName = container.dataset.ajax || "EAD";
  const base = BASE_URL ? BASE_URL.replace(/\/?$/, '') + '/' : '';

  let html, config;
  try {
    const [htmlRes, configRes] = await Promise.all([
      fetch(`${base}bannerAVA.html`),
      fetch(`${base}${ajaxName}.json`)
    ]);
    if (!htmlRes.ok) throw new Error("bannerAVA.html: " + htmlRes.status);
    if (!configRes.ok) throw new Error(ajaxName + ".json: " + configRes.status);
    html = await htmlRes.text();
    config = await configRes.json();
  } catch (e) {
    console.error("[Banner AVA] Erro ao carregar dados. Use um servidor HTTP (Laragon). file:// não funciona.", e);
    container.innerHTML = '<p style="padding:20px;color:#c00;">Banner: erro ao carregar. Abra via servidor</p>';
    return;
  }

  if (!config.slides || !Array.isArray(config.slides)) {
    console.error("[Banner AVA] JSON inválido: falta 'slides'.");
    return;
  }

  container.innerHTML = html;
  const banner = container.querySelector(".Slick-Principal");
  if (!banner) {
    console.error("[Banner AVA] Elemento .Slick-Principal não encontrado no HTML.");
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

  const jq = window.jQuery || window.$;
  if (typeof jq === 'undefined') {
    console.error("[Banner AVA] jQuery não disponível.");
    return;
  }

  jq('.slick-banner').slick({
    dots: true,
    arrows: true,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    adaptiveHeight: true,
    autoplay: config.autoplay ?? true,
    autoplaySpeed: config.tempo ?? 4000
  });


})();


