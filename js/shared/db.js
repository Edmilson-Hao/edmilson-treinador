// =====================================================
// CAMADA DE DADOS - Firestore
// Queries simplificadas (sem índice composto no MVP)
// =====================================================

import { toast } from './utils.js';
import { guard } from './rateLimit.js';

let db = null;
let auth = null;

const LIMITS = {
  students: 30,
  exercises: 200,
  routines: 20,
  workouts: 30,
  completed: 40,
  feedbacks: 50,
  plans: 20,
  anamneses: 15,
  reminders: 30
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
  // Apenas 1 filtro de igualdade → sem índice composto
  const snap = await col('users')
    .where('inviteCode', '==', code.toUpperCase())
    .limit(5)
    .get();
  const personal = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .find(u => u.role === 'personal');
  return personal || null;
}

export async function getStudentsOfPersonal(personalId) {
  guard('listStudents', 6, 15000);
  const snap = await col('users')
    .where('personalId', '==', personalId)
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
export async function getRoutinesOfStudent(studentId) {
  guard('listRoutines', 8, 12000);
  const snap = await col('routines')
    .where('studentId', '==', studentId)
    .limit(LIMITS.routines)
    .get();
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
export async function getWorkoutsOfRoutine(routineId) {
  guard('listWorkouts', 10, 12000);
  const snap = await col('workouts')
    .where('routineId', '==', routineId)
    .limit(LIMITS.workouts)
    .get();
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

// ---------- COMPLETED WORKOUTS ----------
export async function saveCompletedWorkout(data) {
  guard('saveCompleted', 5, 30000);
  const ref = await col('completedWorkouts').add({
    ...data,
    finishedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

export async function getCompletedByStudent(studentId, limit = 30) {
  guard('listCompleted', 8, 12000);
  const snap = await col('completedWorkouts')
    .where('studentId', '==', studentId)
    .limit(Math.min(limit, LIMITS.completed))
    .get();
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

export async function resolveFeedback(id) {
  guard('resolveFeedback', 15, 15000);
  await col('completedWorkouts').doc(id).update({ resolved: true });
}

// ---------- PLANS ----------
export async function getPlansOfStudent(studentId) {
  guard('listPlans', 8, 12000);
  const snap = await col('plans')
    .where('studentId', '==', studentId)
    .limit(LIMITS.plans)
    .get();
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
