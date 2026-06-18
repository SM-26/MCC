// src/logic/mine/mineStore.svelte.ts
import type { AgeResources, Ages, MineDepthState, MineTile, MineTileType, Miner, NorthExpansion, PlotId, PlotState, ResourceType } from './mineTypes';
import { createEmptyAgeResources } from './mineTypes';

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

function createDefaultNorthExpansion(): NorthExpansion {
  return {
    mineDepths: [createDefaultMineDepthState(0)],
    selectedMiner: null,
    draggedMiner: null,
    lastTick: Date.now(),
    activeDepthIndex: 0,
  };
}

function createDefaultPlotState(plotId: PlotId = 'plot-0'): PlotState {
  return {
    plotId,
    currentAge: 'Mechanical',
    ageResources: createEmptyAgeResources(),
    northExpansions: [createDefaultNorthExpansion()],
    activeNorthExpansionIndex: 0,
    station: null,
  };
}

function cloneMineDepthState(depth: MineDepthState): MineDepthState {
  return {
    depth: depth.depth,
    rows: depth.rows,
    cols: depth.cols,
    tiles: depth.tiles.map((row) => row.map((tile) => ({ ...tile }))),
    miners: depth.miners.map((miner) => ({ ...miner })),
  };
}

function cloneNorthExpansion(expansion: NorthExpansion): NorthExpansion {
  return {
    mineDepths: expansion.mineDepths.map(cloneMineDepthState),
    selectedMiner: expansion.selectedMiner ? { ...expansion.selectedMiner } : null,
    draggedMiner: expansion.draggedMiner ? { ...expansion.draggedMiner } : null,
    lastTick: expansion.lastTick,
    activeDepthIndex: expansion.activeDepthIndex,
  };
}

function clonePlotState(plot: PlotState): PlotState {
  return {
    plotId: plot.plotId,
    currentAge: plot.currentAge,
    ageResources: { ...plot.ageResources },
    northExpansions: plot.northExpansions.map(cloneNorthExpansion),
    activeNorthExpansionIndex: plot.activeNorthExpansionIndex,
    station: plot.station ? { ...plot.station } : null,
  };
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(index, length - 1));
}

function addAgeResource(resources: AgeResources, resourceType: Exclude<ResourceType, 'none' | 'money'>, amount: number) {
  resources[resourceType] += amount;
}

function getActiveNorthExpansion(plot: PlotState): NorthExpansion | null {
  return plot.northExpansions[plot.activeNorthExpansionIndex] ?? null;
}

function getActiveMineDepth(expansion: NorthExpansion | null): MineDepthState | null {
  return expansion ? (expansion.mineDepths[expansion.activeDepthIndex] ?? null) : null;
}

function getMineDepthByDepth(expansion: NorthExpansion, depth: number): MineDepthState | null {
  return expansion.mineDepths.find((mineDepth) => mineDepth.depth === depth) ?? null;
}

