
'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, X, Bot, User } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useChatbotStore } from '@/store/chatbot-store';
import { AnimatePresence, motion } from 'framer-motion';
import { chat } from '@/ai/flows/chatbot';
import { Skeleton } from '../ui/skeleton';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { auth, db } from '@/lib/firebase';
import { doc } from 'firebase/firestore';
import { withAIErrorHandling, createAIFallback } from '@/lib/ai-error-handler';

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

const userTemplates = [
    "How do I create a new space?",
    "What are the pricing plans?",
    "How does proximity chat work?",
    "Can I invite people from outside my organization?",
]

const adminTemplates = [
    "How do I manage user roles?",
    "Where can I see workspace analytics?",
    "How do I send an announcement?",
    "How can I edit the company story page?",
]

/**
 * Creates a fallback response for the chatbot when AI is unavailable
 * Uses simple keyword matching to provide relevant responses
 */
function createChatbotFallback(message: string, role?: string): { message: string } {
    const lowerMessage = message.toLowerCase();
    
    // Common fallback responses based on keywords
    if (lowerMessage.includes('pricing') || lowerMessage.includes('cost') || lowerMessage.includes('subscription')) {
        return { 
            message: "SyncroSpace offers three pricing tiers: Free (basic features), Pro ($15/user/month with advanced collaboration), and Enterprise (custom pricing with full features). Please check our pricing page for more details." 
        };
    }
    
    if (lowerMessage.includes('create') && lowerMessage.includes('space')) {
        return { 
            message: "To create a new space: (1) Go to the Spaces tab (2) Click the '+ New Space' button (3) Enter space details (4) Customize your space layout (5) Invite team members. Note: Some features may be limited during this offline period."
        };
    }
    
    if (lowerMessage.includes('invite') || lowerMessage.includes('add user')) {
        return { 
            message: "To invite users: Go to any space, click the 'Invite' button, enter email addresses or share the generated invite link. Users will receive instructions to join."
        };
    }
    
    if (lowerMessage.includes('analytics') && role === 'admin') {
        return { 
            message: "As an admin, you can access analytics in the Admin dashboard. Go to Dashboard > Analytics to view metrics on user engagement, space usage, and meeting activities."
        };
    }
    
    // Default fallback response
    return {
        message: "I apologize, but I'm currently in offline mode due to a service interruption. The SyncroSpace team has been notified. Basic information: SyncroSpace is a virtual collaboration platform with customizable spaces, proximity chat, kanban boards, and meeting tools. For urgent assistance, please contact support@syncro.space."
    };
}

export function Chatbot() {
    const { isOpen, toggleChatbot } = useChatbotStore();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    
    const [user] = useAuthState(auth);
    const userDocRef = user ? doc(db, 'users', user.uid) : null;
    const [userData] = useDocumentData(userDocRef);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollAreaRef.current) {
                const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
                if (viewport) {
                    viewport.scrollTop = viewport.scrollHeight;
                }
            }
        }, 100);
    };

    const handleSend = async (message?: string) => {
        const messageToSend = message || input;
        if (!messageToSend.trim()) return;

        const userMessage: ChatMessage = { role: 'user', content: messageToSend };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);
        scrollToBottom();

        try {
            // Create fallback content based on the message
            const fallbackResponse = createChatbotFallback(messageToSend, userData?.role);
            
            const response = await withAIErrorHandling(
                async () => chat({
                    messages: newMessages.slice(0, -1).map(msg => ({
                        role: msg.role === 'model' ? 'assistant' : 'user',
                        content: msg.content,
                        timestamp: Date.now()
                    }))
                }),
                { 
                    operation: 'Chatbot response',
                    timeoutMs: 15000,
                    maxRetries: 1,
                    fallbackFn: () => fallbackResponse
                }
            );
            setMessages([...newMessages, { role: 'model', content: response.message.content }]);
        } catch (error: any) {
            setMessages([...newMessages, { role: 'model', content: `Sorry, I encountered an error: ${error.message || 'Please try again.'}` }]);
        } finally {
            setIsLoading(false);
            scrollToBottom();
        }
    };
    
    useEffect(() => {
        scrollToBottom();
    }, [messages]);


    return (
        <>
            <button
                className="fixed bottom-4 right-4 z-50 h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center"
                onClick={toggleChatbot}
            >
                {isOpen ? <X className="h-8 w-8" /> : <MessageCircle className="h-8 w-8" />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className="fixed bottom-24 right-4 z-50"
                    >
                        <Card className="w-[380px] h-[600px] flex flex-col shadow-2xl">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary rounded-full text-primary-foreground">
                                        <Bot className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle>AI Assistant</CardTitle>
                                        <CardDescription>How can I help you today?</CardDescription>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={toggleChatbot}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden p-0">
                                <ScrollArea className="h-full" ref={scrollAreaRef}>
                                    <div className="p-6 space-y-4">
                                        {messages.length === 0 && !isLoading && (
                                            <div className="space-y-4">
                                                <p className="text-sm text-muted-foreground">Or try one of these prompts:</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(userData?.role === 'admin' ? adminTemplates : userTemplates).map(template => (
                                                        <Button key={template} variant="outline" size="sm" className="h-auto py-2 text-wrap" onClick={() => handleSend(template)}>
                                                            {template}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {messages.map((msg, index) => (
                                            <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                {msg.role === 'model' && <Bot className="h-6 w-6 text-primary flex-shrink-0" />}
                                                <div className={`rounded-lg px-4 py-2 max-w-[80%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                                    {msg.content}
                                                </div>
                                                {msg.role === 'user' && <User className="h-6 w-6 text-muted-foreground flex-shrink-0" />}
                                            </div>
                                        ))}
                                        {isLoading && (
                                            <div className="flex gap-3 justify-start">
                                                <Bot className="h-6 w-6 text-primary flex-shrink-0" />
                                                <Skeleton className="h-10 w-2/3" />
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                            <CardFooter>
                                <div className="relative w-full">
                                    <Input
                                        placeholder="Ask me anything..."
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleSend()}
                                        className="pr-12"
                                    />
                                    <Button size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => handleSend()} disabled={isLoading}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
