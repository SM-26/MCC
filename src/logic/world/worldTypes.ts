// src/logic/world/worldTypes.ts

import type { HexCoord } from './hex';

export type WorldCellId = string;
export type DestinationId = string;
export type PlotId = string;

export type WorldCellType = 'empty' | 'plot' | 'city' | 'factory' | 'blocker';
export type DestinationType = 'city' | 'factory' | 'plot';
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
}

export interface WorldState {
  cells: WorldCell[];
  plots: WorldPlot[];
  activePlotIndex: number;
}

export interface WorldPlot {
  plotId: PlotId;
  cellId: WorldCellId;
  discovered: boolean;
}

export function getActivePlot(world: WorldState): WorldPlot | null {
  return world.plots[world.activePlotIndex] ?? null;
}

export function getCellById(world: WorldState, cellId: WorldCellId): WorldCell | null {
  return world.cells.find((cell) => cell.id === cellId) ?? null;
}

export function getPlotById(world: WorldState, plotId: PlotId): WorldPlot | null {
  return world.plots.find((plot) => plot.plotId === plotId) ?? null;
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
