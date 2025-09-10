
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email to send an invitation.'),
});

interface InviteDialogProps {
    children: React.ReactNode;
    spaceId: string;
    spaceName: string;
}

export function InviteDialog({ children, spaceId, spaceName }: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to invite someone.',
      });
      return;
    }

    setIsLoading(true);
    try {
      // In a real app, this would trigger a function to send an actual email.
      // For now, we'll just store the invitation in Firestore.
      await addDoc(collection(db, 'invites'), {
        spaceId: spaceId,
        spaceName: spaceName,
        invitedEmail: values.email,
        inviterId: user.uid,
        inviterName: user.displayName,
        createdAt: serverTimestamp(),
        status: 'pending',
      });

      // Try to find an existing user by email. If found, add them to the space
      // and create a lightweight pending entry on their user profile that the
      // dashboard can surface as a notification. This avoids writing to the
      // user's notifications subcollection and respects current rules.
      const usersQuery = query(collection(db, 'users'), where('email', '==', values.email));
      const usersSnap = await getDocs(usersQuery);
      if (!usersSnap.empty) {
        const invitedUser = usersSnap.docs[0];
        const invitedUid = invitedUser.id;

        // Add invited user to the space members
        await updateDoc(doc(db, 'spaces', spaceId), {
          members: arrayUnion(invitedUid),
        });

        // Append pendingSpaces entry on the user profile
        await updateDoc(doc(db, 'users', invitedUid), {
          pendingSpaces: arrayUnion({
            spaceId,
            spaceName,
            invitedAt: serverTimestamp(),
            inviterId: user.uid,
            status: 'invited',
          }),
        });
      }
      toast({
        title: 'Invitation Sent',
        description: `An invitation to join "${spaceName}" has been sent to ${values.email}.`,
      });
      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error sending invitation',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite to {spaceName}</DialogTitle>
          <DialogDescription>
            Enter the email address of the person you want to invite to this space.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="collaborator@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Sending Invite...' : 'Send Invite'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
