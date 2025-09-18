
import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
// const rtdb = getDatabase(app);

// App Check initialization (debug mode for local dev)
if (typeof window !== 'undefined') {
  // Enable debug token for local development
  // Remove this in production and use ReCaptchaV3Provider
  // @ts-ignore
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('reCAPTCHA'),
    isTokenAutoRefreshEnabled: true,
  });
}

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// export { app, auth, db, storage, rtdb, googleProvider, facebookProvider };
export { app, auth, db, storage, googleProvider, facebookProvider };
