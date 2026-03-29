/**
 * ThemeToggleCompact — Dashboard-header variant of the Cinematic 3D Toggle
 *
 * Distilled from the full ThemeToggle (210-380px hero) down to 72×36px
 * for inline use in the top navigation bar. Preserves:
 *   - Brushed aluminum / matte rubber material contrast
 *   - Spring-physics knob slide with mechanical weight
 *   - Single-layer warm glow (light) / void shadow (dark)
 *   - Specular highlight and rim light on the knob
 *   - 3D perspective tilt on hover
 *
 * Drops (for performance at scale):
 *   - FloatingParticles, LensFlare, breathing hover animation
 *   - Multi-layer ambient light field (3 layers → 1 tight glow)
 *   - Surface reflection beneath the toggle
 *   - Press depression delay (theme switches immediately)
 *
 * Drop-in replacement for the existing CSS-only ThemeToggle in Home.tsx.
 * Import: `import { ThemeToggleCompact } from "@/components/ThemeToggleCompact"`
 */

import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import { useState, useCallback } from "react";

export function ThemeToggleCompact() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    toggleTheme?.();
  }, [toggleTheme]);

  return (
    <div
      className="relative"
      style={{ perspective: "600px" }}
    >
      {/* === SINGLE-LAYER GLOW === */}
      {/* Tight warm glow directly around the toggle (light mode only) */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "-35%",
          left: "-18%",
          right: "-18%",
          bottom: "-35%",
        }}
        animate={{
          opacity: isDark ? 0 : 0.7,
        }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 52% 52%, rgba(255,242,220,0.4) 0%, rgba(255,230,195,0.15) 40%, transparent 65%)",
            filter: "blur(10px)",
          }}
        />
      </motion.div>

      {/* === THE TOGGLE === */}
      <motion.button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative block focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 rounded-full"
        style={{
          width: 72,
          height: 36,
          transformStyle: "preserve-3d",
        }}
        animate={{
          rotateX: isHovered ? 6 : 0,
          rotateY: isHovered ? -2 : 0,
          scale: isHovered ? 1.04 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 22,
          mass: 0.8,
        }}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        title={`Switch to ${isDark ? "light" : "dark"} mode`}
      >
        {/* Track outer body — the pill housing */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            background: isDark
              ? "linear-gradient(150deg, #1e1e22 0%, #131316 40%, #0b0b0d 100%)"
              : "linear-gradient(150deg, #ece9e4 0%, #e0ddd7 40%, #d4d1cb 100%)",
            boxShadow: isDark
              ? `
                inset 0 2px 6px rgba(0,0,0,0.9),
                inset 0 -1px 2px rgba(255,255,255,0.02),
                0 4px 16px rgba(0,0,0,0.6),
                0 2px 4px rgba(0,0,0,0.4)
              `
              : `
                inset 0 1px 4px rgba(0,0,0,0.08),
                inset 0 -2px 6px rgba(255,255,255,0.85),
                0 4px 16px rgba(0,0,0,0.06),
                0 1px 4px rgba(0,0,0,0.03)
              `,
          }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        />

        {/* Track inner recess — the channel the knob slides in */}
        <motion.div
          className="absolute rounded-full"
          style={{
            top: "14%",
            left: "5%",
            right: "5%",
            bottom: "14%",
          }}
          animate={{
            background: isDark
              ? "linear-gradient(180deg, #070709 0%, #0c0c0f 50%, #090909 100%)"
              : "linear-gradient(180deg, #c8c5bf 0%, #d4d1cb 50%, #dfdcd6 100%)",
            boxShadow: isDark
              ? "inset 0 3px 10px rgba(0,0,0,0.95), inset 0 -1px 2px rgba(255,255,255,0.01)"
              : "inset 0 3px 10px rgba(0,0,0,0.12), inset 0 -2px 6px rgba(255,255,255,0.65)",
          }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        />

        {/* Warm light strip at bottom of track (light mode only) */}
        <motion.div
          className="absolute pointer-events-none rounded-full"
          style={{
            bottom: "10%",
            left: "10%",
            right: "10%",
            height: "10%",
            filter: "blur(3px)",
          }}
          animate={{
            opacity: isDark ? 0 : 0.45,
            background: isDark
              ? "transparent"
              : "linear-gradient(90deg, transparent 5%, rgba(255,228,175,0.4) 30%, rgba(255,238,200,0.6) 50%, rgba(255,228,175,0.4) 70%, transparent 95%)",
          }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />

        {/* === THE KNOB === */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: "42%",
            height: "72%",
            top: "14%",
          }}
          animate={{
            left: isDark ? "5%" : "53%",
          }}
          transition={{
            left: {
              type: "spring",
              stiffness: 120,
              damping: 18,
              mass: 1.2,
            },
          }}
        >
          {/* Knob body — brushed aluminum (light) / matte rubber (dark) */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              background: isDark
                ? "linear-gradient(150deg, #303035 0%, #242428 35%, #1a1a1d 100%)"
                : "linear-gradient(150deg, #f6f4f0 0%, #eae8e3 35%, #e0ddd8 100%)",
              boxShadow: isDark
                ? `
                  0 3px 10px rgba(0,0,0,0.7),
                  0 1px 3px rgba(0,0,0,0.5),
                  inset 0 1px 2px rgba(255,255,255,0.04),
                  inset 0 -1px 3px rgba(0,0,0,0.4)
                `
                : `
                  0 3px 12px rgba(0,0,0,0.1),
                  0 1px 4px rgba(0,0,0,0.05),
                  inset 0 2px 4px rgba(255,255,255,0.9),
                  inset 0 -2px 4px rgba(0,0,0,0.03)
                `,
            }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          />

          {/* Icon container */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Moon icon */}
            <motion.div
              animate={{
                opacity: isDark ? 1 : 0,
                scale: isDark ? 1 : 0.4,
                rotate: isDark ? 0 : -120,
              }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="absolute"
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="rgba(0,212,255,0.5)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </motion.div>

            {/* Sun icon */}
            <motion.div
              animate={{
                opacity: isDark ? 0 : 1,
                scale: isDark ? 0.4 : 1,
                rotate: isDark ? 120 : 0,
              }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="absolute"
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="rgba(217,119,6,0.55)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            </motion.div>
          </div>

          {/* Knob specular highlight — top-left catch light */}
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{
              background: isDark
                ? "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 45%)"
                : "linear-gradient(135deg, rgba(255,255,255,0.65) 0%, transparent 45%)",
            }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          />

          {/* Knob edge rim light */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              top: "3%",
              left: "3%",
              right: "3%",
              bottom: "3%",
            }}
            animate={{
              boxShadow: isDark
                ? "inset 0 0 0 0.5px rgba(255,255,255,0.03)"
                : "inset 0 0 0 0.5px rgba(255,255,255,0.3)",
            }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          />
        </motion.div>

        {/* Track surface reflection — subtle top highlight */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            top: "6%",
            left: "8%",
            right: "50%",
            height: "28%",
            borderRadius: "50% 50% 50% 50% / 100% 100% 0% 0%",
          }}
          animate={{
            background: isDark
              ? "linear-gradient(180deg, rgba(255,255,255,0.01) 0%, transparent 100%)"
              : "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)",
          }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        />

        {/* Track rim light */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{
            boxShadow: isDark
              ? "inset 0 0 0 0.5px rgba(255,255,255,0.02)"
              : "inset 0 0 0 0.5px rgba(255,255,255,0.18)",
          }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        />
      </motion.button>

      {/* === CAST SHADOW === */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          bottom: "-30%",
          left: "5%",
          right: "5%",
          height: "40%",
          borderRadius: "50%",
          filter: "blur(8px)",
        }}
        animate={{
          background: isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.06)",
          scaleX: isDark ? 1.1 : 1,
          scaleY: isDark ? 1.15 : 0.8,
        }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  );
}
