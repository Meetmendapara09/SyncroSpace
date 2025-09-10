'use client';

import React, { useEffect, useState } from 'react';

// Dynamic import to avoid SSR issues
let ExcalidrawComponent: any = null;

export function ExcalidrawWrapper({ initialData, onChange, ...otherProps }: any) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadExcalidraw = async () => {
      try {
        // Dynamic import of Excalidraw
        const excalidrawModule = await import('@excalidraw/excalidraw');
        
        if (mounted) {
          ExcalidrawComponent = excalidrawModule.Excalidraw;
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load Excalidraw:', err);
        if (mounted) {
          setError('Failed to load drawing component');
        }
      }
    };

    loadExcalidraw();

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-red-50">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded || !ExcalidrawComponent) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ExcalidrawComponent
        initialData={initialData}
        onChange={onChange}
        theme="light"
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: true,
            toggleTheme: true,
          }
        }}
        {...otherProps}
      />
    </div>
  );
}