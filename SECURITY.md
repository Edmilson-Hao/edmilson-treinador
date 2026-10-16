# Segurança — Edmilson Treinador

Camadas de defesa (todas importam):

1. **Firestore Rules** (servidor) — quem pode ler/escrever o quê  
2. **Firebase Auth** — identidade  
3. **App Check** — só o seu app (não scripts externos)  
4. **API Key restrictions** — domínio GitHub Pages + localhost  
5. **Rate limit no cliente** — reduz spam  
6. **Limites de query** — `limit()` em todas as listagens  
7. **Validação de campos** nas rules (tamanho de texto, valores)

---

## Checklist (você faz no console)

### A) Firestore Rules
- Firebase Console → Firestore → Rules → colar `firestore.rules` → Publish  
- **Nunca** deixar `allow read, write: if true` em produção

### B) Restringir API Key
1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)  
2. Abrir a Browser key do Firebase  
3. **Application restrictions** → HTTP referrers:
   - `https://edmilson-hao.github.io/*`
   - `http://localhost/*`
   - `http://127.0.0.1/*`
4. **API restrictions** → Restrict key → só o necessário:
   - Identity Toolkit API  
   - Token Service API  
   - Cloud Firestore API  
   - (se usar) Firebase Installations API  

### C) App Check (anti-bot / anti-script)
1. [reCAPTCHA Admin](https://www.google.com/recaptcha/admin) → criar **reCAPTCHA v3**  
   - Domínios: `edmilson-hao.github.io`, `localhost`  
2. Firebase Console → **App Check** → registrar app Web com a **secret key**  
3. Colar a **site key** em `js/firebase-config.js` → `APP_CHECK_SITE_KEY`  
4. Monitorar métricas 1–2 dias  
5. Só então: App Check → **Enforce** em Firestore (e Auth se disponível)  

Debug local: com `FIREBASE_APPCHECK_DEBUG_TOKEN`, copie o token do console do browser e cadastre em App Check → Manage debug tokens.

### D) Authentication
- Methods: Google + E-mail/senha (o que você usa)  
- Desative providers não usados  
- Authorized domains: `edmilson-hao.github.io`, `localhost`  
- (Opcional) e-mail verification se quiser endurecer alunos manuais  

### E) Billing alerts
- Google Cloud → Billing → Budgets & alerts  
- Alerta em R$ 5, R$ 20, R$ 50 (ou o que fizer sentido)  
- Firestore → Usage → acompanhar leituras  

### F) Serviços desligados
- Não use Storage se fotos são base64 no user (já é o caso)  
- Não ative APIs Google extras sem necessidade  

---

## O que o código já faz

| Controle | Onde |
|----------|------|
| Rate limit por ação | `js/shared/rateLimit.js` |
| Limits nas queries | `js/shared/db.js` LIMITS |
| Isolamento multi-personal | Rules + `personalId` |
| Chat max 500 chars + TTL 2 dias | Rules + `getChatMessages` |
| Foto max ~180 KB base64 | `updateUser` |
| Admin lista padrão | `APP_ADMIN_EMAIL` |
| App Check (quando site key preenchida) | `firebase-config.js` |

## O que rate limit no cliente **não** impede
Atacante pode ignorar o JS e falar direto com a API. Por isso Rules + App Check + API key domain são obrigatórios.

## Incidentes
Se suspeitar abuso: Firebase Support + desativar temporariamente a API key antiga e criar outra restrita.
