// src/station/carts.ts

import { Station } from '../core/types/state';

export const CART_TYPES = {
    passenger: { name: 'Passenger Cart', category: 'passenger', baseCost: 75 },
    doubleDecker: { name: 'Double Decker', category: 'passenger', baseCost: 150 },
    luxury: { name: 'Luxury Cart', category: 'passenger', baseCost: 250 },
    cargo: { name: 'Cargo Cart', category: 'cargo', baseCost: 100 }
} as const;

export function getCartCost(cartType: string, ownedCount: number): number {
    const type = CART_TYPES[cartType];
    return Math.floor(type.baseCost * Math.pow(1.1, ownedCount));
}

export function buyCart(station: Station, cartType: string): void {
    const cost = getCartCost(cartType, station.trainyardInventory.carts[cartType]);

    if (station.money < cost) throw new Error('Not enough money');

    station.money -= cost;
    station.trainyardInventory.carts[cartType] =
        (station.trainyardInventory.carts[cartType] || 0) + 1;
}

export function removeCart(train: Train, cartType: string): void {
    const slot = train.carts.find(slot => slot.cartType === cartType);

    if (!slot || slot.count <= 0) return;

    slot.count--;

    if (slot.count === 0) {
        train.carts = train.carts.filter(slot => slot.cartType !== cartType);
    }
}
