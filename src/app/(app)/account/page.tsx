
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
import { updateProfile } from 'firebase/auth';
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


function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5">
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      ></path>
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      ></path>
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.657-3.356-11.303-7.962l-6.571,4.819C9.656,39.663,16.318,44,24,44z"
      ></path>
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C43.021,36.251,44,30.413,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      ></path>
    </svg>
  );
}

export default function AccountPage() {
  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const { toast } = useToast();

  const { control, handleSubmit, reset, setValue, watch, formState: { isDirty, isSubmitting } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', jobTitle: '', bio: '', skills: '', username: '', countryCode: '', phoneNumber: '', status: '', dnd: false },
  });

  const dndValue = watch('dnd');

  useEffect(() => {
    if (!user || !reset) return;
    const fetchUserData = async () => {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          reset({
            name: user.displayName || data.name || '',
            username: data.username || '',
            jobTitle: data.jobTitle || '',
            bio: data.bio || '',
            skills: data.skills || '',
            birthDate: data.birthDate ? (data.birthDate as Timestamp).toDate() : undefined,
            countryCode: data.countryCode || '',
            phoneNumber: data.phoneNumber || '',
            status: data.status || '',
            dnd: data.dnd || false,
          });
        } else {
            reset({ name: user.displayName || '' });
        }
    };
    fetchUserData();
  }, [user, reset]);

  
  const handleAvatarUpdate = async (avatarDataUri: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { photoURL: avatarDataUri }, { merge: true });
      setUserData((prev: any) => ({ ...prev, photoURL: avatarDataUri }));
      toast({
        title: 'Avatar Updated',
        description: 'Your new avatar has been saved.',
      });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error updating avatar',
            description: error.message,
        });
    }
  }

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    try {
      const dataToSave: any = { ...data };
      if (data.birthDate) {
        dataToSave.birthDate = Timestamp.fromDate(data.birthDate);
      }
      if (data.countryCode && data.phoneNumber) {
        dataToSave.fullPhoneNumber = `${data.countryCode}${data.phoneNumber}`;
      }


      await setDoc(doc(db, 'users', user.uid), dataToSave, { merge: true });
      
      if (user.displayName !== data.name) {
        await updateProfile(user, { displayName: data.name });
      }
      
      setUserData((prev: any) => ({ ...prev, ...data }));
      reset(data); // Resets the form's dirty state
      toast({
        title: 'Profile Saved',
        description: `Your profile has been updated.`,
      });
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Error updating profile',
        description: error.message,
      });
    }
  }
  
  const photoUrl = userData?.photoURL || user?.photoURL;
  const displayName = userData?.name || user?.displayName;

  const isProviderConnected = (providerId: string) => {
    return user?.providerData.some(provider => provider.providerId === providerId);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and integration settings.
        </p>
      </div>

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

             <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Controller
                    name="status"
                    control={control}
                    render={({ field }) => <Input id="status" {...field} placeholder="What are you working on?" />}
                />
            </div>
            
            <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label htmlFor="dnd" className="text-base flex items-center gap-2">
                        <BellOff className={cn("h-4 w-4", dndValue && "text-primary")} />
                        Do Not Disturb
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Pause all notifications.
                    </p>
                </div>
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
      
      <Card>
        <CardHeader>
          <CardTitle>Integration</CardTitle>
          <CardDescription>
            Connect your account to third-party services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            <li className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                    <GoogleIcon />
                    <div>
                        <h3 className="font-semibold">Google</h3>
                        <p className="text-sm text-muted-foreground">
                            {isProviderConnected('google.com') ? 'Connected for authentication' : 'Not connected'}
                        </p>
                    </div>
                </div>
                {isProviderConnected('google.com') ? (
                    <Button variant="destructive" size="sm" disabled>Disconnect</Button>
                ) : (
                    <Button variant="outline" size="sm"><LinkIcon className="mr-2 h-4 w-4" />Connect</Button>
                )}
            </li>
          </ul>
        </CardContent>
      </Card>
      <DangerZone />
    </div>
  );
}
