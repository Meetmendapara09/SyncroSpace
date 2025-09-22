
'use server';
/**
 * @fileOverview A flow for generating user avatars using AI.
 *
 * - generateAvatar - A function that generates an avatar from a text prompt.
 * - GenerateAvatarInput - The input type for the generateAvatar function.
 * - GenerateAvatarOutput - The return type for the generateAvatar function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAvatarInputSchema = z.object({
  prompt: z.string().describe('A text prompt describing the desired avatar.'),
});
export type GenerateAvatarInput = z.infer<typeof GenerateAvatarInputSchema>;

const GenerateAvatarOutputSchema = z.object({
  avatarDataUri: z
    .string()
    .describe('The generated avatar image as a data URI.'),
});
export type GenerateAvatarOutput = z.infer<typeof GenerateAvatarOutputSchema>;

export async function generateAvatar(
  input: GenerateAvatarInput
): Promise<GenerateAvatarOutput> {
  if (!input.prompt || input.prompt.trim() === '') {
    throw new Error('Avatar prompt cannot be empty');
  }
  
  try {
    return await generateAvatarFlow(input);
  } catch (error: any) {
    console.error('Error in generateAvatar flow:', error);
    throw new Error(`Failed to generate avatar: ${error.message || 'Image generation service unavailable'}`);
  }
}

const generateAvatarFlow = ai.defineFlow(
  {
    name: 'generateAvatarFlow',
    inputSchema: GenerateAvatarInputSchema,
    outputSchema: GenerateAvatarOutputSchema,
  },
  async ({prompt}) => {
    // Sanitize prompt
    const sanitizedPrompt = prompt.trim().replace(/[^\w\s,.!?]/g, '').slice(0, 500);
    
    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: `a user avatar for a virtual collaboration app, centered, vibrant, professional yet creative, on a simple background. prompt: ${sanitizedPrompt}`,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          // Veo 2 only.
          // aspectRatio: '1:1', // produce a square image
        },
      });

      if (!media?.url) {
        throw new Error('Image generation failed - no image was returned.');
      }

      // Validate image URL format
      if (!media.url.startsWith('data:')) {
        throw new Error('Invalid image format received.');
      }

      return {
        avatarDataUri: media.url,
      };
    } catch (error: any) {
      console.error('Error in avatar generation:', error);
      if (error.message?.includes('safety') || error.message?.includes('policy')) {
        throw new Error('Your prompt could not be processed. Please try a different description.');
      }
      throw new Error(`Avatar generation failed: ${error.message || 'Image service unavailable'}`);
    }
  }
);
