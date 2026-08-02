<!-- /src/components/station/PlatformView.svelte -->
<script lang="ts">
  import { Select } from 'bits-ui';
  import PlatformScene from './PlatformScene.svelte';
  import TrainConsist from './TrainConsist.svelte';
  import { commit, missingLabel, plannedCargoUnits, tripPreview } from './stationHelpers.svelte';
  import { formatCountdown, getPlatformNeighbours, getShaftIndexesWithPlatforms, getShallowestPlatform } from './stationSelectors';
  import { gameState } from '../../logic/app/gameState.svelte';
  import { worldStore } from '../../logic/world/worldStore.svelte';
  import { stationUi } from '../../logic/station/stationUi.svelte';
  import { AGE_ORDER } from '../../logic/mine/ageProgression';
  import { toRoman } from '../../logic/mine/mineLabels';
  import { getPlatformDisplayName, getPlatformsForMineshaft, getTotalCartCount, getTripRemainingMs } from '../../logic/station/stationTypes';
  import { createExplorationDestination, getExplorationTarget, isExplorationRoute } from '../../logic/world/worldTypes';
  import { assignRoute, dispatch, dispatchExplore, getActiveExploreTargets, placeEngine, removeCart, removeTrain, upgradeEngine } from '../../logic/station/stationActions';
  import { plotsStore } from '../../logic/mine/plotsStore.svelte';
  import { ENGINE_STATS, MAX_ENGINE_LEVEL, getEngineUpgradeCost } from '../../logic/station/stationBalance';
  import type { CartType, EngineId, Platform, Station } from '../../logic/station/stationTypes';
  import type { PlotState } from '../../logic/mine/mineTypes';

  interface Props {
    station: Station;
    plot: PlotState | null;
    plotCellId: string | null;
    platform: Platform;
    now: number;
    onBack: () => void;
    onSelectPlatform: (platform: Platform) => void;
  }

  const { station, plot, plotCellId, platform, now, onBack, onSelectPlatform }: Props = $props();

  const train = $derived(platform.train);
  const trip = $derived(train?.trip ?? null);

  const displayName = $derived(getPlatformDisplayName(station, platform));
  const shaftLabel = $derived(toRoman(platform.mineshaftIndex + 1));

  // --- steppers ---
  const neighbours = $derived(getPlatformNeighbours(station, platform));
  const shaftIndexes = $derived(getShaftIndexesWithPlatforms(station));
  const shaftPosition = $derived(shaftIndexes.indexOf(platform.mineshaftIndex));
  const shaftPlatformCount = $derived(getPlatformsForMineshaft(station, platform.mineshaftIndex).length);

  function stepShaft(delta: number) {
    const next = shaftIndexes[shaftPosition + delta];
    if (next === undefined) {
      return;
    }
    const target = getShallowestPlatform(station, next);
    if (target) {
      onSelectPlatform(target);
    }
  }

  // --- scene status ---
  type Tone = 'ready' | 'idle' | 'out' | 'empty';
  const tone = $derived<Tone>(!train ? 'empty' : trip ? 'out' : train.route ? 'ready' : 'idle');
  const statusLabel = $derived(
    tone === 'empty'
      ? 'Drop an engine here'
      : tone === 'out' && trip
        ? `Out · ${formatCountdown(getTripRemainingMs(trip, now))}`
        : tone === 'ready'
          ? 'Ready to roll'
          : 'Idle',
  );
  const cartLabel = $derived(train ? `${getTotalCartCount(train)} / ${ENGINE_STATS[train.engineAge].maxCarts} carts` : '');
  const cargoUnits = $derived(train ? plannedCargoUnits(train, plot) : 0);

  // --- route ---
  // Exploration leads: it's the standing order for a scout, and unlike the rest
  // of the list it isn't a place, so it never competes with a real destination.
  const routeDestinations = $derived([createExplorationDestination(), ...worldStore.destinations.filter((d) => d.id !== plotCellId)]);
  const routeDestination = $derived(routeDestinations.find((d) => d.id === train?.route?.destinationId) ?? null);
  const isExploring = $derived(isExplorationRoute(train?.route));

  // Scouts can also be sent from here, not just the World map, but only while a
  // hidden tile is inspected and nobody is already on their way to it.
  const exploreTarget = $derived(getExplorationTarget(worldStore.current));
  const exploreOccupied = $derived(getActiveExploreTargets(plotsStore.current));
  const exploreTargetFree = $derived(exploreTarget !== null && !exploreOccupied.has(exploreTarget.id));
  const routeName = $derived(routeDestination?.name ?? null);
  // "Cargo" on its own never said *which* resource the factory buys.
  const acceptedLabel = $derived(routeDestination?.acceptedResources?.length ? routeDestination.acceptedResources.join(', ') : null);
  const preview = $derived(train && train.route ? tripPreview(train, plot, plotCellId) : null);

  // --- upgrade ---
  const maxed = $derived(train ? train.engineLevel >= MAX_ENGINE_LEVEL : true);
  const upgradeCost = $derived(train ? getEngineUpgradeCost(train.engineAge, train.engineLevel) : null);
  const upgradeMissing = $derived(!train || maxed || !upgradeCost ? '' : missingLabel(upgradeCost, plot?.ageResources));

  // Individual engines now, newest age first and strongest first within an age,
  // so picking "the good one" is the default rather than a hunt.
  const enginesInPool = $derived(
    [...station.trainyardInventory.engines].sort((a, b) => AGE_ORDER.indexOf(b.age) - AGE_ORDER.indexOf(a.age) || b.level - a.level),
  );

  const progressPercent = $derived(trip ? Math.min(100, Math.max(0, (1 - getTripRemainingMs(trip, now) / trip.durationMs) * 100)) : 0);

  function handleRemoveCart(cartType: CartType) {
    if (!train) {
      return;
    }
    commit(removeCart(station, train, cartType));
  }

  function handleUpgrade() {
    if (!train || !plot) {
      return;
    }
    commit(upgradeEngine(train, plot, gameState.current.money));
  }

  function handleDispatch() {
    if (!train || !plot || !plotCellId) {
      return;
    }
    if (isExploring) {
      if (exploreTarget) {
        commit(dispatchExplore(train, worldStore.current, exploreTarget.id, plotCellId, Date.now(), exploreOccupied));
      }
      return;
    }
    commit(dispatch(train, plot, worldStore.current, plotCellId, Date.now()));
  }

  function handlePlaceEngine(engineId: EngineId) {
    commit(placeEngine(station, platform, engineId));
  }

  /** Tapping the engine sends it back to the yard, symmetric with tapping a cart. */
  function handleRemoveEngine() {
    commit(removeTrain(station, platform));
  }

  function handleAssignRoute(destinationId: string) {
    const destination = routeDestinations.find((d) => d.id === destinationId);
    if (train && destination) {
      commit(assignRoute(train, destination));
    }
  }
