'use client';

import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

// Define emoji categories
const emojiCategories = {
  recent: '🕒',
  smileys: '😀',
  people: '👋',
  animals: '🐶',
  food: '🍎',
  travel: '✈️',
  activities: '⚽',
  objects: '💡',
  symbols: '💯',
  flags: '🏳️'
};

// Common emoji sets by category
const emojis = {
  recent: [] as string[], // Will be populated from localStorage
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡'],
  people: ['👋', '🤚', '✋', '🖐️', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪', '🦾', '🧠', '👀', '👁️', '👄', '👶', '👧', '👦', '👩', '👨', '👱‍♀️', '👱', '👩‍🦰', '👨‍🦰'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟'],
  food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞'],
  travel: ['✈️', '🛫', '🛬', '🛩️', '💺', '🚁', '🚀', '🛸', '🚂', '🚆', '🚇', '🚌', '🚙', '🚗', '🚕', '🛺', '🚜', '🏎️', '🏍️', '🛵', '🚨', '🚔', '⛵', '🛶', '🚤', '🛥️', '⚓', '🚏', '🗿', '🏟️', '🏛️', '🕌', '⛪', '🏪', '🏭'],
  activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🎿', '🧩', '🎮', '🎲', '♟️', '🎭', '🎨'],
  objects: ['💌', '🕳️', '💣', '🛀', '🛌', '🔪', '🏺', '🗿', '🚬', '⚰️', '⚱️', '🏮', '🪔', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖', '🏷️', '💰', '💸', '💵', '💴', '💶', '💷'],
  symbols: ['💯', '✅', '❌', '❎', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔃', '🔄', '🔙', '🔚', '🔛', '🔜', '🔝', '🎵', '🎶', '〰️', '➿', '✔️', '➕', '➖', '➗', '❓', '❔', '❕', '❗', '‼️'],
  flags: ['🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇦🇫', '🇦🇽', '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇼', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪', '🇧🇿']
};

// Define component props
interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ onEmojiSelect, className }: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [filteredEmojis, setFilteredEmojis] = useState<string[]>([]);

  // Load recent emojis from localStorage on mount
  useEffect(() => {
    try {
      const storedRecent = localStorage.getItem('recentEmojis');
      if (storedRecent) {
        emojis.recent = JSON.parse(storedRecent).slice(0, 20);
      }
    } catch (error) {
      console.error('Error loading recent emojis:', error);
    }
  }, []);

  // Update filtered emojis when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEmojis([]);
      return;
    }

    // Search across all emoji categories
    const results: string[] = [];
    Object.values(emojis).forEach(categoryEmojis => {
      categoryEmojis.forEach(emoji => {
        if (emoji.includes(searchQuery.toLowerCase())) {
          results.push(emoji);
        }
      });
    });

    setFilteredEmojis(results.slice(0, 24));
  }, [searchQuery]);

  // Handle emoji selection
  const handleSelectEmoji = (emoji: string) => {
    onEmojiSelect(emoji);
    
    // Update recent emojis in localStorage
    try {
      let recent = [...emojis.recent];
      // Remove emoji if it already exists to avoid duplicates
      recent = recent.filter(e => e !== emoji);
      // Add emoji to the beginning
      recent.unshift(emoji);
      // Keep only the 20 most recent
      recent = recent.slice(0, 20);
      
      // Update state and localStorage
      emojis.recent = recent;
      localStorage.setItem('recentEmojis', JSON.stringify(recent));
    } catch (error) {
      console.error('Error saving recent emoji:', error);
    }
  };

  // Render emoji grid
  const renderEmojiGrid = (categoryEmojis: string[]) => {
    return (
      <div className="grid grid-cols-8 gap-1 p-2">
        {categoryEmojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded cursor-pointer transition-colors"
            onClick={() => handleSelectEmoji(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={cn("w-64 bg-background rounded-md border shadow-md", className)}>
      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emojis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Show search results if searching */}
      {searchQuery && (
        <div className="max-h-[240px] overflow-y-auto">
          {filteredEmojis.length > 0 ? (
            <div className="p-2">
              <p className="text-xs text-muted-foreground mb-2">Search Results</p>
              {renderEmojiGrid(filteredEmojis)}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No emojis found for "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {/* Emoji categories */}
      {!searchQuery && (
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="grid grid-cols-5 h-9 bg-muted/50 p-1">
            {Object.entries(emojiCategories).slice(0, 5).map(([category, emoji]) => (
              <TabsTrigger
                key={category}
                value={category}
                className="data-[state=active]:bg-background px-2 text-base"
              >
                {emoji}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsList className="grid grid-cols-5 h-9 bg-muted/50 p-1 border-t border-muted">
            {Object.entries(emojiCategories).slice(5).map(([category, emoji]) => (
              <TabsTrigger
                key={category}
                value={category}
                className="data-[state=active]:bg-background px-2 text-base"
              >
                {emoji}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Emoji category content */}
          {Object.keys(emojiCategories).map((category) => (
            <TabsContent
              key={category}
              value={category}
              className="max-h-[240px] overflow-y-auto mt-0 border-t"
            >
              {renderEmojiGrid(emojis[category as keyof typeof emojis])}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}