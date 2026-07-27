// /src/logic/mine/mineAction.ts
import { log } from '../../lib/logger';
import { gameState } from '../app/gameState.svelte';
import { buildPlot, generatePlot, getClearStatus } from '../mine/mineGen';
import { getMaxDepthForAge, getNextAge } from './ageProgression';
import { createScaffoldPlot, getMineDepthByDepth, isPlotBuilt } from './mineTypes';
import type { Ages, MineDepthState as MineDepth, Miner, Mineshaft } from './mineTypes';
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
  maxShafts: number;
  activeShaftIndex: number;
  cellId: string;
  activeMineshaft: Mineshaft | null;
  activeMine: MineDepth | null;
}

export interface ShaftNavigationResult extends ActionResult {
  nextActiveShaftIndex?: number;
}

export function getMinerCost(activeMine: MineDepth | null): number {
  return Math.floor(BASE_MINER_COST * Math.pow(1.5, activeMine?.miners.length ?? 0));
}

export function canBuyMiner(money: number, activeMine: MineDepth | null): boolean {
  return money >= getMinerCost(activeMine);
}

/**
 * Drop a miner on the first free empty tile. Returns false when the depth is
 * full — the caller decides whether that is an error or a no-op.
 * Placement only: charging is the caller's business.
 */
export function placeMiner(activeMine: MineDepth | null, level = 1): boolean {
  if (!activeMine) {
    return false;
  }

  const emptyIndices = activeMine.tiles
    .flat()
    .map((tile, index) => (tile.type === 'empty' ? index : -1))
    .filter((index) => index !== -1);

  const occupiedIndices = new Set(activeMine.miners.map((miner) => miner.tileIndex));
  const freeIndices = emptyIndices.filter((index) => !occupiedIndices.has(index));

  if (freeIndices.length === 0) {
    return false;
  }

  activeMine.miners.push({
    level,
    tileIndex: freeIndices[0],
    facing: 0,
    progress: 0,
  });

  return true;
}

