// src/logic/world/worldPathing.ts

/**
 * Route-finding and traversal cost for world pathing.
 *
 * Design doc rules:
 * - Trains may pass through empty, plot, city, factory
 * - Trains may not pass through fog or blocker
 * - Passing through occupied/meaningful tiles applies penalty (speed reduction)
 * - Route-finding minimizes total travel time
 * - getTileTraversalCost(tile) supports positive (bonus) and negative (penalty) values
 * - Future railNetwork tile upgrade should apply bonus, not penalty
 *
 * Separation of concerns:
 * - hexDistance(a, b) for pure axial range math (in hex.ts)
 * - getTileTraversalCost(tile) for per-tile movement modifier
 * - getTrainWeight(train) for cart/load-derived cost input (exists in station logic)
 * - findRoute(start, end, world, train) for shortest legal path on revealed map
 * - getRouteTravelTime(route, train) for final time calculation
 */

import type { HexCoord } from './hex';
import { getHexDistance, getHexNeighbors } from './hex';
import type { WorldCell, WorldCellType, WorldState } from './worldTypes';

// ============================================================================
// Traversal Cost
// ============================================================================

/**
 * Get the traversal cost for a tile kind.
 *
 * Returns negative values for penalties (slowdown), positive for bonuses.
 *
 * Rules:
 * - fog: impassable (return Infinity)
 * - blocker: impassable (return Infinity)
 * - empty: no penalty (return 0)
 * - plot: penalty (return -1)
 * - city: penalty (return -1)
 * - factory: penalty (return -1)
 *
 * @param tileKind - The type of tile
 * @returns Traversal cost (Infinity = impassable, 0 = no cost, negative = penalty)
 */
export function getTileTraversalCost(tileKind: WorldCellType): number {
  switch (tileKind) {
    case 'blocker':
      return Infinity; // Impassable
    case 'empty':
      return 0; // No penalty
    case 'plot':
      return -1; // Penalty
    case 'city':
      return -1; // Penalty
    case 'factory':
      return -1; // Penalty
  }
}

/**
 * Get the traversal cost for a specific tile.
 *
 * @param tile - The world cell
 * @returns Traversal cost for this tile
 */
export function getTileCost(tile: WorldCell): number {
  return getTileTraversalCost(tile.type);
}

/**
 * Check if a tile is passable.
 *
 * @param tileKind - The type of tile
 * @returns True if the tile can be traversed
 */
export function isTilePassable(tileKind: WorldCellType): boolean {
  return getTileTraversalCost(tileKind) !== Infinity;
}

/**
 * Check if a tile is passable.
 *
 * @param tile - The world cell
 * @returns True if the tile can be traversed
 */
export function isTilePassableByCell(tile: WorldCell): boolean {
  return isTilePassable(tile.type);
}

// ============================================================================
// Route Finding
// ============================================================================

/**
 * A path step in the route.
 */
export interface PathStep {
  coord: HexCoord;
  cost: number; // Cumulative cost up to this step
}

/**
 * A route from start to end.
 */
export interface Route {
  start: HexCoord;
  end: HexCoord;
  path: HexCoord[]; // Array of coordinates from start to end (inclusive)
  totalCost: number; // Total traversal cost
  distance: number; // Axial hex distance
}

/**
 * Find the shortest legal path on the revealed map using BFS.
 *
 * Uses BFS with cost accumulation for weighted edges.
 *
 * @param start - Starting coordinate
 * @param end - Target coordinate
 * @param world - The world state
 * @param allowFog - Whether fog tiles are valid (for exploration routes)
 * @returns The route, or null if no path exists
 */
export function findRoute(start: HexCoord, end: HexCoord, world: WorldState, allowFog: boolean = false): Route | null {
  // Check if start equals end
  if (start.q === end.q && start.r === end.r) {
    return {
      start,
      end,
      path: [start],
      totalCost: 0,
      distance: 0,
    };
  }

  // Get cell at start position
  const startCell = getCellAt(world, start);
  if (!startCell) {
    return null; // Start position doesn't exist
  }

  // Validate start is passable (or fog if allowFog)
  if (!allowFog && !isTilePassable(startCell.type)) {
    return null;
  }
  if (allowFog && startCell.type === 'blocker') {
    return null;
  }

  // BFS with Dijkstra-like cost accumulation
  const queue: HexCoord[] = [start];
  const visited = new Set<string>();
  const costMap = new Map<string, number>();
  const parentMap = new Map<string, HexCoord>();

  visited.add(hexCoordToKey(start));
  costMap.set(hexCoordToKey(start), 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = hexCoordToKey(current);
    const currentCost = costMap.get(currentKey) ?? 0;

    // Check if we reached the end
    if (current.q === end.q && current.r === end.r) {
      const path = buildPath(parentMap, start, end);
      return {
        start,
        end,
        path,
        totalCost: currentCost,
        distance: getHexDistance(start, end),
      };
    }

    // Explore neighbors
    const neighbors = getHexNeighbors(current);
    for (const neighbor of neighbors) {
      const neighborKey = hexCoordToKey(neighbor);

      if (visited.has(neighborKey)) {
        continue;
      }

      const neighborCell = getCellAt(world, neighbor);
      if (!neighborCell) {
        continue; // Neighbor doesn't exist in world
      }

      // Block undiscovered tiles unless exploring
      if (!allowFog && !neighborCell.discovered) {
        continue;
      }

      // Check passability
      const traversalCost = getTileTraversalCost(neighborCell.type);
      if (traversalCost === Infinity) {
        continue; // Impassable
      }

      // Accumulate cost
      const newCost = currentCost + Math.abs(traversalCost);
      visited.add(neighborKey);
      costMap.set(neighborKey, newCost);
      parentMap.set(neighborKey, current);
      queue.push(neighbor);
    }
  }

  return null; // No path found
}

