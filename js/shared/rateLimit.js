// =====================================================
// RATE LIMIT CLIENT-SIDE (primeira linha de defesa)
// Não substitui Rules/App Check — reduz spam acidental e scripts leves
// =====================================================

const mem = new Map();

function loadPersistent(key) {
  try {
    const raw = sessionStorage.getItem('rl_' + key);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (Date.now() > o.resetAt) {
      sessionStorage.removeItem('rl_' + key);
      return null;
    }
    return o;
  } catch {
    return null;
  }
}

function savePersistent(key, entry) {
  try {
    sessionStorage.setItem('rl_' + key, JSON.stringify(entry));
  } catch { /* quota */ }
}

/**
 * @param {string} key
 * @param {number} max
 * @param {number} windowMs
 * @param {boolean} persistent - sobrevive a F5 na mesma aba
 */
export function canProceed(key, max = 8, windowMs = 10000, persistent = false) {
  const now = Date.now();
  let entry = mem.get(key);
  if (!entry && persistent) entry = loadPersistent(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
  }

  if (entry.count >= max) {
    mem.set(key, entry);
    if (persistent) savePersistent(key, entry);
    return false;
  }

  entry.count += 1;
  mem.set(key, entry);
  if (persistent) savePersistent(key, entry);
  return true;
}

export function guard(key, max = 8, windowMs = 10000, persistent = false) {
  if (!canProceed(key, max, windowMs, persistent)) {
    const err = new Error('Muitas requisições. Aguarde alguns segundos e tente de novo.');
    err.code = 'rate-limit';
    throw err;
  }
}

/** Limites recomendados por tipo de operação (uso interno) */
export const RL = {
  read:   { max: 12, windowMs: 10000 },
  write:  { max: 8,  windowMs: 15000 },
  auth:   { max: 5,  windowMs: 60000, persistent: true },
  chat:   { max: 12, windowMs: 60000, persistent: true },
  heavy:  { max: 3,  windowMs: 30000, persistent: true }
};

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of mem.entries()) {
    if (now > v.resetAt) mem.delete(k);
  }
}, 60000);
