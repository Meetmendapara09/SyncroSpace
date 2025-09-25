'use client';

import { useState } from 'react';
import { useDocument } from 'react-firebase-hooks/firestore';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UserActivityLog from '@/components/users/user-activity-log';
import UserDataExportButton from '@/components/users/user-data-export-button';
import { logUserActivity } from '@/lib/user-activity';
import { sendPasswordResetEmail } from 'firebase/auth';

interface Params {
  params: {
    userId: string;
  }
}

export default function UserDetailPage({ params }: Params) {
  const { userId } = params;
  const [currentUser] = useAuthState(auth);
  const userRef = doc(db, 'users', userId);
  const [userData, loading, error] = useDocument(userRef);
  const [currentUserData] = useDocument(currentUser ? doc(db, 'users', currentUser.uid) : null);
  const router = useRouter();
  const { toast } = useToast();
  
  const [name, setName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [teams, setTeams] = useState<string[]>([]);
  const [teamInput, setTeamInput] = useState<string>('');
  
  // Initialize form data once user data is loaded
  useState(() => {
    if (userData?.exists()) {
      const data = userData.data();
      setName(data.name || '');
      setBio(data.bio || '');
      setTeams(data.teams || []);
    }
  });
  
  const isAdmin = currentUserData?.data()?.role === 'admin';
  
  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </div>
    );
  }
  
  if (error || !userData?.exists()) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 text-center">
        <h1 className="text-2xl font-bold">User Not Found</h1>
        <p className="text-muted-foreground">The requested user could not be found or you don't have permission to view it.</p>
        <Button asChild><Link href="/users">Back to Users</Link></Button>
      </div>
    );
  }
  
  if (!isAdmin && currentUser?.uid !== userId) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this user's details.</p>
        <Button asChild><Link href="/dashboard">Back to Dashboard</Link></Button>
      </div>
    );
  }
  
  const user = userData.data();
  
  const handleUpdateProfile = async () => {
    try {
      await updateDoc(userRef, {
        name,
        bio,
        teams
      });
      
      logUserActivity(userId, 'profile_updated', { updatedBy: currentUser?.uid });
      
      toast({
        title: 'Profile Updated',
        description: 'The user profile has been successfully updated.',
      });
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message,
        variant: 'destructive'
      });
    }
  };
  
  const handleAddTeam = () => {
    if (teamInput && !teams.includes(teamInput)) {
      setTeams([...teams, teamInput]);
      setTeamInput('');
    }
  };
  
  const handleRemoveTeam = (team: string) => {
    setTeams(teams.filter(t => t !== team));
  };
  
  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      
      logUserActivity(userId, 'password_reset_requested', { 
        requestedBy: currentUser?.uid 
      });
      
      toast({
        title: 'Password Reset Email Sent',
        description: `A password reset email has been sent to ${user.email}.`
      });
    } catch (err: any) {
      toast({
        title: 'Reset Failed',
        description: err.message,
        variant: 'destructive'
      });
    }
  };
  
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/users">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">User Details</h1>
      </div>
      
      <div className="grid gap-8 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center text-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.photoURL} alt={user.name} />
                <AvatarFallback className="text-xl">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="flex justify-center gap-2 mt-2">
                  <Badge>{user.role}</Badge>
                  <Badge variant={user.deactivatedAt ? 'destructive' : 'outline'}>
                    {user.deactivatedAt ? 'Deactivated' : 'Active'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Joined: {user.createdAt?.toDate().toLocaleDateString()}</p>
              {user.lastActive && (
                <p className="text-sm text-muted-foreground">
                  Last active: {user.lastActive.toDate().toLocaleDateString()}
                </p>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <UserDataExportButton userId={userId} />
              
              {isAdmin && (
                <Button variant="outline" onClick={handleResetPassword}>
                  Send Password Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        <div className="md:col-span-2">
          <Tabs defaultValue="profile">
            <TabsList className="mb-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Edit Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Teams/Projects</Label>
                    <div className="flex gap-2">
                      <Input
                        value={teamInput}
                        onChange={(e) => setTeamInput(e.target.value)}
                        placeholder="Add team or project..."
                      />
                      <Button type="button" onClick={handleAddTeam}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {teams.map(team => (
                        <Badge key={team} variant="secondary" className="gap-2">
                          {team}
                          <button onClick={() => handleRemoveTeam(team)}>×</button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Button onClick={handleUpdateProfile} className="flex gap-2">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="activity">
              <UserActivityLog userId={userId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}