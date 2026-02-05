(async function () {

  const CONTAINER_ID = "bannerAVA";
  const BASE_URL = "https://ead-ava-dev.github.io/Dev-Ead-Fametro/bannerAVA";

  function loadCSS(url) {
    return new Promise(resolve => {
      if ([...document.styleSheets].some(s => s.href === url)) return resolve();
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = url;
      l.onload = resolve;
      document.head.appendChild(l);
    });
  }

  function loadJS(url) {
    return new Promise(resolve => {
      if ([...document.scripts].some(s => s.src === url)) return resolve();
      const s = document.createElement("script");
      s.src = url;
      s.onload = resolve;
      document.body.appendChild(s);
    });
  }

  function imagesLoaded(container) {

    const images = container.querySelectorAll("img");

    return Promise.all(
      [...images].map(img => {
        if (img.complete) return Promise.resolve();

        return new Promise(resolve => {
          img.onload = img.onerror = resolve;
        });
      })
    );
  }

  /* =====================
     CARREGAR BIBLIOTECAS
  ===================== */

  await loadCSS("https://kenwheeler.github.io/slick/slick/slick.css");
  await loadCSS("https://kenwheeler.github.io/slick/slick/slick-theme.css");

  await loadJS("https://code.jquery.com/jquery-1.11.0.min.js");
  await loadJS("https://code.jquery.com/jquery-migrate-1.2.1.min.js");
  await loadJS("https://kenwheeler.github.io/slick/slick/slick.min.js");

  /* =====================
     CARREGAR HTML + JSON
  ===================== */

  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const [html, config] = await Promise.all([
    fetch("bannerAVA.html").then(r => r.text()),
    fetch("banners.json").then(r => r.json())
  ]);

  container.innerHTML = html;

  const banner = container.querySelector(".Slick-Principal");

  /* =====================
     MONTAR SLIDES
  ===================== */

  config.slides.forEach(slide => {

    const div = document.createElement("div");

    div.innerHTML = `
      <a href="${slide.link}" target="_blank">
        <picture>
          <source media="(min-width:600px)" srcset="${slide.desktop}">
          <img 
            src="${slide.mobile}" 
            alt="${slide.alt}"
            style="width:100%;height:auto;display:block;"
            loading="lazy"
          >
        </picture>
      </a>
    `;

    banner.appendChild(div);
  });

  /* =====================
     AGUARDAR IMAGENS
  ===================== */

  await imagesLoaded(banner);

  /* =====================
     INICIAR SLICK
  ===================== */

  $(banner).slick({
    dots: true,
    infinite: true,
    speed: 800,
    fade: true
    slidesToShow: 1,
    adaptiveHeight: true,
    autoplay: config.autoplay,
    autoplaySpeed: config.tempo,
    lazyLoad: 'ondemand'
  });

})();


