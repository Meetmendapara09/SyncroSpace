'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Users, Gamepad2 } from 'lucide-react';

export default function SpaceLandingPage() {
  const router = useRouter();

  const redirectToCaveVerse = () => {
    // In development, redirect to CaveVerse client on port 3001
    // In production, this could be configured differently
    const caveVerseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3001'
      : window.location.origin.replace(':9002', ':3001'); // Adjust for production
    
    window.open(caveVerseUrl, '_blank');
  };

  const redirectToTraditionalSpace = () => {
    // Redirect to the traditional SyncroSpace experience
    router.push('/space/demo-space-id');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Choose Your Virtual Experience</h1>
          <p className="text-lg text-muted-foreground">
            Select how you'd like to interact in the virtual space
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* CaveVerse Client */}
          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-6 w-6 text-blue-600" />
                <CardTitle>CaveVerse Experience</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Immersive 2D virtual world with real-time multiplayer interaction, 
                  character movement, and spatial audio communication.
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>Real-time multiplayer</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Gamepad2 className="h-4 w-4" />
                    <span>Interactive game world</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ExternalLink className="h-4 w-4" />
                    <span>Full-screen experience</span>
                  </div>
                </div>

                <Button 
                  onClick={redirectToCaveVerse}
                  className="w-full"
                  size="lg"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Enter CaveVerse
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Opens in new tab • Runs on port 3001
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Traditional SyncroSpace */}
          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-green-600" />
                <CardTitle>Traditional Space</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Browser-based virtual office with integrated chat, video calling, 
                  and collaboration tools designed for professional meetings.
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>Video conferencing</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Gamepad2 className="h-4 w-4" />
                    <span>Virtual office layout</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ExternalLink className="h-4 w-4" />
                    <span>Integrated experience</span>
                  </div>
                </div>

                <Button 
                  onClick={redirectToTraditionalSpace}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Enter Workspace
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Stay in current tab • Integrated experience
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 p-6 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2">Developer Information</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <strong>SyncroSpace Main:</strong> http://localhost:9002
            </div>
            <div>
              <strong>CaveVerse Client:</strong> http://localhost:3001
            </div>
            <div>
              <strong>CaveVerse Server:</strong> http://localhost:2567
            </div>
            <div>
              <strong>Status:</strong> All servers running via monorepo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}