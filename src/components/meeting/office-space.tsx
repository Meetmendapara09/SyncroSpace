'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { setPlayerPosition } from '@/lib/redux/features/room/roomSlice';
import { setUserPosition, updateConnectedUser } from '@/lib/redux/features/user/userSlice';
import { ProximityAudioManager, useProximityChat } from '@/lib/proximity-audio';
import { networkManager } from '@/lib/colyseus-network';

interface Position {
  x: number;
  y: number;
}

interface Player {
  id: string;
  username: string;
  position: Position;
  webcamStream?: MediaStream;
  isWebcamEnabled?: boolean;
  isMicEnabled?: boolean;
  avatar?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

interface OfficeSpaceProps {
  players: Player[];
  currentPlayerId: string;
  onPositionChange?: (position: Position) => void;
  onProximityChange?: (nearbyPlayers: Player[]) => void;
}

const PROXIMITY_THRESHOLD = 150; // pixels
const OFFICE_WIDTH = 1000;
const OFFICE_HEIGHT = 700;

// Office zones with enhanced CaveVerse-style areas using senior's professional assets
const OFFICE_ZONES = [
  { 
    id: 'conference-a', 
    position: { x: 100, y: 100 }, 
    size: { width: 140, height: 100 }, 
    label: 'Conference Room A', 
    color: '#3b82f6',
    furniture: [
      { image: '/assets/items/chair.png', x: 110, y: 140, width: 25, height: 25 },
      { image: '/assets/items/chair.png', x: 180, y: 140, width: 25, height: 25 },
      { image: '/assets/items/whiteboard.png', x: 120, y: 110, width: 80, height: 30 }
    ]
  },
  { 
    id: 'brainstorm', 
    position: { x: 320, y: 80 }, 
    size: { width: 160, height: 120 }, 
    label: 'Brainstorm Zone', 
    color: '#8b5cf6',
    furniture: [
      { image: '/assets/items/chair.png', x: 350, y: 140, width: 25, height: 25 },
      { image: '/assets/items/chair.png', x: 400, y: 140, width: 25, height: 25 },
      { image: '/assets/items/whiteboard.png', x: 330, y: 100, width: 80, height: 30 }
    ]
  },
  { 
    id: 'collaboration', 
    position: { x: 600, y: 150 }, 
    size: { width: 180, height: 140 }, 
    label: 'Collaboration Hub', 
    color: '#06b6d4',
    furniture: [
      { image: '/assets/items/computer.png', x: 640, y: 180, width: 35, height: 30 },
      { image: '/assets/items/computer.png', x: 700, y: 180, width: 35, height: 30 },
      { image: '/assets/items/chair.png', x: 630, y: 220, width: 25, height: 25 },
      { image: '/assets/items/chair.png', x: 690, y: 220, width: 25, height: 25 }
    ]
  },
  { 
    id: 'coffee', 
    position: { x: 50, y: 450 }, 
    size: { width: 120, height: 100 }, 
    label: 'Coffee Corner', 
    color: '#f59e0b',
    furniture: [
      { image: '/assets/items/vendingmachine.png', x: 80, y: 470, width: 40, height: 60 },
      { image: '/assets/items/chair.png', x: 130, y: 500, width: 25, height: 25 }
    ]
  },
  { 
    id: 'quiet-work', 
    position: { x: 300, y: 400 }, 
    size: { width: 200, height: 120 }, 
    label: 'Quiet Work Area', 
    color: '#10b981',
    furniture: [
      { image: '/assets/items/computer.png', x: 330, y: 430, width: 35, height: 30 },
      { image: '/assets/items/chair.png', x: 320, y: 470, width: 25, height: 25 },
      { image: '/assets/items/computer.png', x: 420, y: 430, width: 35, height: 30 },
      { image: '/assets/items/chair.png', x: 410, y: 470, width: 25, height: 25 }
    ]
  },
  { 
    id: 'presentation', 
    position: { x: 650, y: 450 }, 
    size: { width: 200, height: 160 }, 
    label: 'Presentation Stage', 
    color: '#ef4444',
    furniture: [
      { image: '/assets/items/whiteboard.png', x: 680, y: 470, width: 120, height: 40 },
      { image: '/assets/items/chair.png', x: 670, y: 530, width: 25, height: 25 },
      { image: '/assets/items/chair.png', x: 710, y: 530, width: 25, height: 25 },
      { image: '/assets/items/chair.png', x: 750, y: 530, width: 25, height: 25 },
      { image: '/assets/items/chair.png', x: 790, y: 530, width: 25, height: 25 }
    ]
  },
];

// Updated furniture images to preload from senior's assets
const FURNITURE_IMAGES = [
  '/assets/items/chair.png', 
  '/assets/items/computer.png', 
  '/assets/items/whiteboard.png', 
  '/assets/items/vendingmachine.png',
  '/assets/items/camera-on.svg',
  '/assets/items/camera-off.svg',
  '/assets/items/mic-on.svg',
  '/assets/items/mic-off.svg',
  '/assets/items/phone-off.svg',
  // Character sprites for animation
  ...Array.from({length: 24}, (_, i) => `/assets/characters/single/Adam_idle_anim_${i+1}.png`),
  ...Array.from({length: 24}, (_, i) => `/assets/characters/single/Ash_idle_anim_${i+1}.png`),
  ...Array.from({length: 24}, (_, i) => `/assets/characters/single/Lucy_idle_anim_${i+1}.png`),
  ...Array.from({length: 24}, (_, i) => `/assets/characters/single/Nancy_idle_anim_${i+1}.png`),
];

export function OfficeSpace({ 
  players, 
  currentPlayerId,
  onPositionChange,
  onProximityChange 
}: OfficeSpaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [animationFrame, setAnimationFrame] = useState<number | null>(null);
  const [furnitureImages, setFurnitureImages] = useState<{[key: string]: HTMLImageElement}>({});
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const dispatch = useAppDispatch();
  
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const { getNearbyUsers, getProximityInfo } = useProximityChat(currentPlayerId);

  // Preload furniture images
  useEffect(() => {
    const loadImages = async () => {
      const imagePromises = FURNITURE_IMAGES.map((src) => {
        return new Promise<{src: string, img: HTMLImageElement}>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ src, img });
          img.onerror = reject;
          img.src = src;
        });
      });

