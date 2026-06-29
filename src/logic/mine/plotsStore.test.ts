// src/logic/mine/plotsStore.test.ts
import { describe, it, expect } from 'vitest';
import { createPlotsStore } from './plotsStore.svelte';
import { createScaffoldPlot } from './mineTypes';

describe('plotsStore', () => {
  it('stores and reads a plot by cell id', () => {
    const store = createPlotsStore();
    store.set('0,0', createScaffoldPlot('0,0'));
    expect(store.has('0,0')).toBe(true);
    expect(store.get('1,1')).toBeNull();
  });

  it('mutates the active plot in place (no copy-back needed)', () => {
    const store = createPlotsStore({ '0,0': createScaffoldPlot('0,0') });
    store.addMineshaft('0,0');
    store.addMineDepth('0,0', 0);
    const ok = store.addMiner('0,0');
    expect(ok).toBe(true);
    // The scaffold starts with mineshafts[0] (empty depths); addMineshaft pushes
    // a new default shaft at index 1 which becomes active. Correction vs brief
    // skeleton: brief says [0] but scaffold already occupies that slot — [1] is
    // where the new shaft (and the miner) actually lands.
    expect(store.get('0,0')?.mineshafts[1].mineDepths[0].miners.length).toBe(1);
  });
});
