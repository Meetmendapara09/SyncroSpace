
import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full lg:grid lg:min-h-dvh lg:grid-cols-2">
       <div className="hidden bg-muted lg:block">
        <div className="relative h-full">
            <Image
                src="https://picsum.photos/1200/800"
                alt="Image"
                width={1200}
                height={800}
                className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                data-ai-hint="team collaboration"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            <div className="absolute bottom-8 left-8 text-white">
                <h2 className="text-3xl font-bold">Your Team's Digital Headquarters</h2>
                <p className="mt-2 max-w-lg">SyncroSpace is more than a tool—it's a place. An all-in-one platform for remote teams to collaborate, manage projects, and build culture.</p>
            </div>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        {children}
      </div>
    </div>
  );
}
