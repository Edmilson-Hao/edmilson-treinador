# Edmilson Treinador — Palácio de Memória / Contexto do Projeto

> Cole este arquivo (ou o resumo) em novos chats para continuar o desenvolvimento sem reexplicar tudo.

## O que é
PWA vanilla (HTML/CSS/JS, **sem frameworks**) de treinos para personal trainer e alunos.
- **Nome:** Edmilson Treinador  
- **URL deploy:** https://edmilson-hao.github.io/edmilson-treinador/  
- **Firebase projectId:** `edmilson-treinador`  
- **Admin (lista padrão de exercícios):** e-mail `edmilsonwp@gmail.com` ou `users.isAdmin == true`

## Stack
- HTML + CSS + JS moderno (modules ES)
- Firebase Compat 10.14: Auth + Firestore (sem Storage)
- PWA: `manifest.json` + `sw.js`
- Vídeos: Google Drive / YouTube / Shorts (embed via `videoToEmbed`)
- Sem React/Vue/etc.

## Estrutura de pastas
```
edmilson-treinador/
  index.html
  manifest.json
  sw.js
  firestore.rules
  SETUP.md              # setup interno Firebase
  PROJECT_CONTEXT.md    # este arquivo
  css/styles.css
  assets/logo.png
  assets/icons/icon-192.png, icon-512.png
  js/
    app.js              # UI principal (quase tudo)
    firebase-config.js  # keys do projeto
    shared/
      auth.js
      db.js             # Firestore + rate limit
      utils.js          # toast, videoToEmbed, compressImageToBase64
      rateLimit.js
```

## Roles
| role | acesso |
|------|--------|
| `pending` | onboarding (sou personal / sou aluno+código) |
| `personal` | alunos, exercícios, rotinas, treinos, financeiro, feedbacks |
| `aluno` | treinos ativos, histórico, financeiro, perfil |

## Coleções Firestore
- `users` — role, name, email, phone, photoURL (base64 comprimido), personalId, inviteCode, pixKey, sex, birthDate, heightCm, weightKg, goal, notes, isAdmin
- `exercises` — personalId (`uid` ou `__global__` para lista padrão), name, muscleGroup, videoUrl, notes
- `routines` — studentId, personalId, name, archived, order
- `workouts` — routineId, studentId, personalId, name, exercises[], **startDate**, **endDate**, order
- `completedWorkouts` — exercisesPerformed[], intensity, feedback, **coachReply**, resolved, durationSeconds, tonnage implícito
- `plans` — faturas: status `pendente|aguardando|pago|recusado`, value, dueDate, pixKey

## Exercícios: duas listas
- **Lista padrão:** `personalId == '__global__'` — só admin cria/edita  
- **Lista personalizada:** `personalId == uid` do personal  

## Fluxo de treino do aluno
1. Abre treino → botão **Iniciar treino**
2. Cronômetro de sessão no topo (localStorage)
3. Por exercício: reps/kg, dificuldade, **cronômetro de descanso** (segundos definidos pelo personal)
4. **Concluir exercício** / Refazer
5. **Finalizar treino** ou **Cancelar treino** (confirmação, limpa localStorage)
6. Sessão em `localStorage`: `workout_session_{uid}_{workoutId}`

## Vigência do treino
- Personal define `startDate` e `endDate` ao criar
- Aluno só vê treinos com `isWorkoutActive()` (agora entre as datas)
- Após endDate some da lista (mensagens coachReply podem ser limpas em job futuro)

## Financeiro
- Manual (PIX fora do app)
- Aluno “Já paguei” → status `aguardando` → personal confirma/recusa
- WhatsApp cobrança (telefone no perfil)

## Design
- Dark: slate-900 `#0f172a`, accent âmbar `#f59e0b`
- Mobile-first, bottom-nav aluno, tabs personal

## Segurança
- `firestore.rules` no repo (ajustar em produção)
- `rateLimit.js` no client
- API key no Google Cloud sem restrição de HTTP referrer que bloqueie (ou com domínios github.io + localhost)

## Deploy
GitHub Pages na pasta do repo. Após push: hard refresh Ctrl+Shift+R.

## O que NÃO usar
- Frameworks frontend
- Firebase Storage (fotos em base64 no user doc, max ~256px)
- Pagamento automático

## Próximos candidatos
- FCM push de fatura
- Limpeza automática de coachReply após endDate
- Anamnese/PAR-Q completo
- Offline SW cache de treinos (parcial)
