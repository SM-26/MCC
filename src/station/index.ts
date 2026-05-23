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
