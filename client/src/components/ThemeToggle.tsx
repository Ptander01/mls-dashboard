/**
 * ThemeToggle — Cinematic 3D Toggle Button (Final Polish)
 * 
 * Design: "Cinematic Product Shot"
 * - Pill-shaped toggle with CSS 3D transforms
 * - Light mode: knob raised on right, warm volumetric glow from base
 * - Dark mode: knob slides left and sinks, blocking light
 * - Materials: brushed aluminum (light) / matte dark rubber (dark)
 * - Spring physics for mechanical feel
 * - Hover: subtle breathing glow + camera dolly-in
 * - Press: visceral depression with light extinction
 */

import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import { useState, useCallback } from "react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    setIsPressed(true);
    setTimeout(() => {
      toggleTheme?.();
      setTimeout(() => setIsPressed(false), 500);
    }, 180);
  }, [toggleTheme]);

  return (
    <div
      className="relative"
      style={{ perspective: "1000px" }}
    >
      {/* === LIGHT EMISSION SYSTEM === */}

      {/* Layer 1: Wide ambient light field */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "-80%",
          left: "-60%",
          right: "-60%",
          bottom: "-80%",
        }}
        animate={{
          opacity: isDark ? 0 : 0.6,
        }}
        transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <div
          className="w-full h-full"
          style={{
            background: "radial-gradient(ellipse at 52% 48%, rgba(255,232,190,0.3) 0%, rgba(255,220,170,0.1) 35%, transparent 65%)",
            filter: "blur(30px)",
          }}
        />
      </motion.div>

      {/* Layer 2: Medium glow halo */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "-40%",
          left: "-30%",
          right: "-30%",
          bottom: "-40%",
        }}
        animate={{
          opacity: isDark ? 0 : 0.75,
          scale: isHovered && !isDark ? 1.06 : 1,
        }}
        transition={{ duration: isDark ? 1.4 : 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background: "radial-gradient(ellipse at 52% 52%, rgba(255,242,220,0.45) 0%, rgba(255,230,195,0.2) 35%, transparent 60%)",
            filter: "blur(15px)",
          }}
        />
      </motion.div>

      {/* Layer 3: Tight core glow directly under toggle */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "-15%",
          left: "-8%",
          right: "-8%",
          bottom: "-15%",
        }}
        animate={{
          opacity: isDark ? 0 : 0.9,
        }}
        transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background: "radial-gradient(ellipse at 52% 55%, rgba(255,248,235,0.5) 0%, rgba(255,240,210,0.2) 40%, transparent 65%)",
            filter: "blur(8px)",
          }}
        />
      </motion.div>

      {/* Pulsing breathing glow on hover (light mode only) */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "-50%",
          left: "-35%",
          right: "-35%",
          bottom: "-50%",
        }}
        animate={{
          opacity: isHovered && !isDark ? [0.2, 0.4, 0.2] : 0,
          scale: isHovered && !isDark ? [1, 1.04, 1] : 1,
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255,238,205,0.25) 0%, transparent 55%)",
            filter: "blur(18px)",
          }}
        />
      </motion.div>

      {/* === THE TOGGLE === */}
      <motion.button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative block focus:outline-none"
        style={{
          width: "clamp(210px, 32vw, 380px)",
          height: "clamp(92px, 14vw, 165px)",
          transformStyle: "preserve-3d",
        }}
        animate={{
          rotateX: isPressed ? 2 : isHovered ? 5 : 8,
          rotateY: isHovered ? -3 : 0,
          scale: isPressed ? 0.96 : isHovered ? 1.03 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 160,
          damping: 20,
          mass: 1,
        }}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      >
        {/* Track outer body */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            background: isDark
              ? "linear-gradient(150deg, #1e1e22 0%, #131316 40%, #0b0b0d 100%)"
              : "linear-gradient(150deg, #ece9e4 0%, #e0ddd7 40%, #d4d1cb 100%)",
            boxShadow: isDark
              ? `
                inset 0 3px 12px rgba(0,0,0,0.9),
                inset 0 -1px 4px rgba(255,255,255,0.02),
                0 12px 48px rgba(0,0,0,0.75),
                0 4px 12px rgba(0,0,0,0.5)
              `
              : `
                inset 0 2px 10px rgba(0,0,0,0.1),
                inset 0 -3px 10px rgba(255,255,255,0.9),
                0 12px 48px rgba(0,0,0,0.08),
                0 4px 12px rgba(0,0,0,0.04),
                0 0 100px rgba(255,232,190,0.1)
              `,
          }}
          transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
        />

        {/* Track inner recess */}
        <motion.div
          className="absolute rounded-full"
          style={{
            top: "13%",
            left: "4.5%",
            right: "4.5%",
            bottom: "13%",
          }}
          animate={{
            background: isDark
              ? "linear-gradient(180deg, #070709 0%, #0c0c0f 50%, #090909 100%)"
              : "linear-gradient(180deg, #c6c3bd 0%, #d2cfca 50%, #dedbd5 100%)",
            boxShadow: isDark
              ? "inset 0 5px 20px rgba(0,0,0,0.95), inset 0 -1px 4px rgba(255,255,255,0.01)"
              : "inset 0 5px 20px rgba(0,0,0,0.16), inset 0 -3px 10px rgba(255,255,255,0.7)",
          }}
          transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
        />

        {/* Warm light emission inside track (light mode only) */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            top: "6%",
            left: "3%",
            right: "3%",
            bottom: "6%",
          }}
          animate={{
            opacity: isDark ? 0 : 1,
            boxShadow: isDark
              ? "inset 0 0 0px transparent"
              : `
                inset 0 -8px 30px rgba(255,228,170,0.22),
                0 8px 40px rgba(255,222,160,0.12),
                0 0 60px rgba(255,232,190,0.06)
              `,
          }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
        />

        {/* Warm light strip at bottom of track */}
        <motion.div
          className="absolute pointer-events-none rounded-full"
          style={{
            bottom: "8%",
            left: "8%",
            right: "8%",
            height: "10%",
            filter: "blur(5px)",
          }}
          animate={{
            opacity: isDark ? 0 : 0.55,
            background: isDark
              ? "transparent"
              : "linear-gradient(90deg, transparent 3%, rgba(255,228,175,0.5) 25%, rgba(255,238,200,0.75) 50%, rgba(255,228,175,0.5) 75%, transparent 97%)",
          }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
        />

        {/* === THE KNOB === */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: "43%",
            height: "74%",
            top: "13%",
          }}
          animate={{
            left: isDark ? "5%" : "52%",
            y: isPressed ? 4 : 0,
          }}
          transition={{
            left: { type: "spring", stiffness: 90, damping: 16, mass: 1.6 },
            y: { type: "spring", stiffness: 400, damping: 20 },
          }}
        >
          {/* Knob body */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              background: isDark
                ? "linear-gradient(150deg, #303035 0%, #242428 35%, #1a1a1d 100%)"
                : "linear-gradient(150deg, #f6f4f0 0%, #eae8e3 35%, #e0ddd8 100%)",
              boxShadow: isDark
                ? `
                  0 8px 28px rgba(0,0,0,0.75),
                  0 2px 8px rgba(0,0,0,0.55),
                  inset 0 1px 4px rgba(255,255,255,0.04),
                  inset 0 -2px 6px rgba(0,0,0,0.45)
                `
                : `
                  0 8px 32px rgba(0,0,0,0.12),
                  0 2px 10px rgba(0,0,0,0.06),
                  inset 0 3px 8px rgba(255,255,255,0.95),
                  inset 0 -3px 8px rgba(0,0,0,0.04),
                  0 0 50px rgba(255,232,190,0.06)
                `,
            }}
            transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
          />

          {/* Icon container */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Moon icon */}
            <motion.div
              animate={{
                opacity: isDark ? 1 : 0,
                scale: isDark ? 1 : 0.3,
                rotate: isDark ? 0 : -150,
              }}
              transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
              className="absolute"
            >
              <svg
                viewBox="0 0 24 24"
                style={{
                  width: "clamp(20px, 3.5vw, 38px)",
                  height: "clamp(20px, 3.5vw, 38px)",
                }}
                fill="none"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="1.2"
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
                scale: isDark ? 0.3 : 1,
                rotate: isDark ? 150 : 0,
              }}
              transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
              className="absolute"
            >
              <svg
                viewBox="0 0 24 24"
                style={{
                  width: "clamp(20px, 3.5vw, 38px)",
                  height: "clamp(20px, 3.5vw, 38px)",
                }}
                fill="none"
                stroke="rgba(100,90,75,0.2)"
                strokeWidth="1.2"
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

          {/* Knob specular highlight — top-left */}
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{
              background: isDark
                ? "linear-gradient(135deg, rgba(255,255,255,0.035) 0%, transparent 40%, rgba(0,0,0,0.15) 100%)"
                : "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, transparent 40%, rgba(0,0,0,0.015) 100%)",
            }}
            transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
          />

          {/* Knob edge rim light */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              top: "2%",
              left: "2%",
              right: "2%",
              bottom: "2%",
            }}
            animate={{
              boxShadow: isDark
                ? "inset 0 0 0 1px rgba(255,255,255,0.035)"
                : "inset 0 0 0 1px rgba(255,255,255,0.35)",
            }}
            transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
          />
        </motion.div>

        {/* Track surface reflection — top highlight */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            top: "5%",
            left: "7%",
            right: "48%",
            height: "26%",
            borderRadius: "50% 50% 50% 50% / 100% 100% 0% 0%",
          }}
          animate={{
            background: isDark
              ? "linear-gradient(180deg, rgba(255,255,255,0.012) 0%, transparent 100%)"
              : "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)",
          }}
          transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
        />

        {/* Track rim light */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{
            boxShadow: isDark
              ? "inset 0 0 0 1px rgba(255,255,255,0.025)"
              : "inset 0 0 0 1px rgba(255,255,255,0.2)",
          }}
          transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
        />
      </motion.button>

      {/* === SHADOWS === */}

      {/* Primary cast shadow */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          bottom: "-28%",
          left: "2%",
          right: "2%",
          height: "50%",
          borderRadius: "50%",
          filter: "blur(22px)",
        }}
        animate={{
          background: isDark
            ? "rgba(0,0,0,0.65)"
            : "rgba(0,0,0,0.08)",
          scaleX: isDark ? 1.15 : 1,
          scaleY: isDark ? 1.25 : 0.85,
        }}
        transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
      />

      {/* Light reflection on surface beneath (light mode) */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          bottom: "-65%",
          left: "-15%",
          right: "-15%",
          height: "70%",
          borderRadius: "50%",
          filter: "blur(35px)",
        }}
        animate={{
          opacity: isDark ? 0 : 0.25,
          background: "radial-gradient(ellipse at 52% 30%, rgba(255,232,190,0.35) 0%, transparent 55%)",
        }}
        transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  );
}
