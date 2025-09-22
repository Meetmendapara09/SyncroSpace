
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wand2, Sparkles } from 'lucide-react';
import { generateAvatar } from '@/ai/flows/generate-avatar';
import { uploadFile } from '@/lib/firebase-upload';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { withAIErrorHandling, createAIFallback } from '@/lib/ai-error-handler';

export function GenerateAvatarDialog({ onAvatarGenerated }: { onAvatarGenerated: (dataUri: string) => void }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Define a set of fallback avatars to use when AI generation is unavailable
  const fallbackAvatars = [
    "/fallback-avatars/avatar1.png",
    "/fallback-avatars/avatar2.png", 
    "/fallback-avatars/avatar3.png",
    "/fallback-avatars/avatar4.png",
    "/fallback-avatars/avatar5.png"
  ];

  // Get a fallback avatar based on the prompt to have some deterministic behavior
  const getFallbackAvatar = (prompt: string) => {
    // Simple hash function to convert prompt to a number
    const hash = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // Use the hash to select a fallback avatar
    const index = hash % fallbackAvatars.length;
    return fallbackAvatars[index];
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setGeneratedAvatar(null);
    
    try {
      // Create fallback response with placeholder avatar
      const fallbackAvatar = getFallbackAvatar(prompt);
      const fallbackResult = createAIFallback({
        avatarDataUri: fallbackAvatar
      });
      
      const result = await withAIErrorHandling(
        async () => generateAvatar({ prompt }),
        {
          operation: 'Avatar generation',
          timeoutMs: 20000, // Image generation can take longer
          maxRetries: 1,
          fallbackFn: fallbackResult,
          silent: true // We'll handle the toast ourselves for more customization
        }
      );
      
      setGeneratedAvatar(result.avatarDataUri);
      
      // If using a fallback avatar, notify the user
      if (fallbackAvatars.includes(result.avatarDataUri)) {
        toast({
          title: 'Using Preset Avatar',
          description: 'AI generation is currently unavailable. Using a preset avatar instead.',
          variant: 'default'
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Avatar Generation Failed',
        description: error.message || 'Please try again with a different prompt.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setGeneratedAvatar(null);
    try {
      const url = await uploadFile(file, 'avatars');
      setGeneratedAvatar(url);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Avatar Upload Failed',
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseAvatar = () => {
    if (generatedAvatar) {
      onAvatarGenerated(generatedAvatar);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Wand2 className="mr-2 h-4 w-4" />
          Generate Avatar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate AI Avatar</DialogTitle>
          <DialogDescription>
            Describe the avatar you want to create. Be creative!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <div className="flex gap-2">
                    <Input
                        id="prompt"
                        placeholder="e.g., a friendly robot, pixel art style"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isLoading}
                    />
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                    >
                      Upload Image
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    <Button onClick={handleGenerate} disabled={isLoading || !prompt}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {isLoading ? 'Generating...' : 'Generate'}
                    </Button>
                </div>
            </div>
            <div className="flex items-center justify-center aspect-square w-full rounded-lg border bg-muted">
                {isLoading && <Skeleton className="h-full w-full" />}
                {!isLoading && generatedAvatar && (
                    <Image src={generatedAvatar} alt="Generated avatar" width={400} height={400} className="rounded-lg object-cover" />
                )}
                 {!isLoading && !generatedAvatar && (
                    <div className="text-center text-muted-foreground p-4">
                        <Wand2 className="mx-auto h-12 w-12" />
                        <p className="mt-2">Your generated avatar will appear here.</p>
                    </div>
                )}
            </div>
        </div>
        <DialogFooter className="sm:justify-between gap-2">
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUseAvatar} disabled={!generatedAvatar || isLoading}>
                Use This Avatar
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
