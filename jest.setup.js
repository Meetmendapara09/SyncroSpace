
import '@testing-library/jest-dom';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {
    // Mock Firestore database
  },
  storage: {
    // Mock Firebase storage
  }
}));

// Mock Firebase hooks
jest.mock('react-firebase-hooks/auth', () => ({
  useAuthState: jest.fn(() => [null, false, undefined]),
}));

jest.mock('react-firebase-hooks/firestore', () => ({
  useDocumentData: jest.fn(() => [null, false, undefined]),
  useCollectionData: jest.fn(() => [[], false, undefined]),
}));

// Mock Firebase Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({ path: 'mock-collection' })),
  doc: jest.fn(() => ({ path: 'mock-doc' })),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(() => ({ path: 'mock-query' })),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn((query, callback) => {
    // Mock unsubscribe function
    return jest.fn();
  }),
  serverTimestamp: jest.fn(() => new Date()),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
  getFirestore: jest.fn(() => ({ path: 'mock-firestore' })),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
}));

// Mock Firebase Storage functions
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(() => Promise.resolve('mock-url')),
  deleteObject: jest.fn(),
  getMetadata: jest.fn(),
  getStorage: jest.fn(),
}));
