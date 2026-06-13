import type { ScreenSizes } from '../types';
// Centralized breakpoint constants - use everywhere instead of magic numbers
export const MOBILE_BREAKPOINT = 610; // px

export const screenSizeMap: Record<number, ScreenSizes> = {
  1280: 'xl',
  1024: 'lg',
  610: 'md',
  388: 'sm',
  0: 'xs',
};

// Helper to get size based on window width
export const getScreenSize = (width: number): ScreenSizes => {
  const breakpoints = Object.keys(screenSizeMap)
    .map(Number)
    .sort((a, b) => b - a); // Sort descending: [1280, 1024, 768, 576, 0]

  const activeBreakpoint = breakpoints.find((bp) => width >= bp) ?? 0;
  return screenSizeMap[activeBreakpoint];
};

// Navigation position based on screen size
export const getNavPosition = (screenSize: ScreenSizes): 'top' | 'bottom' => {
  return screenSize === 'xs' || screenSize === 'sm' ? 'bottom' : 'top';
};
