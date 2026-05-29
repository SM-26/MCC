# Touch and Gesture Support Guide

## Implemented Gestures

### Swipe Navigation

- **Swipe Left**: Navigate to next tab (World → Mine → Settings)
- **Swipe Right**: Navigate to previous tab (Settings → Mine → World)
- **Minimum Distance**: 50px horizontal movement required
- **Touch Zones**: Full screen width for gesture detection

### Tap Actions

- **Tab Icons**: Direct navigation when tapped
- **Buttons**: Standard click behavior with visual feedback
- **Toggle Switches**: Tap to enable/disable settings

### Touch Targets

All interactive elements meet WCAG 2.1 AA standards:

- **Minimum Size**: 48x48px on mobile devices
- **Touch-Friendly Spacing**: Adequate padding around buttons
- **Visual Feedback**: Clear active/pressed states

## Mobile Optimizations

### Responsive Design

The app adapts to different screen sizes:

- **Small (<480px)**: Compact typography, single-column layout
- **Medium (480-767px)**: Balanced sizing, two-column where appropriate
- **Large (768-1023px)**: Standard sizing, multi-column layouts
- **Desktop (≥1024px)**: Full Material 3 design with text labels

### Touch Action Handling

```css
/* Applied to interactive elements */
touch-action: manipulation; /* Improves tap response time */
-webkit-tap-highlight-color: transparent; /* Modern mobile UX */
```

### Safe Area Insets

Notched devices (iPhone X+) are supported:

```css
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
padding-bottom: max(env(safe-area-inset-bottom), 16px);
```

## Gesture Best Practices

### Do's

✅ Use `touch-action: manipulation` for buttons and links
✅ Provide visual feedback for all touch interactions
✅ Make touch targets at least 48x48px
✅ Support both swipe and tap navigation
✅ Test on actual devices, not just emulators

### Don'ts

❌ Prevent text selection in content areas (users need to copy/paste)
❌ Use gestures that conflict with system gestures
❌ Make touch targets too small for fingers
❌ Ignore landscape orientation on mobile

## Testing Touch Support

### Manual Testing Checklist

- [ ] Swipe left/right navigates between tabs
- [ ] Tab icons are tappable and provide visual feedback
- [ ] Buttons respond to touch with active state
- [ ] Toggle switches work with single tap
- [ ] No accidental touches when swiping
- [ ] Safe area insets respected on notched devices
- [ ] Landscape orientation works correctly

### Device Testing

Test on:

- iOS Safari (iPhone, iPad)
- Android Chrome
- Firefox Mobile
- Samsung Internet

## Accessibility Features

### Keyboard Navigation

All interactive elements are keyboard accessible:

- **Tab**: Navigate between focusable elements
- **Enter/Space**: Activate buttons and links
- **Arrow Keys**: Navigate within components

### Screen Reader Support

- Proper ARIA labels on interactive elements
- Semantic HTML structure
- Alt text for images and icons

### High Contrast Mode

Material 3 color system includes high contrast variants.

## Performance Considerations

### Touch Event Optimization

```javascript
// Passive event listeners for better scroll performance
element.addEventListener('touchstart', handler, { passive: true });
element.addEventListener('touchmove', handler, { passive: true });
```

### Gesture Debouncing

Swipe gestures are debounced to prevent accidental triggers.

## Future Enhancements

Potential gesture additions:

- **Pinch to Zoom**: For map/world view components
- **Long Press**: For contextual menus
- **Pull to Refresh**: For data-heavy screens
- **Swipe to Delete**: For list items (with confirmation)

## Troubleshooting

### Gestures Not Working

1. Check browser compatibility (touch events not supported in some desktop browsers)
2. Ensure `touch-action` is set correctly
3. Verify event listeners are attached after DOM load

### Accidental Touches

- Increase touch target sizes
- Add dead zones around interactive elements
- Implement gesture recognition with minimum distance thresholds

## Resources

- [MDN: Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [WCAG 2.1 Touch Target Size](https://www.w3.org/WAI/WCAG21/Techniques/cp/C8)
- [Material Design Touch Targets](https://m3.material.io/components/buttons/specs)
