import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

type Theme = "light" | "dark";

/** Duration of the solar arc animation in ms.
 *  1800ms gives a slow, cinematic sweep — long enough to see the shadows
 *  rotate and the golden hour wash build and fade. */
const ARC_DURATION = 1800;

/** Easing: cubic-bezier approximation (ease-in-out cubic) */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return (stored as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  const animFrameRef = useRef<number>(0);

  // Apply theme class on mount and when theme changes (non-animated path)
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    // Set initial solar progress
    root.style.setProperty("--solar-progress", theme === "dark" ? "1" : "0");
    root.style.setProperty("--solar-overlay-opacity", "0");

    if (switchable) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  /**
   * Solar arc toggle: animates --solar-progress from current→target,
   * swaps the theme class at the midpoint so colors flip when the
   * "sun" is at the horizon.
   */
  const toggleTheme = switchable
    ? useCallback(() => {
        const root = document.documentElement;
        const toDark = theme === "light";

        // Cancel any in-progress animation
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }

        root.classList.add("solar-transitioning");

        const startProgress = toDark ? 0 : 1;
        const endProgress = toDark ? 1 : 0;
        let midpointFired = false;
        const startTime = performance.now();

        function tick(now: number) {
          const elapsed = now - startTime;
          const rawT = Math.min(elapsed / ARC_DURATION, 1);
          const easedT = easeInOut(rawT);

          const progress =
            startProgress + (endProgress - startProgress) * easedT;
          root.style.setProperty("--solar-progress", progress.toFixed(3));

          // Overlay opacity: peaks at midpoint (golden hour), 0 at endpoints
          // Uses a sine-like curve: sin(π * t) peaks at t=0.5
          const overlayOpacity = Math.sin(Math.PI * rawT);
          root.style.setProperty(
            "--solar-overlay-opacity",
            overlayOpacity.toFixed(3)
          );

          // Swap theme class at the midpoint
          if (!midpointFired && rawT >= 0.45) {
            midpointFired = true;
            setTheme(toDark ? "dark" : "light");
          }

          if (rawT < 1) {
            animFrameRef.current = requestAnimationFrame(tick);
          } else {
            root.classList.remove("solar-transitioning");
            root.style.setProperty(
              "--solar-progress",
              endProgress.toFixed(3)
            );
            root.style.setProperty("--solar-overlay-opacity", "0");
            animFrameRef.current = 0;
          }
        }

        animFrameRef.current = requestAnimationFrame(tick);
      }, [theme])
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
