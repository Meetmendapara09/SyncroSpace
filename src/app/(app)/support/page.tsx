
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LifeBuoy } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { contact } from '@/ai/flows/contact';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';


const faqs = [
  {
    question: 'What is SyncroSpace?',
    answer:
      'SyncroSpace is a virtual collaboration platform designed to bring remote teams together. It provides customizable virtual offices where team members can interact using proximity-based video and audio chat, simulating the spontaneous interactions of a physical office.',
  },
  {
    question: 'How do I create a new virtual space?',
    answer:
      'You can create a new space from your dashboard by clicking the "Create Space" button. Give it a name, and you\'re ready to start inviting your team members.',
  },
  {
    question: 'How does proximity chat work?',
    answer:
      'In the virtual space, you can move your avatar around. When you get closer to other participants, their audio and video will become clearer, simulating a real-life conversation.',
  },
  {
    question: 'Can I integrate other tools with SyncroSpace?',
    answer:
      'Yes! We offer integrations with popular tools like Google, GitHub, and Jira. You can manage your integrations from the Account Settings page.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Absolutely. All data, including chat messages and user information, is encrypted both in transit and at rest. We use Firestore\'s built-in security features to protect your data.',
  },
];

const contactSchema = z.object({
    name: z.string().min(1, 'Name is required.'),
    email: z.string().email('Please enter a valid email.'),
    message: z.string().min(1, 'Message is required.'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function SupportPage() {
    const { toast } = useToast();
    const form = useForm<ContactFormData>({
        resolver: zodResolver(contactSchema),
        defaultValues: { name: '', email: '', message: '' },
    });

    const { isSubmitting } = form.formState;

    const onSubmit = async (data: ContactFormData) => {
        try {
            const result = await contact(data);
            if (result.success) {
                toast({
                    title: 'Message Sent!',
                    description: result.message,
                });
                form.reset();
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error Sending Message',
                description: error.message || 'An unknown error occurred.',
            });
        }
    };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center gap-4">
        <LifeBuoy className="h-8 w-8 text-primary" />
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Support</h1>
            <p className="text-muted-foreground">
            Get help and find answers to your questions.
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold tracking-tight mb-4">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i + 1}`}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
                ))}
            </Accordion>
        </div>
        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>Contact Us</CardTitle>
                    <CardDescription>
                        Can't find the answer? Reach out to us directly.
                    </CardDescription>
                </CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardContent className="space-y-4">
                             <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Your name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="Your email" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Message</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="How can we help?" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Submit'}
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
      </div>
    </div>
  );
}
