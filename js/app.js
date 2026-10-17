// =====================================================
// APP PRINCIPAL - Edmilson Treinador
// =====================================================

import { firebaseConfig, initAppCheckIfConfigured } from './firebase-config.js';
import { initAuth, onAuthChange, loginWithGoogle, loginWithEmail, registerWithEmail, logout, createStudentAccount, completeGoogleRedirectIfAny } from './shared/auth.js';
import { initDb, getUser, createUser, updateUser, findPersonalByInviteCode, getStudentsOfPersonal, getPersonalStats, getExercises, getGlobalExercises, createExercise, updateExercise, deleteExercise, getRoutinesOfStudent, createRoutine, updateRoutine, archiveRoutine, getWorkoutsOfRoutine, createWorkout, updateWorkout, deleteWorkout, cloneRoutine, getWorkoutTemplates, createWorkoutTemplate, updateWorkoutTemplate, deleteWorkoutTemplate, copyWorkoutToStudent, cleanupExpiredCoachReplies, saveCompletedWorkout, getCompletedByStudent, getFeedbacksForPersonal, resolveFeedback, markCoachReplyRead, createPlan, getPlansOfStudent, getPlansOfPersonal, markPlanPaid, studentClaimPaid, rejectPlanClaim, updatePlan, sendChatMessage, getChatMessages, upsertReminder, getRemindersForStudent, getRemindersForPersonal } from './shared/db.js';
import { $, $$, el, toast, formatDate, formatDateTime, initials, videoToEmbed, driveToEmbed, mediaHtml, isGifUrl, confirmDialog, promptDialog, generateInviteCode, compressImageToBase64 } from './shared/utils.js';

// Captura erros de rate-limit e mostra toast amigável
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('Muitas requisições')) {
    toast(e.reason.message, 'error');
    e.preventDefault();
  }
});

// Estado global
// Tema claro/escuro
try {
  if (localStorage.getItem('theme') === 'light') document.documentElement.dataset.theme = 'light';
} catch {}

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
  try { initAppCheckIfConfigured(); } catch (e) { console.warn('[security] App Check', e); }
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

/** Enter no input aciona o botão associado */
/** Normaliza telefone BR para wa.me */
function normalizePhone(phone) {
  if (!phone) return '';
  let d = String(phone).replace(/\D/g, '');
  if (d.length >= 10 && d.length <= 11) d = '55' + d;
  return d;
}

function waLink(phone, message = '') {
  const d = normalizePhone(phone);
  if (!d) return null;
  const q = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${d}${q}`;
}

function openWhatsApp(phone, message) {
  const url = waLink(phone, message);
  if (!url) {
    toast('Telefone não cadastrado', 'error');
    return false;
  }
  window.open(url, '_blank');
  return true;
}

async function saveProfilePhoto(file) {
  try {
    toast('Processando foto...', 'success');
    const dataUrl = await compressImageToBase64(file, 256, 0.72);
    await updateUser(state.user.uid, { photoURL: dataUrl });
    state.profile.photoURL = dataUrl;
    toast('Foto atualizada!', 'success');
    return dataUrl;
  } catch (e) {
    console.error(e);
    toast(e.message || 'Erro ao salvar foto', 'error');
    return null;
  }
}

function photoEl(url, name, sizeClass = '') {
  if (url) {
    return `<img class="profile-photo ${sizeClass}" src="${url}" alt="${name || ''}">`;
  }
  return `<div class="profile-photo ${sizeClass}" style="display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--accent)">${initials(name || '?')}</div>`;
}

/** Dono do app — único que edita a lista padrão */
function isWorkoutActive(w) {
  const now = Date.now();
  const start = w.startDate?.toMillis?.() || 0;
  const end = w.endDate?.toMillis?.() || null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function isAppAdmin() {
  const email = (state.profile?.email || state.user?.email || '').toLowerCase();
  return state.profile?.isAdmin === true || email === 'edmilsonwp@gmail.com';
}

function bindEnter(inputSel, btnSelOrFn) {
  const inp = typeof inputSel === 'string' ? $(inputSel) : inputSel;
  if (!inp) return;
  inp.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (typeof btnSelOrFn === 'function') btnSelOrFn();
    else $(btnSelOrFn)?.click();
  });
}

// ---------- AUTH SCREEN ----------
function showAuth() {
  const app = $('#app');
  app.innerHTML = `
    <div class="auth-screen">
      <div class="auth-logo">
        <img src="assets/logo.png" alt="Edmilson Treinador" style="width:120px;height:120px;object-fit:contain;border-radius:24px;margin-bottom:12px">
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
    const btn = $('#btn-google');
    if (btn) { btn.disabled = true; btn.textContent = 'Abrindo Google...'; }
    try {
      await loginWithGoogle();
      // onAuthChange cuida da navegação
    } catch (e) {
      console.error('Google login', e);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Entrar com Google`;
      }
    }
  };

  const doEmailLogin = async () => {
    const email = $('#auth-email').value.trim();
    const pass = $('#auth-pass').value;
    if (!email || !pass) return toast('Preencha e-mail e senha', 'error');
    const btn = $('#btn-email-login');
    if (btn) { btn.disabled = true; btn.textContent = 'Entrando...'; }
    try {
      await loginWithEmail(email, pass);
    } catch (e) {
      console.error('Email login', e);
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar com e-mail'; }
    }
  };
  $('#btn-email-login').onclick = doEmailLogin;
  ['auth-email', 'auth-pass'].forEach(id => {
    $('#' + id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); doEmailLogin(); }
    });
  });
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
  bindEnter('#invite-code', '#btn-join');
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
      <button class="tab" data-tab="feedbacks" id="tab-feedbacks">Feedbacks</button>
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
  getFeedbacksForPersonal(state.user.uid, true).then(fbs => {
    const tab = $('#tab-feedbacks');
    if (tab && fbs.length > 0) {
      tab.innerHTML = `Feedbacks <span class="badge" style="background:var(--danger);color:#fff;margin-left:4px">${fbs.length}</span>`;
    }
    const lab = $('#act-feedbacks-label');
    if (lab && fbs.length > 0) {
      lab.innerHTML = `Feedbacks (${fbs.length})`;
      lab.style.color = 'var(--danger)';
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

      <div class="card" style="display:flex;align-items:center;gap:16px">
        <label class="profile-photo-edit" title="Trocar foto">
          ${photoEl(state.profile.photoURL, state.profile.name, 'profile-photo-lg')}
          <span class="edit-badge">Foto</span>
          <input type="file" id="photo-input" accept="image/*">
        </label>
        <div style="flex:1">
          <div style="font-weight:700">${state.profile.name || 'Personal'}</div>
          <div class="text-muted" style="font-size:0.85rem">${state.profile.email || ''}</div>
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
          <div class="icon">📝</div>
          <div class="label" id="act-feedbacks-label">Feedbacks</div>
        </div>
        <div class="action-item" id="act-chat">
          <div class="icon">💬</div>
          <div class="label">Mensagens</div>
        </div>
        <div class="action-item" id="act-templates">
          <div class="icon">📚</div>
          <div class="label">Modelos treino</div>
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
        <div class="action-item" id="act-export">
          <div class="icon">📦</div>
          <div class="label">Backup</div>
        </div>
        <div class="action-item" id="act-cleanup">
          <div class="icon">🧹</div>
          <div class="label">Limpeza</div>
        </div>
        <div class="action-item" id="act-theme">
          <div class="icon">🌓</div>
          <div class="label">Tema</div>
        </div>
      </div>
    `;

    $('#btn-copy-code')?.addEventListener('click', () => {
      navigator.clipboard.writeText(state.profile.inviteCode || '');
      toast('Código copiado!', 'success');
    });
    $('#photo-input')?.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const url = await saveProfilePhoto(f);
      if (url) showPersonalHome();
    });
    // toque longo / botão para perfil completo — adiciona atalho
    const photoLabel = document.querySelector('.profile-photo-edit');
    if (photoLabel && !$('#btn-open-profile')) {
      const btn = el('button', {
        class: 'btn btn-sm btn-outline',
        style: 'margin-top:8px',
        id: 'btn-open-profile',
        text: 'Editar perfil completo',
        onClick: () => showUserProfile()
      });
      photoLabel.parentElement?.appendChild(btn);
    }
    const goTab = (name) => {
      $$('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === name);
      });
      renderPersonalTab(name, students, stats);
    };
    $('#act-add-student').onclick = () => showAddStudentModal();
    $('#act-exercises').onclick = () => goTab('exercicios');
    $('#act-feedbacks').onclick = () => goTab('feedbacks');
    $('#act-chat')?.addEventListener('click', () => showPersonalChatHub(students));
    $('#act-templates')?.addEventListener('click', () => showWorkoutLibrary());
    $('#act-students').onclick = () => goTab('alunos');
    $('#act-financeiro')?.addEventListener('click', () => goTab('financeiro'));
    $('#act-pix')?.addEventListener('click', () => showPixKeyModal());
    $('#act-export')?.addEventListener('click', () => exportPersonalBackup());
    $('#act-cleanup')?.addEventListener('click', async () => {
      toast('Limpando dados expirados...', 'success');
      try {
        const n = await cleanupExpiredCoachReplies(state.user.uid);
        // limpa localStorage de sessões antigas
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('workout_session_') || k.startsWith('workout_draft_')) {
            try {
              const s = JSON.parse(localStorage.getItem(k) || '{}');
              if (s.startedAt && Date.now() - s.startedAt > 7 * 86400000) localStorage.removeItem(k);
            } catch { localStorage.removeItem(k); }
          }
        });
        toast(n ? `${n} resposta(s) antigas removidas` : 'Limpeza concluída', 'success');
      } catch (e) { toast(e.message || 'Erro na limpeza', 'error'); }
    });
    $('#act-theme')?.addEventListener('click', () => toggleTheme());
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
      <button class="btn btn-primary btn-block" id="btn-add-student" style="margin-bottom:12px">+ Adicionar aluno</button>
      <div class="form-group" style="margin-bottom:12px">
        <input type="search" class="form-input" id="student-search" placeholder="🔍 Buscar aluno (nome, e-mail, telefone)..." autocomplete="off">
      </div>
      <div id="students-list"></div>
    `;
    $('#btn-add-student').onclick = showAddStudentModal;
    const list = $('#students-list');
    const renderStudents = (items) => {
      list.innerHTML = '';
      if (!items.length) {
        list.innerHTML = `<div class="empty"><p>Nenhum aluno encontrado</p></div>`;
        return;
      }
      items.forEach(s => {
        const card = el('div', { class: 'student-card', onClick: () => showStudentDetail(s) }, [
          s.photoURL ? el('img', { class: 'avatar', src: s.photoURL, style: 'object-fit:cover' }) : el('div', { class: 'avatar', text: initials(s.name) }),
          el('div', { class: 'student-info' }, [
            el('div', { class: 'student-name', text: s.name }),
            el('div', { class: 'student-meta', text: s.phone || s.email || '' })
          ]),
          el('div', { html: '›', style: 'color:var(--muted);font-size:1.4rem' })
        ]);
        list.appendChild(card);
      });
    };
    renderStudents(students);
    $('#student-search')?.addEventListener('input', () => {
      const q = ($('#student-search').value || '').trim().toLowerCase();
      if (!q) return renderStudents(students);
      renderStudents(students.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q)
      ));
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
      <label class="form-label">WhatsApp / telefone</label>
      <input type="tel" class="form-input" id="new-phone" placeholder="11999999999">
    </div>
    <div class="form-group">
      <label class="form-label">Senha temporária</label>
      <input type="text" class="form-input" id="new-pass" placeholder="mín. 6 caracteres" value="treino123">
    </div>
    <p class="text-muted" style="font-size:0.8rem;margin-bottom:16px">
      O aluno usará este e-mail e senha para entrar. Informe o WhatsApp para cobranças.
    </p>
    <button class="btn btn-primary btn-block" id="btn-create-student">Criar aluno</button>
  `;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `<div class="modal"><div class="modal-header"><div class="modal-title">Novo aluno</div><button class="icon-btn" id="close-modal">✕</button></div>${html}</div>`;
  document.body.appendChild(overlay);
  $('#close-modal').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  bindEnter('#new-name', '#btn-create-student');
  bindEnter('#new-email', '#btn-create-student');
  bindEnter('#new-pass', '#btn-create-student');
  $('#btn-create-student').onclick = async () => {
    const name = $('#new-name').value.trim();
    const email = $('#new-email').value.trim();
    const phone = $('#new-phone')?.value.trim() || '';
    const pass = $('#new-pass').value;
    if (!name || !email || pass.length < 6) return toast('Preencha todos os campos', 'error');
    try {
      await createStudentAccount(email, pass, name, state.user.uid, { phone });
      toast('Aluno criado com sucesso!', 'success');
      overlay.remove();
      showPersonalHome();
    } catch {}
  };
}

