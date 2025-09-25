'use client';

import { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TeamsPage() {
  const teamsRef = collection(db, 'teams');
  const [teamsSnapshot, loading, error] = useCollection(teamsRef);
  const [newTeam, setNewTeam] = useState('');
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editName, setEditName] = useState('');

  const handleAddTeam = async () => {
    if (!newTeam.trim()) return;
    await addDoc(teamsRef, { name: newTeam.trim() });
    setNewTeam('');
  };

  const handleEditTeam = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleSaveEdit = async (id: string) => {
    await updateDoc(doc(db, 'teams', id), { name: editName });
    setEditingId(null);
    setEditName('');
  };

  const handleDeleteTeam = async (id: string) => {
    await deleteDoc(doc(db, 'teams', id));
  };

  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Teams & Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Input
              value={newTeam}
              onChange={e => setNewTeam(e.target.value)}
              placeholder="New team/project name"
              className="w-[220px]"
            />
            <Button onClick={handleAddTeam}>Add</Button>
          </div>
          <ul className="space-y-2">
            {teamsSnapshot?.docs.map(docSnap => {
              const t = docSnap.data();
              return (
                <li key={docSnap.id} className="flex items-center gap-2">
                  {editingId === docSnap.id ? (
                    <>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="w-[180px]" />
                      <Button size="sm" onClick={() => handleSaveEdit(docSnap.id)}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{t.name}</span>
                      <Button size="sm" variant="ghost" onClick={() => handleEditTeam(docSnap.id, t.name)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteTeam(docSnap.id)}>Delete</Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          {error && <p className="text-destructive mt-4">Error: {error.message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
