/**
 * NeuInsightContainer — Neumorphic container that transitions between
 * a sunken depression and an elevated state.
 *
 * When inactive: a subtle recessed groove in the surface (inset shadows).
 *   Renders as a thin bar (~12px for full, ~8px for compact).
 * When active: rises above surrounding content with deeper shadows than
 *   standard NeuCards, casting shadows onto the environment beneath it.
 *   Expands to fit children content.
 *
 * Shadow depth comparison:
 *   neu-flat:    6px/6px/12px  (base level)
 *   neu-raised:  8px/8px/16px  (standard cards)
 *   THIS active: 12px/12px/24px + translateY(-3px) + cyan accent glow
 */

import { ReactNode, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface NeuInsightContainerProps {
  isOpen: boolean;
  isDark: boolean;
  children: ReactNode;
  variant?: 'full' | 'compact';
  className?: string;
  showDepression?: boolean;
}

export function NeuInsightContainer({
  isOpen,
  isDark,
  children,
  variant = 'full',
  className = '',
  showDepression = true,
}: NeuInsightContainerProps) {
  const isCompact = variant === 'compact';
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Measure content height when open
  useEffect(() => {
    if (isOpen && contentRef.current) {
      // Small delay to let children render
      const timer = setTimeout(() => {
        if (contentRef.current) {
          setContentHeight(contentRef.current.scrollHeight);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, children]);

  // Depression height (the thin groove when collapsed)
  const depressionHeight = isCompact ? 8 : 12;

  // ── Shadow definitions ──
  const activeShadow = isDark
    ? [
        '12px 12px 24px rgba(0,0,0,0.65)',
        '-8px -8px 20px rgba(60,60,80,0.1)',
        'inset 0 1px 0 rgba(255,255,255,0.06)',
        '0 0 24px rgba(0,212,255,0.05)',
      ].join(', ')
    : [
        '12px 12px 24px rgba(166,170,190,0.55)',
        '-8px -8px 20px rgba(255,255,255,0.9)',
        'inset 0 1px 0 rgba(255,255,255,0.7)',
        '0 0 24px rgba(8,145,178,0.05)',
      ].join(', ');

  const depressionShadow = isDark
    ? 'inset 3px 3px 8px rgba(0,0,0,0.5), inset -3px -3px 8px rgba(60,60,80,0.08)'
    : 'inset 3px 3px 8px rgba(166,170,190,0.35), inset -3px -3px 8px rgba(255,255,255,0.6)';

  // ── Colors ──
  const activeBg = isDark ? '#232340' : '#eaeaf4';
  const depressionBg = isDark ? '#141422' : '#d8d8e2';

  const activeBorder = isDark
    ? '1px solid rgba(0,212,255,0.12)'
    : '1px solid rgba(8,145,178,0.1)';
  const depressionBorder = isDark
    ? '1px solid rgba(255,255,255,0.02)'
    : '1px solid rgba(0,0,0,0.03)';

  const rounding = isCompact ? 'rounded-lg' : 'rounded-xl';
  const padding = isCompact ? 10 : 16;

  // Don't render if not open and depression is disabled
  if (!isOpen && !showDepression) return null;

  return (
    <motion.div
      animate={{
        height: isOpen ? contentHeight + (padding * 2) : depressionHeight,
        boxShadow: isOpen ? activeShadow : depressionShadow,
        background: isOpen ? activeBg : depressionBg,
        y: isOpen ? (isCompact ? -1 : -3) : 0,
      }}
      transition={{
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`${rounding} overflow-hidden ${className}`}
      style={{
        position: 'relative',
        zIndex: isOpen ? 10 : 1,
        border: isOpen ? activeBorder : depressionBorder,
      }}
    >
      {/* Top edge highlight — subtle light catch on the elevated surface */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="absolute inset-x-0 top-0 h-[1px] pointer-events-none"
          style={{
            background: isDark
              ? 'linear-gradient(90deg, transparent 10%, rgba(0,212,255,0.18) 50%, transparent 90%)'
              : 'linear-gradient(90deg, transparent 10%, rgba(8,145,178,0.14) 50%, transparent 90%)',
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
          opacity: { duration: isOpen ? 0.3 : 0.15, delay: isOpen ? 0.15 : 0 },
          padding: { duration: 0.3 },
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export default NeuInsightContainer;
