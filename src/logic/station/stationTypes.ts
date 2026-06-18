// src/logic/station/stationTypes.ts

import type { Ages } from '../mine/mineTypes';
import type { Route } from '../world/worldTypes';

export type StationId = string;
export type PlatformId = string;
export type TrainId = string;

export type TrainState = 'idle' | 'traveling' | 'arrived';

export type CartRole = 'passenger' | 'cargo';

export type CartType = 'simple' | 'double deckers' | 'luxury' | 'cargo' | 'better cargo' | 'best cargo';

export interface Station {
  id: StationId;
  platforms: Platform[]; // default: []
  trainyardInventory: TrainyardInventory;
  activePlatformId: PlatformId | null; // default: null — which platform StationView is focused on
}

export interface Platform {
  id: PlatformId;
  northExpansionIndex: number;
  depth: number; // platform level in the mine
  train: Train | null; // default: null
}

export interface TrainyardInventory {
  engines: Partial<Record<Ages, number>>; // default: {}
  carts: Partial<Record<CartType, number>>; // default: {}
}

export interface Train {
  id: TrainId;
  engineAge: Ages;
  engineLevel: number; // default: 1
  carts: CartSlot[]; // default: []
  state: TrainState; // default: 'idle'
  route: Route | null; // default: null
  remainingTime: number; // default: 0
  totalTripTime: number; // default: 0
}

export interface CartSlot {
  type: CartRole;
  cartType: CartType;
  count: number; // default: 1
}

export function createEmptyTrainyardInventory(): TrainyardInventory {
  return {
    engines: {},
    carts: {},
  };
}

export function createEmptyStation(id: StationId): Station {
  return {
    id,
    platforms: [],
    trainyardInventory: createEmptyTrainyardInventory(),
    activePlatformId: null,
  };
}

export function createPlatform(id: PlatformId, northExpansionIndex: number, depth: number): Platform {
  return {
    id,
    northExpansionIndex,
    depth,
    train: null,
  };
}

export function createTrain(id: TrainId, engineAge: Ages): Train {
  return {
    id,
    engineAge,
    engineLevel: 1,
    carts: [],
    state: 'idle',
    route: null,
    remainingTime: 0,
    totalTripTime: 0,
  };
}

export function hasPlatformAtDepth(station: Station, northExpansionIndex: number, depth: number): boolean {
  return station.platforms.some((platform) => platform.northExpansionIndex === northExpansionIndex && platform.depth === depth);
}

export function getPlatformsForNorthExpansion(station: Station, northExpansionIndex: number): Platform[] {
  return station.platforms.filter((platform) => platform.northExpansionIndex === northExpansionIndex).sort((a, b) => a.depth - b.depth);
}

export function getPlatformDisplayIndex(station: Station, platform: Platform): number {
  const ordered = getPlatformsForNorthExpansion(station, platform.northExpansionIndex);

  return ordered.findIndex((candidate) => candidate.id === platform.id);
}

export function getPlatformDisplayName(station: Station, platform: Platform): string {
  const index = getPlatformDisplayIndex(station, platform);
  return index === 0 ? 'Main Platform' : `Platform ${index}`;
}
