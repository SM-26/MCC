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

  // Update Buy Miner Button
  const btnBuy = document.getElementById('btn-buy-miner') as HTMLButtonElement | null;
  if (btnBuy) {
    const cost = Math.floor(BASE_MINER_COST * Math.pow(1.5, plot.miners.length));
    btnBuy.textContent = `Buy Miner (Lvl 1) - $${cost}`;
    btnBuy.disabled = appState.money < cost;
  }

  // Enable/disable navigation buttons
  const btnPrev = document.getElementById('btn-prev-plot') as HTMLButtonElement | null;
  if (btnPrev) btnPrev.disabled = appState.mines.activePlot <= 0;

  const btnNext = document.getElementById('btn-next-plot') as HTMLButtonElement | null;
  if (btnNext) btnNext.disabled = appState.mines.activePlot >= appState.mines.maxUnlockedPlot;

  // Unlocks for Buy North Plot and Dig Deeper
  const rubbleCount = plot.tiles.filter((t) => t.type === 'rubble').length;
  const dirtCount = plot.tiles.filter((t) => t.type === 'dirt').length;
  const blockerCount = plot.tiles.filter((t) => t.type === 'blocker').length;

  // Soft clear: all rubble must be gone (dirt and blockers can remain)
  const isSoftClear = rubbleCount === 0;

  const btnBuyNorth = document.getElementById('btn-buy-north') as HTMLButtonElement | null;
  if (btnBuyNorth) {
    // Buy North requires: Depth 1 AND Soft Clear AND Enough Money
    const canBuyNorth = plot.depth === 1 && isSoftClear && appState.money >= 500;
    btnBuyNorth.disabled = !canBuyNorth;

    // Update button text to show requirements if disabled
    if (!canBuyNorth) {
      if (plot.depth !== 1) {
        btnBuyNorth.textContent = `Buy North Plot (Depth ${plot.depth} / 1)`;
      } else if (!isSoftClear) {
        const remaining = rubbleCount + blockerCount;
        btnBuyNorth.textContent = `Buy North Plot (${remaining} obstacles remain)`;
      } else {
        btnBuyNorth.textContent = `Buy North Plot (Ready - $500)`;
      }
    }
  }

  const btnDigDown = document.getElementById('btn-dig-down') as HTMLButtonElement | null;
  if (btnDigDown) {
    // Dig Deeper requires: Soft Clear (no rubble)
    const isHardClear = rubbleCount === 0;
    btnDigDown.disabled = !isHardClear;

    if (!isHardClear) {
      btnDigDown.textContent = `Dig Deeper (${rubbleCount} rubble remains)`;
    } else {
      btnDigDown.textContent = `Dig Deeper`;
    }
  }
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
  const validTargets = neighbors.filter((idx) => {
    const type = plot.tiles[idx].type;
    return type !== 'empty' && type !== 'blocker';
  });

  if (validTargets.length === 0) return null;

  // Priority: Rubble > Dirt, then lowest HP
  validTargets.sort((a, b) => {
    const tA = plot.tiles[a];
    const tB = plot.tiles[b];
    if (tA.type !== tB.type) {
      return tA.type === 'rubble' ? -1 : 1;
    }
    return tA.hp - tB.hp;
  });

  return validTargets[0];
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

