// src/logic/station/stationUi.test.ts
import { describe, it, expect } from 'vitest';
import { createDefaultStationUiState, createStationUiStore } from './stationUi.svelte';

describe('stationUi defaults', () => {
  it('starts on the dashboard with the yard closed', () => {
    const ui = createStationUiStore();
    expect(ui.current).toEqual({ mode: 'dashboard', yard: 'closed', yardTab: 'engines' });
  });
});

describe('stationUi sub-view transitions', () => {
  it('goes dashboard → platform → back', () => {
    const ui = createStationUiStore();

    ui.showPlatform();
    expect(ui.current.mode).toBe('platform');

    ui.showDashboard();
    expect(ui.current.mode).toBe('dashboard');
  });

  it('leaves the yard alone when a platform with a train is opened', () => {
    const ui = createStationUiStore();
    ui.showPlatform();
    expect(ui.current.yard).toBe('closed');
  });

  it('opens the yard at peek when an empty platform is opened', () => {
    const ui = createStationUiStore();

    ui.showPlatform({ withYard: true });

    expect(ui.current.mode).toBe('platform');
    expect(ui.current.yard).toBe('peek');
  });
});

describe('stationUi yard transitions', () => {
  it('steps closed → peek → full → closed', () => {
    const ui = createStationUiStore();
    expect(ui.current.yard).toBe('closed');

    ui.openYard('peek');
    expect(ui.current.yard).toBe('peek');

    ui.openYard('full');
    expect(ui.current.yard).toBe('full');

    ui.closeYard();
    expect(ui.current.yard).toBe('closed');
  });

  it('openYardOn jumps to a tab and expands in one step', () => {
    const ui = createStationUiStore();

    ui.openYardOn('carts');

    expect(ui.current.yardTab).toBe('carts');
    expect(ui.current.yard).toBe('full');
  });

  it('setYardTab switches tab without changing height', () => {
    const ui = createStationUiStore();
    ui.openYard('peek');

    ui.setYardTab('assigned');

    expect(ui.current.yardTab).toBe('assigned');
    expect(ui.current.yard).toBe('peek');
  });
});

describe('stationUi reset', () => {
  it('restores every field, so reopening the tab lands on the dashboard', () => {
    const ui = createStationUiStore();
    ui.showPlatform({ withYard: true });
    ui.openYardOn('assigned');

    ui.reset();

    expect(ui.current).toEqual(createDefaultStationUiState());
  });
});
