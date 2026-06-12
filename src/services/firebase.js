// Firebase SDK — initialized here; Firestore/Auth will be wired in domain services later.
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyD6RlgjMjM3VGEszDhXEqbkQzxx6IUYVSk',
  authDomain: 'prescription-management-d71c7.firebaseapp.com',
  projectId: 'prescription-management-d71c7',
  storageBucket: 'prescription-management-d71c7.firebasestorage.app',
  messagingSenderId: '936481974420',
  appId: '1:936481974420:web:60d9c2fa81afcb7d486c81',
  measurementId: 'G-VFF18X9GPF',
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

import { getAuth } from 'firebase/auth';

const auth = getAuth(app);

import { getFirestore } from 'firebase/firestore';

const db = getFirestore(app);

export { app, analytics, auth, db };
