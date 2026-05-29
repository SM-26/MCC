<script lang="ts">
  import { onMount } from "svelte";
  import Navbar from "$components/Navbar.svelte";
  import Splash from "$components/Splash.svelte";
  import TabContent from "$components/TabContent.svelte";
  import Footer from "$components/Footer.svelte";
  import { navigation, appContext } from "$stores/index";
  import { gameState } from "$stores/index";
  import Header from "$components/AppHeader.svelte";

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
      <Header />
      <Navbar navbarPosition={$gameState.settings.navbarPosition} />

      <!-- Main Content Area -->
      <main aria-label="Main content">
        <TabContent />
      </main>

      <!-- Footer with FAB -->
      <Footer />
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

  /* Prevent text selection on gestures */
  .main-app {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
</style>
