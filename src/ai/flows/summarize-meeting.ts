
'use server';
/**
 * @fileOverview A flow for transcribing and summarizing meetings.
 *
 * - summarizeMeeting - Transcribes and summarizes an audio recording.
 * - SummarizeMeetingInput - The input type for the summarizeMeeting function.
 * - SummarizeMeetingOutput - The return type for the summarizeMeeting function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeMeetingInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The meeting audio recording as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SummarizeMeetingInput = z.infer<typeof SummarizeMeetingInputSchema>;

const SummarizeMeetingOutputSchema = z.object({
  summary: z.string().describe("A concise summary of the meeting's key points."),
  actionItems: z.array(z.string()).describe('A list of action items identified during the meeting.'),
  transcript: z.string().describe('The full transcript of the meeting audio.'),
});
export type SummarizeMeetingOutput = z.infer<typeof SummarizeMeetingOutputSchema>;

export async function summarizeMeeting(
  input: SummarizeMeetingInput
): Promise<SummarizeMeetingOutput> {
  return summarizeMeetingFlow(input);
}

const summarizeMeetingFlow = ai.defineFlow(
  {
    name: 'summarizeMeetingFlow',
    inputSchema: SummarizeMeetingInputSchema,
    outputSchema: SummarizeMeetingOutputSchema,
  },
  async ({audioDataUri}) => {
    
    const {output} = await ai.generate({
        prompt: [
            {
                text: `You are an expert meeting assistant. Transcribe the following audio recording. Then, based on the transcript, provide a concise summary and extract all key action items.`
            },
            {
                media: {
                    url: audioDataUri,
                }
            }
        ],
        output: {
            schema: z.object({
                transcript: z.string(),
                summary: z.string(),
                actionItems: z.array(z.string()),
            })
        }
    });

    if (!output) {
        throw new Error('Failed to summarize the meeting.');
    }

    return output;
  }
);
