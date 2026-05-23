// src/station/trains.ts

import { Train, CartSlot, Route } from '../core/types/state';

export const ENGINE_AGES = ['basic', 'steam', 'diesel', 'electric', 'maglev'] as const;

export function createTrain(engineAge: string, engineLevel: number): Train {
  return {
    engineAge,
    engineLevel,
    carts: [],
    state: 'idle',
    route: null,
    remainingTime: 0,
    totalTripTime: 0
  };
}

export function buyEngine(station: Station, age: string): void {
  const inventory = station.trainyardInventory.engines;
  
  if (inventory[age] === undefined) {
    inventory[age] = 0;
  }
  
  inventory[age]++;
}

export function upgradeEngine(train: Train): void {
  train.engineLevel++;
}

export function fitCart(train: Train, cartType: string): CartSlot | null {
  // Check capacity constraints
  const maxCapacity = getEngineCartCapacity(train.engineAge, train.engineLevel);
  const currentCapacity = train.carts.reduce((sum, slot) => sum + slot.count, 0);
  
  if (currentCapacity >= maxCapacity) return null;
  
  // Find matching cart type
  const existingSlot = train.carts.find(slot => slot.cartType === cartType);
  
  if (existingSlot) {
    existingSlot.count++;
  } else {
    train.carts.push({
      type: 'passenger',
      cartType,
      count: 1
    });
  }
  
  return existingSlot || train.carts[train.carts.length - 1];
}

export function getEngineCartCapacity(engineAge: string, engineLevel: number): number {
  // Base capacity increases with age and level
  const baseCapacity = {
    'basic': 0,
    'steam': 2,
    'diesel': 3,
    'electric': 4,
    'maglev': 5
  }[engineAge] || 0;
  
  return baseCapacity + (engineLevel - 1);
}

export function calculateTripTime(train: Train, destination: Destination): number {
  const baseSpeed = getEngineSpeed(train.engineAge, train.engineLevel);
  const weight = 1 + getCartsWeight(train.carts);
  
  return (destination.distance / baseSpeed) * 10 * weight;
}

export function calculateTripPayout(train: Train, destination: Destination): number {
  const basePayout = destination.basePayout + (destination.distance * 5);
  
  // Calculate cart bonuses
  let bonus = 0;
  let hasCarts = false;
  
  train.carts.forEach(slot => {
    if (slot.count > 0) {
      hasCarts = true;
      const cartType = slot.cartType;
      const isPassenger = destination.type === 'city';
      const isCargo = destination.type === 'factory';
      
      if ((isPassenger && cartType.includes('passenger')) ||
          (isCargo && cartType === 'cargo')) {
        bonus += slot.count * getCartValue(cartType);
      }
    }
  });
  
  return hasCarts ? basePayout * (1 + bonus) : Math.max(basePayout * 0.25, 10);
}

function getEngineSpeed(engineAge: string, engineLevel: number): number {
  const baseSpeed = {
    'basic': 10,
    'steam': 20,
    'diesel': 35,
    'electric': 50,
    'maglev': 70
  }[engineAge] || 10;
  
  return baseSpeed * (1 + (engineLevel - 1) * 0.2);
}

function getCartsWeight(carts: CartSlot[]): number {
  const weightPerCart = {
    'passenger': 0.1,
    'doubleDecker': 0.2,
    'luxury': 0.15,
    'cargo': 0.12
  };
  
  return carts.reduce((sum, slot) => sum + slot.count * weightPerCart[slot.cartType], 0);
}

function getCartValue(cartType: string): number {
  const values = {
    'passenger': 0.5,
    'doubleDecker': 1.0,
    'luxury': 1.5,
    'cargo': 0.7
  };
  
  return values[cartType] || 0;
}
