// Static dummy implementation
import { z } from 'zod';

export const ContactInputSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  message: z.string(),
});
export type ContactInput = z.infer<typeof ContactInputSchema>;

export const ContactOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type ContactOutput = z.infer<typeof ContactOutputSchema>;

// Static implementation
export async function contact(
  input: ContactInput
): Promise<ContactOutput> {
  console.log('Using static dummy implementation of contact form');
  
  return {
    success: true,
    message: 'Thank you for your message. This is a static response as email features are not available in static export mode.',
  };
}
