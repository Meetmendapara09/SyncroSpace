'use client';

import { useState } from 'react';
import CachedUserProfile from '@/components/cached-user-profile';
import { clearMemoryCache, clearLocalCache } from '@/lib/cache-utils';

export default function CachingDemo() {
  const [userId, setUserId] = useState('user-1');
  const [refreshKey, setRefreshKey] = useState(0);
  
  const userIds = ['user-1', 'user-2', 'user-3', 'nonexistent-user'];
  
  const clearUserCache = (id: string) => {
    const cacheKeys = [
      `user_${id}`,
      `user_profile_${id}`
    ];
    
    cacheKeys.forEach(key => {
      clearMemoryCache(new RegExp(key));
      clearLocalCache(new RegExp(key));
    });
    
    // Force component refresh
    setRefreshKey(prev => prev + 1);
  };
  
  const clearAllCache = () => {
    userIds.forEach(id => {
      clearUserCache(id);
    });
  };
  
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Caching Demonstration</h1>
      
      <div className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Select a User</h2>
        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="User selection">
          {userIds.map(id => (
            <button
              key={id}
              onClick={() => setUserId(id)}
              aria-pressed={userId === id}
              aria-label={`Select user ${id}`}
              className={`px-4 py-2 rounded ${
                userId === id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 transition'
              }`}
            >
              {id}
            </button>
          ))}
        </div>
        
        <div className="mb-4 flex flex-wrap gap-2">
          <button 
            onClick={() => clearUserCache(userId)}
            aria-label={`Clear cache for user ${userId}`}
            className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition"
          >
            Clear Current User Cache
          </button>
          
          <button 
            onClick={clearAllCache}
            aria-label="Clear cache for all users"
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Clear All Cache
          </button>
        </div>
        
        <div className="p-3 sm:p-4 bg-gray-50 border rounded-lg">
          <p className="text-xs sm:text-sm text-gray-600 mb-2">
            <strong>Cache behavior:</strong> The first load of a user will be slower (simulated API call). 
            Subsequent loads will be fast (from cache). Try switching between users to see the difference.
          </p>
          <p className="text-xs sm:text-sm text-gray-600">
            <strong>Test steps:</strong> 
            <ol className="list-decimal pl-4 mt-1">
              <li>Select a user</li>
              <li>Note load time</li>
              <li>Select different user</li>
              <li>Return to first user (should be fast)</li>
              <li>Clear cache</li>
              <li>Load again (should be slow)</li>
            </ol>
          </p>
        </div>
      </div>
      
      <div key={refreshKey} className="border p-3 sm:p-6 rounded-lg shadow-sm">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">User Profile</h2>
        <CachedUserProfile userId={userId} />
      </div>
    </div>
  );
}