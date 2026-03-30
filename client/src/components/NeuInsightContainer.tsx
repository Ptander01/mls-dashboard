/**
 * NeuInsightContainer — Invisible wrapper with smooth reveal
 *
 * When collapsed: renders absolutely nothing.
 * When opened: smoothly expands height and fades in children.
 *   The wrapper itself is completely transparent — no background,
 *   no border, no shadow, no "moat". The individual insight cards
 *   provide their own elevation and styling.
 *
 * This is purely an animation orchestrator, not a visual container.
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

  /* ── Timing ────────────────────────────────────────────── */
  const duration = isCompact ? 0.3 : 0.4;
  const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
  const padding = isCompact ? 10 : 20;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="insight-container"
          initial={{
            height: 0,
            opacity: 0,
            marginTop: 0,
            marginBottom: 0,
          }}
          animate={{
            height: contentHeight + padding * 2,
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
            height: { duration, ease },
            opacity: { duration: duration * 0.6 },
            marginTop: { duration: duration * 0.5 },
            marginBottom: { duration: duration * 0.5 },
          }}
          className={`overflow-hidden ${className}`}
          style={{ position: "relative" }}
        >
          {/* Content */}
          <motion.div
            ref={contentRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.25, delay: duration * 0.3 },
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
