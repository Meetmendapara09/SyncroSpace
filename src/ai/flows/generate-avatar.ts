
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
  return generateAvatarFlow(input);
}

const generateAvatarFlow = ai.defineFlow(
  {
    name: 'generateAvatarFlow',
    inputSchema: GenerateAvatarInputSchema,
    outputSchema: GenerateAvatarOutputSchema,
  },
  async ({prompt}) => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `a user avatar for a virtual collaboration app, centered, vibrant, professional yet creative, on a simple background. prompt: ${prompt}`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        // Veo 2 only.
        // aspectRatio: '1:1', // produce a square image
      },
    });

    if (!media?.url) {
      throw new Error('Image generation failed.');
    }

    return {
      avatarDataUri: media.url,
    };
  }
);
