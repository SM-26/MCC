<!-- /src/views/StationView.svelte -->
<script lang="ts">
  import { Button, Select } from 'bits-ui';

  import { debouncedSave } from '../logic/save/save.svelte';
  import { gameState } from '../logic/app/gameState.svelte';
  import { plotsStore } from '../logic/mine/plotsStore.svelte';
  import { worldStore } from '../logic/world/worldStore.svelte';
  import { getExpansionLabel, toRoman } from '../logic/mine/mineLabels';
  import { getPlatformDisplayName } from '../logic/station/stationTypes';
  import {
    PLATFORM_COST,
    STATION_COST,
    buildPlatform,
    buildStation,
    canBuildStation,
    getEligiblePlatformPositions,
    type EligiblePosition,
  } from '../logic/station/stationActions';
  import { triggerMobileToast } from '../components/GameTooltip.svelte';
  import type { Platform } from '../logic/station/stationTypes';

  // --- source of truth: the active plot's embedded station ---
  const activePlotCellId = $derived(worldStore.current.activePlotCellId);
  const activePlotState = $derived(activePlotCellId ? plotsStore.get(activePlotCellId) : null);
  const station = $derived(activePlotState?.station ?? null);
  const money = $derived(gameState.current.money);

  // --- world cell name for the header ---
  const headerName = $derived(worldStore.activePlotCell?.name ?? 'Station');

  // --- active platform (defensive ?? null covers old saves without the field) ---
  const activePlatform = $derived<Platform | null>(
    station?.platforms.find((p) => p.id === (station.activePlatformId ?? null)) ?? station?.platforms[0] ?? null,
  );

  const eligiblePositions = $derived<EligiblePosition[]>(activePlotState ? getEligiblePlatformPositions(activePlotState) : []);

  // --- build affordances ---
  const stationCheck = $derived(activePlotState ? canBuildStation(activePlotState, money) : { ok: false, message: 'No active plot' });
  const canAffordStation = $derived(money >= STATION_COST);
  const canAffordPlatform = $derived(money >= PLATFORM_COST);

  // --- train yard placeholder toggle ---
  let showTrainyard = $state(false);

  // --- platform selector options (keyed by platform id) ---
  const platformOptions = $derived(
    (station?.platforms ?? []).map((p) => ({
      value: p.id,
      label: platformLabel(p),
    })),
  );

  function platformLabel(p: Platform): string {
    // Cross-expansion label: expansion as Roman numeral + depth, plus the
    // per-expansion display name (e.g. "Main Platform" for the foundation).
    const expansion = getExpansionLabel(p.northExpansionIndex);
    const expansionPart = p.northExpansionIndex === 0 ? '' : ` · ${expansion}`;
    const name = station ? getPlatformDisplayName(station, p) : `Platform`;
    return `${name}${expansionPart} · Depth ${p.depth}`;
  }

  function handleBuildStation() {
    if (!activePlotState || !activePlotCellId) return;
    const result = buildStation(activePlotState, gameState.current.money, activePlotCellId);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    gameState.current.money = result.nextMoney ?? gameState.current.money;
    debouncedSave();
  }

  function handleBuildPlatform(position: EligiblePosition) {
    if (!station || !activePlotState) return;
    const result = buildPlatform(station, activePlotState, position.northExpansionIndex, position.depth, gameState.current.money);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    gameState.current.money = result.nextMoney ?? gameState.current.money;
    debouncedSave();
  }

  function handleSelectPlatform(platformId: string) {
    if (!station) return;
    station.activePlatformId = platformId;
    debouncedSave();
  }

  // Total trains sitting on platforms (train management is deferred, so this is
  // a forward-compatible stat — it will start counting once the train yard lands).
  const assignedTrainCount = $derived(station?.platforms.filter((p) => p.train !== null).length ?? 0);
</script>

