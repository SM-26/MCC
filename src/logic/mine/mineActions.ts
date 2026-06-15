// src/logic/mine/mineActions.ts

import { generatePlot, getClearStatus } from '../mine/mineGen';
import type { GameState, MineDepth, Miner, PlotState, NorthExpansion } from '../../types';
import type { EngineeringState } from '../engineering/engineeringTypes';
import { engineeringStore } from '../engineering/engineeringStore.svelte';

export const BASE_MINER_COST = 50;
export const BASE_PLOT_COST = 100;

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export interface BuyMinerResult extends ActionResult {
  minerCost: number;
}

export function createDefaultPlotState(worldSeed: string, resetCount: number, plotIndex = 0, plotName = 'Prague'): PlotState {
  return {
    plotName,
    northExpansions: [
      {
        mineDepths: [generatePlot(worldSeed, resetCount, 0, plotIndex)],
        selectedMiner: null,
        draggedMiner: null,
        lastTick: 0,
        activeDepthIndex: 0,
      },
    ],
    activeNorthExpansionIndex: 0,
    ageResources: {
      coal: 0,
      oil: 0,
      copper: 0,
      superAlloy: 0,
    },
    currentAge: 'Mechanical',
    station: null,
  };
}

export function getMinerCost(activeMine: MineDepth | null): number {
  return Math.floor(BASE_MINER_COST * Math.pow(1.5, activeMine?.miners.length ?? 0));
}

export function canBuyMiner(gameState: GameState, activeMine: MineDepth | null): boolean {
  return gameState.money >= getMinerCost(activeMine);
}

export function buyMiner(gameState: GameState, activeMine: MineDepth | null): BuyMinerResult {
  if (!activeMine) {
    return { ok: false, message: 'No active mine', minerCost: getMinerCost(activeMine) };
  }

  const minerCost = getMinerCost(activeMine);

  if (gameState.money < minerCost) {
    return { ok: false, message: 'Not enough money!', minerCost };
  }

  const emptyIndices = activeMine.tiles
    .flat()
    .map((tile, index) => (tile.type === 'empty' ? index : -1))
    .filter((index) => index !== -1);

  const occupiedIndices = new Set(activeMine.miners.map((miner) => miner.tileIndex));
  const freeIndices = emptyIndices.filter((index) => !occupiedIndices.has(index));

  if (freeIndices.length === 0) {
    return { ok: false, message: 'No room!', minerCost };
  }

  gameState.money -= minerCost;
  activeMine.miners.push({
    level: 1,
    tileIndex: freeIndices[0],
    facing: 0,
    progress: 0,
  });

  return { ok: true, minerCost };
}

export type MoveOrMergeMinerResult =
  | { ok: false; reason: 'no-active-drag'; message: string }
  | { ok: false; reason: 'invalid-target'; message: string }
  | { ok: false; reason: 'level-mismatch'; message: string }
  | { ok: false; reason: 'blocked-target'; message: string }
  | { ok: true; action: 'move'; targetIdx: number }
  | { ok: true; action: 'merge'; targetIdx: number; mergedMiner: Miner; newLevel: number; message: string };

function getTargetTile(activeMine: MineDepth, targetIdx: number) {
  const row = Math.floor(targetIdx / activeMine.cols);
  const col = targetIdx % activeMine.cols;
  return activeMine.tiles[row]?.[col];
}

function getMergeTarget(activeMine: MineDepth, draggedMiner: Miner, targetIdx: number): Miner | undefined {
  return activeMine.miners.find((miner) => miner !== draggedMiner && miner.tileIndex === targetIdx);
}

function mergeMiner(activeMine: MineDepth, draggedMiner: Miner, targetMiner: Miner, targetIdx: number): MoveOrMergeMinerResult {
  if (targetMiner.level !== draggedMiner.level) {
    return {
      ok: false,
      reason: 'level-mismatch',
      message: 'Miners must be the same level to merge',
    };
  }

  targetMiner.level += 1;
  activeMine.miners = activeMine.miners.filter((miner) => miner !== draggedMiner);

  return {
    ok: true,
    action: 'merge',
    targetIdx,
    mergedMiner: targetMiner,
    newLevel: targetMiner.level,
    message: `Merged to level ${targetMiner.level}!`,
  };
}

function moveMiner(draggedMiner: Miner, targetIdx: number): MoveOrMergeMinerResult {
  draggedMiner.tileIndex = targetIdx;

  return {
    ok: true,
    action: 'move',
    targetIdx,
  };
}

export function moveOrMergeMiner(activeMine: MineDepth | null, draggedMiner: Miner | null, targetIdx: number): MoveOrMergeMinerResult {
  if (!activeMine || !draggedMiner) {
    return { ok: false, reason: 'no-active-drag', message: 'No active drag operation' };
  }

  if (Number.isNaN(targetIdx)) {
    return { ok: false, reason: 'invalid-target', message: 'Invalid target tile' };
  }

  const targetMiner = getMergeTarget(activeMine, draggedMiner, targetIdx);
  if (targetMiner) {
    return mergeMiner(activeMine, draggedMiner, targetMiner, targetIdx);
  }

  const targetTile = getTargetTile(activeMine, targetIdx);
  if (targetTile?.type === 'empty') {
    return moveMiner(draggedMiner, targetIdx);
  }

  return { ok: false, reason: 'blocked-target', message: 'Target tile must be empty' };
}

