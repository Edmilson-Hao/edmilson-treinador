// =====================================================
// CAMADA DE DADOS - Firestore
// Com limites de leitura e proteção básica
// =====================================================

import { toast } from './utils.js';
import { guard } from './rateLimit.js';

let db = null;
let auth = null;

// Limites máximos por query (protege contra leitura excessiva)
const LIMITS = {
  students: 30,          // máx alunos por personal
  exercises: 200,        // máx exercícios
  routines: 20,          // máx rotinas por aluno
  workouts: 30,          // máx treinos por rotina
  completed: 40,         // histórico
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
  // set+merge evita erro "No document to update" se o doc ainda não existir
  await col('users').doc(uid).set({
    ...data,
    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

export async function findPersonalByInviteCode(code) {
  guard('findInvite', 5, 30000); // bem restrito – evita brute-force de códigos
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
  guard('listStudents', 6, 15000);
  const snap = await col('users')
    .where('role', '==', 'aluno')
    .where('personalId', '==', personalId)
    .orderBy('name')
    .limit(LIMITS.students)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------- EXERCISES ----------
export async function getExercises(personalId) {
  guard('listExercises', 8, 12000);
  const snap = await col('exercises')
    .where('personalId', '==', personalId)
    .orderBy('name')
    .limit(LIMITS.exercises)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
    .where('archived', '==', false)
    .orderBy('order')
    .limit(LIMITS.routines)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
    .orderBy('order')
    .limit(LIMITS.workouts)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
  guard('saveCompleted', 5, 30000); // aluno não deve spammar conclusão
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
    .orderBy('finishedAt', 'desc')
    .limit(Math.min(limit, LIMITS.completed))
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getFeedbacksForPersonal(personalId, onlyUnresolved = true) {
  guard('listFeedbacks', 6, 15000);
  const snap = await col('completedWorkouts')
    .where('personalId', '==', personalId)
    .orderBy('finishedAt', 'desc')
    .limit(LIMITS.feedbacks)
    .get();
  let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (onlyUnresolved) {
    list = list.filter(f => !f.resolved);
  }
  return list;
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
    .orderBy('dueDate', 'desc')
    .limit(LIMITS.plans)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
    paidAt: firebase.firestore.FieldValue.serverTimestamp()
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
    .orderBy('createdAt', 'desc')
    .limit(LIMITS.anamneses)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
    .where('notified', '==', false)
    .orderBy('date')
    .limit(LIMITS.reminders)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------- STATS ----------
export async function getPersonalStats(personalId) {
  guard('getStats', 5, 20000);
  const students = await getStudentsOfPersonal(personalId);
  // Contagem limitada – evita full scan
  const completedSnap = await col('completedWorkouts')
    .where('personalId', '==', personalId)
    .limit(500) // teto de segurança
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
