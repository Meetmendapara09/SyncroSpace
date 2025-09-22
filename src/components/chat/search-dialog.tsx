'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Message {
  id: string;
  uid: string;
  name: string;
  avatar?: string;
  message: string;
  type: 'text' | 'reaction' | 'image' | 'file' | 'audio';
  timestamp: any;
}

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onMessageSelect: (messageId: string) => void;
}

export function SearchDialog({ isOpen, onClose, messages, onMessageSelect }: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  // Filter messages that contain the search query
  const filteredMessages = searchQuery.trim() 
    ? messages.filter(msg => 
        // Only search text messages
        msg.type === 'text' && 
        msg.message.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Format message timestamp
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString([], { 
      month: 'short',
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Handle navigation through search results
  const navigateToNext = () => {
    if (filteredMessages.length > 0) {
      const nextIndex = (activeResultIndex + 1) % filteredMessages.length;
      setActiveResultIndex(nextIndex);
      onMessageSelect(filteredMessages[nextIndex].id);
    }
  };

  const navigateToPrevious = () => {
    if (filteredMessages.length > 0) {
      const prevIndex = activeResultIndex > 0 
        ? activeResultIndex - 1 
        : filteredMessages.length - 1;
      setActiveResultIndex(prevIndex);
      onMessageSelect(filteredMessages[prevIndex].id);
    }
  };

  // Highlight matching text in message
  const highlightMatches = (text: string) => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) 
            ? <span key={i} className="bg-yellow-200 text-black px-0.5 rounded">
                {part}
              </span>
            : part
        )}
      </>
    );
  };

  // Click handler for message result
  const handleMessageClick = (messageId: string, index: number) => {
    setActiveResultIndex(index);
    onMessageSelect(messageId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Search Messages</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search in conversation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                autoFocus
              />
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={navigateToPrevious}
              disabled={filteredMessages.length === 0}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={navigateToNext}
              disabled={filteredMessages.length === 0}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
          
          {searchQuery.trim() && (
            <div className="text-sm text-muted-foreground">
              {filteredMessages.length === 0 
                ? 'No results found' 
                : `${filteredMessages.length} result${filteredMessages.length !== 1 ? 's' : ''} found`
              }
            </div>
          )}
          
          {filteredMessages.length > 0 && (
            <ScrollArea className="h-80">
              <div className="space-y-2 pr-3">
                {filteredMessages.map((msg, index) => (
                  <div 
                    key={msg.id}
                    onClick={() => handleMessageClick(msg.id, index)}
                    className={`p-3 rounded-lg cursor-pointer hover:bg-accent/50 ${
                      index === activeResultIndex ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={msg.avatar} />
                        <AvatarFallback className="text-xs">
                          {msg.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-baseline mb-1">
                          <p className="font-medium text-xs">{msg.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                        <p className="text-sm line-clamp-2">
                          {highlightMatches(msg.message)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}