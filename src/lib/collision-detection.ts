'use client';

import { Position } from '@/components/space/virtual-space';

// Map boundaries and collision detection
const MAP_WIDTH = 1920;  // Map width in pixels
const MAP_HEIGHT = 1080; // Map height in pixels
const AVATAR_SIZE = 48;  // Avatar size in pixels
const BUFFER = 10;       // Buffer distance from edges

// Obstacle definitions for collision detection
const obstacles = [
  // Example obstacles - replace with actual map obstacles
  { x: 200, y: 300, width: 100, height: 150 }, // Example desk
  { x: 400, y: 200, width: 200, height: 100 }, // Example table
  { x: 800, y: 500, width: 120, height: 80 },  // Example chair
];

/**
 * Check if a position is valid (within bounds and not colliding with obstacles)
 * @param position The position to check
 * @returns boolean indicating if the position is valid
 */
export function isPositionValid(position: Position): boolean {
  // Check map boundaries
  if (
    position.x < BUFFER || 
    position.y < BUFFER || 
    position.x > MAP_WIDTH - AVATAR_SIZE - BUFFER || 
    position.y > MAP_HEIGHT - AVATAR_SIZE - BUFFER
  ) {
    return false;
  }
  
  // Check collision with obstacles
  for (const obstacle of obstacles) {
    // Simple rectangular collision detection
    if (
      position.x < obstacle.x + obstacle.width &&
      position.x + AVATAR_SIZE > obstacle.x &&
      position.y < obstacle.y + obstacle.height &&
      position.y + AVATAR_SIZE > obstacle.y
    ) {
      return false;
    }
  }
  
  return true;
}

/**
 * Find a valid position near the requested position if the requested position is invalid
 * @param position The originally requested position
 * @returns A valid position, either the original or an adjusted one
 */
export function findValidPosition(position: Position): Position {
  // If the original position is valid, return it
  if (isPositionValid(position)) {
    return position;
  }
  
  // Otherwise try positions in increasing radius around the original
  const directions = [
    { x: 0, y: -1 },  // Up
    { x: 1, y: 0 },   // Right
    { x: 0, y: 1 },   // Down
    { x: -1, y: 0 },  // Left
    { x: 1, y: -1 },  // Up-Right
    { x: 1, y: 1 },   // Down-Right
    { x: -1, y: 1 },  // Down-Left
    { x: -1, y: -1 }, // Up-Left
  ];
  
  // Try increasing distances from the original position
  for (let distance = 5; distance <= 50; distance += 5) {
    for (const dir of directions) {
      const newPosition = {
        x: position.x + dir.x * distance,
        y: position.y + dir.y * distance,
      };
      
      if (isPositionValid(newPosition)) {
        return newPosition;
      }
    }
  }
  
  // If no valid position found, return a safe default position
  return { x: 100, y: 100 };
}