      try {
        const results = await Promise.all(imagePromises);
        const imageMap: {[key: string]: HTMLImageElement} = {};
        results.forEach(({ src, img }) => {
          imageMap[src] = img;
        });
        setFurnitureImages(imageMap);
        setImagesLoaded(true);
      } catch (error) {
        console.warn('Some furniture images failed to load:', error);
        setImagesLoaded(true); // Still allow the component to work
      }
    };

    loadImages();
  }, []);

  const drawOfficeBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    // Modern office floor with gradient
    const gradient = ctx.createLinearGradient(0, 0, OFFICE_WIDTH, OFFICE_HEIGHT);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, OFFICE_WIDTH, OFFICE_HEIGHT);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= OFFICE_WIDTH; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, OFFICE_HEIGHT);
      ctx.stroke();
    }
    
    for (let y = 0; y <= OFFICE_HEIGHT; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(OFFICE_WIDTH, y);
      ctx.stroke();
    }

    // Office zones with enhanced styling
    OFFICE_ZONES.forEach(zone => {
      drawEnhancedZone(ctx, zone, zone.id === hoveredZone);
    });
  }, [hoveredZone]);

  const drawEnhancedZone = useCallback((
    ctx: CanvasRenderingContext2D, 
    zone: typeof OFFICE_ZONES[0],
    isHovered: boolean
  ) => {
    const { position, size, label, color, furniture } = zone;
    
    // Zone background with hover effect
    const alpha = isHovered ? 0.2 : 0.1;
    ctx.fillStyle = `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
    ctx.fillRect(position.x, position.y, size.width, size.height);
    
    // Enhanced border with rounded corners effect
    ctx.strokeStyle = color;
    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.setLineDash(isHovered ? [] : [8, 4]);
    
    // Draw rounded rectangle
    const radius = 8;
    ctx.beginPath();
    ctx.roundRect(position.x, position.y, size.width, size.height, radius);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Render furniture images if loaded
    if (furniture && imagesLoaded) {
      furniture.forEach((item) => {
        const img = furnitureImages[item.image];
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, item.x, item.y, item.width, item.height);
        }
      });
    }
    
    // Zone label with better typography
    ctx.fillStyle = color;
    ctx.font = `${isHovered ? 'bold 14px' : 'bold 12px'} Inter, -apple-system, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, position.x + size.width / 2, position.y + size.height / 2 + 4);
    
    // Zone icon (simple geometric shapes for different areas)
    drawZoneIcon(ctx, zone, isHovered);
  }, [furnitureImages, imagesLoaded]);

  const drawZoneIcon = useCallback((
    ctx: CanvasRenderingContext2D,
    zone: typeof OFFICE_ZONES[0],
    isHovered: boolean
  ) => {
    const iconSize = isHovered ? 20 : 16;
    const iconX = zone.position.x + zone.size.width / 2;
    const iconY = zone.position.y + 25;
    
    ctx.fillStyle = zone.color;
    ctx.strokeStyle = zone.color;
    ctx.lineWidth = 2;
    
    switch (zone.id) {
      case 'conference-a':
        // Table icon
        ctx.fillRect(iconX - iconSize/2, iconY - 4, iconSize, 8);
        break;
      case 'brainstorm':
        // Lightbulb icon (simplified)
        ctx.beginPath();
        ctx.arc(iconX, iconY, iconSize/2, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'collaboration':
        // People icon (simplified)
        ctx.beginPath();
        ctx.arc(iconX - 6, iconY, 4, 0, 2 * Math.PI);
        ctx.arc(iconX + 6, iconY, 4, 0, 2 * Math.PI);
        ctx.fill();
        break;
      case 'coffee':
        // Cup icon
        ctx.beginPath();
        ctx.arc(iconX, iconY, iconSize/2, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'quiet-work':
        // Book icon
        ctx.fillRect(iconX - iconSize/2, iconY - iconSize/3, iconSize, iconSize*2/3);
        break;
      case 'presentation':
        // Screen icon
        ctx.strokeRect(iconX - iconSize/2, iconY - iconSize/3, iconSize, iconSize*2/3);
        break;
    }
  }, []);

  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D, player: Player, isCurrentPlayer: boolean) => {
    const { x, y } = player.position;
    const spriteWidth = 32;
    const spriteHeight = 40;
    
    // Avatar shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + spriteHeight/2 + 4, spriteWidth * 0.4, spriteHeight * 0.1, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Get character sprite
    const characterId = player.avatar || 'adam';
    const animFrame = Math.floor(Date.now() / 200) % 24 + 1; // Slow idle animation
    const spritePath = `/assets/characters/single/${characterId.charAt(0).toUpperCase() + characterId.slice(1)}_idle_anim_${animFrame}.png`;
    
    // Draw character sprite if available
    const characterImg = furnitureImages[spritePath];
    if (characterImg && characterImg.complete && characterImg.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        characterImg, 
        x - spriteWidth/2, 
        y - spriteHeight/2, 
        spriteWidth, 
        spriteHeight
      );
      ctx.imageSmoothingEnabled = true;
    } else {
      // Fallback to colored circle if sprite not loaded
      const radius = isCurrentPlayer ? 20 : 16;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      if (isCurrentPlayer) {
        gradient.addColorStop(0, '#60a5fa');
        gradient.addColorStop(1, '#3b82f6');
      } else {
        const statusColors = {
          online: ['#34d399', '#10b981'],
          away: ['#fbbf24', '#f59e0b'],
          busy: ['#f87171', '#ef4444'],
          offline: ['#6b7280', '#4b5563'],
        };
        const colors = statusColors[player.status || 'online'] || statusColors.online;
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
      }
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Player initial
      ctx.fillStyle = 'white';
      ctx.font = `bold ${radius * 0.6}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      const initial = player.username?.[0]?.toUpperCase() || 'P';
      ctx.fillText(initial, x, y + radius * 0.2);
    }
    
    // Current player glow effect
    if (isCurrentPlayer) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.roundRect(x - spriteWidth/2 - 4, y - spriteHeight/2 - 4, spriteWidth + 8, spriteHeight + 8, 8);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Player name with background
    const nameY = y + spriteHeight/2 + 18;
    const name = player.username || 'Player';
    
    // Name background
    ctx.font = '12px Inter, sans-serif';
    const nameWidth = ctx.measureText(name).width + 8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - nameWidth/2, nameY - 8, nameWidth, 16);
    
    // Name text
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(name, x, nameY + 4);
    
    // Enhanced status indicators positioned for sprite
    const statusY = y - spriteHeight/2 - 8;
    let statusX = x - 12;
    
    // Webcam indicator with better styling
    ctx.fillStyle = player.isWebcamEnabled ? '#10b981' : '#ef4444';
    ctx.beginPath();
    ctx.arc(statusX, statusY, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Mic indicator
    statusX += 20;
    ctx.fillStyle = player.isMicEnabled ? '#10b981' : '#ef4444';
    ctx.beginPath();
    ctx.arc(statusX, statusY, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Proximity circle for current player
    if (isCurrentPlayer) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(x, y, PROXIMITY_THRESHOLD, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, []);

  const calculateDistance = useCallback((pos1: Position, pos2: Position): number => {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, OFFICE_WIDTH, OFFICE_HEIGHT);

    // Enable anti-aliasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw office background
    drawOfficeBackground(ctx);

    // Draw all players with z-index (current player on top)
    const otherPlayers = players.filter(p => p.id !== currentPlayerId);
    const currentPlayerData = players.find(p => p.id === currentPlayerId);
    
    otherPlayers.forEach(player => {
      drawPlayer(ctx, player, false);
    });
    
    if (currentPlayerData) {
      drawPlayer(ctx, currentPlayerData, true);
    }

    // Check for proximity changes
    if (currentPlayerData && onProximityChange) {
      const nearbyPlayers = players.filter(player => {
        if (player.id === currentPlayerId) return false;
        const distance = calculateDistance(currentPlayerData.position, player.position);
        return distance <= PROXIMITY_THRESHOLD;
      });
      onProximityChange(nearbyPlayers);
    }
  }, [players, currentPlayerId, drawOfficeBackground, drawPlayer, calculateDistance, onProximityChange]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      drawCanvas();
      setAnimationFrame(requestAnimationFrame(animate));
    };
    
    setAnimationFrame(requestAnimationFrame(animate));
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [drawCanvas]);

  const getCanvasPosition = useCallback((e: React.MouseEvent): Position => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = OFFICE_WIDTH / rect.width;
    const scaleY = OFFICE_HEIGHT / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const isPositionValid = useCallback((position: Position): boolean => {
    return (
      position.x >= 30 &&
      position.x <= OFFICE_WIDTH - 30 &&
      position.y >= 30 &&
      position.y <= OFFICE_HEIGHT - 30
    );
  }, []);

  const getZoneAtPosition = useCallback((position: Position): string | null => {
    for (const zone of OFFICE_ZONES) {
      if (
        position.x >= zone.position.x &&
        position.x <= zone.position.x + zone.size.width &&
        position.y >= zone.position.y &&
        position.y <= zone.position.y + zone.size.height
      ) {
        return zone.id;
      }
    }
    return null;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const mousePos = getCanvasPosition(e);
    const hoveredZoneId = getZoneAtPosition(mousePos);
    setHoveredZone(hoveredZoneId);

    if (!isDragging || !currentPlayer) return;
    
    const newPosition = {
      x: mousePos.x - dragOffset.x,
      y: mousePos.y - dragOffset.y
    };
    
    if (isPositionValid(newPosition)) {
      dispatch(setUserPosition(newPosition));
      
      // Update multiplayer position
      const currentUser = players.find(p => p.id === currentPlayerId);
      if (currentUser) {
        networkManager.updatePlayerPosition(newPosition.x, newPosition.y, 'walking');
      }
      
      onPositionChange?.(newPosition);
    }
  }, [isDragging, currentPlayer, dragOffset, getCanvasPosition, getZoneAtPosition, isPositionValid, dispatch, onPositionChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!currentPlayer) return;
    
    const mousePos = getCanvasPosition(e);
    const distance = calculateDistance(mousePos, currentPlayer.position);
    
    if (distance <= 28) {
      setIsDragging(true);
      setDragOffset({
        x: mousePos.x - currentPlayer.position.x,
        y: mousePos.y - currentPlayer.position.y
      });
    }
  }, [currentPlayer, getCanvasPosition, calculateDistance]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!currentPlayer) return;
    
    const mousePos = getCanvasPosition(e);
    if (isPositionValid(mousePos)) {
      dispatch(setUserPosition(mousePos));
      
      // Update multiplayer position
      const currentUser = players.find(p => p.id === currentPlayerId);
      if (currentUser) {
        networkManager.updatePlayerPosition(mousePos.x, mousePos.y, 'idle');
      }
      
      onPositionChange?.(mousePos);
    }
  }, [currentPlayer, getCanvasPosition, isPositionValid, dispatch, onPositionChange]);

  const proximityInfo = getProximityInfo();

  return (
    <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
      <canvas
        ref={canvasRef}
        width={OFFICE_WIDTH}
        height={OFFICE_HEIGHT}
        className="cursor-pointer w-full h-auto"
        style={{ maxWidth: '100%', height: 'auto' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />
      
      {/* Enhanced office info overlay */}
      <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm text-white p-3 rounded-lg text-sm space-y-1">
        <div className="font-semibold">SyncroSpace Virtual Office</div>
        <div className="text-gray-300">{players.length} people online</div>
        <div className="text-blue-300">{proximityInfo.nearbyCount} nearby</div>
        <div className="text-xs text-gray-400 mt-2">
          {isDragging ? '🎯 Moving avatar...' : '🖱️ Drag avatar or double-click to move'}
        </div>
      </div>

      {/* Zone hover info */}
      {hoveredZone && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg text-sm">
          <div className="font-semibold">
            {OFFICE_ZONES.find(z => z.id === hoveredZone)?.label}
          </div>
          <div className="text-gray-600 text-xs mt-1">
            Click to move here instantly
          </div>
        </div>
      )}

      {/* Enhanced legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm p-4 rounded-lg text-xs space-y-2 shadow-lg">
        <div className="font-semibold text-gray-900">Legend:</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-gray-700">Camera/Mic On</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-gray-700">Camera/Mic Off</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 border border-dashed border-blue-400"></div>
          <span className="text-gray-700">Proximity Chat Zone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full ring-2 ring-blue-300"></div>
          <span className="text-gray-700">You</span>
        </div>
      </div>

      {/* Proximity Audio Manager */}
      <ProximityAudioManager 
        currentUserId={currentPlayerId}
        onProximityChange={(nearbyUserIds) => {
          const nearbyPlayersList = nearbyUserIds
            .map(id => players.find(p => p.id === id))
            .filter(Boolean) as Player[];
          onProximityChange?.(nearbyPlayersList);
        }}
      />
    </div>
  );
}

interface ProximityChatPanelProps {
  nearbyPlayers: Player[];
  isEnabled: boolean;
  onToggle: () => void;
}

export function ProximityChatPanel({ 
  nearbyPlayers, 
  isEnabled, 
  onToggle 
}: ProximityChatPanelProps) {
  if (nearbyPlayers.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[200px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Nearby ({nearbyPlayers.length})</h3>
        <button
          onClick={onToggle}
          className={`px-2 py-1 rounded text-xs ${
            isEnabled 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {isEnabled ? 'Connected' : 'Connect'}
        </button>
      </div>
      
      <div className="space-y-2">
        {nearbyPlayers.map(player => (
          <div key={player.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
              {player.username?.[0]?.toUpperCase() || 'P'}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{player.username}</div>
              <div className="flex gap-1 mt-1">
                <div className={`w-2 h-2 rounded-full ${
                  player.isWebcamEnabled ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <div className={`w-2 h-2 rounded-full ${
                  player.isMicEnabled ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}