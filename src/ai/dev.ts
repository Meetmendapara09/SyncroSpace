
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-channel';
import '@/ai/flows/generate-avatar';
import '@/ai/flows/summarize-meeting';
import '@/ai/flows/chatbot';
import '@/ai/flows/contact';

import { generateAvatar } from '@/ai/flows/generate-avatar';
import { chat } from '@/ai/flows/chatbot';
import { suggestChannel } from '@/ai/flows/suggest-channel';
import { contact } from '@/ai/flows/contact';

/**
 * Test utility for AI flows
 */
async function testFlow(name: string, fn: () => Promise<any>) {
    console.log(`Testing ${name} flow...`);
    try {
        const result = await fn();
        console.log(`${name} executed successfully:`, result);
        return true;
    } catch (error) {
        console.error(`Error testing ${name} flow:`, error);
        // Log more detailed error information
        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack,
            });
        }
        return false;
    }
}

async function testGenerateAvatar() {
    const result = await testFlow('generateAvatar', async () => {
        const result = await generateAvatar({ prompt: 'a cute, smiling, cartoon robot' });
        // Log only the beginning of the data URI to avoid flooding the console
        return { avatarUrl: result.avatarDataUri.substring(0, 100) + '...' };
    });
    return result;
}

async function testChatbot() {
    const result = await testFlow('chatbot', async () => {
        const result = await chat({
            messages: [{
                role: 'user',
                content: 'What features does SyncroSpace offer?',
                timestamp: Date.now()
            }]
        });
        return result;
    });
    return result;
}

async function testSuggestChannel() {
    const result = await testFlow('suggestChannel', async () => {
        const result = await suggestChannel({
            userInterests: ['AI', 'machine learning', 'software development'],
            existingChannels: ['general', 'development']
        });
        return result;
    });
    return result;
}

async function testContactForm() {
    const result = await testFlow('contactForm', async () => {
        const result = await contact({
            name: 'Test User',
            email: 'test@example.com',
            message: 'Testing Contact Form - This is a test message from the AI flow test suite.'
        });
        return result;
    });
    return result;
}

async function runAllTests() {
    console.log('Running all AI flow tests...');
    const results = await Promise.all([
        testGenerateAvatar(),
        testChatbot(),
        testSuggestChannel(),
        testContactForm()
    ]);
    
    const passedCount = results.filter(Boolean).length;
    console.log(`\n==== AI Flow Test Results ====`);
    console.log(`Passed: ${passedCount}/${results.length}`);
    console.log(`Failed: ${results.length - passedCount}/${results.length}`);
    
    if (passedCount < results.length) {
        console.error('Some AI flow tests failed!');
    } else {
        console.log('All AI flow tests passed!');
    }
}

// You can uncomment this line to run all tests when the dev server starts.
// runAllTests();
