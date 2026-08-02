// src/logic/station/stationUi.svelte.ts
//
// UI-only state for the Station tab: which part is on screen and how open the
// yard drawer is. Deliberately NOT persisted and not wired into save.svelte.ts,
// reopening the tab should land you on the dashboard, not wherever you happened
// to be. Which *platform* is focused is a different question and stays on the
// persisted `station.activePlatformId`; this store never knows about it.

export type StationMode = 'dashboard' | 'platform';
export type YardHeight = 'closed' | 'peek' | 'full';
export type YardTab = 'engines' | 'carts' | 'assigned';

export interface StationUiState {
  mode: StationMode;
  yard: YardHeight;
  yardTab: YardTab;
}

export function createDefaultStationUiState(): StationUiState {
  return {
    mode: 'dashboard',
    yard: 'closed',
    yardTab: 'engines',
  };
}

export function createStationUiStore(initial?: Partial<StationUiState>) {
  const state = $state<StationUiState>({
    ...createDefaultStationUiState(),
    ...initial,
  });

  return {
    get current() {
      return state;
    },

    reset() {
      Object.assign(state, createDefaultStationUiState());
    },

    showDashboard() {
      state.mode = 'dashboard';
    },

    /**
     * `withYard` is the empty-platform path: a platform with no train has
     * nothing to act on until an engine is placed, so opening one surfaces the
     * pool in the same gesture rather than leaving a dead screen.
     */
    showPlatform(options?: { withYard?: boolean }) {
      state.mode = 'platform';
      if (options?.withYard) {
        state.yard = 'peek';
      }
    },

    openYard(height: Exclude<YardHeight, 'closed'> = 'peek') {
      state.yard = height;
    },

    /** Tapping an empty cart slot jumps straight to the Carts tab, expanded. */
    openYardOn(tab: YardTab, height: Exclude<YardHeight, 'closed'> = 'full') {
      state.yardTab = tab;
      state.yard = height;
    },

    closeYard() {
      state.yard = 'closed';
    },

    setYardTab(tab: YardTab) {
      state.yardTab = tab;
    },
  };
}

export const stationUi = createStationUiStore();
