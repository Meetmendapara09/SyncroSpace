
'use client';

import { useState } from 'react';
import { suggestChannel, SuggestChannelOutput } from '@/ai/flows/suggest-channel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, Sparkles, Wand2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { auth, db } from '@/lib/firebase';
import { doc } from 'firebase/firestore';

export function AiSuggestionCard() {
  const [suggestion, setSuggestion] = useState<SuggestChannelOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [user] = useAuthState(auth);
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData, userDataLoading] = useDocumentData(userDocRef);


  const handleSuggestChannel = async () => {
    if (!userData) {
      setError('Could not load user profile.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Use dynamic data for the current user.
      const userProfile = `Name: ${userData.name}, Job Title: ${userData.jobTitle || 'Not specified'}`;
      // This could be enhanced by fetching actual recent activity.
      const userActivity = "Recently viewed the dashboard and the board page.";
      
      const result = await suggestChannel({ userProfile, userActivity });
      setSuggestion(result);
    } catch (e) {
      console.error(e);
      setError('Failed to get suggestion. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-background to-background">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Discover New Spaces</CardTitle>
            <CardDescription>Let AI find a relevant channel for you.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || userDataLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-5/6 rounded-md" />
          </div>
        ) : suggestion ? (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-primary">#{suggestion.channelName}</h3>
            <p className="text-sm text-muted-foreground">{suggestion.channelDescription}</p>
            <div>
              <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Why you should join:
              </p>
              <p className="text-sm text-muted-foreground italic pl-6">{suggestion.reason}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Click the button to get a personalized channel suggestion based on your profile and recent activity.</p>
        )}
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSuggestChannel} disabled={isLoading || userDataLoading} className="w-full">
          <Wand2 className="mr-2 h-4 w-4" />
          {isLoading ? 'Generating...' : suggestion ? 'Suggest Another' : 'Suggest a Channel'}
        </Button>
      </CardFooter>
    </Card>
  );
}
