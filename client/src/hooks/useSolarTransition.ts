/**
 * useSolarTransition — Solar Arc Theme Transition
 *
 * Animates a single CSS custom property `--solar-progress` on <html> from 0→1
 * (light→dark) or 1→0 (dark→light) over ~800ms. This drives:
 *   1. Shadow offset rotation (light comes from upper-left in day, upper-right at dusk)
 *   2. Shadow depth/spread intensification as "sun sets"
 *   3. Ambient overlay opacity for a unified color temperature sweep
 *
 * The actual theme class swap (.light ↔ .dark) happens at the midpoint (50%)
 * so the color variables flip when the "sun" is at the horizon — creating a
 * seamless day→dusk→night arc rather than an abrupt swap.
 *
 * Performance: One rAF loop updating one CSS variable. No per-element transitions.
 * The browser recalculates styles once per frame for the variable change.
 */

import { useRef, useCallback } from "react";

/** Duration of the solar arc animation in ms */
const ARC_DURATION = 800;

/** Easing: cubic-bezier(0.4, 0, 0.2, 1) — Material ease-in-out */
function easeInOut(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function useSolarTransition() {
  const animFrameRef = useRef<number>(0);
  const isAnimatingRef = useRef(false);

  /**
   * Run the solar arc animation.
   * @param toDark — true if transitioning TO dark mode, false if TO light
   * @param onMidpoint — callback fired at the 50% mark to swap the theme class
   */
  const runArc = useCallback(
    (toDark: boolean, onMidpoint: () => void) => {
      // Cancel any in-progress animation
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      const root = document.documentElement;
      isAnimatingRef.current = true;
      root.classList.add("solar-transitioning");

      // Starting progress: 0 = full light, 1 = full dark
      const startProgress = toDark ? 0 : 1;
      const endProgress = toDark ? 1 : 0;
      let midpointFired = false;
      const startTime = performance.now();

      function tick(now: number) {
        const elapsed = now - startTime;
        const rawT = Math.min(elapsed / ARC_DURATION, 1);
        const easedT = easeInOut(rawT);

        // Interpolate progress
        const progress = startProgress + (endProgress - startProgress) * easedT;
        root.style.setProperty("--solar-progress", progress.toFixed(3));

        // Fire the theme class swap at the midpoint
        if (!midpointFired && rawT >= 0.45) {
          midpointFired = true;
          onMidpoint();
        }

        if (rawT < 1) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          // Animation complete — clean up
          isAnimatingRef.current = false;
          root.classList.remove("solar-transitioning");
          // Ensure final value is exact
          root.style.setProperty(
            "--solar-progress",
            endProgress.toFixed(3)
          );
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    },
    []
  );

  return { runArc, isAnimatingRef };
}
