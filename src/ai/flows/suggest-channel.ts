'use server';
/**
 * @fileOverview AI agent that suggests relevant virtual spaces or channels to join based on user activity and profile.
 *
 * - suggestChannel - A function that suggests a channel to join.
 * - SuggestChannelInput - The input type for the suggestChannel function.
 * - SuggestChannelOutput - The return type for the suggestChannel function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestChannelInputSchema = z.object({
  userProfile: z
    .string()
    .describe('The user profile, including skills, interests, and job title.'),
  userActivity: z
    .string()
    .describe('The user activity, including recently accessed channels and documents.'),
});
export type SuggestChannelInput = z.infer<typeof SuggestChannelInputSchema>;

const SuggestChannelOutputSchema = z.object({
  channelName: z.string().describe('The name of the suggested channel.'),
  channelDescription: z.string().describe('A brief description of the channel.'),
  reason: z.string().describe('The reason why the channel is suggested.'),
});
export type SuggestChannelOutput = z.infer<typeof SuggestChannelOutputSchema>;

export async function suggestChannel(input: SuggestChannelInput): Promise<SuggestChannelOutput> {
  return suggestChannelFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestChannelPrompt',
  input: {schema: SuggestChannelInputSchema},
  output: {schema: SuggestChannelOutputSchema},
  prompt: `You are an AI assistant that suggests relevant virtual spaces or channels to join based on user activity and profile.

  User Profile: {{{userProfile}}}
  User Activity: {{{userActivity}}}

  Suggest a channel to join, providing the channel name, a brief description, and the reason for the suggestion.
  Format your response as a JSON object that matches this schema:
  ${JSON.stringify(SuggestChannelOutputSchema.describe(''))}
  `,
});

const suggestChannelFlow = ai.defineFlow(
  {
    name: 'suggestChannelFlow',
    inputSchema: SuggestChannelInputSchema,
    outputSchema: SuggestChannelOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
