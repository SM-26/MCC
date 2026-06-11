// Centralized breakpoint constants - use everywhere instead of magic numbers
export const MOBILE_BREAKPOINT = 768; // px

// Responsive size classes (mirrors Tailwind/Material Design)
export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const screenSizeMap: Record<number, ScreenSize> = {
  0: 'xs', // < 576px
  576: 'sm', // >= 576px
  768: 'md', // >= 768px
  1024: 'lg', // >= 1024px
  1280: 'xl', // >= 1280px
};

// Navigation position based on screen size
export const getNavPosition = (screenSize: ScreenSize): 'top' | 'bottom' => {
  return screenSize === 'xs' || screenSize === 'sm' ? 'bottom' : 'top';
};
