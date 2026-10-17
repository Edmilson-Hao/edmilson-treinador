// =====================================================
// CAMADA DE DADOS - Firestore
// Queries simplificadas (sem índice composto no MVP)
// =====================================================

import { toast } from './utils.js';
import { guard } from './rateLimit.js';

let db = null;
let auth = null;

const LIMITS = {
  students: 25,      // ~10 no MVP; margem
  exercises: 150,
  routines: 15,
  workouts: 25,
  completed: 30,
  feedbacks: 30,
  plans: 25,
  anamneses: 10,
  reminders: 20,
  chat: 40
};

export function initDb(firestore, authInstance) {
  db = firestore;
  auth = authInstance;
}

function col(name) {
  return db.collection(name);
}

function sortBy(arr, key, dir = 'asc') {
  return [...arr].sort((a, b) => {
    const va = a[key] ?? '';
    const vb = b[key] ?? '';
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

// ---------- USERS ----------
export async function getUser(uid) {
  guard('getUser', 15, 10000);
  const snap = await col('users').doc(uid).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

export async function createUser(uid, data) {
  guard('createUser', 3, 30000);
  await col('users').doc(uid).set({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
  });
}

export async function updateUser(uid, data) {
  guard('updateUser', 10, 10000);
  await col('users').doc(uid).set({
    ...data,
    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

export async function findPersonalByInviteCode(code) {
  guard('findInvite', 5, 30000);
  // role + inviteCode alinha com rules de list (só personals)
  try {
    const snap = await col('users')
      .where('role', '==', 'personal')
      .where('inviteCode', '==', code.toUpperCase())
      .limit(1)
      .get();
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() };
    }
  } catch (e) {
    console.warn('findInvite composite', e);
  }
  return null;
}

export async function getStudentsOfPersonal(personalId) {
  guard('listStudents', 6, 20000, true);
  const snap = await col('users')
    .where('personalId', '==', personalId)
    .where('role', '==', 'aluno')
    .limit(LIMITS.students)
    .get();
  const list = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(u => u.role === 'aluno');
  return sortBy(list, 'name');
}

// ---------- EXERCISES ----------
export async function getExercises(personalId, { includeGlobal = true } = {}) {
  guard('listExercises', 8, 12000);
  // Lista personalizada do personal
  const snap = await col('exercises')
    .where('personalId', '==', personalId)
    .limit(LIMITS.exercises)
    .get();
  let list = snap.docs.map(d => ({ id: d.id, ...d.data(), listType: 'personalizada' }));

  // Lista padrão (global) — personalId especial "__global__"
  if (includeGlobal) {
    try {
      const gSnap = await col('exercises')
        .where('personalId', '==', '__global__')
        .limit(LIMITS.exercises)
        .get();
      const globals = gSnap.docs.map(d => ({ id: d.id, ...d.data(), listType: 'padrao' }));
      list = [...globals, ...list];
    } catch (e) {
      console.warn('global exercises', e);
    }
  }
  // dedupe by id
  const seen = new Set();
  list = list.filter(x => (seen.has(x.id) ? false : (seen.add(x.id), true)));
  return sortBy(list, 'name');
}

export async function getGlobalExercises() {
  guard('listGlobalEx', 6, 15000);
  const snap = await col('exercises')
    .where('personalId', '==', '__global__')
    .limit(LIMITS.exercises)
    .get();
  return sortBy(snap.docs.map(d => ({ id: d.id, ...d.data(), listType: 'padrao' })), 'name');
}

export async function createExercise(data) {
  guard('createExercise', 10, 20000);
  const ref = await col('exercises').add({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

export async function updateExercise(id, data) {
  guard('updateExercise', 15, 15000);
  await col('exercises').doc(id).update(data);
}

export async function deleteExercise(id) {
  guard('deleteExercise', 8, 20000);
  await col('exercises').doc(id).delete();
}

// ---------- ROUTINES ----------
export async function getRoutinesOfStudent(studentId, opts = {}) {
  guard('listRoutines', 8, 12000);
  // Personal DEVE filtrar por personalId (rules de list)
  let q;
  if (opts.personalId) {
    q = col('routines').where('personalId', '==', opts.personalId).where('studentId', '==', studentId);
  } else {
    q = col('routines').where('studentId', '==', studentId);
  }
  const snap = await q.limit(LIMITS.routines).get();
  const list = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r => r.archived !== true);
  return sortBy(list, 'order');
}

export async function createRoutine(data) {
  guard('createRoutine', 8, 20000);
  const ref = await col('routines').add({
    archived: false,
    order: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    ...data
  });
  return ref.id;
}

export async function updateRoutine(id, data) {
  guard('updateRoutine', 12, 15000);
  await col('routines').doc(id).update(data);
}

export async function archiveRoutine(id) {
  guard('archiveRoutine', 8, 20000);
  await col('routines').doc(id).update({ archived: true });
}

// ---------- WORKOUTS ----------
export async function getWorkoutsOfRoutine(routineId, opts = {}) {
  guard('listWorkouts', 10, 12000);
  // Firestore exige filtro por studentId OU personalId nas rules de list
  let q = col('workouts').where('routineId', '==', routineId);
  if (opts.studentId) {
    q = col('workouts').where('studentId', '==', opts.studentId).where('routineId', '==', routineId);
  } else if (opts.personalId) {
    q = col('workouts').where('personalId', '==', opts.personalId).where('routineId', '==', routineId);
  }
  const snap = await q.limit(LIMITS.workouts).get();
  return sortBy(snap.docs.map(d => ({ id: d.id, ...d.data() })), 'order');
}

export async function createWorkout(data) {
  guard('createWorkout', 10, 20000);
  const ref = await col('workouts').add({
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    ...data
  });
  return ref.id;
}

export async function updateWorkout(id, data) {
  guard('updateWorkout', 20, 15000);
  await col('workouts').doc(id).update(data);
}

export async function deleteWorkout(id) {
  guard('deleteWorkout', 8, 20000);
  await col('workouts').doc(id).delete();
}

// ---------- WORKOUT TEMPLATES (biblioteca) ----------
export async function getWorkoutTemplates(personalId) {
  guard('listTemplates', 8, 15000);
  const snap = await col('workoutTemplates')
    .where('personalId', '==', personalId)
    .limit(50)
    .get();
  return sortBy(snap.docs.map(d => ({ id: d.id, ...d.data() })), 'name');
}

export async function createWorkoutTemplate(data) {
  guard('createTemplate', 8, 20000);
  const ref = await col('workoutTemplates').add({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

export async function updateWorkoutTemplate(id, data) {
  guard('updateTemplate', 10, 15000);
  await col('workoutTemplates').doc(id).update(data);
}

export async function deleteWorkoutTemplate(id) {
  guard('deleteTemplate', 8, 20000);
  await col('workoutTemplates').doc(id).delete();
}

/** Copia treino (exercícios) para rotina de outro aluno */
export async function copyWorkoutToStudent(workout, targetStudentId, targetRoutineId, personalId, { cut = false, sourceWorkoutId = null } = {}) {
  guard('copyWorkout', 5, 30000);
  const id = await createWorkout({
    routineId: targetRoutineId,
    personalId,
    studentId: targetStudentId,
    name: workout.name,
    order: workout.order || 0,
    exercises: workout.exercises || [],
    startDate: workout.startDate || null,
    endDate: workout.endDate || null
  });
  if (cut && sourceWorkoutId) {
    await deleteWorkout(sourceWorkoutId);
  }
  return id;
}


/** Clona rotina + treinos para o mesmo aluno ou outro */
export async function cloneRoutine(routineId, targetStudentId, personalId) {
  guard('cloneRoutine', 3, 60000);
  const rDoc = await col('routines').doc(routineId).get();
  if (!rDoc.exists) throw new Error('Rotina não encontrada');
  const r = rDoc.data();
  const newId = await createRoutine({
    name: (r.name || 'Rotina') + ' (cópia)',
    personalId,
    studentId: targetStudentId,
    order: r.order || 0,
    notes: r.notes || null
  });
  const workouts = await getWorkoutsOfRoutine(routineId, { personalId });
  for (const w of workouts) {
    await createWorkout({
      routineId: newId,
      personalId,
      studentId: targetStudentId,
      name: w.name,
      order: w.order || 0,
      exercises: w.exercises || [],
      startDate: w.startDate || null,
      endDate: w.endDate || null
    });
  }
  return newId;
}

/** Remove coachReply de treinos com endDate passado (limpeza) */
export async function cleanupExpiredCoachReplies(personalId) {
  guard('cleanupReplies', 2, 60000);
  const snap = await col('workouts')
    .where('personalId', '==', personalId)
    .limit(100)
    .get();
  const now = Date.now();
  let cleaned = 0;
  for (const d of snap.docs) {
    const w = d.data();
    const end = w.endDate?.toMillis?.();
    if (!end || end > now) continue;
    // limpa replies ligadas a este workoutId
    const cs = await col('completedWorkouts')
      .where('workoutId', '==', d.id)
      .limit(30)
      .get();
    for (const c of cs.docs) {
      if (c.data().coachReply) {
        await c.ref.update({
          coachReply: firebase.firestore.FieldValue.delete(),
          coachReplyAt: firebase.firestore.FieldValue.delete(),
          coachReplyRead: firebase.firestore.FieldValue.delete()
        });
        cleaned++;
      }
    }
  }
  return cleaned;
}

// ---------- CHAT (TTL 2 dias no cliente) ----------
export async function sendChatMessage({ personalId, studentId, fromUid, text }) {
  guard('chatSend', 10, 60000, true);
  const ref = await col('chatMessages').add({
    personalId,
    studentId,
    fromUid,
    text: String(text).slice(0, 500),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

export async function getChatMessages(personalId, studentId, limit = 50) {
  guard('chatList', 8, 15000, true);
  const snap = await col('chatMessages')
    .where('personalId', '==', personalId)
    .where('studentId', '==', studentId)
    .limit(limit)
    .get();
  const twoDays = Date.now() - 2 * 86400000;
  const list = [];
  for (const d of snap.docs) {
    const data = d.data();
    const t = data.createdAt?.toMillis?.() || 0;
    if (t && t < twoDays) {
      // apaga mensagens velhas
      d.ref.delete().catch(() => {});
      continue;
    }
    list.push({ id: d.id, ...data });
  }
  return list.sort((a, b) => (a.createdAt?.toMillis?.()||0) - (b.createdAt?.toMillis?.()||0));
}

// ---------- REMINDERS ----------
export async function upsertReminder(data) {
  guard('reminder', 10, 15000);
  if (data.id) {
    const { id, ...rest } = data;
    await col('reminders').doc(id).update(rest);
    return id;
  }
  const ref = await col('reminders').add({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

export async function getRemindersForStudent(studentId) {
  guard('listReminders', 8, 12000);
  const snap = await col('reminders').where('studentId', '==', studentId).limit(20).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getRemindersForPersonal(personalId) {
  guard('listRemindersP', 8, 12000);
  const snap = await col('reminders').where('personalId', '==', personalId).limit(50).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


// ---------- COMPLETED WORKOUTS ----------
export async function saveCompletedWorkout(data) {
  guard('saveCompleted', 4, 60000, true);
  const ref = await col('completedWorkouts').add({
    ...data,
    finishedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

export async function getCompletedByStudent(studentId, limit = 30, opts = {}) {
  guard('listCompleted', 8, 12000);
  let q;
  if (opts.personalId) {
    q = col('completedWorkouts').where('personalId', '==', opts.personalId).where('studentId', '==', studentId);
  } else {
    q = col('completedWorkouts').where('studentId', '==', studentId);
  }
  const snap = await q.limit(Math.min(limit, LIMITS.completed)).get();
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // ordena no cliente (mais recente primeiro)
  return list.sort((a, b) => {
    const ta = a.finishedAt?.toMillis?.() || 0;
    const tb = b.finishedAt?.toMillis?.() || 0;
    return tb - ta;
  });
}

export async function getFeedbacksForPersonal(personalId, onlyUnresolved = true) {
  guard('listFeedbacks', 6, 15000);
  const snap = await col('completedWorkouts')
    .where('personalId', '==', personalId)
    .limit(LIMITS.feedbacks)
    .get();
  let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (onlyUnresolved) list = list.filter(f => !f.resolved);
  return list.sort((a, b) => {
    const ta = a.finishedAt?.toMillis?.() || 0;
    const tb = b.finishedAt?.toMillis?.() || 0;
    return tb - ta;
  });
}

export async function resolveFeedback(id, coachReply = '') {
  guard('resolveFeedback', 15, 15000);
  const data = {
    resolved: true,
    resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
    coachReplyRead: false
  };
  if (coachReply) {
    data.coachReply = coachReply;
    data.coachReplyAt = firebase.firestore.FieldValue.serverTimestamp();
  }
  await col('completedWorkouts').doc(id).update(data);
}

export async function markCoachReplyRead(id) {
  guard('markReplyRead', 20, 10000);
  await col('completedWorkouts').doc(id).update({
    coachReplyRead: true,
    coachReplyReadAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ---------- PLANS ----------
export async function getPlansOfStudent(studentId, opts = {}) {
  guard('listPlans', 8, 12000);
  let q;
  if (opts.personalId) {
    q = col('plans').where('personalId', '==', opts.personalId).where('studentId', '==', studentId);
  } else {
    q = col('plans').where('studentId', '==', studentId);
  }
  const snap = await q.limit(LIMITS.plans).get();
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return list.sort((a, b) => {
    const ta = a.dueDate?.toMillis?.() || 0;
    const tb = b.dueDate?.toMillis?.() || 0;
    return tb - ta;
  });
}

export async function createPlan(data) {
  guard('createPlan', 8, 20000);
  const ref = await col('plans').add({
    status: 'ativo',
    paidAt: null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    ...data
  });
  return ref.id;
}

export async function markPlanPaid(id) {
  guard('markPaid', 10, 15000);
  await col('plans').doc(id).update({
    status: 'pago',
    paidAt: firebase.firestore.FieldValue.serverTimestamp(),
    studentClaimedAt: null
  });
}

export async function updatePlan(id, data) {
  guard('updatePlan', 12, 15000);
  await col('plans').doc(id).update(data);
}

/** Aluno sinaliza que pagou */
export async function studentClaimPaid(id) {
  guard('claimPaid', 5, 30000);
  await col('plans').doc(id).update({
    status: 'aguardando',
    studentClaimedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/** Personal rejeita o sinal de pagamento do aluno */
export async function rejectPlanClaim(id) {
  guard('rejectPaid', 10, 15000);
  await col('plans').doc(id).update({
    status: 'pendente',
    studentClaimedAt: null
  });
}

/** Todos os planos do personal (financeiro) */
export async function getPlansOfPersonal(personalId) {
  guard('listPlansPersonal', 6, 15000);
  const snap = await col('plans')
    .where('personalId', '==', personalId)
    .limit(LIMITS.plans * 5)
    .get();
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return list.sort((a, b) => {
    const ta = a.dueDate?.toMillis?.() || 0;
    const tb = b.dueDate?.toMillis?.() || 0;
    return ta - tb;
  });
}

// ---------- ANAMNESES ----------
export async function saveAnamnese(data) {
  guard('saveAnamnese', 5, 30000);
  const ref = await col('anamneses').add({
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    ...data
  });
  return ref.id;
}

export async function getAnamnesesOfStudent(studentId) {
  guard('listAnamneses', 6, 15000);
  const snap = await col('anamneses')
    .where('studentId', '==', studentId)
    .limit(LIMITS.anamneses)
    .get();
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return list.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() || 0;
    const tb = b.createdAt?.toMillis?.() || 0;
    return tb - ta;
  });
}

// ---------- REMINDERS ----------
export async function createReminder(data) {
  guard('createReminder', 8, 20000);
  const ref = await col('reminders').add({
    notified: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    ...data
  });
  return ref.id;
}

export async function getReminders(personalId) {
  guard('listReminders', 6, 15000);
  const snap = await col('reminders')
    .where('personalId', '==', personalId)
    .limit(LIMITS.reminders)
    .get();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r => r.notified !== true);
}

// ---------- STATS ----------
export async function getPersonalStats(personalId) {
  guard('getStats', 5, 20000);
  const students = await getStudentsOfPersonal(personalId);
  const completedSnap = await col('completedWorkouts')
    .where('personalId', '==', personalId)
    .limit(500)
    .get();
  const totalCompleted = completedSnap.size;
  const expected = Math.max(students.length * 12, 1);
  const adherence = Math.min(100, Math.round((totalCompleted / expected) * 100));
  return {
    totalStudents: students.length,
    totalWorkoutsCompleted: totalCompleted,
    avgAdherence: adherence
  };
}
