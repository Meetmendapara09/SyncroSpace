import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendEmailVerification,
  User as FirebaseUser,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  UserCredential,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

/**
 * User Model
 * Extended from Firebase User with additional fields
 */
export interface User {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  isAnonymous: boolean;
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };
  providerData: {
    providerId: string;
    uid: string;
    displayName: string | null;
    email: string | null;
    phoneNumber: string | null;
    photoURL: string | null;
  }[];
  // Custom fields
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  department?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  teamIds?: string[]; // Teams the user belongs to
  status?: 'online' | 'away' | 'busy' | 'offline';
  settings?: UserSettings;
  lastActive?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User Settings
 * User preferences
 */
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notificationSettings: {
    email: boolean;
    push: boolean;
    desktop: boolean;
    teamMessages: boolean;
    teamEvents: boolean;
    teamAnnouncements: boolean;
    taskAssignments: boolean;
    taskUpdates: boolean;
    goalUpdates: boolean;
  };
  privacySettings: {
    showOnlineStatus: boolean;
    showLastActive: boolean;
    allowDirectMessages: boolean;
    allowTeamInvites: boolean;
  };
  displaySettings: {
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };
}

/**
 * Auth Service
 * Handles authentication and user management
 */
class AuthService {
  private auth = getAuth();
  private googleProvider = new GoogleAuthProvider();