export function createMineStore(initial?: Partial<PlotState>) {
  function getTileAt(row: number, col: number): MineTile | null {
    const mineDepth = activeMineDepth;
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

  function getResourceTypeForTileType(type: MineTileType): ResourceType {
    return type === 'coal' || type === 'oil' || type === 'copper' || type === 'superalloy' ? type : 'none';
  }

  const state = $state<PlotState>(
    clonePlotState({
      ...createDefaultPlotState(initial?.plotId),
      ...initial,
      ageResources: initial?.ageResources ?? createEmptyAgeResources(),
      northExpansions: initial?.northExpansions ? initial.northExpansions.map(cloneNorthExpansion) : [createDefaultNorthExpansion()],
      station: initial?.station ? { ...initial.station } : null,
    }),
  );

  const activeNorthExpansion = $derived(state.northExpansions[state.activeNorthExpansionIndex] ?? null);
  const activeMineDepth = $derived(activeNorthExpansion ? (activeNorthExpansion.mineDepths[activeNorthExpansion.activeDepthIndex] ?? null) : null);

  return {
    get current() {
      return state;
    },

    get activeNorthExpansion() {
      return activeNorthExpansion;
    },

    get activeMineDepth() {
      return activeMineDepth;
    },

    reset(plotId: PlotId = state.plotId) {
      Object.assign(state, createDefaultPlotState(plotId));
    },

    replace(next: PlotState) {
      Object.assign(state, clonePlotState(next));
    },

    setCurrentAge(age: Ages) {
      state.currentAge = age;
    },

    setActiveNorthExpansionIndex(index: number) {
      state.activeNorthExpansionIndex = clampIndex(index, state.northExpansions.length);
    },

    setActiveDepthIndex(index: number) {
      const expansion = activeNorthExpansion;
      if (!expansion) {
        return;
      }

      expansion.activeDepthIndex = clampIndex(index, expansion.mineDepths.length);
    },

    addNorthExpansion(expansion?: Partial<NorthExpansion>) {
      const next: NorthExpansion = {
        ...createDefaultNorthExpansion(),
        ...expansion,
        mineDepths: expansion?.mineDepths ? expansion.mineDepths.map(cloneMineDepthState) : [createDefaultMineDepthState(0)],
        selectedMiner: expansion?.selectedMiner ? { ...expansion.selectedMiner } : null,
        draggedMiner: expansion?.draggedMiner ? { ...expansion.draggedMiner } : null,
      };

      state.northExpansions.push(next);
      state.activeNorthExpansionIndex = state.northExpansions.length - 1;
    },

    addMineDepth(depth: number, rows = 5, cols = 5) {
      const expansion = activeNorthExpansion;
      if (!expansion) {
        return false;
      }

      const existing = getMineDepthByDepth(expansion, depth);
      if (existing) {
        return false;
      }

      expansion.mineDepths.push(createDefaultMineDepthState(depth, rows, cols));
      expansion.mineDepths.sort((a, b) => a.depth - b.depth);
      expansion.activeDepthIndex = expansion.mineDepths.findIndex((mineDepth) => mineDepth.depth === depth);

      return true;
    },

    setSelectedMiner(miner: Miner | null) {
      const expansion = activeNorthExpansion;
      if (!expansion) {
        return;
      }

      expansion.selectedMiner = miner ? { ...miner } : null;
    },

    setDraggedMiner(miner: Miner | null) {
      const expansion = activeNorthExpansion;
      if (!expansion) {
        return;
      }

      expansion.draggedMiner = miner ? { ...miner } : null;
    },

    touchTick(timestamp = Date.now()) {
      const expansion = activeNorthExpansion;
      if (!expansion) {
        return;
      }

      expansion.lastTick = timestamp;
    },

    addMiner(miner?: Partial<Miner>) {
      const mineDepth = activeMineDepth;
      if (!mineDepth) {
        return false;
      }

      mineDepth.miners.push(createDefaultMiner(miner));
      return true;
    },

    removeMiner(index: number) {
      const mineDepth = activeMineDepth;
      if (!mineDepth) {
        return false;
      }
      if (index < 0 || index >= mineDepth.miners.length) {
        return false;
      }

      mineDepth.miners.splice(index, 1);
      return true;
    },

    updateMiner(index: number, updates: Partial<Miner>) {
      const mineDepth = activeMineDepth;
      if (!mineDepth) {
        return false;
      }
      if (index < 0 || index >= mineDepth.miners.length) {
        return false;
      }

      Object.assign(mineDepth.miners[index], updates);
      return true;
    },

    setTile(row: number, col: number, updates: Partial<MineTile>) {
      const tile = getTileAt(row, col);
      if (!tile) {
        return false;
      }

      Object.assign(tile, updates);
      return true;
    },

    setTileType(row: number, col: number, type: MineTileType) {
      const tile = getTileAt(row, col);
      if (!tile) {
        return false;
      }

      tile.type = type;
      tile.resourceType = getResourceTypeForTileType(type);
      return true;
    },

    damageTile(row: number, col: number, amount: number) {
      const tile = getTileAt(row, col);
      if (!tile) {
        return false;
      }

      tile.hp = Math.max(0, tile.hp - amount);
      return true;
    },

    addAgeResource(resourceType: Exclude<ResourceType, 'none' | 'money'>, amount = 1) {
      addAgeResource(state.ageResources, resourceType, amount);
    },

    spendAgeResource(resourceType: Exclude<ResourceType, 'none' | 'money'>, amount = 1) {
      state.ageResources[resourceType] = Math.max(0, state.ageResources[resourceType] - amount);
    },

    getActiveNorthExpansion(): NorthExpansion | null {
      return getActiveNorthExpansion(state);
    },

    getActiveMineDepth(): MineDepthState | null {
      return getActiveMineDepth(activeNorthExpansion);
    },
  };
}

export const mineStore = createMineStore();
