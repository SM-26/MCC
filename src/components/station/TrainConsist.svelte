<!-- /src/components/station/TrainConsist.svelte -->
<script lang="ts">
  import { MAX_ENGINE_LEVEL, ENGINE_STATS } from '../../logic/station/stationBalance';
  import { CART_SPRITE, ENGINE_SPRITE } from '../../logic/station/stationSprites';
  import { getTotalCartCount } from '../../logic/station/stationTypes';
  import type { CartType, Train } from '../../logic/station/stationTypes';

  interface Props {
    train: Train | null;
    /** Integer only. 1 = dashboard row (20px), 2 = yard bay (40px), 3 = scene (60px). */
    scale?: 1 | 2 | 3;
    /** Render the unfilled cart slots up to the engine's maxCarts as dashed boxes. */
    showSlots?: boolean;
    /** Placeholder engine for an empty platform. */
    ghost?: boolean;
    /** Supplied by the consist editor, makes the engine, carts and slots tappable. */
    onEngineClick?: () => void;
    onCartClick?: (cartType: CartType) => void;
    onSlotClick?: () => void;
  }

  const { train, scale = 1, showSlots = false, ghost = false, onEngineClick, onCartClick, onSlotClick }: Props = $props();

  // CartSlot carries a count; the strip wants one sprite per physical cart.
  const cartSprites = $derived<CartType[]>(train ? train.carts.flatMap((slot) => Array.from({ length: slot.count }, () => slot.cartType)) : []);

  const emptySlotCount = $derived(showSlots && train ? Math.max(0, ENGINE_STATS[train.engineAge].maxCarts - getTotalCartCount(train)) : 0);

  const enRoute = $derived(Boolean(train?.trip));

  const label = $derived(
    ghost || !train ? 'No train on this platform' : `${train.engineAge} engine, level ${train.engineLevel}, ${cartSprites.length} carts`,
  );
</script>

<div class="consist" class:en-route={enRoute} style="--sprite-scale: {scale}" role="img" aria-label={label}>
  {#if ghost || !train}
    <img class="sprite engine is-ghost" src={ENGINE_SPRITE.Mechanical} alt="" draggable="false" />
  {:else}
    {#snippet engineSprite()}
      <img class="sprite engine" src={ENGINE_SPRITE[train.engineAge]} alt="" draggable="false" />
      <!-- Pips only from scale 2 up: at 20px there is no room above the cab, and
           every scale-1 surface already prints "Lv n" in its title. -->
      {#if scale >= 2}
        <span class="pips" aria-hidden="true">
          {#each { length: MAX_ENGINE_LEVEL } as _, index (index)}
            <span class="pip" class:filled={index < train.engineLevel}></span>
          {/each}
        </span>
      {/if}
    {/snippet}

    {#if onEngineClick}
      <button type="button" class="engine-wrap engine-btn" onclick={() => onEngineClick()} aria-label={`Recall the ${train.engineAge} engine to the yard`}>
        {@render engineSprite()}
      </button>
    {:else}
      <div class="engine-wrap">{@render engineSprite()}</div>
    {/if}

    {#each cartSprites as cartType, index (`${cartType}-${index}`)}
      {#if onCartClick}
        <button type="button" class="cart-btn" onclick={() => onCartClick(cartType)} aria-label={`Remove ${cartType} cart`}>
          <img class="sprite cart" src={CART_SPRITE[cartType]} alt="" draggable="false" />
        </button>
      {:else}
        <img class="sprite cart" src={CART_SPRITE[cartType]} alt="" draggable="false" />
      {/if}
    {/each}

    {#each { length: emptySlotCount } as _, index (index)}
      {#if onSlotClick}
        <button type="button" class="slot-btn" onclick={() => onSlotClick()} aria-label="Add a cart to this slot">
          <span class="slot"></span>
        </button>
      {:else}
        <span class="slot"></span>
      {/if}
    {/each}
  {/if}
</div>

<style>
  /* Every sprite is 20px tall with its wheel centres on row 15, so butting them
     together in a row is all the alignment a consist needs, no gap, no margin. */
  .consist {
    display: flex;
    align-items: flex-end;
    gap: 0;
    transition: opacity 0.2s ease;
  }

  .consist.en-route {
    opacity: 0.35;
  }

  .sprite {
    display: block;
    height: calc(20px * var(--sprite-scale));
    /* Pixel art: integer scale and no smoothing, or the outlines turn to mush. */
    image-rendering: pixelated;
    user-select: none;
  }

  .engine {
    width: calc(30px * var(--sprite-scale));
  }

  .cart {
    width: calc(18px * var(--sprite-scale));
  }

  .is-ghost {
    opacity: 0.3;
  }

  .engine-wrap {
    position: relative;
    display: flex;
    align-items: flex-end;
  }

  .pips {
    position: absolute;
    top: calc(-1px * var(--sprite-scale) - 4px);
    left: calc(4px * var(--sprite-scale));
    display: flex;
    gap: 2px;
  }

  .pip {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--mcc-border);
  }

  .pip.filled {
    background: var(--mcc-accent);
  }

  .slot {
    display: block;
    width: calc(18px * var(--sprite-scale));
    height: calc(20px * var(--sprite-scale));
    border: 1px dashed var(--mcc-border);
    border-radius: 4px;
    box-sizing: border-box;
  }

  .engine-btn {
    padding: 12px 0;
    margin: -12px 0;
    background: none;
    border: none;
    cursor: pointer;
    min-height: 44px;
    box-sizing: content-box;
  }

  .engine-btn:hover .engine {
    filter: brightness(1.2);
  }

  /* Interactive mode pads vertically only. A horizontal pad would open gaps
     between sprites, which is the one thing the consist must never show. */
  .cart-btn,
  .slot-btn {
    display: flex;
    align-items: flex-end;
    padding: 12px 0;
    margin: -12px 0;
    background: none;
    border: none;
    cursor: pointer;
    min-height: 44px;
    box-sizing: content-box;
  }

  .cart-btn:hover .cart,
  .slot-btn:hover .slot {
    filter: brightness(1.2);
  }

  .slot-btn:hover .slot {
    border-color: var(--mcc-accent);
  }
</style>
