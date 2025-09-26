import * as admin from 'firebase-admin';

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials for server-side operations
 */
export function initAdmin() {
  // Only initialize if it hasn't been initialized
  if (admin.apps.length === 0) {
    // Check if running in a production environment
    if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
      // Parse credentials JSON from environment variable
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_ADMIN_CREDENTIALS
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
    } else {
      // For development, use a service account key file
      const serviceAccount = require('../../../bigquery-credentials.json');

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
        storageBucket: `${serviceAccount.project_id}.appspot.com`
      });
    }
  }

  return { admin };
}

/**
 * Get Firebase Admin Auth instance
 * @returns Firebase Admin Auth
 */
export function getAdminAuth() {
  initAdmin();
  return admin.auth();
}

/**
 * Get Firebase Admin Firestore instance
 * @returns Firebase Admin Firestore
 */
export function getAdminFirestore() {
  initAdmin();
  return admin.firestore();
}

/**
 * Get Firebase Admin Storage instance
 * @returns Firebase Admin Storage
 */
export function getAdminStorage() {
  initAdmin();
  return admin.storage();
}

/**
 * Verify Firebase ID token
 * @param token Firebase ID token
 * @returns Decoded token
 */
export async function verifyIdToken(token: string) {
  const auth = getAdminAuth();
  return auth.verifyIdToken(token);
}

export default { initAdmin, getAdminAuth, getAdminFirestore, getAdminStorage, verifyIdToken };