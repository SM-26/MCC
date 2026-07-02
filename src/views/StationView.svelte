<!-- /src/views/StationView.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Select } from 'bits-ui';

  import { debouncedSave } from '../logic/save/save.svelte';
  import { gameState } from '../logic/app/gameState.svelte';
  import { plotsStore } from '../logic/mine/plotsStore.svelte';
  import { worldStore } from '../logic/world/worldStore.svelte';
  import { getExpansionLabel, toRoman } from '../logic/mine/mineLabels';
  import { getHexDistance } from '../logic/world/hex';
  import { parseWorldCellId } from '../logic/world/worldTypes';
  import { getPlatformDisplayName, getTotalCartCount, getTripRemainingMs } from '../logic/station/stationTypes';
  import {
    STATION_COST,
    buildPlatform,
    buildStation,
    canBuildStation,
    getEligiblePlatformPositions,
    buyEngine,
    buyCart,
    placeEngine,
    removeTrain,
    addCart,
    removeCart,
    assignRoute,
    dispatch,
    dispatchExplore,
    type EligiblePosition,
  } from '../logic/station/stationActions';
  import { AGE_ORDER, ENGINE_STATS, CART_STATS, isAgeAtLeast, getPlatformCost } from '../logic/station/stationBalance';
  import { triggerMobileToast } from '../components/GameTooltip.svelte';
  import type { Platform, Train, CartType } from '../logic/station/stationTypes';
  import type { Ages, AgeResources } from '../logic/mine/mineTypes';
  import type { Destination } from '../logic/world/worldTypes';

  const CART_TYPES = Object.keys(CART_STATS) as CartType[];

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

  // --- train yard panel toggle ---
  let showTrainyard = $state(false);

  // --- local clock, drives countdown display ---
  let now = $state(Date.now());
  onMount(() => {
    const timer = window.setInterval(() => (now = Date.now()), 1000);
    return () => window.clearInterval(timer);
  });

  function lacksResources(required: Partial<AgeResources>, available: AgeResources): boolean {
    return (Object.entries(required) as [keyof AgeResources, number][]).some(([resource, amount]) => available[resource] < amount);
  }

  // --- fog cells eligible for exploration, nearest first ---
  const exploreOptions = $derived.by(() => {
    if (!activePlotCellId) return [];
    const origin = parseWorldCellId(activePlotCellId);
    if (!origin) return [];
    return worldStore.current.cells
      .filter((c) => !c.discovered)
      .map((c) => ({ id: c.id, distance: getHexDistance(origin, { q: c.q, r: c.r }) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 12);
  });

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

  function handleBuyEngine(age: Ages) {
    if (!station || !activePlotState) return;
    const result = buyEngine(station, activePlotState, age, gameState.current.money);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    gameState.current.money = result.nextMoney ?? gameState.current.money;
    debouncedSave();
  }

  function handleBuyCart(cartType: CartType) {
    if (!station) return;
    const result = buyCart(station, cartType, gameState.current.money);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    gameState.current.money = result.nextMoney ?? gameState.current.money;
    debouncedSave();
  }

  function handlePlaceEngine(age: Ages) {
    if (!station || !activePlatform) return;
    const result = placeEngine(station, activePlatform, age);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    debouncedSave();
  }

  function handleRemoveTrain() {
    if (!station || !activePlatform) return;
    const result = removeTrain(station, activePlatform);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    debouncedSave();
  }

  function handleAddCart(train: Train, cartType: CartType) {
    if (!station) return;
    const result = addCart(station, train, cartType);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    debouncedSave();
  }

  function handleRemoveCart(train: Train, cartType: CartType) {
    if (!station) return;
    const result = removeCart(station, train, cartType);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    debouncedSave();
  }

  function handleAssignRoute(train: Train, destination: Destination) {
    const result = assignRoute(train, destination);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    debouncedSave();
  }

  function handleDispatch(train: Train) {
    if (!activePlotState || !activePlotCellId) return;
    const result = dispatch(train, activePlotState, worldStore.current, activePlotCellId, Date.now());
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    debouncedSave();
  }

  function handleDispatchExplore(train: Train, targetCellId: string) {
    if (!activePlotCellId) return;
    const result = dispatchExplore(train, worldStore.current, targetCellId, activePlotCellId, Date.now());
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    debouncedSave();
  }

  // Trains currently assigned to platforms.
  const assignedTrainCount = $derived(station?.platforms.filter((p) => p.train !== null).length ?? 0);
  const enRouteCount = $derived(station?.platforms.filter((p) => p.train?.trip).length ?? 0);
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
        {#if station && activePlotState}
          <div class="build-list">
            <h4 class="build-title">Engines</h4>
            {#each AGE_ORDER as age (age)}
              {@const cost = ENGINE_STATS[age].cost}
              {@const locked = !isAgeAtLeast(activePlotState.currentAge, age)}
              {@const unaffordable = money < cost.money || lacksResources(cost.resources, activePlotState.ageResources)}
              <Button.Root class="build-btn" onclick={() => handleBuyEngine(age)} disabled={locked || unaffordable}>
                <span>{age} engine</span>
                <span class="build-cost">
                  {cost.money}{#each Object.entries(cost.resources) as [res, amt] (res)}&nbsp;+ {amt} {res}{/each}
                </span>
              </Button.Root>
            {/each}
          </div>
          <div class="build-list">
            <h4 class="build-title">Carts</h4>
            {#each CART_TYPES as cartType (cartType)}
              {@const cost = CART_STATS[cartType].cost}
              <Button.Root class="build-btn" onclick={() => handleBuyCart(cartType)} disabled={money < cost.money}>
                <span>{cartType} cart</span>
                <span class="build-cost">{cost.money}</span>
              </Button.Root>
            {/each}
          </div>
          <p class="muted">
            Pool:
            {#each Object.entries(station.trainyardInventory.engines).filter(([, count]) => (count ?? 0) > 0) as [age, count] (age)}
              {count} {age}&nbsp;
            {/each}
            {#each Object.entries(station.trainyardInventory.carts).filter(([, count]) => (count ?? 0) > 0) as [cartType, count] (cartType)}
              {count} {cartType}&nbsp;
            {/each}
          </p>
        {:else}
          <p class="muted">Build a station first.</p>
        {/if}
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

            {#if activePlatform.train}
              {@const train = activePlatform.train}
              {#if train.trip}
                {@const trip = train.trip}
                <p class="muted">
                  Traveling · {Math.ceil(getTripRemainingMs(trip, now) / 1000)}s{trip.kind === 'explore' ? ' (exploring)' : ''}
                </p>
              {:else}
                <div class="build-list">
                  {#each CART_TYPES as cartType (cartType)}
                    {@const slot = train.carts.find((s) => s.cartType === cartType)}
                    <div class="cart-row">
                      <span>{cartType}</span>
                      <span class="cart-row-controls">
                        <button type="button" class="qty-btn" onclick={() => handleRemoveCart(train, cartType)} disabled={!slot}>−</button>
                        <span>{slot?.count ?? 0}</span>
                        <button
                          type="button"
                          class="qty-btn"
                          onclick={() => handleAddCart(train, cartType)}
                          disabled={(station?.trainyardInventory.carts[cartType] ?? 0) <= 0 || getTotalCartCount(train) >= ENGINE_STATS[train.engineAge].maxCarts}
                        >
                          +
                        </button>
                      </span>
                    </div>
                  {/each}
                  <p class="muted">{getTotalCartCount(train)}/{ENGINE_STATS[train.engineAge].maxCarts} carts</p>
                </div>

                <div class="platform-selector">
                  <label for="route-select" class="selector-label">Route</label>
                  <Select.Root
                    type="single"
                    value={train.route?.destinationId ?? undefined}
                    onValueChange={(value) => {
                      if (typeof value !== 'string') return;
                      const destination = worldStore.destinations.find((d) => d.id === value);
                      if (destination) handleAssignRoute(train, destination);
                    }}
                  >
                    <Select.Trigger class="select-trigger" id="route-select">
                      <span>{worldStore.destinations.find((d) => d.id === train.route?.destinationId)?.name ?? 'No route'}</span>
                      <span class="select-arrow">▼</span>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content class="select-content">
                        {#each worldStore.destinations as dest (dest.id)}
                          <Select.Item class="select-item" value={dest.id} label={`${dest.name} · ${dest.type}`}>
                            {dest.name} · {dest.type}
                          </Select.Item>
                        {/each}
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>

                <div class="platform-selector">
                  <label for="explore-select" class="selector-label">Explore</label>
                  <Select.Root
                    type="single"
                    value={undefined}
                    onValueChange={(value) => {
                      if (typeof value === 'string') handleDispatchExplore(train, value);
                    }}
                  >
                    <Select.Trigger class="select-trigger" id="explore-select">
                      <span>Send to fog</span>
                      <span class="select-arrow">▼</span>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content class="select-content">
                        {#each exploreOptions as opt (opt.id)}
                          <Select.Item class="select-item" value={opt.id} label={`? · distance ${opt.distance}`}>
                            ? · distance {opt.distance}
                          </Select.Item>
                        {/each}
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>

                <div class="cart-row">
                  <Button.Root class="build-btn" onclick={() => handleDispatch(train)} disabled={!train.route}>Dispatch</Button.Root>
                  <Button.Root class="build-btn" onclick={handleRemoveTrain}>Remove train</Button.Root>
                </div>
              {/if}
            {:else}
              <div class="build-list">
                {#each AGE_ORDER.filter((age) => (station?.trainyardInventory.engines[age] ?? 0) > 0) as age (age)}
                  <Button.Root class="build-btn" onclick={() => handlePlaceEngine(age)}>
                    <span>Place {age} engine</span>
                    <span class="build-cost">{station?.trainyardInventory.engines[age] ?? 0} in yard</span>
                  </Button.Root>
                {:else}
                  <p class="muted">No engines in the yard. Buy one from the Train Yard.</p>
                {/each}
              </div>
            {/if}
          </article>
        {/if}

        {#if eligiblePositions.length > 0}
          <div class="build-platforms">
            <h4 class="build-title">Build a platform</h4>
            <p class="muted">Available on hard-cleared levels on the platform grid (depth 0, 6, 11, 16, …).</p>
            <div class="build-list">
              {#each eligiblePositions as pos (`${pos.northExpansionIndex}-${pos.depth}`)}
                {@const cost = getPlatformCost(pos.depth, activePlotState?.currentAge ?? 'Mechanical')}
                {@const missingResources = activePlotState ? lacksResources(cost.resources, activePlotState.ageResources) : false}
                <Button.Root class="build-btn" onclick={() => handleBuildPlatform(pos)} disabled={money < cost.money || missingResources}>
                  <span>Expansion {toRoman(pos.northExpansionIndex)} · Depth {pos.depth}</span>
                  <span class="build-cost">
                    {cost.money}{#each Object.entries(cost.resources) as [res, amt] (res)}&nbsp;+ {amt} {res}{/each}
                  </span>
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
      <span class="footer-stat-value">{enRouteCount}</span>
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

  /* cart rows / dispatch controls — reuses build-btn colors at a smaller footprint */
  .cart-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
  }

  .cart-row-controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .qty-btn {
    background: var(--mcc-button-bg);
    color: var(--mcc-text-main);
    border: 1px solid var(--mcc-border);
    border-radius: 6px;
    width: 1.8rem;
    height: 1.8rem;
    cursor: pointer;
  }

  .qty-btn:hover:not(:disabled) {
    background: var(--mcc-button-hover);
  }

  .qty-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
