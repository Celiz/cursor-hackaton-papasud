/**
 * Haptic feedback utility using the Vibration API.
 * Works on mobile browsers (Chrome/Firefox Android). Silently no-ops on desktop or iOS Safari.
 *
 * Usage:
 *   import { haptics } from '@/lib/haptics';
 *   haptics.light();  // short tap
 *   haptics.success(); // completion feedback
 */

const canVibrate = typeof navigator !== "undefined" && "vibrate" in navigator;

function vibrate(pattern: number | number[]): void {
  if (!canVibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // some browsers throw on vibrate if not triggered by user gesture
  }
}

export const haptics = {
  /** Tiny tap — tab switches, item selection */
  selection: () => vibrate(5),
  /** Light — button press, hover confirmation */
  light: () => vibrate(10),
  /** Medium — card tap, menu open */
  medium: () => vibrate(25),
  /** Heavy — long-press confirm, drag lock */
  heavy: () => vibrate(50),
  /** Success pulse — save completed, action done */
  success: () => vibrate([10, 50, 10]),
  /** Error pulse — validation fail, destructive action */
  error: () => vibrate([50, 60, 50, 60, 50]),
  /** Warning — alert, confirmation needed */
  warning: () => vibrate([30, 50, 30]),
  /** Swipe threshold reached (for swipeable items) */
  swipeThreshold: () => vibrate(15),
  /** Notification arrived */
  notification: () => vibrate([20, 40, 20, 40, 80]),
};
