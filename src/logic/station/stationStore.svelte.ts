// src/logic/station/stationStore.svelte.ts

import type { Ages } from '../mine/mineTypes';
import type { Route } from '../world/worldTypes';

import type { CartSlot, CartType, Platform, PlatformId, Station, StationId, TrainId, TrainState, TrainyardInventory } from './stationTypes';

import {
  createEmptyStation,
  createEmptyTrainyardInventory,
  createPlatform,
  createTrain,
  getPlatformDisplayIndex,
  getPlatformDisplayName,
  getPlatformsForNorthExpansion,
  hasPlatformAtDepth,
} from './stationTypes';

function createStationId(plotId = 'plot-0'): StationId {
  return `station-${plotId}`;
}

function createPlatformId(northExpansionIndex: number, depth: number): PlatformId {
  return `platform-n${northExpansionIndex}-d${depth}`;
}

function createTrainId(platformId: PlatformId): TrainId {
  return `train-${platformId}`;
}

export function createStationStore(initial?: Partial<Station>) {
  const state = $state<Station>(
    initial
      ? {
          ...createEmptyStation(initial.id ?? createStationId()),
          ...initial,
          platforms: initial.platforms ?? [],
          trainyardInventory: initial.trainyardInventory ?? createEmptyTrainyardInventory(),
        }
      : createEmptyStation(createStationId()),
  );

  return {
    get current() {
      return state;
    },

    reset(id: StationId = state.id) {
      Object.assign(state, createEmptyStation(id));
    },

    replace(next: Station) {
      Object.assign(state, next);
    },

    ensureTrainyardInventory(): TrainyardInventory {
      if (!state.trainyardInventory) {
        state.trainyardInventory = createEmptyTrainyardInventory();
      }

      return state.trainyardInventory;
    },

    addPlatform(northExpansionIndex: number, depth: number): boolean {
      if (hasPlatformAtDepth(state, northExpansionIndex, depth)) {
        return false;
      }

      state.platforms.push(createPlatform(createPlatformId(northExpansionIndex, depth), northExpansionIndex, depth));

      state.platforms.sort((a, b) => {
        if (a.northExpansionIndex !== b.northExpansionIndex) {
          return a.northExpansionIndex - b.northExpansionIndex;
        }

        return a.depth - b.depth;
      });

      return true;
    },

    removePlatform(platformId: PlatformId): boolean {
      const index = state.platforms.findIndex((platform) => platform.id === platformId);
      if (index === -1) {
        return false;
      }

      state.platforms.splice(index, 1);
      return true;
    },

    getPlatform(platformId: PlatformId): Platform | null {
      return state.platforms.find((platform) => platform.id === platformId) ?? null;
    },

    getPlatformsForNorthExpansion(northExpansionIndex: number): Platform[] {
      return getPlatformsForNorthExpansion(state, northExpansionIndex);
    },

    getPlatformDisplayIndex(platform: Platform): number {
      return getPlatformDisplayIndex(state, platform);
    },

    getPlatformDisplayName(platform: Platform): string {
      return getPlatformDisplayName(state, platform);
    },

    addEngine(age: Ages, amount = 1) {
      const inventory = this.ensureTrainyardInventory();
      inventory.engines[age] = (inventory.engines[age] ?? 0) + amount;
    },

    removeEngine(age: Ages, amount = 1): boolean {
      const inventory = this.ensureTrainyardInventory();
      const current = inventory.engines[age] ?? 0;

      if (current < amount) {
        return false;
      }

      inventory.engines[age] = current - amount;

      if (inventory.engines[age] === 0) {
        delete inventory.engines[age];
      }

      return true;
    },

    addCarts(cartType: CartType, amount = 1) {
      const inventory = this.ensureTrainyardInventory();
      inventory.carts[cartType] = (inventory.carts[cartType] ?? 0) + amount;
    },

    removeCarts(cartType: CartType, amount = 1): boolean {
      const inventory = this.ensureTrainyardInventory();
      const current = inventory.carts[cartType] ?? 0;

      if (current < amount) {
        return false;
      }

      inventory.carts[cartType] = current - amount;

      if (inventory.carts[cartType] === 0) {
        delete inventory.carts[cartType];
      }

      return true;
    },

    assignTrainToPlatform(platformId: PlatformId, engineAge: Ages): boolean {
      const platform = this.getPlatform(platformId);
      if (!platform) {
        return false;
      }
      if (platform.train) {
        return false;
      }

      platform.train = createTrain(createTrainId(platformId), engineAge);
      return true;
    },

    removeTrainFromPlatform(platformId: PlatformId): boolean {
      const platform = this.getPlatform(platformId);
      if (!platform) {
        return false;
      }
      if (!platform.train) {
        return false;
      }

      platform.train = null;
      return true;
    },

    setTrainState(platformId: PlatformId, trainState: TrainState): boolean {
      const platform = this.getPlatform(platformId);
      if (!platform?.train) {
        return false;
      }

      platform.train.state = trainState;
      return true;
    },

    setTrainRoute(platformId: PlatformId, route: Route | null): boolean {
      const platform = this.getPlatform(platformId);
      if (!platform?.train) {
        return false;
      }

      platform.train.route = route;
      return true;
    },

    setTrainTiming(platformId: PlatformId, remainingTime: number, totalTripTime: number): boolean {
      const platform = this.getPlatform(platformId);
      if (!platform?.train) {
        return false;
      }

      platform.train.remainingTime = Math.max(0, remainingTime);
      platform.train.totalTripTime = Math.max(0, totalTripTime);
      return true;
    },

    setTrainEngineLevel(platformId: PlatformId, engineLevel: number): boolean {
      const platform = this.getPlatform(platformId);
      if (!platform?.train) {
        return false;
      }

      platform.train.engineLevel = Math.max(1, engineLevel);
      return true;
    },

    addCartToTrain(platformId: PlatformId, cart: CartSlot): boolean {
      const platform = this.getPlatform(platformId);
      if (!platform?.train) {
        return false;
      }

      platform.train.carts.push({
        ...cart,
        count: Math.max(1, cart.count),
      });

      return true;
    },

    updateTrainCart(platformId: PlatformId, cartIndex: number, updates: Partial<CartSlot>): boolean {
      const platform = this.getPlatform(platformId);
      if (!platform?.train) {
        return false;
      }
      if (cartIndex < 0 || cartIndex >= platform.train.carts.length) {
        return false;
      }

      const cart = platform.train.carts[cartIndex];
      Object.assign(cart, updates);

      if (cart.count < 1) {
        cart.count = 1;
      }

      return true;
    },

    removeTrainCart(platformId: PlatformId, cartIndex: number): boolean {
      const platform = this.getPlatform(platformId);
      if (!platform?.train) {
        return false;
      }
      if (cartIndex < 0 || cartIndex >= platform.train.carts.length) {
        return false;
      }

      platform.train.carts.splice(cartIndex, 1);
      return true;
    },
  };
}

export const stationStore = createStationStore();
