
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { contact } from "@/ai/flows/contact";

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Please enter a valid email.'),
  subject: z.string().min(1, 'Subject is required.'),
  message: z.string().min(1, 'Message is required.'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
    const { toast } = useToast();
    const form = useForm<ContactFormData>({
        resolver: zodResolver(contactSchema),
        defaultValues: { name: '', email: '', subject: '', message: '' },
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
        <div className="container mx-auto max-w-4xl py-12">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                    Get In Touch
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Have a question, a partnership idea, or just want to say hello? We'd love to hear from you.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Contact Form</CardTitle>
                    <CardDescription>
                        Fill out the form below and we'll get back to you as soon as possible.
                    </CardDescription>
                </CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                            <Input type="email" placeholder="Your email address" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Subject</FormLabel>
                                    <FormControl>
                                        <Input placeholder="What is this about?" {...field} />
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
                                        <Textarea placeholder="How can we help?" rows={6} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                                {isSubmitting ? 'Sending...' : 'Send Message'}
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    );
}
