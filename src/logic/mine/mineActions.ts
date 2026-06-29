// /src/logic/mine/mineAction.ts
import { buildPlot, generatePlot, getClearStatus } from '../mine/mineGen';
import { createScaffoldPlot, isPlotBuilt } from './mineTypes';
import type { MineDepthState as MineDepth, Miner, Mineshaft, PlotState } from './mineTypes';
import { plotsStore } from './plotsStore.svelte';

export const BASE_MINER_COST = 50;
export const BASE_SHAFT_COST = 100;

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export interface BuyMinerResult extends ActionResult {
  minerCost: number;
  nextMoney?: number;
}

export interface ShaftNavigationContext {
  worldSeed: string;
  resetCount: number;
  money: number;
  maxShafts: number;
  activeShaftIndex: number;
  shaftsLength: number;
  activeMineshaft: Mineshaft | null;
  activeMine: MineDepth | null;
}

export interface ShaftNavigationResult extends ActionResult {
  nextActiveShaftIndex?: number;
  nextMoney?: number;
}

export function createDefaultPlotState(worldSeed: string, resetCount: number, shaftIndex = 0, shaftName = 'Shaft I'): PlotState {
  return {
    plotId: `${worldSeed}-${shaftIndex}`,
    // plotName: shaftName,
    mineshafts: [
      {
        mineDepths: [generatePlot(worldSeed, resetCount, 0, shaftIndex)],
        selectedMiner: null,
        draggedMiner: null,
        lastTick: 0,
        activeDepthIndex: 0,
      },
    ],
    activeMineshaftIndex: 0,
    ageResources: {
      coal: 0,
      oil: 0,
      copper: 0,
      superalloy: 0,
    },
    currentAge: 'Mechanical',
    station: null,
  };
}

export function getMinerCost(activeMine: MineDepth | null): number {
  return Math.floor(BASE_MINER_COST * Math.pow(1.5, activeMine?.miners.length ?? 0));
}

export function canBuyMiner(money: number, activeMine: MineDepth | null): boolean {
  return money >= getMinerCost(activeMine);
}

export function buyMiner(money: number, activeMine: MineDepth | null): BuyMinerResult {
  if (!activeMine) {
    return { ok: false, message: 'No active mine', minerCost: getMinerCost(activeMine) };
  }

  const minerCost = getMinerCost(activeMine);

  if (money < minerCost) {
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

  activeMine.miners.push({
    level: 1,
    tileIndex: freeIndices[0],
    facing: 0,
    progress: 0,
  });

  return { ok: true, minerCost, nextMoney: money - minerCost };
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

export function digDeeper(worldSeed: string, resetCount: number, activeShaftIndex: number, activeMineshaft: Mineshaft | null): ActionResult {
  if (!activeMineshaft) {
    return { ok: false, message: 'No active shaft expansion' };
  }

  const activeMine = activeMineshaft.mineDepths[activeMineshaft.activeDepthIndex];
  if (!activeMine) {
    return { ok: false, message: 'No active mine depth' };
  }

  if (getClearStatus(activeMine) !== 'hard') {
    return { ok: false, message: 'Clear all rubble and dirt first!' };
  }

  const nextDepth = activeMine.depth + 1;
  const nextMine = generatePlot(worldSeed, resetCount, nextDepth, activeShaftIndex);

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

  activeMineshaft.mineDepths.push(nextMine);
  activeMineshaft.activeDepthIndex = activeMineshaft.mineDepths.length - 1;
  activeMineshaft.selectedMiner = null;
  activeMineshaft.draggedMiner = null;

  return { ok: true };
}

function resetMineshaftSelection(mineshaft: Mineshaft) {
  mineshaft.selectedMiner = null;
  mineshaft.draggedMiner = null;
}

export function handleNextShaftAction(ctx: ShaftNavigationContext): ShaftNavigationResult {
  const { activeMineshaft, activeMine, activeShaftIndex, shaftsLength, money, maxShafts } = ctx;

  if (!activeMineshaft || !activeMine) {
    return { ok: false, message: 'No active shaft context' };
  }

  if (activeMine.depth > 0) {
    activeMineshaft.activeDepthIndex = 0;
    resetMineshaftSelection(activeMineshaft);
    return { ok: true };
  }

  if (getClearStatus(activeMine) !== 'soft') {
    return { ok: false, message: 'Clear all of the rubble first!' };
  }

  const nextIndex = activeShaftIndex + 1;
  if (nextIndex < shaftsLength) {
    return { ok: true, nextActiveShaftIndex: nextIndex };
  }

  if (money < BASE_SHAFT_COST) {
    return { ok: false, message: 'Not enough money for a new shaft!' };
  }

  if (maxShafts < nextIndex) {
    return { ok: false, message: 'You reached the shaft limit!' };
  }

  return { ok: true, nextActiveShaftIndex: nextIndex, nextMoney: money - BASE_SHAFT_COST };
}

export function handlePreviousShaftAction(activeShaftIndex: number): ActionResult {
  if (activeShaftIndex === 0) {
    return { ok: false, message: 'Already at the first shaft' };
  }

  return { ok: true };
}

// PROVISIONAL build economy (tune later)
export const BUILD_COAL_COST = 10;
export const BUILD_MONEY_COST = 100;

/** Idempotent: ensure a discovered plot cell has a scaffold entry in the map. */
export function ensurePlotScaffold(cellId: string): void {
  if (!plotsStore.has(cellId)) {
    plotsStore.set(cellId, createScaffoldPlot(cellId));
  }
}

/** Spend accumulated coal + money to Build an under-construction plot. */
export function tryBuildPlot(
  cellId: string,
  seed: string,
  resetCount: number,
  money: number,
): { ok: boolean; nextMoney: number } {
  const plot = plotsStore.get(cellId);
  if (!plot || isPlotBuilt(plot)) return { ok: false, nextMoney: money };
  if (plot.ageResources.coal < BUILD_COAL_COST || money < BUILD_MONEY_COST) {
    return { ok: false, nextMoney: money };
  }
  plotsStore.set(cellId, buildPlot(cellId, seed, resetCount));
  return { ok: true, nextMoney: money - BUILD_MONEY_COST };
}

export function handleBuyStationAction(args: { stationUnlocked: boolean; money: number; stationCost: number }): ActionResult {
  if (!args.stationUnlocked) {
    return { ok: false, message: 'Station is locked' };
  }

  if (args.money < args.stationCost) {
    return { ok: false, message: 'Not enough money for a station!' };
  }

  return { ok: true };
}
