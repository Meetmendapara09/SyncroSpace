'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import mapData from '@/../map.json';

// Define available tilesets based on the files in the public directory
const TILESET_IMAGES = [
  { name: 'grass', path: '/grass.png' },
  { name: 'floor', path: '/floor.png' },
  { name: 'sofa', path: '/sofa.png' },
  { name: 'sofa1', path: '/sofa1.png' },
  { name: 'singlesofa', path: '/singlesofa.png' },
  { name: 'mac', path: '/mac.png' },
  { name: 'computer', path: '/computer.png' },
  { name: 'table', path: '/table.png' },
  { name: 'book', path: '/book.png' },
  { name: 'book1', path: '/book1.png' },
  { name: 'book2', path: '/book2.png' },
  { name: 'bottle', path: '/bottle.png' },
  { name: 'bottle1', path: '/bottle1.png' },
  { name: 'cup', path: '/cup.png' },
  { name: 'glass', path: '/glass.png' },
  { name: 'tea', path: '/tea.png' },
  { name: 'wall', path: '/wall.png' },
  { name: 'office chair', path: '/office chair.png' },
  { name: 'garden chair', path: '/garden chair.png' },
  { name: 'garden table', path: '/garden table.png' },
  { name: 'paper', path: '/paper.png' },
  { name: 'tyer', path: '/tyer.png' },
];

// Use default avatar
const AVATAR_IMG = '/mac.png';
const GRID_SIZE = 32;

// Define types for our scene properties and methods
interface MapSceneConfig {
  onPositionChange?: (x: number, y: number) => void;
  onError?: (message: string) => void;
}

class MapScene extends Phaser.Scene {
  avatar!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  otherPlayers: Map<string, Phaser.GameObjects.Sprite> = new Map();
  collisionLayer?: Phaser.Tilemaps.TilemapLayer;
  onPositionChange?: (x: number, y: number) => void;
  onError?: (message: string) => void;
  
  constructor(config: MapSceneConfig) {
    super({ key: 'MapScene' });
    this.onPositionChange = config.onPositionChange;
    this.onError = config.onError;
  }

  preload(): void {
    try {
      // Load the map JSON directly from the imported data
      this.cache.json.add('map', mapData);
      
      // Load all tileset images
      TILESET_IMAGES.forEach(img => {
        this.load.image(img.name, img.path);
      });
      
      // Load avatar image
      this.load.image('avatar', AVATAR_IMG);
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
      
      // Create tilesets for all available images
      TILESET_IMAGES.forEach(img => {
        try {
          const tileset = map.addTilesetImage(img.name, img.name);
          if (tileset) tilesets.push(tileset);
        } catch (err) {
          console.warn(`Failed to add tileset ${img.name}:`, err);
        }
      });
      
      // Create all layers from the map
      for (let i = 0; i < map.layers.length; i++) {
        const layerData = map.layers[i];
        if (layerData.type === 'tilelayer') {
          const layer = map.createLayer(i, tilesets, 0, 0);
          
          // Use the 8th tile layer as collision layer by default
          // This would need to be adjusted based on the actual map structure
          if (i === 7) {
            layer.setCollisionByProperty({ collides: true });
            this.collisionLayer = layer;
          }
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
    
    // Handle movement
    if (this.cursors.left.isDown) {
      this.avatar.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.avatar.setVelocityX(speed);
    }
    
    if (this.cursors.up.isDown) {
      this.avatar.setVelocityY(-speed);
    } else if (this.cursors.down.isDown) {
      this.avatar.setVelocityY(speed);
    }
    
    // Don't update position unless it actually changed
    if (prevX !== this.avatar.x || prevY !== this.avatar.y) {
      // Throttle position updates to reduce Firestore writes
      // Only send updates every few frames
      const now = Date.now();
      if (!this._lastPositionUpdate || now - this._lastPositionUpdate > 200) {
        this._lastPositionUpdate = now;
        
        // Notify position change if callback is provided
        if (this.onPositionChange) {
          this.onPositionChange(this.avatar.x, this.avatar.y);
        }
      }
    }
  }
  
  _lastPositionUpdate: number = 0;
  
  // Method to add other players to the map
  addOtherPlayer(id: string, x: number, y: number, photoURL?: string): void {
    try {
      // Remove existing player if present
      if (this.otherPlayers.has(id)) {
        this.otherPlayers.get(id)?.destroy();
      }
      
      // Create the other player sprite
      const otherPlayer = this.add.sprite(x, y, 'avatar');
      otherPlayer.setDisplaySize(GRID_SIZE, GRID_SIZE);
      
      // Store in our map of players
      this.otherPlayers.set(id, otherPlayer);
    } catch (error) {
      console.error('Error adding other player:', error);
    }
  }
  
  // Update other player position
  updateOtherPlayer(id: string, x: number, y: number): void {
    const player = this.otherPlayers.get(id);
    if (player) {
      player.setPosition(x, y);
    }
  }
  
  // Remove other player
  removeOtherPlayer(id: string): void {
    const player = this.otherPlayers.get(id);
    if (player) {
      player.destroy();
      this.otherPlayers.delete(id);
    }
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
  userId,
  width = '100%',
  height = '600px',
}) => {
  const phaserRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<MapScene | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // Handler for scene errors
  const handleSceneError = useCallback((message: string) => {
    setError(message);
    toast({
      title: "Map Error",
      description: message,
      variant: "destructive"
    });
  }, [toast]);

  // Initialize Phaser
  useEffect(() => {
    if (typeof window === 'undefined' || !phaserRef.current) return;
    
    try {
      setIsLoading(true);
      
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
        physics: {
          default: 'arcade',
          arcade: { 
            gravity: { y: 0 },
            debug: false 
          },
        },
        scene: mapScene,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        render: {
          pixelArt: true,
          antialias: false
        }
      };
      
      // Create game instance
      const game = new Phaser.Game(config);
      gameInstanceRef.current = game;
      
      // Set loading to false after a delay to ensure scene is loaded
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1000);
      
      return () => {
        clearTimeout(timer);
        game.destroy(true);
        gameInstanceRef.current = null;
        sceneRef.current = null;
      };
    } catch (error) {
      console.error('Error initializing Phaser:', error);
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
          const exists = sceneRef.current.otherPlayers.has(participant.uid);
          if (exists) {
            // Update position
            sceneRef.current.updateOtherPlayer(participant.uid, participant.x, participant.y);
          } else {
            // Add new player
            sceneRef.current.addOtherPlayer(participant.uid, participant.x, participant.y, participant.photoURL);
          }
        }
      }
    });
    
    // Clean up any players that left
    const participantIds = new Set(participants.map(p => p.uid));
    sceneRef.current.otherPlayers.forEach((_, id) => {
      if (!participantIds.has(id)) {
        sceneRef.current.removeOtherPlayer(id);
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
      
      {error && (
        <Alert variant="destructive" className="absolute top-4 left-4 right-4 z-20">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
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