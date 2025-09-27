'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Phaser from 'phaser';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import mapData from '@/../map.json';
import { TILESET_IMAGES, preloadMapAssets } from './map-assets';

// Use default avatar
const AVATAR_IMG = '/mac.png';
const GRID_SIZE = 32;
const AVATAR_COLORS = [
  0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 
  0xff00ff, 0x00ffff, 0xff8800, 0x8800ff
];

// Define types for our scene properties and methods
interface MapSceneConfig {
  onPositionChange?: (x: number, y: number) => void;
  onError?: (message: string) => void;
}

class MapScene extends Phaser.Scene {
  avatar!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  otherPlayers: Map<string, { 
    sprite: Phaser.GameObjects.Sprite; 
    label: Phaser.GameObjects.Text; 
    target: { x: number; y: number } 
  }> = new Map();
  collisionLayer?: Phaser.Tilemaps.TilemapLayer;
  onPositionChange?: (x: number, y: number) => void;
  onError?: (message: string) => void;
  _lastPositionUpdate: number = 0;
  
  constructor(config: MapSceneConfig) {
    super({ key: 'MapScene' });
    this.onPositionChange = config.onPositionChange;
    this.onError = config.onError;
  }

  preload(): void {
    try {
      // Ensure mapData is valid before proceeding
      if (!mapData || !mapData.layers || !Array.isArray(mapData.layers)) {
        console.error('Map data is invalid or missing', mapData);
        this.onError?.('Invalid map data format');
        return;
      }
      
      // Load the map JSON directly from the imported data
      try {
        this.cache.json.add('map', mapData);
      } catch (jsonError) {
        console.error('Failed to add map JSON to cache:', jsonError);
        this.onError?.('Failed to initialize map data');
        return;
      }
      
      // Set up error handler for critical errors
      this.load.on('loaderror', (fileObj: any) => {
        console.error(`Failed to load asset: ${fileObj.key}`, fileObj);
        
        // Only report critical errors (not tileset images which have fallbacks)
        if (fileObj.key === 'avatar') {
          this.onError?.(`Failed to load avatar image`);
        }
      });
      
      // Use our enhanced asset preloader with fallback support
      try {
        preloadMapAssets(this);
      } catch (assetError) {
        console.error('Error in asset preloader:', assetError);
        // Continue even if some assets fail to load
      }
      
      // Load avatar image with fallback
      try {
        this.load.image('avatar', AVATAR_IMG);
      } catch (avatarError) {
        console.error('Failed to load avatar image:', avatarError);
        // Try loading a fallback avatar
        this.load.image('avatar', '/fallback-avatars/default.png');
      }
      
      console.log('Started loading all assets');
    } catch (error) {
      console.error('Error in preload:', error);
      this.onError?.('Failed to load map resources');
    }
  }

  create(): void {
    try {
      // Create the tilemap from JSON
      const map = this.make.tilemap({ key: 'map' });
      
      // Find all unique tilesets used in the map
      const tilesets: Phaser.Tilemaps.Tileset[] = [];
      const failedTilesets: string[] = [];
      
      // Create tilesets for all available images
      TILESET_IMAGES.forEach(img => {
        try {
          // Check if the texture exists before adding it as a tileset
          if (this.textures.exists(img.name)) {
            const tileset = map.addTilesetImage(img.name, img.name);
            if (tileset) tilesets.push(tileset);
          } else {
            failedTilesets.push(img.name);
            console.warn(`Texture for tileset ${img.name} not found`);
          }
        } catch (err) {
          failedTilesets.push(img.name);
          console.warn(`Failed to add tileset ${img.name}:`, err);
        }
      });
      
      // Log summary of missing tilesets
      if (failedTilesets.length > 0) {
        console.warn(`Failed to add ${failedTilesets.length} tilesets:`, failedTilesets);
      }
      
      // Create all layers from the map
      for (let i = 0; i < map.layers.length; i++) {
        const layerData = map.layers[i];
        
        // Check if this is a tile layer (with a type check for TypeScript)
        const layer = map.createLayer(i, tilesets, 0, 0);
        
        // Use the 8th tile layer as collision layer by default
        // This would need to be adjusted based on the actual map structure
        if (layer && i === 7) {
          layer.setCollisionByProperty({ collides: true });
          this.collisionLayer = layer;
        }
      }
      
      // Create player avatar
      this.avatar = this.physics.add.sprite(GRID_SIZE * 10, GRID_SIZE * 10, 'avatar');
      this.avatar.setDisplaySize(GRID_SIZE, GRID_SIZE);
      this.avatar.setCollideWorldBounds(true);
      
      // Add collision with the collision layer if it exists
      if (this.collisionLayer) {
        this.physics.add.collider(this.avatar, this.collisionLayer);
      }
      
      // Set up camera to follow the player
      this.cameras.main.startFollow(this.avatar, true);
      this.cameras.main.setZoom(1.5);
      
      // Set up keyboard controls
      this.cursors = this.input.keyboard!.createCursorKeys();
    } catch (error) {
      console.error('Error in create:', error);
      this.onError?.('Failed to create map scene');
    }
  }

