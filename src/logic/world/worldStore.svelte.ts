// src/logic/world/worldStore.svelte.ts

import type { Destination, DestinationId, DestinationType, Route, WorldCell, WorldCellId, WorldState } from './worldTypes';

import { getActivePlotCell, getCellById, getDestinationFromCell, isRouteToDestination } from './worldTypes';

function createDefaultWorldCell(id: WorldCellId, name: string, q: number, r: number, ring: number, type: WorldCell['type'] = 'empty'): WorldCell {
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

function createDefaultWorldState(): WorldState {
  return {
    cells: [],
    plots: {},
    activePlotCellId: null,
    inspectedCellId: null,
  };
}

export function createWorldStore(initial?: Partial<WorldState>) {
  const state = $state<WorldState>({
    ...createDefaultWorldState(),
    ...initial,
    cells: initial?.cells ? [...initial.cells] : [],
    // Runtime source of truth is plotsStore; worldStore.current.plots is intentionally
    // kept empty/inert and is only a placeholder for the persisted WorldState shape
    // (overwritten by the save snapshot in getPersistedSnapshot).
    plots: {},
    activePlotCellId: initial?.activePlotCellId ?? null,
    inspectedCellId: initial?.inspectedCellId ?? null,
  });

  const activePlotCell = $derived(getActivePlotCell(state));

  const destinations = $derived(
    state.cells.map((cell) => getDestinationFromCell(cell)).filter((destination): destination is Destination => destination !== null),
  );

  return {
    get current() {
      return state;
    },

    get activePlotCell() {
      return activePlotCell;
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
        // Runtime source of truth is plotsStore; worldStore.current.plots is intentionally
        // kept empty/inert and is only a placeholder for the persisted WorldState shape
        // (overwritten by the save snapshot in getPersistedSnapshot).
        plots: {},
        activePlotCellId: next.activePlotCellId ?? null,
        inspectedCellId: next.inspectedCellId ?? null,
      });
    },

    setActivePlotCellId(cellId: WorldCellId | null) {
      state.activePlotCellId = cellId;
    },

    setInspectedCellId(cellId: WorldCellId | null) {
      state.inspectedCellId = cellId;
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

    getCellById(cellId: WorldCellId): WorldCell | null {
      return getCellById(state, cellId);
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
