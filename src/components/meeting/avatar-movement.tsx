'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { setUserPosition } from '@/lib/redux/features/user/userSlice';

interface Position {
  x: number;
  y: number;
}

interface AvatarMovementProps {
  currentUserId: string;
  onPositionUpdate?: (position: Position) => void;
}

// Movement constants
const MOVEMENT_SPEED = 3; // pixels per frame
const ANIMATION_SMOOTHING = 0.1;
const COLLISION_RADIUS = 30;

export function useAvatarMovement({ currentUserId, onPositionUpdate }: AvatarMovementProps) {
  const dispatch = useAppDispatch();
  const [targetPosition, setTargetPosition] = useState<Position | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  
  // Redux state
  const currentPosition = useAppSelector((state) => state.user.position);
  const connectedUsers = useAppSelector((state) => state.user.connectedUsers);

  // Smooth movement animation
  const animateMovement = useCallback(() => {
    if (!targetPosition || !currentPosition) {
      setIsMoving(false);
      return;
    }

    const dx = targetPosition.x - currentPosition.x;
    const dy = targetPosition.y - currentPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 2) {
      // Reached target
      setTargetPosition(null);
      setIsMoving(false);
      onPositionUpdate?.(targetPosition);
      return;
    }

    // Calculate smooth movement
    const moveDistance = Math.min(distance, MOVEMENT_SPEED);
    const moveX = (dx / distance) * moveDistance;
    const moveY = (dy / distance) * moveDistance;

    const newPosition = {
      x: currentPosition.x + moveX,
      y: currentPosition.y + moveY
    };

    // Check for collisions with other users
    const hasCollision = Array.from(connectedUsers.values()).some(user => {
      if (user.userId === currentUserId) return false;
      const userDx = newPosition.x - user.position.x;
      const userDy = newPosition.y - user.position.y;
      const userDistance = Math.sqrt(userDx * userDx + userDy * userDy);
      return userDistance < COLLISION_RADIUS;
    });

    if (!hasCollision) {
      dispatch(setUserPosition(newPosition));
      onPositionUpdate?.(newPosition);
    }

    animationFrameRef.current = requestAnimationFrame(animateMovement);
  }, [targetPosition, currentPosition, connectedUsers, currentUserId, dispatch, onPositionUpdate]);

  // Start movement animation
  useEffect(() => {
    if (isMoving && targetPosition) {
      animationFrameRef.current = requestAnimationFrame(animateMovement);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isMoving, targetPosition, animateMovement]);

  const moveToPosition = useCallback((newPosition: Position) => {
    setTargetPosition(newPosition);
    setIsMoving(true);
  }, []);

  const teleportToPosition = useCallback((newPosition: Position) => {
    dispatch(setUserPosition(newPosition));
    onPositionUpdate?.(newPosition);
    setTargetPosition(null);
    setIsMoving(false);
  }, [dispatch, onPositionUpdate]);

  return {
    currentPosition,
    targetPosition,
    isMoving,
    moveToPosition,
    teleportToPosition,
  };
}

