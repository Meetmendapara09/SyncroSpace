import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type OptimizedImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  onLoad?: () => void;
};

/**
 * OptimizedImage - A performance-optimized image component
 * 
 * Features:
 * - Lazy loading by default
 * - Blur-up placeholder while loading
 * - WebP/AVIF format when supported
 * - Proper sizing and responsive behavior
 * - Loading state management
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 75,
  fill = false,
  objectFit = 'cover',
  onLoad,
  ...props
}: OptimizedImageProps & Omit<React.ComponentProps<typeof Image>, 'src' | 'alt' | 'width' | 'height'>) {
  const [isLoading, setIsLoading] = useState(true);
  
  // Generate a placeholder color based on the src string
  // This creates a consistent placeholder color for the same image
  const placeholderColor = `#${src
    .split('')
    .reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffff;
    }, 0)
    .toString(16)
    .padStart(6, '0')}`;
  
  return (
    <div 
      className={cn(
        'relative overflow-hidden',
        isLoading && 'animate-pulse',
        className
      )}
      style={isLoading ? { backgroundColor: placeholderColor } : undefined}
    >
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        quality={quality}
        sizes={sizes}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => {
          setIsLoading(false);
          if (onLoad) onLoad();
        }}
        style={{
          objectFit,
          opacity: isLoading ? 0.5 : 1,
          transition: 'opacity 0.2s ease-in-out',
        }}
        {...props}
      />
    </div>
  );
}