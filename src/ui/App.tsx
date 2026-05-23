// src/ui/App.tsx

import { GameState } from '../core/types/state';
import { loadSave, saveGame } from '../save/save';

const state = loadSave();

// Initialize game state
state.plots = state.plots || [];
state.worldDiscovered = state.worldDiscovered || [];
state.destinations = state.destinations || [];

// Render app
document.body.innerHTML = `
  <div id="app">
    <header>
      <div>
        <div id="money-display">$${Math.floor(state.money)}</div>
        <div class="small" id="context">World</div>
      </div>
      <nav class="tabs">
        <button class="tab active" data-tab="world">World</button>
        <button class="tab" data-tab="plot">Plot</button>
        <button class="tab" data-tab="station">Station</button>
        <button class="tab" data-tab="settings">Settings</button>
      </nav>
    </header>
    
    <main>
      <section id="world" class="screen active">
        <div class="card"><strong>World Grid</strong></div>
        <div id="world-map"></div>
        <div class="card">
          <div class="row">
            <button id="explore-btn" class="btn secondary">Send Explorer</button>
            <button id="open-plot-btn" class="btn">Open Plot</button>
            <button id="open-station-btn" class="btn warn">Open Station</button>
          </div>
          <div id="world-msg" class="small">Ready.</div>
        </div>
      </section>
      
      <section id="plot" class="screen">
        <iframe id="plot-frame" src="./mines.html"></iframe>
      </section>
      
      <section id="station" class="screen">
        <iframe id="station-frame" src="./station.html"></iframe>
      </section>
      
      <section id="settings" class="screen">
        <div class="card"><strong>Settings</strong></div>
        <div class="card row">
          <button id="dev-btn" class="btn secondary">Dev Mode: Off</button>
          <button id="reset-btn" class="btn warn">Reset Save</button>
        </div>
      </section>
    </main>
    
    <footer>
      <div class="small">World → Plot → Station</div>
      <div class="small" id="explore-status"></div>
    </footer>
  </div>
`;

const root = document.getElementById('app')!;

// Tab navigation
document.querySelectorAll('.tab').forEach(b => {
  b.onclick = () => {
    const tab = b.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === tab));
    document.getElementById('context')?.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
    saveGame(state);
  };
});

// Buttons
document.getElementById('open-plot-btn')?.onclick = () => {
  setTab('plot');
};

document.getElementById('open-station-btn')?.onclick = () => {
  setTab('station');
};

document.getElementById('dev-btn')?.onclick = () => {
  state.dev = !state.dev;
  renderWorld();
  saveGame(state);
};

document.getElementById('reset-btn')?.onclick = () => {
  localStorage.removeItem('mcc_save');
  location.reload();
};

document.getElementById('explore-btn')?.onclick = () => {
  const undiscovered = state.worldDestinations.filter(d => !d.discovered);
  if (!undiscovered.length) {
    document.getElementById('world-msg')?.textContent = 'No more destinations to discover.';
    return;
  }
  
  const pick = undiscovered[0];
  pick.discovered = true;
  state.worldDiscovered.push(pick.id);
  document.getElementById('world-msg')?.textContent = `Discovered ${pick.name}`;
  saveGame(state);
  renderWorld();
};

// Render world
function renderWorld() {
  const worldGrid = state.worldGrid || generateInitialWorldGrid();
  renderWorldGrid(worldGrid, state.playerPlotId);
}

// Auto-save every 5 seconds
setInterval(() => {
  const saveData = { ...state, _version: 1, _savedAt: Date.now() };
  localStorage.setItem('mcc_save', JSON.stringify(saveData));
}, 5000);

function setTab(tab: string) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === tab));
  document.getElementById('context')?.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
}

function generateInitialWorldGrid() {
  const cells: any[] = [];
  
  // Center plot (ring 0)
  cells.push({ id: 'plot-A-I-1', name: 'Plot A I 1', type: 'plot', q: 0, r: 0, discovered: true });
  
  // Ring 1 (6 hexes)
  for (let i = 0; i < 6; i++) {
    const q = getRing1Coord(i);
    const r = getRing1CoordNext(i);
    const type = i === 3 ? 'city' : i === 0 ? 'factory' : 'fog';
    cells.push({
      id: `${type}-${i}`,
      name: type === 'plot' ? '' : `${type.charAt(0).toUpperCase()}${type.slice(1)} ${i + 1}`,
      type,
      q, r,
      discovered: false
    });
  }
  
  // Ring 2 (12 hexes) - all fog for now
  for (let i = 0; i < 12; i++) {
    const q = getRing2Coord(i);
    const r = getRing2CoordNext(i);
    cells.push({ id: `fog-${i + 6}`, name: '', type: 'fog', q, r, discovered: false });
  }
  
  return cells;
}

function getRing1Coord(i: number): number {
  const coords = [[1, -1], [-1, -1], [-2, 0], [-1, 1], [0, 1], [1, 0]];
  return coords[i % 6][0];
}

function getRing1CoordNext(i: number): number {
  const coords = [[1, -1], [-1, -1], [-2, 0], [-1, 1], [0, 1], [1, 0]];
  return coords[(i + 1) % 6][1];
}

function getRing2Coords(): [number, number][][] {
  return [[[0, -2], [1, -2], [2, -1], [2, 0], [1, 1], [0, 1], [-1, 0], [-2, -1], [-2, 0], [-1, 1], [0, 2], [1, 2]]];
}

function getRing2Coord(i: number): number {
  const coords = getRing2Coords();
  return coords[i % 12][0];
}

function getRing2CoordNext(i: number): number {
  const coords = getRing2Coords();
  return coords[(i + 1) % 12][1];
}
