'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Character {
  id: string;
  name: string;
  preview: string;
  description: string;
  gender: 'male' | 'female';
}

const AVAILABLE_CHARACTERS: Character[] = [
  {
    id: 'adam',
    name: 'Adam',
    preview: '/assets/characters/single/Adam_idle_anim_1.png',
    description: 'Professional business executive',
    gender: 'male'
  },
  {
    id: 'ash',
    name: 'Ash',
    preview: '/assets/characters/single/Ash_idle_anim_1.png',
    description: 'Creative developer',
    gender: 'male'
  },
  {
    id: 'lucy',
    name: 'Lucy',
    preview: '/assets/characters/single/Lucy_idle_anim_1.png',
    description: 'Senior project manager',
    gender: 'female'
  },
  {
    id: 'nancy',
    name: 'Nancy',
    preview: '/assets/characters/single/Nancy_idle_anim_1.png',
    description: 'UX designer',
    gender: 'female'
  }
];

interface CharacterSelectionProps {
  selectedCharacter?: string;
  onCharacterSelect: (characterId: string) => void;
  onConfirm: () => void;
}

export function CharacterSelection({
  selectedCharacter,
  onCharacterSelect,
  onConfirm
}: CharacterSelectionProps) {
  const [hoveredCharacter, setHoveredCharacter] = useState<string | null>(null);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <span>👤</span>
          Choose Your Avatar
        </CardTitle>
        <p className="text-muted-foreground">
          Select a professional avatar for your virtual office experience
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {AVAILABLE_CHARACTERS.map((character) => (
            <motion.div
              key={character.id}
              className={`relative cursor-pointer rounded-lg border-2 transition-all duration-200 ${
                selectedCharacter === character.id
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCharacterSelect(character.id)}
              onHoverStart={() => setHoveredCharacter(character.id)}
              onHoverEnd={() => setHoveredCharacter(null)}
            >
              <div className="p-4 text-center">
                <div className="relative mx-auto w-16 h-20 mb-3 bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg flex items-center justify-center overflow-hidden">
                  <img
                    src={character.preview}
                    alt={character.name}
                    className="w-12 h-16 object-contain pixelated"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  {selectedCharacter === character.id && (
                    <motion.div
                      className="absolute inset-0 border-2 border-primary rounded-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    />
                  )}
                </div>
                
                <h3 className="font-semibold text-sm mb-1">{character.name}</h3>
                <Badge 
                  variant="secondary" 
                  className="mb-2 text-xs"
                >
                  {character.gender === 'male' ? '👨‍💼' : '👩‍💼'} {character.description}
                </Badge>
                
                {hoveredCharacter === character.id && (
                  <motion.p
                    className="text-xs text-muted-foreground"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    Includes idle & walking animations
                  </motion.p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={onConfirm}
            disabled={!selectedCharacter}
            size="lg"
            className="px-8 py-2"
          >
            {selectedCharacter ? `Enter Office as ${AVAILABLE_CHARACTERS.find(c => c.id === selectedCharacter)?.name}` : 'Select an Avatar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { AVAILABLE_CHARACTERS };
export type { Character };