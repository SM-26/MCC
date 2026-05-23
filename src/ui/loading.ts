// src/ui/loading.ts - Loading State Component

/**
 * Show loading overlay
 */
export function showLoading(): void {
  const existing = document.querySelector('.loading-overlay');
  if (existing) return; // Already showing
  
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = `
    <div class="loading-spinner"></div>
    <div class="loading-text">Loading...</div>
  `;
  
  document.body.appendChild(overlay);
}

/**
 * Hide loading overlay
 */
export function hideLoading(): void {
  const existing = document.querySelector('.loading-overlay');
  if (existing) {
    existing.remove();
  }
}

/**
 * Show loading with custom message
 */
export function showLoadingWithMessage(message: string): void {
  showLoading();
  const overlay = document.querySelector('.loading-overlay')!;
  overlay.querySelector('.loading-text')?.textContent = message;
}
