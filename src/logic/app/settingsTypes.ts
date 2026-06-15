// src/logic/app/settingsTypes.ts

import type { NavPosition, TabId } from './navigationTypes';

export type ThemeMode = 'dark' | 'light' | 'system' | 'user';
export type DefaultView = 'world' | 'last-active';

export interface SettingsState {
    navbarPosition: NavPosition;
    defaultView: DefaultView;
    devMode: boolean; // default: false
    soundEnabled: boolean; // default: true
    notificationsEnabled: boolean; // default: true
    theme: ThemeMode;
    worldSeed: string; // default: ''
}
export function createDefaultSettingsState(): SettingsState {
    return {
        navbarPosition: 'bottom',
        defaultView: 'world',
        devMode: false,
        soundEnabled: true,
        notificationsEnabled: true,
        theme: 'system',
        worldSeed: '',
    };
}

export function resolveInitialTab(
    settings: SettingsState,
    lastActiveTab?: TabId | null,
): TabId {
    if (settings.defaultView === 'last-active' && lastActiveTab) {
        return lastActiveTab;
    }

    return 'world';
}