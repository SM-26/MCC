<!-- /src/components/station/TrainYardDrawer.svelte -->
<script lang="ts">
  import { commit, missingLabel } from './stationHelpers.svelte';
  import { gameState } from '../../logic/app/gameState.svelte';
  import { stationUi } from '../../logic/station/stationUi.svelte';
  import { AGE_ORDER, isAgeAtLeast } from '../../logic/mine/ageProgression';
  import { toRoman } from '../../logic/mine/mineLabels';
  import { CART_SPRITE, ENGINE_SPRITE } from '../../logic/station/stationSprites';
  import { CART_STATS, ENGINE_STATS } from '../../logic/station/stationBalance';
  import { addCart, buyCart, buyEngine, placeEngine, removeTrain } from '../../logic/station/stationActions';
  import type { CartType, EngineId, Platform, Station } from '../../logic/station/stationTypes';
  import type { Ages, PlotState } from '../../logic/mine/mineTypes';

  interface Props {
    station: Station;
    plot: PlotState | null;
    /** Where a tapped engine goes. Falls back to the station's focused platform. */
    targetPlatform: Platform | null;
  }

  const { station, plot, targetPlatform }: Props = $props();

  const CART_TYPES = Object.keys(CART_STATS) as CartType[];

  const height = $derived(stationUi.current.yard);
  const tab = $derived(stationUi.current.yardTab);

  // Newest age first, strongest first within an age.
  const enginePool = $derived(
    [...station.trainyardInventory.engines].sort((a, b) => AGE_ORDER.indexOf(b.age) - AGE_ORDER.indexOf(a.age) || b.level - a.level),
  );
  const cartPool = $derived(CART_TYPES.filter((cartType) => (station.trainyardInventory.carts[cartType] ?? 0) > 0));
  const assignedPlatforms = $derived(station.platforms.filter((platform) => platform.train !== null));
  const countForAge = $derived((age: Ages) => station.trainyardInventory.engines.filter((engine) => engine.age === age).length);

  function handlePlaceEngine(engineId: EngineId) {
    if (!targetPlatform) {
      return;
    }
    if (commit(placeEngine(station, targetPlatform, engineId))) {
      stationUi.closeYard();
    }
  }

  function handleBuyEngine(age: Ages) {
    if (!plot) {
      return;
    }
    commit(buyEngine(station, plot, age, gameState.current.money));
  }

  function handleBuyCart(cartType: CartType) {
    commit(buyCart(station, cartType, gameState.current.money));
  }

  /**
   * The other half of "tap an empty slot": the slot opens this tab, and picking
   * a type here attaches it. Over-capacity is left to addCart's own guard so the
   * refusal arrives as a toast that says why.
   */
  function handleAddCart(cartType: CartType) {
    const train = targetPlatform?.train;
    if (!train) {
      return;
    }
    if (commit(addCart(station, train, cartType))) {
      stationUi.closeYard();
    }
  }

  function handleRecall(platform: Platform) {
    commit(removeTrain(station, platform));
  }
</script>

