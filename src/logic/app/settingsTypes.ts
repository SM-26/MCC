// src/logic/app/settingsTypes.ts

import type { NavPosition, TabId } from './navigationTypes';

export type ThemeMode = 'dark' | 'light' | 'system' | 'user';
export type DefaultView = 'world' | 'last-active';

export interface SettingsState {
  navbarPosition: NavPosition;
  defaultView: DefaultView;
  devMode: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  theme: ThemeMode;
  userColor: string; // hex, drives the theme colour in 'user' mode
  worldSeed: string;
}
export function createDefaultSettingsState(): SettingsState {
  return {
    navbarPosition: 'top',
    defaultView: 'world',
    devMode: false,
    soundEnabled: false,
    notificationsEnabled: false,
    theme: 'system',
    userColor: '#14213d',
    worldSeed: '123456',
  };
}

export function resolveInitialTab(settings: SettingsState, lastActiveTab?: TabId | null): TabId {
  if (settings.defaultView === 'last-active' && lastActiveTab) {
    return lastActiveTab;
  }

  return 'world';
}
