/**
 * Buttonava Loader - Carrega botões dinamicamente a partir de JSON
 */

(function() {
  'use strict';

  const ButtonavaLoader = {
    containerSelector: '.buttonava-grid',
    jsonPath: 'botoes.json',

    init: function(options) {
      if (options?.container) this.containerSelector = options.container;
      if (options?.jsonPath) this.jsonPath = options.jsonPath;
      const el = document.querySelector(this.containerSelector);
      if (el?.dataset.json) this.jsonPath = el.dataset.json;
      this.load();
    },

    load: function() {
      fetch(this.jsonPath)
        .then(res => {
          if (!res.ok) throw new Error('Falha ao carregar JSON');
          return res.json();
        })
        .then(data => this.render(data))
        .catch(err => console.error('ButtonavaLoader:', err));
    },

    render: function(data) {
      const container = document.querySelector(this.containerSelector);
      if (!container) return;

      const botoes = data.botoes || data.buttons || [];
      container.innerHTML = botoes.map(btn => this.createButton(btn)).join('');
    },

    createButton: function(btn) {
      const titulo = btn.titulo || btn.title || 'Botão';
      const url = btn.url || btn.href || '#';
      const icone = btn.icone || btn.icon || 'fa-duotone fa-regular fa-circle';
      const isIcon = icone.startsWith('fa-');

      const iconHtml = isIcon
        ? `<i class="${icone}"></i>`
        : (btn.svg || '');

      return `
        <a href="${this.escapeHtml(url)}" class="btn-card btn-ava">
          <div class="icon-container">${iconHtml}</div>
          <span class="btn-text">${this.escapeHtml(titulo)}</span>
        </a>
      `;
    },

    escapeHtml: function(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // Auto-init quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ButtonavaLoader.init());
  } else {
    ButtonavaLoader.init();
  }

  window.ButtonavaLoader = ButtonavaLoader;
})();