// ---------- EXERCÍCIOS ----------
async function renderExercisesTab(content) {
  let listType = content.dataset.exList || 'personalizada';
  const personal = await getExercises(state.user.uid, { includeGlobal: false });
  let global = [];
  try { global = await getGlobalExercises(); } catch (e) { console.warn(e); }

  const admin = isAppAdmin();
  const show = listType === 'padrao' ? global : personal;

  content.innerHTML = `
    <div class="tabs" id="ex-list-tabs" style="margin-bottom:12px">
      <button class="tab ${listType==='padrao'?'active':''}" data-l="padrao">Lista padrão (${global.length})</button>
      <button class="tab ${listType==='personalizada'?'active':''}" data-l="personalizada">Personalizada (${personal.length})</button>
    </div>
    ${listType === 'padrao' && !admin ? `<div class="card note" style="font-size:0.85rem;margin-bottom:12px">Lista padrão compartilhada. Apenas o administrador pode editar.</div>` : ''}
    ${(listType === 'personalizada' || admin) ? `<button class="btn btn-primary btn-block" id="btn-new-ex" style="margin-bottom:12px">+ Criar exercício ${listType==='padrao'?'(padrão)':'(meu)'}</button>` : ''}
    <div class="form-group" style="margin-bottom:12px">
      <input type="search" class="form-input" id="ex-search" placeholder="🔍 Buscar exercício ou músculo..." autocomplete="off">
    </div>
    <div id="ex-list"></div>
  `;
  content.dataset.exList = listType;

  $$('#ex-list-tabs .tab').forEach(t => {
    t.onclick = () => {
      content.dataset.exList = t.dataset.l;
      renderExercisesTab(content);
    };
  });

  $('#btn-new-ex')?.addEventListener('click', () => showExerciseForm(null, listType));

  const list = $('#ex-list');
  const renderList = (items) => {
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = `<div class="empty"><p>Nenhum exercício encontrado</p></div>`;
      return;
    }
    items.forEach(ex => {
    const canEdit = listType === 'personalizada' || admin;
    const card = el('div', { class: 'card' }, [
      el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:8px' }, [
        el('div', { style: 'flex:1' }, [
          el('div', { style: 'font-weight:600', text: ex.name }),
          el('div', { class: 'text-muted', style: 'font-size:0.8rem', text: ex.muscleGroup || '' }),
          el('div', { style: 'font-size:0.7rem;color:var(--muted);margin-top:2px', text: listType === 'padrao' ? 'Lista padrão' : 'Personalizada' })
        ]),
        canEdit ? el('div', { style: 'display:flex;gap:6px;flex-shrink:0' }, [
          el('button', { class: 'btn btn-sm btn-outline', text: 'Editar', onClick: () => showExerciseForm(ex, listType) }),
          el('button', {
            class: 'btn btn-sm btn-outline',
            text: 'Excluir',
            style: 'color:var(--danger);border-color:var(--danger)',
            onClick: async () => {
              if (!(await confirmDialog(`Excluir "${ex.name}"?`))) return;
              try {
                await deleteExercise(ex.id);
                toast('Exercício excluído', 'success');
                renderExercisesTab(content);
              } catch (e) {
                toast(e.message || 'Erro ao excluir', 'error');
              }
            }
          })
        ]) : null
      ])
    ]);
    list.appendChild(card);
    });
  };
  renderList(show);

  $('#ex-search')?.addEventListener('input', () => {
    const q = ($('#ex-search').value || '').trim().toLowerCase();
    if (!q) return renderList(show);
    renderList(show.filter(ex =>
      (ex.name || '').toLowerCase().includes(q) ||
      (ex.muscleGroup || '').toLowerCase().includes(q)
    ));
  });
}

