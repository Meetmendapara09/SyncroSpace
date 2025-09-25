

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight, CheckCircle, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

function AppLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 text-primary"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
    </svg>
  );
}

export default function LandingPage() {
  const features = [
    'Create customizable virtual spaces',
    'Proximity-based audio and video chat',
    'Integrated Kanban boards and task lists',
    'Team calendars with Google Calendar sync',
    'Secure channels for external collaboration',
    'AI-powered suggestions to connect your team',
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <AppLogo />
            <span className="text-lg font-semibold">SyncroSpace</span>
          </Link>
          <nav className="ml-auto flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                Get Started <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative py-24 text-center md:py-32 lg:py-40">
          <div
            className="absolute inset-0 -z-10 bg-grid-slate-200/40 [mask-image:radial-gradient(100%_50%_at_50%_50%,rgba(0,0,0,1),rgba(0,0,0,0))]"
            style={{
              // @ts-ignore
              '--bg-grid-color': 'hsl(var(--border))',
              backgroundImage: `linear-gradient(to right, var(--bg-grid-color) 1px, transparent 1px),
                                linear-gradient(to bottom, var(--bg-grid-color) 1px, transparent 1px)`,
              backgroundSize: '30px 30px',
            }}
          ></div>
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                Your Team's Digital Headquarters
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
                SyncroSpace is more than a tool—it's a place. An all-in-one platform for remote teams to collaborate, manage projects, and build culture.
              </p>
              <div className="mt-8">
                <Button size="lg" asChild>
                  <Link href="/signup">Claim Your Space for Free</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="container py-20 md:py-24">
          <div className="mx-auto grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="space-y-6">
              <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  A New Dimension of Collaboration
                </h2>
                <p className="mt-4 text-muted-foreground">
                  SyncroSpace isn't just another tool. It's a place for your
                  team to thrive.
                </p>
              </div>
              <ul className="grid gap-4">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="mt-1 h-5 w-5 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <Image
                src="https://picsum.photos/600/600"
                alt="Product screenshot"
                width={600}
                height={600}
                sizes="(max-width: 1024px) 100vw, 600px"
                className="rounded-xl shadow-2xl"
                data-ai-hint="virtual office collaboration"
              />
              <div className="absolute -bottom-4 -right-4">
                <Card className="max-w-xs shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg">AI Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Let our AI suggest relevant channels to join based on your
                      activity.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section id="testimonial" className="bg-muted py-20 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <Avatar className="mx-auto mb-4 h-16 w-16">
                <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <blockquote className="text-xl italic text-foreground md:text-2xl">
                “SyncroSpace has transformed how our remote team interacts. The
                virtual space feels alive, and has genuinely improved our team
                cohesion and spontaneous collaboration.”
              </blockquote>
              <cite className="mt-6 block font-semibold not-italic">
                Jane Doe, CEO of Innovate Inc.
              </cite>
              <div className="mt-2 flex justify-center gap-1 text-primary">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-primary" />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="cta" className="container py-20 text-center md:py-24">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Build Your Digital HQ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Sign up today and experience the future of remote work. It's free
            to get started.
          </p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href="/signup">
                Sign Up Now <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/50 py-12">
        <div className="container grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-full lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <AppLogo />
              <span className="text-lg font-semibold">SyncroSpace</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Redefining digital collaboration.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">Product</h4>
            <ul className="space-y-2">
              <li><Link href="/features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link></li>
              <li><Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link></li>
              <li><Link href="/documentation" className="text-sm text-muted-foreground hover:text-foreground">Documentation</Link></li>
              <li><Link href="/demo/caching" className="text-sm text-blue-500 hover:text-blue-600 font-medium">Caching Demo</Link></li>
              <li><Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">Company</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">About Us</Link></li>
              <li><Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">Blog</Link></li>
              <li><Link href="/careers" className="text-sm text-muted-foreground hover:text-foreground">Careers</Link></li>
              <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mt-8 border-t pt-6">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SyncroSpace. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
