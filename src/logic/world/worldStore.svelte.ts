// src/logic/world/worldStore.svelte.ts

import type {
  Destination,
  DestinationId,
  DestinationType,
  PlotId,
  Route,
  WorldCell,
  WorldCellId,
  WorldPlot,
  WorldState,
} from './worldTypes';

import { getActivePlot, getCellById, getDestinationFromCell, getPlotById, isRouteToDestination } from './worldTypes';

function createDefaultWorldCell(
  id: WorldCellId,
  name: string,
  q: number,
  r: number,
  ring: number,
  type: WorldCell['type'] = 'empty',
): WorldCell {
  return {
    id,
    name,
    type,
    q,
    r,
    ring,
    discovered: false,
  };
}

function createDefaultWorldPlot(plotId: PlotId, cellId: WorldCellId): WorldPlot {
  return {
    plotId,
    cellId,
    discovered: true,
  };
}

function createDefaultWorldState(): WorldState {
  return {
    cells: [],
    plots: [],
    activePlotIndex: 0,
  };
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(index, length - 1));
}

function makePlotIdFromCellId(cellId: WorldCellId): PlotId {
  return `plot-${cellId}`;
}

export function createWorldStore(initial?: Partial<WorldState>) {
  const state = $state<WorldState>({
    ...createDefaultWorldState(),
    ...initial,
    cells: initial?.cells ? [...initial.cells] : [],
    plots: initial?.plots ? [...initial.plots] : [],
    activePlotIndex: initial?.activePlotIndex ?? 0,
  });

  const activePlot = $derived(getActivePlot(state));

  const destinations = $derived(
    state.cells.map((cell) => getDestinationFromCell(cell)).filter((destination): destination is Destination => destination !== null),
  );

  function findPlotIndexByCellId(cellId: WorldCellId): number {
    return state.plots.findIndex((plot) => plot.cellId === cellId);
  }

  function findPlotIndexByPlotId(plotId: PlotId): number {
    return state.plots.findIndex((plot) => plot.plotId === plotId);
  }

  return {
    get current() {
      return state;
    },

    get activePlot() {
      return activePlot;
    },

    get destinations() {
      return destinations;
    },

    reset() {
      Object.assign(state, createDefaultWorldState());
    },

    replace(next: WorldState) {
      Object.assign(state, {
        ...next,
        cells: [...next.cells],
        plots: [...next.plots],
      });
    },

    setActivePlotIndex(index: number) {
      state.activePlotIndex = clampIndex(index, state.plots.length);
    },

    addCell(cell: WorldCell) {
      state.cells.push(cell);
    },

    createCell(id: WorldCellId, name: string, q: number, r: number, ring: number, type: WorldCell['type'] = 'empty') {
      state.cells.push(createDefaultWorldCell(id, name, q, r, ring, type));
    },

    updateCell(cellId: WorldCellId, updates: Partial<WorldCell>): boolean {
      const cell = getCellById(state, cellId);
      if (!cell) {
        return false;
      }

      Object.assign(cell, updates);
      return true;
    },

    discoverCell(cellId: WorldCellId): boolean {
      const cell = getCellById(state, cellId);
      if (!cell) {
        return false;
      }

      cell.discovered = true;
      return true;
    },

    addPlot(plot: WorldPlot) {
      state.plots.push({ ...plot });
    },

    createPlot(plotId: PlotId, cellId: WorldCellId) {
      const existingIndex = findPlotIndexByPlotId(plotId);
      if (existingIndex !== -1) {
        return false;
      }

      state.plots.push(createDefaultWorldPlot(plotId, cellId));
      return true;
    },

    createPlotFromCell(cellId: WorldCellId): boolean {
      const cell = getCellById(state, cellId);
      if (!cell || cell.type !== 'plot') {
        return false;
      }

      const existingByCell = findPlotIndexByCellId(cellId);
      if (existingByCell !== -1) {
        state.activePlotIndex = existingByCell;
        return true;
      }

      const plotId = makePlotIdFromCellId(cellId);
      const existingByPlotId = findPlotIndexByPlotId(plotId);
      if (existingByPlotId !== -1) {
        state.activePlotIndex = existingByPlotId;
        return true;
      }

      state.plots.push(createDefaultWorldPlot(plotId, cellId));
      state.activePlotIndex = state.plots.length - 1;
      return true;
    },

    updatePlot(plotId: PlotId, updates: Partial<WorldPlot>): boolean {
      const plot = getPlotById(state, plotId);
      if (!plot) {
        return false;
      }

      Object.assign(plot, updates);
      return true;
    },

    setActivePlotById(plotId: PlotId): boolean {
      const index = findPlotIndexByPlotId(plotId);
      if (index === -1) {
        return false;
      }

      state.activePlotIndex = index;
      return true;
    },

    getCellById(cellId: WorldCellId): WorldCell | null {
      return getCellById(state, cellId);
    },

    getPlotById(plotId: PlotId): WorldPlot | null {
      return getPlotById(state, plotId);
    },

    getDestinationById(destinationId: DestinationId, destinationType: DestinationType): Destination | null {
      return destinations.find((destination) => destination.id === destinationId && destination.type === destinationType) ?? null;
    },

    isRouteValid(route: Route): boolean {
      return destinations.some((destination) => isRouteToDestination(route, destination));
    },
  };
}

export const worldStore = createWorldStore();