export function digDeeper(gameState: GameState): ActionResult {
  const activePlot = gameState.world.plots[gameState.world.activePlotIndex];

  if (!activePlot) {
    return { ok: false, message: 'No active plot' };
  }

  const activeNorthExpansion = activePlot.northExpansions[activePlot.activeNorthExpansionIndex];

  if (!activeNorthExpansion) {
    return { ok: false, message: 'No active north expansion' };
  }

  const activeMine = activeNorthExpansion.mineDepths[activeNorthExpansion.activeDepthIndex];

  if (!activeMine) {
    return { ok: false, message: 'No active mine depth' };
  }

  const clearStatus = getClearStatus(activeMine);

  if (clearStatus !== 'hard') {
    return { ok: false, message: 'Clear all rubble and dirt first!' };
  }

  const nextDepth = activeMine.depth + 1;
  const plotIndex = gameState.world.activePlotIndex;
  const nextMine = generatePlot(gameState.settings.worldSeed, engineeringStore.current.resetCount, nextDepth, plotIndex);
  const validMinerTiles = new Set(
    nextMine.tiles
      .flat()
      .map((tile, index) => (tile.type === 'empty' ? index : -1))
      .filter((index) => index !== -1),
  );

  nextMine.miners = activeMine.miners.map((miner, minerIndex) => ({
    ...miner,
    tileIndex: validMinerTiles.has(miner.tileIndex) ? miner.tileIndex : ([...validMinerTiles][minerIndex] ?? 0),
  }));

  activeNorthExpansion.mineDepths.push(nextMine);
  activeNorthExpansion.activeDepthIndex = activeNorthExpansion.mineDepths.length - 1;
  activeNorthExpansion.selectedMiner = null;
  activeNorthExpansion.draggedMiner = null;

  return { ok: true };
}

export function moveToAdjacentPlot(gameState: GameState, delta: number): ActionResult {
  const next = gameState.world.activePlotIndex + delta;

  if (next < 0 || next >= gameState.world.plots.length) {
    return { ok: false, message: 'Cannot move to that plot' };
  }

  gameState.world.activePlotIndex = next;

  const activePlot = gameState.world.plots[next];
  const activeNorthExpansion = activePlot?.northExpansions?.[activePlot.activeNorthExpansionIndex];

  if (activeNorthExpansion) {
    activeNorthExpansion.selectedMiner = null;
    activeNorthExpansion.draggedMiner = null;
  }

  return { ok: true };
}

function getActiveNorthContext(gameState: GameState) {
  const activePlot = gameState.world.plots[gameState.world.activePlotIndex];
  if (!activePlot) {
    return { ok: false as const, result: { ok: false as const, message: 'No active plot' } };
  }

  const activeNorthExpansion = activePlot.northExpansions[activePlot.activeNorthExpansionIndex];
  if (!activeNorthExpansion) {
    return { ok: false as const, result: { ok: false as const, message: 'No active north expansion' } };
  }

  const activeMine = activeNorthExpansion.mineDepths[activeNorthExpansion.activeDepthIndex];
  if (!activeMine) {
    return { ok: false as const, result: { ok: false as const, message: 'No active mine depth' } };
  }

  return {
    ok: true as const,
    activePlot,
    activeNorthExpansion,
    activeMine,
  };
}

function resetNorthExpansionSelection(northExpansion: NorthExpansion) {
  northExpansion.selectedMiner = null;
  northExpansion.draggedMiner = null;
}

function tryReturnToSurface(activeNorthExpansion: NorthExpansion, activeMine: MineDepth): ActionResult | null {
  if (activeMine.depth === 0) {
    return null;
  }

  activeNorthExpansion.activeDepthIndex = 0;
  resetNorthExpansionSelection(activeNorthExpansion);
  return { ok: true };
}

function tryMoveToExistingNorthPlot(gameState: GameState, nextIndex: number): ActionResult | null {
  const existingNorthPlot = gameState.world.plots[nextIndex];
  if (!existingNorthPlot) {
    return null;
  }

  gameState.world.activePlotIndex = nextIndex;

  const nextExpansion = existingNorthPlot.northExpansions[existingNorthPlot.activeNorthExpansionIndex];
  if (nextExpansion) {
    resetNorthExpansionSelection(nextExpansion);
  }

  return { ok: true };
}

function tryBuyNorthPlot(gameState: GameState, nextIndex: number): ActionResult {
  if (gameState.money < BASE_PLOT_COST) {
    return { ok: false, message: 'Not enough money for a north expansion!' };
  }

  if (gameState.meta.maxNorthExpansions < nextIndex) {
    return { ok: false, message: 'You reached the north expansion limit!' };
  }

  const newPlotState = createDefaultPlotState(gameState.settings.worldSeed, engineeringStore.current.resetCount, nextIndex, `Plot ${nextIndex}`);

  gameState.world.plots.push(newPlotState);
  gameState.money -= BASE_PLOT_COST;
  gameState.world.activePlotIndex = nextIndex;

  return { ok: true };
}

export function handleNorthAction(gameState: GameState): ActionResult {
  const context = getActiveNorthContext(gameState);
  if (!context.ok) {
    return context.result;
  }

  const { activeMine, activeNorthExpansion } = context;

  const surfaceResult = tryReturnToSurface(activeNorthExpansion, activeMine);
  if (surfaceResult) {
    return surfaceResult;
  }

  const clearStatus = getClearStatus(activeMine);
  if (clearStatus !== 'soft') {
    return { ok: false, message: 'Clear all of the rubble first!' };
  }

  const nextIndex = gameState.world.activePlotIndex + 1;

  const moveResult = tryMoveToExistingNorthPlot(gameState, nextIndex);
  if (moveResult) {
    return moveResult;
  }

  return tryBuyNorthPlot(gameState, nextIndex);
}

export function handleSouthAction(gameState: GameState): ActionResult {
  if (gameState.world.activePlotIndex === 0) {
    return { ok: false, message: 'Already at the southernmost plot' };
  }

  return moveToAdjacentPlot(gameState, -1);
}
