# Edmilson Treinador – PWA

App de prescrição de treinos (clone funcional do MFit Personal)  
**Stack:** HTML + CSS + JavaScript vanilla + Firebase (Auth + Firestore)  
**Design:** Dark premium com acento âmbar · Mobile-first · Instalável · Offline  
**Segurança:** Regras restritivas + rate-limit client-side + limites de query

---

# GUIA COMPLETO – CRIAR O PROJETO FIREBASE

Siga exatamente esta ordem.

## 1. Criar o projeto

1. Acesse → [https://console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **Criar um projeto** (ou "Add project")
3. Nome do projeto: `edmilson-treinador` (ou qualquer nome)
4. Desative o Google Analytics se quiser (opcional) → **Continuar**
5. Clique em **Criar projeto** e aguarde

---

## 2. Registrar o App Web

1. Na tela inicial do projeto clique no ícone **`</>`** (Web)
2. Apelido do app: `Edmilson Treinador`
3. **Não** marque "Firebase Hosting" ainda
4. Clique em **Registrar app**
5. **Copie o objeto `firebaseConfig`** que aparecer (você vai colar no código)

Exemplo do que você vai copiar:
```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "edmilson-treinador.firebaseapp.com",
  projectId: "edmilson-treinador",
  storageBucket: "edmilson-treinador.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

---

## 3. Ativar Authentication

1. No menu lateral → **Authentication** → **Começar**
2. Aba **Sign-in method**
3. Clique em **Google** → Ative → escolha um e-mail de suporte → **Salvar**
4. Clique em **E-mail/senha** → Ative o primeiro toggle → **Salvar**

---

## 4. Criar o Firestore

1. Menu lateral → **Firestore Database** → **Criar banco de dados**
2. Escolha **Começar no modo de produção** (vamos colar as regras logo em seguida)
3. Localização: **southamerica-east1 (São Paulo)** → **Ativar**

### 4.1 Publicar as regras de segurança

1. Ainda no Firestore → aba **Regras**
2. Apague tudo e cole o conteúdo completo do arquivo `firestore.rules` do projeto
3. Clique em **Publicar**

---

## 5. Configurar o código do app

Abra o arquivo:

```
js/firebase-config.js
```

Substitua pelos valores que você copiou no passo 2:

```js
export const firebaseConfig = {
  apiKey: "COLE_AQUI",
  authDomain: "COLE_AQUI",
  projectId: "COLE_AQUI",
  storageBucket: "COLE_AQUI",
  messagingSenderId: "COLE_AQUI",
  appId: "COLE_AQUI"
};
```

---

## 6. Índices do Firestore (importante)

Na primeira vez que você usar o app, o console do navegador (F12) pode mostrar erros de índice faltando.  
Clique no **link azul** que o Firebase gera – ele cria o índice automaticamente.

Principais índices que serão pedidos:
- `users` → role + inviteCode
- `users` → role + personalId + name
- `routines` → studentId + archived + order
- `workouts` → routineId + order
- `completedWorkouts` → studentId + finishedAt (desc)
- `completedWorkouts` → personalId + finishedAt (desc)
- `plans` → studentId + dueDate (desc)

---

## 7. Ativar App Check (proteção contra bots)

Isso impede que scripts externos usem sua chave do Firebase.

1. Menu lateral → **App Check**
2. Clique em **Começar**
3. Selecione o app web que você registrou
4. Escolha o provedor **reCAPTCHA v3**
5. Aceite os termos e clique em **Salvar**
6. Anote a **Site key** que aparecer
7. Ainda no App Check → aba **APIs** → em **Cloud Firestore** clique em **Enforce** (Forçar)

> Depois de enforce, qualquer chamada sem token do App Check é bloqueada.

### Como integrar o App Check no código (recomendado)

No `index.html`, antes do `app.js`, adicione:

```html
<script src="https://www.gstatic.com/firebasejs/10.14.0/firebase-app-check-compat.js"></script>
```

E no início do `boot()` em `app.js` (depois de `firebase.initializeApp`):

```js
const appCheck = firebase.appCheck();
appCheck.activate('SUA_SITE_KEY_RECAPTCHA', true);
```

---

## 8. Criar alertas de orçamento (evita surpresas na fatura)

1. Acesse o [Google Cloud Console](https://console.cloud.google.com)
2. Selecione o mesmo projeto
3. Menu → **Faturamento** → **Orçamentos e alertas**
4. Clique em **Criar orçamento**
5. Nome: `Alerta Firebase`
6. Valor: comece com **R$ 20,00** (ou o valor que preferir)
7. Em "Definir limite de alerta" marque **50%**, **90%** e **100%**
8. Adicione seu e-mail para receber os alertas
9. Salve

Agora você recebe e-mail se o gasto começar a subir.

---

## 9. Rodar o app localmente

```bash
cd edmilson-treinador
python -m http.server 5500
```

Abra no navegador: **http://localhost:5500**

> Módulos ES não funcionam com `file://`. Sempre use um servidor local.

---

## 10. Deploy (Firebase Hosting – recomendado)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

Durante o `init`:
- Escolha o projeto que você criou
- Public directory: `.` (ponto) ou a pasta do app
- Configure asingle-page app: **Yes**
- Não sobrescreva o index.html

Depois:

```bash
firebase deploy
```

Seu app ficará em: `https://SEU-PROJECT-ID.web.app`

---

# Proteções já implementadas no código

| Proteção | O que faz |
|----------|-----------|
| **Rate-limit client-side** | Máximo de X chamadas por ação a cada 10–30 segundos |
| **`.limit()` em todas as queries** | Nunca lê mais de 30–200 documentos de uma vez |
| **Regras Firestore restritivas** | Aluno não lista alunos, não promove a si mesmo, só escreve o que é dele |
| **Brute-force de código** | Máximo 5 tentativas de código de convite a cada 30s |
| **Conclusão de treino** | Máximo 5 conclusões a cada 30s (evita spam) |
| **Validação de campos** | Regras exigem campos obrigatórios na criação |

---

# Fluxo de uso

### Personal (você)
1. Entre com Google
2. Escolha "Sou o Personal Trainer"
3. Anote o código de convite
4. Cadastre exercícios (cole o link do Google Drive)
5. Adicione alunos (cria e-mail+senha ou manda o código)
6. Crie rotinas → treinos → adicione exercícios e séries

### Aluno
1. Entra com Google (digita o código) **ou** e-mail/senha que você criou
2. Vê as rotinas, assiste os vídeos e conclui o treino com feedback

---

# Vídeos do Google Drive

1. Coloque o vídeo em uma pasta do Drive
2. Compartilhar → **Qualquer pessoa com o link**
3. Copie o link e cole no cadastro do exercício
4. O app converte automaticamente para embed (`/preview`)

---

# Estrutura de pastas

```
edmilson-treinador/
├── index.html
├── manifest.json
├── sw.js
├── firestore.rules
├── README.md
├── css/styles.css
├── js/
│   ├── app.js
│   ├── firebase-config.js
│   └── shared/
│       ├── auth.js
│       ├── db.js
│       ├── rateLimit.js
│       └── utils.js
└── assets/icons/
```

---

Qualquer dúvida no processo de criação do Firebase, é só perguntar.
