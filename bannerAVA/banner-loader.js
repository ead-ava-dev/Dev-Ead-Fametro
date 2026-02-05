(async function () {

const CONTAINER_ID = "bannerAVA";
const BASE_URL = "https://ead-ava-dev.github.io/Dev-Ead-Fametro/bannerAVA";
const CACHE_KEY = "AVA_BANNERS_CACHE";

/* =====================
   LOAD CSS / JS
===================== */

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

/* =====================
   CARREGAR LIBS
===================== */

await loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css");
await loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css");

await loadJS("https://code.jquery.com/jquery-3.7.1.min.js");
await loadJS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js");

/* =====================
   CONTAINER
===================== */

const container = document.getElementById(CONTAINER_ID);
if (!container) return;

/* =====================
   FETCH COM CACHE
===================== */

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

/* =====================
   FILTRO POR DATA
===================== */

function isSlideActive(slide) {

    const hoje = new Date();

    const inicio = new Date(slide.inicio);
    const fim = new Date(slide.fim);

    return hoje >= inicio && hoje <= fim;
}

/* =====================
   PRELOAD PRÓXIMA IMAGEM
===================== */

function preload(src) {
    const img = new Image();
    img.src = src;
}

/* =====================
   AGUARDAR IMAGENS
===================== */

function imagesLoaded(container) {

    const imgs = container.querySelectorAll("img");

    return Promise.all([...imgs].map(img => {

        if (img.complete) return Promise.resolve();

        return new Promise(res => {
            img.onload = img.onerror = res;
        });

    }));
}

/* =====================
   CARREGAR HTML
===================== */

const html = await fetch(`${BASE_URL}/bannerAVA.html`).then(r => r.text());
container.innerHTML = html;

const banner = container.querySelector(".Slick-Principal");

/* =====================
   CARREGAR JSON
===================== */

const config = await loadConfig();

const slidesAtivos = config.slides.filter(isSlideActive);

/* =====================
   MONTAR SLIDES
===================== */

slidesAtivos.forEach((slide, i) => {

    if (slidesAtivos[i + 1])
        preload(slidesAtivos[i + 1].desktop);

    const div = document.createElement("div");

    div.innerHTML = `
        <a href="${slide.link}" target="_blank" data-banner="${slide.alt}">
            <picture>
                <source media="(min-width:600px)" srcset="${slide.desktop}">
                <img src="${slide.mobile}" 
                     alt="${slide.alt}"
                     style="width:100%;display:block;"
                     loading="lazy">
            </picture>
        </a>
    `;

    banner.appendChild(div);
});

/* =====================
   ANALYTICS CLIQUE
===================== */

banner.addEventListener("click", e => {

    const link = e.target.closest("a");
    if (!link) return;

    console.log("Banner clicado:", link.dataset.banner);

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
    slidesToShow: 1,
    adaptiveHeight: true,
    autoplay: config.autoplay ?? true,
    autoplaySpeed: config.tempo ?? 8000,
    lazyLoad: "ondemand"
});

})();
