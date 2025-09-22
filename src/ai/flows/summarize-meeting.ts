
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
  // Validate input
  if (!input.audioDataUri || !input.audioDataUri.startsWith('data:')) {
    throw new Error('Invalid audio data format.');
  }
  
  try {
    return await summarizeMeetingFlow(input);
  } catch (error: any) {
    console.error('Error in summarizeMeeting flow:', error);
    throw new Error(`Failed to summarize meeting: ${error.message || 'Audio processing failed'}`);
  }
}

const summarizeMeetingFlow = ai.defineFlow(
  {
    name: 'summarizeMeetingFlow',
    inputSchema: SummarizeMeetingInputSchema,
    outputSchema: SummarizeMeetingOutputSchema,
  },
  async ({audioDataUri}) => {
    try {
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
          throw new Error('Failed to summarize the meeting - empty response received.');
      }
      
      // Validate output structure
      if (!output.transcript || !output.summary || !Array.isArray(output.actionItems)) {
        throw new Error('Invalid summary format returned.');
      }
      
      // If transcript or summary is too short, it might be an error
      if (output.transcript.length < 20 || output.summary.length < 20) {
        throw new Error('Audio could not be properly transcribed. Please ensure clear audio quality.');
      }

      return output;
    } catch (error: any) {
      console.error('Error in meeting summarization:', error);
      if (error.message?.includes('audio') || error.message?.includes('transcription')) {
        throw new Error('Could not process audio. Please ensure the recording is clear and in a supported format.');
      }
      throw new Error(`Meeting summarization failed: ${error.message || 'Audio processing service unavailable'}`);
    }
  }
);
