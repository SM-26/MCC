// src/logic/station/stationBalance.ts
//
// Every tunable number and pure formula for the station/train economy lives
// here. Balancing is a later pass over this one file — values below are
// playable placeholders, not balanced.

import type { AgeResources, Ages } from '../mine/mineTypes';
import type { CartRole, CartSlot, CartType } from './stationTypes';

export interface EngineStats {
  cost: { money: number; resources: Partial<AgeResources> };
  maxCarts: number;
  speed: number;
}

export interface CartStats {
  role: CartRole;
  capacity: number;
  valueMultiplier: number;
  cost: { money: number };
}

export const AGE_ORDER: Ages[] = ['Mechanical', 'Steam', 'Diesel', 'Electric', 'Maglev'];

export function isAgeAtLeast(current: Ages, required: Ages): boolean {
  return AGE_ORDER.indexOf(current) >= AGE_ORDER.indexOf(required);
}

/** The signature resource of each age (what its tech "runs on"). */
export const AGE_RESOURCE: Record<Ages, keyof AgeResources | null> = {
  Mechanical: null,
  Steam: 'coal',
  Diesel: 'oil',
  Electric: 'copper',
  Maglev: 'superalloy',
};

export const ENGINE_STATS: Record<Ages, EngineStats> = {
  Mechanical: { cost: { money: 150, resources: {} }, maxCarts: 2, speed: 1 },
  Steam: { cost: { money: 400, resources: { coal: 20 } }, maxCarts: 4, speed: 2 },
  Diesel: { cost: { money: 1200, resources: { oil: 25 } }, maxCarts: 6, speed: 3 },
  Electric: { cost: { money: 3000, resources: { copper: 30 } }, maxCarts: 8, speed: 5 },
  Maglev: { cost: { money: 8000, resources: { superalloy: 40 } }, maxCarts: 10, speed: 8 },
};

export const CART_STATS: Record<CartType, CartStats> = {
  simple: { role: 'passenger', capacity: 4, valueMultiplier: 1, cost: { money: 50 } },
  'double deckers': { role: 'passenger', capacity: 8, valueMultiplier: 1, cost: { money: 120 } },
  luxury: { role: 'passenger', capacity: 4, valueMultiplier: 2.5, cost: { money: 200 } },
  cargo: { role: 'cargo', capacity: 10, valueMultiplier: 1, cost: { money: 60 } },
  'better cargo': { role: 'cargo', capacity: 20, valueMultiplier: 1, cost: { money: 150 } },
  'best cargo': { role: 'cargo', capacity: 40, valueMultiplier: 1, cost: { money: 350 } },
};

export const RESOURCE_VALUE: Record<keyof AgeResources, number> = {
  coal: 5,
  oil: 12,
  copper: 25,
  superalloy: 60,
};

const PLATFORM_BASE_MONEY = 100;
const PLATFORM_MONEY_PER_DEPTH = 40;

export function getPlatformCost(depth: number, currentAge: Ages): { money: number; resources: Partial<AgeResources> } {
  const money = PLATFORM_BASE_MONEY + PLATFORM_MONEY_PER_DEPTH * depth;
  const resource = AGE_RESOURCE[currentAge];
  if (depth === 0 || resource === null) {
    return { money, resources: {} };
  }
  return { money, resources: { [resource]: Math.ceil(depth / 2) } };
}

// ── Travel-time tuning (adjust these for balancing) ────────────────────────
/** Base one-way travel time per hex cell at speed 1; a trip is out + back. */
const BASE_MS_PER_CELL = 30_000;
/** Each engine level above 1 adds this fraction to speed. */
const LEVEL_SPEED_BONUS = 0.1;
/** Each cart adds this fraction to travel time (weight). 0 = carts are free. */
export const CART_WEIGHT_PENALTY = 0.2;

/**
 * Round-trip duration in ms. Faster with engine speed/level, slower with cart
 * weight. Baseline: ring 1, Mechanical, level 1, no carts → 60s.
 */
export function getTripDuration(distanceInCells: number, engineAge: Ages, engineLevel: number, cartCount = 0): number {
  const speed = ENGINE_STATS[engineAge].speed * (1 + LEVEL_SPEED_BONUS * (engineLevel - 1));
  const weight = 1 + CART_WEIGHT_PENALTY * cartCount;
  return (2 * distanceInCells * BASE_MS_PER_CELL * weight) / speed;
}

const CITY_BASE_PAYOUT = 10;
const CITY_PAYOUT_PER_RING = 5;

export function getCityPayout(ring: number, carts: CartSlot[]): number {
  const base = CITY_BASE_PAYOUT + CITY_PAYOUT_PER_RING * ring;
  const passengerScore = carts
    .filter((slot) => CART_STATS[slot.cartType].role === 'passenger')
    .reduce((sum, slot) => sum + CART_STATS[slot.cartType].capacity * CART_STATS[slot.cartType].valueMultiplier * slot.count, 0);
  return Math.round(base * passengerScore);
}

export function getCargoSaleValue(cargo: Partial<AgeResources>): number {
  return (Object.entries(cargo) as [keyof AgeResources, number][]).reduce((sum, [resource, units]) => sum + RESOURCE_VALUE[resource] * units, 0);
}

/** Greedy auto-load: fill capacity from stock, most valuable resource first. */
export function planCargoLoad(capacity: number, available: AgeResources): Partial<AgeResources> {
  const load: Partial<AgeResources> = {};
  let remaining = capacity;

  const byValueDesc = (Object.keys(RESOURCE_VALUE) as (keyof AgeResources)[]).sort((a, b) => RESOURCE_VALUE[b] - RESOURCE_VALUE[a]);

  for (const resource of byValueDesc) {
    if (remaining <= 0) {
      break;
    }
    const take = Math.min(remaining, available[resource]);
    if (take > 0) {
      load[resource] = take;
      remaining -= take;
    }
  }

  return load;
}
