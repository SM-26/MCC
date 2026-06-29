// src/logic/world/worldTypes.test.ts
import { describe, it, expect } from 'vitest';
import { getActivePlotCell, type WorldState } from './worldTypes';

function makeWorld(partial: Partial<WorldState> = {}): WorldState {
  return {
    cells: [
      { id: '0,0', name: 'Home', type: 'plot', q: 0, r: 0, ring: 0, discovered: true },
    ],
    plots: {},
    activePlotCellId: '0,0',
    inspectedCellId: null,
    ...partial,
  };
}

describe('getActivePlotCell', () => {
  it('returns the cell named by activePlotCellId', () => {
    expect(getActivePlotCell(makeWorld())?.id).toBe('0,0');
  });
  it('returns null when activePlotCellId is null', () => {
    expect(getActivePlotCell(makeWorld({ activePlotCellId: null }))).toBeNull();
  });
});
