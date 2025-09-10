
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export function DangerZone() {
  const [user, loading] = useAuthState(auth);
  const { toast } = useToast();
  const router = useRouter();
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeactivate = async () => {
    if (!user) return;
    setIsDeactivating(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        deactivatedAt: new Date(),
      }, { merge: true });
      
      toast({
        title: 'Account Deactivated',
        description: 'Your account is scheduled for deletion in 15 days. You can log in again to reactivate it.',
      });
      auth.signOut();
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deactivating account',
        description: error.message,
      });
    } finally {
        setIsDeactivating(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      // First, delete the user's Firestore document
      await deleteDoc(doc(db, 'users', user.uid));
      
      // Then, delete the user from Firebase Authentication
      await deleteUser(user);

      toast({
        title: 'Account Deleted',
        description: 'Your account and all associated data have been permanently deleted.',
      });
      router.push('/');
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error deleting account',
            description: 'This is a sensitive operation and may require you to log in again. ' + error.message,
        });
    } finally {
        setIsDeleting(false);
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>
          These actions are irreversible. Please proceed with caution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border border-dashed border-destructive/50 p-4">
          <div>
            <h3 className="font-semibold">Deactivate Account</h3>
            <p className="text-sm text-muted-foreground">
              Your account will be disabled and permanently deleted after 15 days.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="mt-2 sm:mt-0">Deactivate</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to deactivate?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your account will be disabled. If you do not log back in within 15 days, your account and all data will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeactivate} disabled={isDeactivating}>
                    {isDeactivating ? 'Deactivating...' : 'Deactivate'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border border-dashed border-destructive/50 p-4">
          <div>
            <h3 className="font-semibold">Delete Account Immediately</h3>
            <p className="text-sm text-muted-foreground">
              This action is permanent and cannot be undone.
            </p>
          </div>
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="mt-2 sm:mt-0">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action is permanent and cannot be undone. This will permanently delete your account and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleDelete} 
                    disabled={isDeleting}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
