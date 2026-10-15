// =====================================================
// APP PRINCIPAL - Edmilson Treinador
// =====================================================

import { firebaseConfig } from './firebase-config.js';
import { initAuth, onAuthChange, loginWithGoogle, loginWithEmail, registerWithEmail, logout, createStudentAccount } from './shared/auth.js';
import { initDb, getUser, createUser, updateUser, findPersonalByInviteCode, getStudentsOfPersonal, getPersonalStats, getExercises, createExercise, updateExercise, deleteExercise, getRoutinesOfStudent, createRoutine, getWorkoutsOfRoutine, createWorkout, updateWorkout, saveCompletedWorkout, getCompletedByStudent, getFeedbacksForPersonal, resolveFeedback, createPlan, getPlansOfStudent, getPlansOfPersonal, markPlanPaid, studentClaimPaid, rejectPlanClaim, updatePlan } from './shared/db.js';
import { $, $$, el, toast, formatDate, formatDateTime, initials, videoToEmbed, driveToEmbed, confirmDialog, generateInviteCode } from './shared/utils.js';

// Captura erros de rate-limit e mostra toast amigável
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('Muitas requisições')) {
    toast(e.reason.message, 'error');
    e.preventDefault();
  }
});

// Estado global
const state = {
  user: null,
  profile: null,
  view: 'splash',
  currentStudent: null,
  currentRoutine: null,
  currentWorkout: null
};

// ---------- BOOT ----------
async function boot() {
  // Carrega Firebase SDK via CDN (já no HTML)
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  initAuth(auth);
  initDb(db, auth);

  // Offline persistence
  try {
    await db.enablePersistence({ synchronizeTabs: true });
  } catch (e) {
    console.warn('Persistence não disponível:', e.code);
  }

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register((window.location.pathname.replace(/\/[^/]*$/, '/') || '/') + 'sw.js').catch(console.warn);
  }

  // Monitor de conexão
  window.addEventListener('online', () => $('#offline-badge')?.classList.remove('show'));
  window.addEventListener('offline', () => $('#offline-badge')?.classList.add('show'));

  onAuthChange(async (user) => {
    if (user) {
      state.user = user;
      let profile = await getUser(user.uid);
      if (!profile) {
        // fallback raro
        profile = { role: 'pending', name: user.displayName || 'Usuário', email: user.email };
      }
      state.profile = profile;
      await routeByRole();
    } else {
      state.user = null;
      state.profile = null;
      showAuth();
    }
    hideSplash();
  });
}

function hideSplash() {
  const splash = $('#splash');
  if (splash) {
    splash.classList.add('fade-out');
    setTimeout(() => splash.remove(), 350);
  }
}

// ---------- ROTEAMENTO SIMPLES ----------
async function routeByRole() {
  try {
    const role = state.profile?.role;
    if (role === 'personal') {
      await showPersonalHome();
    } else if (role === 'aluno') {
      await showStudentHome();
    } else {
      showOnboarding();
    }
  } catch (e) {
    console.error(e);
    toast(e.message || 'Erro ao carregar. Tente atualizar a página.', 'error');
    // fallback: mostra onboarding se perfil quebrado
    if (!state.profile?.role || state.profile.role === 'pending') showOnboarding();
  }
}

// ---------- AUTH SCREEN ----------
function showAuth() {
  const app = $('#app');
  app.innerHTML = `
    <div class="auth-screen">
      <div class="auth-logo">
        <div class="logo-circle">ET</div>
        <h1>Edmilson Treinador</h1>
        <p>Seus treinos, sua evolução</p>
      </div>

      <button class="btn btn-primary btn-block" id="btn-google" style="margin-bottom:16px">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Entrar com Google
      </button>

      <div style="text-align:center;color:var(--muted);font-size:0.85rem;margin:12px 0">ou</div>

      <div class="form-group">
        <label class="form-label">E-mail</label>
        <input type="email" class="form-input" id="auth-email" placeholder="seu@email.com">
      </div>
      <div class="form-group">
        <label class="form-label">Senha</label>
        <input type="password" class="form-input" id="auth-pass" placeholder="••••••••">
      </div>
      <button class="btn btn-outline btn-block" id="btn-email-login">Entrar com e-mail</button>
      <p style="text-align:center;margin-top:20px;font-size:0.85rem;color:var(--muted)">
        Aluno sem Google? Peça as credenciais ao seu personal.
      </p>
    </div>
  `;

  $('#btn-google').onclick = async () => {
    try {
      await loginWithGoogle();
    } catch {}
  };

  $('#btn-email-login').onclick = async () => {
    const email = $('#auth-email').value.trim();
    const pass = $('#auth-pass').value;
    if (!email || !pass) return toast('Preencha e-mail e senha', 'error');
    try {
      await loginWithEmail(email, pass);
    } catch {}
  };
}

// ---------- ONBOARDING (primeiro acesso) ----------
function showOnboarding() {
  const app = $('#app');
  app.innerHTML = `
    <div class="auth-screen">
      <div class="auth-logo">
        <div class="logo-circle">ET</div>
        <h1>Bem-vindo!</h1>
        <p>Como você vai usar o app?</p>
      </div>

      <button class="btn btn-primary btn-block" id="btn-sou-personal" style="margin-bottom:12px">
        Sou o Personal Trainer
      </button>
      <button class="btn btn-outline btn-block" id="btn-sou-aluno">
        Sou Aluno (tenho código de convite)
      </button>
    </div>
  `;

  $('#btn-sou-personal').onclick = async () => {
    try {
      const code = generateInviteCode();
      const data = {
        role: 'personal',
        inviteCode: code,
        personalId: null,
        name: state.user.displayName || state.profile?.name || 'Personal',
        email: state.user.email || state.profile?.email || null,
        photoURL: state.user.photoURL || state.profile?.photoURL || null
      };
      await updateUser(state.user.uid, data);
      state.profile = { ...(state.profile || {}), ...data };
      toast('Conta de Personal criada!', 'success');
      showPersonalHome();
    } catch (e) {
      console.error(e);
      toast(e.message || 'Erro ao criar conta de Personal', 'error');
    }
  };

  $('#btn-sou-aluno').onclick = () => {
    showJoinWithCode();
  };
}

function showJoinWithCode() {
  const app = $('#app');
  app.innerHTML = `
    <div class="auth-screen">
      <div class="auth-logo">
        <h1 style="color:var(--accent)">Código de Convite</h1>
        <p>Digite o código que o personal te enviou</p>
      </div>
      <div class="form-group">
        <label class="form-label">Código</label>
        <input type="text" class="form-input" id="invite-code" placeholder="Ex: AB12CD" style="text-transform:uppercase;letter-spacing:2px;text-align:center;font-size:1.3rem">
      </div>
      <button class="btn btn-primary btn-block" id="btn-join">Entrar no time</button>
      <button class="btn btn-outline btn-block" id="btn-back" style="margin-top:10px">Voltar</button>
    </div>
  `;

  $('#btn-back').onclick = showOnboarding;
  $('#btn-join').onclick = async () => {
    try {
      const code = $('#invite-code').value.trim().toUpperCase();
      if (!code) return toast('Digite o código', 'error');
      const personal = await findPersonalByInviteCode(code);
      if (!personal) return toast('Código inválido', 'error');
      const data = {
        role: 'aluno',
        personalId: personal.id,
        inviteCode: null,
        name: state.user.displayName || state.profile?.name || 'Aluno',
        email: state.user.email || state.profile?.email || null,
        photoURL: state.user.photoURL || state.profile?.photoURL || null
      };
      await updateUser(state.user.uid, data);
      state.profile = { ...(state.profile || {}), ...data };
      toast(`Vinculado a ${personal.name}!`, 'success');
      showStudentHome();
    } catch (e) {
      console.error(e);
      toast(e.message || 'Erro ao vincular', 'error');
    }
  };
}

