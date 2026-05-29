<script lang="ts">
  import { onMount } from "svelte";
  import Navbar from "$components/Navbar.svelte";
  import Splash from "$components/Splash.svelte";
  import TabContent from "$components/TabContent.svelte";
  import { navigation, appContext } from "$stores/index";

  // Touch and gesture handling
  let touchStartX = 0;
  let touchEndX = 0;
  let isDragging = false;

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    isDragging = true;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isDragging) return;
    touchEndX = e.touches[0].clientX;

    const deltaX = touchEndX - touchStartX;

    // Swipe left/right detection (minimum 50px)
    if (Math.abs(deltaX) >= 50) {
      handleSwipe(deltaX > 0 ? "right" : "left");
      isDragging = false;
    }
  }

  function handleTouchEnd() {
    isDragging = false;
  }

  function handleSwipe(direction: "left" | "right") {
    // Swipe left - go to previous tab
    // Swipe right - go to next tab
    const tabs = ["world", "mine", "settings"] as const;
    const currentIndex = tabs.indexOf($navigation.activeTab);

    if (direction === "left" && currentIndex < tabs.length - 1) {
      $navigation.activeTab = tabs[currentIndex + 1];
    } else if (direction === "right" && currentIndex > 0) {
      $navigation.activeTab = tabs[currentIndex - 1];
    }
  }

  function handlePinch(e: TouchEvent) {
    // Pinch to zoom placeholder
    console.log("Pinch gesture detected");
  }

  onMount(() => {
    // Register swipe handlers
    const app = document.getElementById("app");
    if (app) {
      app.addEventListener("touchstart", handleTouchStart, { passive: true });
      app.addEventListener("touchmove", handleTouchMove, { passive: true });
      app.addEventListener("touchend", handleTouchEnd);

      // Touch action manipulation for better mobile UX
      const buttons = document.querySelectorAll("button, a");
      buttons.forEach((el) => {
        el.style.touchAction = "manipulation";
      });
    }
  });
</script>

<div
  class="main-app"
  role="application"
  aria-label="Web Game Application"
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
>
  <!-- Splash Screen (shown during initial load) -->
  {#if $appContext?.splashVisible}
    <Splash />
  {/if}

  <!-- Main App Content -->
  {#if !$appContext?.splashVisible}
    <div class="app-container">
      <!-- Navigation Bar -->
      <Navbar />

      <!-- Main Content Area -->
      <main aria-label="Main content">
        <TabContent />
      </main>

      <!-- Bottom Action Bar (Mobile) -->
      <footer class="action-footer">
        <div class="footer-spacer"></div>

        <div class="footer-actions">
          <button
            class="fab"
            aria-label="Quick actions"
            onclick={() => alert("Quick actions menu")}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <circle cx="12" cy="12" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="12" r="3" />
            </svg>
          </button>
        </div>

        <div class="footer-spacer"></div>
      </footer>
    </div>
  {/if}
</div>

<style>
  .main-app {
    min-height: 100vh;
    background-color: var(--md-sys-color-background);
    touch-action: manipulation;
  }

  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .main-content {
    flex: 1;
    padding-bottom: calc(
      var(--md-sys-spacing-lg) + env(safe-area-inset-bottom, 0px)
    );
  }

  /* Action Footer for Mobile */
  .action-footer {
    display: none;
    background-color: var(--md-sys-color-surface);
    border-top: 1px solid var(--md-sys-color-outline-variant);
  }

  .footer-spacer {
    flex: 1;
  }

  .footer-actions {
    display: flex;
    justify-content: center;
    padding: var(--md-sys-spacing-sm);
  }

  @media (max-width: 767px) {
    .action-footer {
      display: flex;
    }
  }

  /* Touch-friendly spacing */
  .gesture-spacer {
    margin-left: calc(
      env(safe-area-inset-left, 0px) + var(--md-sys-spacing-sm)
    );
    margin-right: calc(
      env(safe-area-inset-right, 0px) + var(--md-sys-spacing-sm)
    );
  }

  /* Prevent text selection on gestures */
  .main-app {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }

  /* Allow text selection in content areas */
  .content-section,
  .world-card,
  .settings-card {
    -webkit-user-select: text;
    user-select: text;
  }
</style>
