// This is a static Firebase SDK initialization helper for static exports
// It provides dummy implementations of Firebase auth methods to prevent errors

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

// Get actual config from env variables, or use dummy values if not available
const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'syncro-space-demo',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789012:web:abcdef123456',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'syncro-space-demo.appspot.com',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyA_PqPhrwDV_gi127C06Zyq9OYFEP7U0Yg',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'syncro-space-demo.firebaseapp.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-ABCDEFGHIJ',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Create a mock auth object for static export
const auth = {
  currentUser: null,
  onAuthStateChanged: (callback) => {
    // Simulate no user for static build
    callback(null);
    // Return unsubscribe function
    return () => {};
  },
  signInWithEmailAndPassword: async () => {
    console.log('Mock sign in with email (static build)');
    throw new Error('Authentication not available in static export');
  },
  createUserWithEmailAndPassword: async () => {
    console.log('Mock create user with email (static build)');
    throw new Error('Authentication not available in static export');
  },
  signInWithPopup: async () => {
    console.log('Mock sign in with popup (static build)');
    throw new Error('Authentication not available in static export');
  },
  signOut: async () => {
    console.log('Mock sign out (static build)');
    return Promise.resolve();
  },
};

// Initialize other Firebase services with limited functionality
const db = getFirestore(app);
const storage = getStorage(app);
const rtdb = getDatabase(app);

// Create mock providers
const googleProvider = { providerId: 'google.com' };
const facebookProvider = { providerId: 'facebook.com' };

export { app, auth, db, storage, rtdb, googleProvider, facebookProvider };