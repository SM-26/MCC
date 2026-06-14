<script lang="ts">
  /**
   * Shared settings row shell.
   *
   * Renders the standard label + description block on the left and
   * arbitrary control content on the right/below via the implicit
   * `children` snippet.
   */
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    description: string;
    inline?: boolean;
    children: Snippet;
  }

  const { label, description, inline = false, children }: Props = $props();
</script>

<div class="setting-item" class:flex-row={inline}>
  <div class="setting-info">
    <span class="setting-label">{label}</span>
    <span class="setting-description">{description}</span>
  </div>

  <div class="setting-control">
    {@render children()}
  </div>
</div>

<style>
  /**
   * Shared settings row layout.
   *
   * Scoped locally so label/description/control structure can travel with the
   * component instead of being maintained in the parent view.
   */
  .setting-item {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .setting-item.flex-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  .setting-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .setting-label {
    font-size: 1rem;
    font-weight: 500;
  }

  .setting-description {
    color: #94a3b8;
    font-size: 0.85rem;
    line-height: 1.4;
  }

  .setting-control {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  @media (max-width: 640px) {
    .setting-item.flex-row {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    .setting-control {
      justify-content: flex-start;
    }
  }
</style>