{#if height !== 'closed'}
  <!-- Dims the screen without hiding it: the rail behind stays readable so you
       can see what you are placing onto. -->
  <button type="button" class="scrim" onclick={() => stationUi.closeYard()} aria-label="Close train yard"></button>

  <aside class="drawer" class:full={height === 'full'}>
    <div class="handle" aria-hidden="true"></div>

    {#if height === 'peek'}
      <!-- Peek answers "what do I own": every bay here is assignable. Buying
           lives one level up, in the expanded view. -->
      <header class="peek-head">
        <h3 class="drawer-title">Train Yard</h3>
        <p class="drawer-sub">Tap to assign</p>
      </header>

      <div class="bays">
        {#each enginePool as engine (engine.id)}
          <button type="button" class="bay" onclick={() => handlePlaceEngine(engine.id)} disabled={!targetPlatform}>
            <img class="bay-sprite engine" src={ENGINE_SPRITE[engine.age]} alt="" draggable="false" />
            <span class="bay-label">{engine.age} Lv {engine.level}</span>
          </button>
        {/each}
        {#each cartPool as cartType (cartType)}
          <button type="button" class="bay" onclick={() => handleAddCart(cartType)} disabled={!targetPlatform?.train}>
            <img class="bay-sprite cart" src={CART_SPRITE[cartType]} alt="" draggable="false" />
            <span class="bay-label">{cartType} ×{station.trainyardInventory.carts[cartType] ?? 0}</span>
          </button>
        {/each}
        {#if enginePool.length === 0 && cartPool.length === 0}
          <p class="hint">Nothing in the pool yet. Expand the yard to buy stock.</p>
        {/if}
      </div>

      <button type="button" class="expand" onclick={() => stationUi.openYard('full')}>Expand yard ▴</button>
    {:else}
      <header class="full-head">
        <div>
          <h3 class="drawer-title">Train Yard</h3>
          <p class="drawer-sub">Buy stock · collapse to assign</p>
        </div>
        <button type="button" class="chip" onclick={() => stationUi.openYard('peek')} aria-label="Collapse yard">▾</button>
      </header>

      <div class="segmented" role="tablist">
        {#each [{ id: 'engines', label: 'Engines' }, { id: 'carts', label: 'Carts' }, { id: 'assigned', label: 'Assigned' }] as seg (seg.id)}
          <button
            type="button"
            role="tab"
            aria-selected={tab === seg.id}
            class="seg"
            class:on={tab === seg.id}
            onclick={() => stationUi.setYardTab(seg.id as 'engines' | 'carts' | 'assigned')}
          >
            {seg.label}
          </button>
        {/each}
      </div>

      <div class="rows">
        {#if tab === 'engines'}
          {#each AGE_ORDER as age (age)}
            {@const locked = !plot || !isAgeAtLeast(plot.currentAge, age)}
            {@const pooled = countForAge(age)}
            {@const cost = ENGINE_STATS[age].cost}
            {@const missing = missingLabel(cost, plot?.ageResources)}
            <div class="row" class:locked>
              <img class="row-sprite engine" src={ENGINE_SPRITE[age]} alt="" draggable="false" />
              <span class="row-body">
                <span class="row-title">{age}</span>
                <span class="row-sub">
                  {#if locked}
                    Locked · reach the {age} age
                  {:else}
                    {ENGINE_STATS[age].maxCarts} carts · speed {ENGINE_STATS[age].speed} · in pool ×{pooled}
                  {/if}
                </span>
              </span>
              <!-- Buy only. Assigning happens in the peek view, where the pool
                   lists each engine with the level it actually carries. -->
              {#if !locked}
                <button type="button" class="btn-buy" onclick={() => handleBuyEngine(age)} disabled={missing !== ''}>
                  ${cost.money}{#each Object.entries(cost.resources) as [res, amt] (res)}&nbsp;+ {amt} {res}{/each}
                </button>
              {/if}
            </div>
          {/each}
        {:else if tab === 'carts'}
          {#each CART_TYPES as cartType (cartType)}
            {@const stats = CART_STATS[cartType]}
            {@const pooled = station.trainyardInventory.carts[cartType] ?? 0}
            <div class="row">
              <img class="row-sprite cart" src={CART_SPRITE[cartType]} alt="" draggable="false" />
              <span class="row-body">
                <span class="row-title">{cartType}</span>
                <span class="row-sub">{stats.role} · capacity {stats.capacity} · in pool ×{pooled}</span>
              </span>
              <button type="button" class="btn-buy" onclick={() => handleBuyCart(cartType)} disabled={gameState.current.money < stats.cost.money}>
                ${stats.cost.money}
              </button>
            </div>
          {/each}
        {:else}
          {#each assignedPlatforms as platform (platform.id)}
            {@const train = platform.train}
            {#if train}
              <div class="row">
                <span class="depth-badge">
                  <span class="depth-num">{platform.depth}</span>
                  <span class="depth-shaft roman">{toRoman(platform.mineshaftIndex + 1)}</span>
                </span>
                <span class="row-body">
                  <span class="row-title">{train.engineAge} · Lv {train.engineLevel}</span>
                  <span class="row-sub">
                    {#if train.trip}
                      En route · locked until return
                    {:else if train.route}
                      Ready at {platform.depth === 0 ? 'the main platform' : `depth ${platform.depth}`}
                    {:else}
                      Idle · no route
                    {/if}
                  </span>
                </span>
                <button type="button" class="btn-assign" onclick={() => handleRecall(platform)} disabled={train.trip !== null}>Recall</button>
              </div>
            {/if}
          {:else}
            <p class="hint">No trains assigned yet.</p>
          {/each}
        {/if}
      </div>

      <button type="button" class="done" onclick={() => stationUi.closeYard()}>Done</button>
    {/if}
  </aside>
{/if}

<style>
  /* Both the scrim and the drawer are absolute inside the Station view, never
     fixed to the viewport — that is what keeps them clear of the nav bar, which
     the player can put at the top or the bottom. */
  .scrim {
    position: absolute;
    inset: 0;
    z-index: 5;
    background: rgba(0, 0, 0, 0.45);
    border: none;
    padding: 0;
    cursor: pointer;
    animation: fade 0.2s ease;
  }

  .drawer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 6;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 55%;
    padding: 8px 12px 12px;
    background: var(--mcc-panel-solid);
    border-top: 1px solid var(--mcc-border);
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
    animation: slide-up 0.25s cubic-bezier(0.34, 1.3, 0.64, 1);
  }

  .drawer.full {
    max-height: 88%;
    height: 88%;
  }

  .handle {
    width: 36px;
    height: 4px;
    margin: 0 auto;
    border-radius: 999px;
    background: var(--mcc-border);
    flex-shrink: 0;
  }

  .peek-head,
  .full-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-shrink: 0;
  }

  .drawer-title {
    margin: 0;
    font-size: 15px;
    font-weight: 800;
  }

  .drawer-sub {
    margin: 1px 0 0;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--mcc-text-muted);
  }

  .bays {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .bay {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 10px 14px;
    background: var(--mcc-surface-2);
    border: 1px solid var(--mcc-border);
    border-radius: 12px;
    color: var(--mcc-text-main);
    cursor: pointer;
  }

  .bay:hover:not(:disabled):not(.is-static) {
    border-color: var(--mcc-accent);
  }

  .bay:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .bay-sprite,
  .row-sprite {
    display: block;
    image-rendering: pixelated;
  }

  .bay-sprite.engine {
    width: 60px;
    height: 40px;
  }

  .bay-sprite.cart {
    width: 36px;
    height: 40px;
  }

  .row-sprite.engine {
    width: 60px;
    height: 40px;
  }

  .row-sprite.cart {
    width: 36px;
    height: 40px;
  }

  .bay-label {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mcc-text-muted);
  }

  .expand,
  .done {
    min-height: 44px;
    padding: 12px;
    font-size: 13px;
    font-weight: 700;
    border-radius: 12px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .expand {
    background: var(--mcc-surface-2);
    color: var(--mcc-text-main);
    border: 1px solid var(--mcc-border);
  }

  .done {
    background: var(--mcc-accent);
    color: #1a1a1a;
    border: 1px solid var(--mcc-accent);
  }

  .segmented {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    flex-shrink: 0;
    padding: 4px;
    background: var(--mcc-surface-2);
    border: 1px solid var(--mcc-border);
    border-radius: 12px;
  }

  .seg {
    min-height: 36px;
    font-size: 12px;
    font-weight: 700;
    color: var(--mcc-text-muted);
    background: transparent;
    border: none;
    border-radius: 9px;
    cursor: pointer;
  }

  .seg.on {
    background: var(--mcc-panel);
    color: var(--mcc-text-main);
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 8px 10px;
    background: var(--mcc-panel);
    border: 1px solid var(--mcc-border);
    border-radius: 12px;
  }

  .row.locked {
    border-style: dashed;
    opacity: 0.6;
  }

  .row-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
    text-align: left;
  }

  .row-title {
    font-size: 13px;
    font-weight: 700;
    text-transform: capitalize;
  }

  .row-sub {
    font-size: 11px;
    color: var(--mcc-text-muted);
  }

  .depth-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 38px;
    padding: 4px 0;
    border-radius: 9px;
    background: var(--mcc-surface-2);
    border: 1px solid var(--mcc-border);
    flex-shrink: 0;
  }

  .depth-num {
    font-size: 14px;
    font-weight: 800;
    line-height: 1;
  }

  .depth-shaft {
    font-size: 8px;
    font-weight: 800;
    color: var(--mcc-text-muted);
  }

  .btn-assign,
  .btn-buy {
    min-height: 36px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    border-radius: 10px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .btn-assign {
    background: var(--mcc-surface-2);
    color: var(--mcc-text-main);
    border: 1px solid var(--mcc-border);
  }

  .btn-buy {
    background: var(--mcc-accent);
    color: #1a1a1a;
    border: 1px solid var(--mcc-accent);
  }

  .btn-assign:disabled,
  .btn-buy:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .chip {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    font-size: 14px;
    color: var(--mcc-text-main);
    background: var(--mcc-surface-2);
    border: 1px solid var(--mcc-border);
    border-radius: 999px;
    cursor: pointer;
  }

  .hint {
    margin: 0;
    font-size: 11px;
    color: var(--mcc-text-muted);
  }

  @keyframes slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .drawer,
    .scrim {
      animation: none;
    }
  }
</style>
