# Edmilson Treinador – PWA

App de prescrição de treinos (clone funcional do MFit Personal)  
**Stack:** HTML + CSS + JavaScript vanilla + Firebase (Auth + Firestore)  
**Design:** Dark premium com acento âmbar · Mobile-first · Instalável · Offline

---

## 1. Criar projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **Adicionar projeto** → nome: `edmilson-treinador` (ou o que preferir)
3. Desative Google Analytics se quiser (opcional)
4. No projeto criado:

### Authentication
- Vá em **Authentication** → **Get started**
- Abra a aba **Sign-in method**
- Ative **Google**
- Ative **E-mail/senha**

### Firestore
- Vá em **Firestore Database** → **Create database**
- Escolha **Start in test mode** (depois colamos as regras)
- Localização: `southamerica-east1` (São Paulo) recomendado

### Configuração do app web
- Vá em **Project settings** (engrenagem) → **Your apps** → ícone `</>`
- Apelido: `Edmilson Treinador`
- Copie o objeto `firebaseConfig`

---

## 2. Configurar o código

Abra o arquivo:

```
js/firebase-config.js
```

Substitua pelos valores reais do seu projeto:

```js
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};
```

---

## 3. Publicar as regras de segurança

1. No Firebase Console → **Firestore** → aba **Rules**
2. Apague tudo e cole o conteúdo do arquivo `firestore.rules`
3. Clique em **Publish**

---

## 4. Índices necessários (Firestore)

O Firestore vai pedir índices compostos na primeira vez que você usar algumas queries.  
Clique no link de erro que aparecer no console do navegador – ele cria automaticamente.

Principais:
- `users` → `role` ASC + `inviteCode` ASC
- `users` → `role` ASC + `personalId` ASC + `name` ASC
- `routines` → `studentId` ASC + `archived` ASC + `order` ASC
- `workouts` → `routineId` ASC + `order` ASC
- `completedWorkouts` → `studentId` ASC + `finishedAt` DESC
- `completedWorkouts` → `personalId` ASC + `finishedAt` DESC

---

## 5. Rodar localmente

Você precisa de um servidor local (módulo ES não funciona em `file://`).

### Opção rápida (Python):
```bash
cd edmilson-treinador
python -m http.server 5500
```
Abra: http://localhost:5500

### Opção com VS Code:
Extensão **Live Server** → clique com botão direito em `index.html` → Open with Live Server

---

## 6. Deploy (Firebase Hosting – recomendado)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# escolha a pasta edmilson-treinador
# single-page app: Yes
firebase deploy
```

Depois o app fica em: `https://seu-projeto.web.app`

---

## 7. Como usar

### Personal (você)
1. Entre com Google
2. Escolha **Sou o Personal Trainer**
3. Anote o **código de convite** gerado
4. Cadastre exercícios (com link do Google Drive)
5. Adicione alunos (cria e-mail + senha ou manda o código)
6. Crie rotinas → treinos → adicione exercícios + séries

### Aluno
1. Entra com Google **ou** e-mail/senha que você criou
2. Se for Google: digita o código de convite
3. Vê as rotinas, assiste os vídeos e conclui o treino com feedback

---

## 8. Vídeos do Google Drive

1. Coloque o vídeo em uma pasta do Drive
2. Clique com botão direito → **Compartilhar** → **Qualquer pessoa com o link**
3. Copie o link e cole no cadastro do exercício
4. O app converte automaticamente para o formato de embed (`/preview`)

---

## 9. PWA / Instalação

- No celular (Chrome/Safari) aparece a opção **Adicionar à tela inicial**
- Service Worker cacheia os arquivos estáticos e permite ver treinos offline
- Vídeos só funcionam com internet (normal)

---

## 10. Estrutura de pastas

```
edmilson-treinador/
├── index.html
├── manifest.json
├── sw.js
├── firestore.rules
├── css/styles.css
├── js/
│   ├── app.js                 ← lógica principal
│   ├── firebase-config.js
│   └── shared/
│       ├── auth.js
│       ├── db.js
│       └── utils.js
└── assets/icons/              ← coloque icon-192.png e icon-512.png
```

---

## Próximas melhorias possíveis (v2)
- Anamnese PAR-Q completa
- Notificações push reais (FCM)
- Evolução de cargas (gráficos)
- Clonar rotina entre alunos
- Agenda de lembretes

---

Feito com ❤️ para o Edmilson.