export async function initMinesSlice(appState: AppState): Promise<void> {
  // 1. Data Initialization: Always run this if plots are empty (e.g., after Reset)
  if (!appState.mines?.plots?.length) {
    appState.mines = {
      activePlot: 0,
      plotid: 'A',
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

    // Auto-save loop: check for changes and save to localStorage every 5 seconds
    setInterval(() => {
      if ((appState as any).isDirty) {
        saveGameState(appState);
        (appState as any).isDirty = false;
      }
    }, 5000);
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

function updateMinerLogic(miner: Miner, plot: MinePlot, dt: number, appState: AppState): void {
  const targetIdx = findTargetTile(miner, plot);
  if (targetIdx === null) return;
  const target = plot.tiles[targetIdx];
  const damage = (1 << (miner.level - 1)) * 5 * dt;
  miner.facing = calculateFacingAngle(miner.tileIndex, targetIdx);
  target.hp -= damage;
  if (target.hp <= 0) {
    if (target.type === 'rubble') {
      const val = RUBBLE_VALUE * (plot.depth + 1);
      appState.money = Math.floor((appState.money + val) * 100) / 100;
      updateGlobalMoneyUI(appState.money);
      createFloatingText(targetIdx, `+$${val}`);
    }
    target.type = 'empty';
    target.hp = 0;
    markDirty(appState);
  }
}

function executeDropMovement(tileIndex: number, appState: AppState): void {
  const plot = appState.mines.plots[appState.mines.activePlot];
  const dragged = appState.mines.draggedMiner;
  if (!dragged) return;

  const targetMiner = plot.miners.find((m) => m.tileIndex === tileIndex);

  if (targetMiner && targetMiner.level === dragged.level && targetMiner !== dragged) {
    // Merge
    plot.miners = plot.miners.filter((m) => m !== dragged);
    targetMiner.level++;
    createFloatingText(tileIndex, "LEVEL UP!");
    markDirty(appState);
  } else if (!targetMiner && plot.tiles[tileIndex].type === 'empty') {
    // Move
    dragged.tileIndex = tileIndex;
    markDirty(appState);
  }
}

function handleMinerClick(miner: Miner, appState: AppState): void {
  const activePlot = appState.mines.plots[appState.mines.activePlot];
  const selected = appState.mines.selectedMiner;

  if (selected === miner) {
    appState.mines.selectedMiner = null;
  } else if (selected && selected.level === miner.level && selected !== miner) {
    // Click to merge
    activePlot.miners = activePlot.miners.filter((m) => m !== selected);
    miner.level++;
    appState.mines.selectedMiner = null;
    createFloatingText(miner.tileIndex, "LEVEL UP!");
    markDirty(appState);
  } else {
    appState.mines.selectedMiner = miner;
  }
  renderPlotGrid(appState);
}

export function handleTileClick(tileIndex: number, appState: AppState): void {
  const plot = appState.mines.plots[appState.mines.activePlot];
  const existingMiner = plot.miners.find((m) => m.tileIndex === tileIndex);
  const selected = appState.mines.selectedMiner;

  if (selected && !existingMiner && plot.tiles[tileIndex].type === 'empty') {
    // Move selected miner to empty tile
    selected.tileIndex = tileIndex;
    appState.mines.selectedMiner = null;
    markDirty(appState);
  } else if (!existingMiner) {
    appState.mines.selectedMiner = null;
  }
  renderPlotGrid(appState);
}

function renderPlotGrid(appState: AppState): void {
  const grid = document.getElementById('tile-grid');
  if (!grid) return;

  const plot = appState.mines.plots[appState.mines.activePlot];
  grid.innerHTML = ''; // Clear current view

  plot.tiles.forEach((tile, i) => {
    const tileEl = document.createElement('div');
    tileEl.className = `tile ${tile.type}`;
    tileEl.onclick = () => handleTileClick(i, appState);

    // 1. Display Level (for everything except empty and blocker)
    if (tile.type !== 'empty' && tile.type !== 'blocker') {
      const levelEl = document.createElement('div');
      levelEl.className = 'tile-level';
      levelEl.textContent = `Lvl ${tile.level}`;
      tileEl.appendChild(levelEl);
    }

    // 2. Display HP Bar (for destructible tiles like rubble and dirt)
    if (tile.type === 'rubble' || tile.type === 'dirt') {
      const hpBar = document.createElement('div');
      hpBar.className = 'hp-bar';
      hpBar.style.display = 'block'; // Ensure it's visible

      const hpFill = document.createElement('div');
      hpFill.className = 'hp-fill';
      // Calculate percentage
      const percent = Math.max(0, Math.min(100, (tile.hp / tile.maxHp) * 100));
      hpFill.style.width = `${percent}%`;

      hpBar.appendChild(hpFill);
      tileEl.appendChild(hpBar);
    }

    // 3. Render miner if present
    const miner = plot.miners.find((m) => m.tileIndex === i);
    if (miner) {
      const mEl = document.createElement('div');
      const isSelected = appState.mines.selectedMiner === miner;
      mEl.className = `miner ${isSelected ? 'selected' : ''}`;
      mEl.setAttribute('draggable', 'true');
      mEl.style.transform = `rotate(${miner.facing || 0}deg)`;
      mEl.innerHTML = `
        <span class="miner-icon">⛏️</span>
        <span class="miner-level" style="transform: rotate(-${miner.facing || 0}deg)">${miner.level}</span>
      `;
      mEl.onclick = (e) => {
        e.stopPropagation();
        handleMinerClick(miner, appState);
      };
      mEl.ondragstart = (e) => {
        appState.mines.draggedMiner = miner;
        appState.mines.selectedMiner = null;
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', ''); // Required for Firefox
        }
      };
      mEl.ondragend = () => {
        appState.mines.draggedMiner = null;
      };
      mEl.addEventListener('touchstart', () => {
        appState.mines.draggedMiner = miner;
        appState.mines.selectedMiner = null;
      }, { passive: true });
      tileEl.appendChild(mEl);
    }

    // 4. Setup interaction events
    tileEl.ondragover = (e) => handleDragOver(e, i, appState);
    tileEl.ondrop = (e) => handleDrop(e, i, appState);
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
  const dragged = appState.mines.draggedMiner;
  if (!dragged) return;

  const plot = appState.mines.plots[appState.mines.activePlot];
  const targetMiner = plot.miners.find((m) => m.tileIndex === idx);
  if (plot.tiles[idx].type === 'empty' || (targetMiner && targetMiner.level === dragged.level && targetMiner !== dragged)) {
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    (e.currentTarget as HTMLElement).classList.add('drag-over');
  }
}

function handleDrop(e: DragEvent, idx: number, appState: AppState): void {
  e.preventDefault();
  (e.currentTarget as HTMLElement).classList.remove('drag-over');
  executeDropMovement(idx, appState);
  appState.mines.draggedMiner = null;
  appState.mines.selectedMiner = null;
  renderPlotGrid(appState);
}

function bindInputEvents(appState: AppState): void {
  document.getElementById('btn-prev-plot')?.addEventListener('click', () => {
    if (appState.mines.activePlot > 0) {
      appState.mines.activePlot--;
      forceGridResetAndRender(appState);
      updateMinesUIHeaders(appState);
    }
  });

  document.getElementById('btn-next-plot')?.addEventListener('click', () => {
    // Check if we can buy a new plot first
    const activePlot = appState.mines.plots[appState.mines.activePlot];

    // Check requirements: Must be depth 1 and soft clear (no rubble)
    if (activePlot.depth !== 1) {
      showToast(`Cannot buy north plot at depth ${activePlot.depth}. Must be at depth 1.`);
      return;
    }

    const rubbleCount = activePlot.tiles.filter(t => t.type === 'rubble').length;
    if (rubbleCount > 0) {
      showToast(`Cannot buy north plot. Plot is not soft cleared (${rubbleCount} rubble remains).`);
      return;
    }

    // If we get here, requirements are met
    if (appState.money >= 500) {
      appState.money -= 500;
      updateGlobalMoneyUI(appState.money);

      // Generate new plot at depth 1
      const newPlot = generatePlot(appState.worldSeed, activePlot.depth + 1);
      activePlot.tiles = newPlot.tiles;
      activePlot.miners = []; // Clear miners as they are on the old floor
      activePlot.depth++; // Increment depth

      // Add to plots array and switch to it
      appState.mines.plots.push(newPlot);
      appState.mines.activePlot = appState.mines.plots.length - 1;
      appState.mines.maxUnlockedPlot = appState.mines.plots.length - 1;

      forceGridResetAndRender(appState);
      updateMinesUIHeaders(appState);
      markDirty(appState);
      showToast('North plot bought!');
    } else {
      showToast(`Not enough money to buy north plot ($500 required).`);
    }
  });

  document.getElementById('btn-buy-north')?.addEventListener('click', () => {
    const activePlot = appState.mines.plots[appState.mines.activePlot];

    // Check requirements: Must be depth 1 and soft clear (no rubble)
    if (activePlot.depth !== 1) {
      showToast(`Cannot buy north plot at depth ${activePlot.depth}. Must be at depth 1.`);
      return;
    }

    const rubbleCount = activePlot.tiles.filter(t => t.type === 'rubble').length;
    if (rubbleCount > 0) {
      showToast(`Cannot buy north plot. Plot is not soft cleared (${rubbleCount} rubble remains).`);
      return;
    }

    // If we get here, requirements are met
    if (appState.money >= 500) {
      appState.money -= 500;
      updateGlobalMoneyUI(appState.money);

      // Generate new plot at depth 1
      const newPlot = generatePlot(appState.worldSeed, activePlot.depth + 1);
      activePlot.tiles = newPlot.tiles;
      activePlot.miners = []; // Clear miners as they are on the old floor
      activePlot.depth++; // Increment depth

      // Add to plots array and switch to it
      appState.mines.plots.push(newPlot);
      appState.mines.activePlot = appState.mines.plots.length - 1;
      appState.mines.maxUnlockedPlot = appState.mines.plots.length - 1;

      forceGridResetAndRender(appState);
      updateMinesUIHeaders(appState);
      markDirty(appState);
      showToast('North plot bought!');
    } else {
      showToast(`Not enough money to buy north plot ($500 required).`);
    }
  });

  document.getElementById('btn-dig-down')?.addEventListener('click', () => {
    const plot = appState.mines.plots[appState.mines.activePlot];
    const rubbleCount = plot.tiles.filter(t => t.type === 'rubble').length;
    if (rubbleCount > 0) {
      showToast(`Cannot dig deeper. Clear all rubble first.`);
      return;
    }
    plot.tiles = generatePlot(appState.worldSeed, plot.depth + 1).tiles;
    plot.depth++;

    // Reset miner positions to the new floor's empty bottom row (highest index)
    const emptyIndices = plot.tiles
      .map((t, i) => t.type === 'empty' ? i : -1)
      .filter(idx => idx !== -1);

    plot.miners.forEach((m, idx) => {
      m.tileIndex = emptyIndices[idx % emptyIndices.length];
    });

    forceGridResetAndRender(appState);
    updateMinesUIHeaders(appState);
    markDirty(appState);
  });
}

export function handleBuyMiner(appState: AppState): void {
  const activePlot = appState.mines.plots[appState.mines.activePlot];
  const cost = Math.floor(BASE_MINER_COST * Math.pow(1.5, activePlot.miners.length));

  if (appState.money >= cost) {
    // Find empty tiles
    const emptyIndices = activePlot.tiles
      .map((_, idx) => idx)
      .filter((idx) => activePlot.tiles[idx].type === 'empty' && !activePlot.miners.some((m) => m.tileIndex === idx));

    if (emptyIndices.length > 0) {
      // Prioritize bottom row (highest index)
      emptyIndices.sort((a, b) => {
        const rowA = Math.floor(a / GRID_SIZE);
        const rowB = Math.floor(b / GRID_SIZE);
        return rowB - rowA;
      });

      const targetIdx = emptyIndices[0];
      appState.money -= cost;
      updateGlobalMoneyUI(appState.money);

      const newMiner: Miner = {
        level: 1,
        tileIndex: targetIdx,
        facing: 0,
        progress: 0
      };

      activePlot.miners.push(newMiner);

      renderPlotGrid(appState);
      updateMinesUIHeaders(appState);
      showToast('Miner purchased!');
      markDirty(appState);
    } else {
      showToast('No room to place a miner! Clear more paths.');
    }
  } else {
    showToast('Not enough money!');
  }
}
