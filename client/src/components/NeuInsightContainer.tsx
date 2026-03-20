/**
 * NeuInsightContainer — Neumorphic container that transitions between
 * a sunken depression and a dramatically elevated state.
 *
 * When inactive: a subtle recessed groove in the surface (inset shadows).
 *   Renders as a thin bar (~14px for full, ~8px for compact).
 * When active: rises prominently above surrounding content with deep,
 *   long-casting shadows that spill onto the environment beneath it.
 *   No cyan border glow — the glow effect is on the sparkle icon in
 *   the InsightPanel header instead.
 *
 * Shadow depth comparison:
 *   neu-flat:    6px/6px/12px   (base level)
 *   neu-raised:  8px/8px/16px   (standard cards)
 *   THIS active: 18px/18px/40px + translateY(-6px)
 */

import { ReactNode, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

interface NeuInsightContainerProps {
  isOpen: boolean;
  isDark: boolean;
  children: ReactNode;
  variant?: "full" | "compact";
  className?: string;
  showDepression?: boolean;
}

export function NeuInsightContainer({
  isOpen,
  isDark,
  children,
  variant = "full",
  className = "",
  showDepression = true,
}: NeuInsightContainerProps) {
  const isCompact = variant === "compact";
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Measure content height when open
  useEffect(() => {
    if (isOpen && contentRef.current) {
      const timer = setTimeout(() => {
        if (contentRef.current) {
          setContentHeight(contentRef.current.scrollHeight);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, children]);

  // Depression height (the thin groove when collapsed)
  const depressionHeight = isCompact ? 8 : 14;

  // ── Shadow definitions — deep neumorphic elevation, NO cyan glow ──
  const activeShadow = isDark
    ? [
        // Primary deep shadow — long cast below
        "0 18px 40px rgba(0,0,0,0.7)",
        "0 8px 16px rgba(0,0,0,0.5)",
        // Lift shadow — subtle upper-left highlight
        "-6px -6px 16px rgba(60,60,80,0.12)",
        // Inner top highlight — surface light catch
        "inset 0 1px 0 rgba(255,255,255,0.08)",
        "inset 0 -1px 0 rgba(0,0,0,0.3)",
      ].join(", ")
    : [
        // Primary deep shadow — long cast below
        "0 18px 40px rgba(140,145,170,0.4)",
        "0 8px 16px rgba(166,170,190,0.35)",
        // Lift shadow — bright upper-left
        "-6px -6px 16px rgba(255,255,255,0.95)",
        // Inner top highlight — glossy surface
        "inset 0 1px 0 rgba(255,255,255,0.85)",
        "inset 0 -1px 0 rgba(166,170,190,0.12)",
      ].join(", ");

  const depressionShadow = isDark
    ? "inset 3px 3px 8px rgba(0,0,0,0.5), inset -3px -3px 8px rgba(60,60,80,0.08)"
    : "inset 3px 3px 8px rgba(166,170,190,0.35), inset -3px -3px 8px rgba(255,255,255,0.6)";

  // ── Colors ──
  const activeBg = isDark ? "#232340" : "#ebedf6";
  const depressionBg = isDark ? "#141422" : "#d8d8e2";

  // Neutral border — no cyan accent
  const activeBorder = isDark
    ? "1.5px solid rgba(255,255,255,0.06)"
    : "1.5px solid rgba(0,0,0,0.06)";
  const depressionBorder = isDark
    ? "1px solid rgba(255,255,255,0.02)"
    : "1px solid rgba(0,0,0,0.03)";

  const rounding = isCompact ? "rounded-lg" : "rounded-2xl";
  const padding = isCompact ? 10 : 20;

  // Don't render if not open and depression is disabled
  if (!isOpen && !showDepression) return null;

  return (
    <>
      <motion.div
        animate={{
          height: isOpen ? contentHeight + padding * 2 : depressionHeight,
          boxShadow: isOpen ? activeShadow : depressionShadow,
          background: isOpen ? activeBg : depressionBg,
          y: isOpen ? (isCompact ? -2 : -6) : 0,
          marginTop: isOpen ? (isCompact ? 4 : 8) : 0,
          marginBottom: isOpen ? (isCompact ? 4 : 16) : 0,
        }}
        transition={{
          duration: 0.45,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={`${rounding} overflow-hidden ${className}`}
        style={{
          position: "relative",
          zIndex: isOpen ? 10 : 1,
          border: isOpen ? activeBorder : depressionBorder,
        }}
      >
        {/* Bottom edge shadow line — reinforces the floating effect */}
        {isOpen && !isCompact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="absolute inset-x-0 bottom-0 h-[1px] pointer-events-none"
            style={{
              background: isDark
                ? "linear-gradient(90deg, transparent 10%, rgba(0,0,0,0.4) 50%, transparent 90%)"
                : "linear-gradient(90deg, transparent 10%, rgba(0,0,0,0.08) 50%, transparent 90%)",
            }}
          />
        )}

        {/* Content */}
        <motion.div
          ref={contentRef}
          animate={{
            opacity: isOpen ? 1 : 0,
            padding: isOpen ? padding : 0,
          }}
          transition={{
            opacity: {
              duration: isOpen ? 0.3 : 0.15,
              delay: isOpen ? 0.15 : 0,
            },
            padding: { duration: 0.3 },
          }}
        >
          {children}
        </motion.div>
      </motion.div>

      {/* Cast shadow element — sits below the container to cast onto content beneath */}
      {isOpen && !isCompact && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="pointer-events-none"
          style={{
            height: 8,
            marginTop: -4,
            background: isDark
              ? "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(0,0,0,0.15) 0%, transparent 100%)"
              : "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(140,145,170,0.1) 0%, transparent 100%)",
          }}
        />
      )}
    </>
  );
}

export default NeuInsightContainer;
