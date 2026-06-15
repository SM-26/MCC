// src/logic/world/worldTypes.ts

export type WorldCellId = string;
export type DestinationId = string;
export type PlotId = string;

export type WorldCellType = 'fog' | 'plot' | 'city' | 'factory';

export type DestinationType = 'city' | 'factory' | 'plot';

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

  discovered: boolean; // default: false
}

export interface Destination {
  id: DestinationId;
  name: string;
  type: DestinationType;
  distance: number;
  basePayout: number;
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
  if (cell.type === 'fog') {
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
