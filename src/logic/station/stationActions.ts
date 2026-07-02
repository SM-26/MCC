// src/logic/station/stationActions.ts
//
// Pure functions for building stations & platforms. Mirrors the mineActions.ts
// convention: actions take state in as arguments, mutate it in place, and return
// a result object. Money changes are returned as `nextMoney` for the caller to
// commit (matching buyMiner / handleNextShaftAction), keeping the action layer
// free of store imports.

import { getClearStatus } from '../mine/mineGen';
import type { AgeResources, Ages, PlotState } from '../mine/mineTypes';
import { CART_STATS, ENGINE_STATS, getPlatformCost, isAgeAtLeast } from './stationBalance';
import { createEmptyStation, createPlatform, hasPlatformAtDepth } from './stationTypes';
import type { CartType, PlatformId, Station } from './stationTypes';

// Costs are money-only for now and intentionally easy to balance. Age-resource
// requirements can be layered into the signatures later without breaking callers.
export const STATION_COST = 200;

// Platforms sit 5 depths apart. The foundation is depth 0 (expansion 0 only);
// every other platform goes at depths 6, 11, 16, ... (depth % 5 === 1, depth > 5).
export const PLATFORM_DEPTH_GAP = 5;

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export interface BuildResult extends ActionResult {
  nextMoney?: number;
}

export interface EligiblePosition {
  northExpansionIndex: number;
  depth: number;
}

/** True for the foundation depth (0) and every 5th depth after 5 (6, 11, 16, ...). */
export function isPlatformDepth(depth: number): boolean {
  return depth === 0 || (depth > PLATFORM_DEPTH_GAP && depth % PLATFORM_DEPTH_GAP === 1);
}

function getMissingResources(required: Partial<AgeResources>, available: AgeResources): (keyof AgeResources)[] {
  return (Object.entries(required) as [keyof AgeResources, number][]).filter(([resource, amount]) => available[resource] < amount).map(([resource]) => resource);
}

function platformIdFor(northExpansionIndex: number, depth: number): PlatformId {
  return `platform-n${northExpansionIndex}-d${depth}`;
}

/** Stable station id derived from the plot id, matching the singleton's scheme. */
function stationIdFor(plotId: string): string {
  return `station-${plotId}`;
}

/**
 * Can the player build the station on this plot?
 * Requires: no station yet, depth 0 of expansion 0 hard-cleared, enough money.
 */
export function canBuildStation(plot: PlotState, money: number): ActionResult {
  if (plot.station) {
    return { ok: false, message: 'Station already built' };
  }

  const foundation = plot.mineshafts[0]?.mineDepths.find((d) => d.depth === 0) ?? null;
  if (!foundation) {
    return { ok: false, message: 'No mine to build on' };
  }

  if (getClearStatus(foundation) !== 'hard') {
    return { ok: false, message: 'Clear the surface level first' };
  }

  if (money < STATION_COST) {
    return { ok: false, message: 'Not enough money for a station!' };
  }

  return { ok: true };
}

/**
 * Build the station on the plot, including the foundation platform at (0, 0).
 * Mutates `plot.station` in place. Returns `nextMoney` for the caller to commit.
 */
export function buildStation(plot: PlotState, money: number, cellId: string): BuildResult {
  const check = canBuildStation(plot, money);
  if (!check.ok) {
    return check;
  }

  const station = createEmptyStation(stationIdFor(cellId));
  const foundation = createPlatform(platformIdFor(0, 0), 0, 0);
  station.platforms.push(foundation);
  station.activePlatformId = foundation.id;
  plot.station = station;

  return { ok: true, nextMoney: money - STATION_COST };
}

/**
 * Positions where a new platform could be built right now: the depth is on the
 * platform-depth grid, that level is hard-cleared, and no platform exists there.
 */