function showExerciseForm(ex = null, listType = 'personalizada') {
  const isEdit = !!ex;
  const isGlobal = (ex?.personalId === '__global__') || listType === 'padrao';
  if (isGlobal && !isAppAdmin()) return toast('Sem permissão para lista padrão', 'error');
  const html = `
    <div class="form-group">
      <label class="form-label">Nome do exercício</label>
      <input type="text" class="form-input" id="ex-name" value="${ex?.name || ''}">
    </div>
    <div class="form-group">
      <label class="form-label">Grupo muscular</label>
      <select class="form-select" id="ex-group">
        ${['Peito','Costas','Ombros','Bíceps','Tríceps','Quadríceps','Posterior de coxa','Glúteos','Abdômen','Cardio','Outro']
          .map(g => `<option value="${g}" ${ex?.muscleGroup===g?'selected':''}>${g}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Link do vídeo</label>
      <input type="url" class="form-input" id="ex-video" value="${ex?.videoUrl || ''}" placeholder="YouTube, Shorts ou Google Drive">
    </div>
    <div class="form-group">
      <label class="form-label">Link de GIF (opcional)</label>
      <input type="url" class="form-input" id="ex-gif" value="${ex?.gifUrl || ''}" placeholder="https://...arquivo.gif ou Giphy/Tenor">
      <p class="text-muted" style="font-size:0.75rem;margin-top:4px">Se preencher o GIF, ele tem prioridade na visualização do aluno.</p>
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
      personalId: isGlobal ? '__global__' : state.user.uid,
      name: $('#ex-name').value.trim(),
      muscleGroup: $('#ex-group').value,
      videoUrl: $('#ex-video').value.trim(),
      gifUrl: $('#ex-gif').value.trim(),
      notes: $('#ex-notes').value.trim(),
      isCustom: !isGlobal
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
      el('div', { class: 'text-muted', style: 'font-size:0.8rem', text: `${fb.workoutName || 'Treino'} · ${formatDateTime(fb.finishedAt)}` }),
      el('div', { style: 'margin:10px 0', text: fb.feedback || 'Sem comentário' }),
      el('div', { class: 'form-group', style: 'margin-bottom:8px' }, [
        el('label', { class: 'form-label', text: 'Resposta ao aluno (opcional)' }),
        el('textarea', { class: 'form-textarea', id: `fb-reply-${fb.id}`, placeholder: 'Mensagem que o aluno verá no histórico...' })
      ]),
      el('div', { class: 'btn-group' }, [
        el('button', {
          class: 'btn btn-sm btn-primary',
          text: 'Resolver e enviar',
          onClick: async () => {
            const reply = $(`#fb-reply-${fb.id}`)?.value.trim() || '';
            await resolveFeedback(fb.id, reply);
            toast(reply ? 'Feedback resolvido com mensagem' : 'Feedback resolvido', 'success');
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
  const pid = state.user.uid;
  let routines = [], plans = [], completed = [];
  try {
    routines = await getRoutinesOfStudent(student.id, { personalId: pid });
    plans = sortPlans(await getPlansOfStudent(student.id, { personalId: pid }));
    completed = await getCompletedByStudent(student.id, 10, { personalId: pid });
  } catch (e) {
    console.error('showStudentDetail', e);
    toast(e.message || 'Erro ao carregar dados do aluno', 'error');
  }

  const app = $('#app');
  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-back">←</button>
      <div class="title" style="flex:1;text-align:center">${student.name}</div>
      <button class="icon-btn" id="btn-chat" title="Chat">💬</button>
      <button class="icon-btn" id="btn-student-profile" title="Perfil">👤</button>
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
  $('#btn-student-profile')?.addEventListener('click', () => showUserProfile(student));
  $('#btn-chat')?.addEventListener('click', () => showChat(student));

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
    const wrap = el('div', {});
    content.appendChild(wrap);
    renderStudentHistory(wrap, completed, (c, prev) => showCompletedReport(c, prev));
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
        const waKey = `wa_sent_${p.id}`;
        const alreadySent = localStorage.getItem(waKey) === '1';
        const msg = `Olá ${student.name}! Tudo bem? 😊\n\nPassando para lembrar da fatura *${p.name}* no valor de *R$ ${Number(p.value||0).toFixed(2)}*.\n\nQuando puder quitar, me avisa por aqui ou sinaliza no app. Obrigado!`;
        card.appendChild(el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px' }, [
          el('button', {
            class: 'btn btn-sm btn-success',
            text: 'Marcar como pago',
            onClick: async () => {
              await markPlanPaid(p.id);
              toast('Fatura marcada como paga', 'success');
              showStudentDetail(student);
            }
          }),
          el('button', {
            class: 'btn btn-sm btn-outline',
            style: alreadySent ? 'opacity:0.45' : '',
            text: alreadySent ? 'WhatsApp (enviado)' : 'WhatsApp',
            onClick: () => {
              if (!student.phone) return toast('Cadastre o telefone no perfil do aluno', 'error');
              if (openWhatsApp(student.phone, msg)) {
                localStorage.setItem(waKey, '1');
                toast('Abrindo WhatsApp...', 'success');
                showStudentDetail(student);
              }
            }
          })
        ]));
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
  const workouts = await getWorkoutsOfRoutine(routine.id, { personalId: state.user.uid });

  const app = $('#app');
  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-back">←</button>
      <div class="title" style="flex:1;text-align:center">${routine.name}</div>
      <button class="icon-btn" id="btn-edit-routine" title="Editar">✎</button>
    </header>
    <div class="page">
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
        <button class="btn btn-primary" id="btn-add-workout" style="flex:1">+ Treino</button>
        <button class="btn btn-outline" id="btn-clone-routine">Clonar</button>
        <button class="btn btn-outline" id="btn-archive-routine" style="color:var(--danger);border-color:var(--danger)">Arquivar</button>
      </div>
      <div id="workouts-list"></div>
    </div>
  `;

  $('#btn-back').onclick = () => showStudentDetail(student);
  $('#btn-add-workout').onclick = () => showCreateWorkout(routine, student);
  $('#btn-edit-routine').onclick = () => showEditRoutineModal(routine, student);
  $('#btn-clone-routine').onclick = async () => {
    if (!(await confirmDialog('Clonar esta rotina (com todos os treinos) para o mesmo aluno?'))) return;
    try {
      await cloneRoutine(routine.id, student.id, state.user.uid);
      toast('Rotina clonada', 'success');
      showStudentDetail(student);
    } catch (e) { toast(e.message || 'Erro ao clonar', 'error'); }
  };
  $('#btn-archive-routine').onclick = async () => {
    if (!(await confirmDialog('Arquivar esta rotina? O aluno deixa de vê-la.'))) return;
    await archiveRoutine(routine.id);
    toast('Rotina arquivada', 'success');
    showStudentDetail(student);
  };

  const list = $('#workouts-list');
  if (workouts.length === 0) {
    list.innerHTML = `<div class="empty"><p>Nenhum treino nesta rotina</p></div>`;
    return;
  }
  workouts.forEach(w => {
    const start = w.startDate ? formatDate(w.startDate) : '—';
    const end = w.endDate ? formatDate(w.endDate) : '∞';
    const card = el('div', { class: 'card' }, [
      el('div', {
        style: 'cursor:pointer',
        onClick: () => showWorkoutEditor(w, routine, student)
      }, [
        el('div', { style: 'font-weight:600', text: w.name }),
        el('div', { class: 'text-muted', style: 'font-size:0.8rem', text: `${(w.exercises||[]).length} exercícios · ${start} → ${end}` })
      ]),
      el('div', { style: 'display:flex;gap:8px;margin-top:10px' }, [
        el('button', {
          class: 'btn btn-sm btn-outline',
          text: 'Copiar / Cortar',
          onClick: (e) => {
            e.stopPropagation();
            copyWorkoutBetweenStudents(w, student, routine);
          }
        }),
        el('button', {
          class: 'btn btn-sm btn-outline',
          text: 'Salvar como modelo',
          onClick: async (e) => {
            e.stopPropagation();
            const n = await promptDialog('Salvar como modelo', 'Nome', w.name);
            if (n === null || !n.trim()) return;
            await createWorkoutTemplate({
              personalId: state.user.uid,
              name: n.trim(),
              exercises: JSON.parse(JSON.stringify(w.exercises || []))
            });
            toast('Modelo salvo na biblioteca', 'success');
          }
        })
      ])
    ]);
    list.appendChild(card);
  });
}

function showEditRoutineModal(routine, student) {
  const html = `
    <div class="form-group">
      <label class="form-label">Nome da rotina</label>
      <input type="text" class="form-input" id="er-name" value="${routine.name || ''}">
    </div>
    <button class="btn btn-primary btn-block" id="btn-save-er">Salvar</button>
  `;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `<div class="modal"><div class="modal-header"><div class="modal-title">Editar rotina</div><button class="icon-btn" id="close-modal">✕</button></div>${html}</div>`;
  document.body.appendChild(overlay);
  $('#close-modal').onclick = () => overlay.remove();
  $('#btn-save-er').onclick = async () => {
    const name = $('#er-name').value.trim();
    if (!name) return toast('Nome obrigatório', 'error');
    await updateRoutine(routine.id, { name });
    routine.name = name;
    toast('Rotina atualizada', 'success');
    overlay.remove();
    showRoutineDetail(routine, student);
  };
}

function showCreateWorkout(routine, student) {
  const today = new Date().toISOString().slice(0, 10);
  const html = `
    <div class="form-group">
      <label class="form-label">Nome do treino</label>
      <input type="text" class="form-input" id="w-name" placeholder="Ex: Upper 1">
    </div>
    <div class="form-group">
      <label class="form-label">Início da vigência</label>
      <input type="date" class="form-input" id="w-start" value="${today}">
    </div>
    <div class="form-group">
      <label class="form-label">Fim da vigência</label>
      <input type="date" class="form-input" id="w-end">
      <p class="text-muted" style="font-size:0.75rem;margin-top:4px">O aluno só vê este treino entre essas datas. Vazio = sem limite de fim.</p>
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
    const startVal = $('#w-start').value;
    const endVal = $('#w-end').value;
    await createWorkout({
      routineId: routine.id,
      personalId: state.user.uid,
      studentId: student.id,
      name,
      order: 0,
      exercises: [],
      startDate: startVal ? firebase.firestore.Timestamp.fromDate(new Date(startVal + 'T00:00:00')) : firebase.firestore.Timestamp.now(),
      endDate: endVal ? firebase.firestore.Timestamp.fromDate(new Date(endVal + 'T23:59:59')) : null
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
  const startStr = workout.startDate?.toDate ? workout.startDate.toDate().toISOString().slice(0,10) : '';
  const endStr = workout.endDate?.toDate ? workout.endDate.toDate().toISOString().slice(0,10) : '';
  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-back">←</button>
      <div class="title" style="flex:1;text-align:center">${workout.name}</div>
      <button class="icon-btn" id="btn-edit-w" title="Editar">✎</button>
    </header>
    <div class="page">
      <div class="card note" style="font-size:0.8rem;margin-bottom:12px">
        Vigência: ${startStr || '—'} → ${endStr || 'sem fim'}
      </div>
      <button class="btn btn-primary btn-block" id="btn-add-ex" style="margin-bottom:16px">+ Adicionar exercício</button>
      <div id="ex-in-workout"></div>
      <button class="btn btn-outline btn-block" id="btn-del-w" style="margin-top:20px;color:var(--danger);border-color:var(--danger)">Excluir treino</button>
    </div>
  `;

  $('#btn-back').onclick = () => showRoutineDetail(routine, student);
  $('#btn-add-ex').onclick = () => showPickExercise(allExercises, workout, routine, student);
  $('#btn-del-w').onclick = async () => {
    if (!(await confirmDialog('Excluir este treino permanentemente?'))) return;
    await deleteWorkout(workout.id);
    toast('Treino excluído', 'success');
    showRoutineDetail(routine, student);
  };
  $('#btn-edit-w').onclick = () => {
    const html = `
      <div class="form-group"><label class="form-label">Nome</label>
        <input type="text" class="form-input" id="ew-name" value="${workout.name || ''}"></div>
      <div class="form-group"><label class="form-label">Início</label>
        <input type="date" class="form-input" id="ew-start" value="${startStr}"></div>
      <div class="form-group"><label class="form-label">Fim</label>
        <input type="date" class="form-input" id="ew-end" value="${endStr}"></div>
      <button class="btn btn-primary btn-block" id="btn-save-ew">Salvar</button>`;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `<div class="modal"><div class="modal-header"><div class="modal-title">Editar treino</div><button class="icon-btn" id="close-modal">✕</button></div>${html}</div>`;
    document.body.appendChild(overlay);
    $('#close-modal').onclick = () => overlay.remove();
    $('#btn-save-ew').onclick = async () => {
      const name = $('#ew-name').value.trim();
      if (!name) return toast('Nome obrigatório', 'error');
      const sv = $('#ew-start').value;
      const ev = $('#ew-end').value;
      const data = {
        name,
        startDate: sv ? firebase.firestore.Timestamp.fromDate(new Date(sv+'T00:00:00')) : null,
        endDate: ev ? firebase.firestore.Timestamp.fromDate(new Date(ev+'T23:59:59')) : null
      };
      await updateWorkout(workout.id, data);
      Object.assign(workout, data);
      toast('Treino atualizado', 'success');
      overlay.remove();
      showWorkoutEditor(workout, routine, student);
    };
  };

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
    const tech = ex.technique || 'normal';
    const setsHtml = (ex.sets || []).map((s, i) => {
      let info = `${s.reps || '—'} reps`;
      if (tech === 'drop' && s.drops?.length) info += ' → ' + s.drops.map(d => `${d.reps}×${d.weight||'?'}kg`).join(' → ');
      if (tech === 'rest_pause') info += ` · RP ${s.rpRounds||3} (pausa ${s.rpRest||15}s)`;
      if (tech === 'cluster') info += ` · ${s.clusterCount||3}×${s.clusterReps||3}`;
      return `<div class="set-row"><div class="set-num">${i + 1}</div><div class="set-info">${info}</div><div class="set-value">${s.weight || '0'} kg</div></div>`;
    }).join('');

    const title = `${ex.name} ${techniqueBadge(tech)}${tech==='combined'&&ex.combinedName?` <span class="text-muted">+ ${ex.combinedName}</span>`:''}`;

    const card = el('div', { class: 'card' }, [
      el('div', { style: 'font-weight:600;margin-bottom:6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center', html: title }),
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
        muscleGroup: ex.muscleGroup || '',
        videoUrl: ex.videoUrl || '',
        gifUrl: ex.gifUrl || '',
        notes: ex.notes || '',
        technique: 'normal',
        sets: [{ reps: '10', weight: '0', rest: '60', done: false }]
      });
      await updateWorkout(workout.id, { exercises: workout.exercises });
      toast('Exercício adicionado', 'success');
      overlay.remove();
      showWorkoutEditor(workout, routine, student);
    };
  });
}


const TECHNIQUE_OPTS = [
  { id: 'normal', label: 'Normal' },
  { id: 'drop', label: 'Drop set' },
  { id: 'rest_pause', label: 'Rest-pause' },
  { id: 'cluster', label: 'Cluster set' },
  { id: 'combined', label: 'Combinado / bi-set' }
];
function techniqueLabel(id) {
  return (TECHNIQUE_OPTS.find(t => t.id === id) || {}).label || 'Normal';
}
function techniqueBadge(id) {
  if (!id || id === 'normal') return '';
  return `<span class="badge" style="background:var(--accent);color:#0f172a;font-size:0.7rem">${techniqueLabel(id)}</span>`;
}

function showEditSets(ex, idx, workout, routine, student) {
  const sets = ex.sets || [{ reps: '10', weight: '0', rest: '60' }];
  const tech = ex.technique || 'normal';

  const techOptions = TECHNIQUE_OPTS.map(o =>
    `<option value="${o.id}" ${tech === o.id ? 'selected' : ''}>${o.label}</option>`
  ).join('');

  const setsHtml = sets.map((s, i) => {
    let extra = '';
    if (tech === 'drop') {
      const drops = s.drops || [{ reps: '8', weight: '' }, { reps: '6', weight: '' }];
      extra = `<div style="margin:8px 0 0 12px;padding:8px;background:var(--elevated);border-radius:8px;font-size:0.85rem">
        <div class="text-muted" style="margin-bottom:6px">Drops (reduza a carga sem descanso longo)</div>
        ${drops.map((d, di) => `
          <div style="display:flex;gap:6px;margin-bottom:6px;align-items:center">
            <span style="width:20px;color:var(--muted)">↓${di + 1}</span>
            <input type="text" class="form-input drop-reps" data-set="${i}" data-d="${di}" value="${d.reps || ''}" placeholder="Reps" style="flex:1">
            <input type="text" class="form-input drop-weight" data-set="${i}" data-d="${di}" value="${d.weight || ''}" placeholder="Kg" style="flex:1">
          </div>`).join('')}
      </div>`;
    }
    if (tech === 'rest_pause') {
      extra = `<div style="margin:8px 0 0 12px;padding:8px;background:var(--elevated);border-radius:8px;font-size:0.85rem">
        <div class="text-muted" style="margin-bottom:6px">Rest-pause: mini-séries com pausa curta</div>
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
          <label style="flex:1">Mini-séries
            <input type="number" class="form-input rp-rounds" data-set="${i}" value="${s.rpRounds || 3}" min="2" max="6">
          </label>
          <label style="flex:1">Pausa (s)
            <input type="number" class="form-input rp-rest" data-set="${i}" value="${s.rpRest || 15}" min="5" max="45">
          </label>
        </div>
        <p class="text-muted" style="font-size:0.75rem;margin:0">Ex.: 8+4+3 reps com ${s.rpRest || 15}s entre elas</p>
      </div>`;
    }
    if (tech === 'cluster') {
      extra = `<div style="margin:8px 0 0 12px;padding:8px;background:var(--elevated);border-radius:8px;font-size:0.85rem">
        <div class="text-muted" style="margin-bottom:6px">Cluster: blocos de reps com pausa intra-série</div>
        <div style="display:flex;gap:6px;align-items:center">
          <label style="flex:1">Clusters
            <input type="number" class="form-input cl-count" data-set="${i}" value="${s.clusterCount || 3}" min="2" max="8">
          </label>
          <label style="flex:1">Reps/cluster
            <input type="number" class="form-input cl-reps" data-set="${i}" value="${s.clusterReps || 3}" min="1" max="10">
          </label>
          <label style="flex:1">Pausa (s)
            <input type="number" class="form-input cl-rest" data-set="${i}" value="${s.clusterRest || 15}" min="5" max="30">
          </label>
        </div>
      </div>`;
    }
    return `
    <div class="card" style="margin-bottom:10px;padding:12px" data-set-block="${i}">
      <div style="font-weight:600;margin-bottom:8px;color:var(--accent)">Série ${i + 1}</div>
      <div style="display:flex;gap:8px;align-items:flex-end">
        <div style="flex:1"><label class="form-label">Reps</label>
          <input type="text" class="form-input set-reps" data-i="${i}" value="${s.reps || ''}"></div>
        <div style="flex:1"><label class="form-label">Carga (kg)</label>
          <input type="text" class="form-input set-weight" data-i="${i}" value="${s.weight || ''}"></div>
        <div style="flex:1"><label class="form-label">Descanso (s)</label>
          <input type="text" class="form-input set-rest" data-i="${i}" value="${s.rest || '60'}"></div>
      </div>
      ${extra}
    </div>`;
  }).join('');

  const combinedBlock = tech === 'combined' ? `
    <div class="card note" style="margin-bottom:12px">
      <div class="form-group" style="margin-bottom:8px">
        <label class="form-label">2º exercício (combinado / bi-set)</label>
        <input type="text" class="form-input" id="ex-combined-name" value="${ex.combinedName || ''}" placeholder="Ex.: Tríceps pulley">
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Link vídeo/GIF do 2º (opcional)</label>
        <input type="url" class="form-input" id="ex-combined-media" value="${ex.combinedMedia || ''}" placeholder="https://...">
      </div>
      <p class="text-muted" style="font-size:0.75rem;margin-top:8px">Aluno faz A e B alternados na mesma série (ou um atrás do outro, sem descanso longo).</p>
    </div>` : '';

  const html = `
    <div class="form-group">
      <label class="form-label">Técnica da série / exercício</label>
      <select class="form-select" id="ex-technique">${techOptions}</select>
    </div>
    ${combinedBlock}
    <div id="sets-blocks">${setsHtml}</div>
    <button class="btn btn-outline btn-block" id="btn-add-set" style="margin-bottom:12px">+ Série</button>
    <button class="btn btn-primary btn-block" id="btn-save-sets">Salvar</button>
  `;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `<div class="modal"><div class="modal-header"><div class="modal-title">Séries – ${ex.name}</div><button class="icon-btn" id="close-modal">✕</button></div>${html}</div>`;
  document.body.appendChild(overlay);
  $('#close-modal').onclick = () => overlay.remove();

  $('#ex-technique').onchange = () => {
    // persiste campos básicos e reabre com nova técnica
    const newSets = collectSetsFromForm(tech);
    workout.exercises[idx].sets = newSets;
    workout.exercises[idx].technique = $('#ex-technique').value;
    if ($('#ex-combined-name')) {
      workout.exercises[idx].combinedName = $('#ex-combined-name').value.trim();
      workout.exercises[idx].combinedMedia = $('#ex-combined-media').value.trim();
    }
    overlay.remove();
    showEditSets(workout.exercises[idx], idx, workout, routine, student);
  };

  function collectSetsFromForm(currentTech) {
    const techNow = $('#ex-technique')?.value || currentTech || 'normal';
    const newSets = [];
    $$('.set-reps').forEach((input, i) => {
      const row = {
        reps: input.value,
        weight: $$('.set-weight')[i]?.value || '0',
        rest: $$('.set-rest')[i]?.value || '60',
        done: false
      };
      if (techNow === 'drop') {
        row.drops = [];
        $$(`.drop-reps[data-set="${i}"]`).forEach((dr, di) => {
          row.drops.push({
            reps: dr.value,
            weight: $$(`.drop-weight[data-set="${i}"]`)[di]?.value || ''
          });
        });
        if (!row.drops.length) row.drops = [{ reps: '8', weight: '' }, { reps: '6', weight: '' }];
      }
      if (techNow === 'rest_pause') {
        row.rpRounds = parseInt($$(`.rp-rounds[data-set="${i}"]`)[0]?.value || '3', 10);
        row.rpRest = parseInt($$(`.rp-rest[data-set="${i}"]`)[0]?.value || '15', 10);
      }
      if (techNow === 'cluster') {
        row.clusterCount = parseInt($$(`.cl-count[data-set="${i}"]`)[0]?.value || '3', 10);
        row.clusterReps = parseInt($$(`.cl-reps[data-set="${i}"]`)[0]?.value || '3', 10);
        row.clusterRest = parseInt($$(`.cl-rest[data-set="${i}"]`)[0]?.value || '15', 10);
      }
      newSets.push(row);
    });
    return newSets;
  }

  $('#btn-add-set').onclick = () => {
    ex.sets = collectSetsFromForm(tech);
    ex.technique = $('#ex-technique').value;
    ex.sets.push({ reps: '10', weight: '0', rest: '60' });
    if ($('#ex-combined-name')) {
      ex.combinedName = $('#ex-combined-name').value.trim();
      ex.combinedMedia = $('#ex-combined-media').value.trim();
    }
    overlay.remove();
    showEditSets(ex, idx, workout, routine, student);
  };

  $('#btn-save-sets').onclick = async () => {
    const techNow = $('#ex-technique').value;
    const newSets = collectSetsFromForm(techNow);
    workout.exercises[idx].sets = newSets;
    workout.exercises[idx].technique = techNow;
    if (techNow === 'combined') {
      workout.exercises[idx].combinedName = $('#ex-combined-name')?.value.trim() || '';
      workout.exercises[idx].combinedMedia = $('#ex-combined-media')?.value.trim() || '';
    } else {
      delete workout.exercises[idx].combinedName;
      delete workout.exercises[idx].combinedMedia;
    }
    // Modelo de biblioteca (template) vs treino real
    if (routine?.id === 'tpl') {
      await updateWorkoutTemplate(workout.id, { exercises: workout.exercises });
      toast('Séries salvas no modelo', 'success');
      overlay.remove();
      showTemplateEditor(workout);
    } else {
      await updateWorkout(workout.id, { exercises: workout.exercises });
      toast('Séries e técnica salvas', 'success');
      overlay.remove();
      showWorkoutEditor(workout, routine, student);
    }
  };
}

// ---------- ÁREA DO ALUNO ----------

async function showUserProfile(targetUser = null, readOnly = false) {
  // targetUser: se personal vê aluno; senão edita o próprio perfil
  const isSelf = !targetUser;
  const u = targetUser || state.profile;
  const uid = targetUser?.id || state.user.uid;
  const canEdit = isSelf || state.profile?.role === 'personal';

  const app = $('#app');
  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-back">←</button>
      <div class="title" style="flex:1;text-align:center">${isSelf ? 'Meu perfil' : 'Perfil do aluno'}</div>
      <button class="icon-btn" id="btn-home">🏠</button>
    </header>
    <div class="page" style="padding-bottom:40px">
      <div class="card" style="text-align:center">
        <label class="profile-photo-edit" style="margin:0 auto 12px" title="Trocar foto">
          ${photoEl(u.photoURL, u.name, 'profile-photo-lg')}
          ${canEdit ? '<span class="edit-badge">Foto</span><input type="file" id="prof-photo" accept="image/*">' : ''}
        </label>
        <div style="font-weight:700;font-size:1.15rem">${u.name || '—'}</div>
        <div class="text-muted" style="font-size:0.85rem">${u.email || ''}</div>
        ${u.phone ? `<div style="margin-top:8px"><button class="btn btn-sm btn-success" id="btn-wa-profile">WhatsApp</button></div>` : ''}
      </div>

      <div class="page-title">Dados pessoais</div>
      <div class="card">
        <div class="form-group">
          <label class="form-label">Nome completo</label>
          <input type="text" class="form-input" id="pf-name" value="${u.name || ''}" ${canEdit ? '' : 'disabled'}>
        </div>
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input type="email" class="form-input" id="pf-email" value="${u.email || ''}" disabled>
        </div>
        <div class="form-group">
          <label class="form-label">WhatsApp / telefone</label>
          <input type="tel" class="form-input" id="pf-phone" value="${u.phone || ''}" placeholder="11999999999" ${canEdit ? '' : 'disabled'}>
        </div>
        <div class="form-group">
          <label class="form-label">Sexo</label>
          <select class="form-select" id="pf-sex" ${canEdit ? '' : 'disabled'}>
            <option value="">—</option>
            <option value="masculino" ${u.sex==='masculino'?'selected':''}>Masculino</option>
            <option value="feminino" ${u.sex==='feminino'?'selected':''}>Feminino</option>
            <option value="outro" ${u.sex==='outro'?'selected':''}>Outro</option>
            <option value="prefiro_nao" ${u.sex==='prefiro_nao'?'selected':''}>Prefiro não informar</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Data de nascimento</label>
          <input type="date" class="form-input" id="pf-birth" value="${u.birthDate || ''}" ${canEdit ? '' : 'disabled'}>
        </div>
        <div class="form-group">
          <label class="form-label">Altura (cm)</label>
          <input type="number" class="form-input" id="pf-height" value="${u.heightCm || ''}" placeholder="175" ${canEdit ? '' : 'disabled'}>
        </div>
        <div class="form-group">
          <label class="form-label">Peso (kg)</label>
          <input type="number" class="form-input" id="pf-weight" value="${u.weightKg || ''}" placeholder="80" step="0.1" ${canEdit ? '' : 'disabled'}>
        </div>
        <div class="form-group">
          <label class="form-label">Objetivo</label>
          <select class="form-select" id="pf-goal" ${canEdit ? '' : 'disabled'}>
            <option value="">—</option>
            ${['Hipertrofia','Emagrecimento','Força','Condicionamento','Saúde','Outro'].map(g =>
              `<option value="${g}" ${u.goal===g?'selected':''}>${g}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Observações / restrições</label>
          <textarea class="form-textarea" id="pf-notes" placeholder="Lesões, medicamentos, preferências..." ${canEdit ? '' : 'disabled'}>${u.notes || ''}</textarea>
        </div>
        ${canEdit ? '<button class="btn btn-primary btn-block" id="btn-save-profile">Salvar perfil</button>' : ''}
      </div>
    </div>
  `;

  const goBack = () => {
    if (state.profile?.role === 'personal') {
      if (targetUser) showStudentDetail(targetUser);
      else showPersonalHome();
    } else {
      showStudentHome();
    }
  };
  $('#btn-back').onclick = goBack;
  $('#btn-home').onclick = () => state.profile?.role === 'personal' ? showPersonalHome() : showStudentHome();

  $('#btn-wa-profile')?.addEventListener('click', () => {
    openWhatsApp(u.phone, `Olá ${u.name}!`);
  });

  $('#prof-photo')?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (isSelf) {
      const url = await saveProfilePhoto(f);
      if (url) showUserProfile();
    } else {
      // personal updating student photo
      try {
        const dataUrl = await compressImageToBase64(f, 256, 0.72);
        await updateUser(uid, { photoURL: dataUrl });
        targetUser.photoURL = dataUrl;
        toast('Foto atualizada', 'success');
        showUserProfile(targetUser);
      } catch (err) {
        toast(err.message || 'Erro', 'error');
      }
    }
  });

  $('#btn-save-profile')?.addEventListener('click', async () => {
    const data = {
      name: $('#pf-name').value.trim(),
      phone: $('#pf-phone').value.trim(),
      sex: $('#pf-sex').value || null,
      birthDate: $('#pf-birth').value || null,
      heightCm: parseFloat($('#pf-height').value) || null,
      weightKg: parseFloat($('#pf-weight').value) || null,
      goal: $('#pf-goal').value || null,
      notes: $('#pf-notes').value.trim() || null
    };
    if (!data.name) return toast('Informe o nome', 'error');
    try {
      await updateUser(uid, data);
      if (isSelf) {
        state.profile = { ...state.profile, ...data };
      } else {
        Object.assign(targetUser, data);
      }
      toast('Perfil salvo!', 'success');
      goBack();
    } catch (e) {
      toast(e.message || 'Erro ao salvar', 'error');
    }
  });
}

async function showStudentHome() {
  let routines = [];
  let completed = [];
  let plans = [];
  try {
    routines = await getRoutinesOfStudent(state.user.uid);
    completed = await getCompletedByStudent(state.user.uid, 30);
    plans = sortPlans(await getPlansOfStudent(state.user.uid));
    if (state.profile.personalId) {
      const personal = await getUser(state.profile.personalId);
      if (personal?.pixKey) state.profile.personalPixKey = personal.pixKey;
      if (personal?.name) state.profile.personalName = personal.name;
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
      <button class="nav-item" data-nav="financeiro" id="nav-fin">
        <span>💰</span><span>Financeiro</span>
      </button>
      <button class="nav-item" data-nav="historico">
        <span>📊</span><span>Histórico</span>
      </button>
      <button class="nav-item" data-nav="mensagens" id="nav-msgs">
        <span>💬</span><span>Chat</span>
      </button>
      <button class="nav-item" data-nav="perfil">
        <span>👤</span><span>Perfil</span>
      </button>
    </nav>
  `;

  $('#btn-logout').onclick = () => logout();

  const openFin = plans.filter(p => ['pendente','ativo','recusado'].includes(p.status || 'pendente')).length;
  if (openFin > 0) {
    const nf = $('#nav-fin');
    if (nf) {
      nf.style.color = 'var(--danger)';
      nf.innerHTML = `<span>💰</span><span style="color:var(--danger)">Financeiro · ${openFin}</span>`;
    }
  }
  const replies = unreadCoachReplies(completed);
  if (replies.length > 0) {
    const nm = $('#nav-msgs');
    if (nm) {
      nm.style.color = 'var(--accent)';
      nm.innerHTML = `<span>💬</span><span style="color:var(--accent)">Msgs · ${replies.length}</span>`;
    }
  }

  const renderNav = (nav) => {
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.nav === nav));
    const main = $('#student-main');
    if (nav === 'inicio') {
      const openPlans = plans.filter(p => ['pendente','ativo','aguardando'].includes(p.status || 'pendente'));
      main.innerHTML = `
        <div class="card" style="display:flex;align-items:center;gap:14px">
          <label class="profile-photo-edit" title="Trocar foto">
            ${photoEl(state.profile.photoURL, state.profile.name)}
            <span class="edit-badge">Foto</span>
            <input type="file" id="student-photo" accept="image/*">
          </label>
          <div>
            <div style="font-weight:700">Olá, ${state.profile.name || 'aluno'}! 💪</div>
            <div class="text-muted" style="font-size:0.8rem">Toque na foto para alterar</div>
          </div>
        </div>
        ${dueSoon.length ? `<div class="card note" style="border-color:#f59e0b;margin-bottom:12px">
          ⚠️ ${dueSoon.length} fatura(s) vencendo em até 5 dias — veja em Financeiro.
        </div>` : ''}
        <div class="stat-row">
          <div class="stat-card"><div class="stat-value">${routines.length}</div><div class="stat-label">Rotinas</div></div>
          <div class="stat-card"><div class="stat-value">${completed.length}</div><div class="stat-label">Rotinas concluídas</div></div>
          <div class="stat-card"><div class="stat-value">${openPlans.length}</div><div class="stat-label">Faturas abertas</div></div>
        </div>
        <div class="page-title">Acesso rápido</div>
        <div class="action-grid">
          <div class="action-item" id="go-treinos"><div class="icon">🏋️</div><div class="label">Treinos</div></div>
          <div class="action-item" id="go-fin" style="${openPlans.length ? 'border:1.5px solid var(--danger);box-shadow:0 0 0 2px rgba(239,68,68,0.25)' : ''}">
            <div class="icon">${openPlans.length ? '🚨' : '💰'}</div>
            <div class="label" style="${openPlans.length ? 'color:var(--danger);font-weight:700' : ''}">${openPlans.length ? `Faturas (${openPlans.length})` : 'Financeiro'}</div>
          </div>
          <div class="action-item" id="go-hist"><div class="icon">📊</div><div class="label">Histórico</div></div>
          <div class="action-item" id="go-profile"><div class="icon">👤</div><div class="label">Meu perfil</div></div>
          <div class="action-item" id="go-msgs">
            <div class="icon">💬</div>
            <div class="label">Chat</div>
          </div>
        </div>
        <div class="page-title" style="margin-top:8px">Rotinas concluídas</div>
        <div id="home-recent"></div>
      `;
      $('#go-treinos').onclick = () => renderNav('treinos');
      $('#go-fin').onclick = () => renderNav('financeiro');
      $('#go-hist').onclick = () => renderNav('historico');
      $('#go-profile')?.addEventListener('click', () => showUserProfile());
      $('#go-msgs')?.addEventListener('click', () => {
        showChat({ id: state.user.uid, name: state.profile.personalName || 'Personal' });
      });
      $('#student-photo')?.addEventListener('change', async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const url = await saveProfilePhoto(f);
        if (url) showStudentHome();
      });
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
    } else if (nav === 'mensagens') {
      // Chat com o personal (não feedbacks)
      const peer = {
        id: state.user.uid,
        name: state.profile.personalName || 'Personal'
      };
      showChat(peer);
    } else if (nav === 'perfil') {
      showUserProfile();
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
    const allW = await getWorkoutsOfRoutine(r.id, { studentId: state.user.uid });
    const workouts = allW.filter(isWorkoutActive);
    if (!workouts.length) continue;
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
  if (!rList.children.length) {
    rList.innerHTML = `<div class="empty"><p>Nenhum treino ativo no período</p></div>`;
  }
}

function renderStudentFinance(main, plans) {
  plans = sortPlans(plans);
  const pix = state.profile.personalPixKey || '';
  const hasOpen = plans.some(p => ['pendente','ativo','aguardando','recusado'].includes(p.status || 'pendente'));
  main.innerHTML = `
    <div class="page-title">Financeiro</div>
    ${hasOpen ? `<div class="alert-danger">
      ⚠️ Atenção!!! Antes de qualquer pagamento verifique o nome e instituição bancária, nunca realize pagamentos para nome de terceiros.
    </div>` : ''}
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
    const isOpen = st === 'pendente' || st === 'ativo' || st === 'recusado';
    const card = el('div', {
      class: 'card',
      style: isOpen ? 'border:1.5px solid var(--danger)' : ''
    }, [
      el('div', { style: 'font-size:0.75rem;color:var(--muted);text-transform:uppercase', text: 'Fatura' }),
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, [
        el('div', { style: 'font-weight:700', text: pl.name }),
        el('span', {
          class: 'badge',
          style: isOpen ? 'background:var(--danger);color:#fff' : (st==='pago' ? '' : ''),
          text: statusLabel[st] || st
        })
      ]),
      el('div', { class: 'text-muted', style: 'font-size:0.9rem;margin-top:6px', text: `R$ ${Number(pl.value||0).toFixed(2)} · Vence: ${due}` })
    ]);
    if (isOpen) {
      card.appendChild(el('div', {
        class: 'alert-danger',
        style: 'margin-top:12px;margin-bottom:0;font-size:0.8rem',
        html: '⚠️ Atenção!!! Antes de qualquer pagamento verifique o nome e instituição bancária, nunca realize pagamentos para nome de terceiros.'
      }));
    }
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
    if (isOpen) {
      card.appendChild(el('button', {
        class: 'btn btn-block btn-danger-block',
        style: 'margin-top:12px',
        text: 'Já paguei — sinalizar',
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


/** Filtra treinos por período */
function unreadCoachReplies(completed) {
  return completed.filter(c => c.coachReply && !c.coachReplyRead);
}

function sortPlans(plans) {
  const rank = { aguardando: 0, pendente: 1, ativo: 1, recusado: 2, pago: 3 };
  return [...plans].sort((a, b) => {
    const ra = rank[a.status || 'pendente'] ?? 9;
    const rb = rank[b.status || 'pendente'] ?? 9;
    if (ra !== rb) return ra - rb;
    const ta = a.dueDate?.toMillis?.() || 0;
    const tb = b.dueDate?.toMillis?.() || 0;
    return ta - tb;
  });
}

function filterByPeriod(completed, period) {
  const now = Date.now();
  const ms = {
    semana: 7 * 86400000,
    mes: 30 * 86400000,
    semestre: 182 * 86400000,
    ano: 365 * 86400000
  }[period] || 30 * 86400000;
  return completed.filter(c => {
    const t = c.finishedAt?.toMillis?.() || new Date(c.finishedAt).getTime() || 0;
    return now - t <= ms;
  });
}

/** SVG simples de linha (tonelagem ao longo do tempo) */
function renderTonnageChart(container, completedAsc) {
  const vals = completedAsc.map(c => calcWorkoutMetrics(c).tonnage);
  if (vals.length < 1) {
    container.innerHTML = `<p class="text-muted" style="font-size:0.85rem;text-align:center">Sem dados no período</p>`;
    return;
  }
  const w = 320, h = 120, pad = 24;
  const maxV = Math.max(...vals, 1);
  const minV = Math.min(...vals, 0);
  const range = Math.max(maxV - minV, 1);
  const pts = vals.map((v, i) => {
    const x = pad + (i / Math.max(vals.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((v - minV) / range) * (h - pad * 2);
    return [x, y, v];
  });
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const dots = pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="var(--accent)"/>`).join('');
  const last = vals[vals.length - 1];
  const prev = vals.length > 1 ? vals[vals.length - 2] : last;
  const trend = last > prev ? '↑' : last < prev ? '↓' : '→';
  const trendColor = last > prev ? 'var(--success)' : last < prev ? 'var(--danger)' : 'var(--muted)';
  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
      <div style="font-size:0.8rem;color:var(--muted)">Tonelagem (kg·rep)</div>
      <div style="font-weight:700;color:${trendColor}">${last} ${trend}</div>
    </div>
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="120" style="display:block">
      <line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="var(--border)" stroke-width="1"/>
      <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
    </svg>
  `;
}

function tonnageColor(current, previous) {
  if (previous == null) return 'var(--text)';
  if (current > previous) return 'var(--success)';
  return 'var(--text)';
}

function renderStudentHistory(main, completed, onOpen) {
  // completed: newest first
  let period = main.dataset.period || 'mes';

  let workoutFilter = main.dataset.workoutFilter || '';
  let muscleFilter = main.dataset.muscleFilter || '';

  const workoutNames = [...new Set(completed.map(c => c.workoutName).filter(Boolean))].sort();
  const muscles = [...new Set(completed.flatMap(c =>
    (c.exercisesPerformed || []).map(e => e.muscleGroup).filter(Boolean)
  ))].sort();

  const apply = () => {
    let filtered = filterByPeriod(completed, period);
    if (workoutFilter) filtered = filtered.filter(c => c.workoutName === workoutFilter);
    if (muscleFilter) {
      filtered = filtered.filter(c =>
        (c.exercisesPerformed || []).some(e => e.muscleGroup === muscleFilter)
      );
    }
    const metricsList = filtered.map(c => ({ c, m: calcWorkoutMetrics(c) }));
    const chrono = [...metricsList].reverse();

    main.innerHTML = `
      <div class="page-title">Histórico</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
        <button class="btn btn-sm btn-outline" id="btn-prog">📈 Progressão por exercício</button>
        <button class="btn btn-sm btn-outline" id="btn-fb-replies">💬 Respostas do personal</button>
      </div>
      <div class="tabs" id="period-tabs" style="margin-bottom:12px">
        ${['semana','mes','semestre','ano'].map(p =>
          `<button class="tab ${period===p?'active':''}" data-p="${p}">${p[0].toUpperCase()+p.slice(1)}</button>`
        ).join('')}
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="form-group" style="margin-bottom:10px">
          <label class="form-label">Filtrar por treino</label>
          <select class="form-select" id="filter-workout">
            <option value="">Todos os treinos</option>
            ${workoutNames.map(n => `<option value="${n}" ${workoutFilter===n?'selected':''}>${n}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Filtrar por músculo</label>
          <select class="form-select" id="filter-muscle">
            <option value="">Todos os músculos</option>
            ${muscles.map(n => `<option value="${n}" ${muscleFilter===n?'selected':''}>${n}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="card" id="chart-box"></div>
      <div class="page-title" style="margin-top:16px">Treinos</div>
      <div id="student-history"></div>
    `;
    main.dataset.period = period;
    main.dataset.workoutFilter = workoutFilter;
    main.dataset.muscleFilter = muscleFilter;

    $$('#period-tabs .tab').forEach(t => {
      t.onclick = () => { period = t.dataset.p; main.dataset.period = period; apply(); };
    });
    $('#filter-workout').onchange = () => { workoutFilter = $('#filter-workout').value; apply(); };
    $('#filter-muscle').onchange = () => { muscleFilter = $('#filter-muscle').value; apply(); };
    $('#btn-prog')?.addEventListener('click', () => showExerciseProgression(completed));
    $('#btn-fb-replies')?.addEventListener('click', () => renderStudentMessages(main, completed));

    renderTonnageChart($('#chart-box'), chrono.map(x => x.c));

    const hList = $('#student-history');
    if (!metricsList.length) {
      hList.innerHTML = `<p class="text-muted">Nenhum treino neste período</p>`;
      return;
    }

    // previous tonnage in chronological order for color
    const tonById = {};
    chrono.forEach((x, i) => {
      const prev = i > 0 ? chrono[i - 1].m.tonnage : null;
      tonById[x.c.id] = { ton: x.m.tonnage, prev };
    });

    metricsList.forEach(({ c, m }) => {
      const { ton, prev } = tonById[c.id] || { ton: m.tonnage, prev: null };
      const color = tonnageColor(ton, prev);
      hList.appendChild(el('div', {
        class: 'card',
        style: 'cursor:pointer',
        onClick: () => (onOpen ? onOpen(c, prev) : showStudentCompletedDetail(c, null, prev))
      }, [
        el('div', { style: 'font-weight:600', text: c.workoutName || 'Treino' }),
        el('div', { class: 'text-muted', style: 'font-size:0.8rem', text: formatDateTime(c.finishedAt) }),
        el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;font-size:0.85rem' }, [
          el('span', { class: 'badge badge-muted', text: `${m.totalSets} séries` }),
          el('span', {
            class: 'badge',
            style: `background:${color === 'var(--success)' ? 'var(--success)' : 'var(--elevated)'};color:${color === 'var(--success)' ? '#fff' : 'var(--text)'}`,
            text: `${m.tonnage} kg·rep`
          }),
          c.intensity ? el('span', { class: 'badge badge-muted', text: c.intensity }) : null
        ]),
        el('div', { style: 'font-size:0.8rem;color:var(--accent);margin-top:6px', text: 'Ver detalhe ›' })
      ]));
    });
  };

  apply();
}

function showStudentCompletedDetail(completed, _ma, prevTonnage) {
  const m = calcWorkoutMetrics(completed);
  const diffLabel = { facil: 'Fácil', moderado: 'Moderado', intenso: 'Intenso', leve: 'Leve', moderada: 'Moderada', intensa: 'Intensa' };
  const color = tonnageColor(m.tonnage, prevTonnage);
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
          <div class="stat-card"><div class="stat-value" style="color:${color}">${m.tonnage}</div><div class="stat-label">Tonelagem</div></div>
        </div>
        ${prevTonnage != null ? `<div style="margin-top:8px;font-size:0.85rem;color:var(--muted)">Treino anterior: ${prevTonnage} kg·rep ${m.tonnage > prevTonnage ? '<span style="color:var(--success)">↑ aumento</span>' : m.tonnage < prevTonnage ? '<span style="color:var(--danger)">↓ redução</span>' : '→ igual'}</div>` : ''}
        <div style="margin-top:8px">Intensidade: <strong>${diffLabel[completed.intensity] || completed.intensity || '—'}</strong></div>
        ${completed.feedback ? `<div style="margin-top:8px"><strong>Seu feedback:</strong> ${completed.feedback}</div>` : ''}
        ${completed.coachReply ? `<div class="card note note-accent" style="margin-top:10px"><strong>Resposta do personal:</strong><br>${completed.coachReply}</div>` : ''}
      </div>
      <div class="page-title">Por exercício</div>
      <div id="detail-exs"></div>
    </div>
  `;
  $('#btn-home').onclick = () => showStudentHome();
  $('#btn-back').onclick = () => showStudentHome();
  if (completed.coachReply && !completed.coachReplyRead && completed.id) {
    markCoachReplyRead(completed.id).then(() => { completed.coachReplyRead = true; }).catch(() => {});
  }
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
      el('div', { class: 'text-muted', style: 'font-size:0.8rem;margin:6px 0', text: `${ex.sets} séries · ${ex.tonnage} kg·rep` }),
      el('div', { html: setsHtml })
    ]));
  });
}

