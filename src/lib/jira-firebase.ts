// Firestore collection references for JIRA-like features
import { getFirestore, collection } from 'firebase/firestore';

export const db = getFirestore();

export const issuesCollection = collection(db, 'issues');
export const projectsCollection = collection(db, 'projects');
export const boardsCollection = collection(db, 'boards');
export const usersCollection = collection(db, 'users');
export const commentsCollection = collection(db, 'comments');
export const attachmentsCollection = collection(db, 'attachments');
export const workflowsCollection = collection(db, 'workflows');
