<script lang="ts">
  import { gameState } from "$stores/index";
  import { log } from "$lib/logger";

  // Currency display (placeholder - will be dynamic in future)
  let currency = $derived($gameState.resources?.gold || 0);

  function formatCurrency(amount: number): string {
    return `$${amount}`;
  }
</script>

<header class="app-header">
  <h1>Mines & Choo-Choo</h1>
  <div class="currency-display">
    <span class="currency-icon">🪙</span>
    <span class="currency-value">{formatCurrency(currency)}</span>
  </div>
</header>

<style lang="css">
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--md-sys-spacing-lg) var(--md-sys-spacing-md);
    background-color: #1e1e1e;
    border-bottom: 1px solid #2c2c2c;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .app-header h1 {
    font-size: var(--md-sys-typescale-headline-medium);
    color: var(--md-sys-color-on-background);
    margin: 0;
    font-weight: 500;
    letter-spacing: -0.02em;
  }

  .currency-display {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: #121212;
    padding: 8px 16px;
    border-radius: var(--md-sys-shape-corner-full);
  }

  .currency-icon {
    font-size: 20px;
  }

  .currency-value {
    font-size: var(--md-sys-typescale-body-large);
    color: #ffd700;
    font-weight: 600;
  }

  /* Light theme adjustments */
  :global(body[theme="light"]) .app-header {
    background-color: var(--md-sys-color-surface);
    border-bottom-color: var(--md-sys-color-outline-variant);
  }

  :global(body[theme="light"]) .currency-display {
    background-color: var(--md-sys-color-surface-container);
  }

  :global(body[theme="light"]) .currency-value {
    color: #f57f17;
  }
</style>
