
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from '@/components/ui/accordion';

const faqs = [
    {
      question: 'What is SyncroSpace?',
      answer:
        'SyncroSpace is a virtual collaboration platform designed to bring remote teams together. It provides customizable virtual offices where team members can interact using proximity-based video and audio chat, simulating the spontaneous interactions of a physical office.',
    },
    {
      question: 'How does the free plan work?',
      answer:
        'The Free plan is designed for small teams and individuals to get started. It includes up to 3 virtual spaces, 10 participants per space, and core features like proximity chat and basic integrations. It\'s a great way to experience SyncroSpace at no cost.',
    },
    {
      question: 'Can I upgrade, downgrade, or cancel my subscription at any time?',
      answer:
        'Yes, absolutely. You can manage your subscription from your account settings. You can upgrade to a higher tier, downgrade to a lower one, or cancel your Pro subscription at any time. Changes will take effect at the end of your current billing cycle.',
    },
    {
      question: 'Is my data and communication secure?',
      answer:
        'Security is our top priority. All communications, including video, audio, and chat, are encrypted end-to-end. Your data is stored securely using industry-standard practices, ensuring that your conversations and information remain private and protected.',
    },
    {
        question: 'Do you offer discounts for non-profits or educational institutions?',
        answer:
            'Yes, we do! We believe in supporting organizations that make a positive impact. Please contact our sales team through the contact page for more information on our special pricing for non-profits and educational institutions.',
    },
  ];

export default function FaqPage() {
    return (
      <div className="container mx-auto max-w-4xl py-12">
         <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Frequently Asked Questions
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                Have questions? We have answers. If you can't find what you're looking for, feel free to contact us.
            </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i + 1}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
            ))}
        </Accordion>
      </div>
    );
  }
  
