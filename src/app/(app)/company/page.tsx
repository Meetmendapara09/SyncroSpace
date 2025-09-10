
'use client';

import { useState, useEffect } from 'react';
import { useDocument, useDocumentData } from 'react-firebase-hooks/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { db, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Edit, Save, Building, PlusCircle } from 'lucide-react';
import Image from 'next/image';

const companyProfileRef = doc(db, 'companyProfile', 'main');

export default function CompanyPage() {
  const [user, userLoading] = useAuthState(auth);
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData, userDataLoading] = useDocumentData(userDocRef);

  const [profileSnapshot, profileLoading, profileError] = useDocument(companyProfileRef);
  
  const [isEditing, setIsEditing] = useState(false);
  const [story, setStory] = useState('');
  const { toast } = useToast();

  const profileData = profileSnapshot?.data();

  useEffect(() => {
    if (profileData) {
      setStory(profileData.story || '');
    }
  }, [profileData]);

  const handleSave = async () => {
    try {
      await setDoc(companyProfileRef, { story }, { merge: true });
      toast({
        title: 'Company Story Updated',
        description: 'The company profile has been saved.',
      });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Saving',
        description: error.message,
      });
    }
  };

  const loading = userLoading || userDataLoading || profileLoading;
  const isAdmin = userData?.role === 'admin';

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
                <Building className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Our Company Story</h1>
                    <p className="text-muted-foreground">The journey, the mission, and the people.</p>
                </div>
            </div>
            {isAdmin && (
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Save Changes</Button>
                        </>
                    ) : (
                        <Button onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4" /> Edit Page</Button>
                    )}
                </div>
            )}
        </header>

        <Card>
            <CardContent className="p-6">
                <div className="prose dark:prose-invert max-w-none">
                    {isEditing ? (
                        <Textarea
                            value={story}
                            onChange={(e) => setStory(e.target.value)}
                            rows={15}
                            className="text-base"
                            placeholder="Tell your company's story..."
                        />
                    ) : (
                        <p>{story || 'The story has not been written yet. An admin can add it.'}</p>
                    )}
                </div>
            </CardContent>
        </Card>
        
         <div>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">Our Journey in Pictures</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* In a real app, these images would be uploaded and managed by the admin */}
                <Image src="https://picsum.photos/600/400" data-ai-hint="team coding" alt="Team of developers collaborating" width={600} height={400} className="rounded-lg shadow-md" />
                <Image src="https://picsum.photos/600/400" data-ai-hint="software architecture" alt="Whiteboard with architecture diagram" width={600} height={400} className="rounded-lg shadow-md" />
                <Image src="https://picsum.photos/600/400" data-ai-hint="server room" alt="Data center server room" width={600} height={400} className="rounded-lg shadow-md" />
            </div>
             {isEditing && (
                <Button variant="outline" className="mt-4">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Photo
                </Button>
            )}
        </div>
    </div>
  );
}