  update(): void {
    if (!this.avatar || !this.cursors) return;
    
    // Movement speed
    const speed = 150;
    this.avatar.setVelocity(0);
    
    // Track position before movement
    const prevX = this.avatar.x;
    const prevY = this.avatar.y;
    
    // Handle movement with diagonal movement normalization
    let velocityX = 0;
    let velocityY = 0;
    
    if (this.cursors.left.isDown) {
      velocityX = -speed;
    } else if (this.cursors.right.isDown) {
      velocityX = speed;
    }
    
    if (this.cursors.up.isDown) {
      velocityY = -speed;
    } else if (this.cursors.down.isDown) {
      velocityY = speed;
    }
    
    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707; // Math.sqrt(2) / 2
      velocityY *= 0.707;
    }
    
    this.avatar.setVelocity(velocityX, velocityY);
    
    // Only check position changes if there was movement input
    if (velocityX !== 0 || velocityY !== 0) {
      // Throttle position updates to reduce Firestore writes - increased throttle time
      const now = Date.now();
      if (!this._lastPositionUpdate || now - this._lastPositionUpdate > 500) { // Increased from 200ms to 500ms
        this._lastPositionUpdate = now;
        
        // Only send update if position actually changed significantly
        const deltaX = Math.abs(this.avatar.x - prevX);
        const deltaY = Math.abs(this.avatar.y - prevY);
        
        if (deltaX > 2 || deltaY > 2) { // Only update if moved more than 2 pixels
          // Notify position change if callback is provided
          if (this.onPositionChange) {
            this.onPositionChange(Math.round(this.avatar.x), Math.round(this.avatar.y));
          }
        }
      }
    }
    
