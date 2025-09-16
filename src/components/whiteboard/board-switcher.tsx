'use client';

import * as React from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection } from 'react-firebase-hooks/firestore';

export function BoardSwitcher({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const boardsRef = collection(db, 'whiteboards');
  const [boardsSnap] = useCollection(boardsRef);
  const boards = boardsSnap?.docs || [];

  const handleCreate = async () => {
    const name = prompt('New board name');
    if (!name) return;    
    const docRef = await addDoc(boardsRef, {
      name,
      createdAt: serverTimestamp(),
    });
    onChange(docRef.id);
  };

  return (
    <div className="flex items-center gap-2">
      
      
    </div>
  );
}


