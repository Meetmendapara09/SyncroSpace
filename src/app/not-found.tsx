'use client';

import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="max-w-md">
        <Image
          src="https://picsum.photos/600/400"
          alt="A lost robot in space"
          width={400}
          height={300}
          sizes="(max-width: 768px) 100vw, 400px"
          className="mx-auto mb-8 rounded-lg"
          data-ai-hint="lost robot"
        />
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">
          You've Discovered a New Quadrant!
        </h2>
        <p className="mt-2 text-muted-foreground">
          Unfortunately, this part of the SyncroSpace is still under construction or doesn't exist.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
