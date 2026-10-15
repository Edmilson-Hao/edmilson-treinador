// =====================================================
// RATE LIMIT CLIENT-SIDE
// Evita spam de leituras/escritas por usuário malicioso
// =====================================================

const store = new Map(); // key → { count, resetAt }

/**
 * Verifica se a ação pode ser executada.
 * @param {string} key - identificador da ação (ex: 'list-students')
 * @param {number} max - máximo de chamadas no período
 * @param {number} windowMs - janela de tempo em ms (padrão 10s)
 * @returns {boolean}
 */
export function canProceed(key, max = 8, windowMs = 10000) {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  if (entry.count >= max) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Wrapper que lança erro se o limite for atingido
 */
export function guard(key, max = 8, windowMs = 10000) {
  if (!canProceed(key, max, windowMs)) {
    throw new Error('Muitas requisições. Aguarde alguns segundos.');
  }
}

// Limpa entradas antigas periodicamente (evita memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now > v.resetAt) store.delete(k);
  }
}, 60000);
