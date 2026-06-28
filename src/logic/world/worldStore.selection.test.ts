// src/logic/world/worldStore.selection.test.ts
import { describe, it, expect } from 'vitest';
import { createWorldStore } from './worldStore.svelte';

describe('worldStore selection', () => {
  it('sets and reads the active plot cell id', () => {
    const store = createWorldStore({
      cells: [{ id: '0,0', name: 'Home', type: 'plot', q: 0, r: 0, ring: 0, discovered: true }],
    });
    store.setActivePlotCellId('0,0');
    expect(store.current.activePlotCellId).toBe('0,0');
    expect(store.activePlotCell?.id).toBe('0,0');
  });

  it('tracks inspection independently of activation', () => {
    const store = createWorldStore({
      cells: [{ id: '1,0', name: 'City', type: 'city', q: 1, r: 0, ring: 1, discovered: true }],
    });
    store.setInspectedCellId('1,0');
    expect(store.current.inspectedCellId).toBe('1,0');
    expect(store.current.activePlotCellId).toBeNull();
  });
});