/**
 * Build the path from parent map.
 */
function buildPath(parentMap: Map<string, HexCoord>, start: HexCoord, end: HexCoord): HexCoord[] {
  const path: HexCoord[] = [];
  let current: HexCoord | null = end;

  while (current) {
    path.unshift(current);
    const key = hexCoordToKey(current);
    current = parentMap.get(key) ?? null;
  }

  return path;
}

/**
 * Get cell at a coordinate in the world.
 */
function getCellAt(world: WorldState, coord: HexCoord): WorldCell | null {
  return world.cells.find((cell) => cell.q === coord.q && cell.r === coord.r) ?? null;
}

/**
 * Convert hex coordinate to map key.
 */
function hexCoordToKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

// ============================================================================
// Travel Time Calculation
// ============================================================================

/**
 * Train data interface (matches stationTypes.ts Train).
 */
export interface TrainData {
  engineAge: string;
  engineLevel: number;
  carts: CartSlot[];
}

/**
 * Cart slot interface (matches stationTypes.ts CartSlot).
 */
export interface CartSlot {
  type: 'passenger' | 'cargo';
  cartType: string;
  count: number;
}

/**
 * Get the weight of a train based on carts and loads.
 *
 * Note: getTrainWeight(train) already exists elsewhere in the codebase.
 * This is a placeholder that matches the expected signature.
 *
 * @param train - The train data
 * @returns The train weight
 */
export function getTrainWeight(train: TrainData): number {
  // Placeholder: actual implementation should reuse existing getTrainWeight
  // For now, estimate based on cart count
  let totalCarts = 0;
  for (const cart of train.carts) {
    totalCarts += cart.count;
  }

  // Base weight + cart weight estimate
  return 10 + totalCarts * 5;
}

/**
 * Calculate travel time for a route given a train.
 *
 * Travel time depends on:
 * - Axial distance
 * - Route traversal cost (tile penalties)
 * - Train engine age and level
 * - Train weight
 *
 * @param route - The route to travel
 * @param train - The train making the trip
 * @returns The travel time (in game time units)
 */
export function getRouteTravelTime(route: Route, train: TrainData): number {
  // Base time: distance * base speed factor
  const baseTime = route.distance * 10;

  // Penalty time: traversal cost * penalty factor
  const penaltyTime = route.totalCost * 5;

  // Weight factor: heavier trains are slower
  const weight = getTrainWeight(train);
  const weightFactor = 1 + (weight - 10) * 0.02;

  // Engine factor: better engines are faster
  const engineFactor = getEngineSpeedFactor(train.engineAge, train.engineLevel);

  // Total time
  const totalTime = ((baseTime + penaltyTime) * weightFactor) / engineFactor;

  return Math.max(1, Math.round(totalTime));
}

/**
 * Get speed factor based on engine age and level.
 *
 * @param engineAge - The engine age (e.g., 'Basic', 'Steam', 'Diesel', 'Electric', 'Maglev')
 * @param engineLevel - The engine level (1-10+)
 * @returns Speed factor (1.0 = baseline)
 */
export function getEngineSpeedFactor(engineAge: string, engineLevel: number): number {
  // Base speeds by age
  const ageSpeeds: Record<string, number> = {
    Basic: 1.0,
    Steam: 1.2,
    Diesel: 1.5,
    Electric: 1.8,
    Maglev: 2.2,
  };

  const baseSpeed = ageSpeeds[engineAge] ?? 1.0;

  // Level bonus: +5% per level
  const levelBonus = 1 + (engineLevel - 1) * 0.05;

  return baseSpeed * levelBonus;
}

// ============================================================================
// Distance Helpers
// ============================================================================

/**
 * Get pure axial hex distance between two coordinates.
 *
 * Wrapper for hex.getHexDistance().
 *
 * @param a - First coordinate
 * @param b - Second coordinate
 * @returns Axial hex distance
 */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  return getHexDistance(a, b);
}

// ============================================================================
// Exploration Routes
// ============================================================================

/**
 * Find a route to a fog tile for exploration.
 *
 * Fog tiles are valid exploration destinations for any train/cart setup.
 *
 * @param start - Starting coordinate (usually active plot)
 * @param fogTile - The fog tile to explore
 * @param world - The world state
 * @param train - The train making the exploration
 * @returns The exploration route, or null if no path exists
 */
export function findExplorationRoute(start: HexCoord, fogTile: WorldCell, world: WorldState, train: TrainData): Route | null {
  const fogCoord = { q: fogTile.q, r: fogTile.r };
  return findRoute(start, fogCoord, world, true);
}

/**
 * Calculate travel time for an exploration route.
 *
 * @param start - Starting coordinate
 * @param fogTile - The fog tile to explore
 * @param world - The world state
 * @param train - The train making the exploration
 * @returns The exploration travel time, or null if no path exists
 */
export function getExplorationTime(start: HexCoord, fogTile: WorldCell, world: WorldState, train: TrainData): number | null {
  const route = findExplorationRoute(start, fogTile, world, train);
  if (!route) {
    return null;
  }
  return getRouteTravelTime(route, train);
}
