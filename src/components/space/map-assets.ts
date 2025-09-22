/**
 * Map asset handling utility for the virtual space
 * This utility helps with loading and fallback mechanisms for map assets
 */

import { toast } from '@/hooks/use-toast';

// Define available tilesets based on the files in the public directory
export const TILESET_IMAGES = [
  { name: 'grass', path: '/grass.png', fallback: '/floor.png' },
  { name: 'floor', path: '/floor.png', fallback: null },
  { name: 'sofa', path: '/sofa.png', fallback: '/singlesofa.png' },
  { name: 'sofa1', path: '/sofa1.png', fallback: '/sofa.png' },
  { name: 'singlesofa', path: '/singlesofa.png', fallback: '/sofa.png' },
  { name: 'mac', path: '/mac.png', fallback: '/computer.png' },
  { name: 'computer', path: '/computer.png', fallback: '/mac.png' },
  { name: 'table', path: '/table.png', fallback: null },
  { name: 'book', path: '/book.png', fallback: '/book1.png' },
  { name: 'book1', path: '/book1.png', fallback: '/book.png' },
  { name: 'book2', path: '/book2.png', fallback: '/book.png' },
  { name: 'bottle', path: '/bottle.png', fallback: '/bottle1.png' },
  { name: 'bottle1', path: '/bottle1.png', fallback: '/bottle.png' },
  { name: 'cup', path: '/cup.png', fallback: '/glass.png' },
  { name: 'glass', path: '/glass.png', fallback: '/cup.png' },
  { name: 'tea', path: '/tea.png', fallback: '/cup.png' },
  { name: 'wall', path: '/wall.png', fallback: null },
  { name: 'office chair', path: '/office%20chair.png', fallback: '/garden%20chair.png' },
  { name: 'garden chair', path: '/garden%20chair.png', fallback: '/office%20chair.png' },
  { name: 'garden table', path: '/garden%20table.png', fallback: '/table.png' },
  { name: 'paper', path: '/paper.png', fallback: '/book.png' },
  { name: 'tyer', path: '/tyer.png', fallback: null },
];

/**
 * Preloads all map assets with fallback mechanism
 * @param scene Phaser Scene to load assets into
 */
export function preloadMapAssets(scene: Phaser.Scene): void {
  // Set up tracking for assets that failed to load
  const failedAssets = new Set<string>();
  
  // Track if we've shown any error messages
  let errorShown = false;
  
  // Add error handler for loading errors
  scene.load.on('loaderror', (fileObj: any) => {
    console.warn(`Failed to load asset: ${fileObj.key}`, fileObj);
    failedAssets.add(fileObj.key);
  });
  
  // Load all tileset images
  TILESET_IMAGES.forEach(img => {
    scene.load.image(img.name, img.path);
  });
  
  // Add complete handler to process fallbacks
  scene.load.on('complete', () => {
    // Check for failed assets and try fallbacks
    if (failedAssets.size > 0) {
      console.warn(`${failedAssets.size} assets failed to load, trying fallbacks...`);
      
      let fallbackCount = 0;
      
      // For each failed asset, try to load its fallback
      TILESET_IMAGES.forEach(img => {
        if (failedAssets.has(img.name) && img.fallback) {
          // Find the fallback image data
          const fallbackImg = TILESET_IMAGES.find(fbImg => fbImg.path === img.fallback);
          
          if (fallbackImg && !failedAssets.has(fallbackImg.name)) {
            // If the fallback loaded successfully, duplicate it as the failed asset
            const sourceImage = scene.textures.get(fallbackImg.name).getSourceImage() as HTMLImageElement;
            if (sourceImage) {
              scene.textures.addImage(img.name, sourceImage);
              fallbackCount++;
              console.log(`Using fallback for ${img.name}: ${fallbackImg.name}`);
            }
          }
        }
      });
      
      // Show warning message about missing assets
      if (fallbackCount < failedAssets.size && !errorShown) {
        errorShown = true;
        toast({
          title: "Map Warning",
          description: `${failedAssets.size - fallbackCount} map assets could not be loaded. The map might not display correctly.`,
          variant: "default",
        });
      }
    }
  });
}