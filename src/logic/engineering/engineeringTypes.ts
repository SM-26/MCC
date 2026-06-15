// src/logic/engineering/engineeringTypes.ts

export interface EngineeringState {
    engineeringIdeas: number; // EI points, default: 0
    resetCount: number; // nuke count, default: 0
    maxNorthExpansions: number; // 0 = I, 1 = II, default: 0
    maxUndergroundLevels: number; // default: 0
}
export function createDefaultEngineeringState(): EngineeringState {
    return {
        engineeringIdeas: 0,
        resetCount: 0,
        maxNorthExpansions: 0,
        maxUndergroundLevels: 0,
    };
}

export function canUnlockNorthExpansion(
    engineeringIdeas: EngineeringState,
    northExpansionIndex: number,
): boolean {
    return northExpansionIndex <= engineeringIdeas.maxNorthExpansions;
}

export function canUnlockUndergroundLevel(
    engineeringIdeas: EngineeringState,
    level: number,
): boolean {
    return level <= engineeringIdeas.maxUndergroundLevels;
}