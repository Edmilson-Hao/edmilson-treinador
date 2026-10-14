// =====================================================
// AUTENTICAÇÃO - Google + E-mail/Senha
// =====================================================

import { createUser, getUser, updateUser } from './db.js';
import { toast, generateInviteCode } from './utils.js';

let auth = null;
let googleProvider = null;

export function initAuth(authInstance) {
  auth = authInstance;
  googleProvider = new firebase.auth.GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
}

export function onAuthChange(callback) {
  return auth.onAuthStateChanged(callback);
}

export async function loginWithGoogle() {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;
    let profile = await getUser(user.uid);

    if (!profile) {
      // Primeiro login → pergunta se é Personal ou Aluno
      // Por padrão, se for o primeiro usuário do projeto, vira Personal
      // Depois o Personal cria alunos ou gera código
      profile = {
        role: 'pending', // será definido no onboarding
        name: user.displayName || 'Usuário',
        email: user.email,
        photoURL: user.photoURL || null,
        personalId: null,
        inviteCode: null
      };
      await createUser(user.uid, profile);
    } else {
      await updateUser(user.uid, { lastLogin: firebase.firestore.FieldValue.serverTimestamp() });
    }
    return { user, profile };
  } catch (err) {
    console.error(err);
    toast(err.message || 'Erro ao entrar com Google', 'error');
    throw err;
  }
}

export async function loginWithEmail(email, password) {
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    const profile = await getUser(result.user.uid);
    if (profile) {
      await updateUser(result.user.uid, {});
    }
    return { user: result.user, profile };
  } catch (err) {
    toast(mapAuthError(err.code), 'error');
    throw err;
  }
}

export async function registerWithEmail(email, password, name, role = 'aluno', personalId = null) {
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    await result.user.updateProfile({ displayName: name });

    const data = {
      role,
      name,
      email,
      photoURL: null,
      personalId: role === 'aluno' ? personalId : null,
      inviteCode: role === 'personal' ? generateInviteCode() : null
    };
    await createUser(result.user.uid, data);
    return { user: result.user, profile: data };
  } catch (err) {
    toast(mapAuthError(err.code), 'error');
    throw err;
  }
}

/** Personal cria conta de aluno manualmente */
export async function createStudentAccount(email, password, name, personalId) {
  // Usamos uma instância secundária para não deslogar o personal
  const secondaryApp = firebase.initializeApp(firebase.app().options, 'Secondary');
  const secondaryAuth = secondaryApp.auth();

  try {
    const result = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    await result.user.updateProfile({ displayName: name });

    const data = {
      role: 'aluno',
      name,
      email,
      photoURL: null,
      personalId,
      inviteCode: null
    };
    // Cria o documento no Firestore (usa o db principal)
    await firebase.firestore().collection('users').doc(result.user.uid).set({
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: null
    });

    await secondaryAuth.signOut();
    secondaryApp.delete();
    return { uid: result.user.uid, ...data };
  } catch (err) {
    secondaryApp.delete();
    toast(mapAuthError(err.code), 'error');
    throw err;
  }
}

export async function logout() {
  await auth.signOut();
}

export function currentUser() {
  return auth.currentUser;
}

function mapAuthError(code) {
  const map = {
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/email-already-in-use': 'Este e-mail já está em uso',
    'auth/weak-password': 'Senha muito fraca (mín. 6 caracteres)',
    'auth/invalid-email': 'E-mail inválido',
    'auth/popup-closed-by-user': 'Login cancelado',
    'auth/network-request-failed': 'Erro de conexão'
  };
  return map[code] || 'Erro de autenticação';
}
