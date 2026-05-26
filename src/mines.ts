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

const GRID_SIZE = 5;
const BASE_MINER_COST = 50;
const RUBBLE_VALUE = 25;
const TICK_RATE = 100; // ms
const OFFLINE_RATE = 0.5;

let touchTargetIdx: number | null = null;
let isMinesInitialized = false;

export async function initMinesSlice(appState: AppState): Promise<void> {
  // If already run once, bail out instantly to kill duplicate loops
  if (isMinesInitialized) {
    console.warn('[Mines] Slice already armed. Bailing duplicate initialization.');
    return;
  }
  isMinesInitialized = true;

  console.log('[Mines] Initializing mines slice...');

  // 1. Initialize data substructure if not restored by load state
  if (!appState.mines || !appState.mines.plots || appState.mines.plots.length === 0) {
    appState.mines = {
      activePlot: 0,
      maxUnlockedPlot: 0,
      plots: [createPlotData(0)],
      selectedMiner: null,
      draggedMiner: null,
      lastTick: Date.now()
    };
  } else {
    handleOfflineProgress(appState);
  }

  // 2. Attach global events for touch-dragging
  window.addEventListener('touchmove', (e) => onTouchMove(e, appState), { passive: false });
  window.addEventListener('touchend', () => onTouchEnd(appState));

  // 3. Bind UI Element Actions
  bindInputEvents(appState);

  // 4. Fire Loop Clocks
  setInterval(() => gameTick(appState), TICK_RATE);
}

function createPlotData(depth: number): MinePlot {
  const tiles: MineTile[] = [];
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const row = Math.floor(i / GRID_SIZE);
    const isBottomRow = row === GRID_SIZE - 1;
    const level = depth + 1;
    const type = isBottomRow ? 'empty' : Math.random() > 0.4 ? 'rubble' : 'dirt';
    const isRubble = type === 'rubble';
    const hp = type === 'empty' ? 0 : isRubble ? 50 + depth * 25 : 20 + depth * 10;

    tiles.push({ type, level, hp, maxHp: hp });
  }
  return { depth, tiles, miners: [] };
}

function gameTick(appState: AppState): void {
  const now = Date.now();
  const dt = (now - appState.mines.lastTick) / 1000;
  appState.mines.lastTick = now;

  appState.mines.plots.forEach((plot) => {
    plot.miners.forEach((miner) => {
      updateMinerLogic(miner, plot, dt, appState);
    });
  });

  // Render check if active viewport tab is open
  if (appState.currentTab === 'mines') {
    if (!appState.mines.draggedMiner) {
      renderPlotGrid(appState);
    }
    updateMinesUIHeaders(appState);
  }
}

function updateMinerLogic(miner: Miner, plot: MinePlot, dt: number, appState: AppState): void {
  const targetIdx = findTargetTile(miner, plot);

  if (targetIdx !== null) {
    const target = plot.tiles[targetIdx];
    const damage = Math.pow(2, miner.level - 1) * 5 * dt;

    miner.facing = calculateFacingAngle(miner.tileIndex, targetIdx);
    target.hp -= damage;

    if (target.hp <= 0) {
      if (target.type === 'rubble') {
        const value = RUBBLE_VALUE * (plot.depth + 1);
        appState.money += value;
        updateGlobalMoneyUI(appState.money);
        if (appState.mines.plots[appState.mines.activePlot] === plot) {
          createFloatingText(targetIdx, `+$${value}`);
        }
      }
      target.type = 'empty';
      target.hp = 0;
    }
  }
}

