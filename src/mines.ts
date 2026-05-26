/**
 * ============================================================================
 * Merge & Choo-Choo - Mines Slice
 * ============================================================================
 * Plot clearing, miner behavior, depth progression, excavation rules.
 * ============================================================================
 */

import { AppState, MinePlot, MineTile, Miner } from '@/types/game';
import { updateGlobalMoneyUI } from './app';
import { saveGameState } from './save';
import { showToast } from './ui';
import { generatePlot } from './gen';

// --- CONSTANTS ---
const GRID_SIZE = 5;
const BASE_MINER_COST = 50;
const RUBBLE_VALUE = 25;
const TICK_RATE = 100;
const OFFLINE_RATE = 0.5;

// --- STATE ---
let touchTargetIdx: number | null = null;
let isMinesInitialized = false;
let isSystemSetup = false;


// --- HELPERS ---

function markDirty(appState: AppState) {
  (appState as any).isDirty = true;
}

function createFloatingText(tileIdx: number, text: string): void {
  const grid = document.getElementById('tile-grid');
  if (!grid) return;
  const tileEl = grid.children[tileIdx] as HTMLElement;
  if (!tileEl) return;
  const rect = tileEl.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'float-text';
  el.textContent = text;
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1750);
}

function handleOfflineProgress(appState: AppState): void {
  const now = Date.now();
  const seconds = (now - appState.mines.lastTick) / 1000;
  if (seconds < 60) return;
  let totalEarned = 0;
  appState.mines.plots.forEach((plot) => {
    const rubbleCount = plot.tiles.filter((t) => t.type === 'rubble').length;
    if (rubbleCount > 0) {
      const power = plot.miners.reduce((acc, m) => acc + Math.pow(2, m.level - 1), 0);
      const earned = power * seconds * 0.1 * OFFLINE_RATE;
      totalEarned += Math.min(earned, rubbleCount * RUBBLE_VALUE);
    }
  });
  appState.money += totalEarned;
}

function updateMinesUIHeaders(appState: AppState): void {
  const plot = appState.mines.plots[appState.mines.activePlot];
  const moneyDisplay = document.getElementById('money-display');
  if (moneyDisplay) moneyDisplay.textContent = `$${Math.floor(appState.money)}`;
  const locText = document.getElementById('loc-text');
  if (locText) locText.textContent = `Plot ${appState.mines.activePlot + 1}, Depth ${plot.depth}`;
  const cleared = plot.tiles.filter((t) => t.type === 'empty').length;
  const clearText = document.getElementById('clear-text');
  if (clearText) clearText.textContent = `Cleared: ${Math.floor((cleared / plot.tiles.length) * 100)}%`;
}

function forceGridResetAndRender(appState: AppState) {
  const grid = document.getElementById('tile-grid');
  if (grid) grid.innerHTML = '';
  renderPlotGrid(appState);
}

function getValidNeighbors(idx: number): number[] {
  const n: number[] = [];
  const x = idx % GRID_SIZE;
  const y = Math.floor(idx / GRID_SIZE);
  if (y > 0) n.push(idx - GRID_SIZE);
  if (x < GRID_SIZE - 1) n.push(idx + 1);
  if (y < GRID_SIZE - 1) n.push(idx + GRID_SIZE);
  if (x > 0) n.push(idx - 1);
  return n;
}

function findTargetTile(miner: Miner, plot: MinePlot): number | null {
  const neighbors = getValidNeighbors(miner.tileIndex);
  const validTargets = neighbors.filter((idx) => plot.tiles[idx].type !== 'empty');
  validTargets.sort((a, b) => plot.tiles[a].hp - plot.tiles[b].hp);
  return validTargets.length > 0 ? validTargets[0] : null;
}

function calculateFacingAngle(from: number, to: number): number {
  const diff = to - from;
  if (diff === -GRID_SIZE) return 0;
  if (diff === 1) return 90;
  if (diff === GRID_SIZE) return 180;
  if (diff === -1) return 270;
  return 0;
}

// --- LOGIC ---

// export async function initMinesSlice(appState: AppState): Promise<void> {
//   if (isMinesInitialized) return;
//   isMinesInitialized = true;