// ---------- ÁREA DO PERSONAL ----------
async function showPersonalHome() {
  let stats = { totalStudents: 0, totalWorkoutsCompleted: 0, avgAdherence: 0 };
  let students = [];
  try {
    stats = await getPersonalStats(state.user.uid);
    students = await getStudentsOfPersonal(state.user.uid);
  } catch (e) {
    console.error(e);
    toast('Erro ao carregar dados. Se persistir, verifique o Firestore.', 'error');
  }

  const app = $('#app');
  app.innerHTML = `
    <header class="app-header">
      <div class="title">Edmilson Treinador</div>
      <div class="actions">
        <button class="icon-btn" id="btn-logout" title="Sair">⎋</button>
      </div>
    </header>

    <div class="tabs">
      <button class="tab active" data-tab="inicio">Início</button>
      <button class="tab" data-tab="alunos">Alunos</button>
      <button class="tab" data-tab="exercicios">Exercícios</button>
      <button class="tab" data-tab="financeiro" id="tab-financeiro">Financeiro</button>
      <button class="tab" data-tab="feedbacks">Feedbacks</button>
    </div>

    <div class="page" id="main-content"></div>
  `;

  $('#btn-logout').onclick = () => logout();

  $$('.tab').forEach(tab => {
    tab.onclick = () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderPersonalTab(tab.dataset.tab, students, stats);
    };
  });

  renderPersonalTab('inicio', students, stats);
  // Badge de pagamentos aguardando
  getPlansOfPersonal(state.user.uid).then(plans => {
    const n = plans.filter(p => p.status === 'aguardando').length;
    const tab = $('#tab-financeiro');
    if (tab && n > 0) {
      tab.innerHTML = `Financeiro <span class="badge" style="background:var(--accent);color:#000;margin-left:4px">${n}</span>`;
    }
  }).catch(() => {});
}

async function renderPersonalTab(tab, students, stats) {
  const content = $('#main-content');
  if (tab === 'inicio') {
    content.innerHTML = `
      <div class="stat-row">
        <div class="stat-card">
          <div class="stat-value">${stats.totalStudents}</div>
          <div class="stat-label">Alunos</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.totalWorkoutsCompleted}</div>
          <div class="stat-label">Treinos feitos</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.avgAdherence}%</div>
          <div class="stat-label">Adesão</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Seu código de convite</div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:1.6rem;font-weight:700;color:var(--accent);letter-spacing:3px">${state.profile.inviteCode || '—'}</div>
          <button class="btn btn-sm btn-outline" id="btn-copy-code">Copiar</button>
        </div>
        <p class="text-muted" style="font-size:0.8rem;margin-top:8px">Envie este código para o aluno se afiliar</p>
      </div>

      <div class="action-grid">
        <div class="action-item" id="act-add-student">
          <div class="icon">➕</div>
          <div class="label">Adicionar aluno</div>
        </div>
        <div class="action-item" id="act-exercises">
          <div class="icon">🏋️</div>
          <div class="label">Biblioteca</div>
        </div>
        <div class="action-item" id="act-feedbacks">
          <div class="icon">💬</div>
          <div class="label">Feedbacks</div>
        </div>
        <div class="action-item" id="act-financeiro">
          <div class="icon">💰</div>
          <div class="label">Financeiro</div>
        </div>
        <div class="action-item" id="act-students">
          <div class="icon">👥</div>
          <div class="label">Ver alunos</div>
        </div>
        <div class="action-item" id="act-pix">
          <div class="icon">🔑</div>
          <div class="label">Chave PIX</div>
        </div>
      </div>
    `;

    $('#btn-copy-code')?.addEventListener('click', () => {
      navigator.clipboard.writeText(state.profile.inviteCode || '');
      toast('Código copiado!', 'success');
    });
    const goTab = (name) => {
      $$('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === name);
      });
      renderPersonalTab(name, students, stats);
    };
    $('#act-add-student').onclick = () => showAddStudentModal();
    $('#act-exercises').onclick = () => goTab('exercicios');
    $('#act-feedbacks').onclick = () => goTab('feedbacks');
    $('#act-students').onclick = () => goTab('alunos');
    $('#act-financeiro')?.addEventListener('click', () => goTab('financeiro'));
    $('#act-pix')?.addEventListener('click', () => showPixKeyModal());
  }

  if (tab === 'alunos') {
    if (students.length === 0) {
      content.innerHTML = `
        <div class="empty">
          <p>Nenhum aluno ainda</p>
          <button class="btn btn-primary" style="margin-top:16px" id="btn-add-first">Adicionar primeiro aluno</button>
        </div>`;
      $('#btn-add-first').onclick = showAddStudentModal;
      return;
    }
    content.innerHTML = `
      <button class="btn btn-primary btn-block" id="btn-add-student" style="margin-bottom:16px">+ Adicionar aluno</button>
      <div id="students-list"></div>
    `;
    $('#btn-add-student').onclick = showAddStudentModal;
    const list = $('#students-list');
    students.forEach(s => {
      const card = el('div', { class: 'student-card', onClick: () => showStudentDetail(s) }, [
        el('div', { class: 'avatar', text: initials(s.name) }),
        el('div', { class: 'student-info' }, [
          el('div', { class: 'student-name', text: s.name }),
          el('div', { class: 'student-meta', text: s.email || '' })
        ]),
        el('div', { html: '›', style: 'color:var(--muted);font-size:1.4rem' })
      ]);
      list.appendChild(card);
    });
  }

  if (tab === 'exercicios') {
    await renderExercisesTab(content);
  }

  if (tab === 'financeiro') {
    await renderFinanceiroTab(content);
    return;
  }

  if (tab === 'feedbacks') {
    await renderFeedbacksTab(content);
  }
}

function showAddStudentModal() {
  const html = `
    <div class="form-group">
      <label class="form-label">Nome completo</label>
      <input type="text" class="form-input" id="new-name" placeholder="Nome do aluno">
    </div>
    <div class="form-group">
      <label class="form-label">E-mail</label>
      <input type="email" class="form-input" id="new-email" placeholder="aluno@email.com">
    </div>
    <div class="form-group">
      <label class="form-label">Senha temporária</label>
      <input type="text" class="form-input" id="new-pass" placeholder="mín. 6 caracteres" value="treino123">
    </div>
    <p class="text-muted" style="font-size:0.8rem;margin-bottom:16px">
      O aluno usará este e-mail e senha para entrar. Você pode enviar o código de convite também.
    </p>
    <button class="btn btn-primary btn-block" id="btn-create-student">Criar aluno</button>
  `;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `<div class="modal"><div class="modal-header"><div class="modal-title">Novo aluno</div><button class="icon-btn" id="close-modal">✕</button></div>${html}</div>`;
  document.body.appendChild(overlay);
  $('#close-modal').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  $('#btn-create-student').onclick = async () => {
    const name = $('#new-name').value.trim();
    const email = $('#new-email').value.trim();
    const pass = $('#new-pass').value;
    if (!name || !email || pass.length < 6) return toast('Preencha todos os campos', 'error');
    try {
      await createStudentAccount(email, pass, name, state.user.uid);
      toast('Aluno criado com sucesso!', 'success');
      overlay.remove();
      showPersonalHome();
    } catch {}
  };
}

// ---------- EXERCÍCIOS ----------
async function renderExercisesTab(content) {
  const exercises = await getExercises(state.user.uid);
  content.innerHTML = `
    <button class="btn btn-primary btn-block" id="btn-new-ex" style="margin-bottom:16px">+ Criar exercício</button>
    <div id="ex-list"></div>
  `;
  $('#btn-new-ex').onclick = () => showExerciseForm();

  const list = $('#ex-list');
  if (exercises.length === 0) {
    list.innerHTML = `<div class="empty"><p>Nenhum exercício cadastrado</p></div>`;
    return;
  }
  exercises.forEach(ex => {
    const card = el('div', { class: 'card' }, [
      el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:8px' }, [
        el('div', { style: 'flex:1' }, [
          el('div', { style: 'font-weight:600', text: ex.name }),
          el('div', { class: 'text-muted', style: 'font-size:0.8rem', text: ex.muscleGroup || '' })
        ]),
        el('div', { style: 'display:flex;gap:6px;flex-shrink:0' }, [
          el('button', { class: 'btn btn-sm btn-outline', text: 'Editar', onClick: () => showExerciseForm(ex) }),
          el('button', {
            class: 'btn btn-sm btn-outline',
            text: 'Excluir',
            style: 'color:var(--danger);border-color:var(--danger)',
            onClick: async () => {
              if (!confirm(`Excluir "${ex.name}"?`)) return;
              try {
                await deleteExercise(ex.id);
                toast('Exercício excluído', 'success');
                renderExercisesTab(content);
              } catch (e) {
                toast(e.message || 'Erro ao excluir', 'error');
              }
            }
          })
        ])
      ])
    ]);
    list.appendChild(card);
  });
}

