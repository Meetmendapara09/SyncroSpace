
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-channel.ts';
import '@/ai/flows/generate-avatar.ts';
import '@/ai/flows/summarize-meeting.ts';
import '@/ai/flows/chatbot.ts';
import '@/ai/flows/contact.ts';

import { generateAvatar } from '@/ai/flows/generate-avatar.ts';

async function testGenerateAvatar() {
    console.log('Testing generateAvatar flow...');
    try {
        const result = await generateAvatar({ prompt: 'a cute, smiling, cartoon robot' });
        console.log('Avatar generated successfully:');
        // Log only the beginning of the data URI to avoid flooding the console
        console.log(result.avatarDataUri.substring(0, 100) + '...');
    } catch (error) {
        console.error('Error testing generateAvatar flow:', error);
    }
}

// You can uncomment this line to run the test when the dev server starts.
// testGenerateAvatar();