function findTargetTile(miner: Miner, plot: MinePlot): number | null {
  const neighbors = getValidNeighbors(miner.tileIndex);
  const validTargets = neighbors.filter((idx) => plot.tiles[idx].type !== 'empty');

  if (validTargets.length === 0) return null;

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

function calculateFacingAngle(from: number, to: number): number {
  const diff = to - from;
  if (diff === -GRID_SIZE) return 0;   // North
  if (diff === 1) return 90;           // East
  if (diff === GRID_SIZE) return 180;  // South
  if (diff === -1) return 270;         // West
  return 0;
}

function renderPlotGrid(appState: AppState): void {
  const grid = document.getElementById('tile-grid');
  if (!grid) return;

  // Safety guard clause: Bail out if data substructures are not yet fully hydrated
  if (!appState.mines || !appState.mines.plots || !appState.mines.plots[appState.mines.activePlot]) {
    return;
  }

  const plot = appState.mines.plots[appState.mines.activePlot];

  if (grid.children.length === 0) {
    plot.tiles.forEach((_, i) => {
      const tileEl = document.createElement('div');
      tileEl.className = 'tile';
      tileEl.dataset.index = i.toString();
      tileEl.onclick = () => onTileClick(i, appState);
      tileEl.ondragover = (e) => onDragOver(e, i, appState);
      tileEl.ondragleave = () => tileEl.classList.remove('drag-over');
      tileEl.ondrop = (e) => onDrop(e, i, appState);
      grid.appendChild(tileEl);
    });
  }

  plot.tiles.forEach((tile, i) => {
    const tileEl = grid.children[i] as HTMLElement;
    tileEl.className = `tile ${tile.type} ${tileEl.classList.contains('drag-over') ? 'drag-over' : ''}`;

    let lvl = tileEl.querySelector('.tile-level');
    let bar = tileEl.querySelector('.hp-bar') as HTMLElement;
    let fill = tileEl.querySelector('.hp-fill') as HTMLElement;
    let sprite = tileEl.querySelector('.tile-sprite') as HTMLImageElement;

    if (tile.type !== 'empty') {
      if (!lvl) {
        lvl = document.createElement('div');
        lvl.className = 'tile-level';
        tileEl.appendChild(lvl);
      }
      lvl.textContent = `Lv.${tile.level}`;
      if (tile.type === 'rubble') {
        if (!sprite) {
          sprite = document.createElement('img');
          sprite.className = 'tile-sprite';
          sprite.src = '/MCC/rubble-pile.svg'; // Fits Vite routing setup from your asset layer
          sprite.alt = 'Rubble';
          tileEl.appendChild(sprite);
        }
      } else if (sprite) {
        sprite.remove();
      }
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'hp-bar';
        fill = document.createElement('div');
        fill.className = 'hp-fill';
        bar.appendChild(fill);
        tileEl.appendChild(bar);
      }
      bar.style.display = 'block';
      fill.style.width = `${(tile.hp / tile.maxHp) * 100}%`;
    } else {
      if (lvl) lvl.remove();
      if (sprite) sprite.remove();
      if (bar) bar.style.display = 'none';
    }

    const miner = plot.miners.find((m) => m.tileIndex === i);
    let minerEl = tileEl.querySelector('.miner') as HTMLElement;

    if (miner) {
      if (!minerEl) {
        minerEl = document.createElement('div');
        minerEl.className = 'miner';
        minerEl.setAttribute('draggable', 'true');
        minerEl.innerHTML = `<span class="miner-icon">⛏️</span><span class="miner-level"></span>`;

        minerEl.onclick = (e) => {
          e.stopPropagation();
          onMinerClick(miner, appState);
        };
        minerEl.ondragstart = (e) => onDragStart(e, miner, appState);
        minerEl.ondragend = () => (appState.mines.draggedMiner = null);
        minerEl.ontouchstart = (e) => onTouchStart(e, miner, appState);
        tileEl.appendChild(minerEl);
      }

      minerEl.className = `miner ${appState.mines.selectedMiner === miner ? 'selected' : ''}`;
      minerEl.style.pointerEvents = appState.mines.draggedMiner === miner ? 'none' : 'auto';
      minerEl.style.opacity = appState.mines.draggedMiner === miner ? '0.5' : '1';
      minerEl.style.transform = `rotate(${miner.facing || 0}deg)`;

      const minerLvlLabel = minerEl.querySelector('.miner-level') as HTMLElement;
      minerLvlLabel.textContent = miner.level.toString();
      minerLvlLabel.style.transform = `rotate(-${miner.facing || 0}deg)`;
    } else if (minerEl) {
      minerEl.remove();
    }
  });
}