function showExerciseForm(ex = null) {
  const isEdit = !!ex;
  const html = `
    <div class="form-group">
      <label class="form-label">Nome do exercício</label>
      <input type="text" class="form-input" id="ex-name" value="${ex?.name || ''}">
    </div>
    <div class="form-group">
      <label class="form-label">Grupo muscular</label>
      <select class="form-select" id="ex-group">
        ${['Peito','Costas','Ombros','Bíceps','Tríceps','Pernas','Glúteos','Abdômen','Cardio','Outro']
          .map(g => `<option value="${g}" ${ex?.muscleGroup===g?'selected':''}>${g}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Link do vídeo (Google Drive)</label>
      <input type="url" class="form-input" id="ex-video" value="${ex?.videoUrl || ''}" placeholder="YouTube, Shorts ou Google Drive">
    </div>
    <div class="form-group">
      <label class="form-label">Observações</label>
      <textarea class="form-textarea" id="ex-notes">${ex?.notes || ''}</textarea>
    </div>
    <button class="btn btn-primary btn-block" id="btn-save-ex">${isEdit ? 'Salvar' : 'Criar exercício'}</button>
  `;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `<div class="modal"><div class="modal-header"><div class="modal-title">${isEdit?'Editar':'Novo'} exercício</div><button class="icon-btn" id="close-modal">✕</button></div>${html}</div>`;
  document.body.appendChild(overlay);
  $('#close-modal').onclick = () => overlay.remove();

  $('#btn-save-ex').onclick = async () => {
    const data = {
      personalId: state.user.uid,
      name: $('#ex-name').value.trim(),
      muscleGroup: $('#ex-group').value,
      videoUrl: $('#ex-video').value.trim(),
      notes: $('#ex-notes').value.trim(),
      isCustom: true
    };
    if (!data.name) return toast('Nome obrigatório', 'error');
    try {
      if (isEdit) {
        await updateExercise(ex.id, data);
        toast('Exercício atualizado', 'success');
      } else {
        await createExercise(data);
        toast('Exercício criado', 'success');
      }
      overlay.remove();
      showPersonalHome();
      // força aba exercícios
      setTimeout(() => {
        $$('.tab').forEach(t => t.classList.remove('active'));
        $$('.tab')[2]?.classList.add('active');
        renderPersonalTab('exercicios', [], {});
      }, 100);
    } catch (e) {
      toast('Erro ao salvar', 'error');
    }
  };
}

// ---------- FEEDBACKS ----------
async function renderFeedbacksTab(content) {
  const feedbacks = await getFeedbacksForPersonal(state.user.uid, true);
  if (feedbacks.length === 0) {
    content.innerHTML = `<div class="empty"><p>Nenhum feedback pendente</p></div>`;
    return;
  }
  content.innerHTML = `<div id="fb-list"></div>`;
  const list = $('#fb-list');
  feedbacks.forEach(fb => {
    const card = el('div', { class: 'card' }, [
      el('div', { style: 'font-weight:600;margin-bottom:4px', text: fb.studentName || 'Aluno' }),
      el('div', { class: 'text-muted', style: 'font-size:0.8rem', text: formatDateTime(fb.finishedAt) }),
      el('div', { style: 'margin:10px 0', text: fb.feedback || 'Sem comentário' }),
      el('div', { class: 'btn-group' }, [
        el('button', {
          class: 'btn btn-sm btn-primary',
          text: 'Resolver',
          onClick: async () => {
            await resolveFeedback(fb.id);
            toast('Feedback resolvido', 'success');
            renderFeedbacksTab(content);
          }
        })
      ])
    ]);
    list.appendChild(card);
  });
}

// ---------- DETALHE DO ALUNO (Personal) ----------
async function showStudentDetail(student) {
  state.currentStudent = student;
  const routines = await getRoutinesOfStudent(student.id);
  const plans = await getPlansOfStudent(student.id);
  const completed = await getCompletedByStudent(student.id, 10);

  const app = $('#app');
  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-back">←</button>
      <div class="title" style="flex:1;text-align:center">${student.name}</div>
      <button class="icon-btn" id="btn-home" title="Início">🏠</button>
    </header>
    <div class="tabs">
      <button class="tab active" data-tab="rotinas">Rotinas</button>
      <button class="tab" data-tab="historico">Histórico</button>
      <button class="tab" data-tab="plano">Plano</button>
    </div>
    <div class="page" id="student-content"></div>
  `;

  $('#btn-back').onclick = () => showPersonalHome();
  $('#btn-home')?.addEventListener('click', () => showPersonalHome());

  $$('.tab').forEach(tab => {
    tab.onclick = () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderStudentTab(tab.dataset.tab, student, routines, plans, completed);
    };
  });

  renderStudentTab('rotinas', student, routines, plans, completed);
}

function renderStudentTab(tab, student, routines, plans, completed) {
  const content = $('#student-content');

  if (tab === 'rotinas') {
    content.innerHTML = `
      <button class="btn btn-primary btn-block" id="btn-new-routine" style="margin-bottom:16px">+ Criar rotina</button>
      <div id="routines-list"></div>
    `;
    $('#btn-new-routine').onclick = () => showCreateRoutine(student);

    const list = $('#routines-list');
    if (routines.length === 0) {
      list.innerHTML = `<div class="empty"><p>Nenhuma rotina atribuída</p></div>`;
      return;
    }
    routines.forEach(r => {
      const card = el('div', { class: 'card selectable', onClick: () => showRoutineDetail(r, student) }, [
        el('div', { style: 'font-weight:600', text: r.name }),
        el('div', { class: 'text-muted', style: 'font-size:0.8rem;margin-top:4px' }, [
          document.createTextNode(`${r.type || ''} · ${r.level || ''}`),
          el('br'),
          document.createTextNode(`${formatDate(r.startDate)} → ${formatDate(r.endDate) || 'sem fim'}`)
        ])
      ]);
      list.appendChild(card);
    });
  }

  if (tab === 'historico') {
    if (completed.length === 0) {
      content.innerHTML = `<div class="empty"><p>Nenhum treino realizado ainda</p></div>`;
      return;
    }
    content.innerHTML = '';
    completed.forEach(c => {
      const m = calcWorkoutMetrics(c);
      content.appendChild(el('div', { class: 'card', style: 'cursor:pointer', onClick: () => showCompletedReport(c) }, [
        el('div', { style: 'font-weight:600', text: c.workoutName || 'Treino' }),
        el('div', { class: 'text-muted', style: 'font-size:0.8rem', text: formatDateTime(c.finishedAt) }),
        el('div', { style: 'display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;font-size:0.85rem' }, [
          el('span', { class: 'badge badge-muted', text: `${m.totalSets} séries` }),
          el('span', { class: 'badge badge-muted', text: `${m.tonnage} kg·rep` }),
          el('span', { class: 'badge badge-muted', text: c.intensity || '—' })
        ]),
        el('div', { style: 'font-size:0.8rem;color:var(--accent);margin-top:6px', text: 'Ver relatório completo ›' })
      ]));
    });
  }

  if (tab === 'plano') {
    content.innerHTML = `
      <button class="btn btn-primary btn-block" id="btn-new-plan" style="margin-bottom:16px">+ Nova fatura</button>
      <div id="plans-list"></div>
    `;
    $('#btn-new-plan').onclick = () => showCreatePlan(student);
    const list = $('#plans-list');
    if (plans.length === 0) {
      list.innerHTML = `<div class="empty"><p>Nenhuma fatura cadastrada</p></div>`;
      return;
    }
    plans.forEach(p => {
      const st = p.status || 'pendente';
      const statusLabel = { pendente:'A pagar', ativo:'A pagar', aguardando:'🔔 Aguardando', pago:'Pago', recusado:'Recusado' };
      const card = el('div', {
        class: 'card',
        style: st === 'aguardando' ? 'border:1px solid var(--accent)' : ''
      }, [
        el('div', { style: 'font-size:0.75rem;color:var(--muted);text-transform:uppercase', text: 'Fatura' }),
        el('div', { style: 'display:flex;justify-content:space-between' }, [
          el('div', { style: 'font-weight:600', text: p.name }),
          el('span', { class: `badge ${st==='pago'?'badge-success':''}`, text: statusLabel[st] || st })
        ]),
        el('div', { class: 'text-muted', style: 'font-size:0.85rem;margin-top:6px', text: `R$ ${Number(p.value).toFixed(2)} · Venc: ${formatDate(p.dueDate)}` })
      ]);
      if (p.pixKey || state.profile.pixKey) {
        const key = p.pixKey || state.profile.pixKey;
        card.appendChild(el('button', {
          class: 'btn btn-sm btn-outline',
          style: 'margin-top:8px',
          text: 'Copiar chave PIX',
          onClick: () => { navigator.clipboard.writeText(key); toast('PIX copiado!', 'success'); }
        }));
      }
      if (st === 'aguardando') {
        card.appendChild(el('div', { style: 'display:flex;gap:8px;margin-top:10px' }, [
          el('button', { class: 'btn btn-sm btn-success', text: 'Confirmar pago', onClick: async () => {
            await markPlanPaid(p.id); toast('Confirmado', 'success'); showStudentDetail(student);
          }}),
          el('button', { class: 'btn btn-sm btn-outline', text: 'Recusar', onClick: async () => {
            await rejectPlanClaim(p.id); toast('Recusado', 'success'); showStudentDetail(student);
          }})
        ]));
      } else if (st !== 'pago') {
        card.appendChild(el('button', {
          class: 'btn btn-sm btn-success',
          style: 'margin-top:10px',
          text: 'Marcar como pago',
          onClick: async () => {
            await markPlanPaid(p.id);
            toast('Fatura marcada como paga', 'success');
            showStudentDetail(student);
          }
        }));
      }
      list.appendChild(card);
    });
  }
}

