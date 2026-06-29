// src/logic/mine/plotsStore.svelte.ts
import { log } from '../../lib/logger';
import type { WorldCellId } from '../world/worldTypes';
import type { AgeResources, MineDepthState, MineTile, MineTileType, Miner, Mineshaft, PlotState, ResourceType } from './mineTypes';
import { cloneMineDepthState, cloneMineshaft, clonePlotState, getMineDepthByDepth } from './mineTypes';

// ── Local factory helpers (mirrors mineStore.svelte.ts private helpers) ───────

function createDefaultMiner(overrides: Partial<Miner> = {}): Miner {
  return {
    level: 1,
    tileIndex: 0,
    facing: 1,
    progress: 0,
    ...overrides,
  };
}

function createDefaultMineTile(type: MineTileType = 'empty', overrides: Partial<MineTile> = {}): MineTile {
  const resourceType: ResourceType = type === 'coal' || type === 'oil' || type === 'copper' || type === 'superalloy' ? type : 'none';
  return {
    type,
    level: 1,
    hp: 0,
    maxHp: 0,
    value: 0,
    resourceType,
    ...overrides,
  };
}

function createTileGrid(rows: number, cols: number, fill: MineTileType = 'empty'): MineTile[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => createDefaultMineTile(fill)));
}

function createDefaultMineDepthState(depth = 0, rows = 5, cols = 5): MineDepthState {
  return {
    depth,
    rows,
    cols,
    tiles: createTileGrid(rows, cols, depth === 0 ? 'dirt' : 'empty'),
    miners: [],
  };
}

function createDefaultMineshaft(): Mineshaft {
  return {
    mineDepths: [createDefaultMineDepthState(0)],
    selectedMiner: null,
    draggedMiner: null,
    lastTick: Date.now(),
    activeDepthIndex: 0,
  };
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(index, length - 1));
}

function addAgeResourceToMap(resources: AgeResources, resourceType: Exclude<ResourceType, 'none' | 'money'>, amount: number) {
  resources[resourceType] += amount;
}

function getResourceTypeForTileType(type: MineTileType): ResourceType {
  return type === 'coal' || type === 'oil' || type === 'copper' || type === 'superalloy' ? type : 'none';
}

// ── Store factory ─────────────────────────────────────────────────────────────

