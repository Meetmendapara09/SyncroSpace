// This file is a temporary placeholder for when the full build is failing due to memory constraints
// It creates a minimal app that can be used until the full build can be run in an environment with more memory

import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function SimplePlaceholderApp() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">SyncroSpace</h1>
          <p className="mt-2 text-gray-600">
            Build in progress - Memory Optimized Version
          </p>
        </div>
        
        <div className="mt-8 space-y-6 text-gray-700">
          <p>
            The full application build requires more memory than is currently available in this environment.
          </p>
          <p>
            Please use one of the following options to proceed:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Run the development server: <code className="bg-gray-100 p-1 rounded">npm run dev</code></li>
            <li>Use a build environment with at least 8GB of RAM</li>
            <li>Deploy to a production environment using CI/CD</li>
          </ul>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status: Development Mode</span>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => window.location.href = '/'}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Only run in browser
if (typeof window !== 'undefined') {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<SimplePlaceholderApp />);
  }
}

export default SimplePlaceholderApp;