
'use server';
/**
 * @fileOverview A simple chatbot flow.
 *
 * - chat - A function that handles a chatbot conversation.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatInputSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })),
  message: z.string(),
  role: z.string().optional().describe("The user's role (e.g., 'admin' or 'employee')"),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chat(input: ChatInput): Promise<ChatOutput> {
  // Validate input to prevent null messages
  if (!input.message || input.message.trim() === '') {
    return { message: "I'm here to help! Please ask me a question about SyncroSpace." };
  }
  
  return chatFlow(input);
}

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async ({history, message, role}) => {
    // Map the incoming history to the format expected by the model
    const modelHistory = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
    }));

    const {output} = await ai.generate({
        system: `You are a helpful and friendly AI assistant for a company called SyncroSpace.
      Your goal is to answer user questions about the product and encourage them to sign up.
      The user you are talking to has the role: ${role || 'user'}. Tailor your answers accordingly.

      Here is some information about SyncroSpace:
      - Product: A virtual collaboration platform for remote teams.
      - Key Features: Customizable virtual spaces, proximity-based video/audio chat, integrated Kanban boards, team calendars with Google Calendar sync, secure channels for external partners (SyncroSpace Connect), AI-powered meeting summaries, and an AI assistant for suggestions.
      - Mission: To make remote work as collaborative and human as a physical office.
      - Pricing: There is a Free tier for small teams, a Pro plan for $15/user/month, and a custom Enterprise plan.
      
      Keep your answers concise and helpful. Always be positive and encouraging.`,
        history: modelHistory,
        prompt: message,
    });
    return {message: output!};
  }
);