export function buyMiner(money: number, activeMine: MineDepth | null): BuyMinerResult {
  if (!activeMine) {
    return { ok: false, message: 'No active mine', minerCost: getMinerCost(activeMine) };
  }

  const minerCost = getMinerCost(activeMine);

  if (money < minerCost) {
    return { ok: false, message: 'Not enough money!', minerCost };
  }

  if (!placeMiner(activeMine)) {
    return { ok: false, message: 'No room!', minerCost };
  }

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

export function digDeeper(worldSeed: string, resetCount: number, activeShaftIndex: number, activeMineshaft: Mineshaft | null, currentAge: Ages): ActionResult {
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
  // The age caps how deep you may go. It is a ceiling only — advancing never
  // requires reaching it, since ore pools across shafts.
  if (nextDepth > getMaxDepthForAge(currentAge)) {
    return { ok: false, message: `Advance to ${getNextAge(currentAge)} to dig deeper` };
  }

  const nextMine = generatePlot(worldSeed, resetCount, nextDepth, activeShaftIndex);

  const validMinerTiles = new Set(
    nextMine.tiles
      .flat()
      .map((tile, index) => (tile.type === 'empty' ? index : -1))
      .filter((index) => index !== -1),
  );

  if (activeMine.miners.length > validMinerTiles.size) {
    return { ok: false, message: 'Not enough room below - merge miners before digging deeper!' };
  }

  const freeTiles = [...validMinerTiles].filter(
    (index) => !activeMine.miners.some((miner) => validMinerTiles.has(miner.tileIndex) && miner.tileIndex === index),
  );

  nextMine.miners = activeMine.miners.map((miner) => ({
    ...miner,
    tileIndex: validMinerTiles.has(miner.tileIndex) ? miner.tileIndex : (freeTiles.shift() ?? 0),
  }));

  activeMineshaft.mineDepths.push(nextMine);
  activeMineshaft.activeDepthIndex = activeMineshaft.mineDepths.length - 1;
  activeMineshaft.selectedMiner = null;
  activeMineshaft.draggedMiner = null;

  return { ok: true };
}

export function handleNextShaftAction(ctx: ShaftNavigationContext): ShaftNavigationResult {
  const { activeMineshaft, activeMine, activeShaftIndex, cellId, maxShafts, worldSeed, resetCount } = ctx;
  const plot = plotsStore.get(cellId);

  if (!plot || !activeMineshaft || !activeMine) {
    return { ok: false, message: 'No active shaft context' };
  }

  // Gate on this shaft's surface, not the depth you happen to be standing on.
  // Digging down requires a hard-clear, so past depth 0 this is always satisfied —
  // otherwise arriving at a fresh depth would block you on rubble you just created.
  //
  // Soft OR hard — hard-cleared means the dirt is gone too, which is strictly
  // more cleared. Gating on 'soft' alone soft-locked a fully mined-out surface.
  const surface = getMineDepthByDepth(activeMineshaft, 0) ?? activeMine;
  if (getClearStatus(surface) === 'none') {
    return { ok: false, message: 'Clear all of the rubble first!' };
  }

  const nextIndex = activeShaftIndex + 1;
  if (nextIndex < plot.mineshafts.length) {
    plotsStore.setActiveMineshaftIndex(cellId, nextIndex);
    return { ok: true, nextActiveShaftIndex: nextIndex };
  }

  // Limit before payment — spendMoney is the commit point, nothing may fail after it.
  if (maxShafts < nextIndex) {
    return { ok: false, message: 'You reached the shaft limit!' };
  }

  if (!gameState.spendMoney(BASE_SHAFT_COST)) {
    return { ok: false, message: 'Not enough money for a new shaft!' };
  }

  // ponytail: leans on addMineshaft already setting activeMineshaftIndex to the appended shaft.
  // Set it explicitly here if addMineshaft ever stops doing that.
  plotsStore.addMineshaft(cellId, { mineDepths: [generatePlot(worldSeed, resetCount, 0, nextIndex)] });
  log.info('mineActions', `bought shaft ${nextIndex} on ${cellId}`);

  return { ok: true, nextActiveShaftIndex: nextIndex };
}

/** Owns the move, like handleNextShaftAction — returning an index the caller had
 *  to apply is what left this button doing nothing at all. */
export function handlePreviousShaftAction(cellId: string, activeShaftIndex: number): ShaftNavigationResult {
  if (activeShaftIndex === 0) {
    return { ok: false, message: 'Already at the first shaft' };
  }

  const previousIndex = activeShaftIndex - 1;
  plotsStore.setActiveMineshaftIndex(cellId, previousIndex);

  return { ok: true, nextActiveShaftIndex: previousIndex };
}

// PROVISIONAL build economy (tune later)
export const BUILD_COAL_COST = 10;
export const BUILD_MONEY_COST = 100;

/** Idempotent: ensure a discovered plot cell has a scaffold entry in the map. */
export function ensurePlotScaffold(cellId: string): void {
  if (!plotsStore.has(cellId)) {
    plotsStore.set(cellId, createScaffoldPlot());
  }
}

/** Spend accumulated coal + money to Build an under-construction plot. */
export function tryBuildPlot(cellId: string, seed: string, resetCount: number, money: number): { ok: boolean; nextMoney: number } {
  const plot = plotsStore.get(cellId);
  if (!plot || isPlotBuilt(plot)) {
    return { ok: false, nextMoney: money };
  }
  if (plot.ageResources.coal < BUILD_COAL_COST || money < BUILD_MONEY_COST) {
    return { ok: false, nextMoney: money };
  }
  plotsStore.set(cellId, buildPlot(cellId, seed, resetCount));
  return { ok: true, nextMoney: money - BUILD_MONEY_COST };
}
