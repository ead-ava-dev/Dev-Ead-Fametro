/**
 * Script para INJETAR todos os arquivos CSS do Font Awesome Pro no Moodle usando <link>,
 * garantindo que as fontes web (woff2, woff) funcionem corretamente.
 *
 * Todas as fontes (.woff2, .woff, etc.) estão no caminho:
 *   https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/webfonts/
 * Os CSS estão em:
 *   https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/
 *
 * Certifique-se de que os arquivos CSS fazem referência ao diretório correto das fontes em seus @font-face.
 *
 * Exemplo de estrutura:
 *   # Fontawesome7.1.0
 *     |- webfonts/
 *     |- css/
 *     |- js/
 *         |- todos.js (este arquivo)
 *
 * ================================================
 * O QUE ESSE SCRIPT FAZ:
 * - Para cada arquivo CSS do Font Awesome, adiciona uma tag <link rel="stylesheet">
 * - Isso garante que os @font-face do Font Awesome funcionem (as fontes são carregadas)
 * - Adiciona uma classe fa-pro-css-injected na <html> ao terminar a injeção
 * - Se executado mais de uma vez, não adiciona links duplicados
 * - Exporte a função: window.injectAllFontAwesomeLinks()
 *
 * PARA FUNCIONAR:
 * - Todos os arquivos CSS e fontes devem estar acessíveis via os caminhos acima.
 * ================================================
 */

(function() {
  // Lista de arquivos CSS do Font Awesome a serem inseridos (1 <link> por arquivo)
  const cssFiles = [
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/all2.css'
    /*'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/all.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/brands.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/chisel-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/duotone.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/duotone-light.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/duotone-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/duotone-thin.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/etch-solid.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/fontawesome.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/graphite-thin.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/jelly-duo-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/jelly-fill-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/jelly-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/light.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/notdog-duo-solid.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/notdog-solid.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/sharp-duotone-light.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/sharp-duotone-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/sharp-duotone-solid.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/sharp-duotone-thin.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/sharp-light.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/sharp-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/sharp-solid.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/sharp-thin.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/slab-press-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/slab-regular.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/solid.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/svg.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/svg-with-js.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/thin.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/thumbprint-light.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/utility-duo-semibold.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/utility-fill-semibold.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/utility-semibold.css',
    'https://ead-ava-dev.github.io/Dev-Ead-Fametro/Fontawesome7.1.0/css/whiteboard-semibold.css'*/
  ];

  /**
   * Injeta todos os <link rel="stylesheet"> do FontAwesome no <head>.
   * Os @font-face nos CSS devem apontar para /webfonts corretamente.
   */
  function injectAllFontAwesomeLinks() {
    cssFiles.forEach(cssFile => {
      const href = cssFile;
      if (![...document.querySelectorAll('link[rel="stylesheet"]')].some(link => link.href === href)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    });
    document.documentElement.classList.add('fa-pro-css-injected');
  }

  // Executa automaticamente ao carregar para garantir que tudo é injetado:
  injectAllFontAwesomeLinks();

  // Exporta para uso manual, se necessário
  window.injectAllFontAwesomeLinks = injectAllFontAwesomeLinks;
})();
