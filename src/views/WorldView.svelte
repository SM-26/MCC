<script lang="ts">
    import { gameState } from "$stores/index";

    // Using a local reactive variable to track game state
    // If gameState is a store, we use $gameState
    let level = $derived($gameState.currentWorld);

    function handleGenerate() {
        alert("World generation in progress...");
    }

    function handleTravel() {
        alert("Traveling to next world...");
    }
</script>

<main class="content-section">
    <div class="section-header">
        <h2>🌍 World Map</h2>
        <p class="section-subtitle">
            Explore different worlds and discover new territories
        </p>
    </div>

    <div class="world-grid">
        <article class="world-card" aria-label="World 1 - Starting Area">
            <div class="world-icon">🌍</div>
            <h3>World 1</h3>
            <p>The starting world. Basic resources and simple terrain.</p>
            <div class="world-stats">
                <span class="stat">Level: {level}</span>
                <span class="stat">Size: Small</span>
            </div>
        </article>
    </div>

    <div class="action-bar">
        <button class="btn-primary" onclick={handleGenerate}>
            Generate New World
        </button>
        <button class="btn-secondary" onclick={handleTravel}>
            Travel to Next World
        </button>
    </div>
</main>
