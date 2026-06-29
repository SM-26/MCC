// src/logic/mine/mineStore.svelte.ts
import type { AgeResources, Ages, MineDepthState, MineTile, MineTileType, Miner, Mineshaft, PlotId, PlotState, ResourceType } from './mineTypes';
import { cloneMineDepthState, cloneMineshaft, clonePlotState, createEmptyAgeResources, getMineDepthByDepth } from './mineTypes';

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

function createDefaultPlotState(plotId: PlotId = 'plot-0'): PlotState {
  return {
    plotId,
    currentAge: 'Mechanical',
    ageResources: createEmptyAgeResources(),
    mineshafts: [createDefaultMineshaft()],
    activeMineshaftIndex: 0,
    station: null,
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
      mineshafts: initial?.mineshafts ? initial.mineshafts.map(cloneMineshaft) : [createDefaultMineshaft()],
      station: initial?.station ? { ...initial.station } : null,
    }),
  );

  const activeMineshaft = $derived(state.mineshafts[state.activeMineshaftIndex] ?? null);
  const activeMineDepth = $derived(activeMineshaft ? (activeMineshaft.mineDepths[activeMineshaft.activeDepthIndex] ?? null) : null);

  return {
    get current() {
      return state;
    },

    get activeMineshaft() {
      return activeMineshaft;
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

    setActiveMineshaftIndex(index: number) {
      state.activeMineshaftIndex = clampIndex(index, state.mineshafts.length);
    },

    setActiveDepthIndex(index: number) {
      const shaft = activeMineshaft;
      if (!shaft) {
        return;
      }

      shaft.activeDepthIndex = clampIndex(index, shaft.mineDepths.length);
    },

    addMineshaft(shaft?: Partial<Mineshaft>) {
      const next: Mineshaft = {
        ...createDefaultMineshaft(),
        ...shaft,
        mineDepths: shaft?.mineDepths ? shaft.mineDepths.map(cloneMineDepthState) : [createDefaultMineDepthState(0)],
        selectedMiner: shaft?.selectedMiner ? { ...shaft.selectedMiner } : null,
        draggedMiner: shaft?.draggedMiner ? { ...shaft.draggedMiner } : null,
      };

      state.mineshafts.push(next);
      state.activeMineshaftIndex = state.mineshafts.length - 1;
    },

    addMineDepth(depth: number, rows = 5, cols = 5) {
      const shaft = activeMineshaft;
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

    setSelectedMiner(miner: Miner | null) {
      const shaft = activeMineshaft;
      if (!shaft) {
        return;
      }

      shaft.selectedMiner = miner ? { ...miner } : null;
    },

    setDraggedMiner(miner: Miner | null) {
      const shaft = activeMineshaft;
      if (!shaft) {
        return;
      }

      shaft.draggedMiner = miner ? { ...miner } : null;
    },

    touchTick(timestamp = Date.now()) {
      const shaft = activeMineshaft;
      if (!shaft) {
        return;
      }

      shaft.lastTick = timestamp;
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

    getActiveMineshaft(): Mineshaft | null {
      return activeMineshaft;
    },

    getActiveMineDepth(): MineDepthState | null {
      return activeMineDepth;
    },
  };
}

export const mineStore = createMineStore();
