(function (root, factory) {

  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else {
    root.AVA_LOADER = factory();
  }

})(this, function () {

"use strict";

/* ================= BASE URL ================= */

function detectBaseURL(){

  let script = document.currentScript;

  if(!script){
    const scripts = document.querySelectorAll('script[src*="loader-ava"]');
    script = scripts[scripts.length-1];
  }

  if(script && script.src){
    return script.src.split("/").slice(0,-1).join("/") + "/";
  }

  if(document?.location){
    return document.location.href.replace(/\/[^/]*$/,"/");
  }

  return "";
}

const BASE_URL = detectBaseURL();

/* ================= CACHE ================= */

const JSON_CACHE = new Map();

/* ================= UTIL ================= */

function escapeHtml(text){
  if(!text) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}

function escapeUrl(url){
  if(!url) return "#";
  const s = String(url).trim();
  if(/^(https?|mailto|tel):/i.test(s)) return s;
  if(/^#[a-z0-9\-_]*$/i.test(s)) return s;
  return "#";
}

function escapeSrc(url){
  if(!url) return "";
  const s = String(url).trim();
  if(/^\s*(javascript|data:text\/html)/i.test(s)) return "";
  return s;
}

function isDeadLink(href){

  if(!href) return true;

  const h = href.trim().toLowerCase();

  return(
    h === "" ||
    h === "#" ||
    h === "/#" ||
    h === "/linksemdestino" ||
    h === "javascript:void(0)" ||
    h === "javascript:;"
  );
}

/* ================= CSS ================= */

async function inlineCSS(url){

  if(document.querySelector(`style[data-inline-css="${url}"]`)) return;

  try{

    const r = await fetch(url,{cache:"reload"});
    if(!r.ok) throw new Error();

    const css = await r.text();

    const style = document.createElement("style");
    style.setAttribute("data-inline-css",url);
    style.textContent = css;

    document.head.appendChild(style);

  }
  catch{

    if(!document.querySelector(`link[href="${url}"]`)){

      const l = document.createElement("link");
      l.rel="stylesheet";
      l.href=url;

      document.head.appendChild(l);

    }

  }

}

function loadCSS(url){
  return inlineCSS(url);
}

/* ================= JS ================= */

function loadJS(url,check){

  if(check && check()) return Promise.resolve();

  if(document.querySelector(`script[src="${url}"]`)) return Promise.resolve();

  return new Promise((resolve,reject)=>{

    const s=document.createElement("script");
    s.src=url;
    s.defer=true;

    s.onload=resolve;
    s.onerror=reject;

    document.head.appendChild(s);

  });

}

/* ================= JSON5 ================= */

let _json5Loaded=false;

async function ensureJSON5(){

  if(_json5Loaded) return;

  await loadJS(
    "https://cdn.jsdelivr.net/npm/json5@2/dist/index.min.js",
    ()=>window.JSON5
  );

  _json5Loaded=true;
}

/* ================= FETCH JSON ================= */

async function fetchJSON(url){

  if(JSON_CACHE.has(url)) return JSON_CACHE.get(url);

  const r = await fetch(url,{cache:"no-store"});

  if(!r.ok) throw new Error("Erro JSON "+url);

  const text = await r.text();

  let data;

  try{

    data = JSON.parse(text);

  }
  catch{

    await ensureJSON5();
    data = JSON5.parse(text);

  }

  JSON_CACHE.set(url,data);

  return data;

}

/* ================= PLACEHOLDERS ================= */

function parsePlaceholders(){

  const walker=document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT
  );

  const nodes=[];

  while(walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach(node=>{

    const text=node.nodeValue;

    if(!text.includes("{{")) return;

    const frag=document.createDocumentFragment();

    const regex=/\{\{ava:([^:}]+):([^}]+)\}\}/g;

    let last=0;
    let match;

    while((match=regex.exec(text))){

      const[,component,config]=match;

      frag.appendChild(
        document.createTextNode(text.substring(last,match.index))
      );

      const div=document.createElement("div");

      div.className="ava-component";
      div.dataset.component=component;
      div.dataset.config=config;

      frag.appendChild(div);

      last=regex.lastIndex;

    }

    frag.appendChild(
      document.createTextNode(text.substring(last))
    );

    node.parentNode.replaceChild(frag,node);

  });

}

/* ================= COMPONENT SYSTEM ================= */

const COMPONENTS={};

function registerComponent(name,fn){
  COMPONENTS[name]=fn;
}

async function initComponents(){

  const comps=document.querySelectorAll(".ava-component");

  for(const comp of comps){

    const type=comp.dataset.component;
    const config=comp.dataset.config;

    if(!COMPONENTS[type]) continue;

    try{
      await COMPONENTS[type](comp,config);
    }
    catch(e){
      console.error("Erro componente",type,e);
    }

  }

}

/* ================= SLICK ================= */

let _slickLoaded=false;

async function ensureSlick(){

  if(_slickLoaded) return;

  await loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css");
  await loadCSS("https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css");

  await loadJS(
    "https://code.jquery.com/jquery-3.6.0.min.js",
    ()=>window.jQuery
  );

  await loadJS(
    "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js",
    ()=>window.jQuery?.fn?.slick
  );

  _slickLoaded=true;

}

/* ================= BANNER ================= */

registerComponent("bannerAVA",async(container,configName)=>{

  const path=BASE_URL+"bannerAVA/";

  await loadCSS(path+"bannerava.css");

  const config=await fetchJSON(path+configName+".json");

  const slides=config.slides||[];

  if(!slides.length) return;

  container.innerHTML=
  `<div class="slick-banner">
     <div class="Slick-Principal"></div>
   </div>`;

  const slickEl=container.querySelector(".Slick-Principal");

  slides.forEach(slide=>{

    const raw=(slide.link||"").trim().toLowerCase();

    const desktop=escapeSrc(slide.desktop);
    const mobile=escapeSrc(slide.mobile)||desktop;
    const alt=escapeHtml(slide.alt);

    let html;

    if(isDeadLink(raw)){

      html=
      `<div>
        <picture>
          <source media="(min-width:600px)" srcset="${desktop}">
          <img src="${mobile}" alt="${alt}">
        </picture>
      </div>`;

    }
    else{

      const link=escapeUrl(slide.link);

      html=
      `<div>
        <a href="${link}" target="_blank" rel="noopener">
          <picture>
            <source media="(min-width:600px)" srcset="${desktop}">
            <img src="${mobile}" alt="${alt}">
          </picture>
        </a>
      </div>`;

    }

    slickEl.insertAdjacentHTML("beforeend",html);

  });

  if(slides.length===1) return;

  await ensureSlick();

  window.jQuery(slickEl).slick({

    dots:true,
    arrows:true,
    infinite:true,
    speed:800,
    slidesToShow:1,
    autoplay:true,
    autoplaySpeed:4000

  });

});

/* ================= BUTTONS ================= */

registerComponent("buttonAVA",async(container,configName)=>{

  const path=BASE_URL+"buttonAVA/";

  await loadCSS(path+"buttonava.css");

  const data=await fetchJSON(path+configName+".json");

  const botoes=data.botoes||[];

  const html=botoes.map(btn=>{

    const href=(btn.url||"").trim().toLowerCase();

    const disabled=isDeadLink(href);

    const url=disabled?"#":escapeUrl(btn.url);

    return`
    <a href="${url}"
       class="btn-card btn-ava ${disabled?"btn-disabled":""}"
       ${disabled?'style="pointer-events:none;cursor:default"':''}>
      <div class="icon-container">
        <i class="${escapeHtml(btn.icone)}"></i>
      </div>
      <span class="btn-text">${escapeHtml(btn.titulo)}</span>
    </a>`;

  }).join("");

  container.innerHTML=
  `<div class="buttonava-wrapper">
    <div class="buttonava-grid">
      ${html}
    </div>
  </div>`;

});

/* ================= INIT ================= */

let started=false;

async function init(){

  if(started) return;

  started=true;

  parsePlaceholders();

  await initComponents();

}

function resetInit(){
  started=false;
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",init);
}
else{
  init();
}

return{init,resetInit};

});