//   if (!appState.mines?.plots?.length) {
//     appState.mines = {
//       activePlot: 0,
//       maxUnlockedPlot: 0,
//       plots: [generatePlot(appState.worldSeed, 0)],
//       selectedMiner: null,
//       draggedMiner: null,
//       lastTick: Date.now()
//     };
//   } else {
//     handleOfflineProgress(appState);
//   }

//   window.addEventListener('touchmove', (e) => handleTouchMove(e, appState), { passive: false });
//   window.addEventListener('touchend', () => handleTouchEnd(appState));
//   bindInputEvents(appState);
//   setInterval(() => gameTick(appState), TICK_RATE);
// }
export async function initMinesSlice(appState: AppState): Promise<void> {
  // 1. Data Initialization: Always run this if plots are empty (e.g., after Reset)
  if (!appState.mines?.plots?.length) {
    appState.mines = {
      activePlot: 0,
      maxUnlockedPlot: 0,
      plots: [generatePlot(appState.worldSeed, 0)],
      selectedMiner: null,
      draggedMiner: null,
      lastTick: Date.now()
    };
  } else {
    handleOfflineProgress(appState);
  }

  // 2. Refresh the UI
  renderPlotGrid(appState);

  // 3. System Setup: Only run once during the app's entire lifetime
  if (!isSystemSetup) {
    isSystemSetup = true;

    window.addEventListener('touchmove', (e) => handleTouchMove(e, appState), { passive: false });
    window.addEventListener('touchend', () => handleTouchEnd(appState));
    bindInputEvents(appState);
    setInterval(() => gameTick(appState), TICK_RATE);
  }
}

function gameTick(appState: AppState): void {
  const now = Date.now();
  const dt = (now - appState.mines.lastTick) / 1000;
  appState.mines.lastTick = now;
  appState.mines.plots.forEach(plot => {
    plot.miners.forEach(miner => updateMinerLogic(miner, plot, dt, appState));
  });
  if (appState.currentTab === 'mines') {
    if (!appState.mines.draggedMiner) renderPlotGrid(appState);
    updateMinesUIHeaders(appState);
  }
}

// function updateMinerLogic(miner: Miner, plot: MinePlot, dt: number, appState: AppState): void {
//   const targetIdx = findTargetTile(miner, plot);
//   if (targetIdx === null) return;

//   const target = plot.tiles[targetIdx];
//   const damage = (1 << (miner.level - 1)) * 5 * dt;

//   miner.facing = calculateFacingAngle(miner.tileIndex, targetIdx);
//   target.hp -= damage;

//   if (target.hp <= 0) {
//     if (target.type === 'rubble') {
//       const value = RUBBLE_VALUE * (plot.depth + 1);
//       appState.money = Math.floor((appState.money + value) * 100) / 100;
//       updateGlobalMoneyUI(appState.money);
//       markDirty(appState);

//       if (appState.mines.plots[appState.mines.activePlot] === plot) {
//         createFloatingText(targetIdx, `+$${value}`);
//       }
//     }
//     target.type = 'empty';
//     target.hp = 0;
//   }
// }

function updateMinerLogic(miner: Miner, plot: MinePlot, dt: number, appState: AppState): void {
  const targetIdx = findTargetTile(miner, plot);
  if (targetIdx === null) return;
  const target = plot.tiles[targetIdx];
  const damage = (1 << (miner.level - 1)) * 5 * dt;
  miner.facing = calculateFacingAngle(miner.tileIndex, targetIdx);
  target.hp -= damage;
  if (target.hp <= 0) {
    if (target.type === 'rubble') {
      appState.money = Math.floor((appState.money + RUBBLE_VALUE * (plot.depth + 1)) * 100) / 100;
      updateGlobalMoneyUI(appState.money);
      createFloatingText(targetIdx, `+$${RUBBLE_VALUE}`);
    }
    target.type = 'empty';
    target.hp = 0;
    markDirty(appState);
  }
}

function executeDropMovement(tileIndex: number, appState: AppState): void {
  const plot = appState.mines.plots[appState.mines.activePlot];
  const dragged = appState.mines.draggedMiner;
  if (!dragged || plot.tiles[tileIndex].type !== 'empty') return;
  dragged.tileIndex = tileIndex;
  markDirty(appState);
}

