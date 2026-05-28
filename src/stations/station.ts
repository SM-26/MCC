/**
 * ============================================================================
 * Merge & Choo-Choo - Station Slice
 * ============================================================================
 * Stations, platforms, routes, carts, and train lifecycle logic.
 * ============================================================================
 */

import { AppState } from '@/types/game';

/**
 * Initialize Station Slice (Placeholder)
 * 
 * TODO: Implement station/logistics systems
 * @param appState - The shared application state object
 */
export async function initStationSlice(appState: AppState): Promise<void> {
  console.log('[Station] Initializing station slice...');

  // TODO: Implement station/logistics systems
  // - Station construction
  // - Platform management
  // - Train assignment and routes
  // - Cart composition
}


// src/station/platforms.ts

import { Station, Platform } from '../core/types/state';

export function createPlatform(stationId: string, level: number): Platform {
  return {
    id: `platform-${stationId}-${level}`,
    level,
    train: null
  };
}

export function getGroundLevel(): number {
  // Ground level is always 1
  return 1;
}

export function getNextUndergroundLevel(currentLevel: number): number {
  // Underground levels are 6, 11, 16, etc.
  return currentLevel + 5;
}

export function getPlatformForLevel(plotDepth: number): Platform | null {
  // Only create platforms at valid levels (divisible by 5, starting from 1)
  if (plotDepth <= 0 || plotDepth % 5 !== 1) return null;

  const level = plotDepth;
  const stationId = getStationIdForPlot(plotDepth);

  return createPlatform(stationId, level);
}

function getStationIdForPlot(depth: number): string {
  const northExpansion = 0; // Simplified for now
  const undergroundTier = Math.floor((depth - 1) / 5);
  const tierLabel = undergroundTier === 0 ? 'g' : `u${undergroundTier + 1}`;

  return `station-plot-A-${getRomanNumeral(northExpansion)}-${tierLabel}`;
}

function getRomanNumeral(num: number): string {
  const numerals: Record<number, string> = {
    0: 'I', 1: 'II', 2: 'III', 3: 'IV', 4: 'V',
    5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X'
  };
  return numerals[num] || String(num);
}

// -----------------------

// src/station/index.ts - Station Slice Implementation

import { Station, Platform, Train, CartSlot, Route } from '../core/types/state';
import { ENGINE_AGES, createTrain, advanceEngineType } from './trains';
import { CART_TYPES, getCartCost, buyCart, fitCart, removeCart } from './carts';
import { createPlatform, getNextUndergroundLevel } from './platforms';

/**
 * Create a new station for a plot
 */
export function createStation(plotId: string, northExpansion: number): Station {
  const groundLevel = 1;
  const platforms: Platform[] = [
    createPlatform(`station-${plotId}-u0`, groundLevel)
  ];

  return {
    id: `station-${plotId}-u0`,
    plotId,
    northExpansion,
    groundLevel,
    platforms
  };
}

/**
 * Get the next available underground level for a station
 */
export function getNextStationLevel(currentLevel: number): number {
  return currentLevel + 5; // Stations are 5 levels apart
}

/**
 * Check if a train can be dispatched (has route and carts)
 */
export function canDispatchTrain(train: Train): boolean {
  return train.state === 'idle' &&
    (train.route !== null || state.destinations.length > 0);
}

/**
 * Get total cart capacity of a train
 */
export function getTrainCartCapacity(train: Train): number {
  let capacity = 0;
  for (const slot of train.carts) {
    if (slot.type === 'passenger') {
      capacity += slot.count * CART_TYPES.passenger.capacity;
    } else if (slot.type === 'cargo') {
      capacity += slot.count * CART_TYPES.cargo.capacity;
    }
  }
  return capacity;
}

/**
 * Calculate trip time for a train to a destination
 */
export function calculateTripTime(train: Train, destinationId: string): number {
  const dest = state.destinations.find(d => d.id === destinationId);
  if (!dest) return 0;

  const baseSpeed = 10 + (train.engineLevel - 1) * 2;
  const weight = 1 + train.carts.reduce((sum, slot) => {
    if (slot.type === 'passenger') return sum + slot.count * 0.1;
    if (slot.type === 'cargo') return sum + slot.count * 0.12;
    return sum;
  }, 0);

  return (dest.distance / baseSpeed) * 10 * weight;
}

/**
 * Complete a train trip and collect payout
 */
export function completeTrainTrip(train: Train, destinationId: string): number {
  const dest = state.destinations.find(d => d.id === destinationId);
  if (!dest) return 0;

  let payout = dest.basePayout;

  // Add bonus for each cart type used
  for (const slot of train.carts) {
    if (slot.type === 'passenger') {
      payout += slot.count * CART_TYPES.passenger.value;
    } else if (slot.type === 'cargo') {
      payout += slot.count * CART_TYPES.cargo.value;
    }
  }

  return payout;
}
