// src/logic/engineering/engineeringStore.svelte.ts

import type { EngineeringState } from './engineeringTypes';
import { createDefaultEngineeringState } from './engineeringTypes';

function clampMin(value: number, min = 0): number {
    return Math.max(min, value);
}

export function createEngineeringStore(initial?: Partial<EngineeringState>) {
    const state = $state<EngineeringState>({
        ...createDefaultEngineeringState(),
        ...initial,
    });

    return {
        get current() {
            return state;
        },

        reset() {
            Object.assign(state, createDefaultEngineeringState());
        },

        replace(next: EngineeringState) {
            Object.assign(state, next);
        },

        setEngineeringIdeas(value: number) {
            state.engineeringIdeas = clampMin(value, 0);
        },

        addEngineeringIdeas(amount = 1) {
            state.engineeringIdeas = clampMin(state.engineeringIdeas + amount, 0);
        },

        spendEngineeringIdeas(amount = 1): boolean {
            if (amount < 0) return false;
            if (state.engineeringIdeas < amount) return false;

            state.engineeringIdeas -= amount;
            return true;
        },

        setResetCount(value: number) {
            state.resetCount = clampMin(value, 0);
        },

        incrementResetCount(amount = 1) {
            state.resetCount = clampMin(state.resetCount + amount, 0);
        },

        setMaxNorthExpansions(value: number) {
            state.maxNorthExpansions = clampMin(value, 0);
        },

        unlockNorthExpansion(amount = 1) {
            state.maxNorthExpansions = clampMin(
                state.maxNorthExpansions + amount,
                0,
            );
        },

        setMaxUndergroundLevels(value: number) {
            state.maxUndergroundLevels = clampMin(value, 0);
        },

        unlockUndergroundLevel(amount = 1) {
            state.maxUndergroundLevels = clampMin(
                state.maxUndergroundLevels + amount,
                0,
            );
        },

        canAffordEngineeringIdeas(cost: number): boolean {
            if (cost < 0) return true;
            return state.engineeringIdeas >= cost;
        },

        canUnlockNorthExpansion(index: number): boolean {
            return index <= state.maxNorthExpansions;
        },

        canUnlockUndergroundLevel(level: number): boolean {
            return level <= state.maxUndergroundLevels;
        },

        applyResetReward(engineeringIdeasGained: number) {
            state.resetCount += 1;
            state.engineeringIdeas = clampMin(
                state.engineeringIdeas + engineeringIdeasGained,
                0,
            );
        },
    };
}

export const engineeringStore = createEngineeringStore();