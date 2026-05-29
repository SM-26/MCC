<script lang="ts">
  import { gameState } from '$stores/index';
  import { saveSettings } from '$logic/save';

</script>

<div class="footer">
  <!-- FAB Button -->
  <button 
    class="fab"
    aria-label="Main action button"
    title="Main action"
  >
    <span class="fab-icon">+</span>
  </button>
</div>

<style>
  .footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    background: var(--color-background);
    border-top: 1px solid var(--color-border);
    z-index: 10;
    transition: transform 0.3s ease;
  }

  .fab {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--color-primary);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s ease, background 0.2s ease;
  }

  .fab:hover {
    transform: scale(1.05);
    background: var(--color-primary-dark);
  }

  .fab:active {
    transform: scale(0.95);
  }

  .fab-icon {
    user-select: none;
  }
</style>
