// src/lib/haptics.ts
export const haptics = {
  vibrate: (pattern: number | number[] = 50) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  },
  light: () => haptics.vibrate(50),
  medium: () => haptics.vibrate(100),
  heavy: () => haptics.vibrate(200),
  success: () => haptics.vibrate([50, 50, 100]),
  error: () => haptics.vibrate([100, 50, 100, 50, 150]),
};