function renderPlotGrid(appState: AppState): void {
  const grid = document.getElementById('tile-grid');
  if (!grid) return;

  const plot = appState.mines.plots[appState.mines.activePlot];
  grid.innerHTML = ''; // Clear current view

  plot.tiles.forEach((tile, i) => {
    const tileEl = document.createElement('div');
    tileEl.className = `tile ${tile.type}`;

    // 1. Display Level (for everything except empty and blocker)
    if (tile.type !== 'empty' && tile.type !== 'blocker') {
      const levelEl = document.createElement('div');
      levelEl.className = 'tile-level';
      levelEl.textContent = `Lvl ${tile.level}`;
      tileEl.appendChild(levelEl);
    }

    // 2. Display HP Bar (only for destructible tiles like rubble)
    if (tile.type === 'rubble') {
      const hpBar = document.createElement('div');
      hpBar.className = 'hp-bar';
      hpBar.style.display = 'block'; // Ensure it's visible

      const hpFill = document.createElement('div');
      hpFill.className = 'hp-fill';
      // Calculate percentage: assume max HP is 100 for this calculation
      const percent = Math.max(0, Math.min(100, (tile.hp / 100) * 100));
      hpFill.style.width = `${percent}%`;

      hpBar.appendChild(hpFill);
      tileEl.appendChild(hpBar);
    }

    // 3. Setup interaction events
    tileEl.ondragover = (e) => handleDragOver(e, i, appState);
    tileEl.ondrop = (e) => handleDrop(e, i, appState);
    tileEl.ondragenter = (e) => (e.currentTarget as HTMLElement).classList.add('drag-over');
    tileEl.ondragleave = (e) => (e.currentTarget as HTMLElement).classList.remove('drag-over');

    grid.appendChild(tileEl);
  });
}


// --- HANDLERS ---

function handleTouchMove(e: TouchEvent, appState: AppState): void {
  if (!appState.mines.draggedMiner) return;
  e.preventDefault();
  const touch = e.touches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);
  const tileEl = element ? element.closest('.tile') as HTMLElement : null;
  if (tileEl) {
    const grid = document.getElementById('tile-grid');
    if (grid) touchTargetIdx = Array.from(grid.children).indexOf(tileEl);
  }
}

function handleTouchEnd(appState: AppState): void {
  if (touchTargetIdx !== null) executeDropMovement(touchTargetIdx, appState);
  appState.mines.draggedMiner = null;
  touchTargetIdx = null;
  renderPlotGrid(appState);
}

function handleDragOver(e: DragEvent, idx: number, appState: AppState): void {
  e.preventDefault();
}

function handleDrop(e: DragEvent, idx: number, appState: AppState): void {
  e.preventDefault();
  executeDropMovement(idx, appState);
  renderPlotGrid(appState);
}

function bindInputEvents(appState: AppState): void {
  document.getElementById('btn-buy-north')?.addEventListener('click', () => {
    if (appState.money >= 500) {
      appState.money -= 500;
      appState.mines.plots.push(generatePlot(appState.worldSeed, appState.mines.plots.length));
      appState.mines.activePlot = appState.mines.plots.length - 1;
      forceGridResetAndRender(appState);
      markDirty(appState);
    }
  });

  document.getElementById('btn-dig-down')?.addEventListener('click', () => {
    const plot = appState.mines.plots[appState.mines.activePlot];
    plot.tiles = generatePlot(appState.worldSeed, plot.depth + 1).tiles;
    plot.depth++;
    forceGridResetAndRender(appState);
    markDirty(appState);
  });
}

export function handleBuyMiner(appState: AppState): void {
  if (appState.money >= BASE_MINER_COST) {
    appState.money -= BASE_MINER_COST;
    // Get the currently active plot
    const activePlot = appState.mines.plots[appState.mines.activePlot];

    // Create the new miner
    // We default them to tileIndex 0, or any logic you prefer
    const newMiner: Miner = {
      level: 1,
      tileIndex: 0,
      facing: 1,
      progress: 0
    };

    // Add to the active plot's miner list
    activePlot.miners.push(newMiner);

    // Update the UI
    updateGlobalMoneyUI(appState.money);
    renderPlotGrid(appState);
    showToast('Miner purchased!');
  } else {
    showToast('Not enough money!');
  }
}