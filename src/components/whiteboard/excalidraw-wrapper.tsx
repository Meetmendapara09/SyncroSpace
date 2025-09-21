'use client';

import React, { useEffect, useRef, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// Dynamic import to avoid SSR issues
let ExcalidrawComponent: any = null;

export function ExcalidrawWrapper({ boardId = 'shared', initialData, onChange, ...otherProps }: any) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef<any>(null);
  const [sceneData, setSceneData] = useState<any>(initialData || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadExcalidraw = async () => {
      try {
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

    // Real-time sync with Firestore
    const boardDoc = doc(db, 'whiteboards', boardId);
    const unsubscribe = onSnapshot(boardDoc, (snapshot) => {
      const data = snapshot.data();
      if (data && data.scene) {
        setSceneData(data.scene);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [boardId]);

  // Save scene to Firestore
  const handleSave = async () => {
    if (!apiRef.current) return;
    setIsSaving(true);
    const scene = await apiRef.current.getSceneElements();
    await setDoc(doc(db, 'whiteboards', boardId), { scene });
    setIsSaving(false);
  };

  // Export scene as PNG
  const handleExport = async () => {
    if (!apiRef.current) return;
    setIsExporting(true);
    await apiRef.current.exportToCanvas(); // Excalidraw API handles export
    setIsExporting(false);
  };

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
    <div className="h-full w-full flex flex-col">
      <div className="flex gap-2 p-2 bg-muted border-b">
        <button onClick={handleSave} disabled={isSaving} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={handleExport} disabled={isExporting} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">
          {isExporting ? 'Exporting...' : 'Export PNG'}
        </button>
      </div>
      <div className="flex-1">
        <ExcalidrawComponent
          initialData={sceneData}
          onChange={async () => {
            if (apiRef.current) {
              const scene = await apiRef.current.getSceneElements();
              setSceneData(scene);
              if (onChange) onChange(scene);
              // Real-time update for collaboration
              await setDoc(doc(db, 'whiteboards', boardId), { scene });
            }
          }}
          theme="light"
          excalidrawAPI={(api: any) => (apiRef.current = api)}
          UIOptions={{
            canvasActions: {
              loadScene: true,
              saveToActiveFile: true,
              export: true,
              toggleTheme: true,
            }
          }}
          {...otherProps}
        />
      </div>
    </div>
  );
}