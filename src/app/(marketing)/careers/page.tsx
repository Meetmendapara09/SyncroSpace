
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";

const jobOpenings = [
    {
        title: 'Senior Frontend Engineer',
        location: 'Remote',
        department: 'Engineering',
        href: '#',
    },
    {
        title: 'Product Designer',
        location: 'Remote',
        department: 'Design',
        href: '#',
    },
    {
        title: 'Marketing Manager',
        location: 'Remote',
        department: 'Marketing',
        href: '#',
    },
    {
        title: 'Customer Success Advocate',
        location: 'Remote',
        department: 'Support',
        href: '#',
    }
]

export default function CareersPage() {
    return (
      <div className="container mx-auto max-w-4xl py-12">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Join Our Team
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                We're building the future of remote work, and we're looking for passionate people to join us on our mission.
            </p>
        </div>

        <div className="space-y-6">
            {jobOpenings.map(job => (
                <Card key={job.title} className="hover:border-primary transition-colors">
                    <CardHeader>
                        <CardTitle>{job.title}</CardTitle>
                        <CardDescription>
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{job.location}</span>
                                <span className="text-muted-foreground/50">|</span>
                                <span>{job.department}</span>
                            </div>
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                       <Button asChild variant="outline">
                           <Link href={job.href}>
                                View Details <ArrowRight className="ml-2 h-4 w-4" />
                           </Link>
                       </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
      </div>
    );
  }
  
