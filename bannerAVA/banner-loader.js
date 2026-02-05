(async function () {

  const CONTAINER_ID = "bannerAVA";
  const BASE_URL = "https://ead-ava-dev.github.io/Dev-Ead-Fametro/bannerAVA";
  const CACHE_KEY = "AVA_BANNERS_CACHE";

  // Utilitários simples para carregar CSS e JS dinamicamente
  function loadCSS(url) {
    return new Promise(resolve => {
      if ([...document.styleSheets].some(s => s.href === url)) return resolve();
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.onload = resolve;
      document.head.appendChild(link);
    });
  }

  function loadJS(url) {
    return new Promise(resolve => {
      if ([...document.scripts].some(s => s.src === url)) return resolve();
      const script = document.createElement("script");
      script.src = url;
      script.onload = resolve;
      document.body.appendChild(script);
    });
  }

  // Carrega estilos e scripts do Slick e jQuery
  await loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css");
  await loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css");
  await loadJS("https://code.jquery.com/jquery-3.7.1.min.js");
  await loadJS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js");

  // Container principal
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  // Função simples para tentar carregar banners do cache antes de buscar remoto
  async function loadConfig() {
    try {
      const response = await fetch(`${BASE_URL}/banners.json`);
      const json = await response.json();
      localStorage.setItem(CACHE_KEY, JSON.stringify(json));
      return json;
    } catch {
      const cache = localStorage.getItem(CACHE_KEY);
      if (cache) return JSON.parse(cache);
      throw "Sem banners disponíveis";
    }
  }

  // Só banners ativos pela data
  function isSlideActive(slide) {
    const hoje = new Date();
    return hoje >= new Date(slide.inicio) && hoje <= new Date(slide.fim);
  }

  // Função para aguardar todas as imagens carregarem
  function imagesLoaded(ele) {
    const imgs = ele.querySelectorAll("img");
    return Promise.all([...imgs].map(img => img.complete ? Promise.resolve() : new Promise(res => img.onload = img.onerror = res)));
  }

  // Carregar o HTML básico (apenas com .Slick-Principal ou nenhum markup adicional)
  container.innerHTML = `<div class="Slick-Principal"></div>`;
  const banner = container.querySelector(".Slick-Principal");

  // Obter config dos slides ativos
  const config = await loadConfig();
  const slidesAtivos = config.slides.filter(isSlideActive);

  // Montagem dos slides — estrutura simplificada, sem links externos, igual exemplo fornecido
  slidesAtivos.forEach(slide => {
    const div = document.createElement("div");
    div.innerHTML = `
      <picture>
        <source media="(min-width: 600px)" srcset="${slide.desktop}">
        <img src="${slide.mobile}" alt="Banner">
      </picture>
    `;
    banner.appendChild(div);
  });

  // Aguarda todas as imagens
  await imagesLoaded(banner);

  // Inicia Slick
  $(banner).slick({
    dots: true,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    adaptiveHeight: true,
    autoplay: config.autoplay ?? true,
    autoplaySpeed: config.tempo ?? 8000,
    lazyLoad: "ondemand"
  });

})();
