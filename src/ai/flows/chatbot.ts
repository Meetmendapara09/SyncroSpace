// Static dummy implementation of chatbot
import { z } from 'zod';

// Define types to match original API
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.number().optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatCompletionInputSchema = z.object({
  messages: z.array(ChatMessageSchema),
});
export type ChatCompletionInput = z.infer<typeof ChatCompletionInputSchema>;

export const ChatCompletionOutputSchema = z.object({
  message: ChatMessageSchema,
});
export type ChatCompletionOutput = z.infer<typeof ChatCompletionOutputSchema>;

// Export chat function to match original API
export const chat = chatCompletion;

// Static implementation
export async function chatCompletion(
  input: ChatCompletionInput
): Promise<ChatCompletionOutput> {
  console.log('Using static dummy implementation of chatCompletion');
  
  // Return a dummy response
  return {
    message: {
      role: 'assistant',
      content: 'This is a static response. AI features are not available in static export mode.',
      timestamp: Date.now(),
    },
  };
}