</script>

<div class="platform-view">
  <header class="top">
    <button type="button" class="chip" onclick={onBack}>‹ All</button>
    <div class="titles">
      <h2 class="title">{displayName}</h2>
      <p class="subtitle">Shaft <span class="roman">{shaftLabel}</span> · Depth {platform.depth}</p>
    </div>
    <button type="button" class="chip" onclick={() => stationUi.openYard('peek')} aria-label="Open train yard">🚂</button>
  </header>

  <!-- Only meaningful once a second shaft actually has a platform. -->
  {#if shaftIndexes.length > 1}
    <div class="stepper-row">
      <button type="button" class="step" onclick={() => stepShaft(-1)} disabled={shaftPosition <= 0} aria-label="Previous shaft">‹</button>
      <span class="stepper-label">Shaft <span class="roman">{shaftLabel}</span> · {shaftPlatformCount} platforms</span>
      <button
        type="button"
        class="step"
        onclick={() => stepShaft(1)}
        disabled={shaftPosition >= shaftIndexes.length - 1}
        aria-label="Next shaft">›</button
      >
    </div>
  {/if}

  <div class="scene-wrap">
    <PlatformScene {train} {statusLabel} statusTone={tone} {cartLabel} {cargoUnits} />

    <!-- Up is shallower, matching the Mine tab's depth gesture deliberately. -->
    <div class="depth-stepper">
      <button
        type="button"
        class="step"
        onclick={() => neighbours.shallower && onSelectPlatform(neighbours.shallower)}
        disabled={!neighbours.shallower}
        aria-label="Platform above"
      >
        ▲
        <span class="step-label">{neighbours.shallower ? `D${neighbours.shallower.depth}` : '-'}</span>
      </button>
      <button
        type="button"
        class="step"
        onclick={() => neighbours.deeper && onSelectPlatform(neighbours.deeper)}
        disabled={!neighbours.deeper}
        aria-label="Platform below"
      >
        ▼
        <span class="step-label">{neighbours.deeper ? `D${neighbours.deeper.depth}` : '-'}</span>
      </button>
    </div>
  </div>

  {#if train}
    <section class="card">
      <div class="card-head">
        <h3 class="card-title">Consist · {train.engineAge} Lv {train.engineLevel}</h3>
        <span class="hint">Tap the engine to recall it, a slot to fill</span>
      </div>
      <TrainConsist
        {train}
        scale={1}
        showSlots
        onEngineClick={handleRemoveEngine}
        onCartClick={handleRemoveCart}
        onSlotClick={() => stationUi.openYardOn('carts')}
      />
    </section>

    <section class="card">
      <span class="field-label" id="route-label">Destination</span>
      <Select.Root
        type="single"
        value={train.route?.destinationId ?? undefined}
        onValueChange={(value) => {
          if (typeof value === 'string') handleAssignRoute(value);
        }}
      >
        <Select.Trigger class="select-trigger" aria-labelledby="route-label">
          <span>{routeName ?? 'No route'}</span>
          <span class="select-arrow">▼</span>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content class="select-content">
            {#each routeDestinations as dest (dest.id)}
              <!-- "Exploration · exploration" reads as a stutter; it isn't a
                   place, so it doesn't get a type suffix. -->
              {@const accepts = dest.acceptedResources?.length ? ` · buys ${dest.acceptedResources.join(', ')}` : ''}
              {@const optionLabel = dest.type === 'exploration' ? dest.name : `${dest.name} · ${dest.type}${accepts}`}
              <Select.Item class="select-item" value={dest.id} label={optionLabel}>
                {optionLabel}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      {#if preview}
        <div class="preview">
          <span>Round trip {preview.etaSec !== null ? `~${preview.etaSec}s` : 'n/a'}</span>
          <span>Pays {preview.reward}</span>
        </div>
      {/if}
      {#if acceptedLabel}
        <p class="hint">Buys {acceptedLabel}. Only that resource sells here.</p>
      {/if}
      {#if isExploring}
        <p class="hint">
          Scout duty. Inspect a hidden tile in the World map, then send this train from either place. The estimate above tracks whichever tile you inspected.
        </p>
      {:else}
        <p class="hint">Explore fog from the World map. Set a train's route to Exploration to send it.</p>
      {/if}
    </section>

    {#if trip}
      <div class="travelling">
        <span class="travelling-label">{trip.kind === 'explore' ? 'Exploring' : 'En route'} · {formatCountdown(getTripRemainingMs(trip, now))}</span>
        <span class="meter"><span class="meter-fill" style="width: {progressPercent}%"></span></span>
      </div>
    {:else}
      <footer class="actions">
        <button type="button" class="btn-secondary" onclick={handleUpgrade} disabled={maxed || upgradeMissing !== ''}>
          {#if maxed}
            Max level
          {:else if upgradeCost}
            ⬆️ Lv {train.engineLevel + 1} · ${upgradeCost.money}
            {#if upgradeMissing}<span class="shortfall">({upgradeMissing})</span>{/if}
          {/if}
        </button>
        <!-- A scout can go from here too, but only once the World map has a
             hidden tile inspected for it to head for. -->
        <button type="button" class="btn-primary" onclick={handleDispatch} disabled={!train.route || (isExploring && !exploreTargetFree)}>
          {#if isExploring}
            {exploreTargetFree ? 'Explore inspected tile' : 'Inspect a hidden tile'}
          {:else}
            Dispatch
          {/if}
        </button>
      </footer>
    {/if}
  {:else}
    <section class="card">
      <h3 class="card-title">Place an engine</h3>
      {#if enginesInPool.length > 0}
        <div class="place-list">
          {#each enginesInPool as engine (engine.id)}
            <button type="button" class="place-row" onclick={() => handlePlaceEngine(engine.id)}>
              <span>{engine.age}</span>
              <span class="hint">Lv {engine.level}</span>
            </button>
          {/each}
        </div>
      {:else}
        <p class="hint">No engines in the yard yet.</p>
        <button type="button" class="btn-primary" onclick={() => stationUi.openYardOn('engines')}>Open the yard</button>
      {/if}
    </section>
  {/if}
</div>

<style>
  .platform-view {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
    min-height: 0;
  }

  .top {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .titles {
    flex: 1;
    text-align: center;
    min-width: 0;
  }

  .title {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
  }

  .subtitle {
    margin: 1px 0 0;
    font-size: 11px;
    color: var(--mcc-text-muted);
  }

  .chip {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 700;
    color: var(--mcc-text-main);
    background: var(--mcc-surface-2);
    border: 1px solid var(--mcc-border);
    border-radius: 999px;
    cursor: pointer;
  }

  .stepper-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .stepper-label {
    flex: 1;
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    padding: 10px;
    background: var(--mcc-panel);
    border: 1px solid var(--mcc-border);
    border-radius: 12px;
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    min-width: 44px;
    min-height: 44px;
    font-size: 13px;
    color: var(--mcc-text-main);
    background: var(--mcc-surface-2);
    border: 1px solid var(--mcc-border);
    border-radius: 12px;
    cursor: pointer;
  }

  .step:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .step-label {
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: var(--mcc-text-muted);
  }

  .scene-wrap {
    position: relative;
    display: flex;
    flex: 1;
    min-height: 180px;
  }

  .depth-stepper {
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
    padding: 12px;
    border-radius: 14px;
    background: var(--mcc-panel);
    border: 1px solid var(--mcc-border);
  }

  .card-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .card-title {
    margin: 0;
    font-size: 13px;
    font-weight: 800;
  }

  .field-label {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--mcc-text-muted);
  }

  .hint {
    margin: 0;
    font-size: 11px;
    color: var(--mcc-text-muted);
  }

  .preview {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 700;
  }

  .place-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .place-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 44px;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 700;
    color: var(--mcc-text-main);
    background: var(--mcc-surface-2);
    border: 1px solid var(--mcc-border);
    border-radius: 12px;
    cursor: pointer;
  }

  .place-row:hover {
    border-color: var(--mcc-accent);
  }

  .actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .btn-secondary,
  .btn-primary {
    min-height: 44px;
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 700;
    border-radius: 12px;
    border: 1px solid var(--mcc-border);
    cursor: pointer;
  }

  .btn-secondary {
    background: var(--mcc-surface-2);
    color: var(--mcc-text-main);
  }

  .btn-primary {
    flex: 1;
    background: linear-gradient(180deg, var(--mcc-green-top), var(--mcc-green-bot));
    border-color: var(--mcc-green-edge);
    color: #ffffff;
  }

  .btn-secondary:disabled,
  .btn-primary:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .shortfall {
    font-size: 10px;
    font-weight: 700;
    color: var(--mcc-text-muted);
  }

  .travelling {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
    padding: 12px;
    border-radius: 12px;
    background: var(--mcc-panel);
    border: 1px solid var(--success);
  }

  .travelling-label {
    font-size: 12px;
    font-weight: 800;
    color: var(--success);
  }

  .meter {
    display: block;
    width: 100%;
    height: 4px;
    border-radius: 999px;
    background: var(--mcc-hp-bg);
    overflow: hidden;
  }

  .meter-fill {
    display: block;
    height: 100%;
    background: var(--success);
    transition: width 1s linear;
  }

  @media (prefers-reduced-motion: reduce) {
    .meter-fill {
      transition: none;
    }
  }
</style>
