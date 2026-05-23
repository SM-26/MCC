(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const SAVE_KEY = "mcc_save";
const CURRENT_VERSION = 1;
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createDefaultSave();
    const saved = JSON.parse(raw);
    if (saved._version !== CURRENT_VERSION) {
      console.warn(`Save version mismatch: ${saved._version} vs ${CURRENT_VERSION}`);
    }
    return createValidatedSave(saved);
  } catch (error) {
    console.error("Failed to load save:", error);
    return createDefaultSave();
  }
}
function saveGame(state2) {
  const saveData = {
    ...state2,
    _version: CURRENT_VERSION,
    _savedAt: Date.now()
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}
function createDefaultSave() {
  const worldGrid = generateInitialWorldGrid$1();
  return {
    money: 200,
    playerPlotId: "plot-A-I-1",
    plots: [],
    worldDiscovered: ["plot-A-I-1"],
    worldGrid,
    destinations: [],
    engineeringIdeas: 0,
    resetCount: 0,
    version: CURRENT_VERSION,
    lastSaveTime: Date.now()
  };
}
function createValidatedSave(saved) {
  const normalized = {
    ...saved,
    money: Number(saved.money || 0),
    plots: saved.plots || [],
    worldDiscovered: saved.worldDiscovered || [],
    destinations: saved.destinations || [],
    engineeringIdeas: Number(saved.engineeringIdeas || 0),
    resetCount: Number(saved.resetCount || 0)
  };
  if (!normalized.plots.find((p) => p.id === normalized.playerPlotId)) {
    normalized.plots.push(createInitialPlot());
  }
  return normalized;
}
function generateInitialWorldGrid$1() {
  const cells = [];
  cells.push(createHexCell("plot-A-I-1", "Plot A I 1", "plot", 0, 0));
  for (let i = 0; i < 6; i++) {
    const q = getRing1Coord$1(i);
    const r = getRing1CoordNext$1(i);
    const type = i === 3 ? "city" : i === 0 ? "factory" : "fog";
    cells.push(createHexCell(
      `${type}-${i}`,
      type === "plot" ? "" : `${type.charAt(0).toUpperCase()}${type.slice(1)} ${i + 1}`,
      type,
      q,
      r
    ));
  }
  for (let i = 0; i < 12; i++) {
    const q = getRing2Coord$1(i);
    const r = getRing2CoordNext$1(i);
    cells.push(createHexCell(
      `fog-${i + 6}`,
      "",
      "fog",
      q,
      r
    ));
  }
  return cells;
}
function createRing1Coords() {
  return [
    [1, -1],
    [-1, -1],
    [-2, 0],
    [-1, 1],
    [0, 1],
    [1, 0]
  ];
}
function getRing1Coord$1(i) {
  const coords = createRing1Coords();
  return coords[i % 6][0];
}
function getRing1CoordNext$1(i) {
  const coords = createRing1Coords();
  return coords[(i + 1) % 6][1];
}
function getRing2Coords$1() {
  return [
    [[0, -2], [1, -2], [2, -1], [2, 0], [1, 1], [0, 1], [-1, 0], [-2, -1], [-2, 0], [-1, 1], [0, 2], [1, 2]]
  ][0];
}
function getRing2Coord$1(i) {
  const coords = getRing2Coords$1();
  return coords[i % 12][0];
}
function getRing2CoordNext$1(i) {
  const coords = getRing2Coords$1();
  return coords[(i + 1) % 12][1];
}
function createHexCell(id, name, type, q, r) {
  return {
    id,
    name,
    type,
    q,
    r,
    discovered: type === "plot"
  };
}
function createInitialPlot() {
  return {
    id: "plot-A-I-1",
    northExpansions: 0,
    undergroundLevels: 0,
    softCleared: false,
    hardCleared: false,
    ageResources: { coal: 0, oil: 0, copper: 0, superAlloy: 0 },
    currentAge: "basic",
    availableAges: ["basic"],
    stationBuilt: false,
    stationId: null,
    tiles: [],
    // Will be initialized when plot is dug
    miners: []
  };
}
const state = loadSave();
state.plots = state.plots || [];
state.worldDiscovered = state.worldDiscovered || [];
state.destinations = state.destinations || [];
function renderWorld() {
  const worldGrid = state.worldGrid || generateInitialWorldGrid();
  renderWorldGrid(worldGrid, state.playerPlotId);
}
function renderWorldGrid(worldGrid, playerPlotId) {
  const container = document.getElementById("world-map");
  if (!container) return;
  container.innerHTML = "";
  worldGrid.forEach((cell) => {
    const isHidden = cell.type !== "plot" && !cell.discovered;
    const hex = document.createElement("div");
    hex.className = `hex ${cell.type} ${isHidden ? "hidden" : ""} ${cell.id === playerPlotId ? "player" : ""}`;
    const pos = hexPos(cell.q, cell.r);
    hex.style.left = `${pos.left}px`;
    hex.style.top = `${pos.top}px`;
    if (cell.type === "fog") {
      hex.innerHTML = "<div>Fog</div>";
    } else {
      hex.innerHTML = `
        <div>${cell.name || cell.id}</div>
        <div class="small">${cell.type}</div>
      `;
    }
    hex.onclick = () => {
      if (isHidden) {
        const msg = document.getElementById("world-msg");
        if (msg) msg.textContent = "Undiscovered.";
        return;
      }
      if (cell.type === "plot") {
        setTab("plot");
      } else if (cell.type === "city" || cell.type === "factory") {
        const msg = document.getElementById("world-msg");
        if (msg) msg.textContent = `Selected ${cell.name}`;
      }
    };
    container.appendChild(hex);
  });
}
function hexPos(q, r) {
  const gapX = 67;
  const gapY = 60;
  return {
    left: 160 + q * gapX + (r % 2 ? gapX / 2 : 0),
    top: 70 + r * gapY
  };
}
document.querySelectorAll(".tab").forEach((b) => {
  b.onclick = () => {
    const tab = b.dataset.tab;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === tab));
    const context = document.getElementById("context");
    if (context) context.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
    saveGame(state);
  };
});
const openPlotBtn = document.getElementById("open-plot-btn");
if (openPlotBtn) openPlotBtn.onclick = () => {
  setTab("plot");
};
const openStationBtn = document.getElementById("open-station-btn");
if (openStationBtn) openStationBtn.onclick = () => {
  setTab("station");
};
const devBtn = document.getElementById("dev-btn");
if (devBtn) devBtn.onclick = () => {
  state.dev = !state.dev;
  renderWorld();
  saveGame(state);
};
const resetBtn = document.getElementById("reset-btn");
if (resetBtn) resetBtn.onclick = () => {
  localStorage.removeItem("mcc_save");
  location.reload();
};
const exploreBtn = document.getElementById("explore-btn");
if (exploreBtn) exploreBtn.onclick = () => {
  const undiscovered = state.worldDestinations.filter((d) => !d.discovered);
  if (!undiscovered.length) {
    const msg2 = document.getElementById("world-msg");
    if (msg2) msg2.textContent = "No more destinations to discover.";
    return;
  }
  const pick = undiscovered[0];
  pick.discovered = true;
  state.worldDiscovered.push(pick.id);
  const msg = document.getElementById("world-msg");
  if (msg) msg.textContent = `Discovered ${pick.name}`;
  saveGame(state);
  renderWorld();
};
setInterval(() => {
  const saveData = { ...state, _version: 1, _savedAt: Date.now() };
  localStorage.setItem("mcc_save", JSON.stringify(saveData));
}, 5e3);
function setTab(tab) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === tab));
  const context = document.getElementById("context");
  if (context) context.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
}
function generateInitialWorldGrid() {
  const cells = [];
  cells.push({ id: "plot-A-I-1", name: "Plot A I 1", type: "plot", q: 0, r: 0, discovered: true });
  for (let i = 0; i < 6; i++) {
    const q = getRing1Coord(i);
    const r = getRing1CoordNext(i);
    const type = i === 3 ? "city" : i === 0 ? "factory" : "fog";
    cells.push({
      id: `${type}-${i}`,
      name: type === "plot" ? "" : `${type.charAt(0).toUpperCase()}${type.slice(1)} ${i + 1}`,
      type,
      q,
      r,
      discovered: false
    });
  }
  for (let i = 0; i < 12; i++) {
    const q = getRing2Coord(i);
    const r = getRing2CoordNext(i);
    cells.push({ id: `fog-${i + 6}`, name: "", type: "fog", q, r, discovered: false });
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
function getRing2Coords() {
  return [[0, -2], [1, -2], [2, -1], [2, 0], [1, 1], [0, 1], [-1, 0], [-2, -1], [-2, 0], [-1, 1], [0, 2], [1, 2]];
}
function getRing2Coord(i) {
  const coords = getRing2Coords();
  return coords[i % 12][0];
}
function getRing2CoordNext(i) {
  const coords = getRing2Coords();
  return coords[i % 12][1];
}
renderWorld();
//# sourceMappingURL=index-M8wFWeoS.js.map
