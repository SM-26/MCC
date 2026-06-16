// src/logic/app/navigationTypes.ts

export const TabsList = ['world', 'mine', 'station', 'engineering', 'settings'] as const;
export type TabId = (typeof TabsList)[number];
export type NavPosition = 'top' | 'bottom' | 'left' | 'right' | 'hidden';
export interface NavigationState {
  activeTab: TabId;
  tabs: TabId[]; // default: [...TabsList]
  showLabels: boolean; // desktop mode, text labels
  showEmojis: boolean; // emoji fallback
  showActiveLabel: boolean; // can be screen-size dependent
}
export function isTabId(value: string): value is TabId {
  return TabsList.includes(value as TabId);
}
export function createDefaultNavigationState(): NavigationState {
  return {
    activeTab: 'world',
    tabs: [...TabsList],
    showLabels: true,
    showEmojis: true,
    showActiveLabel: true,
  };
}

export function createDefaultSavedNavigation(): NavigationState {
  return createDefaultNavigationState();
}
