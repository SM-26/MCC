// src/logic/app/navigationStore.svelte.ts

import type { NavigationState, TabId } from './navigationTypes';
import { createDefaultNavigationState, isTabId } from './navigationTypes';

function createDefaultNavigationStoreState(): NavigationState {
  return createDefaultNavigationState();
}

export function createNavigationStore(initial?: Partial<NavigationState>) {
  const state = $state<NavigationState>({
    ...createDefaultNavigationStoreState(),
    ...initial,
    tabs: initial?.tabs ? [...initial.tabs] : [...createDefaultNavigationState().tabs],
  });

  return {
    get current() {
      return state;
    },

    reset() {
      Object.assign(state, createDefaultNavigationStoreState());
    },

    replace(next: NavigationState) {
      Object.assign(state, next);
    },

    setActiveTab(tab: TabId): boolean {
      if (!isTabId(tab)) {
        return false;
      }

      state.activeTab = tab;
      return true;
    },

    setTabs(tabs: TabId[]) {
      state.tabs = [...tabs];
    },

    setShowLabels(value: boolean) {
      state.showLabels = value;
    },

    setShowEmojis(value: boolean) {
      state.showEmojis = value;
    },

    setShowActiveLabel(value: boolean) {
      state.showActiveLabel = value;
    },
  };
}

export const navigation = createNavigationStore();
