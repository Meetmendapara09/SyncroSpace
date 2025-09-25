'use client';

import { useState, useEffect } from 'react';
import { cachedFetch } from '@/lib/cache-utils';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserProfileProps {
  userId: string;
}

export default function CachedUserProfile({ userId }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await cachedFetch<{ success: boolean; user: User }>(
          `/api/users/${userId}`,
          {
            useCache: true,
            cacheKey: `user_profile_${userId}`,
            cacheDuration: 5 * 60 * 1000, // 5 minutes
            useLocalStorage: true, // Also cache in localStorage
            headers: {
              'Accept': 'application/json'
            }
          }
        );
        
        if (response && response.success && response.user) {
          setUser(response.user);
        } else {
          throw new Error('Invalid user data');
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
        // Implement better error handling with more specific error messages
        if (err instanceof Error) {
          setError(`Failed to load user profile: ${err.message}`);
        } else if (typeof err === 'string') {
          setError(`Failed to load user profile: ${err}`);
        } else {
          setError('Failed to load user profile: Unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    }
    
    if (userId) {
      fetchUser();
    }
  }, [userId]);
  
  if (!userId) {
    return (
      <div className="text-red-500" role="alert" aria-live="assertive">
        User ID is required
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="p-4 border rounded shadow-sm animate-pulse" aria-busy="true" aria-label="Loading user profile">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 text-red-700 rounded" role="alert" aria-live="assertive">
        <p>Error: {error}</p>
        <button 
          className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition"
          onClick={() => location.reload()}
          aria-label="Retry loading user profile"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="p-4 border border-yellow-300 bg-yellow-50 text-yellow-700 rounded" role="alert">
        User not found
      </div>
    );
  }
  
  return (
    <div className="p-4 border rounded shadow-md" aria-live="polite">
      <h2 className="text-xl font-bold mb-2" id={`user-name-${user.id}`}>{user.name}</h2>
      <p className="text-gray-600 mb-1" id={`user-email-${user.id}`}>
        <span className="sr-only">Email: </span>{user.email}
      </p>
      <span 
        className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
        aria-label={`User role: ${user.role}`}
      >
        {user.role}
      </span>
    </div>
  );
}