function renderStudentMessages(main, completed) {
  const unread = unreadCoachReplies(completed);
  const read = completed.filter(c => c.coachReply && c.coachReplyRead);
  const msgs = [...unread, ...read];
  main.innerHTML = `
    <div class="page-title">Mensagens do personal</div>
    <p class="text-muted" style="font-size:0.85rem;margin-bottom:12px">
      ${unread.length ? `<strong style="color:var(--accent)">${unread.length} não lida(s)</strong> · ` : ''}Respostas aos seus feedbacks.
    </p>
    <div id="msg-list"></div>
  `;
  const list = $('#msg-list');
  if (!msgs.length) {
    list.innerHTML = `<div class="empty"><p>Nenhuma mensagem ainda</p></div>`;
    return;
  }
  msgs.forEach(c => {
    const isUnread = !c.coachReplyRead;
    list.appendChild(el('div', {
      class: 'card',
      style: `cursor:pointer;${isUnread ? 'border:1.5px solid var(--accent)' : ''}`,
      onClick: async () => {
        if (isUnread) {
          try {
            await markCoachReplyRead(c.id);
            c.coachReplyRead = true;
          } catch (e) { console.warn(e); }
        }
        showStudentCompletedDetail(c, null, null);
      }
    }, [
      el('div', { style: 'display:flex;justify-content:space-between;gap:8px' }, [
        el('div', { style: 'font-weight:700', text: c.workoutName || 'Treino' }),
        isUnread ? el('span', { class: 'badge', style: 'background:var(--accent);color:#000', text: 'Nova' }) : null
      ]),
      el('div', { class: 'text-muted', style: 'font-size:0.8rem', text: formatDateTime(c.finishedAt) }),
      el('div', { class: 'card note note-accent', style: 'margin-top:10px;margin-bottom:0', html: `<strong>Personal:</strong> ${c.coachReply}` }),
      c.feedback ? el('div', { class: 'text-muted', style: 'font-size:0.85rem;margin-top:8px', text: `Seu feedback: ${c.feedback}` }) : null,
      el('div', { style: 'font-size:0.8rem;color:var(--accent);margin-top:8px', text: 'Ver treino completo ›' })
    ]));
  });
}

