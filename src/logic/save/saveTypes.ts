// src/logic/save/saveTypes.ts

import type { EngineeringState } from '../engineering/engineeringTypes';
import type { PlotState } from '../mine/mineTypes';
import type { SettingsState } from '../app/settingsTypes';
import type { TabId } from '../app/navigationTypes';
import type { WorldState } from '../world/worldTypes';

export interface SaveMetadata {
    saveVersion: string;
    saveCommitHash: string;
    savedAt: number; // unix ms timestamp
}

export interface SavedNavigation {
    activeTab: TabId;
}

export interface GameState {
    // Player data
    money: number;

    // Feature state
    world: WorldState;
    plots: PlotState[];
    engineering: EngineeringState;
    settings: SettingsState;
}

export type PersistedGameState = GameState & {
    navigation: SavedNavigation;
};

export interface SaveFile {
    meta: SaveMetadata;
    data: PersistedGameState;
}