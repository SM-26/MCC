// src/logic/world/worldNames.ts

/**
 * Name pools and naming behavior for world generation.
 *
 * Design doc rules:
 * - Plot names: real cities, unique within run
 * - City names: fictional places, unique within run
 * - Factory names: punny/industrial, keyed by ResourceType, can repeat
 * - Name depletion: fallback to blocker, signal reset
 */

import { log } from '../../lib/logger';
import type { ResourceType } from './worldTypes';

// ============================================================================
// Name Pools
// ============================================================================

/**
 * Plot name pool: real cities.
 *
 * Must be unique within a run. Prague is reserved for ring 0 start.
 */
export const PLOT_NAMES: string[] = [
  'Prague',
  'Brno',
  'Berlin',
  'Munich',
  'Amsterdam',
  'Eindhoven',
  'Antwerp',
  'Tel Aviv',
  'London',
  'Tokyo',
  'Sydney',
  'Austin TX',
];

/**
 * City name pool: fictional places.
 *
 * Must be unique within a run.
 */
export const CITY_NAMES: string[] = ['Narnia', 'Atlantis', 'The Shire', 'Omicron Persei 8', 'Vulcanus', 'Fulgora', 'The Citadel'];

/**
 * Factory name pool: punny, relevant, industrial.
 *
 * Keyed by ResourceType (or combined resources like OilAndCoal).
 * Names can repeat across factories.
 */
export const FACTORY_NAMES: Record<string, string[]> = {
  Oil: ['The Crude Awakening Refinery', 'Liquid Gold Ltd'],
  Coal: ['The Soot-able Manufacturing Co.', 'Burn Baby Burn Plant'],
  Copper: ['The Penny Pincher Foundry', 'Caesar Crappy Copper'],
  SuperAlloy: ['The Metal-morphosis Plant', 'Alloy Odyssey Factory'],
  OilAndCoal: ['The Black Gold Junction'],
};

// ============================================================================
// Name State
// ============================================================================

/**
 * State for tracking used names during generation.
 */
export interface NameState {
  usedPlotNames: Set<string>;
  usedCityNames: Set<string>;
  plotNamesDepleted: boolean;
  cityNamesDepleted: boolean;
}

/**
 * Create initial name state.
 */
export function createNameState(): NameState {
  return {
    usedPlotNames: new Set(),
    usedCityNames: new Set(),
    plotNamesDepleted: false,
    cityNamesDepleted: false,
  };
}

/**
 * Mark a plot name as used.
 */
export function usePlotName(state: NameState, name: string): void {
  state.usedPlotNames.add(name);
}

/**
 * Mark a city name as used.
 */
export function useCityName(state: NameState, name: string): void {
  state.usedCityNames.add(name);
}

/**
 * Check if a plot name is available (not used yet).
 */
export function isPlotNameAvailable(state: NameState, name: string): boolean {
  return !state.usedPlotNames.has(name);
}

/**
 * Check if a city name is available (not used yet).
 */
export function isCityNameAvailable(state: NameState, name: string): boolean {
  return !state.usedCityNames.has(name);
}

// ============================================================================
// Name Picking
// ============================================================================

/**
 * Seeded RNG interface for name picking.
 */
export interface SeededRng {
  (): number; // Returns value in [0, 1)
}

/**
 * Pick a unique plot name from the pool.
 *
 * Rules:
 * - Must not be in usedPlotNames
 * - If no names available, set depletion flag and return null
 * - For ring 0 with seed 123456/reset 0, should yield Prague via normal ordering
 *
 * @param state - The name state tracking used names
 * @param rng - Seeded RNG for picking
 * @param reservedNames - Names to exclude (e.g., ['Prague'] for non-ring-0)
 * @returns The picked name, or null if depleted
 */
export function pickUniquePlotName(state: NameState, rng: SeededRng, reservedNames: string[] = []): string | null {
  if (state.plotNamesDepleted) {
    return null;
  }

  // Build available pool
  const available = PLOT_NAMES.filter((name) => !state.usedPlotNames.has(name) && !reservedNames.includes(name));

  if (available.length === 0) {
    state.plotNamesDepleted = true;
    log.info('worldNames', 'Plot name pool exhausted');
    return null;
  }

  // Pick using seeded RNG
  const index = Math.floor(rng() * available.length);
  const name = available[index];

  usePlotName(state, name);
  return name;
}

