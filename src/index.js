import { loadSave, saveGame } from './save/save.js';
// import { generateInitialWorldGrid } from './world/grid.js';
import { generateInitialWorldGrid as getBaseWorldGrid } from './world/grid.js';

const state = loadSave();

// Initialize game state
state.plots = state.plots || [];
state.worldDiscovered = state.worldDiscovered || [];
state.destinations = state.destinations || [];

// Render world
function renderWorld() {
    const worldGrid = state.worldGrid || generateInitialWorldGrid();
    renderWorldGrid(worldGrid, state.playerPlotId);
}

function renderWorldGrid(worldGrid, playerPlotId) {
    const container = document.getElementById('world-map');
    if (!container) return;

    container.innerHTML = '';

    worldGrid.forEach(cell => {
        const isHidden = cell.type !== 'plot' && !cell.discovered;

        const hex = document.createElement('div');
        hex.className = `hex ${cell.type} ${isHidden ? 'hidden' : ''} ${cell.id === playerPlotId ? 'player' : ''}`;

        // Calculate hex position using axial coordinates
        const pos = hexPos(cell.q, cell.r);
        hex.style.left = `${pos.left}px`;
        hex.style.top = `${pos.top}px`;

        // Add content
        if (cell.type === 'fog') {
            hex.innerHTML = '<div>Fog</div>';
        } else {
            hex.innerHTML = `
        <div>${cell.name || cell.id}</div>
        <div class="small">${cell.type}</div>
      `;
        }

        // Add click handler
        hex.onclick = () => {
            if (isHidden) {
                const msg = document.getElementById('world-msg');
                if (msg) msg.textContent = 'Undiscovered.';
                return;
            }

            if (cell.type === 'plot') {
                setTab('plot');
            } else if (cell.type === 'city' || cell.type === 'factory') {
                const msg = document.getElementById('world-msg');
                if (msg) msg.textContent = `Selected ${cell.name}`;
            }
        };

        container.appendChild(hex);
    });
}

function hexPos(q, r) {
    const size = 78;
    const gapX = 67;
    const gapY = 60;

    return {
        left: 160 + q * gapX + (r % 2 ? gapX / 2 : 0),
        top: 70 + r * gapY
    };
}

// Tab navigation
document.querySelectorAll('.tab').forEach(b => {
    b.onclick = () => {
        const tab = b.dataset.tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === tab));
        const context = document.getElementById('context');
        if (context) context.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
        saveGame(state);
    };
});

// Buttons
const openPlotBtn = document.getElementById('open-plot-btn');
if (openPlotBtn) openPlotBtn.onclick = () => { setTab('plot'); };

const openStationBtn = document.getElementById('open-station-btn');
if (openStationBtn) openStationBtn.onclick = () => { setTab('station'); };

const devBtn = document.getElementById('dev-btn');
if (devBtn) devBtn.onclick = () => { state.dev = !state.dev; renderWorld(); saveGame(state); };

const resetBtn = document.getElementById('reset-btn');
if (resetBtn) resetBtn.onclick = () => { localStorage.removeItem('mcc_save'); location.reload(); };

const exploreBtn = document.getElementById('explore-btn');
if (exploreBtn) exploreBtn.onclick = () => {
    const undiscovered = state.worldDestinations.filter(d => !d.discovered);
    if (!undiscovered.length) {
        const msg = document.getElementById('world-msg');
        if (msg) msg.textContent = 'No more destinations to discover.';
        return;
    }

    const pick = undiscovered[0];
    pick.discovered = true;
    state.worldDiscovered.push(pick.id);
    const msg = document.getElementById('world-msg');
    if (msg) msg.textContent = `Discovered ${pick.name}`;
    saveGame(state);
    renderWorld();
};

// Auto-save every 5 seconds
setInterval(() => {
    const saveData = { ...state, _version: 1, _savedAt: Date.now() };
    localStorage.setItem('mcc_save', JSON.stringify(saveData));
}, 5000);

function setTab(tab) {
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === tab));
    const context = document.getElementById('context');
    if (context) context.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
}

function generateInitialWorldGrid() {
    const cells = [];

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

function getRing1Coord(i) {
    const coords = [[1, -1], [-1, -1], [-2, 0], [-1, 1], [0, 1], [1, 0]];
    return coords[i % 6][0];
}

function getRing1CoordNext(i) {
    const coords = [[1, -1], [-1, -1], [-2, 0], [-1, 1], [0, 1], [1, 0]];
    return coords[(i + 1) % 6][1];
}

// FIXED: Removed the outer redundant wrapping brackets
function getRing2Coords() {
    return [[0, -2], [1, -2], [2, -1], [2, 0], [1, 1], [0, 1], [-1, 0], [-2, -1], [-2, 0], [-1, 1], [0, 2], [1, 2]];
}

function getRing2Coord(i) {
    const coords = getRing2Coords();
    return coords[i % 12][0];
}

function getRing2CoordNext(i) {
    const coords = getRing2Coords();
    return coords[i % 12][1]; // Also fixed index mapping evaluation here
}

renderWorld();