import { db } from './firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

export async function logUserActivity(uid: string, action: string, details?: any) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    activityLog: arrayUnion({
      action,
      details,
      timestamp: serverTimestamp(),
    }),
    lastActive: serverTimestamp(),
  });
}
