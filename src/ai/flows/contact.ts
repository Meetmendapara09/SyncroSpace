
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
  // Validate input
  if (!input.name || !input.email || !input.message) {
    throw new Error('Name, email, and message are required fields.');
  }
  
  // Additional email validation
  if (!input.email.includes('@') || !input.email.includes('.')) {
    throw new Error('Please provide a valid email address.');
  }
  
  try {
    return await contactFlow(input);
  } catch (error: any) {
    console.error('Error in contact form submission:', error);
    throw new Error(`Failed to submit contact form: ${error.message || 'Service unavailable'}`);
  }
}

const contactFlow = ai.defineFlow(
  {
    name: 'contactFlow',
    inputSchema: ContactInputSchema,
    outputSchema: ContactOutputSchema,
  },
  async (input) => {
    try {
      // In a real application, you would integrate with a service like SendGrid,
      // or create a ticket in a support system like Zendesk.
      console.log('Processing contact form submission:', input);
      
      // Sanitize inputs
      const sanitizedInput = {
        name: input.name.trim(),
        email: input.email.trim(),
        subject: (input.subject || 'Contact Form Inquiry').trim(),
        message: input.message.trim()
      };
      
      // Add timestamp
      const timestamp = new Date().toISOString();
      console.log(`Contact form submission at ${timestamp}:`, sanitizedInput);
      
      // For now, we'll just simulate a successful submission.
      return {
        success: true,
        message: 'Thank you for your message! We will get back to you shortly.',
      };
    } catch (error: any) {
      console.error('Error processing contact form:', error);
      return {
        success: false,
        message: `Unable to process your request: ${error.message || 'An unexpected error occurred'}`,
      };
    }
  }
);
