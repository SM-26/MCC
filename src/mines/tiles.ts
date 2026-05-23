// src/mines/tiles.ts

import { Tile } from '../core/types/state';

export function initializeTiles(plotDepth: number, tileCount: number = 25): Tile[] {
  const tiles: Tile[] = [];
  
  for (let i = 0; i < tileCount; i++) {
    const level = plotDepth;
    
    // Determine terrain type based on depth with weighted mixing
    let primaryType: string, secondaryType: string;
    let weightPrimary = 0.5;
    
    if (level <= 5) {
      // Ground to level 5: mixed rubble/dirt
      primaryType = 'rubble';
      secondaryType = 'dirt';
      // Weight shifts toward rubble at shallower depths
      weightPrimary = Math.max(0.3, 0.7 - (level - 1) * 0.05);
    } else if (level <= 10) {
      // Level 6-10: dirt and oil
      primaryType = 'oil';
      secondaryType = 'dirt';
      weightPrimary = Math.max(0.3, 0.7 - (level - 5) * 0.05);
    } else if (level <= 15) {
      // Level 11-15: dirt and copper
      primaryType = 'copper';
      secondaryType = 'dirt';
      weightPrimary = Math.max(0.3, 0.7 - (level - 10) * 0.05);
    } else if (level <= 20) {
      // Level 16-20: dirt and super-alloy
      primaryType = 'super-alloy';
      secondaryType = 'dirt';
      weightPrimary = Math.max(0.3, 0.7 - (level - 15) * 0.05);
    } else {
      // Level 21+: mixed all resources
      primaryType = 'oil';
      secondaryType = 'copper';
      weightPrimary = 0.5;
    }
    
    // Determine actual type based on weight
    const isPrimary = Math.random() < weightPrimary;
    const type = isPrimary ? primaryType : secondaryType;
    const resourceType = type === 'dirt' ? null : type;
    
    // HP scales with depth
    const isResource = type !== 'dirt';
    const baseHp = isResource ? (50 + Math.abs(level) * 25) : (20 + Math.abs(level) * 10);
    
    tiles.push({
      level,
      type,
      hp: 0,
      maxHp: 0,
      value: getResourceValue(type),
      resourceType
    });
  }
  
  return tiles;
}

export function getResourceValue(resource: string): number {
  const values: Record<string, number> = {
    'rubble': 5,
    'dirt': 1,
    'coal': 2,
    'oil': 2,
    'copper': 3,
    'super-alloy': 5
  };
  return values[resource] || 1;
}