export function createPlotsStore(initial?: Record<WorldCellId, PlotState>) {
  const state = $state<Record<WorldCellId, PlotState>>(Object.fromEntries(Object.entries(initial ?? {}).map(([id, p]) => [id, clonePlotState(p)])));

  // Resolves the active mineshaft for a given cell.
  function activeShaft(cellId: WorldCellId): Mineshaft | null {
    const plot = state[cellId];
    if (!plot) {
      return null;
    }
    return plot.mineshafts[plot.activeMineshaftIndex] ?? null;
  }

  // Resolves the active mine depth for a given cell.
  function activeDepth(cellId: WorldCellId): MineDepthState | null {
    const shaft = activeShaft(cellId);
    if (!shaft) {
      return null;
    }
    return shaft.mineDepths[shaft.activeDepthIndex] ?? null;
  }

  // Resolves the tile at (row, col) in the active depth for a given cell.
  function getTileAt(cellId: WorldCellId, row: number, col: number): MineTile | null {
    const mineDepth = activeDepth(cellId);
    if (!mineDepth) {
      return null;
    }
    if (row < 0 || row >= mineDepth.rows) {
      return null;
    }
    if (col < 0 || col >= mineDepth.cols) {
      return null;
    }
    return mineDepth.tiles[row]?.[col] ?? null;
  }

  return {
    // ── Map accessors ─────────────────────────────────────────────────────────

    get current(): Record<WorldCellId, PlotState> {
      return state;
    },

    get(cellId: WorldCellId): PlotState | null {
      return state[cellId] ?? null;
    },

    has(cellId: WorldCellId): boolean {
      return cellId in state;
    },

    /** Insert or replace one plot entry; stored value is an owned clone. */
    set(cellId: WorldCellId, plot: PlotState): void {
      state[cellId] = clonePlotState(plot);
    },

    /** Replace ALL entries atomically; each entry is an owned clone. */
    replaceAll(next: Record<WorldCellId, PlotState>): void {
      for (const key of Object.keys(state)) {
        delete state[key];
      }
      for (const [id, p] of Object.entries(next)) {
        state[id] = clonePlotState(p);
      }
    },

    /** Returns a plain-object snapshot of the full map (for serialisation). */
    snapshot(): Record<WorldCellId, PlotState> {
      return $state.snapshot(state) as Record<WorldCellId, PlotState>;
    },

    // ── In-place active-plot mutators ─────────────────────────────────────────

    addMineshaft(cellId: WorldCellId, shaft?: Partial<Mineshaft>): void {
      const plot = state[cellId];
      if (!plot) {
        log.warn('plotsStore', `addMineshaft: no plot at ${cellId}`);
        return;
      }

      const next: Mineshaft = {
        ...createDefaultMineshaft(),
        ...shaft,
        mineDepths: shaft?.mineDepths ? shaft.mineDepths.map(cloneMineDepthState) : [createDefaultMineDepthState(0)],
        selectedMiner: shaft?.selectedMiner ? { ...shaft.selectedMiner } : null,
        draggedMiner: shaft?.draggedMiner ? { ...shaft.draggedMiner } : null,
      };

      plot.mineshafts.push(next);
      plot.activeMineshaftIndex = plot.mineshafts.length - 1;
    },

    addMineDepth(cellId: WorldCellId, depth: number, rows = 5, cols = 5): boolean {
      const shaft = activeShaft(cellId);
      if (!shaft) {
        return false;
      }

      const existing = getMineDepthByDepth(shaft, depth);
      if (existing) {
        return false;
      }

      shaft.mineDepths.push(createDefaultMineDepthState(depth, rows, cols));
      shaft.mineDepths.sort((a, b) => a.depth - b.depth);
      shaft.activeDepthIndex = shaft.mineDepths.findIndex((mineDepth) => mineDepth.depth === depth);

      return true;
    },

    setActiveMineshaftIndex(cellId: WorldCellId, index: number): void {
      const plot = state[cellId];
      if (!plot) {
        return;
      }
      plot.activeMineshaftIndex = clampIndex(index, plot.mineshafts.length);
    },

    setActiveDepthIndex(cellId: WorldCellId, index: number): void {
      const shaft = activeShaft(cellId);
      if (!shaft) {
        return;
      }
      shaft.activeDepthIndex = clampIndex(index, shaft.mineDepths.length);
    },

    addMiner(cellId: WorldCellId, miner?: Partial<Miner>): boolean {
      const mineDepth = activeDepth(cellId);
      if (!mineDepth) {
        return false;
      }

      mineDepth.miners.push(createDefaultMiner(miner));
      return true;
    },

    removeMiner(cellId: WorldCellId, index: number): boolean {
      const mineDepth = activeDepth(cellId);
      if (!mineDepth) {
        return false;
      }
      if (index < 0 || index >= mineDepth.miners.length) {
        return false;
      }

      mineDepth.miners.splice(index, 1);
      return true;
    },

    updateMiner(cellId: WorldCellId, index: number, updates: Partial<Miner>): boolean {
      const mineDepth = activeDepth(cellId);
      if (!mineDepth) {
        return false;
      }
      if (index < 0 || index >= mineDepth.miners.length) {
        return false;
      }

      Object.assign(mineDepth.miners[index], updates);
      return true;
    },

    setTile(cellId: WorldCellId, row: number, col: number, updates: Partial<MineTile>): boolean {
      const tile = getTileAt(cellId, row, col);
      if (!tile) {
        return false;
      }

      Object.assign(tile, updates);
      return true;
    },

    setTileType(cellId: WorldCellId, row: number, col: number, type: MineTileType): boolean {
      const tile = getTileAt(cellId, row, col);
      if (!tile) {
        return false;
      }

      tile.type = type;
      tile.resourceType = getResourceTypeForTileType(type);
      return true;
    },

    damageTile(cellId: WorldCellId, row: number, col: number, amount: number): boolean {
      const tile = getTileAt(cellId, row, col);
      if (!tile) {
        return false;
      }

      tile.hp = Math.max(0, tile.hp - amount);
      return true;
    },

    addAgeResource(cellId: WorldCellId, resourceType: Exclude<ResourceType, 'none' | 'money'>, amount = 1): void {
      const plot = state[cellId];
      if (!plot) {
        return;
      }
      addAgeResourceToMap(plot.ageResources, resourceType, amount);
    },

    spendAgeResource(cellId: WorldCellId, resourceType: Exclude<ResourceType, 'none' | 'money'>, amount = 1): void {
      const plot = state[cellId];
      if (!plot) {
        return;
      }
      plot.ageResources[resourceType] = Math.max(0, plot.ageResources[resourceType] - amount);
    },
  };
}

export const plotsStore = createPlotsStore();
