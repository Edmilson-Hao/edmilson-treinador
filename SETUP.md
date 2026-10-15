# Setup interno (NÃO publicar no GitHub Pages se possível)

Guia para configurar o Firebase e o ambiente de desenvolvimento.

## 1. Firebase
- Projeto: `edmilson-treinador`
- Auth: Google + E-mail/senha
- Firestore: southamerica-east1
- Config em `js/firebase-config.js`

## 2. Regras (produção)
Use o arquivo `firestore.rules`. Em testes pode usar:
```
allow read, write: if request.auth != null;
```

## 3. Deploy GitHub Pages
- Repo com os arquivos na raiz ou pasta `docs/`
- Settings → Pages → branch main
- URL: `https://USER.github.io/REPO/`

## 4. Service Worker em subpasta
O SW aponta para `/sw.js` (raiz do domínio). Em GitHub Pages com subpasta, o SW pode falhar — não impede o app de funcionar.

## 5. Índices
Com as queries atuais (1 filtro de igualdade + sort no cliente), índices compostos não são necessários no MVP.