function showCreateRoutine(student) {
  const html = `
    <div class="form-group">
      <label class="form-label">Nome da rotina</label>
      <input type="text" class="form-input" id="r-name" placeholder="Ex: Hipertrofia ABC">
    </div>
    <div class="form-group">
      <label class="form-label">Tipo</label>
      <select class="form-select" id="r-type">
        <option value="hipertrofia">Hipertrofia</option>
        <option value="forca">Força</option>
        <option value="aerobico">Aeróbico</option>
        <option value="misto">Misto</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Nível</label>
      <select class="form-select" id="r-level">
        <option value="iniciante">Iniciante</option>
        <option value="intermediario" selected>Intermediário</option>
        <option value="avancado">Avançado</option>
      </select>
    </div>
    <button class="btn btn-primary btn-block" id="btn-save-r">Criar rotina</button>
  `;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `<div class="modal"><div class="modal-header"><div class="modal-title">Nova rotina</div><button class="icon-btn" id="close-modal">✕</button></div>${html}</div>`;
  document.body.appendChild(overlay);
  $('#close-modal').onclick = () => overlay.remove();

  $('#btn-save-r').onclick = async () => {
    const name = $('#r-name').value.trim();
    if (!name) return toast('Nome obrigatório', 'error');
    await createRoutine({
      personalId: state.user.uid,
      studentId: student.id,
      name,
      type: $('#r-type').value,
      level: $('#r-level').value,
      startDate: firebase.firestore.Timestamp.now(),
      endDate: null,
      showOnlyOnStartDate: false,
      autoArchive: false
    });
    toast('Rotina criada', 'success');
    overlay.remove();
    showStudentDetail(student);
  };
}

function showCreatePlan(student) {
  const html = `
    <div class="form-group">
      <label class="form-label">Nome do plano</label>
      <input type="text" class="form-input" id="p-name" placeholder="Mensalidade Outubro / Fatura">
    </div>
    <div class="form-group">
      <label class="form-label">Valor (R$)</label>
      <input type="number" class="form-input" id="p-value" placeholder="150.00" step="0.01">
    </div>
    <div class="form-group">
      <label class="form-label">Chave PIX (opcional — usa a padrão se vazio)</label>
      <input type="text" class="form-input" id="p-pix" placeholder="Deixe vazio para usar sua chave padrão">
    </div>
    <div class="form-group">
      <label class="form-label">Vencimento</label>
      <input type="date" class="form-input" id="p-due">
    </div>
    <button class="btn btn-primary btn-block" id="btn-save-p">Salvar plano</button>
  `;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `<div class="modal"><div class="modal-header"><div class="modal-title">Nova fatura</div><button class="icon-btn" id="close-modal">✕</button></div>${html}</div>`;
  document.body.appendChild(overlay);
  $('#close-modal').onclick = () => overlay.remove();

  $('#btn-save-p').onclick = async () => {
    const name = $('#p-name').value.trim();
    const value = parseFloat($('#p-value').value);
    if (!name || isNaN(value)) return toast('Preencha nome e valor', 'error');
    const due = $('#p-due').value ? firebase.firestore.Timestamp.fromDate(new Date($('#p-due').value)) : null;
    await createPlan({
      personalId: state.user.uid,
      studentId: student.id,
      name,
      value,
      status: 'pendente',
      pixKey: $('#p-pix').value.trim() || state.profile.pixKey || '',
      dueDate: due
    });
    toast('Plano criado', 'success');
    overlay.remove();
    showStudentDetail(student);
  };
}

// ---------- DETALHE DA ROTINA + TREINOS ----------
async function showRoutineDetail(routine, student) {
  state.currentRoutine = routine;
  const workouts = await getWorkoutsOfRoutine(routine.id);

  const app = $('#app');
  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-back">←</button>
      <div class="title" style="flex:1;text-align:center">${routine.name}</div>
      <div style="width:40px"></div>
    </header>
    <div class="page">
      <button class="btn btn-primary btn-block" id="btn-add-workout" style="margin-bottom:16px">+ Adicionar treino</button>
      <div id="workouts-list"></div>
    </div>
  `;

  $('#btn-back').onclick = () => showStudentDetail(student);
  $('#btn-add-workout').onclick = () => showCreateWorkout(routine, student);

  const list = $('#workouts-list');
  if (workouts.length === 0) {
    list.innerHTML = `<div class="empty"><p>Nenhum treino nesta rotina</p></div>`;
    return;
  }
  workouts.forEach(w => {
    list.appendChild(el('div', { class: 'card selectable', onClick: () => showWorkoutEditor(w, routine, student) }, [
      el('div', { style: 'font-weight:600', text: w.name }),
      el('div', { class: 'text-muted', style: 'font-size:0.8rem', text: `${(w.exercises||[]).length} exercícios` })
    ]));
  });
}

function showCreateWorkout(routine, student) {
  const html = `
    <div class="form-group">
      <label class="form-label">Nome do treino</label>
      <input type="text" class="form-input" id="w-name" placeholder="Ex: Upper 1">
    </div>
    <button class="btn btn-primary btn-block" id="btn-save-w">Criar treino</button>
  `;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `<div class="modal"><div class="modal-header"><div class="modal-title">Novo treino</div><button class="icon-btn" id="close-modal">✕</button></div>${html}</div>`;
  document.body.appendChild(overlay);
  $('#close-modal').onclick = () => overlay.remove();

  $('#btn-save-w').onclick = async () => {
    const name = $('#w-name').value.trim();
    if (!name) return toast('Nome obrigatório', 'error');
    await createWorkout({
      routineId: routine.id,
      personalId: state.user.uid,
      studentId: student.id,
      name,
      order: 0,
      exercises: []
    });
    toast('Treino criado', 'success');
    overlay.remove();
    showRoutineDetail(routine, student);
  };
}

async function showWorkoutEditor(workout, routine, student) {
  state.currentWorkout = workout;
  const allExercises = await getExercises(state.user.uid);

  const app = $('#app');
  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-back">←</button>
      <div class="title" style="flex:1;text-align:center">${workout.name}</div>
      <div style="width:40px"></div>
    </header>
    <div class="page">
      <button class="btn btn-primary btn-block" id="btn-add-ex" style="margin-bottom:16px">+ Adicionar exercício</button>
      <div id="ex-in-workout"></div>
    </div>
  `;

  $('#btn-back').onclick = () => showRoutineDetail(routine, student);
  $('#btn-add-ex').onclick = () => showPickExercise(allExercises, workout, routine, student);

  renderWorkoutExercises(workout, routine, student);
}

