// =====================================================
// FIREBASE CONFIG - Edmilson Treinador
// =====================================================

export const firebaseConfig = {
  apiKey: "AIzaSyCbC-jlsA6jATFmeIJO2uC71sYsDMDpDww",
  authDomain: "edmilson-treinador.firebaseapp.com",
  projectId: "edmilson-treinador",
  storageBucket: "edmilson-treinador.firebasestorage.app",
  messagingSenderId: "160290308926",
  appId: "1:160290308926:web:d71ea364142ac4124d226f",
  measurementId: "G-8RF5R26RH8"
};


/** Único e-mail autorizado a gerenciar a lista padrão de exercícios */
export const APP_ADMIN_EMAIL = "edmilsonwp@gmail.com";


/** reCAPTCHA v3 site key (pública) — preencha após criar no Google reCAPTCHA + App Check */
export const APP_CHECK_SITE_KEY = ""; // ex: "6Lc...."

/**
 * Ativa App Check se a site key estiver configurada.
 * Compat SDK: firebase.appCheck().activate(siteKey, true)
 */
export function initAppCheckIfConfigured() {
  if (!APP_CHECK_SITE_KEY || typeof firebase === "undefined" || !firebase.appCheck) {
    console.info("[security] App Check não configurado (normal até você colar a site key).");
    return false;
  }
  try {
    // Debug token em localhost (registre o token no Firebase Console → App Check)
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = self.FIREBASE_APPCHECK_DEBUG_TOKEN || true;
    }
    firebase.appCheck().activate(APP_CHECK_SITE_KEY, true);
    console.info("[security] App Check ativo");
    return true;
  } catch (e) {
    console.warn("[security] App Check falhou:", e);
    return false;
  }
}
