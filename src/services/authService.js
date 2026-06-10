import { STORAGE_KEYS } from '../data/constants';
import { getItem, removeItem, setItem } from './storageService';

const MOCK_USER = {
  id: 'user-001',
  email: 'doctor@gmail.com',
  name: 'Dr. Jane Smith',
  role: 'doctor',
};

const MOCK_PASSWORD = 'password123';

export function login(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail !== MOCK_USER.email || password !== MOCK_PASSWORD) {
    return { success: false, error: 'Invalid email or password.' };
  }

  const user = {
    ...MOCK_USER,
    loggedInAt: new Date().toISOString(),
  };

  setItem(STORAGE_KEYS.AUTH_SESSION, user);

  return { success: true, user };
}

export function logout() {
  removeItem(STORAGE_KEYS.AUTH_SESSION);
  return { success: true };
}

export function getCurrentUser() {
  return getItem(STORAGE_KEYS.AUTH_SESSION, null);
}

export function isAuthenticated() {
  return Boolean(getCurrentUser());
}