<section class="station-view">
  <!-- HEADER -->
  <header class="station-header">
    <div class="header-titles">
      <h2 class="header-name">{headerName}</h2>
      <p class="header-sub">
        {#if activePlatform}
          Expansion {toRoman(activePlatform.northExpansionIndex)} · Depth {activePlatform.depth}
        {:else}
          No station yet
        {/if}
      </p>
    </div>
    <Button.Root class="trainyard-btn" onclick={() => (showTrainyard = !showTrainyard)} disabled={!station}>🚂 Train Yard</Button.Root>
  </header>

  <!-- MAIN -->
  <main class="station-main">
    {#if showTrainyard}
      <div class="trainyard-placeholder">
        <h3>Train Yard</h3>
        <p>Train assignment, carts, and routes are coming soon.</p>
        <p class="muted">For now, build platforms here — each platform will host one train.</p>
      </div>
    {:else if !station}
      <!-- No station: build CTA -->
      <div class="cta-card">
        <h3>Build a Station</h3>
        <p class="muted">A station is the hub for every platform and train on this plot. Build it on a hard-cleared surface level (depth 0).</p>
        <ul class="cta-reqs">
          <li class={canAffordStation ? 'met' : 'unmet'}>Cost: {STATION_COST} money</li>
          <li class={stationCheck.ok || !canAffordStation ? 'met' : 'unmet'}>Surface level (depth 0) hard-cleared</li>
        </ul>
        <Button.Root class="buy-btn" onclick={handleBuildStation} disabled={!stationCheck.ok}>
          Build Station · {STATION_COST}
        </Button.Root>
      </div>
    {:else}
      <!-- Station exists: platform management -->
      <div class="platform-section">
        <div class="platform-selector">
          <label for="platform-select" class="selector-label">Platform</label>
          {#if platformOptions.length > 0}
            <Select.Root
              type="single"
              value={activePlatform?.id ?? undefined}
              onValueChange={(value) => {
                if (typeof value === 'string') handleSelectPlatform(value);
              }}
            >
              <Select.Trigger class="select-trigger" id="platform-select">
                <span>{activePlatform ? platformLabel(activePlatform) : 'Select a platform'}</span>
                <span class="select-arrow">▼</span>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content class="select-content">
                  {#each platformOptions as opt (opt.value)}
                    <Select.Item class="select-item" value={opt.value} label={opt.label}>
                      {opt.label}
                    </Select.Item>
                  {/each}
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          {:else}
            <p class="muted">No platforms yet. Build one below.</p>
          {/if}
        </div>

        {#if activePlatform}
          <article class="platform-card">
            <header class="platform-card-header">
              <span class="platform-name">{platformLabel(activePlatform)}</span>
            </header>
            <dl class="platform-stats">
              <div>
                <dt>Expansion</dt>
                <dd>{activePlatform.northExpansionIndex === 0 ? 'Main (I)' : toRoman(activePlatform.northExpansionIndex)}</dd>
              </div>
              <div>
                <dt>Depth</dt>
                <dd>{activePlatform.depth}</dd>
              </div>
              <div>
                <dt>Train</dt>
                <dd>{activePlatform.train ? 'Assigned' : 'None'}</dd>
              </div>
            </dl>
          </article>
        {/if}

        {#if eligiblePositions.length > 0}
          <div class="build-platforms">
            <h4 class="build-title">Build a platform</h4>
            <p class="muted">Available on hard-cleared levels on the platform grid (depth 0, 1, 6, 11, …).</p>
            <div class="build-list">
              {#each eligiblePositions as pos (`${pos.northExpansionIndex}-${pos.depth}`)}
                <Button.Root class="build-btn" onclick={() => handleBuildPlatform(pos)} disabled={!canAffordPlatform}>
                  <span>Expansion {toRoman(pos.northExpansionIndex)} · Depth {pos.depth}</span>
                  <span class="build-cost">{PLATFORM_COST}</span>
                </Button.Root>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </main>

  <!-- FOOTER -->
  <footer class="station-footer">
    <div class="footer-stat">
      <span class="footer-stat-value">{station?.platforms.length ?? 0}</span>
      <span class="footer-stat-label">Platforms</span>
    </div>
    <div class="footer-stat">
      <span class="footer-stat-value">{assignedTrainCount}</span>
      <span class="footer-stat-label">Trains assigned</span>
    </div>
    <div class="footer-stat">
      <span class="footer-stat-value">0</span>
      <span class="footer-stat-label">En route</span>
    </div>
  </footer>
</section>

<style>
  .station-view {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    height: 100%;
    padding: var(--spacing-md);
    box-sizing: border-box;
  }

  /* HEADER */
  .station-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    background: var(--mcc-bg-surface);
    border: 1px solid var(--mcc-border);
    border-radius: 8px;
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .header-titles {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .header-name {
    margin: 0;
    font-size: 1.1rem;
    color: var(--mcc-text-main);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .header-sub {
    margin: 0;
    font-size: 0.8rem;
    color: var(--mcc-text-muted);
  }

  .trainyard-btn {
    flex-shrink: 0;
    background: var(--mcc-panel);
    background-image: var(--mcc-glass-sheen);
    color: var(--mcc-text-main);
    border: 1px solid var(--mcc-border);
    border-radius: 10px;
    padding: 6px 14px;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    transition:
      filter 0.15s ease,
      transform 0.1s ease;
  }

  .trainyard-btn:hover:not(:disabled) {
    filter: brightness(1.15);
  }

  .trainyard-btn:active:not(:disabled) {
    transform: translateY(1px);
  }

  .trainyard-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* MAIN */
  .station-main {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .trainyard-placeholder,
  .cta-card,
  .platform-section {
    background: var(--mcc-bg-surface);
    border: 1px solid var(--mcc-border);
    border-radius: 8px;
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .cta-card h3,
  .trainyard-placeholder h3 {
    margin: 0;
    color: var(--mcc-text-main);
  }

  .muted {
    color: var(--mcc-text-muted);
    margin: 0;
    font-size: 0.85rem;
  }

  .cta-reqs {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.85rem;
  }

  .cta-reqs .met {
    color: var(--success);
  }

  .cta-reqs .unmet {
    color: var(--error);
  }

  .buy-btn {
    align-self: flex-start;
    background: var(--mcc-buy-btn);
    color: #fff;
    border: 1px solid var(--mcc-buy-btn-border);
    border-radius: 6px;
    padding: var(--spacing-sm) var(--spacing-md);
    cursor: pointer;
    font-weight: 600;
  }

  .buy-btn:hover:not(:disabled) {
    background: var(--mcc-buy-btn-hover);
  }

  .buy-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* platform selector */
  .platform-selector {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .selector-label {
    font-size: 0.8rem;
    color: var(--mcc-text-muted);
  }

  .select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    background: var(--mcc-surface-2);
    color: var(--mcc-text-main);
    border: 1px solid var(--mcc-border);
    border-radius: 6px;
    padding: var(--spacing-sm) var(--spacing-md);
    cursor: pointer;
    width: 100%;
    box-sizing: border-box;
  }

  .select-arrow {
    font-size: 0.7rem;
    color: var(--mcc-text-muted);
  }

  /* platform card */
  .platform-card {
    background: var(--mcc-surface-2);
    border: 1px solid var(--mcc-border);
    border-radius: 8px;
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .platform-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .platform-name {
    font-weight: 600;
    color: var(--mcc-text-main);
  }

  .platform-stats {
    display: flex;
    gap: var(--spacing-lg);
    margin: var(--spacing-sm) 0 0;
  }

  .platform-stats div {
    display: flex;
    flex-direction: column;
  }

  .platform-stats dt {
    font-size: 0.7rem;
    color: var(--mcc-text-muted);
    text-transform: uppercase;
  }

  .platform-stats dd {
    margin: 0;
    font-size: 1rem;
    color: var(--mcc-text-main);
    font-weight: 600;
  }

  /* build list */
  .build-title {
    margin: 0;
    color: var(--mcc-text-main);
    font-size: 0.95rem;
  }

  .build-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .build-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    background: var(--mcc-button-bg);
    color: var(--mcc-text-main);
    border: 1px solid var(--mcc-border);
    border-radius: 6px;
    padding: var(--spacing-sm) var(--spacing-md);
    cursor: pointer;
    text-align: left;
    width: 100%;
    box-sizing: border-box;
  }

  .build-btn:hover:not(:disabled) {
    background: var(--mcc-button-hover);
  }

  .build-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .build-cost {
    font-weight: 700;
    color: var(--mcc-accent);
  }

  /* FOOTER */
  .station-footer {
    display: flex;
    justify-content: space-around;
    gap: var(--spacing-sm);
    background: var(--mcc-bg-surface);
    border: 1px solid var(--mcc-border);
    border-radius: 8px;
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .footer-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .footer-stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--mcc-text-main);
  }

  .footer-stat-label {
    font-size: 0.7rem;
    color: var(--mcc-text-muted);
    text-transform: uppercase;
  }
</style>
