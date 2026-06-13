import type { MineDepth, MineTile } from '../types';

export interface MineTickResult {
  didClearTile: boolean;
  didEarnMoney: boolean;
  moneyEarned: number;
}

export function runMiningTick(activeMine: MineDepth | null, currentMoney: number): MineTickResult & { nextMoney: number } {
  if (!activeMine) {
    return {
      didClearTile: false,
      didEarnMoney: false,
      moneyEarned: 0,
      nextMoney: currentMoney,
    };
  }

  let didClearTile = false;
  let didEarnMoney = false;
  let moneyEarned = 0;

  activeMine.miners.forEach((miner) => {
    const row = Math.floor(miner.tileIndex / activeMine.cols);
    const col = miner.tileIndex % activeMine.cols;

    const directions: Array<readonly [number, number]> = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    const targets: { r: number; c: number; tile: MineTile }[] = [];

    for (const [dr, dc] of directions) {
      const nextRow = row + dr;
      const nextCol = col + dc;

      if (nextRow >= 0 && nextRow < activeMine.rows && nextCol >= 0 && nextCol < activeMine.cols) {
        const tile = activeMine.tiles[nextRow][nextCol];

        if (tile.hp > 0 && tile.type !== 'blocker' && tile.type !== 'empty') {
          targets.push({ r: nextRow, c: nextCol, tile });
        }
      }
    }

    targets.sort((a, b) => b.tile.value - a.tile.value);

    if (targets.length === 0) {
      return;
    }

    const target = targets[0];
    target.tile.hp -= miner.level;

    if (target.tile.hp <= 0) {
      target.tile.hp = 0;

      if (target.tile.value > 0) {
        moneyEarned += target.tile.value;
        didEarnMoney = true;
      }

      target.tile.type = 'empty';
      target.tile.resourceType = 'none';
      didClearTile = true;
    }
  });

  return {
    didClearTile,
    didEarnMoney,
    moneyEarned,
    nextMoney: currentMoney + moneyEarned,
  };
}
