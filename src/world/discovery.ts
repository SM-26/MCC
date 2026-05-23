// src/world/discovery.ts - World Discovery Implementation

import { Destination } from '../core/types/state';

/**
 * Perform exploration to discover new destinations
 */
export function performExploration(): void {
  // This would be called from the UI when the explore button is clicked
  // For now, this is a placeholder for future implementation
}

/**
 * Generate a random destination for discovery
 */
export function generateRandomDestination(index: number): Destination {
  const isCity = Math.random() > 0.5;
  const ring = index < 6 ? 1 : (index < 18 ? 2 : 3);
  
  return {
    id: `${isCity ? 'city' : 'factory'}-${index}`,
    name: isCity 
      ? `City ${String.fromCharCode(65 + index)}` 
      : `Factory ${index + 1}`,
    type: isCity ? 'city' : 'factory',
    distance: Math.floor(Math.random() * 5) + (ring * 10),
    basePayout: isCity ? 120 : 180,
    discovered: false
  };
}

/**
 * Get exploration statistics based on discovery count
 */
export function getExplorationStats(explorationsDone: number = 0): { ring: number; distance: number } {
  const ring = explorationsDone < 6 ? 1 : (explorationsDone < 18 ? 2 : 3);
  return { ring, distance: ring * 10 };
}
