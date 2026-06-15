// src/logic/world/worldTypes.ts

import type { HexCoord } from './hex';

export type WorldCellId = string;
export type DestinationId = string;
export type PlotId = string;

export type WorldCellType = 'fog' | 'empty' | 'plot' | 'city' | 'factory' | 'blocker';
export type DestinationType = 'city' | 'factory' | 'plot';
export type ResourceType = 'Oil' | 'Coal' | 'Copper' | 'SuperAlloy';

/**
 * Tile kind semantic descriptions (per design doc):
 * - fog: unrevealed tile; valid exploration destination; not passable
 * - empty: revealed but non-special tile; passable
 * - plot: destination for plot expansion and age-resource transfer; passable with penalty
 * - city: passenger destination; only passenger carts count; passable with penalty
 * - factory: cargo destination; only cargo carts count; accepts resources; passable with penalty
 * - blocker: impassable tile (river/lake/mountain flavor)
 */

export interface Route {
  destinationId: DestinationId;
  destinationType: DestinationType;
}

export interface WorldCell {
  id: WorldCellId;
  name: string;
  type: WorldCellType;

  // Axial hex coordinates
  q: number;
  r: number;
  ring: number; // distance from origin (0 = starting plot)

  discovered: boolean; // default: false (fog is undiscovered)

  // Optional generated name (for plot/city/factory)

  // Type-specific properties
  capacity?: number; // for city/factory: max throughput
  acceptedResources?: ResourceType[]; // for factory: which resources it accepts
}

export interface Destination {
  id: DestinationId;
  name: string;
  type: DestinationType;
  distance: number; // axial hex distance from active plot
  basePayout: number; // money/EI potential (from config/formula)
  discovered: boolean; // default: false
}

export interface WorldState {
  cells: WorldCell[]; // world map data
  plots: WorldPlot[]; // player-developed plots
  activePlotIndex: number; // default: 0
}

export interface WorldPlot {
  plotId: PlotId;
  cellId: WorldCellId;
  plotName: string;
  discovered: boolean; // default: true once acquired
}

// Helper functions

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
  if (cell.type === 'fog' || cell.type === 'empty' || cell.type === 'blocker') {
    return null;
  }

  return {
    id: cell.id,
    name: cell.name,
    type: cell.type,
    distance: 0, // Will be computed by pathing logic later
    basePayout: 0, // Will be set from config/formula during generation
    discovered: cell.discovered,
  };
}

export function isRouteToDestination(route: Route, destination: Destination): boolean {
  return route.destinationId === destination.id && route.destinationType === destination.type;
}

// Coord helpers (wrapping hex.ts)

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
