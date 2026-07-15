// src/logic/mine/mineTick.ts
import type { AgeResources, MineDepthState as MineDepth, MineTile } from './mineTypes';

type MineTarget = { tile: MineTile };

const ORTHOGONAL_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export interface MineTickResult {
  didClearTile: boolean;
  didEarnMoney: boolean;
  moneyEarned: number;
  resourcesEarned: Partial<Record<keyof AgeResources, number>>;
}

function getMineTargetsForMiner(activeMine: MineDepth, tileIndex: number): MineTarget[] {
  const row = Math.floor(tileIndex / activeMine.cols);
  const col = tileIndex % activeMine.cols;

  const targets: MineTarget[] = [];

  for (const [dr, dc] of ORTHOGONAL_DIRECTIONS) {
    const nextRow = row + dr;
    const nextCol = col + dc;

    if (nextRow < 0 || nextRow >= activeMine.rows || nextCol < 0 || nextCol >= activeMine.cols) {
      continue;
    }

    const tile = activeMine.tiles[nextRow][nextCol];

    if (tile.hp <= 0 || tile.type === 'blocker' || tile.type === 'empty') {
      continue;
    }

    targets.push({ tile });
  }

  targets.sort((a, b) => b.tile.value - a.tile.value);
  return targets;
}

interface DamageResult {
  earned: number; // money
  resource: keyof AgeResources | null;
  resourceEarned: number;
  cleared: boolean;
}

function applyMinerDamageToTarget(miner: { level: number }, target: MineTarget): DamageResult {
  target.tile.hp -= miner.level;

  if (target.tile.hp > 0) {
    return { earned: 0, resource: null, resourceEarned: 0, cleared: false };
  }

  target.tile.hp = 0;

  const value = target.tile.value > 0 ? target.tile.value : 0;
  // resourceType routes the payout: 'money'/'none' → cash; an ore type → that bucket.
  const rt = target.tile.resourceType;
  const isOre = rt === 'coal' || rt === 'oil' || rt === 'copper' || rt === 'superalloy';

  target.tile.type = 'empty';
  target.tile.resourceType = 'none';

  return {
    earned: isOre ? 0 : value,
    resource: isOre ? rt : null,
    resourceEarned: isOre ? value : 0,
    cleared: true,
  };
}

export function runMiningTick(activeMine: MineDepth | null, currentMoney: number): MineTickResult & { nextMoney: number } {
  if (!activeMine) {
    return {
      didClearTile: false,
      didEarnMoney: false,
      moneyEarned: 0,
      resourcesEarned: {},
      nextMoney: currentMoney,
    };
  }

  let didClearTile = false;
  let didEarnMoney = false;
  let moneyEarned = 0;
  const resourcesEarned: Partial<Record<keyof AgeResources, number>> = {};

  activeMine.miners.forEach((miner) => {
    const targets = getMineTargetsForMiner(activeMine, miner.tileIndex);
    const target = targets[0];

    if (!target) {
      return;
    }

    const result = applyMinerDamageToTarget(miner, target);

    if (result.earned > 0) {
      moneyEarned += result.earned;
      didEarnMoney = true;
    }

    if (result.resource) {
      resourcesEarned[result.resource] = (resourcesEarned[result.resource] ?? 0) + result.resourceEarned;
    }

    if (result.cleared) {
      didClearTile = true;
    }
  });

  return {
    didClearTile,
    didEarnMoney,
    moneyEarned,
    resourcesEarned,
    nextMoney: currentMoney + moneyEarned,
  };
}
