// =====================================================
// CAMADA DE DADOS - Firestore
// =====================================================

import { toast } from './utils.js';

let db = null;
let auth = null;

export function initDb(firestore, authInstance) {
  db = firestore;
  auth = authInstance;
}

function col(name) {
  return db.collection(name);
}

// ---------- USERS ----------
export async function getUser(uid) {
  const snap = await col('users').doc(uid).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

export async function createUser(uid, data) {
  await col('users').doc(uid).set({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
  });
}

export async function updateUser(uid, data) {
  await col('users').doc(uid).update({
    ...data,
    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
  });
}

export async function findPersonalByInviteCode(code) {
  const snap = await col('users')
    .where('role', '==', 'personal')
    .where('inviteCode', '==', code.toUpperCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function getStudentsOfPersonal(personalId) {
  const snap = await col('users')
    .where('role', '==', 'aluno')
    .where('personalId', '==', personalId)
    .orderBy('name')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------- EXERCISES ----------
export async function getExercises(personalId) {
  const snap = await col('exercises')
    .where('personalId', '==', personalId)
    .orderBy('name')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createExercise(data) {
  const ref = await col('exercises').add({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

export async function updateExercise(id, data) {
  await col('exercises').doc(id).update(data);
}

export async function deleteExercise(id) {
  await col('exercises').doc(id).delete();
}

// ---------- ROUTINES ----------
export async function getRoutinesOfStudent(studentId) {
  const snap = await col('routines')
    .where('studentId', '==', studentId)
    .where('archived', '==', false)
    .orderBy('order')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createRoutine(data) {
  const ref = await col('routines').add({
    archived: false,
    order: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    ...data
  });
  return ref.id;
}

export async function updateRoutine(id, data) {
  await col('routines').doc(id).update(data);
}

export async function archiveRoutine(id) {
  await col('routines').doc(id).update({ archived: true });
}

// ---------- WORKOUTS ----------
export async function getWorkoutsOfRoutine(routineId) {
  const snap = await col('workouts')
    .where('routineId', '==', routineId)
    .orderBy('order')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createWorkout(data) {
  const ref = await col('workouts').add({
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    ...data
  });
  return ref.id;
}

export async function updateWorkout(id, data) {
  await col('workouts').doc(id).update(data);
}

export async function deleteWorkout(id) {
  await col('workouts').doc(id).delete();
}

// ---------- COMPLETED WORKOUTS (histórico + feedback) ----------
export async function saveCompletedWorkout(data) {
  const ref = await col('completedWorkouts').add({
    ...data,
    finishedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

export async function getCompletedByStudent(studentId, limit = 30) {
  const snap = await col('completedWorkouts')
    .where('studentId', '==', studentId)
    .orderBy('finishedAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getFeedbacksForPersonal(personalId, onlyUnresolved = true) {
  let q = col('completedWorkouts')
    .where('personalId', '==', personalId)
    .orderBy('finishedAt', 'desc')
    .limit(50);
  const snap = await q.get();
  let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (onlyUnresolved) {
    list = list.filter(f => !f.resolved);
  }
  return list;
}

export async function resolveFeedback(id) {
  await col('completedWorkouts').doc(id).update({ resolved: true });
}

// ---------- PLANS ----------
export async function getPlansOfStudent(studentId) {
  const snap = await col('plans')
    .where('studentId', '==', studentId)
    .orderBy('dueDate', 'desc')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createPlan(data) {
  const ref = await col('plans').add({
    status: 'ativo',
    paidAt: null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    ...data
  });
  return ref.id;
}

export async function markPlanPaid(id) {
  await col('plans').doc(id).update({
    status: 'pago',
    paidAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ---------- ANAMNESES ----------
export async function saveAnamnese(data) {
  const ref = await col('anamneses').add({
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    ...data
  });
  return ref.id;
}

export async function getAnamnesesOfStudent(studentId) {
  const snap = await col('anamneses')
    .where('studentId', '==', studentId)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------- REMINDERS ----------
export async function createReminder(data) {
  const ref = await col('reminders').add({
    notified: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    ...data
  });
  return ref.id;
}

export async function getReminders(personalId) {
  const snap = await col('reminders')
    .where('personalId', '==', personalId)
    .where('notified', '==', false)
    .orderBy('date')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------- STATS simples ----------
export async function getPersonalStats(personalId) {
  const students = await getStudentsOfPersonal(personalId);
  const completedSnap = await col('completedWorkouts')
    .where('personalId', '==', personalId)
    .get();
  const totalCompleted = completedSnap.size;

  // Adesão aproximada: treinos feitos / (alunos * 4 semanas * 3 treinos)
  const expected = Math.max(students.length * 12, 1);
  const adherence = Math.min(100, Math.round((totalCompleted / expected) * 100));

  return {
    totalStudents: students.length,
    totalWorkoutsCompleted: totalCompleted,
    avgAdherence: adherence
  };
}
