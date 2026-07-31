// src/logic/station/stationSprites.ts
//
// Static sprite lookups, nothing else. Vite fingerprints each import and hands
// back a based URL, which is what keeps these working under GitHub Pages'
// /MCC/ subpath — never build these paths as strings.
//
// Geometry the renderers rely on: engines are 30x20, carts 18x20, wheel centres
// on row 15 for every sprite. That shared baseline is why a consist is just
// sprites butted together with no gap and no margin.

import type { Ages } from '../mine/mineTypes';
import type { CartType } from './stationTypes';

import EngineMechanical from '../../assets/engine-mechanical.png';
import EngineSteam from '../../assets/engine-steam.png';
import EngineDiesel from '../../assets/engine-diesel.png';
import EngineElectric from '../../assets/engine-electric.png';
import EngineMaglev from '../../assets/engine-maglev.png';

import CartSimple from '../../assets/cart-simple.png';
import CartDoubleDeckers from '../../assets/cart-double-deckers.png';
import CartLuxury from '../../assets/cart-luxury.png';
import CartCargo from '../../assets/cart-cargo.png';
import CartBetterCargo from '../../assets/cart-better-cargo.png';
import CartBestCargo from '../../assets/cart-best-cargo.png';

export const ENGINE_SPRITE: Record<Ages, string> = {
  Mechanical: EngineMechanical,
  Steam: EngineSteam,
  Diesel: EngineDiesel,
  Electric: EngineElectric,
  Maglev: EngineMaglev,
};

export const CART_SPRITE: Record<CartType, string> = {
  simple: CartSimple,
  'double deckers': CartDoubleDeckers,
  luxury: CartLuxury,
  cargo: CartCargo,
  'better cargo': CartBetterCargo,
  'best cargo': CartBestCargo,
};

/** Native sprite pixel dimensions — scale by integers only, or they blur. */
export const SPRITE_SIZE = {
  engine: { width: 30, height: 20 },
  cart: { width: 18, height: 20 },
} as const;
