
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { CalendarIcon, Link as LinkIcon, Puzzle, Save, Sparkles, Phone, BellOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { GenerateAvatarDialog } from '@/components/account/generate-avatar-dialog';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getInitials } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DangerZone } from '@/components/account/danger-zone';
import { Switch } from '@/components/ui/switch';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  username: z.string().optional(),
  jobTitle: z.string().optional(),
  bio: z.string().optional(),
  skills: z.string().optional(),
  birthDate: z.date().optional(),
  countryCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  status: z.string().optional(),
  dnd: z.boolean().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const coolAdjectives = ['Pixel', 'Cyber', 'Data', 'Quantum', 'Astro', 'Robo', 'Nano', 'Echo', 'Zenith', 'Code'];
const coolNouns = ['Pioneer', 'Surfer', 'Mage', 'Ninja', 'Jedi', 'Vortex', 'Byte', 'Bot', 'Quest', 'Spark'];

function generateCoolUsername() {
    const adj = coolAdjectives[Math.floor(Math.random() * coolAdjectives.length)];
    const noun = coolNouns[Math.floor(Math.random() * coolNouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${noun}${num}`;
}


export default function AccountPage() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setPhotoUrl(user.photoURL || '');
      setDisplayName(user.displayName || '');
      // Fetch user data from Firestore
      const fetchUserData = async () => {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      };
      fetchUserData();
    }
  }, [user]);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: displayName,
      username: '',
      jobTitle: '',
      bio: '',
      skills: '',
      birthDate: undefined,
      countryCode: '',
      phoneNumber: '',
      status: '',
      dnd: false,
    },
    mode: 'onChange',
  });
  const { control, handleSubmit, setValue, formState: { isDirty, isSubmitting } } = profileForm;

  const handleAvatarUpdate = (url: string) => {
    setPhotoUrl(url);
    if (user) {
      updateProfile(user, { photoURL: url });
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...data,
        updatedAt: Timestamp.now(),
      }, { merge: true });
      toast({ title: 'Profile updated!' });
    } catch (err: any) {
      toast({ title: 'Error updating profile', description: err.message, variant: 'destructive' });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);
    if (!user) return;
    if (!currentPw || !newPw || !confirmPw) {
      setPwError('All fields are required.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match.');
      return;
    }
    setPwLoading(true);
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email!, currentPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);
      setPwSuccess('Password updated successfully.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) {
      setPwError(err.message);
    }
    setPwLoading(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and integration settings.
        </p>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit(onProfileSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              This information will be displayed publicly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={photoUrl} alt={displayName || ''} />
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
              </Avatar>
              <GenerateAvatarDialog onAvatarGenerated={handleAvatarUpdate} />
            </div>
            {/* ...existing profile fields... */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => <Input id="status" {...field} placeholder="What are you working on?" />}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dnd">Do Not Disturb</Label>
              <Controller
                name="dnd"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="dnd"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => <Input id="name" {...field} />}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="flex items-center gap-2">
                  <Controller
                    name="username"
                    control={control}
                    render={({ field }) => <Input id="username" {...field} placeholder="e.g., PixelPioneer" />}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setValue('username', generateCoolUsername(), { shouldDirty: true })}>
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Controller
                  name="jobTitle"
                  control={control}
                  render={({ field }) => <Input id="jobTitle" {...field} placeholder="Your job title" />}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <div className="flex items-center gap-2">
                  <Controller
                    name="countryCode"
                    control={control}
                    render={({ field }) => <Input id="countryCode" type="tel" {...field} placeholder="+1" className="w-20" />}
                  />
                  <Controller
                    name="phoneNumber"
                    control={control}
                    render={({ field }) => <Input id="phoneNumber" type="tel" {...field} placeholder="555-555-5555" />}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Birthdate</Label>
                <Controller
                  name="birthDate"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Controller
                name="bio"
                control={control}
                render={({ field }) => <Textarea id="bio" {...field} placeholder="Tell us a little bit about yourself." />}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skills">Skills</Label>
              <Controller
                name="skills"
                control={control}
                render={({ field }) => <Input id="skills" {...field} placeholder="Enter skills separated by commas (e.g., React, UI/UX, Project Management)" />}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={!isDirty || isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Assigned Teams/Projects Display */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Assigned Teams & Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Teams</h3>
            {userData?.teams?.length ? (
              <ul className="list-disc ml-6">
                {userData.teams.map((team: string, idx: number) => (
                  <li key={idx}>{team}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No teams assigned.</p>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Projects</h3>
            {userData?.projects?.length ? (
              <ul className="list-disc ml-6">
                {userData.projects.map((project: string, idx: number) => (
                  <li key={idx}>{project}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No projects assigned.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="currentPw">Current Password</Label>
              <Input id="currentPw" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required disabled={pwLoading} />
            </div>
            <div>
              <Label htmlFor="newPw">New Password</Label>
              <Input id="newPw" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required disabled={pwLoading} />
            </div>
            <div>
              <Label htmlFor="confirmPw">Confirm New Password</Label>
              <Input id="confirmPw" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required disabled={pwLoading} />
            </div>
            {pwError && <p className="text-destructive text-sm">{pwError}</p>}
            {pwSuccess && <p className="text-green-600 text-sm">{pwSuccess}</p>}
            <Button type="submit" disabled={pwLoading}>{pwLoading ? 'Updating...' : 'Change Password'}</Button>
          </form>
        </CardContent>
      </Card>
      <DangerZone />
    </div>
  );
}
