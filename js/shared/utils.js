// =====================================================
// UTILITÁRIOS GLOBAIS
// =====================================================

export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

export function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

export function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') element.className = v;
    else if (k === 'text') element.textContent = v;
    else if (k === 'html') element.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      element.addEventListener(k.slice(2).toLowerCase(), v);
    } else {
      element.setAttribute(k, v);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    element.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return element;
}

export function toast(message, type = 'info') {
  let t = document.querySelector('.toast');
  if (!t) {
    t = el('div', { class: 'toast' });
    document.body.appendChild(t);
  }
  t.textContent = message;
  t.className = `toast ${type}`;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

export function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

export function generateInviteCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function driveToEmbed(url) {
  if (!url) return '';
  // Converte links comuns do Google Drive para embed
  // Ex: https://drive.google.com/file/d/FILE_ID/view → preview
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  // Já é um link de preview ou outro
  return url;
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function showModal(contentHtml, title = '') {
  const overlay = el('div', { class: 'modal-overlay open' }, [
    el('div', { class: 'modal' }, [
      el('div', { class: 'modal-header' }, [
        el('div', { class: 'modal-title', text: title }),
        el('button', {
          class: 'icon-btn',
          html: '✕',
          onClick: () => overlay.remove()
        })
      ]),
      el('div', { html: contentHtml })
    ])
  ]);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  return overlay;
}

export function confirmDialog(message) {
  return new Promise((resolve) => {
    const overlay = el('div', { class: 'modal-overlay open' }, [
      el('div', { class: 'modal' }, [
        el('p', { text: message, style: 'margin-bottom:20px;font-size:1rem;' }),
        el('div', { class: 'btn-group' }, [
          el('button', {
            class: 'btn btn-outline',
            text: 'Cancelar',
            onClick: () => { overlay.remove(); resolve(false); }
          }),
          el('button', {
            class: 'btn btn-primary',
            text: 'Confirmar',
            onClick: () => { overlay.remove(); resolve(true); }
          })
        ])
      ])
    ]);
    document.body.appendChild(overlay);
  });
}