// WASD keyboard movement hook
export function useKeyboardMovement({ currentUserId, onPositionUpdate }: AvatarMovementProps) {
  const dispatch = useAppDispatch();
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const movementIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const currentPosition = useAppSelector((state) => state.user.position);
  const connectedUsers = useAppSelector((state) => state.user.connectedUsers);

  const movePlayer = useCallback((direction: { x: number; y: number }) => {
    if (!currentPosition) return;

    const newPosition = {
      x: Math.max(30, Math.min(970, currentPosition.x + direction.x * MOVEMENT_SPEED)),
      y: Math.max(30, Math.min(670, currentPosition.y + direction.y * MOVEMENT_SPEED))
    };

    // Check for collisions
    const hasCollision = Array.from(connectedUsers.values()).some(user => {
      if (user.userId === currentUserId) return false;
      const dx = newPosition.x - user.position.x;
      const dy = newPosition.y - user.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < COLLISION_RADIUS;
    });

    if (!hasCollision) {
      dispatch(setUserPosition(newPosition));
      onPositionUpdate?.(newPosition);
    }
  }, [currentPosition, connectedUsers, currentUserId, dispatch, onPositionUpdate]);

  const processMovement = useCallback(() => {
    let direction = { x: 0, y: 0 };
    
    if (pressedKeys.has('w') || pressedKeys.has('ArrowUp')) direction.y -= 1;
    if (pressedKeys.has('s') || pressedKeys.has('ArrowDown')) direction.y += 1;
    if (pressedKeys.has('a') || pressedKeys.has('ArrowLeft')) direction.x -= 1;
    if (pressedKeys.has('d') || pressedKeys.has('ArrowRight')) direction.x += 1;

    // Normalize diagonal movement
    if (direction.x !== 0 && direction.y !== 0) {
      direction.x *= 0.707; // 1/sqrt(2)
      direction.y *= 0.707;
    }

    if (direction.x !== 0 || direction.y !== 0) {
      movePlayer(direction);
    }
  }, [pressedKeys, movePlayer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
        setPressedKeys(prev => new Set(prev).add(key));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setPressedKeys(prev => {
        const newKeys = new Set(prev);
        newKeys.delete(key);
        return newKeys;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (pressedKeys.size > 0) {
      movementIntervalRef.current = setInterval(processMovement, 16); // ~60fps
    } else {
      if (movementIntervalRef.current) {
        clearInterval(movementIntervalRef.current);
      }
    }

    return () => {
      if (movementIntervalRef.current) {
        clearInterval(movementIntervalRef.current);
      }
    };
  }, [pressedKeys, processMovement]);

  return {
    isMoving: pressedKeys.size > 0,
    pressedKeys: Array.from(pressedKeys),
  };
}

// Movement controls UI component
interface MovementControlsProps {
  currentUserId: string;
  onPositionUpdate?: (position: Position) => void;
}

export function MovementControls({ currentUserId, onPositionUpdate }: MovementControlsProps) {
  const { currentPosition, isMoving, moveToPosition } = useAvatarMovement({
    currentUserId,
    onPositionUpdate
  });
  
  const { pressedKeys } = useKeyboardMovement({
    currentUserId,
    onPositionUpdate
  });

  const quickMoveToZone = useCallback((zoneName: string) => {
    const zonePositions: Record<string, Position> = {
      'conference': { x: 170, y: 150 },
      'brainstorm': { x: 400, y: 140 },
      'collaboration': { x: 690, y: 220 },
      'coffee': { x: 110, y: 500 },
      'quiet': { x: 400, y: 460 },
      'presentation': { x: 750, y: 530 },
      'center': { x: 500, y: 350 }
    };

    const position = zonePositions[zoneName];
    if (position) {
      moveToPosition(position);
    }
  }, [moveToPosition]);

  return (
    <div className="fixed bottom-20 left-4 z-40 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
      <div className="text-xs font-semibold text-gray-700 mb-2">Quick Move</div>
      
      {/* Zone quick buttons */}
      <div className="grid grid-cols-2 gap-1 mb-3">
        <button
          onClick={() => quickMoveToZone('conference')}
          className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors"
        >
          📊 Conference
        </button>
        <button
          onClick={() => quickMoveToZone('brainstorm')}
          className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 rounded transition-colors"
        >
          💡 Brainstorm
        </button>
        <button
          onClick={() => quickMoveToZone('collaboration')}
          className="px-2 py-1 text-xs bg-cyan-100 hover:bg-cyan-200 rounded transition-colors"
        >
          🤝 Collab
        </button>
        <button
          onClick={() => quickMoveToZone('coffee')}
          className="px-2 py-1 text-xs bg-amber-100 hover:bg-amber-200 rounded transition-colors"
        >
          ☕ Coffee
        </button>
      </div>

      {/* Movement status */}
      <div className="text-xs text-gray-600 space-y-1">
        <div>Position: ({Math.round(currentPosition?.x || 0)}, {Math.round(currentPosition?.y || 0)})</div>
        {isMoving && <div className="text-blue-600">🚶 Moving...</div>}
        {pressedKeys.length > 0 && (
          <div className="text-green-600">
            ⌨️ Keys: {pressedKeys.join(', ').toUpperCase()}
          </div>
        )}
        <div className="text-gray-500 mt-2 border-t pt-2">
          Use WASD or arrow keys to move
        </div>
      </div>
    </div>
  );
}