/**
 * Pick a unique city name from the pool.
 *
 * Rules:
 * - Must not be in usedCityNames
 * - If no names available, set depletion flag and return null
 *
 * @param state - The name state tracking used names
 * @param rng - Seeded RNG for picking
 * @returns The picked name, or null if depleted
 */
export function pickUniqueCityName(state: NameState, rng: SeededRng): string | null {
  if (state.cityNamesDepleted) {
    return null;
  }

  // Build available pool
  const available = CITY_NAMES.filter((name) => !state.usedCityNames.has(name));

  if (available.length === 0) {
    state.cityNamesDepleted = true;
    log.info('worldName', `City name pool exhausted`);
    return null;
  }

  // Pick using seeded RNG
  const index = Math.floor(rng() * available.length);
  const name = available[index];

  useCityName(state, name);
  return name;
}

/**
 * Pick a factory name for a given resource type(s).
 *
 * Rules:
 * - Names can repeat (no uniqueness constraint)
 * - Keyed by ResourceType or combined like 'OilAndCoal'
 * - Falls back to generic name if pool not found
 *
 * @param resourceType - The resource type(s) the factory accepts
 * @param rng - Seeded RNG for picking
 * @returns The picked name
 */
export function pickFactoryName(resourceType: ResourceType | string, rng: SeededRng): string {
  // Try exact key first
  let pool = FACTORY_NAMES[resourceType];

  // If not found, try single-resource fallback
  if (!pool) {
    const singleResource = resourceType as ResourceType;
    if (singleResource in FACTORY_NAMES) {
      pool = FACTORY_NAMES[singleResource];
    }
  }

  // Generic fallback if still not found
  if (!pool || pool.length === 0) {
    return 'The Industrial Complex';
  }

  // Pick using seeded RNG
  const index = Math.floor(rng() * pool.length);
  return pool[index];
}

/**
 * Pick a factory name for multiple resource types.
 *
 * @param resourceTypes - Array of resource types the factory accepts
 * @param rng - Seeded RNG for picking
 * @returns The picked name
 */
export function pickFactoryNameForResources(resourceTypes: ResourceType[], rng: SeededRng): string {
  if (resourceTypes.length === 0) {
    return pickFactoryName('Coal', rng); // Default fallback
  }

  if (resourceTypes.length === 1) {
    return pickFactoryName(resourceTypes[0], rng);
  }

  // Try combined key (e.g., 'OilAndCoal')
  const combinedKey = resourceTypes.join('And');
  const pool = FACTORY_NAMES[combinedKey];

  // If not found, pick from first resource
  if (!pool || pool.length === 0) {
    return pickFactoryName(resourceTypes[0], rng);
  }

  const index = Math.floor(rng() * pool.length);
  return pool[index];
}

// ============================================================================
// Depletion Behavior
// ============================================================================

/**
 * Check if name pools are depleted (both plot and city).
 *
 * When both are depleted, UI should force a no-ignore reset path.
 *
 * @param state - The name state
 * @returns True if both pools are exhausted
 */
export function areBothPoolsDepleted(state: NameState): boolean {
  return state.plotNamesDepleted && state.cityNamesDepleted;
}

/**
 * Check if at least one pool still has names available.
 *
 * @param state - The name state
 * @returns True if player can ignore reset and keep playing
 */
export function canIgnoreReset(state: NameState): boolean {
  return !state.plotNamesDepleted || !state.cityNamesDepleted;
}

// ============================================================================
// Prague Special Case (Ring 0)
// ============================================================================

/**
 * Check if this is the ring 0 starting plot.
 *
 * For ring 0, Prague should be picked via normal list ordering when
 * worldSeed is '123456' and resetCount is 0.
 *
 * This is handled by the seeded RNG, not a special-case branch.
 *
 * @param ring - The ring number
 * @returns True if this is ring 0
 */
export function isRing0(ring: number): boolean {
  return ring === 0;
}

/**
 * Get reserved names for a given ring.
 *
 * Ring 0 reserves Prague (it will be picked via seeded RNG ordering).
 *
 * @param ring - The ring number
 * @returns Array of reserved names
 */
export function getReservedNames(ring: number): string[] {
  if (isRing0(ring)) {
    return []; // Prague is picked normally, not reserved
  }
  return ['Prague']; // Ring 0+1+ should not use Prague again
}
