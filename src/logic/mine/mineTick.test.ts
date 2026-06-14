import { describe, it, expect } from 'vitest';
import type { MineDepth, MineTile, Miner } from '../../types';
import { runMiningTick } from './mineTick';

function makeTile(overrides: Partial<MineTile> = {}): MineTile {
  return {
    type: 'dirt',
    level: 1,
    hp: 5,
    maxHp: 5,
    value: 0,
    resourceType: 'none',
    ...overrides,
  };
}

function makeMiner(overrides: Partial<Miner> = {}): Miner {
  return {
    level: 1,
    tileIndex: 4,
    facing: 0,
    progress: 0,
    ...overrides,
  };
}

function makeEmptyTiles(rows = 3, cols = 3): MineTile[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () =>
      makeTile({
        type: 'empty',
        resourceType: 'none',
        hp: 0,
        maxHp: 0,
        value: 0,
      }),
    ),
  );
}

function makeMine(overrides: Partial<MineDepth> = {}): MineDepth {
  const rows = overrides.rows ?? 3;
  const cols = overrides.cols ?? 3;

  return {
    depth: overrides.depth ?? 1,
    rows,
    cols,
    tiles: overrides.tiles ?? makeEmptyTiles(rows, cols),
    miners: overrides.miners ?? [],
  };
}

describe('runMiningTick', () => {
  it('returns unchanged money when there is no active mine', () => {
    const result = runMiningTick(null, 123);

    expect(result).toEqual({
      didClearTile: false,
      didEarnMoney: false,
      moneyEarned: 0,
      nextMoney: 123,
    });
  });

  it('does nothing when a miner has no valid adjacent targets', () => {
    const mine = makeMine({
      miners: [makeMiner()],
    });

    const result = runMiningTick(mine, 50);

    expect(result).toEqual({
      didClearTile: false,
      didEarnMoney: false,
      moneyEarned: 0,
      nextMoney: 50,
    });
  });

  it('damages the highest-value adjacent target first', () => {
    const lowValueTile = makeTile({
      type: 'coal',
      resourceType: 'coal',
      hp: 5,
      maxHp: 5,
      value: 3,
    });

    const highValueTile = makeTile({
      type: 'copper',
      resourceType: 'copper',
      hp: 5,
      maxHp: 5,
      value: 10,
    });

    const tiles = makeEmptyTiles(3, 3);
    tiles[0][1] = highValueTile;
    tiles[1][0] = lowValueTile;

    const mine = makeMine({
      miners: [makeMiner({ tileIndex: 4, level: 2 })],
      tiles,
    });

    const result = runMiningTick(mine, 0);

    expect(highValueTile.hp).toBe(3);
    expect(lowValueTile.hp).toBe(5);
    expect(result).toEqual({
      didClearTile: false,
      didEarnMoney: false,
      moneyEarned: 0,
      nextMoney: 0,
    });
  });

  it('clears a tile and awards money when damage reduces hp to zero', () => {
    const targetTile = makeTile({
      type: 'oil',
      resourceType: 'oil',
      hp: 2,
      maxHp: 2,
      value: 25,
    });

    const tiles = makeEmptyTiles(3, 3);
    tiles[0][1] = targetTile;

    const mine = makeMine({
      miners: [makeMiner({ tileIndex: 4, level: 2 })],
      tiles,
    });

    const result = runMiningTick(mine, 100);

    expect(targetTile.hp).toBe(0);
    expect(targetTile.type).toBe('empty');
    expect(targetTile.resourceType).toBe('none');
    expect(result).toEqual({
      didClearTile: true,
      didEarnMoney: true,
      moneyEarned: 25,
      nextMoney: 125,
    });
  });

  it('clears a zero-value tile without awarding money', () => {
    const targetTile = makeTile({
      type: 'dirt',
      resourceType: 'none',
      hp: 1,
      maxHp: 1,
      value: 0,
    });

    const tiles = makeEmptyTiles(3, 3);
    tiles[0][1] = targetTile;

    const mine = makeMine({
      miners: [makeMiner({ tileIndex: 4, level: 1 })],
      tiles,
    });

    const result = runMiningTick(mine, 7);

    expect(targetTile.hp).toBe(0);
    expect(targetTile.type).toBe('empty');
    expect(targetTile.resourceType).toBe('none');
    expect(result).toEqual({
      didClearTile: true,
      didEarnMoney: false,
      moneyEarned: 0,
      nextMoney: 7,
    });
  });

  it('ignores blocker and empty tiles when choosing targets', () => {
    const validTarget = makeTile({
      type: 'coal',
      resourceType: 'coal',
      hp: 3,
      maxHp: 3,
      value: 9,
    });

    const blockerTile = makeTile({
      type: 'blocker',
      resourceType: 'none',
      hp: 999,
      maxHp: 999,
      value: 0,
    });

    const tiles = makeEmptyTiles(3, 3);
    tiles[0][1] = validTarget;
    tiles[1][0] = blockerTile;
    tiles[1][2] = makeTile({
      type: 'empty',
      resourceType: 'none',
      hp: 0,
      maxHp: 0,
      value: 0,
    });

    const mine = makeMine({
      miners: [makeMiner({ tileIndex: 4, level: 1 })],
      tiles,
    });

    const result = runMiningTick(mine, 0);

    expect(validTarget.hp).toBe(2);
    expect(blockerTile.hp).toBe(999);
    expect(result).toEqual({
      didClearTile: false,
      didEarnMoney: false,
      moneyEarned: 0,
      nextMoney: 0,
    });
  });

  it('does not target tiles outside the mine bounds', () => {
    const targetTile = makeTile({
      type: 'coal',
      resourceType: 'coal',
      hp: 4,
      maxHp: 4,
      value: 6,
    });

    const tiles = makeEmptyTiles(3, 3);
    tiles[0][1] = targetTile;

    const mine = makeMine({
      miners: [makeMiner({ tileIndex: 0, level: 1 })],
      tiles,
    });

    const result = runMiningTick(mine, 20);

    expect(targetTile.hp).toBe(3);
    expect(result).toEqual({
      didClearTile: false,
      didEarnMoney: false,
      moneyEarned: 0,
      nextMoney: 20,
    });
  });

  it('combines money earned from multiple miners in one tick', () => {
    const leftTarget = makeTile({
      type: 'coal',
      resourceType: 'coal',
      hp: 1,
      maxHp: 1,
      value: 4,
    });

    const rightTarget = makeTile({
      type: 'oil',
      resourceType: 'oil',
      hp: 2,
      maxHp: 2,
      value: 7,
    });

    const tiles = makeEmptyTiles(3, 3);
    tiles[1][0] = leftTarget; // row 1, col 0
    tiles[1][2] = rightTarget; // row 1, col 2

    const mine = makeMine({
      miners: [
        makeMiner({ tileIndex: 0, level: 1 }), // row 0, col 0 -> only valid target is leftTarget
        makeMiner({ tileIndex: 2, level: 2 }), // row 0, col 2 -> only valid target is rightTarget
      ],
      tiles,
    });

    const result = runMiningTick(mine, 10);

    expect(leftTarget.hp).toBe(0);
    expect(leftTarget.type).toBe('empty');
    expect(rightTarget.hp).toBe(0);
    expect(rightTarget.type).toBe('empty');

    expect(result).toEqual({
      didClearTile: true,
      didEarnMoney: true,
      moneyEarned: 11,
      nextMoney: 21,
    });
  });
});
