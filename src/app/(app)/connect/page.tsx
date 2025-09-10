
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Share2, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { CreateConnectChannelDialog } from '@/components/connect/create-connect-channel-dialog';

export default function ConnectPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SyncroSpace Connect</h1>
          <p className="text-muted-foreground max-w-2xl">
            Collaborate securely with partners, clients, and freelancers in shared channels without giving them access to your full workspace.
          </p>
        </div>
        <CreateConnectChannelDialog>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Connect Channel
          </Button>
        </CreateConnectChannelDialog>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                    <div>
                        <CardTitle>Secure & Isolated</CardTitle>
                        <CardDescription>External collaborators only see the channels they're invited to, keeping the rest of your workspace private.</CardDescription>
                    </div>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Share2 className="h-8 w-8 text-primary" />
                    <div>
                        <CardTitle>Seamless Collaboration</CardTitle>
                        <CardDescription>Guests have access to chat, file sharing, and task management within the shared channel, just like your internal team.</CardDescription>
                    </div>
                </CardHeader>
            </Card>
        </div>
        <div>
            <Image 
                src="https://picsum.photos/600/400"
                alt="Collaboration illustration"
                width={600}
                height={400}
                className="rounded-lg shadow-lg"
                data-ai-hint="people connecting puzzle pieces"
            />
        </div>
      </div>

       <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Your Connect Channels</h2>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
            <h3 className="text-xl font-medium">No Connect channels yet</h3>
            <p className="text-sm text-muted-foreground mt-2">
                Create your first Connect channel to start collaborating with external users.
            </p>
            <CreateConnectChannelDialog>
                <Button className="mt-4">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Your First Connect Channel
                </Button>
            </CreateConnectChannelDialog>
        </div>
      </div>

    </div>
  );
}