  /**
   * Get current user
   * @returns The current user or null if not signed in
   */
  getCurrentUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }

  /**
   * Register a new user with email and password
   * @param email User email
   * @param password User password
   * @param displayName User display name
   * @returns UserCredential from Firebase
   */
  async registerWithEmail(
    email: string,
    password: string,
    displayName: string
  ): Promise<UserCredential> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      
      // Update profile with display name
      await updateProfile(userCredential.user, { displayName });
      
      // Send email verification
      await sendEmailVerification(userCredential.user);
      
      // Create user document in Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      
      const userData: Partial<User> = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        emailVerified: userCredential.user.emailVerified,
        displayName,
        photoURL: userCredential.user.photoURL,
        firstName: displayName.split(' ')[0],
        lastName: displayName.split(' ').length > 1 ? displayName.split(' ').slice(1).join(' ') : '',
        status: 'online',
        settings: {
          theme: 'system',
          notificationSettings: {
            email: true,
            push: true,
            desktop: true,
            teamMessages: true,
            teamEvents: true,
            teamAnnouncements: true,
            taskAssignments: true,
            taskUpdates: true,
            goalUpdates: true,
          },
          privacySettings: {
            showOnlineStatus: true,
            showLastActive: true,
            allowDirectMessages: true,
            allowTeamInvites: true,
          },
          displaySettings: {
            language: 'en',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            dateFormat: 'MM/DD/YYYY',
            timeFormat: '12h',
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActive: new Date(),
        teamIds: [],
      };
      
      await setDoc(userDocRef, userData);
      
      return userCredential;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  /**
   * Sign in with email and password
   * @param email User email
   * @param password User password
   * @param rememberMe Whether to persist the login
   * @returns UserCredential from Firebase
   */
  async signInWithEmail(
    email: string,
    password: string,
    rememberMe: boolean = true
  ): Promise<UserCredential> {
    try {
      // Set persistence based on remember me choice
      await setPersistence(this.auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      
      // Update last active timestamp
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      await updateDoc(userDocRef, {
        lastActive: serverTimestamp(),
        status: 'online',
      });
      
      return userCredential;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  /**
   * Sign in with Google
   * @param rememberMe Whether to persist the login
   * @returns UserCredential from Firebase
   */
  async signInWithGoogle(rememberMe: boolean = true): Promise<UserCredential> {
    try {
      // Set persistence based on remember me choice
      await setPersistence(this.auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      const userCredential = await signInWithPopup(this.auth, this.googleProvider);
      
      // Check if this is a new user
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create new user document for first-time Google sign-ins
        const userData: Partial<User> = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          emailVerified: userCredential.user.emailVerified,
          displayName: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL,
          firstName: userCredential.user.displayName?.split(' ')[0] || '',
          lastName: userCredential.user.displayName && userCredential.user.displayName.split(' ').length > 1 
            ? userCredential.user.displayName.split(' ').slice(1).join(' ') 
            : '',
          status: 'online',
          settings: {
            theme: 'system',
            notificationSettings: {
              email: true,
              push: true,
              desktop: true,
              teamMessages: true,
              teamEvents: true,
              teamAnnouncements: true,
              taskAssignments: true,
              taskUpdates: true,
              goalUpdates: true,
            },
            privacySettings: {
              showOnlineStatus: true,
              showLastActive: true,
              allowDirectMessages: true,
              allowTeamInvites: true,
            },
            displaySettings: {
              language: 'en',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              dateFormat: 'MM/DD/YYYY',
              timeFormat: '12h',
            },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActive: new Date(),
          teamIds: [],
        };
        
        await setDoc(userDocRef, userData);
      } else {
        // Update last active timestamp for returning users
        await updateDoc(userDocRef, {
          lastActive: serverTimestamp(),
          status: 'online',
        });
      }
      
      return userCredential;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      // Update user status before signing out
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          lastActive: serverTimestamp(),
          status: 'offline',
        });
      }
      
      await firebaseSignOut(this.auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param email User email
   */
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param displayName New display name
   * @param photoURL New photo URL
   */
  async updateUserProfile(
    displayName?: string,
    photoURL?: string
  ): Promise<void> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) throw new Error('No authenticated user');
      
      const updateData: { displayName?: string; photoURL?: string } = {};
      if (displayName) updateData.displayName = displayName;
      if (photoURL) updateData.photoURL = photoURL;
      
      await updateProfile(currentUser, updateData);
      
      // Update Firestore document
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        displayName: displayName || currentUser.displayName,
        photoURL: photoURL || currentUser.photoURL,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Update user email
   * @param newEmail New email address
   * @param password Current password for verification
   */
  async updateUserEmail(newEmail: string, password: string): Promise<void> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser || !currentUser.email) throw new Error('No authenticated user');
      
      // Re-authenticate user before email change
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
      
      await updateEmail(currentUser, newEmail);
      
      // Update Firestore document
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        email: newEmail,
        updatedAt: serverTimestamp(),
      });
      
      // Send verification email for new address
      await sendEmailVerification(currentUser);
    } catch (error) {
      console.error('Error updating email:', error);
      throw error;
    }
  }

  /**
   * Update user password
   * @param currentPassword Current password
   * @param newPassword New password
   */
  async updateUserPassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser || !currentUser.email) throw new Error('No authenticated user');
      
      // Re-authenticate user before password change
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      
      await updatePassword(currentUser, newPassword);
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  /**
   * Set up auth state observer
   * @param callback Function to call with user data when auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Convert Firebase user to our User type with additional data
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        let userData: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          phoneNumber: firebaseUser.phoneNumber,
          isAnonymous: firebaseUser.isAnonymous,
          metadata: {
            creationTime: firebaseUser.metadata.creationTime,
            lastSignInTime: firebaseUser.metadata.lastSignInTime,
          },
          providerData: firebaseUser.providerData,
        };
        
        if (userDoc.exists()) {
          const firestoreData = userDoc.data() as Partial<User>;
          userData = { ...userData, ...firestoreData };
        }
        
        callback(userData);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Get detailed user data
   * @param userId User ID
   * @returns User data
   */
  async getUserData(userId: string): Promise<User | null> {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) return null;
      
      return userDoc.data() as User;
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  }

  /**
   * Update user data
   * @param userData User data to update
   */
  async updateUserData(userData: Partial<User>): Promise<void> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) throw new Error('No authenticated user');
      
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        ...userData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
export default authService;