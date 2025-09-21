
'use client';

import { useState, useEffect } from 'react';
import { useDocument, useDocumentData } from 'react-firebase-hooks/firestore';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { uploadBytes, getDownloadURL, ref as storageRef, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
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
  const [images, setImages] = useState<{ url: string; caption?: string; views?: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const profileData = profileSnapshot?.data();

  useEffect(() => {
    if (profileData) {
      setStory(profileData.story || '');
      setImages(profileData.images || []);
    }
  }, [profileData]);

  // Increment profile view count
  useEffect(() => {
    if (!profileLoading && profileSnapshot) {
      const views = profileData?.views || 0;
      updateDoc(companyProfileRef, { views: views + 1 });
    }
  }, [profileLoading, profileSnapshot]);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    setUploading(true);
    try {
      const fileRef = storageRef(storage, `companyProfile/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      const newImages = [...images, { url, caption: '', views: 0 }];
      await updateDoc(companyProfileRef, { images: newImages });
      setImages(newImages);
      toast({ title: 'Photo Added', description: 'Image uploaded successfully.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Error', description: error.message });
    }
    setUploading(false);
  };

  const handleRemoveImage = async (url: string) => {
    if (!isAdmin) return;
    setUploading(true);
    try {
      try {
        const ref = storageRef(storage, url);
        await deleteObject(ref);
      } catch {}
      const newImages = images.filter(img => img.url !== url);
      await updateDoc(companyProfileRef, { images: newImages });
      setImages(newImages);
      toast({ title: 'Photo Removed', description: 'Image removed.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Remove Error', description: error.message });
    }
    setUploading(false);
  };

  const handleCaptionChange = async (idx: number, caption: string) => {
    if (!isAdmin) return;
    const newImages = images.map((img, i) => i === idx ? { ...img, caption } : img);
    setImages(newImages);
    await updateDoc(companyProfileRef, { images: newImages });
  };

  // Increment image view count
  const handleImageView = async (idx: number) => {
    const newImages = images.map((img, i) => i === idx ? { ...img, views: (img.views || 0) + 1 } : img);
    setImages(newImages);
    await updateDoc(companyProfileRef, { images: newImages });
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
            {images.length === 0 && (
              <p className="col-span-full text-muted-foreground">No photos yet. Admins can add images.</p>
            )}
            {images.map((img, idx) => (
              <div key={img.url} className="relative group">
                <Image src={img.url} alt={`Company photo ${idx + 1}`} width={600} height={400} className="rounded-lg shadow-md" onLoad={() => handleImageView(idx)} />
                {isEditing ? (
                  <>
                    <button
                      onClick={() => handleRemoveImage(img.url)}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 opacity-80 hover:opacity-100"
                      title="Remove Photo"
                    >
                      &times;
                    </button>
                    <input
                      type="text"
                      value={img.caption || ''}
                      onChange={e => handleCaptionChange(idx, e.target.value)}
                      placeholder="Add caption..."
                      className="absolute bottom-2 left-2 right-2 bg-white/80 p-2 rounded shadow text-sm"
                    />
                  </>
                ) : (
                  <>
                    {img.caption && <div className="absolute bottom-2 left-2 right-2 bg-white/80 p-2 rounded shadow text-sm text-center">{img.caption}</div>}
                    {typeof img.views === 'number' && <div className="absolute top-2 left-2 bg-blue-600 text-white rounded-full px-2 py-1 text-xs">{img.views} views</div>}
                  </>
                )}
              </div>
            ))}
          </div>
          {isEditing && (
            <div className="mt-4 flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="border p-2 rounded"
              />
              <Button variant="outline" disabled={uploading}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {uploading ? 'Uploading...' : 'Add Photo'}
              </Button>
            </div>
          )}
        </div>
    {/* Profile view analytics for admins */}
    {isAdmin && (
      <div className="mt-8">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-2">Profile Analytics</h3>
            <p>Total profile views: <span className="font-bold">{profileData?.views || 0}</span></p>
            <ul className="mt-2 text-sm">
              {images.map((img, idx) => (
                <li key={img.url} className="mb-1">Image {idx + 1}: <span className="font-bold">{img.views || 0}</span> views {img.caption && <>- <span className="italic">{img.caption}</span></>}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    )}
    </div>
  );
}
