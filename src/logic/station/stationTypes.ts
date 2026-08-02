// src/logic/station/stationTypes.ts

import type { Ages, AgeResources } from '../mine/mineTypes';
import type { Route, WorldCellId } from '../world/worldTypes';
import { CART_STATS } from './stationBalance';

export type StationId = string;
export type PlatformId = string;
export type TrainId = string;
export type EngineId = string;

export type CartRole = 'passenger' | 'cargo';

export type CartType = 'simple' | 'double deckers' | 'luxury' | 'cargo' | 'better cargo' | 'best cargo';

export interface Station {
  id: StationId;
  platforms: Platform[]; // default: []
  trainyardInventory: TrainyardInventory;
  activePlatformId: PlatformId | null; // default: null, which platform StationView is focused on
}

export interface Platform {
  id: PlatformId;
  mineshaftIndex: number;
  depth: number; // platform level in the mine
  train: Train | null; // default: null
}

/**
 * One engine sitting in the yard. Engines are tracked individually because they
 * carry an upgrade level: when the pool was a count per age, recalling a train
 * had nowhere to put the level and every engine came back at 1.
 */
export interface PooledEngine {
  id: EngineId;
  age: Ages;
  level: number;
}

export interface TrainyardInventory {
  engines: PooledEngine[]; // default: []
  // Carts stay counts on purpose: a cart has no state beyond its type, so two
  // of the same type really are interchangeable.
  carts: Partial<Record<CartType, number>>; // default: {}
}

/** An in-flight round trip. Everything resolves at completion (return). */
export interface Trip {
  kind: 'route' | 'explore';
  targetCellId: WorldCellId;
  departedAt: number; // epoch ms
  durationMs: number; // full round trip
  cargo: Partial<AgeResources>; // deducted from the plot at dispatch, resolved at completion
}

export interface Train {
  id: TrainId;
  engineAge: Ages;
  engineLevel: number; // default: 1, upgrade action deferred
  carts: CartSlot[]; // default: []
  route: Route | null; // standing assignment, survives between trips
  trip: Trip | null; // default: null, null means idle at platform
}

export interface CartSlot {
  type: CartRole;
  cartType: CartType;
  count: number; // default: 1
}

export function createEmptyTrainyardInventory(): TrainyardInventory {
  return {
    engines: [],
    carts: {},
  };
}

let engineSequence = 0;

/** Unique enough to key a list and survive a save; engines are never compared by id. */
export function makeEngineId(age: Ages): EngineId {
  engineSequence += 1;
  return `engine-${age}-${Date.now().toString(36)}-${engineSequence}`;
}

export function createPooledEngine(age: Ages, level = 1): PooledEngine {
  return { id: makeEngineId(age), age, level };
}

/** Pool entries for one age, strongest first, so "assign" offers the best engine. */
export function getPooledEnginesForAge(station: Station, age: Ages): PooledEngine[] {
  return station.trainyardInventory.engines.filter((engine) => engine.age === age).sort((a, b) => b.level - a.level);
}

export function createEmptyStation(id: StationId): Station {
  return {
    id,
    platforms: [],
    trainyardInventory: createEmptyTrainyardInventory(),
    activePlatformId: null,
  };
}

export function createPlatform(id: PlatformId, mineshaftIndex: number, depth: number): Platform {
  return {
    id,
    mineshaftIndex,
    depth,
    train: null,
  };
}

export function createTrain(id: TrainId, engineAge: Ages, engineLevel = 1): Train {
  return {
    id,
    engineAge,
    engineLevel,
    carts: [],
    route: null,
    trip: null,
  };
}

export function isTraveling(train: Train): boolean {
  return train.trip !== null;
}

export function getTotalCartCount(train: Train): number {
  return train.carts.reduce((sum, slot) => sum + slot.count, 0);
}

export function getCartCapacity(train: Train, role: CartRole): number {
  return train.carts.filter((slot) => CART_STATS[slot.cartType].role === role).reduce((sum, slot) => sum + CART_STATS[slot.cartType].capacity * slot.count, 0);
}

export function getTripRemainingMs(trip: Trip, now: number): number {
  return Math.max(0, trip.departedAt + trip.durationMs - now);
}

export function cloneTrain(train: Train): Train {
  return {
    ...train,
    carts: train.carts.map((slot) => ({ ...slot })),
    route: train.route ? { ...train.route } : null,
    trip: train.trip ? { ...train.trip, cargo: { ...train.trip.cargo } } : null,
  };
}

export function cloneStation(station: Station): Station {
  return {
    id: station.id,
    activePlatformId: station.activePlatformId,
    platforms: station.platforms.map((platform) => ({
      ...platform,
      train: platform.train ? cloneTrain(platform.train) : null,
    })),
    trainyardInventory: {
      engines: station.trainyardInventory.engines.map((engine) => ({ ...engine })),
      carts: { ...station.trainyardInventory.carts },
    },
  };
}

export function hasPlatformAtDepth(station: Station, mineshaftIndex: number, depth: number): boolean {
  return station.platforms.some((platform) => platform.mineshaftIndex === mineshaftIndex && platform.depth === depth);
}

export function getPlatformsForMineshaft(station: Station, mineshaftIndex: number): Platform[] {
  return station.platforms.filter((platform) => platform.mineshaftIndex === mineshaftIndex).sort((a, b) => a.depth - b.depth);
}

export function getPlatformDisplayIndex(station: Station, platform: Platform): number {
  const ordered = getPlatformsForMineshaft(station, platform.mineshaftIndex);

  return ordered.findIndex((candidate) => candidate.id === platform.id);
}

export function getPlatformDisplayName(station: Station, platform: Platform): string {
  const index = getPlatformDisplayIndex(station, platform);
  return index === 0 ? 'Main Platform' : `Platform ${index}`;
}
