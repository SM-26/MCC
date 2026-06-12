<script lang="ts">
  import { gameState } from '../stores/index.svelte';
  import { getClearStatus, generatePlot } from '../logic/mineGen';
  import { toastState } from '../components/GameTooltip.svelte';

  // Constants
  const BASE_MINER_COST = 50;

  // Local derived state
  const activePlot = $derived(gameState.mines?.plots?.[gameState.mines.activePlot] ?? null);
  const clearStatus = $derived(getClearStatus(activePlot));
  const minerCost = $derived(Math.floor(BASE_MINER_COST * Math.pow(1.5, activePlot.miners.length)));
  const canBuyMiner = $derived(gameState.money >= minerCost);

  function handleBuyMiner() {
    if (!canBuyMiner) {
      toastState.activeText = 'Not enough money!';
      return;
    }

    // Find all empty tiles and store their flat index (r * cols + c)
    const emptyIndices: number[] = [];
    activePlot.tiles.forEach((row, r) => {
      row.forEach((tile, c) => {
        const idx = r * activePlot.cols + c;
        const isOccupied = activePlot.miners.some((m) => m.tileIndex === idx);
        if (tile.type === 'empty' && !isOccupied) {
          emptyIndices.push(idx);
        }
      });
    });

    if (emptyIndices.length === 0) {
      toastState.activeText = 'No room to place a miner!';
      return;
    }

    gameState.money -= minerCost;

    // Use the last index found (bottom-most row)
    const targetIdx = emptyIndices[emptyIndices.length - 1];

    activePlot.miners.push({
      level: 1,
      tileIndex: targetIdx,
      facing: 0,
      progress: 0,
    });
  }

  function handleDigDeeper() {
    if (clearStatus !== 'hard') {
      toastState.activeText = 'Clear all rubble and dirt first!';
      return;
    }
    // Logic: generate new plot, preserve miners
    const newTiles = generatePlot(gameState.settings.worldSeed, activePlot.depth + 1, 0).tiles;
    activePlot.tiles = newTiles;
    activePlot.depth++;
  }
</script>

{#if activePlot}
  <div class="mine-view">
    <header class="mine-controls">
      <div class="stats">
        <span>Depth: {activePlot.depth}</span>
        <span>Status: {clearStatus.toUpperCase()}</span>
      </div>
      <div class="actions">
        <button onclick={handleBuyMiner} disabled={!canBuyMiner}>
          Buy Miner (${minerCost})
        </button>
        <button onclick={handleDigDeeper} disabled={clearStatus !== 'hard'}> Dig Deeper </button>
      </div>
    </header>

    <div class="tile-grid" style:grid-template-columns="repeat({activePlot.cols}, 1fr)">
      {#each activePlot.tiles as row, r (`row-${r}`)}
        {#each row as tile, c (`tile-${r}-${c}`)}
          {@const miner = activePlot.miners.find((m) => m.tileIndex === r * activePlot.cols + c)}
          <div class="tile {tile.type}">
            {#if tile.type !== 'empty' && tile.type !== 'blocker'}
              <div class="hp-bar">
                <div class="hp-fill" style:width="{(tile.hp / tile.maxHp) * 100}%"></div>
              </div>
            {/if}
            {#if miner}
              <div class="miner" style:transform="rotate({miner.facing}deg)">
                ⛏️ {miner.level}
              </div>
            {/if}
          </div>
        {/each}
      {/each}
    </div>
  </div>
{:else}
  <div class="loading-state">Loading Mine...</div>
{/if}

<style>
  .mine-view {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  .tile-grid {
    display: grid;
    gap: 4px;
    background: #2a2a2a;
    padding: 8px;
    border-radius: 8px;
  }
  .tile {
    aspect-ratio: 1;
    background: #444;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .tile.dirt {
    background: #8b4513;
  }
  .tile.blocker {
    background: #333;
  }
  .tile.rubble {
    background: #666;
  }

  .hp-bar {
    position: absolute;
    bottom: 2px;
    left: 2px;
    right: 2px;
    height: 4px;
    background: black;
  }
  .hp-fill {
    height: 100%;
    background: lime;
  }
  .miner {
    color: gold;
    font-weight: bold;
  }
</style>