function updateMinesUIHeaders(appState: AppState): void {
  if (!appState.mines || !appState.mines.plots || !appState.mines.plots[appState.mines.activePlot]) {
    return;
  }
  const plot = appState.mines.plots[appState.mines.activePlot];

  const moneyDisplay = document.getElementById('money-display');
  if (moneyDisplay) moneyDisplay.textContent = `$${Math.floor(appState.money)}`;

  const locText = document.getElementById('loc-text');
  if (locText) locText.textContent = `Plot ${appState.mines.activePlot + 1}, Depth ${plot.depth}`;

  const total = plot.tiles.length;
  const cleared = plot.tiles.filter((t) => t.type === 'empty').length;
  const rubble = plot.tiles.filter((t) => t.type === 'rubble').length;

  const clearText = document.getElementById('clear-text');
  if (clearText) clearText.textContent = `Cleared: ${Math.floor((cleared / total) * 100)}%`;

  const cost = BASE_MINER_COST * Math.pow(1.5, plot.miners.length);
  const buyMinerBtn = document.getElementById('btn-buy-miner') as HTMLButtonElement;
  if (buyMinerBtn) {
    buyMinerBtn.textContent = `Buy Miner (Lvl 1) - $${Math.floor(cost)}`;
    buyMinerBtn.disabled = appState.money < cost;
  }

  const isSoftClear = rubble === 0;
  const canAffordNorth = appState.money >= 500;
  const isHardClear = cleared === total;

  const buyNorthBtn = document.getElementById('btn-buy-north') as HTMLButtonElement;
  if (buyNorthBtn) {
    // Looks disabled if the plot isn't clear OR they lack the cash
    const shouldLookDisabled = !isSoftClear || !canAffordNorth;
    buyNorthBtn.classList.toggle('btn-disabled-visual', shouldLookDisabled);
  }
  const digDownBtn = document.getElementById('btn-dig-down') as HTMLButtonElement;
  if (digDownBtn) {
    // Toggle the visual class instead of the native .disabled property
    digDownBtn.classList.toggle('btn-disabled-visual', !isHardClear);
  }


}

function onMinerClick(miner: Miner, appState: AppState): void {
  const selected = appState.mines.selectedMiner;
  if (selected === miner) {
    appState.mines.selectedMiner = null;
  } else if (selected && selected.level === miner.level && selected !== miner) {
    const plot = appState.mines.plots[appState.mines.activePlot];
    plot.miners = plot.miners.filter((m) => m !== selected);
    miner.level++;
    appState.mines.selectedMiner = null;
    createFloatingText(miner.tileIndex, 'LEVEL UP!');
    renderPlotGrid(appState);
    saveGameState(appState);
    return; // Prevent running duplicate render down below
  } else {
    appState.mines.selectedMiner = miner;
  }
  renderPlotGrid(appState);
}

function onTileClick(tileIndex: number, appState: AppState): void {
  const plot = appState.mines.plots[appState.mines.activePlot];
  const existingMiner = plot.miners.find((m) => m.tileIndex === tileIndex);

  if (appState.mines.selectedMiner && !existingMiner && plot.tiles[tileIndex].type === 'empty') {
    appState.mines.selectedMiner.tileIndex = tileIndex;
    appState.mines.selectedMiner = null;
    renderPlotGrid(appState);
  } else if (!existingMiner) {
    appState.mines.selectedMiner = null;
    renderPlotGrid(appState);
  }
}

