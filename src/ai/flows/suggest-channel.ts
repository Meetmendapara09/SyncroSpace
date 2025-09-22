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
  // Validate input
  if (!input.userProfile || !input.userActivity) {
    throw new Error('User profile and activity information are required.');
  }
  
  try {
    return await suggestChannelFlow(input);
  } catch (error: any) {
    console.error('Error in suggestChannel flow:', error);
    throw new Error(`Failed to suggest channel: ${error.message || 'AI suggestion service unavailable'}`);
  }
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
    try {
      const {output} = await prompt(input);
      
      if (!output) {
        throw new Error('Empty response received from AI model.');
      }
      
      // Validate output fields have meaningful content
      if (!output.channelName || !output.channelDescription || !output.reason ||
          output.channelName.length < 2 || output.channelDescription.length < 10 || output.reason.length < 10) {
        throw new Error('Invalid or incomplete channel suggestion.');
      }
      
      return output;
    } catch (error: any) {
      console.error('Error generating channel suggestion:', error);
      throw new Error(`Failed to generate channel suggestion: ${error.message || 'AI service error'}`);
    }
  }
);
