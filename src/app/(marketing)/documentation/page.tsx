
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Book, LifeBuoy, Rocket } from 'lucide-react';
import Link from 'next/link';

const topics = [
    {
        icon: <Rocket className="h-8 w-8 text-primary" />,
        title: "Getting Started",
        description: "Your first steps to creating and joining virtual spaces.",
        href: "#",
    },
    {
        icon: <Book className="h-8 w-8 text-primary" />,
        title: "Space Customization",
        description: "Learn how to customize your space to match your brand.",
        href: "#",
    },
    {
        icon: <LifeBuoy className="h-8 w-8 text-primary" />,
        title: "Integrations",
        description: "Connect SyncroSpace with your favorite tools.",
        href: "#",
    },
]

export default function DocumentationPage() {
    return (
      <div className="container mx-auto max-w-4xl py-12">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Documentation
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                Everything you need to know to get the most out of SyncroSpace.
            </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
            {topics.map((topic) => (
            <Link key={topic.title} href={topic.href}>
                <Card className="h-full hover:border-primary transition-colors">
                    <CardHeader className="flex flex-row items-center gap-4">
                        {topic.icon}
                        <CardTitle>{topic.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{topic.description}</p>
                    </CardContent>
                </Card>
            </Link>
            ))}
        </div>

        <div className="mt-16">
            <h2 className="text-3xl font-bold tracking-tight text-center">Getting Started</h2>
            <div className="mt-8 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>1. Create Your Account</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>First, <Link href="/signup" className="text-primary underline">sign up for a free account</Link>. Once you've verified your email, you can log in to your dashboard.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>2. Create Your First Space</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>From the dashboard, click the "Create Space" button. Give your space a name, and you're all set. Your new space will appear on your dashboard.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>3. Invite Your Team</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Inside your space, you'll find an option to invite members. You can invite them by email or by sharing a unique link.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    );
  }
  
