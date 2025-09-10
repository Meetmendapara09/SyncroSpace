
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { Linkedin, Github } from 'lucide-react';
import Link from "next/link";
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/utils";

export default function AboutPage() {
    const [teamMembersSnapshot, loading] = useCollection(
        query(collection(db, 'users'), where('role', '==', 'admin'))
    );

    const teamMembers = teamMembersSnapshot?.docs.map(doc => doc.data());

    return (
      <div className="container mx-auto max-w-4xl py-12">
        <div className="space-y-16">
            <section className="text-center">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Our Mission</h1>
                <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                    To break down the barriers of remote work by creating digital spaces that are as dynamic, collaborative, and human as the physical world. We believe that great ideas and strong teams can be built from anywhere.
                </p>
            </section>
            
            <section className="text-center">
                <h2 className="text-3xl font-bold tracking-tight">Our Vision</h2>
                <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                    To be the leading platform for remote-first companies, fostering a global community where innovation and culture know no boundaries.
                </p>
            </section>

            <section className="text-center">
                <h2 className="text-3xl font-bold tracking-tight">Our Values</h2>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
                    <div className="p-6 rounded-lg border">
                        <h3 className="font-semibold text-lg">Collaboration</h3>
                        <p className="mt-2 text-muted-foreground">We believe in the power of working together and building on each other's ideas.</p>
                    </div>
                    <div className="p-6 rounded-lg border">
                        <h3 className="font-semibold text-lg">Innovation</h3>
                        <p className="mt-2 text-muted-foreground">We constantly push the boundaries of technology to create better remote experiences.</p>
                    </div>
                    <div className="p-6 rounded-lg border">
                        <h3 className="font-semibold text-lg">Human-Centric</h3>
                        <p className="mt-2 text-muted-foreground">We put people first, designing tools that enhance connection, not replace it.</p>
                    </div>
                </div>
            </section>

            <section>
                <Image
                    src="https://picsum.photos/1200/500"
                    alt="Team working together"
                    width={1200}
                    height={500}
                    sizes="(max-width: 1200px) 100vw, 1200px"
                    className="rounded-xl shadow-lg"
                    data-ai-hint="diverse team working office"
                />
            </section>
    
            <section className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Meet the Team</h2>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
                We are a passionate group of innovators, creators, and problem-solvers dedicated to revolutionizing remote collaboration.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-8">
                {loading && [...Array(3)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <Skeleton className="h-5 w-32 mt-4" />
                        <Skeleton className="h-4 w-24 mt-1" />
                    </div>
                ))}
                {!loading && teamMembers?.map(member => (
                    <div key={member.uid} className="flex flex-col items-center">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={member.photoURL} />
                            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <h3 className="mt-4 font-semibold text-lg">{member.name}</h3>
                        <p className="text-sm text-primary">{member.jobTitle || 'Team Member'}</p>
                        <div className="flex gap-4 mt-2">
                            <Link href="#" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                                <Github className="h-5 w-5" />
                            </Link>
                            <Link href="#" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                                <Linkedin className="h-5 w-5" />
                            </Link>
                        </div>
                    </div>  
                ))}
            </div>
            </section>
        </div>
      </div>
    );
  }
  
