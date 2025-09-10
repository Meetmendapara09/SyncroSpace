
'use server';
/**
 * @fileOverview A flow for handling contact form submissions.
 *
 * - contact - A function that handles a contact form submission.
 * - ContactInput - The input type for the contact function.
 * - ContactOutput - The return type for the contact function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ContactInputSchema = z.object({
  name: z.string().describe('The name of the person submitting the form.'),
  email: z.string().email().describe('The email address of the person.'),
  subject: z.string().optional().describe('The subject of the message.'),
  message: z.string().describe('The content of the message.'),
});
export type ContactInput = z.infer<typeof ContactInputSchema>;

const ContactOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type ContactOutput = z.infer<typeof ContactOutputSchema>;

export async function contact(input: ContactInput): Promise<ContactOutput> {
  return contactFlow(input);
}

const contactFlow = ai.defineFlow(
  {
    name: 'contactFlow',
    inputSchema: ContactInputSchema,
    outputSchema: ContactOutputSchema,
  },
  async (input) => {
    // In a real application, you would integrate with a service like SendGrid,
    // or create a ticket in a support system like Zendesk.
    console.log('Received contact form submission:', input);
    
    // For now, we'll just simulate a successful submission.
    return {
      success: true,
      message: 'Thank you for your message! We will get back to you shortly.',
    };
  }
);
