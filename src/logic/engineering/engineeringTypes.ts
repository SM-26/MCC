// src/logic/engineering/engineeringTypes.ts

export interface EngineeringState {
  engineeringIdeas: number; // EI points, default: 0
  resetCount: number; // nuke count, default: 0
  maxMineshafts: number; // 0 = I, 1 = II, default: 1 — must match stateFactory
  maxUndergroundLevels: number; // default: 0
}
export function createDefaultEngineeringState(): EngineeringState {
  return {
    engineeringIdeas: 0,
    resetCount: 0,
    maxMineshafts: 1,
    maxUndergroundLevels: 0,
  };
}

export function canUnlockMineshaft(engineeringIdeas: EngineeringState, mineshaftIndex: number): boolean {
  return mineshaftIndex <= engineeringIdeas.maxMineshafts;
}

export function canUnlockUndergroundLevel(engineeringIdeas: EngineeringState, level: number): boolean {
  return level <= engineeringIdeas.maxUndergroundLevels;
}
