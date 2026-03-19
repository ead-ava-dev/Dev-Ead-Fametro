/**
 * Script para UNIFICAR e INJETAR todos arquivos CSS do Font Awesome Pro no Moodle via DOM Javascript.
 * 
 * Os arquivos CSS originais:
 *  - chisel-regular.css
 *  - duotone.css
 *  - duotone-light.css
 *  - duotone-regular.css
 *  - duotone-thin.css
 *  - etch-solid.css
 *  - fontawesome.css
 *  - graphite-thin.css
 *  - jelly-duo-regular.css
 *  - jelly-fill-regular.css
 *  - jelly-regular.css
 *  - light.css
 *  - notdog-duo-solid.css
 *  - notdog-solid.css
 *  - regular.css
 *  - sharp-duotone-light.css
 *  - sharp-duotone-regular.css
 *  - sharp-duotone-solid.css
 *  - sharp-duotone-thin.css
 *  - sharp-light.css
 *  - sharp-regular.css
 *  - sharp-solid.css
 *  - sharp-thin.css
 *  - slab-press-regular.css
 *  - slab-regular.css
 *  - solid.css
 *  - svg.css
 *  - svg-with-js.css
 *  - thin.css
 *  - thumbprint-light.css
 *  - utility-duo-semibold.css
 *  - utility-fill-semibold.css
 *  - utility-semibold.css
 *  - whiteboard-semibold.css
 *  - brands.css
 *
 * Esta abordagem cria uma tag <style> no <head> com todos CSSs colados, para facilitar uso em plugins ou HTML extra do Moodle.
 * 
 * ATENÇÃO:
 *  - Garanta que todos os arquivos estejam no mesmo diretório do arquivo HTML que executa este JS, ou ajuste os caminhos.
 *  - Recomendado utilizar a versão minificada/unificada dos CSS caso precise otimizar performance.
 *
 * Exemplo: Cole o conteúdo deste script JS direto no HTML ou no campo de JS extra do tema Moodle/HTML block.
 */

(function() {
  // Caminhos do CSS
  const cssFiles = [
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/chisel-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/duotone.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/duotone-light.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/duotone-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/duotone-thin.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/etch-solid.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/fontawesome.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/graphite-thin.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/jelly-duo-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/jelly-fill-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/jelly-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/light.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/notdog-duo-solid.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/notdog-solid.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/sharp-duotone-light.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/sharp-duotone-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/sharp-duotone-solid.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/sharp-duotone-thin.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/sharp-light.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/sharp-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/sharp-solid.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/sharp-thin.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/slab-press-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/slab-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/solid.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/svg.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/svg-with-js.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/thin.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/thumbprint-light.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/utility-duo-semibold.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/utility-fill-semibold.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/utility-semibold.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/whiteboard-semibold.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/js/brands.css'
  ];

  /**
   * Carrega e concatena todos os CSSs listados e injeta no <head>
   */
  function injectAllFontAwesomeCSS(cssPath = './') {
    const requests = cssFiles.map(file => fetch(cssPath + file).then(r => r.text()));

    Promise.all(requests).then(cssList => {
      const style = document.createElement('style');
      style.type = 'text/css';

      // Separa cada arquivo com comentário de origem
      style.textContent = cssList.map((css, i) =>
        `/* ===== ${cssFiles[i]} ===== */\n${css}\n`
      ).join('\n');

      document.head.appendChild(style);
      // Opcional: Adicione uma classe/meta para identificar que já foi injetado
      document.documentElement.classList.add('fa-pro-css-injected');
    })
    .catch(err => {
      console.error('Falha ao carregar algum CSS do Font Awesome Pro:', err);
    });
  }

  // Injete automaticamente assim que possível (por ex, em bloco HTML/JS extra do Moodle)
  injectAllFontAwesomeCSS('./'); // Ajuste o caminho se necessário

  // Exporte para uso manual se necessário
  window.injectAllFontAwesomeCSS = injectAllFontAwesomeCSS;

})();