function renderWorkoutExercises(workout, routine, student) {
  const list = $('#ex-in-workout');
  list.innerHTML = '';
  const exercises = workout.exercises || [];
  if (exercises.length === 0) {
    list.innerHTML = `<div class="empty"><p>Nenhum exercício neste treino</p></div>`;
    return;
  }
  exercises.forEach((ex, idx) => {
    const setsHtml = (ex.sets || []).map((s, i) => `
      <div class="set-row">
        <div class="set-num">${i + 1}</div>
        <div class="set-info">${s.reps || '—'} reps</div>
        <div class="set-value">${s.weight || '0'} kg</div>
      </div>
    `).join('');

    const card = el('div', { class: 'card' }, [
      el('div', { style: 'font-weight:600;margin-bottom:6px', text: ex.name }),
      ex.videoUrl ? el('div', { class: 'video-wrap' }, [
        el('iframe', { src: videoToEmbed(ex.videoUrl), allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share', allowfullscreen: true, frameborder: '0', referrerpolicy: 'strict-origin-when-cross-origin' })
      ]) : null,
      el('div', { html: setsHtml || '<p class="text-muted" style="font-size:0.85rem">Sem séries definidas</p>' }),
      el('div', { class: 'btn-group', style: 'margin-top:10px' }, [
        el('button', {
          class: 'btn btn-sm btn-outline',
          text: 'Editar séries',
          onClick: () => showEditSets(ex, idx, workout, routine, student)
        }),
        el('button', {
          class: 'btn btn-sm btn-danger',
          text: 'Remover',
          onClick: async () => {
            if (!(await confirmDialog('Remover este exercício?'))) return;
            workout.exercises.splice(idx, 1);
            await updateWorkout(workout.id, { exercises: workout.exercises });
            toast('Removido', 'success');
            showWorkoutEditor(workout, routine, student);
          }
        })
      ])
    ]);
    list.appendChild(card);
  });
}

function showPickExercise(allExercises, workout, routine, student) {
  if (allExercises.length === 0) {
    toast('Cadastre exercícios primeiro na aba Exercícios', 'error');
    return;
  }
  const listHtml = allExercises.map(ex => `
    <div class="student-card" data-id="${ex.id}" style="cursor:pointer">
      <div class="student-info">
        <div class="student-name">${ex.name}</div>
        <div class="student-meta">${ex.muscleGroup || ''}</div>
      </div>
    </div>
  `).join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">Escolher exercício</div>
        <button class="icon-btn" id="close-modal">✕</button>
      </div>
      <div style="max-height:60vh;overflow-y:auto">${listHtml}</div>
    </div>`;
  document.body.appendChild(overlay);
  $('#close-modal').onclick = () => overlay.remove();

  overlay.querySelectorAll('.student-card').forEach(card => {
    card.onclick = async () => {
      const ex = allExercises.find(e => e.id === card.dataset.id);
      if (!workout.exercises) workout.exercises = [];
      workout.exercises.push({
        exerciseId: ex.id,
        name: ex.name,
        videoUrl: ex.videoUrl || '',
        notes: ex.notes || '',
        sets: [{ reps: '10', weight: '0', rest: '60', done: false }]
      });
      await updateWorkout(workout.id, { exercises: workout.exercises });
      toast('Exercício adicionado', 'success');
      overlay.remove();
      showWorkoutEditor(workout, routine, student);
    };
  });
}

function showEditSets(ex, idx, workout, routine, student) {
  const sets = ex.sets || [{ reps: '10', weight: '0', rest: '60' }];
  let html = sets.map((s, i) => `
    <div class="form-group" style="display:flex;gap:8px;align-items:flex-end">
      <div style="flex:1">
        <label class="form-label">Reps</label>
        <input type="text" class="form-input set-reps" data-i="${i}" value="${s.reps||''}">
      </div>
      <div style="flex:1">
        <label class="form-label">Carga</label>
        <input type="text" class="form-input set-weight" data-i="${i}" value="${s.weight||''}">
      </div>
      <div style="flex:1">
        <label class="form-label">Descanso(s)</label>
        <input type="text" class="form-input set-rest" data-i="${i}" value="${s.rest||''}">
      </div>
    </div>
  `).join('');

  html += `
    <button class="btn btn-outline btn-block" id="btn-add-set" style="margin-bottom:12px">+ Série</button>
    <button class="btn btn-primary btn-block" id="btn-save-sets">Salvar séries</button>
  `;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `<div class="modal"><div class="modal-header"><div class="modal-title">Séries – ${ex.name}</div><button class="icon-btn" id="close-modal">✕</button></div>${html}</div>`;
  document.body.appendChild(overlay);
  $('#close-modal').onclick = () => overlay.remove();

  $('#btn-add-set').onclick = () => {
    // simples: recarrega com uma série a mais
    ex.sets = ex.sets || [];
    ex.sets.push({ reps: '10', weight: '0', rest: '60' });
    overlay.remove();
    showEditSets(ex, idx, workout, routine, student);
  };

  $('#btn-save-sets').onclick = async () => {
    const newSets = [];
    $$('.set-reps').forEach((input, i) => {
      newSets.push({
        reps: input.value,
        weight: $$('.set-weight')[i].value,
        rest: $$('.set-rest')[i].value,
        done: false
      });
    });
    workout.exercises[idx].sets = newSets;
    await updateWorkout(workout.id, { exercises: workout.exercises });
    toast('Séries salvas', 'success');
    overlay.remove();
    showWorkoutEditor(workout, routine, student);
  };
}

// ---------- ÁREA DO ALUNO ----------
async function showStudentHome() {
  let routines = [];
  let completed = [];
  let plans = [];
  try {
    routines = await getRoutinesOfStudent(state.user.uid);
    completed = await getCompletedByStudent(state.user.uid, 5);
    plans = await getPlansOfStudent(state.user.uid);
    if (state.profile.personalId) {
      const personal = await getUser(state.profile.personalId);
      if (personal?.pixKey) state.profile.personalPixKey = personal.pixKey;
    }
  } catch (e) {
    console.error(e);
    toast('Erro ao carregar treinos.', 'error');
  }

  // Alerta de vencimento (5 dias antes)
  const now = Date.now();
  const dueSoon = plans.filter(p => {
    if (!p.dueDate || p.status === 'pago') return false;
    const due = p.dueDate.toMillis ? p.dueDate.toMillis() : new Date(p.dueDate).getTime();
    const days = (due - now) / (1000 * 60 * 60 * 24);
    return days <= 5;
  });

  const app = $('#app');
  app.innerHTML = `
    <header class="app-header">
      <div class="title">Meus Treinos</div>
      <div class="actions">
        <button class="icon-btn" id="btn-logout" title="Sair">⎋</button>
      </div>
    </header>
    <div class="page" style="padding-bottom:80px" id="student-main"></div>
    <nav class="bottom-nav">
      <button class="nav-item active" data-nav="inicio">
        <span>🏠</span><span>Início</span>
      </button>
      <button class="nav-item" data-nav="treinos">
        <span>🏋️</span><span>Treinos</span>
      </button>
      <button class="nav-item" data-nav="financeiro">
        <span>💰</span><span>Financeiro</span>
      </button>
      <button class="nav-item" data-nav="historico">
        <span>📊</span><span>Histórico</span>
      </button>
    </nav>
  `;

  $('#btn-logout').onclick = () => logout();

  const renderNav = (nav) => {
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.nav === nav));
    const main = $('#student-main');
    if (nav === 'inicio') {
      const openPlans = plans.filter(p => ['pendente','ativo','aguardando'].includes(p.status || 'pendente'));
      main.innerHTML = `
        <div class="card note note-accent">
          Olá, <strong>${state.profile.name}</strong>! 💪
        </div>
        ${dueSoon.length ? `<div class="card note" style="border-color:#f59e0b;margin-bottom:12px">
          ⚠️ ${dueSoon.length} fatura(s) vencendo em até 5 dias — veja em Financeiro.
        </div>` : ''}
        <div class="stat-row">
          <div class="stat-card"><div class="stat-value">${routines.length}</div><div class="stat-label">Rotinas</div></div>
          <div class="stat-card"><div class="stat-value">${completed.length}</div><div class="stat-label">Últimos treinos</div></div>
          <div class="stat-card"><div class="stat-value">${openPlans.length}</div><div class="stat-label">Faturas abertas</div></div>
        </div>
        <div class="page-title">Acesso rápido</div>
        <div class="action-grid">
          <div class="action-item" id="go-treinos"><div class="icon">🏋️</div><div class="label">Treinos</div></div>
          <div class="action-item" id="go-fin"><div class="icon">💰</div><div class="label">Financeiro</div></div>
          <div class="action-item" id="go-hist"><div class="icon">📊</div><div class="label">Histórico</div></div>
        </div>
        <div class="page-title" style="margin-top:8px">Últimos treinos</div>
        <div id="home-recent"></div>
      `;
      $('#go-treinos').onclick = () => renderNav('treinos');
      $('#go-fin').onclick = () => renderNav('financeiro');
      $('#go-hist').onclick = () => renderNav('historico');
      const hr = $('#home-recent');
      if (!completed.length) hr.innerHTML = `<p class="text-muted" style="font-size:0.85rem">Nenhum treino ainda</p>`;
      else completed.slice(0,3).forEach(c => {
        hr.appendChild(el('div', { class: 'card', style: 'cursor:pointer', onClick: () => showStudentCompletedDetail(c) }, [
          el('div', { style: 'font-weight:600', text: c.workoutName || 'Treino' }),
          el('div', { class: 'text-muted', style: 'font-size:0.8rem', text: formatDateTime(c.finishedAt) })
        ]));
      });
    } else if (nav === 'treinos') {
      main.innerHTML = `
        <div class="page-title">Rotinas e treinos</div>
        <div id="student-routines"></div>
      `;
      fillStudentRoutines(routines);
    } else if (nav === 'financeiro') {
      renderStudentFinance(main, plans);
    } else if (nav === 'historico') {
      renderStudentHistory(main, completed);
    }
  };

  $$('.nav-item').forEach(n => {
    n.onclick = () => renderNav(n.dataset.nav);
  });
  renderNav('inicio');
}

async function fillStudentRoutines(routines) {
  const rList = $('#student-routines');
  if (!rList) return;
  if (routines.length === 0) {
    rList.innerHTML = `<div class="empty"><p>Nenhuma rotina atribuída ainda</p></div>`;
    return;
  }
  rList.innerHTML = '';
  for (const r of routines) {
    const workouts = await getWorkoutsOfRoutine(r.id);
    const card = el('div', { class: 'card' }, [
      el('div', { style: 'font-weight:700;color:var(--accent);margin-bottom:8px', text: r.name }),
      ...workouts.map(w => el('div', {
        class: 'student-card',
        style: 'margin-bottom:8px',
        onClick: () => showStudentWorkout(w, r)
      }, [
        el('div', { class: 'student-info' }, [
          el('div', { class: 'student-name', text: w.name }),
          el('div', { class: 'student-meta', text: `${(w.exercises||[]).length} exercícios` })
        ]),
        el('div', { html: '›', style: 'color:var(--accent)' })
      ]))
    ]);
    rList.appendChild(card);
  }
}

function renderStudentHistory(main, completed) {
  main.innerHTML = `<div class="page-title">Histórico de treinos</div><div id="student-history"></div>`;
  const hList = $('#student-history');
  if (!completed.length) {
    hList.innerHTML = `<p class="text-muted">Nenhum treino concluído ainda</p>`;
    return;
  }
  completed.forEach(c => {
    const diffLabel = { facil: 'Fácil', moderado: 'Moderado', intenso: 'Intenso', leve: 'Leve', moderada: 'Moderada', intensa: 'Intensa' };
    hList.appendChild(el('div', { class: 'card' }, [
      el('div', { style: 'font-weight:600', text: c.workoutName || 'Treino' }),
      el('div', { class: 'text-muted', style: 'font-size:0.8rem', text: formatDateTime(c.finishedAt) }),
      c.intensity ? el('div', { style: 'font-size:0.85rem;margin-top:4px', text: `Intensidade: ${diffLabel[c.intensity] || c.intensity}` }) : null,
      c.exercisesPerformed?.length ? el('div', { class: 'text-muted', style: 'font-size:0.8rem;margin-top:4px', text: `${c.exercisesPerformed.length} exercícios registrados` }) : null
    ]));
  });
}

function renderStudentFinance(main, plans) {
  const pix = state.profile.personalPixKey || '';
  main.innerHTML = `
    <div class="page-title">Financeiro</div>
    ${pix ? `<div class="card"><div class="card-title">Chave PIX do personal</div>
      <div style="word-break:break-all;font-weight:600;color:var(--accent)">${pix}</div>
      <button class="btn btn-sm btn-outline" id="btn-copy-pix" style="margin-top:8px">Copiar chave PIX</button>
    </div>` : `<div class="card note">Seu personal ainda não cadastrou a chave PIX.</div>`}
    <div class="page-title" style="margin-top:16px">Suas faturas</div>
    <div id="student-plans"></div>
  `;
  $('#btn-copy-pix')?.addEventListener('click', () => {
    navigator.clipboard.writeText(pix);
    toast('PIX copiado!', 'success');
  });
  const list = $('#student-plans');
  if (!plans.length) {
    list.innerHTML = `<div class="empty"><p>Nenhuma fatura</p></div>`;
    return;
  }
  const statusLabel = {
    pendente: 'A pagar',
    ativo: 'A pagar',
    aguardando: 'Aguardando confirmação',
    pago: 'Pago',
    recusado: 'Recusado'
  };
  plans.forEach(pl => {
    const due = pl.dueDate ? formatDate(pl.dueDate) : '—';
    const st = pl.status || 'pendente';
    const pixKey = pl.pixKey || pix;
    const card = el('div', { class: 'card' }, [
      el('div', { style: 'font-size:0.75rem;color:var(--muted);text-transform:uppercase', text: 'Fatura' }),
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, [
        el('div', { style: 'font-weight:700', text: pl.name }),
        el('span', { class: `badge ${st==='pago'?'badge-success':''}`, text: statusLabel[st] || st })
      ]),
      el('div', { class: 'text-muted', style: 'font-size:0.9rem;margin-top:6px', text: `R$ ${Number(pl.value||0).toFixed(2)} · Vence: ${due}` })
    ]);
    if (pixKey) {
      card.appendChild(el('button', {
        class: 'btn btn-sm btn-outline',
        style: 'margin-top:10px',
        text: 'Copiar chave PIX',
        onClick: () => {
          navigator.clipboard.writeText(pixKey);
          toast('PIX copiado!', 'success');
        }
      }));
    }
    if (st === 'pendente' || st === 'ativo' || st === 'recusado') {
      card.appendChild(el('button', {
        class: 'btn btn-primary btn-block',
        style: 'margin-top:12px',
        text: 'Já paguei',
        onClick: async () => {
          await studentClaimPaid(pl.id);
          toast('Sinalizado! Aguarde o personal confirmar.', 'success');
          showStudentHome();
        }
      }));
    }
    list.appendChild(card);
  });
}

/** Calcula métricas de um treino concluído */
function calcWorkoutMetrics(completed) {
  const performed = completed.exercisesPerformed || [];
  let totalSets = 0;
  let tonnage = 0; // soma reps * carga
  const byEx = performed.map(ex => {
    const sets = ex.sets || [];
    let exTon = 0;
    let exSets = sets.length;
    sets.forEach(s => {
      const r = Number(s.reps) || 0;
      const w = Number(s.weight) || 0;
      exTon += r * w;
    });
    totalSets += exSets;
    tonnage += exTon;
    return { name: ex.name, sets: exSets, tonnage: exTon, difficulty: ex.difficulty, setDetails: sets };
  });
  return { totalSets, tonnage, byEx, exerciseCount: performed.length };
}

/** Média móvel simples dos últimos N treinos (tonelagem) */
function movingAverage(values, window = 3) {
  if (!values.length) return [];
  const out = [];
  for (let i = 0; i < values.length; i++) {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    out.push(Math.round(slice.reduce((a, b) => a + b, 0) / slice.length));
  }
  return out;
}

function renderStudentHistory(main, completed) {
  // completed is newest first
  const metricsList = completed.map(c => ({ c, m: calcWorkoutMetrics(c) }));
  // chronological for MA (oldest first)
  const chrono = [...metricsList].reverse();
  const tons = chrono.map(x => x.m.tonnage);
  const ma = movingAverage(tons, 3);
  const maById = {};
  chrono.forEach((x, i) => { maById[x.c.id] = ma[i]; });

  main.innerHTML = `
    <div class="page-title">Histórico completo</div>
    ${completed.length >= 2 ? `<div class="card note" style="font-size:0.85rem">
      Média móvel de tonelagem (últimos 3 treinos) ajuda a ver progressão de carga × reps.
    </div>` : ''}
    <div id="student-history"></div>
  `;
  const hList = $('#student-history');
  if (!completed.length) {
    hList.innerHTML = `<p class="text-muted">Nenhum treino concluído ainda</p>`;
    return;
  }
  const diffLabel = { facil: 'Fácil', moderado: 'Moderado', intenso: 'Intenso', leve: 'Leve', moderada: 'Moderada', intensa: 'Intensa' };
  metricsList.forEach(({ c, m }) => {
    hList.appendChild(el('div', {
      class: 'card',
      style: 'cursor:pointer',
      onClick: () => showStudentCompletedDetail(c, maById[c.id])
    }, [
      el('div', { style: 'font-weight:600', text: c.workoutName || 'Treino' }),
      el('div', { class: 'text-muted', style: 'font-size:0.8rem', text: formatDateTime(c.finishedAt) }),
      el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;font-size:0.85rem' }, [
        el('span', { class: 'badge badge-muted', text: `${m.totalSets} séries` }),
        el('span', { class: 'badge badge-muted', text: `${m.tonnage} kg·rep` }),
        maById[c.id] != null ? el('span', { class: 'badge', style: 'background:var(--accent);color:#000', text: `MM3: ${maById[c.id]}` }) : null,
        c.intensity ? el('span', { class: 'badge badge-muted', text: diffLabel[c.intensity] || c.intensity }) : null
      ]),
      el('div', { style: 'font-size:0.8rem;color:var(--accent);margin-top:6px', text: 'Ver detalhe completo ›' })
    ]));
  });
}

function showStudentCompletedDetail(completed, maValue) {
  const m = calcWorkoutMetrics(completed);
  const diffLabel = { facil: 'Fácil', moderado: 'Moderado', intenso: 'Intenso', leve: 'Leve', moderada: 'Moderada', intensa: 'Intensa' };
  const app = $('#app');
  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-home">🏠</button>
      <div class="title" style="flex:1;text-align:center">Detalhe do treino</div>
      <button class="icon-btn" id="btn-back">←</button>
    </header>
    <div class="page">
      <div class="card">
        <div style="font-weight:700;font-size:1.1rem">${completed.workoutName || 'Treino'}</div>
        <div class="text-muted" style="font-size:0.85rem">${formatDateTime(completed.finishedAt)}</div>
        <div class="stat-row" style="margin-top:12px">
          <div class="stat-card"><div class="stat-value">${m.totalSets}</div><div class="stat-label">Séries</div></div>
          <div class="stat-card"><div class="stat-value">${m.exerciseCount}</div><div class="stat-label">Exercícios</div></div>
          <div class="stat-card"><div class="stat-value">${m.tonnage}</div><div class="stat-label">Tonelagem</div></div>
        </div>
        ${maValue != null ? `<div style="margin-top:8px;font-size:0.9rem">Média móvel (3 treinos): <strong>${maValue}</strong> kg·rep</div>` : ''}
        <div style="margin-top:8px">Intensidade: <strong>${diffLabel[completed.intensity] || completed.intensity || '—'}</strong></div>
        ${completed.feedback ? `<div style="margin-top:8px">${completed.feedback}</div>` : ''}
      </div>
      <div class="page-title">Por exercício</div>
      <div id="detail-exs"></div>
    </div>
  `;
  $('#btn-home').onclick = () => showStudentHome();
  $('#btn-back').onclick = () => showStudentHome();
  const list = $('#detail-exs');
  if (!m.byEx.length) {
    list.innerHTML = `<p class="text-muted">Sem detalhamento de séries (treino antigo).</p>`;
    return;
  }
  m.byEx.forEach(ex => {
    const setsHtml = (ex.setDetails || []).map((s, i) =>
      `<div class="set-row"><div class="set-num">${i+1}</div><div class="set-info">${s.reps} reps</div><div class="set-value">${s.weight || 0} kg</div></div>`
    ).join('');
    list.appendChild(el('div', { class: 'card' }, [
      el('div', { style: 'display:flex;justify-content:space-between;gap:8px' }, [
        el('div', { style: 'font-weight:600', text: ex.name }),
        el('span', { class: 'badge', text: diffLabel[ex.difficulty] || ex.difficulty || '—' })
      ]),
      el('div', { class: 'text-muted', style: 'font-size:0.8rem;margin:6px 0', text: `${ex.sets} séries · tonelagem ${ex.tonnage} kg·rep` }),
      el('div', { html: setsHtml })
    ]));
  });
}

async function showStudentWorkout(workout, routine) {
  const app = $('#app');
  const exercises = workout.exercises || [];

  // estado editável por exercício
  const performed = exercises.map(ex => ({
    name: ex.name,
    exerciseId: ex.exerciseId || null,
    videoUrl: ex.videoUrl || '',
    difficulty: 'moderado',
    sets: (ex.sets || []).map(s => ({
      reps: s.reps || 0,
      weight: s.weight || 0,
      rest: s.rest || 60
    }))
  }));

  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-home" title="Início">🏠</button>
      <div class="title" style="flex:1;text-align:center">${workout.name}</div>
      <button class="icon-btn" id="btn-back">←</button>
    </header>
    <div class="page" style="padding-bottom:100px">
      <div class="card note" style="font-size:0.85rem">
        Ajuste a <strong>carga</strong> e as <strong>reps</strong> que você realmente usou e marque a dificuldade de cada exercício.
      </div>
      <div id="workout-exs"></div>
      <div class="card" style="margin-top:20px">
        <div class="form-group">
          <label class="form-label">Como foi o treino no geral?</label>
          <select class="form-select" id="intensity">
            <option value="leve">Leve</option>
            <option value="moderada" selected>Moderada</option>
            <option value="intensa">Intensa</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Feedback geral (opcional)</label>
          <textarea class="form-textarea" id="feedback" placeholder="Como se sentiu, dores, dúvidas..."></textarea>
        </div>
        <button class="btn btn-success btn-block" id="btn-finish">Concluir treino</button>
      </div>
    </div>
  `;

  $('#btn-home').onclick = () => showStudentHome();
  $('#btn-back').onclick = () => showStudentHome();

  const list = $('#workout-exs');
  performed.forEach((ex, idx) => {
    const card = el('div', { class: 'card', id: `ex-card-${idx}` });
    card.innerHTML = `
      <div style="font-weight:600;margin-bottom:8px">${ex.name}</div>
      ${ex.videoUrl ? `<div class="video-wrap"><iframe src="${videoToEmbed(ex.videoUrl)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen frameborder="0"></iframe></div>` : '<p class="text-muted" style="font-size:0.85rem">Sem vídeo</p>'}
      <div class="form-group" style="margin-top:12px">
        <label class="form-label">Dificuldade deste exercício</label>
        <div class="diff-row" data-ex="${idx}">
          <button type="button" class="btn btn-sm btn-outline diff-btn" data-d="facil">Fácil</button>
          <button type="button" class="btn btn-sm btn-primary diff-btn" data-d="moderado">Moderado</button>
          <button type="button" class="btn btn-sm btn-outline diff-btn" data-d="intenso">Intenso</button>
        </div>
      </div>
      <div class="sets-edit" data-ex="${idx}"></div>
    `;
    list.appendChild(card);

    const setsEl = card.querySelector('.sets-edit');
    ex.sets.forEach((s, si) => {
      const row = document.createElement('div');
      row.className = 'set-row';
      row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px';
      row.innerHTML = `
        <div class="set-num">${si + 1}</div>
        <input type="number" class="form-input" style="flex:1" data-field="reps" data-ex="${idx}" data-set="${si}" value="${s.reps}" placeholder="Reps" min="0">
        <input type="number" class="form-input" style="flex:1" data-field="weight" data-ex="${idx}" data-set="${si}" value="${s.weight}" placeholder="Kg" min="0" step="0.5">
      `;
      setsEl.appendChild(row);
    });

    card.querySelectorAll('.diff-btn').forEach(btn => {
      btn.onclick = () => {
        performed[idx].difficulty = btn.dataset.d;
        card.querySelectorAll('.diff-btn').forEach(b => {
          b.classList.toggle('btn-primary', b.dataset.d === btn.dataset.d);
          b.classList.toggle('btn-outline', b.dataset.d !== btn.dataset.d);
        });
      };
    });

    card.querySelectorAll('input[data-field]').forEach(inp => {
      inp.onchange = inp.oninput = () => {
        const ei = +inp.dataset.ex;
        const si = +inp.dataset.set;
        const field = inp.dataset.field;
        performed[ei].sets[si][field] = parseFloat(inp.value) || 0;
      };
    });
  });

  $('#btn-finish').onclick = async () => {
    try {
      const intensity = $('#intensity').value;
      const feedback = $('#feedback').value.trim();
      await saveCompletedWorkout({
        workoutId: workout.id,
        workoutName: workout.name,
        routineId: routine?.id || null,
        studentId: state.user.uid,
        studentName: state.profile.name,
        personalId: state.profile.personalId,
        intensity,
        feedback,
        exercisesPerformed: performed,
        startedAt: firebase.firestore.Timestamp.now(),
        durationSeconds: 0,
        resolved: false
      });
      toast('Treino concluído! Bom trabalho 💪', 'success');
      showStudentHome();
    } catch (e) {
      console.error(e);
      toast(e.message || 'Erro ao salvar treino', 'error');
    }
  };
}

// ---------- FINANCEIRO (PERSONAL) ----------
async function renderFinanceiroTab(content) {
  let plans = [];
  let students = [];
  try {
    plans = await getPlansOfPersonal(state.user.uid);
    students = await getStudentsOfPersonal(state.user.uid);
  } catch (e) {
    console.error(e);
    toast('Erro ao carregar financeiro', 'error');
  }

  const nameById = {};
  students.forEach(s => { nameById[s.id] = s.name; });

  const pending = plans.filter(p => p.status === 'aguardando');
  const filterSel = content.dataset.finFilter || 'todos';

  const filtered = plans.filter(p => {
    if (filterSel === 'todos') return true;
    if (filterSel === 'aguardando') return p.status === 'aguardando';
    if (filterSel === 'abertos') return p.status === 'pendente' || p.status === 'ativo';
    if (filterSel === 'pagos') return p.status === 'pago';
    return true;
  });

  content.innerHTML = `
    <div class="card">
      <div class="card-title">Chave PIX padrão</div>
      <div style="word-break:break-all">${state.profile.pixKey || '<span class="text-muted">Não cadastrada</span>'}</div>
      <button class="btn btn-sm btn-outline" id="btn-edit-pix" style="margin-top:8px">Editar PIX</button>
    </div>
    ${pending.length ? `<div class="card note note-accent" style="display:flex;align-items:center;gap:10px">
      <span style="font-size:1.4rem">🔔</span>
      <div><strong>${pending.length}</strong> aluno(s) sinalizaram pagamento — confirme abaixo</div>
    </div>` : ''}
    <div class="tabs" style="margin:12px 0" id="fin-filters">
      <button class="tab ${filterSel==='todos'?'active':''}" data-f="todos">Todos (${plans.length})</button>
      <button class="tab ${filterSel==='aguardando'?'active':''}" data-f="aguardando">Aguardando (${pending.length})</button>
      <button class="tab ${filterSel==='abertos'?'active':''}" data-f="abertos">Em aberto</button>
      <button class="tab ${filterSel==='pagos'?'active':''}" data-f="pagos">Pagos</button>
    </div>
    <div id="fin-list"></div>
  `;

  $('#btn-edit-pix').onclick = () => showPixKeyModal();
  $$('#fin-filters .tab').forEach(t => {
    t.onclick = () => {
      content.dataset.finFilter = t.dataset.f;
      renderFinanceiroTab(content);
    };
  });

  const list = $('#fin-list');
  if (!filtered.length) {
    list.innerHTML = `<div class="empty"><p>Nenhuma fatura neste filtro</p></div>`;
    return;
  }

  const statusLabel = {
    pendente: 'A pagar',
    ativo: 'A pagar',
    aguardando: '🔔 Aguardando confirmação',
    pago: 'Pago',
    recusado: 'Recusado'
  };

  filtered.forEach(pl => {
    const due = pl.dueDate ? formatDate(pl.dueDate) : '—';
    const st = pl.status || 'pendente';
    const isWait = st === 'aguardando';
    const card = el('div', {
      class: 'card',
      style: isWait ? 'border:1px solid var(--accent);box-shadow:0 0 0 1px var(--accent)' : ''
    }, [
      el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:8px' }, [
        el('div', {}, [
          el('div', { style: 'font-size:0.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px', text: 'Fatura' }),
          el('div', { style: 'font-weight:700', text: pl.name }),
          el('div', { class: 'text-muted', style: 'font-size:0.85rem', text: nameById[pl.studentId] || 'Aluno' })
        ]),
        el('span', {
          class: `badge ${st==='pago'?'badge-success':isWait?'':'badge-muted'}`,
          style: isWait ? 'background:var(--accent);color:#000' : '',
          text: statusLabel[st] || st
        })
      ]),
      el('div', { style: 'margin-top:8px;font-weight:600', text: `R$ ${Number(pl.value || 0).toFixed(2)}` }),
      el('div', { class: 'text-muted', style: 'font-size:0.85rem', text: `Vencimento: ${due}` })
    ]);

    if (isWait) {
      card.appendChild(el('div', { style: 'display:flex;gap:8px;margin-top:12px' }, [
        el('button', {
          class: 'btn btn-success btn-sm',
          text: 'Confirmar pago',
          onClick: async () => {
            await markPlanPaid(pl.id);
            toast('Pagamento confirmado', 'success');
            renderFinanceiroTab(content);
          }
        }),
        el('button', {
          class: 'btn btn-outline btn-sm',
          text: 'Recusar',
          onClick: async () => {
            await rejectPlanClaim(pl.id);
            toast('Sinalização recusada', 'success');
            renderFinanceiroTab(content);
          }
        })
      ]));
    } else if (st === 'pendente' || st === 'ativo') {
      card.appendChild(el('button', {
        class: 'btn btn-sm btn-outline',
        style: 'margin-top:10px',
        text: 'Marcar como pago',
        onClick: async () => {
          await markPlanPaid(pl.id);
          toast('Marcado como pago', 'success');
          renderFinanceiroTab(content);
        }
      }));
    }
    list.appendChild(card);
  });
}

function showPixKeyModal() {
  const html = `
    <div class="form-group">
      <label class="form-label">Sua chave PIX (visível aos alunos)</label>
      <input type="text" class="form-input" id="pix-input" value="${state.profile.pixKey || ''}" placeholder="CPF, e-mail, telefone ou chave aleatória">
    </div>
    <button class="btn btn-primary btn-block" id="btn-save-pix">Salvar</button>
  `;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `<div class="modal"><div class="modal-header"><div class="modal-title">Chave PIX</div><button class="icon-btn" id="close-modal">✕</button></div>${html}</div>`;
  document.body.appendChild(overlay);
  $('#close-modal').onclick = () => overlay.remove();
  $('#btn-save-pix').onclick = async () => {
    const pixKey = $('#pix-input').value.trim();
    await updateUser(state.user.uid, { pixKey });
    state.profile.pixKey = pixKey;
    toast('Chave PIX salva', 'success');
    overlay.remove();
    showPersonalHome();
  };
}

// Relatório de treino do aluno (personal)
async function showCompletedReport(completed) {
  const m = calcWorkoutMetrics(completed);
  const diffLabel = { facil: 'Fácil', moderado: 'Moderado', intenso: 'Intenso', leve: 'Leve', moderada: 'Moderada', intensa: 'Intensa' };
  const app = $('#app');
  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-home">🏠</button>
      <div class="title" style="flex:1;text-align:center">Relatório</div>
      <button class="icon-btn" id="btn-back">←</button>
    </header>
    <div class="page">
      <div class="card">
        <div style="font-weight:700;font-size:1.1rem">${completed.workoutName || 'Treino'}</div>
        <div class="text-muted" style="font-size:0.85rem">${completed.studentName || ''} · ${formatDateTime(completed.finishedAt)}</div>
        <div class="stat-row" style="margin-top:12px">
          <div class="stat-card"><div class="stat-value">${m.totalSets}</div><div class="stat-label">Séries</div></div>
          <div class="stat-card"><div class="stat-value">${m.exerciseCount}</div><div class="stat-label">Exercícios</div></div>
          <div class="stat-card"><div class="stat-value">${m.tonnage}</div><div class="stat-label">Tonelagem</div></div>
        </div>
        <div style="margin-top:8px">Intensidade geral: <strong>${diffLabel[completed.intensity] || completed.intensity || '—'}</strong></div>
        ${completed.feedback ? `<div style="margin-top:8px">${completed.feedback}</div>` : ''}
      </div>
      <div class="page-title">Exercícios realizados</div>
      <div id="report-exs"></div>
    </div>
  `;
  $('#btn-home').onclick = () => showPersonalHome();
  $('#btn-back').onclick = () => showPersonalHome();

  const list = $('#report-exs');
  if (!m.byEx.length) {
    list.innerHTML = `<p class="text-muted">Sem detalhamento de séries neste treino (versão antiga).</p>`;
    return;
  }
  m.byEx.forEach(ex => {
    const setsHtml = (ex.setDetails || []).map((s, i) =>
      `<div class="set-row"><div class="set-num">${i+1}</div><div class="set-info">${s.reps} reps</div><div class="set-value">${s.weight || 0} kg</div></div>`
    ).join('');
    list.appendChild(el('div', { class: 'card' }, [
      el('div', { style: 'display:flex;justify-content:space-between' }, [
        el('div', { style: 'font-weight:600', text: ex.name }),
        el('span', { class: 'badge', text: diffLabel[ex.difficulty] || ex.difficulty || '—' })
      ]),
      el('div', { class: 'text-muted', style: 'font-size:0.8rem;margin:6px 0', text: `${ex.sets} séries · ${ex.tonnage} kg·rep` }),
      el('div', { html: setsHtml })
    ]));
  });
}

// ---------- START ----------
boot().catch(console.error);
