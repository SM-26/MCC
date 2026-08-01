// src/logic/world/worldTypes.ts

import type { HexCoord } from './hex';
import type { PlotState } from '../mine/mineTypes';

export type WorldCellId = string;
export type DestinationId = string;

export type WorldCellType = 'empty' | 'plot' | 'city' | 'factory' | 'blocker';
/**
 * `exploration` is not a place. It is a standing order — "go reveal fog" — whose
 * actual target is chosen later, per trip, by tapping a hidden tile in the World
 * map. Everything else is a fixed cell.
 */
export type DestinationType = 'city' | 'factory' | 'plot' | 'exploration';

export const EXPLORATION_DESTINATION_ID = 'exploration';

export function createExplorationDestination(): Destination {
  return {
    id: EXPLORATION_DESTINATION_ID,
    name: 'Exploration',
    type: 'exploration',
    distance: 0,
    basePayout: 0,
    discovered: true,
  };
}

export function isExplorationRoute(route: Route | null | undefined): boolean {
  return route?.destinationType === 'exploration';
}

/**
 * Where an exploration-routed train would go right now: the inspected cell, but
 * only while it's still hidden. Null means a scout has nowhere to go — which is
 * why such a train must not be counted as "ready" or offered a Dispatch button.
 */
export function getExplorationTarget(world: WorldState): WorldCell | null {
  const id = world.inspectedCellId;
  if (!id) {
    return null;
  }
  const cell = getCellById(world, id);
  return cell && !cell.discovered ? cell : null;
}
export type ResourceType = 'Oil' | 'Coal' | 'Copper' | 'SuperAlloy';

/**
 * Tile kind semantic descriptions:
 * - empty: revealed but non-special tile; passable
 * - plot: destination for plot expansion and age-resource transfer; passable with penalty
 * - city: passenger destination; only passenger carts count; passable with penalty
 * - factory: cargo destination; only cargo carts count; accepts resources; passable with penalty
 * - blocker: impassable tile (river/lake/mountain flavor)
 *
 * Note:
 * - Undiscovered cells are painted as fog by the UI.
 * - Fog is no longer a stored tile type.
 */

export interface Route {
  destinationId: DestinationId;
  destinationType: DestinationType;
}

export interface WorldCell {
  id: WorldCellId;
  name: string;
  type: WorldCellType;

  q: number;
  r: number;
  ring: number;

  discovered: boolean;

  capacity?: number;
  acceptedResources?: ResourceType[];
}

export interface Destination {
  id: DestinationId;
  name: string;
  type: DestinationType;
  distance: number;
  basePayout: number;
  discovered: boolean;
  /** Factories only — what this one buys. Carried so the Station can say what
      "cargo" actually means without re-looking-up the cell. */
  acceptedResources?: ResourceType[];
}

export interface WorldState {
  cells: WorldCell[];
  // Persisted shape only — at runtime the source of truth is plotsStore; worldStore.current.plots is NOT kept up to date.
  plots: Record<WorldCellId, PlotState>;
  activePlotCellId: WorldCellId | null;
  inspectedCellId: WorldCellId | null;
}

export function getActivePlotCell(world: WorldState): WorldCell | null {
  if (!world.activePlotCellId) {
    return null;
  }
  return world.cells.find((cell) => cell.id === world.activePlotCellId) ?? null;
}

export function getCellById(world: WorldState, cellId: WorldCellId): WorldCell | null {
  return world.cells.find((cell) => cell.id === cellId) ?? null;
}

export function getDestinationFromCell(cell: WorldCell): Destination | null {
  if (!cell.discovered || cell.type === 'empty' || cell.type === 'blocker') {
    return null;
  }

  return {
    id: cell.id,
    name: cell.name,
    type: cell.type,
    distance: 0,
    basePayout: 0,
    discovered: cell.discovered,
    acceptedResources: cell.acceptedResources,
  };
}

export function isRouteToDestination(route: Route, destination: Destination): boolean {
  return route.destinationId === destination.id && route.destinationType === destination.type;
}

export function makeWorldCellId(q: number, r: number): WorldCellId {
  return `${q},${r}`;
}

export function parseWorldCellId(id: WorldCellId): HexCoord | null {
  const parts = id.split(',');
  if (parts.length !== 2) {
    return null;
  }
  const q = parseInt(parts[0], 10);
  const r = parseInt(parts[1], 10);
  if (isNaN(q) || isNaN(r)) {
    return null;
  }
  return { q, r };
}
