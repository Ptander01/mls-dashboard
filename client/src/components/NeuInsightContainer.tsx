/**
 * NeuInsightContainer — Clean elevated reveal
 *
 * When collapsed: renders absolutely nothing — no groove, no border,
 * no visual artifact of any kind.
 *
 * When opened: the elevated container fades in and rises smoothly
 * into view with deep neumorphic shadows. Content blooms in with
 * a subtle scale-up handled by the parent's stagger delays.
 *
 * Shadow depth comparison:
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

  const activeBorder = isDark
    ? "1.5px solid rgba(255,255,255,0.06)"
    : "1.5px solid rgba(0,0,0,0.06)";

  const rounding = isCompact ? "rounded-lg" : "rounded-2xl";
  const padding = isCompact ? 10 : 20;

  /* ── Timing ────────────────────────────────────────────── */
  const duration = isCompact ? 0.3 : 0.4;
  const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
  const riseY = isCompact ? -2 : -6;

  /* ── Render nothing when collapsed ─────────────────────── */
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="insight-container"
          initial={{
            height: 0,
            opacity: 0,
            y: 20,
            marginTop: 0,
            marginBottom: 0,
          }}
          animate={{
            height: contentHeight + padding * 2,
            opacity: 1,
            y: riseY,
            marginTop: isCompact ? 4 : 8,
            marginBottom: isCompact ? 4 : 16,
          }}
          exit={{
            height: 0,
            opacity: 0,
            y: 20,
            marginTop: 0,
            marginBottom: 0,
          }}
          transition={{
            height: { duration, ease },
            opacity: { duration: duration * 0.6 },
            y: { duration, ease },
            marginTop: { duration: duration * 0.5 },
            marginBottom: { duration: duration * 0.5 },
          }}
          className={`${rounding} overflow-hidden ${className}`}
          style={{
            position: "relative",
            zIndex: 10,
            background: activeBg,
            boxShadow: activeShadow,
            border: activeBorder,
          }}
        >
          {/* Bottom edge shadow line — reinforces the floating effect */}
          {!isCompact && (
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
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{
              opacity: { duration: 0.25, delay: duration * 0.4 },
              scale: { duration: 0.25, delay: duration * 0.4, ease },
            }}
            style={{ padding }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NeuInsightContainer;
