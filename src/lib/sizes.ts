// Centralized breakpoint constants - use everywhere instead of magic numbers
export const MOBILE_BREAKPOINT = 610; // px
export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const screenSizeMap: Record<number, ScreenSize> = {
  1280: 'xl',
  1024: 'lg',
  610: 'md',
  388: 'sm',
  0: 'xs',
};

// Helper to get size based on window width
export const getScreenSize = (width: number): ScreenSize => {
  const breakpoints = Object.keys(screenSizeMap)
    .map(Number)
    .sort((a, b) => b - a); // Sort descending: [1280, 1024, 768, 576, 0]

  const activeBreakpoint = breakpoints.find((bp) => width >= bp) ?? 0;
  return screenSizeMap[activeBreakpoint];
};

// Navigation position based on screen size
export const getNavPosition = (screenSize: ScreenSize): 'top' | 'bottom' => {
  return screenSize === 'xs' || screenSize === 'sm' ? 'bottom' : 'top';
};