async function showStudentWorkout(workout, routine) {
  const app = $('#app');
  const exercises = workout.exercises || [];
  const storageKey = `workout_session_${state.user.uid}_${workout.id}`;

  let session = {
    started: false,
    startedAt: null,
    done: {},
    performed: null,
    restEndsAt: null,
    restExIdx: null
  };
  try {
    session = { ...session, ...JSON.parse(localStorage.getItem(storageKey) || '{}') };
  } catch {}

  const buildPerformed = () => exercises.map(ex => ({
    name: ex.name,
    exerciseId: ex.exerciseId || null,
    muscleGroup: ex.muscleGroup || '',
    videoUrl: ex.videoUrl || '',
    gifUrl: ex.gifUrl || '',
    technique: ex.technique || 'normal',
    combinedName: ex.combinedName || '',
    combinedMedia: ex.combinedMedia || '',
    restSeconds: Number(ex.restSeconds) || Number((ex.sets && ex.sets[0] && ex.sets[0].rest) || 60),
    difficulty: 'moderado',
    sets: (ex.sets || []).map(s => ({
      reps: Number(s.reps) || 0,
      weight: Number(s.weight) || 0,
      rest: Number(s.rest) || 60,
      drops: s.drops || null,
      rpRounds: s.rpRounds || null,
      rpRest: s.rpRest || null,
      clusterCount: s.clusterCount || null,
      clusterReps: s.clusterReps || null,
      clusterRest: s.clusterRest || null
    }))
  }));

  let performed = buildPerformed();
  if (session.performed && session.performed.length === performed.length) {
    performed = session.performed.map((p, i) => ({
      ...performed[i],
      ...p,
      sets: (p.sets && p.sets.length) ? p.sets : performed[i].sets,
      difficulty: p.difficulty || 'moderado',
      restSeconds: p.restSeconds || performed[i].restSeconds
    }));
  }
  const doneMap = session.done || {};

  const persist = () => {
    session.done = doneMap;
    session.performed = performed;
    localStorage.setItem(storageKey, JSON.stringify(session));
  };
  const clearSession = () => localStorage.removeItem(storageKey);

  let timerInterval = null;
  const stopTimers = () => {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  };

  const fmtElapsed = (ms) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${m}:${String(sec).padStart(2,'0')}`;
  };

  const render = () => {
    stopTimers();
    const doneCount = Object.values(doneMap).filter(Boolean).length;
    const started = !!session.started;

    app.innerHTML = `
      <header class="app-header">
        <button class="icon-btn" id="btn-home" title="Início">🏠</button>
        <div class="title" style="flex:1;text-align:center">${workout.name}</div>
        <button class="icon-btn" id="btn-back">←</button>
      </header>
      <div class="page" style="padding-bottom:100px">
        ${started ? `<div id="session-timer" style="text-align:center;font-size:0.85rem;color:var(--muted);margin-bottom:8px;font-variant-numeric:tabular-nums">⏱ <span id="elapsed-val">0:00</span></div>` : ''}
        <div class="card note" style="font-size:0.85rem">
          ${started
            ? 'Treino em andamento. Toque no exercício para expandir. Ajuste reps/kg e use o descanso.'
            : 'Revise os exercícios e toque em <strong>Iniciar treino</strong> quando estiver pronto.'}
        </div>
        <div style="font-size:0.85rem;color:var(--muted);margin-bottom:12px">
          ${doneCount} de ${performed.length} exercícios concluídos
        </div>
        <div id="workout-exs"></div>
        <div class="card" style="margin-top:20px">
          ${started ? `
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
          <button class="btn btn-success btn-block" id="btn-finish">Finalizar treino</button>
          <button class="btn btn-outline btn-block" id="btn-cancel" style="margin-top:10px;color:var(--danger);border-color:var(--danger)">Cancelar treino</button>
          ` : `
          <button class="btn btn-primary btn-block" id="btn-start">Iniciar treino</button>
          `}
        </div>
      </div>
    `;

    $('#btn-home').onclick = () => { stopTimers(); showStudentHome(); };
    $('#btn-back').onclick = () => { stopTimers(); showStudentHome(); };

    if (started && session.startedAt) {
      const tick = () => {
        const el = $('#elapsed-val');
        if (!el) return;
        el.textContent = fmtElapsed(Date.now() - session.startedAt);
      };
      tick();
      timerInterval = setInterval(tick, 1000);
    }

    const list = $('#workout-exs');
    performed.forEach((ex, idx) => {
      const isDone = !!doneMap[idx];
      const restSec = Number(ex.restSeconds) || Number(ex.sets?.[0]?.rest) || 60;
      const summarySets = (ex.sets || []).map(s => `${s.reps}×${s.weight || 0}kg`).join(' · ');
      const card = el('div', {
        class: 'card',
        id: `ex-card-${idx}`,
        style: isDone ? 'border-color:var(--success)' : ''
      });
      card.innerHTML = `
        <div class="ex-header" style="display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none">
          <span class="ex-chevron" style="color:var(--accent);transition:transform .15s">▶</span>
          <div style="flex:1">
            <div style="font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              ${isDone ? '<span style="color:var(--success)">✓</span>' : ''}
              <span>${ex.name}${ex.combinedName ? ' + ' + ex.combinedName : ''}</span>
              ${techniqueBadge(ex.technique)}
            </div>
            <div class="text-muted" style="font-size:0.8rem;margin-top:2px">${ex.sets.length} séries · ${summarySets || '—'} · descanso ${restSec}s</div>
          </div>
        </div>
        <div class="ex-body" style="display:none;margin-top:12px">
          ${(ex.gifUrl || ex.videoUrl) ? mediaHtml(ex.gifUrl || ex.videoUrl) : ''}
          ${ex.combinedMedia ? mediaHtml(ex.combinedMedia) : ''}
          ${ex.technique && ex.technique !== 'normal' ? `<div class="card note" style="font-size:0.8rem;margin:8px 0">${
            ex.technique === 'drop' ? '📉 <strong>Drop set:</strong> faça a série principal e reduza a carga nos drops sem descanso longo.' :
            ex.technique === 'rest_pause' ? '⏱ <strong>Rest-pause:</strong> vá perto da falha, pause segundos e complete as mini-séries.' :
            ex.technique === 'cluster' ? '🔹 <strong>Cluster:</strong> quebre as reps em blocos com pausa curta entre clusters.' :
            ex.technique === 'combined' ? `🔗 <strong>Combinado:</strong> alterne com <em>${ex.combinedName || 'o 2º exercício'}</em> na mesma série.` : ''
          }</div>` : ''}
          <div class="form-group" style="margin-top:12px">
            <label class="form-label">Dificuldade deste exercício</label>
            <div class="diff-row">
              <button type="button" class="btn btn-sm ${ex.difficulty==='facil'?'btn-primary':'btn-outline'} diff-btn" data-d="facil">Fácil</button>
              <button type="button" class="btn btn-sm ${ex.difficulty==='moderado'?'btn-primary':'btn-outline'} diff-btn" data-d="moderado">Moderado</button>
              <button type="button" class="btn btn-sm ${ex.difficulty==='intenso'?'btn-primary':'btn-outline'} diff-btn" data-d="intenso">Intenso</button>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:6px;padding-left:36px;font-size:0.75rem;color:var(--muted);font-weight:600">
            <div style="width:28px"></div>
            <div style="flex:1">Reps</div>
            <div style="flex:1">Kg</div>
          </div>
          <div class="sets-edit"></div>
          ${started ? `
          <div class="rest-timer-box" style="margin-top:12px;padding:10px;background:var(--elevated);border-radius:var(--radius-sm);text-align:center">
            <div style="font-size:0.75rem;color:var(--muted)">Descanso</div>
            <div class="rest-countdown" data-idx="${idx}" style="font-size:1.4rem;font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums">${restSec}s</div>
            <button type="button" class="btn btn-sm btn-outline btn-start-rest" data-idx="${idx}" style="margin-top:6px">Iniciar descanso (${restSec}s)</button>
          </div>
          <button type="button" class="btn btn-block ${isDone ? 'btn-outline' : 'btn-success'} btn-toggle-done" style="margin-top:12px">
            ${isDone ? '↩ Refazer exercício' : '✓ Concluir exercício'}
          </button>` : `<p class="text-muted" style="font-size:0.8rem;margin-top:8px">Inicie o treino para registrar séries e descanso.</p>`}
        </div>
      `;
      list.appendChild(card);

      const setsEl = card.querySelector('.sets-edit');
      ex.sets.forEach((s, si) => {
        const wrap = document.createElement('div');
        wrap.style.marginBottom = '10px';
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:4px';
        row.innerHTML = `
          <div class="set-num">${si + 1}</div>
          <div style="flex:1"><input type="number" class="form-input" data-field="reps" data-set="${si}" value="${s.reps}" min="0" inputmode="numeric" ${started?'':'disabled'}></div>
          <div style="flex:1"><input type="number" class="form-input" data-field="weight" data-set="${si}" value="${s.weight}" min="0" step="0.5" inputmode="decimal" ${started?'':'disabled'}></div>
        `;
        wrap.appendChild(row);
        let hint = '';
        if (ex.technique === 'drop' && s.drops?.length) {
          hint = 'Drops: ' + s.drops.map(d => `${d.reps} reps @ ${d.weight || '?'} kg`).join(' → ');
        } else if (ex.technique === 'rest_pause') {
          hint = `Rest-pause: ${s.rpRounds || 3} mini-séries · pausa ${s.rpRest || 15}s`;
        } else if (ex.technique === 'cluster') {
          hint = `Cluster: ${s.clusterCount || 3} × ${s.clusterReps || 3} reps · pausa ${s.clusterRest || 15}s`;
        } else if (ex.technique === 'combined' && ex.combinedName) {
          hint = `Depois: ${ex.combinedName}`;
        }
        if (hint) {
          const h = document.createElement('div');
          h.className = 'text-muted';
          h.style.cssText = 'font-size:0.75rem;padding-left:36px';
          h.textContent = hint;
          wrap.appendChild(h);
        }
        setsEl.appendChild(wrap);
      });

      const body = card.querySelector('.ex-body');
      const chevron = card.querySelector('.ex-chevron');
      card.querySelector('.ex-header').onclick = () => {
        const open = body.style.display !== 'none';
        body.style.display = open ? 'none' : 'block';
        chevron.style.transform = open ? '' : 'rotate(90deg)';
      };

      card.querySelectorAll('.diff-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          if (!started) return;
          performed[idx].difficulty = btn.dataset.d;
          persist();
          card.querySelectorAll('.diff-btn').forEach(b => {
            b.className = `btn btn-sm ${b.dataset.d === btn.dataset.d ? 'btn-primary' : 'btn-outline'} diff-btn`;
          });
        };
      });

      card.querySelectorAll('input[data-field]').forEach(inp => {
        const apply = () => {
          const si = +inp.dataset.set;
          performed[idx].sets[si][inp.dataset.field] = parseFloat(inp.value) || 0;
          persist();
          const sum = performed[idx].sets.map(s => `${s.reps}×${s.weight || 0}kg`).join(' · ');
          const meta = card.querySelector('.text-muted');
          if (meta) meta.textContent = `${performed[idx].sets.length} séries · ${sum} · descanso ${restSec}s`;
        };
        inp.addEventListener('input', apply);
      });

      card.querySelector('.btn-start-rest')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const sec = restSec;
        session.restEndsAt = Date.now() + sec * 1000;
        session.restExIdx = idx;
        persist();
        const cd = card.querySelector('.rest-countdown');
        const btn = card.querySelector('.btn-start-rest');
        const tickRest = () => {
          const left = Math.max(0, Math.ceil((session.restEndsAt - Date.now()) / 1000));
          if (cd) cd.textContent = left > 0 ? `${left}s` : 'Pronto!';
          if (left <= 0) {
            if (btn) btn.textContent = `Iniciar descanso (${sec}s)`;
            session.restEndsAt = null;
            persist();
            return;
          }
          requestAnimationFrame(() => setTimeout(tickRest, 200));
        };
        if (btn) btn.textContent = 'Descansando...';
        tickRest();
      });

      // resume rest countdown if active
      if (session.restEndsAt && session.restExIdx === idx) {
        const left = Math.ceil((session.restEndsAt - Date.now()) / 1000);
        if (left > 0) {
          const cd = card.querySelector('.rest-countdown');
          const btn = card.querySelector('.btn-start-rest');
          if (btn) btn.textContent = 'Descansando...';
          const tickRest = () => {
            const l = Math.max(0, Math.ceil((session.restEndsAt - Date.now()) / 1000));
            if (cd) cd.textContent = l > 0 ? `${l}s` : 'Pronto!';
            if (l <= 0) {
              if (btn) btn.textContent = `Iniciar descanso (${restSec}s)`;
              session.restEndsAt = null;
              persist();
              return;
            }
            setTimeout(tickRest, 250);
          };
          tickRest();
        }
      }

      card.querySelector('.btn-toggle-done')?.addEventListener('click', (e) => {
        e.stopPropagation();
        doneMap[idx] = !doneMap[idx];
        persist();
        render();
      });
    });

    $('#btn-start')?.addEventListener('click', () => {
      session.started = true;
      session.startedAt = Date.now();
      persist();
      render();
    });

    $('#btn-cancel')?.addEventListener('click', () => {
      if (!(await confirmDialog('Cancelar este treino? O progresso de hoje será apagado.'))) return;
      stopTimers();
      clearSession();
      toast('Treino cancelado', 'success');
      showStudentHome();
    });

    $('#btn-finish')?.addEventListener('click', async () => {
      try {
        persist();
        const intensity = $('#intensity')?.value || 'moderada';
        const feedback = $('#feedback')?.value.trim() || '';
        const durationSeconds = session.startedAt
          ? Math.round((Date.now() - session.startedAt) / 1000) : 0;
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
          startedAt: session.startedAt
            ? firebase.firestore.Timestamp.fromMillis(session.startedAt)
            : firebase.firestore.Timestamp.now(),
          durationSeconds,
          resolved: false,
          coachReply: null
        });
        stopTimers();
        clearSession();
        toast('Treino concluído! Bom trabalho 💪', 'success');
        showStudentHome();
      } catch (e) {
        console.error(e);
        toast(e.message || 'Erro ao salvar treino', 'error');
      }
    });
  };

  render();
}


async function renderFinanceiroTab(content) {
  let plans = [];
  let students = [];
  try {
    plans = sortPlans(await getPlansOfPersonal(state.user.uid));
    students = await getStudentsOfPersonal(state.user.uid);
  } catch (e) {
    console.error(e);
    toast('Erro ao carregar financeiro', 'error');
  }

  const nameById = {};
  students.forEach(s => { nameById[s.id] = s.name; });

  const pending = plans.filter(p => p.status === 'aguardando');
  const filterSel = content.dataset.finFilter || 'todos';
  const studentFilter = content.dataset.finStudent || '';
  const periodFilter = content.dataset.finPeriod || 'todos';

  const inPeriod = (p) => {
    if (periodFilter === 'todos') return true;
    const ref = p.dueDate || p.createdAt || p.paidAt;
    if (!ref) return periodFilter === 'todos';
    const t = ref.toMillis ? ref.toMillis() : new Date(ref).getTime();
    const now = Date.now();
    const ms = { semana: 7, mes: 30, trimestre: 90, ano: 365 }[periodFilter];
    if (!ms) return true;
    return now - t <= ms * 86400000;
  };

  const filtered = plans.filter(p => {
    if (filterSel === 'aguardando' && p.status !== 'aguardando') return false;
    if (filterSel === 'abertos' && !(p.status === 'pendente' || p.status === 'ativo' || p.status === 'recusado')) return false;
    if (filterSel === 'pagos' && p.status !== 'pago') return false;
    if (studentFilter && p.studentId !== studentFilter) return false;
    if (!inPeriod(p)) return false;
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
    <div class="card" style="margin-bottom:12px">
      <div class="form-group" style="margin-bottom:10px">
        <label class="form-label">Aluno</label>
        <select class="form-select" id="fin-student">
          <option value="">Todos os alunos</option>
          ${students.map(s => `<option value="${s.id}" ${studentFilter===s.id?'selected':''}>${s.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Período</label>
        <select class="form-select" id="fin-period">
          <option value="todos" ${periodFilter==='todos'?'selected':''}>Todo período</option>
          <option value="semana" ${periodFilter==='semana'?'selected':''}>Última semana</option>
          <option value="mes" ${periodFilter==='mes'?'selected':''}>Último mês</option>
          <option value="trimestre" ${periodFilter==='trimestre'?'selected':''}>Último trimestre</option>
          <option value="ano" ${periodFilter==='ano'?'selected':''}>Último ano</option>
        </select>
      </div>
    </div>
    <div class="tabs" style="margin:12px 0" id="fin-filters">
      <button class="tab ${filterSel==='todos'?'active':''}" data-f="todos">Todos</button>
      <button class="tab ${filterSel==='aguardando'?'active':''}" data-f="aguardando">Aguardando</button>
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
  $('#fin-student').onchange = () => {
    content.dataset.finStudent = $('#fin-student').value;
    renderFinanceiroTab(content);
  };
  $('#fin-period').onchange = () => {
    content.dataset.finPeriod = $('#fin-period').value;
    renderFinanceiroTab(content);
  };

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
    } else if (st === 'pendente' || st === 'ativo' || st === 'recusado') {
      const studentName = nameById[pl.studentId] || 'aluno';
      const studentPhone = (students.find(s => s.id === pl.studentId) || {}).phone;
      const waKey = `wa_sent_${pl.id}`;
      const alreadySent = localStorage.getItem(waKey) === '1';
      const msg = `Olá ${studentName}! Tudo bem? 😊\n\nPassando para lembrar da fatura *${pl.name}* no valor de *R$ ${Number(pl.value||0).toFixed(2)}*${pl.dueDate ? `, com vencimento em ${formatDate(pl.dueDate)}` : ''}.\n\nQuando puder, me avisa por aqui ou sinaliza o pagamento no app. Qualquer dúvida estou à disposição!`;

      const actions = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-top:12px' });
      actions.appendChild(el('button', {
        class: 'btn btn-sm btn-success',
        text: 'Marcar como pago',
        onClick: async () => {
          await markPlanPaid(pl.id);
          toast('Marcado como pago', 'success');
          renderFinanceiroTab(content);
        }
      }));
      actions.appendChild(el('button', {
        class: 'btn btn-sm btn-outline',
        style: alreadySent ? 'opacity:0.45' : '',
        text: alreadySent ? 'WhatsApp (enviado)' : 'WhatsApp cobrança',
        onClick: () => {
          if (!studentPhone) return toast('Cadastre o telefone do aluno no perfil dele', 'error');
          if (openWhatsApp(studentPhone, msg)) {
            localStorage.setItem(waKey, '1');
            toast('Abrindo WhatsApp...', 'success');
            renderFinanceiroTab(content);
          }
        }
      }));
      card.appendChild(actions);
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
async function showCompletedReport(completed, prevTonnage) {
  const m = calcWorkoutMetrics(completed);
  const diffLabel = { facil: 'Fácil', moderado: 'Moderado', intenso: 'Intenso', leve: 'Leve', moderada: 'Moderada', intensa: 'Intensa' };
  const color = tonnageColor(m.tonnage, prevTonnage);
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
          <div class="stat-card"><div class="stat-value" style="color:${color}">${m.tonnage}</div><div class="stat-label">Tonelagem</div></div>
        </div>
        ${prevTonnage != null ? `<div style="margin-top:8px;font-size:0.85rem;color:var(--muted)">Anterior: ${prevTonnage} kg·rep ${m.tonnage > prevTonnage ? '<span style="color:var(--success)">↑</span>' : m.tonnage < prevTonnage ? '<span style="color:var(--danger)">↓</span>' : '→'}</div>` : ''}
        <div style="margin-top:8px">Intensidade geral: <strong>${diffLabel[completed.intensity] || completed.intensity || '—'}</strong></div>
        ${completed.feedback ? `<div style="margin-top:8px"><strong>Seu feedback:</strong> ${completed.feedback}</div>` : ''}
        ${completed.coachReply ? `<div class="card note note-accent" style="margin-top:10px"><strong>Resposta do personal:</strong><br>${completed.coachReply}</div>` : ''}
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

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  if (next === 'light') document.documentElement.dataset.theme = 'light';
  else delete document.documentElement.dataset.theme;
  localStorage.setItem('theme', next === 'light' ? 'light' : 'dark');
  toast(next === 'light' ? 'Tema claro' : 'Tema escuro', 'success');
}

async function exportPersonalBackup() {
  try {
    toast('Gerando backup...', 'success');
    const students = await getStudentsOfPersonal(state.user.uid);
    const exercises = await getExercises(state.user.uid);
    const plans = await getPlansOfPersonal(state.user.uid);
    const data = {
      exportedAt: new Date().toISOString(),
      personal: { uid: state.user.uid, name: state.profile.name, email: state.profile.email },
      students,
      exercises,
      plans
    };
    // rotinas por aluno
    data.routines = {};
    data.workouts = {};
    for (const s of students) {
      const rts = await getRoutinesOfStudent(s.id, { personalId: state.user.uid });
      data.routines[s.id] = rts;
      for (const r of rts) {
        data.workouts[r.id] = await getWorkoutsOfRoutine(r.id, { personalId: state.user.uid });
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `edmilson-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Backup baixado', 'success');
  } catch (e) {
    console.error(e);
    toast('Erro ao exportar', 'error');
  }
}

/** Progressão de carga por exercício (kg médio por treino) */
function buildExerciseProgression(completed, exerciseName) {
  const points = [];
  const chrono = [...completed].reverse();
  chrono.forEach(c => {
    const ex = (c.exercisesPerformed || []).find(e => e.name === exerciseName);
    if (!ex || !ex.sets?.length) return;
    const loads = ex.sets.map(s => Number(s.weight) || 0).filter(w => w > 0);
    if (!loads.length) return;
    const avg = loads.reduce((a, b) => a + b, 0) / loads.length;
    const max = Math.max(...loads);
    points.push({
      date: c.finishedAt,
      avg: Math.round(avg * 10) / 10,
      max,
      workoutName: c.workoutName
    });
  });
  return points;
}

function showExerciseProgression(completed) {
  const names = [...new Set(completed.flatMap(c => (c.exercisesPerformed || []).map(e => e.name)).filter(Boolean))].sort();
  const app = $('#app');
  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-back">←</button>
      <div class="title" style="flex:1;text-align:center">Progressão por exercício</div>
      <div style="width:40px"></div>
    </header>
    <div class="page">
      <div class="form-group">
        <label class="form-label">Exercício</label>
        <select class="form-select" id="prog-ex">
          <option value="">Selecione...</option>
          ${names.map(n => `<option value="${n}">${n}</option>`).join('')}
        </select>
      </div>
      <div id="prog-chart" class="card"></div>
      <div id="prog-list"></div>
    </div>
  `;
  $('#btn-back').onclick = () => showStudentHome();
  $('#prog-ex').onchange = () => {
    const name = $('#prog-ex').value;
    const pts = buildExerciseProgression(completed, name);
    const box = $('#prog-chart');
    const list = $('#prog-list');
    if (!pts.length) {
      box.innerHTML = '<p class="text-muted">Sem dados de carga para este exercício</p>';
      list.innerHTML = '';
      return;
    }
    // mini chart de carga máxima
    const vals = pts.map(p => p.max);
    const w = 320, h = 100, pad = 20;
    const maxV = Math.max(...vals, 1);
    const line = vals.map((v, i) => {
      const x = pad + (i / Math.max(vals.length - 1, 1)) * (w - pad * 2);
      const y = h - pad - (v / maxV) * (h - pad * 2);
      return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    box.innerHTML = `
      <div style="font-size:0.8rem;color:var(--muted);margin-bottom:6px">Carga máxima (kg) ao longo do tempo</div>
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="100">
        <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
      </svg>
      <div style="display:flex;justify-content:space-between;font-size:0.8rem">
        <span>Início: ${vals[0]} kg</span>
        <span style="color:${vals[vals.length-1] > vals[0] ? 'var(--success)' : 'var(--text)'}">Agora: ${vals[vals.length-1]} kg</span>
      </div>`;
    list.innerHTML = '';
    [...pts].reverse().forEach(p => {
      list.appendChild(el('div', { class: 'card' }, [
        el('div', { style: 'font-weight:600', text: `${p.max} kg (média ${p.avg})` }),
        el('div', { class: 'text-muted', style: 'font-size:0.8rem', text: `${formatDateTime(p.date)} · ${p.workoutName || ''}` })
      ]));
    });
  };
}


async function showPersonalChatHub(studentsList = null) {
  let students = studentsList;
  if (!students) {
    try { students = await getStudentsOfPersonal(state.user.uid); } catch { students = []; }
  }
  const app = $('#app');
  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-back">←</button>
      <div class="title" style="flex:1;text-align:center">Mensagens</div>
      <div style="width:40px"></div>
    </header>
    <div class="page">
      <p class="text-muted" style="font-size:0.85rem;margin-bottom:12px">Selecione um aluno para conversar. Mensagens somem em 2 dias.</p>
      <div class="form-group" style="margin-bottom:12px">
        <input type="search" class="form-input" id="chat-search" placeholder="🔍 Buscar aluno..." autocomplete="off">
      </div>
      <div id="chat-student-list"></div>
    </div>
  `;
  $('#btn-back').onclick = () => showPersonalHome();
  const list = $('#chat-student-list');
  const render = (items) => {
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = `<div class="empty"><p>Nenhum aluno</p></div>`;
      return;
    }
    items.forEach(s => {
      list.appendChild(el('div', {
        class: 'student-card',
        onClick: () => showChat(s)
      }, [
        s.photoURL ? el('img', { class: 'avatar', src: s.photoURL, style: 'object-fit:cover' }) : el('div', { class: 'avatar', text: initials(s.name) }),
        el('div', { class: 'student-info' }, [
          el('div', { class: 'student-name', text: s.name }),
          el('div', { class: 'student-meta', text: s.phone || s.email || '' })
        ]),
        el('div', { html: '💬', style: 'font-size:1.2rem' })
      ]));
    });
  };
  render(students);
  $('#chat-search').oninput = () => {
    const q = ($('#chat-search').value || '').trim().toLowerCase();
    if (!q) return render(students);
    render(students.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    ));
  };
}

async function showWorkoutLibrary() {
  const templates = await getWorkoutTemplates(state.user.uid);
  const app = $('#app');
  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-back">←</button>
      <div class="title" style="flex:1;text-align:center">Modelos de treino</div>
      <div style="width:40px"></div>
    </header>
    <div class="page">
      <p class="text-muted" style="font-size:0.85rem;margin-bottom:12px">Crie treinos genéricos e atribua depois a qualquer aluno.</p>
      <button class="btn btn-primary btn-block" id="btn-new-tpl" style="margin-bottom:16px">+ Novo modelo</button>
      <div id="tpl-list"></div>
    </div>
  `;
  $('#btn-back').onclick = () => showPersonalHome();
  $('#btn-new-tpl').onclick = () => showCreateTemplate();
  const list = $('#tpl-list');
  if (!templates.length) {
    list.innerHTML = `<div class="empty"><p>Nenhum modelo ainda</p></div>`;
    return;
  }
  templates.forEach(tpl => {
    list.appendChild(el('div', { class: 'card' }, [
      el('div', { style: 'font-weight:700', text: tpl.name }),
      el('div', { class: 'text-muted', style: 'font-size:0.8rem', text: `${(tpl.exercises||[]).length} exercícios` }),
      el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px' }, [
        el('button', {
          class: 'btn btn-sm btn-primary',
          text: 'Atribuir a aluno',
          onClick: () => assignTemplateToStudent(tpl)
        }),
        el('button', {
          class: 'btn btn-sm btn-outline',
          text: 'Editar',
          onClick: () => showTemplateEditor(tpl)
        }),
        el('button', {
          class: 'btn btn-sm btn-outline',
          style: 'color:var(--danger);border-color:var(--danger)',
          text: 'Excluir',
          onClick: async () => {
            if (!(await confirmDialog(`Excluir modelo "${tpl.name}"?`))) return;
            await deleteWorkoutTemplate(tpl.id);
            toast('Modelo excluído', 'success');
            showWorkoutLibrary();
          }
        })
      ])
    ]));
  });
}

async function showCreateTemplate() {
  const name = await promptDialog('Novo modelo de treino', 'Nome do treino', 'Upper A');
  if (name === null) return;
  if (!name.trim()) return toast('Nome obrigatório', 'error');
  const id = await createWorkoutTemplate({
    personalId: state.user.uid,
    name: name.trim(),
    exercises: []
  });
  toast('Modelo criado — adicione exercícios', 'success');
  const tpl = { id, personalId: state.user.uid, name: name.trim(), exercises: [] };
  showTemplateEditor(tpl);
}

async function showTemplateEditor(tpl) {
  const allExercises = await getExercises(state.user.uid);
  const app = $('#app');
  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-back">←</button>
      <div class="title" style="flex:1;text-align:center">${tpl.name}</div>
      <button class="icon-btn" id="btn-rename-tpl" title="Renomear">✎</button>
    </header>
    <div class="page">
      <button class="btn btn-primary btn-block" id="btn-add-ex" style="margin-bottom:16px">+ Adicionar exercício</button>
      <div id="tpl-exs"></div>
      <button class="btn btn-outline btn-block" id="btn-assign" style="margin-top:16px">Atribuir a um aluno</button>
    </div>
  `;
  $('#btn-back').onclick = () => showWorkoutLibrary();
  $('#btn-rename-tpl').onclick = async () => {
    const n = await promptDialog('Renomear modelo', 'Nome', tpl.name);
    if (n === null || !n.trim()) return;
    await updateWorkoutTemplate(tpl.id, { name: n.trim() });
    tpl.name = n.trim();
    toast('Renomeado', 'success');
    showTemplateEditor(tpl);
  };
  $('#btn-assign').onclick = () => assignTemplateToStudent(tpl);
  $('#btn-add-ex').onclick = () => {
    if (!allExercises.length) return toast('Cadastre exercícios na biblioteca primeiro', 'error');
    const listHtml = allExercises.map(ex => `
      <div class="student-card" data-id="${ex.id}" style="cursor:pointer">
        <div class="student-info">
          <div class="student-name">${ex.name}</div>
          <div class="student-meta">${ex.muscleGroup || ''}</div>
        </div>
      </div>`).join('');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `<div class="modal"><div class="modal-header"><div class="modal-title">Escolher exercício</div><button class="icon-btn" id="close-modal">✕</button></div><div style="max-height:60vh;overflow-y:auto">${listHtml}</div></div>`;
    document.body.appendChild(overlay);
    $('#close-modal').onclick = () => overlay.remove();
    overlay.querySelectorAll('.student-card').forEach(card => {
      card.onclick = async () => {
        const ex = allExercises.find(e => e.id === card.dataset.id);
        if (!tpl.exercises) tpl.exercises = [];
        tpl.exercises.push({
          exerciseId: ex.id,
          name: ex.name,
          muscleGroup: ex.muscleGroup || '',
          videoUrl: ex.videoUrl || '',
          gifUrl: ex.gifUrl || '',
          notes: ex.notes || '',
          technique: 'normal',
          sets: [{ reps: '10', weight: '0', rest: '60' }]
        });
        await updateWorkoutTemplate(tpl.id, { exercises: tpl.exercises });
        toast('Exercício adicionado', 'success');
        overlay.remove();
        showTemplateEditor(tpl);
      };
    });
  };
  const list = $('#tpl-exs');
  if (!(tpl.exercises || []).length) {
    list.innerHTML = `<div class="empty"><p>Nenhum exercício</p></div>`;
    return;
  }
  tpl.exercises.forEach((ex, idx) => {
    list.appendChild(el('div', { class: 'card' }, [
      el('div', { style: 'font-weight:600', text: ex.name }),
      el('div', { class: 'text-muted', style: 'font-size:0.8rem', text: `${(ex.sets||[]).length} séries · ${ex.technique || 'normal'}` }),
      el('div', { style: 'display:flex;gap:8px;margin-top:8px' }, [
        el('button', {
          class: 'btn btn-sm btn-outline',
          text: 'Séries',
          onClick: () => {
            // reutiliza editor de séries com fake routine/student
            const fakeW = { id: tpl.id, exercises: tpl.exercises, name: tpl.name };
            showEditSets(ex, idx, fakeW, { id: 'tpl' }, { id: 'tpl' });
            // monkey: after save, updateWorkout is called - need special path
            // Override: patch updateWorkout calls for template - handled below by intercepting
          }
        }),
        el('button', {
          class: 'btn btn-sm btn-outline',
          style: 'color:var(--danger)',
          text: 'Remover',
          onClick: async () => {
            if (!(await confirmDialog('Remover exercício do modelo?'))) return;
            tpl.exercises.splice(idx, 1);
            await updateWorkoutTemplate(tpl.id, { exercises: tpl.exercises });
            showTemplateEditor(tpl);
          }
        })
      ])
    ]));
  });
}

// Monkey-patch: when editing sets of a template, showEditSets calls updateWorkout
// Better approach: save template sets in showEditSets if routine.id === 'tpl'
async function assignTemplateToStudent(tpl) {
  const students = await getStudentsOfPersonal(state.user.uid);
  if (!students.length) return toast('Cadastre alunos primeiro', 'error');
  const options = {};
  students.forEach(s => { options[s.id] = s.name; });
  let studentId;
  if (typeof Swal !== 'undefined') {
    const r = await Swal.fire({
      title: 'Atribuir a aluno',
      input: 'select',
      inputOptions: options,
      inputPlaceholder: 'Selecione o aluno',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f59e0b'
    });
    if (!r.isConfirmed || !r.value) return;
    studentId = r.value;
  } else {
    studentId = students[0].id;
  }
  const student = students.find(s => s.id === studentId);
  let routines = await getRoutinesOfStudent(studentId, { personalId: state.user.uid });
  let routineId;
  if (routines.length) {
    const ropts = {};
    routines.forEach(r => { ropts[r.id] = r.name; });
    ropts['__new__'] = '+ Criar nova rotina';
    if (typeof Swal !== 'undefined') {
      const r = await Swal.fire({
        title: 'Rotina de destino',
        input: 'select',
        inputOptions: ropts,
        showCancelButton: true,
        confirmButtonText: 'Atribuir',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#f59e0b'
      });
      if (!r.isConfirmed) return;
      routineId = r.value;
    } else {
      routineId = routines[0].id;
    }
  } else {
    routineId = '__new__';
  }
  if (routineId === '__new__') {
    const rn = await promptDialog('Nome da nova rotina', '', 'Rotina principal');
    if (rn === null) return;
    routineId = await createRoutine({
      name: rn.trim() || 'Rotina',
      personalId: state.user.uid,
      studentId
    });
  }
  await createWorkout({
    routineId,
    personalId: state.user.uid,
    studentId,
    name: tpl.name,
    order: 0,
    exercises: JSON.parse(JSON.stringify(tpl.exercises || [])),
    startDate: firebase.firestore.Timestamp.now(),
    endDate: null
  });
  toast(`Treino "${tpl.name}" atribuído a ${student.name}`, 'success');
}

async function copyWorkoutBetweenStudents(workout, sourceStudent, sourceRoutine) {
  const students = await getStudentsOfPersonal(state.user.uid);
  const others = students.filter(s => s.id !== sourceStudent.id);
  if (!others.length) return toast('Não há outro aluno para copiar', 'error');
  const options = {};
  others.forEach(s => { options[s.id] = s.name; });
  const mode = typeof Swal !== 'undefined'
    ? (await Swal.fire({
        title: workout.name,
        text: 'Copiar mantém o original. Cortar move o treino.',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Copiar',
        denyButtonText: 'Cortar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#f59e0b',
        denyButtonColor: '#dc2626'
      }))
    : { isConfirmed: true };
  if (mode.isDismissed) return;
  const cut = mode.isDenied === true;
  let targetId;
  if (typeof Swal !== 'undefined') {
    const r = await Swal.fire({
      title: cut ? 'Cortar para aluno' : 'Copiar para aluno',
      input: 'select',
      inputOptions: options,
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f59e0b'
    });
    if (!r.isConfirmed || !r.value) return;
    targetId = r.value;
  } else {
    targetId = others[0].id;
  }
  const target = others.find(s => s.id === targetId);
  let routines = await getRoutinesOfStudent(targetId, { personalId: state.user.uid });
  let routineId;
  if (routines.length) {
    const ropts = {};
    routines.forEach(r => { ropts[r.id] = r.name; });
    ropts['__new__'] = '+ Nova rotina';
    if (typeof Swal !== 'undefined') {
      const r = await Swal.fire({
        title: 'Rotina de destino',
        input: 'select',
        inputOptions: ropts,
        showCancelButton: true,
        confirmButtonText: 'OK',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#f59e0b'
      });
      if (!r.isConfirmed) return;
      routineId = r.value;
    } else routineId = routines[0].id;
  } else routineId = '__new__';
  if (routineId === '__new__') {
    const rn = await promptDialog('Nome da rotina', '', 'Rotina principal');
    if (rn === null) return;
    routineId = await createRoutine({
      name: rn.trim() || 'Rotina',
      personalId: state.user.uid,
      studentId: targetId
    });
  }
  await copyWorkoutToStudent(workout, targetId, routineId, state.user.uid, {
    cut,
    sourceWorkoutId: cut ? workout.id : null
  });
  toast(cut ? `Treino movido para ${target.name}` : `Treino copiado para ${target.name}`, 'success');
  if (cut) showRoutineDetail(sourceRoutine, sourceStudent);
}

async function showChat(student) {
  const isPersonal = state.profile.role === 'personal';
  const personalId = isPersonal ? state.user.uid : state.profile.personalId;
  const studentId = isPersonal ? student.id : state.user.uid;
  const peerName = isPersonal ? student.name : 'Personal';

  const app = $('#app');
  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-back">←</button>
      <div class="title" style="flex:1;text-align:center">Chat · ${peerName}</div>
      <div style="width:40px"></div>
    </header>
    <div class="page" style="padding-bottom:80px;display:flex;flex-direction:column">
      <div class="alert-danger" style="font-size:0.8rem;margin-bottom:12px">
        Mensagens são apagadas automaticamente após <strong>2 dias</strong>. Não use para dados sensíveis permanentes.
      </div>
      <div id="chat-list" style="flex:1;overflow-y:auto;max-height:55vh;margin-bottom:12px"></div>
      <div style="display:flex;gap:8px">
        <input type="text" class="form-input" id="chat-input" placeholder="Mensagem..." maxlength="500" style="flex:1">
        <button class="btn btn-primary" id="chat-send">Enviar</button>
      </div>
    </div>
  `;
  $('#btn-back').onclick = () => isPersonal ? showStudentDetail(student) : showStudentHome();

  const render = async () => {
    const msgs = await getChatMessages(personalId, studentId);
    const list = $('#chat-list');
    list.innerHTML = '';
    if (!msgs.length) {
      list.innerHTML = `<p class="text-muted" style="text-align:center">Nenhuma mensagem</p>`;
      return;
    }
    msgs.forEach(m => {
      const mine = m.fromUid === state.user.uid;
      list.appendChild(el('div', {
        style: `margin-bottom:8px;padding:10px 12px;border-radius:12px;max-width:85%;${mine ? 'margin-left:auto;background:var(--accent);color:#0f172a' : 'background:var(--elevated)'}`
      }, [
        el('div', { style: 'font-size:0.9rem', text: m.text }),
        el('div', { style: `font-size:0.7rem;margin-top:4px;opacity:0.7`, text: formatDateTime(m.createdAt) })
      ]));
    });
    list.scrollTop = list.scrollHeight;
  };
  await render();

  const send = async () => {
    const textMsg = $('#chat-input').value.trim();
    if (!textMsg) return;
    await sendChatMessage({ personalId, studentId, fromUid: state.user.uid, text: textMsg });
    $('#chat-input').value = '';
    await render();
  };
  $('#chat-send').onclick = send;
  bindEnter('#chat-input', send);
}

// ---------- START ----------
boot().catch(console.error);