function executeDropMovement(tileIndex: number, appState: AppState): void {
  const plot = appState.mines.plots[appState.mines.activePlot];
  const existingMiner = plot.miners.find((m) => m.tileIndex === tileIndex);
  const dragged = appState.mines.draggedMiner;

  if (!dragged) return;

  let stateChanged = false;

  if (existingMiner && existingMiner.level === dragged.level && existingMiner !== dragged) {
    plot.miners = plot.miners.filter((m) => m !== dragged);
    existingMiner.level++;
    createFloatingText(tileIndex, 'LEVEL UP!');
    stateChanged = true;
  } else if (!existingMiner && plot.tiles[tileIndex].type === 'empty') {
    dragged.tileIndex = tileIndex;
    stateChanged = true;
  }

  if (stateChanged) {
    saveGameState(appState);
  }
}

function onDragStart(e: DragEvent, miner: Miner, appState: AppState): void {
  appState.mines.draggedMiner = miner;
  e.dataTransfer?.setData('text/plain', '');
}

function onDragOver(e: DragEvent, tileIndex: number, appState: AppState): void {
  e.preventDefault();
  const dragged = appState.mines.draggedMiner;
  if (!dragged) return;

  const plot = appState.mines.plots[appState.mines.activePlot];
  const targetMiner = plot.miners.find((m) => m.tileIndex === tileIndex);

  if (plot.tiles[tileIndex].type === 'empty' || (targetMiner && targetMiner.level === dragged.level && targetMiner !== dragged)) {
    (e.currentTarget as HTMLElement).classList.add('drag-over');
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }
}

function onDrop(e: DragEvent, tileIndex: number, appState: AppState): void {
  e.preventDefault();
  (e.currentTarget as HTMLElement).classList.remove('drag-over');
  if (!appState.mines.draggedMiner) return;

  executeDropMovement(tileIndex, appState);
  appState.mines.draggedMiner = null;
  appState.mines.selectedMiner = null;
  renderPlotGrid(appState);
}

function onTouchStart(e: TouchEvent, miner: Miner, appState: AppState): void {
  appState.mines.draggedMiner = miner;
  appState.mines.selectedMiner = null;
}

function onTouchMove(e: TouchEvent, appState: AppState): void {
  if (!appState.mines.draggedMiner) return;
  e.preventDefault();

  const touch = e.touches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);
  const tileEl = element ? element.closest('.tile') as HTMLElement : null;

  document.querySelectorAll('.tile.drag-over').forEach((t) => t.classList.remove('drag-over'));
  touchTargetIdx = null;

  if (tileEl) {
    const grid = document.getElementById('tile-grid');
    if (!grid) return;
    const idx = Array.from(grid.children).indexOf(tileEl);
    if (idx !== -1) {
      const plot = appState.mines.plots[appState.mines.activePlot];
      const targetMiner = plot.miners.find((m) => m.tileIndex === idx);
      if (plot.tiles[idx].type === 'empty' || (targetMiner && targetMiner.level === appState.mines.draggedMiner.level && targetMiner !== appState.mines.draggedMiner)) {
        tileEl.classList.add('drag-over');
        touchTargetIdx = idx;
      }
    }
  }
}

function onTouchEnd(appState: AppState): void {
  if (!appState.mines.draggedMiner) return;
  if (touchTargetIdx !== null) {
    executeDropMovement(touchTargetIdx, appState);
  }
  appState.mines.draggedMiner = null;
  touchTargetIdx = null;
  document.querySelectorAll('.tile.drag-over').forEach((t) => t.classList.remove('drag-over'));
  renderPlotGrid(appState);
}

