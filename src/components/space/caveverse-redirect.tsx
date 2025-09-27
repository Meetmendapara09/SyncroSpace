'use client';

import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface CaveVerseRedirectProps {
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children?: React.ReactNode;
}

export function CaveVerseRedirect({ 
  className, 
  variant = 'default', 
  size = 'default',
  children = 'Enter CaveVerse'
}: CaveVerseRedirectProps) {
  const redirectToCaveVerse = () => {
    // Check if we're in development or production
    const caveVerseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3001' 
      : 'https://your-caveverse-domain.com'; // Update this for production
      
    window.open(caveVerseUrl, '_blank');
  };

  return (
    <Button 
      onClick={redirectToCaveVerse}
      variant={variant}
      size={size}
      className={className}
    >
      <ExternalLink className="mr-2 h-4 w-4" />
      {children}
    </Button>
  );
}