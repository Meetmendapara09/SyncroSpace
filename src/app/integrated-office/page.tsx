'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { IntegratedOfficeView } from '@/components/meeting/integrated-office-view';
import { CharacterSelectionWrapper } from '@/components/meeting/character-selection-wrapper';
import { featureIntegration } from '@/lib/feature-integration';
import { useSessionPersistence } from '@/lib/hooks/use-session-persistence';
import { useAppSelector } from '@/lib/redux/hooks';

export default function SyncroSpace() {
  const [user, loading] = useAuthState(auth);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitializedUser, setHasInitializedUser] = useState(false);
  const [showSessionPrompt, setShowSessionPrompt] = useState(false);
  
  // Use our session persistence hook
  const { lastSession, isRestoring, restoreSession } = useSessionPersistence();
  
  // Attempt to restore previous session
  useEffect(() => {
    if (user && !hasInitializedUser) {
      // Initialize feature integration service
      featureIntegration.initialize(
        user.uid,
        user.displayName || user.email?.split('@')[0] || 'Anonymous'
      );
      
      setHasInitializedUser(true);
      
      // If we have a session, show the prompt
      if (lastSession && !isRestoring) {
        setShowSessionPrompt(true);
      }
      
      setIsLoading(false);
    } else if (!loading) {
      setIsLoading(false);
    }
    
    // Cleanup when component unmounts
    return () => {
      if (user) {
        featureIntegration.cleanup();
      }
    };
  }, [user, loading, hasInitializedUser, lastSession, isRestoring]);
  
  // Loading state
  if (loading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Loading SyncroSpace...</h1>
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-6 py-1">
              <div className="h-2 bg-slate-200 rounded"></div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                  <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                </div>
                <div className="h-2 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // If not logged in, show login prompt
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4">Welcome to SyncroSpace</h1>
          <p className="mb-6">Please sign in to continue to the virtual office space.</p>
          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
            onClick={() => window.location.href = '/login'}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }
  
  // If has previous session, ask if they want to restore
  if (showSessionPrompt && lastSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4">Welcome Back!</h1>
          <p className="mb-6">
            We found your previous session in{' '}
            <span className="font-medium">{lastSession.roomId}</span>.
            Would you like to resume where you left off?
          </p>
          <div className="flex gap-4">
            <button 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
              onClick={() => {
                // Resume previous session
                restoreSession();
                setShowSessionPrompt(false);
              }}
            >
              Resume Session
            </button>
            <button 
              className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded"
              onClick={() => setShowSessionPrompt(false)}
            >
              Start New
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Get the selected avatar from the session persistence hook or Redux state
  const userAvatar = lastSession?.avatar || useAppSelector(state => state.user.avatar);
  const [characterSelected, setCharacterSelected] = useState(!!userAvatar);
  
  // Function to handle character selection completion
  const handleCharacterSelected = () => {
    setCharacterSelected(true);
    // If we also have a session, restore room and position
    if (lastSession && !isRestoring) {
      restoreSession();
    }
  };
  
  // Show character selection if no avatar selected
  if (!characterSelected) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6 text-center">Select Your Virtual Avatar</h1>
          <CharacterSelectionWrapper 
            onComplete={handleCharacterSelected}
          />
        </div>
      </main>
    );
  }
  
  // Main app when logged in with character selected
  return (
    <main className="min-h-screen bg-slate-50">
      <IntegratedOfficeView />
    </main>
  );
}