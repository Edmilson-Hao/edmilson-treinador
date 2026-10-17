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
  if (typeof Swal !== 'undefined') {
    const icon = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title: message,
      showConfirmButton: false,
      timer: 2800,
      timerProgressBar: true,
      background: getComputedStyle(document.documentElement).getPropertyValue('--elevated').trim() || '#1e293b',
      color: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#f1f5f9'
    });
    return;
  }
  document.querySelectorAll('.toast').forEach(n => n.remove());
  const t = el('div', { class: `toast ${type}` });
  t.textContent = message;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 2800);
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

/**
 * Converte links de vídeo (Google Drive, YouTube, Shorts) para URL de embed.
 * Exemplos aceitos:
 * - https://drive.google.com/file/d/FILE_ID/view?...
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://youtube.com/embed/VIDEO_ID (já embed)
 */
export function videoToEmbed(url) {
  if (!url) return '';
  const u = url.trim();

  // Google Drive: /file/d/ID/ ou /d/ID/
  const drive = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
             || u.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
             || u.match(/drive\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/);
  if (drive) {
    return `https://drive.google.com/file/d/${drive[1]}/preview`;
  }

  // YouTube Shorts
  const shorts = u.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shorts) {
    return `https://www.youtube.com/embed/${shorts[1]}`;
  }

  // YouTube watch?v=
  const watch = u.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watch && /youtu/.test(u)) {
    return `https://www.youtube.com/embed/${watch[1]}`;
  }

  // youtu.be/ID
  const short = u.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (short) {
    return `https://www.youtube.com/embed/${short[1]}`;
  }

  // Já é embed do YouTube
  if (/youtube\.com\/embed\//.test(u)) {
    return u;
  }

  // Drive preview já pronto ou outro link
  return u;
}

export function isGifUrl(url) {
  if (!url) return false;
  const u = url.trim().toLowerCase();
  return /\.(gif)(\?|$)/.test(u)
    || u.includes('giphy.com')
    || u.includes('tenor.com')
    || u.includes('media.giphy')
    || u.includes('.gif');
}

/** HTML de mídia do exercício (vídeo embed ou GIF) */
export function mediaHtml(url) {
  if (!url) return '';
  if (isGifUrl(url)) {
    // Classe media = largura total, altura natural (vertical ou horizontal)
    return `<div class="video-wrap video-wrap--media"><img src="${url}" alt="GIF do exercício" loading="lazy" decoding="async"></div>`;
  }
  const src = videoToEmbed(url);
  if (!src) return '';
  // YouTube/Drive: retangular 16:9 em largura total
  return `<div class="video-wrap video-wrap--wide"><iframe src="${src}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen frameborder="0"></iframe></div>`;
}

/** @deprecated use videoToEmbed */
export function driveToEmbed(url) {
  return videoToEmbed(url);
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

export async function confirmDialog(message, title = 'Confirmar') {
  if (typeof Swal !== 'undefined') {
    const r = await Swal.fire({
      title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#64748b',
      background: getComputedStyle(document.documentElement).getPropertyValue('--elevated').trim() || '#1e293b',
      color: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#f1f5f9'
    });
    return r.isConfirmed;
  }
  return window.confirm(message);
}

/** Prompt com SweetAlert2 */
export async function promptDialog(title, inputLabel = '', defaultValue = '') {
  if (typeof Swal !== 'undefined') {
    const r = await Swal.fire({
      title,
      input: 'text',
      inputLabel,
      inputValue: defaultValue,
      showCancelButton: true,
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f59e0b',
      background: getComputedStyle(document.documentElement).getPropertyValue('--elevated').trim() || '#1e293b',
      color: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#f1f5f9'
    });
    return r.isConfirmed ? (r.value || '') : null;
  }
  return window.prompt(title, defaultValue);
}


/**
 * Redimensiona e comprime imagem para base64 (perfil).
 * maxSize: lado máximo em px (default 256)
 * maxBytes: tamanho aproximado alvo em bytes (default 120KB)
 */
export function compressImageToBase64(file, maxSize = 256, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Selecione uma imagem'));
      return;
    }
    // limite bruto 5MB antes de processar
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Imagem muito grande (máx. 5 MB)'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida'));
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        let q = quality;
        let dataUrl = canvas.toDataURL('image/jpeg', q);
        // se ainda grande, reduz qualidade
        while (dataUrl.length > 160000 && q > 0.4) {
          q -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', q);
        }
        if (dataUrl.length > 200000) {
          reject(new Error('Não foi possível comprimir o suficiente. Tente outra foto.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
