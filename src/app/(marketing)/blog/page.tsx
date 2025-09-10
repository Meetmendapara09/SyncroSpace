
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const blogPosts = [
    {
        title: 'The Future of Remote Work is Here',
        description: 'How virtual spaces are transforming team dynamics and productivity.',
        author: 'Jane Doe',
        date: 'July 15, 2024',
        image: 'https://picsum.photos/600/400',
        imageHint: 'futuristic office blue',
        href: '#',
    },
    {
        title: '5 Tips for Fostering Spontaneous Collaboration',
        description: 'Learn how to encourage those "water cooler" moments in a remote setting.',
        author: 'John Smith',
        date: 'July 8, 2024',
        image: 'https://picsum.photos/600/400',
        imageHint: 'team brainstorming whiteboard',
        href: '#',
    },
    {
        title: 'Designing Your Digital Headquarters',
        description: 'A guide to customizing your SyncroSpace for maximum impact.',
        author: 'Alice Johnson',
        date: 'July 1, 2024',
        image: 'https://picsum.photos/600/400',
        imageHint: 'interior design moodboard',
        href: '#',
    },
]

export default function BlogPage() {
    return (
      <div className="container mx-auto max-w-4xl py-12">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                From the Blog
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                Insights, tips, and stories about the future of work and collaboration from the SyncroSpace team.
            </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-1">
            {blogPosts.map((post) => (
                <Link key={post.title} href={post.href}>
                    <Card className="group overflow-hidden md:grid md:grid-cols-3 md:items-center transition-all hover:border-primary">
                        <div className="relative h-48 md:h-full w-full md:col-span-1">
                            <Image
                                src={post.image}
                                alt={post.title}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                data-ai-hint={post.imageHint}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-2xl group-hover:text-primary">{post.title}</CardTitle>
                                <CardDescription>{post.description}</CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <p className="text-sm text-muted-foreground">{post.author} &bull; {post.date}</p>
                                <ArrowRight className="ml-auto h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardFooter>
                        </div>
                    </Card>
                </Link>
            ))}
        </div>
      </div>
    );
  }
  