    // Update other players' positions with reduced frequency
    if (this.time.now % 3 === 0) { // Update every 3rd frame
      this.updateOtherPlayers();
    }
  }
  
  // Add a new player to the map
  addOtherPlayer(id: string, x: number, y: number, photoURL?: string): void {
    try {
      // Create avatar sprite for the other player
      const sprite = this.add.sprite(x, y, 'avatar');
      sprite.setDisplaySize(GRID_SIZE, GRID_SIZE);
      
      // Generate a consistent color for this player based on their ID
      const colorIndex = Math.abs(id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % AVATAR_COLORS.length;
      sprite.setTint(AVATAR_COLORS[colorIndex]);
      
      // Add name label above avatar
      const displayName = id.substring(0, 6) + (id.length > 6 ? '...' : '');
      const label = this.add.text(x, y - GRID_SIZE / 1.5, displayName, {
        fontSize: '12px',
        color: '#FFFFFF',
        backgroundColor: '#00000080',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5);
      
      // Add to our tracking map
      this.otherPlayers.set(id, {
        sprite,
        label,
        target: { x, y },
      });
      
      console.log(`Added player ${id} at (${x}, ${y})`);
    } catch (error) {
      console.error('Error adding other player:', error);
    }
  }
  
  // Update other player position
  updateOtherPlayer(id: string, x: number, y: number): void {
    const entry = this.otherPlayers.get(id);
    if (entry) {
      // Set target position for interpolation
      entry.target.x = x;
      entry.target.y = y;
    }
  }
  
  // Remove other player
  removeOtherPlayer(id: string): void {
    const entry = this.otherPlayers.get(id);
    if (entry) {
      entry.sprite.destroy();
      entry.label.destroy();
      this.otherPlayers.delete(id);
      console.log(`Removed player ${id}`);
    }
  }

  // Interpolate other players' positions and update labels
  updateOtherPlayers(): void {
    this.otherPlayers.forEach(({ sprite, label, target }) => {
      // Only update if there's a significant difference
      const deltaX = Math.abs(sprite.x - target.x);
      const deltaY = Math.abs(sprite.y - target.y);
      
      if (deltaX > 1 || deltaY > 1) {
        // Interpolate position for smooth movement with faster lerp for responsiveness
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        
        // Apply interpolation with a smooth factor
        sprite.x = lerp(sprite.x, target.x, 0.15); // Increased from 0.1 for more responsive movement
        sprite.y = lerp(sprite.y, target.y, 0.15);
        
        // Update label position to follow the sprite
        label.x = sprite.x;
        label.y = sprite.y - GRID_SIZE / 1.5;
      }
    });
  }
}

interface MapViewProps {
  onPositionChange?: (x: number, y: number) => void;
  participants?: Array<{
    uid: string;
    x?: number;
    y?: number;
    photoURL?: string;
  }>;
  userId?: string;
  width?: string | number;
  height?: string | number;
}

const MapView: React.FC<MapViewProps> = ({ 
  onPositionChange, 
  participants = [], 
  userId = '',
  width = '100%',
  height = '100%'
}) => {
  // References
  const phaserRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<MapScene | null>(null);
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingAssets, setMissingAssets] = useState<string[]>([]);
  
  // Hooks
  const { toast } = useToast();
  
  // Handle errors from the scene
  const handleSceneError = useCallback((message: string) => {
    setError(message);
    
    // Check if error is about missing assets
    if (message.includes('Failed to load asset:')) {
      const assetName = message.replace('Failed to load asset:', '').trim();
      setMissingAssets(prev => [...prev, assetName]);
      
      // Only show toast for the first few missing assets to avoid spamming
      if (missingAssets.length < 3) {
        toast({
          title: "Asset Loading Error",
          description: `Could not load map asset: ${assetName}. The map may not display correctly.`,
          variant: "destructive",
        });
      } else if (missingAssets.length === 3) {
        toast({
          title: "Multiple Assets Missing",
          description: "Several map assets could not be loaded. The map may not display correctly.",
          variant: "destructive"
        });
      }
    } else {
      // For other errors, show the toast
      toast({
        title: "Map Error",
        description: message,
        variant: "destructive"
      });
    }
  }, [toast, missingAssets]);

  // Initialize Phaser
  useEffect(() => {
    if (typeof window === 'undefined' || !phaserRef.current) return;
    
    let game: Phaser.Game | null = null;
    
    try {
      setIsLoading(true);
      
      // Check if Phaser is available
      if (typeof Phaser === 'undefined') {
        throw new Error('Phaser library not available');
      }
      
      // Create the scene with our config
      const mapScene = new MapScene({
        onPositionChange,
        onError: handleSceneError
      });
      
      // Store reference to access methods
      sceneRef.current = mapScene;
      
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: '100%',
        height: '100%',
        parent: phaserRef.current,
        backgroundColor: '#f0f0f0', // Light background as fallback
        physics: {
          default: 'arcade',
          arcade: { 
            gravity: { x: 0, y: 0 },
            debug: false 
          },
        },
        scene: mapScene,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        // Add error handling for WebGL context issues
        callbacks: {
          preBoot: () => {
            console.log('Phaser pre-boot');
          },
          postBoot: () => {
            setIsLoading(false);
          }
        },
        render: {
          pixelArt: true,
          antialias: false,
          powerPreference: 'high-performance', // Request high-performance GPU
          batchSize: 2000, // Increase batch size for better performance
          maxTextures: 16  // Optimize texture usage
        },
        fps: {
          target: 60,
          forceSetTimeOut: true // Use setTimeout instead of requestAnimationFrame for better performance
        },
        audio: {
          disableWebAudio: true // Disable audio for better performance
        }
      };
      
      try {
        // Create game instance with additional error handling
        game = new Phaser.Game(config);
        gameInstanceRef.current = game;
        
        // Monitor for WebGL errors
        if (game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
          const gl = game.renderer.gl;
          
          // Check for WebGL context loss
          phaserRef.current?.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.error('WebGL context lost');
            handleSceneError('WebGL context lost. Please refresh the page.');
          });
        }
      } catch (initError) {
        console.error('Error creating Phaser game:', initError);
        handleSceneError('Failed to initialize the map view. Please refresh the page.');
        setIsLoading(false);
        return () => {}; // No cleanup needed if initialization failed
      }
      
      // Set loading to false after a delay to ensure scene is loaded
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1000);
      
      return () => {
        clearTimeout(timer);
        try {
          if (game && game.isBooted) {
            // Check if game has a valid renderer before destroying
            if (game.renderer) {
              game.destroy(true);
              console.log('Phaser game destroyed successfully');
            } else {
              console.warn('Cannot destroy game: renderer not available');
            }
          }
        } catch (destroyError) {
          console.error('Error destroying Phaser game:', destroyError);
        }
        gameInstanceRef.current = null;
        sceneRef.current = null;
      };
    } catch (error) {
      console.error('Error initializing Phaser:', error);
      handleSceneError('Failed to initialize map view. Please check your browser compatibility.');
      setError('Failed to initialize map view');
      setIsLoading(false);
    }
  }, [onPositionChange, handleSceneError]);
  
  // Update other players whenever participants change
  useEffect(() => {
    if (!sceneRef.current) return;
    
    participants.forEach(participant => {
      // Skip the current user
      if (participant.uid !== userId) {
        if (typeof participant.x === 'number' && typeof participant.y === 'number') {
          // Check if player already exists
          const exists = sceneRef.current?.otherPlayers.has(participant.uid) ?? false;
          if (exists) {
            // Update position
            sceneRef.current?.updateOtherPlayer(participant.uid, participant.x, participant.y);
          } else {
            // Add new player
            sceneRef.current?.addOtherPlayer(participant.uid, participant.x, participant.y, participant.photoURL);
          }
        }
      }
    });
    
    // Clean up any players that left
    const participantIds = new Set(participants.map(p => p.uid));
    sceneRef.current.otherPlayers.forEach((_, id) => {
      if (!participantIds.has(id)) {
        sceneRef.current?.removeOtherPlayer(id);
      }
    });
  }, [participants, userId]);

  return (
    <div style={{ position: 'relative', width, height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-sm font-medium">Loading map...</span>
        </div>
      )}
      
      {error && !error.includes('Failed to load asset:') && (
        <Alert variant="destructive" className="absolute top-4 left-4 right-4 z-20">
          <AlertTitle>Map Error</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-2 text-xs opacity-80">
              Try refreshing the page. If the error persists, please contact support.
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {missingAssets.length > 0 && (
        <Alert className="absolute bottom-4 left-4 right-4 z-20 bg-amber-50 border-amber-300">
          <AlertTitle>Some map assets could not be loaded</AlertTitle>
          <AlertDescription>
            <div className="text-sm">The map may not display correctly due to missing assets.</div>
            {missingAssets.length <= 5 && (
              <ul className="mt-2 text-xs list-disc list-inside">
                {missingAssets.map((asset, i) => (
                  <li key={i}>{asset}</li>
                ))}
              </ul>
            )}
            {missingAssets.length > 5 && (
              <div className="mt-2 text-xs">
                {missingAssets.length} assets could not be loaded.
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      <div 
        ref={phaserRef} 
        className="w-full h-full"
        style={{ 
          visibility: isLoading ? 'hidden' : 'visible',
          backgroundColor: '#f0f0f0' 
        }} 
      />
    </div>
  );
};

export default MapView;