export function getEligiblePlatformPositions(plot: PlotState): EligiblePosition[] {
  const station = plot.station;
  if (!station) {
    return [];
  }

  const positions: EligiblePosition[] = [];

  plot.mineshafts.forEach((expansion, expansionIndex) => {
    expansion.mineDepths.forEach((depthState) => {
      if (!isPlatformDepth(depthState.depth)) {
        return;
      }
      if (getClearStatus(depthState) !== 'hard') {
        return;
      }
      if (hasPlatformAtDepth(station, expansionIndex, depthState.depth)) {
        return;
      }
      positions.push({ northExpansionIndex: expansionIndex, depth: depthState.depth });
    });
  });

  // Stable order: by expansion, then by depth (shallow first).
  positions.sort((a, b) => (a.northExpansionIndex !== b.northExpansionIndex ? a.northExpansionIndex - b.northExpansionIndex : a.depth - b.depth));

  return positions;
}

/** Can the player build a platform at this position right now? */
export function canBuildPlatform(station: Station, plot: PlotState, northExpansionIndex: number, depth: number, money: number): ActionResult {
  if (!station) {
    return { ok: false, message: 'Build a station first' };
  }

  if (!isPlatformDepth(depth)) {
    return { ok: false, message: 'Invalid platform depth' };
  }

  if (hasPlatformAtDepth(station, northExpansionIndex, depth)) {
    return { ok: false, message: 'Platform already exists here' };
  }

  const depthState = plot.mineshafts[northExpansionIndex]?.mineDepths.find((d) => d.depth === depth) ?? null;
  if (!depthState) {
    return { ok: false, message: 'That depth has not been dug yet' };
  }

  if (getClearStatus(depthState) !== 'hard') {
    return { ok: false, message: 'Clear the level first' };
  }

  const cost = getPlatformCost(depth, plot.currentAge);
  if (money < cost.money) {
    return { ok: false, message: 'Not enough money for a platform!' };
  }
  if (getMissingResources(cost.resources, plot.ageResources).length > 0) {
    return { ok: false, message: 'Not enough resources for a platform!' };
  }

  return { ok: true };
}

/**
 * Build a platform at (northExpansionIndex, depth). Mutates `station.platforms`
 * in place (sorted by expansion then depth) and focuses it. Returns `nextMoney`.
 */
export function buildPlatform(station: Station, plot: PlotState, northExpansionIndex: number, depth: number, money: number): BuildResult {
  const check = canBuildPlatform(station, plot, northExpansionIndex, depth, money);
  if (!check.ok) {
    return check;
  }

  const platform = createPlatform(platformIdFor(northExpansionIndex, depth), northExpansionIndex, depth);
  station.platforms.push(platform);

  station.platforms.sort((a, b) => {
    if (a.northExpansionIndex !== b.northExpansionIndex) {
      return a.northExpansionIndex - b.northExpansionIndex;
    }
    return a.depth - b.depth;
  });

  station.activePlatformId = platform.id;

  const cost = getPlatformCost(depth, plot.currentAge);
  for (const [resource, amount] of Object.entries(cost.resources) as [keyof AgeResources, number][]) {
    plot.ageResources[resource] -= amount;
  }
  return { ok: true, nextMoney: money - cost.money };
}

/** Buy an engine into the train yard pool. Gated by the plot's current age. */
export function buyEngine(station: Station, plot: PlotState, age: Ages, money: number): BuildResult {
  if (!isAgeAtLeast(plot.currentAge, age)) {
    return { ok: false, message: `Requires the ${age} age` };
  }

  const cost = ENGINE_STATS[age].cost;
  if (money < cost.money) {
    return { ok: false, message: 'Not enough money for an engine!' };
  }
  if (getMissingResources(cost.resources, plot.ageResources).length > 0) {
    return { ok: false, message: 'Not enough resources for an engine!' };
  }

  for (const [resource, amount] of Object.entries(cost.resources) as [keyof AgeResources, number][]) {
    plot.ageResources[resource] -= amount;
  }
  station.trainyardInventory.engines[age] = (station.trainyardInventory.engines[age] ?? 0) + 1;

  return { ok: true, nextMoney: money - cost.money };
}

/** Buy a cart into the train yard pool. */
export function buyCart(station: Station, cartType: CartType, money: number): BuildResult {
  const cost = CART_STATS[cartType].cost;
  if (money < cost.money) {
    return { ok: false, message: 'Not enough money for a cart!' };
  }

  station.trainyardInventory.carts[cartType] = (station.trainyardInventory.carts[cartType] ?? 0) + 1;

  return { ok: true, nextMoney: money - cost.money };
}
