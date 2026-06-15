// /src/logic/mine/mineAction.ts
import { generatePlot, getClearStatus } from '../mine/mineGen';
import type { MineDepthState as MineDepth, Miner, PlotState, NorthExpansion } from './mineTypes';

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
  activeNorthExpansion: NorthExpansion | null;
  activeMine: MineDepth | null;
}

export interface ShaftNavigationResult extends ActionResult {
  nextActiveShaftIndex?: number;
  nextMoney?: number;
}

export function createDefaultPlotState(worldSeed: string, resetCount: number, shaftIndex = 0, shaftName = 'Shaft I'): PlotState {
  return {
    plotId: `${worldSeed}-${shaftIndex}`,
    plotName: shaftName,
    northExpansions: [
      {
        mineDepths: [generatePlot(worldSeed, resetCount, 0, shaftIndex)],
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

export function digDeeper(worldSeed: string, resetCount: number, activeShaftIndex: number, activeNorthExpansion: NorthExpansion | null): ActionResult {
  if (!activeNorthExpansion) {
    return { ok: false, message: 'No active shaft expansion' };
  }

  const activeMine = activeNorthExpansion.mineDepths[activeNorthExpansion.activeDepthIndex];
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

  activeNorthExpansion.mineDepths.push(nextMine);
  activeNorthExpansion.activeDepthIndex = activeNorthExpansion.mineDepths.length - 1;
  activeNorthExpansion.selectedMiner = null;
  activeNorthExpansion.draggedMiner = null;

  return { ok: true };
}

function resetNorthExpansionSelection(northExpansion: NorthExpansion) {
  northExpansion.selectedMiner = null;
  northExpansion.draggedMiner = null;
}

export function handleNextShaftAction(ctx: ShaftNavigationContext): ShaftNavigationResult {
  const { activeNorthExpansion, activeMine, activeShaftIndex, shaftsLength, money, maxShafts } = ctx;

  if (!activeNorthExpansion || !activeMine) {
    return { ok: false, message: 'No active shaft context' };
  }

  if (activeMine.depth > 0) {
    activeNorthExpansion.activeDepthIndex = 0;
    resetNorthExpansionSelection(activeNorthExpansion);
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

export function handleBuyStationAction(args: { stationUnlocked: boolean; money: number; stationCost: number }): ActionResult {
  if (!args.stationUnlocked) {
    return { ok: false, message: 'Station is locked' };
  }

  if (args.money < args.stationCost) {
    return { ok: false, message: 'Not enough money for a station!' };
  }

  return { ok: true };
}