function bindInputEvents(appState: AppState): void {
  document.getElementById('btn-prev-plot')?.addEventListener('click', () => {
    if (appState.mines.activePlot > 0) {
      appState.mines.activePlot--;
      forceGridResetAndRender(appState);
    }
  });

  document.getElementById('btn-next-plot')?.addEventListener('click', () => {
    if (appState.mines.activePlot < appState.mines.maxUnlockedPlot) {
      appState.mines.activePlot++;
      forceGridResetAndRender(appState);
    }
  });

  document.getElementById('btn-buy-miner')?.addEventListener('click', () => {
    const plot = appState.mines.plots[appState.mines.activePlot];
    const cost = BASE_MINER_COST * Math.pow(1.5, plot.miners.length);

    if (appState.money >= cost) {
      const emptyIndices = plot.tiles
        .map((t, i) => i)
        .filter((i) => plot.tiles[i].type === 'empty' && !plot.miners.some((m) => m.tileIndex === i));

      if (emptyIndices.length > 0) {
        emptyIndices.sort((a, b) => Math.floor(b / GRID_SIZE) - Math.floor(a / GRID_SIZE));

        // 1. Deduct money from state
        appState.money -= cost;
        plot.miners.push({ level: 1, tileIndex: emptyIndices[0], facing: 0, progress: 0 });

        // 2. IMMEDIATE UI SYNCHRONIZATION
        // Force the global header wallet to update instantly
        updateGlobalMoneyUI(appState.money);

        // Force the local sub-header wallet to update instantly
        const moneyDisplay = document.getElementById('money-display');
        if (moneyDisplay) {
          moneyDisplay.textContent = `$${Math.floor(appState.money)}`;
        }

        // 3. Render and persist layout changes
        renderPlotGrid(appState);
        saveGameState(appState);
      } else {
        alert("No room to place a miner! Wait for a current miner to clear a path.");
      }
    }
  });
  document.getElementById('btn-buy-north')?.addEventListener('click', () => {
    const plot = appState.mines.plots[appState.mines.activePlot];
    const rubbleCount = plot.tiles.filter((t) => t.type === 'rubble').length;

    // Check 1: Must clear all heavy rubble first
    if (rubbleCount > 0) {
      showToast('You must clear all rubble piles in this plot before expanding North!');
      return;
    }

    // Check 2: Must have enough money
    if (appState.money < 500) {
      showToast('Insufficient funds! Expanding North costs $500.');
      return;
    }

    // Transaction executes if both checks pass
    appState.money -= 500;
    appState.mines.plots.push(createPlotData(0));
    appState.mines.maxUnlockedPlot++;
    appState.mines.activePlot = appState.mines.maxUnlockedPlot;

    // Instant layout and cash update
    updateGlobalMoneyUI(appState.money);
    const moneyDisplay = document.getElementById('money-display');
    if (moneyDisplay) {
      moneyDisplay.textContent = `$${Math.floor(appState.money)}`;
    }

    forceGridResetAndRender(appState);
    saveGameState(appState); // Auto-save new plot data immediately
  });

  document.getElementById('btn-dig-down')?.addEventListener('click', () => {
    const plot = appState.mines.plots[appState.mines.activePlot];
    // Check if any tiles are still dirt or rubble
    const isFullyCleared = plot.tiles.every(t => t.type === 'empty');
    if (!isFullyCleared) {
      showToast('You must clear all dirt and rubble before digging deeper!');
      return;
    }

    // Process digging deeper if fully cleared
    plot.depth++;
    plot.tiles = createPlotData(plot.depth).tiles;

    const emptyIndices = plot.tiles.map((t, i) => (t.type === 'empty' ? i : -1)).filter((idx) => idx !== -1);
    plot.miners.forEach((m, i) => (m.tileIndex = emptyIndices[i % emptyIndices.length]));

    forceGridResetAndRender(appState);
    saveGameState(appState); // Auto-save the progression instantly
  });
}

function forceGridResetAndRender(appState: AppState) {
  const grid = document.getElementById('tile-grid');
  if (grid) grid.innerHTML = '';
  renderPlotGrid(appState);
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
  setTimeout(() => el.remove(), 1000);
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
  if (totalEarned > 0) {
    alert(`While you were away, your miners earned $${Math.floor(totalEarned)} at a reduced rate!`);
  }
}