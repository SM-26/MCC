// src/logic/station/stationActions.ts
//
// Pure functions for building stations & platforms. Mirrors the mineActions.ts
// convention: actions take state in as arguments, mutate it in place, and return
// a result object. Money changes are returned as `nextMoney` for the caller to
// commit (matching buyMiner / handleNextShaftAction), keeping the action layer
// free of store imports.

import { getClearStatus } from '../mine/mineGen';
import type { AgeResources, Ages, PlotState } from '../mine/mineTypes';
import { getHexDistance } from '../world/hex';
import { getCellById, parseWorldCellId } from '../world/worldTypes';
import type { Destination, WorldCellId, WorldState } from '../world/worldTypes';
import { CART_STATS, ENGINE_STATS, getPlatformCost, getTripDuration, isAgeAtLeast, planCargoLoad } from './stationBalance';
import { createEmptyStation, createPlatform, createTrain, getCartCapacity, getTotalCartCount, hasPlatformAtDepth, isTraveling } from './stationTypes';
import type { CartType, PlatformId, Platform, Station, Train } from './stationTypes';

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

/** Take an engine from the pool and create this platform's train. */
export function placeEngine(station: Station, platform: Platform, age: Ages): ActionResult {
  if (platform.train) {
    return { ok: false, message: 'Platform already has a train' };
  }
  if ((station.trainyardInventory.engines[age] ?? 0) <= 0) {
    return { ok: false, message: 'No such engine in the yard' };
  }

  station.trainyardInventory.engines[age] = (station.trainyardInventory.engines[age] ?? 0) - 1;
  platform.train = createTrain(`train-${platform.id}`, age);

  return { ok: true };
}

/** Disassemble the platform's train; engine and carts return to the pool. */
export function removeTrain(station: Station, platform: Platform): ActionResult {
  const train = platform.train;
  if (!train) {
    return { ok: false, message: 'No train on this platform' };
  }
  if (isTraveling(train)) {
    return { ok: false, message: 'Train is traveling' };
  }

  station.trainyardInventory.engines[train.engineAge] = (station.trainyardInventory.engines[train.engineAge] ?? 0) + 1;
  for (const slot of train.carts) {
    station.trainyardInventory.carts[slot.cartType] = (station.trainyardInventory.carts[slot.cartType] ?? 0) + slot.count;
  }
  platform.train = null;

  return { ok: true };
}

/** Attach one cart from the pool, merging into an existing slot of the same type. */
export function addCart(station: Station, train: Train, cartType: CartType): ActionResult {
  if (isTraveling(train)) {
    return { ok: false, message: 'Train is traveling' };
  }
  if ((station.trainyardInventory.carts[cartType] ?? 0) <= 0) {
    return { ok: false, message: 'No such cart in the yard' };
  }
  if (getTotalCartCount(train) >= ENGINE_STATS[train.engineAge].maxCarts) {
    return { ok: false, message: 'Engine is at max carts' };
  }

  station.trainyardInventory.carts[cartType] = (station.trainyardInventory.carts[cartType] ?? 0) - 1;
  const slot = train.carts.find((candidate) => candidate.cartType === cartType);
  if (slot) {
    slot.count += 1;
  } else {
    train.carts.push({ type: CART_STATS[cartType].role, cartType, count: 1 });
  }

  return { ok: true };
}

/** Detach one cart back to the pool. */
export function removeCart(station: Station, train: Train, cartType: CartType): ActionResult {
  if (isTraveling(train)) {
    return { ok: false, message: 'Train is traveling' };
  }
  const index = train.carts.findIndex((candidate) => candidate.cartType === cartType);
  if (index === -1) {
    return { ok: false, message: 'No such cart on this train' };
  }

  const slot = train.carts[index];
  slot.count -= 1;
  if (slot.count <= 0) {
    train.carts.splice(index, 1);
  }
  station.trainyardInventory.carts[cartType] = (station.trainyardInventory.carts[cartType] ?? 0) + 1;

  return { ok: true };
}

/** Assign a standing route. The destination must already be discovered. */
export function assignRoute(train: Train, destination: Destination): ActionResult {
  if (isTraveling(train)) {
    return { ok: false, message: 'Train is traveling' };
  }
  if (!destination.discovered) {
    return { ok: false, message: 'Destination not discovered yet' };
  }

  train.route = { destinationId: destination.id, destinationType: destination.type };

  return { ok: true };
}

function getCellDistance(fromCellId: WorldCellId, toCellId: WorldCellId): number | null {
  const from = parseWorldCellId(fromCellId);
  const to = parseWorldCellId(toCellId);
  if (!from || !to) {
    return null;
  }
  return getHexDistance(from, to);
}

/** Manually dispatch the train on its standing route. Cargo is deducted now. */
export function dispatch(train: Train, plot: PlotState, world: WorldState, plotCellId: WorldCellId, now: number): ActionResult {
  if (isTraveling(train)) {
    return { ok: false, message: 'Train is traveling' };
  }
  if (!train.route) {
    return { ok: false, message: 'Assign a route first' };
  }

  // Destination ids ARE cell ids (see getDestinationFromCell).
  const targetCellId = train.route.destinationId;
  const cell = getCellById(world, targetCellId);
  if (!cell || !cell.discovered) {
    return { ok: false, message: 'Destination not reachable' };
  }

  const distance = getCellDistance(plotCellId, targetCellId);
  if (distance === null || distance === 0) {
    return { ok: false, message: 'Invalid destination' };
  }

  const wantsCargo = train.route.destinationType === 'factory' || train.route.destinationType === 'plot';
  const cargo = wantsCargo ? planCargoLoad(getCartCapacity(train, 'cargo'), plot.ageResources) : {};
  for (const [resource, amount] of Object.entries(cargo) as [keyof AgeResources, number][]) {
    plot.ageResources[resource] -= amount;
  }

  train.trip = {
    kind: 'route',
    targetCellId,
    departedAt: now,
    durationMs: getTripDuration(distance, train.engineAge, train.engineLevel),
    cargo,
  };

  return { ok: true };
}

/** One-off trip to reveal a fog cell. The standing route is untouched. */
export function dispatchExplore(train: Train, world: WorldState, targetCellId: WorldCellId, plotCellId: WorldCellId, now: number): ActionResult {
  if (isTraveling(train)) {
    return { ok: false, message: 'Train is traveling' };
  }

  const cell = getCellById(world, targetCellId);
  if (!cell) {
    return { ok: false, message: 'No such cell' };
  }
  if (cell.discovered) {
    return { ok: false, message: 'Cell already discovered' };
  }

  const distance = getCellDistance(plotCellId, targetCellId);
  if (distance === null || distance === 0) {
    return { ok: false, message: 'Invalid target' };
  }

  train.trip = {
    kind: 'explore',
    targetCellId,
    departedAt: now,
    durationMs: getTripDuration(distance, train.engineAge, train.engineLevel),
    cargo: {},
  };

  return { ok: true };
}
