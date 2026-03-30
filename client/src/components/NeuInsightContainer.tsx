/**
 * NeuInsightContainer — Cinematic "Mechanical Door" Animation
 *
 * Replaces the old depression-groove approach with a three-stage
 * Iron-Man-style reveal sequence:
 *
 *   Stage 1 — The Parting Doors (0–300ms)
 *     A dark recessed cavity appears. Pseudo-door panels scale inward
 *     on the X-axis (scaleX 1→0), revealing the bay underneath.
 *
 *   Stage 2 — The Ascent (300–600ms)
 *     The elevated insight container rises out of the cavity
 *     (translateY +40 → −6), masked by the bay's overflow-hidden.
 *
 *   Stage 3 — Content Bloom (500–800ms)
 *     Internal children fade in and scale 0.95→1, handled by the
 *     parent (InsightPanel / CardInsightSection) via stagger delays.
 *
 * When collapsed the component renders **nothing** — no depression,
 * no groove, no residual artifact.
 *
 * Shadow depth comparison (unchanged):
 *   neu-flat:    6px/6px/12px   (base level)
 *   neu-raised:  8px/8px/16px   (standard cards)
 *   THIS active: 18px/18px/40px + translateY(-6px)
 */

import { ReactNode, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Props ─────────────────────────────────────────────────── */

interface NeuInsightContainerProps {
  isOpen: boolean;
  isDark: boolean;
  children: ReactNode;
  variant?: "full" | "compact";
  className?: string;
  /** @deprecated — no longer used; kept for API compat */
  showDepression?: boolean;
}

/* ── Component ─────────────────────────────────────────────── */

export function NeuInsightContainer({
  isOpen,
  isDark,
  children,
  variant = "full",
  className = "",
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

  /* ── Shadow definitions — deep neumorphic elevation ────── */
  const activeShadow = isDark
    ? [
        "0 18px 40px rgba(0,0,0,0.7)",
        "0 8px 16px rgba(0,0,0,0.5)",
        "-6px -6px 16px rgba(60,60,80,0.12)",
        "inset 0 1px 0 rgba(255,255,255,0.08)",
        "inset 0 -1px 0 rgba(0,0,0,0.3)",
      ].join(", ")
    : [
        "0 18px 40px rgba(140,145,170,0.4)",
        "0 8px 16px rgba(166,170,190,0.35)",
        "-6px -6px 16px rgba(255,255,255,0.95)",
        "inset 0 1px 0 rgba(255,255,255,0.85)",
        "inset 0 -1px 0 rgba(166,170,190,0.12)",
      ].join(", ");

  /* ── Colors ─────────────────────────────────────────────── */
  const activeBg = isDark ? "#232340" : "#ebedf6";
  const bayBg = isDark ? "#141422" : "#d0d0dc";

  const activeBorder = isDark
    ? "1.5px solid rgba(255,255,255,0.06)"
    : "1.5px solid rgba(0,0,0,0.06)";

  const rounding = isCompact ? "rounded-lg" : "rounded-2xl";
  const padding = isCompact ? 10 : 20;

  /* ── Bay inner shadow — deep mechanical recess look ───── */
  const bayInnerShadow = isDark
    ? "inset 0 4px 16px rgba(0,0,0,0.6), inset 0 1px 4px rgba(0,0,0,0.4)"
    : "inset 0 4px 16px rgba(0,0,0,0.1), inset 0 1px 4px rgba(0,0,0,0.06)";

  /* ── Timing constants ──────────────────────────────────── */
  const doorDuration = isCompact ? 0.2 : 0.3;
  const riseDuration = isCompact ? 0.25 : 0.35;
  const riseDelay = isCompact ? 0.12 : 0.2;
  const riseY = isCompact ? -2 : -6;

  /* ── Render nothing when collapsed ─────────────────────── */
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="bay-wrapper"
          /* Stage 1 — Bay Wrapper: the cavity that parts open */
          initial={{
            height: 0,
            opacity: 0,
            marginTop: 0,
            marginBottom: 0,
          }}
          animate={{
            height: contentHeight + padding * 2 + 16, // extra room for float
            opacity: 1,
            marginTop: isCompact ? 4 : 8,
            marginBottom: isCompact ? 4 : 16,
          }}
          exit={{
            height: 0,
            opacity: 0,
            marginTop: 0,
            marginBottom: 0,
          }}
          transition={{
            height: {
              type: "spring",
              stiffness: isCompact ? 350 : 300,
              damping: isCompact ? 35 : 30,
            },
            opacity: { duration: 0.15 },
            marginTop: { duration: doorDuration },
            marginBottom: { duration: doorDuration },
          }}
          className={`${rounding} overflow-hidden relative ${className}`}
          style={{
            background: bayBg,
            boxShadow: bayInnerShadow,
            zIndex: 10,
          }}
        >
          {/* ── Door panels — scale X from 1→0 to reveal the bay ── */}
          {/* Left door */}
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            exit={{ scaleX: 1 }}
            transition={{
              duration: doorDuration,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              transformOrigin: "left center",
              background: isDark
                ? "linear-gradient(90deg, #1a1a2e 0%, #141422 100%)"
                : "linear-gradient(90deg, #dcdce6 0%, #d0d0dc 100%)",
              borderRight: isDark
                ? "1px solid rgba(255,255,255,0.04)"
                : "1px solid rgba(0,0,0,0.04)",
            }}
          />
          {/* Right door */}
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            exit={{ scaleX: 1 }}
            transition={{
              duration: doorDuration,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              transformOrigin: "right center",
              background: isDark
                ? "linear-gradient(270deg, #1a1a2e 0%, #141422 100%)"
                : "linear-gradient(270deg, #dcdce6 0%, #d0d0dc 100%)",
              borderLeft: isDark
                ? "1px solid rgba(255,255,255,0.04)"
                : "1px solid rgba(0,0,0,0.04)",
            }}
          />

          {/* ── Center seam line — the split where doors part ── */}
          <motion.div
            initial={{ opacity: 0.8, scaleY: 1 }}
            animate={{ opacity: 0, scaleY: 0.5 }}
            exit={{ opacity: 0.8, scaleY: 1 }}
            transition={{ duration: doorDuration * 0.6 }}
            className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] z-30 pointer-events-none"
            style={{
              background: isDark
                ? "rgba(0,212,255,0.25)"
                : "rgba(8,145,178,0.2)",
              boxShadow: isDark
                ? "0 0 8px rgba(0,212,255,0.3)"
                : "0 0 8px rgba(8,145,178,0.2)",
            }}
          />

          {/* ── Stage 2 — Rising container ── */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: riseY, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{
              y: {
                type: "spring",
                stiffness: isCompact ? 350 : 280,
                damping: isCompact ? 30 : 26,
                delay: riseDelay,
              },
              opacity: {
                duration: 0.2,
                delay: riseDelay,
              },
            }}
            className={`${rounding} relative z-10`}
            style={{
              background: activeBg,
              boxShadow: activeShadow,
              border: activeBorder,
              margin: isCompact ? 4 : 8,
            }}
          >
            {/* Bottom edge shadow line — reinforces floating effect */}
            {!isCompact && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: riseDelay + 0.15, duration: 0.3 }}
                className="absolute inset-x-0 bottom-0 h-[1px] pointer-events-none"
                style={{
                  background: isDark
                    ? "linear-gradient(90deg, transparent 10%, rgba(0,0,0,0.4) 50%, transparent 90%)"
                    : "linear-gradient(90deg, transparent 10%, rgba(0,0,0,0.08) 50%, transparent 90%)",
                }}
              />
            )}

            {/* Content wrapper */}
            <motion.div
              ref={contentRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                opacity: {
                  duration: 0.25,
                  delay: riseDelay + 0.1,
                },
                scale: {
                  duration: 0.25,
                  delay: riseDelay + 0.1,
                  ease: [0.22, 1, 0.36, 1],
                },
              }}
              style={{ padding }}
            >
              {children}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NeuInsightContainer;
