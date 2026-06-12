import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from './firebase';

let cachedUser = null;
let authInitialized = false;
const authReadyWaiters = [];

onAuthStateChanged(
  auth,
  (firebaseUser) => {
    cachedUser = mapFirebaseUser(firebaseUser);

    if (!authInitialized) {
      authInitialized = true;
      authReadyWaiters.splice(0).forEach((resolve) => resolve());
    }
  },
  (error) => {
    console.error('Firebase auth state listener error:', error);
    cachedUser = null;

    if (!authInitialized) {
      authInitialized = true;
      authReadyWaiters.splice(0).forEach((resolve) => resolve());
    }
  }
);

function waitForAuthInit() {
  if (authInitialized) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    authReadyWaiters.push(resolve);
  });
}

function mapFirebaseUser(firebaseUser) {
  if (!firebaseUser) {
    return null;
  }

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    name: firebaseUser.displayName || firebaseUser.email || '',
    role: 'doctor',
    loggedInAt: firebaseUser.metadata?.lastSignInTime ?? new Date().toISOString(),
  };
}

function mapAuthError(error) {
  const code = error?.code ?? '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled for this project.';
    default:
      return error?.message || 'Authentication failed. Please try again.';
  }
}

/**
 * Demo login hint for the login page. Disabled while using Firebase Auth.
 */
export async function getDemoCredentials() {
  return {
    email: '',
    passwordHint: '',
  };
}

export async function login(email, password) {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    return { success: false, error: 'Email is required.' };
  }

  if (!password) {
    return { success: false, error: 'Password is required.' };
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const user = mapFirebaseUser(credential.user);
    cachedUser = user;
    return { success: true, user };
  } catch (error) {
    return { success: false, error: mapAuthError(error) };
  }
}

export async function logout() {
  try {
    await signOut(auth);
    cachedUser = null;
    return { success: true };
  } catch (error) {
    return { success: false, error: mapAuthError(error) };
  }
}

export async function getCurrentUser() {
  await waitForAuthInit();
  return cachedUser;
}
