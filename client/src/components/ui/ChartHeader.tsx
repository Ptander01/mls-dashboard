/**
 * ChartHeader — Uniform "rich introduction + expandable methods" template
 *
 * Every chart card in the dashboard uses this component for its header.
 * Two layers:
 *   Layer 1 (always visible): Conversational description — smart-casual,
 *     FiveThirtyEight-style, leading with a question the reader already has.
 *   Layer 2 (expandable):     Academic methods — exact formulas, variable
 *     definitions, statistical caveats, data sources, and units.
 *
 * The Methods section uses a neumorphic pressed/inset style when expanded,
 * with a smooth height animation via framer-motion.
 *
 * Props:
 *   title        — chart title (string)
 *   subtitle     — optional subtitle (string)
 *   description  — conversational hook (ReactNode)
 *   methods      — academic detail (ReactNode, collapsed by default)
 *   rightAction  — toggle buttons, filters, etc. (ReactNode)
 */

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ChartHeaderProps {
  title: string;
  subtitle?: string;
  description: ReactNode;
  methods?: ReactNode;
  rightAction?: ReactNode;
}

export function ChartHeader({
  title,
  subtitle,
  description,
  methods,
  rightAction,
}: ChartHeaderProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [methodsOpen, setMethodsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Measure methods content height when open
  useEffect(() => {
    if (methodsOpen && contentRef.current) {
      const timer = setTimeout(() => {
        if (contentRef.current) {
          setContentHeight(contentRef.current.scrollHeight);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [methodsOpen, methods]);

  // Neumorphic inset shadow for the methods panel
  const insetShadow = isDark
    ? 'inset 3px 3px 8px rgba(0,0,0,0.5), inset -3px -3px 8px rgba(60,60,80,0.08)'
    : 'inset 3px 3px 8px rgba(166,170,190,0.35), inset -3px -3px 8px rgba(255,255,255,0.6)';

  const insetBg = isDark ? '#141422' : '#d8d8e2';

  const insetBorder = isDark
    ? '1px solid rgba(255,255,255,0.03)'
    : '1px solid rgba(0,0,0,0.04)';

  return (
    <div className="mb-4">
      {/* Title row with right actions */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              className="text-[10px] text-muted-foreground mt-0.5"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Methods toggle button */}
          {methods && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMethodsOpen((v) => !v);
              }}
              className="flex items-center gap-1 transition-all rounded-md cursor-pointer select-none"
              style={{
                padding: '3px 8px',
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: methodsOpen ? 'var(--neu-bg-pressed)' : 'transparent',
                color: methodsOpen ? 'var(--cyan)' : 'var(--muted-foreground)',
                boxShadow: methodsOpen
                  ? isDark
                    ? 'inset 1px 1px 3px rgba(0,0,0,0.4), inset -1px -1px 2px rgba(60,60,80,0.06)'
                    : 'inset 1px 1px 3px rgba(0,0,0,0.08), inset -1px -1px 2px rgba(255,255,255,0.4)'
                  : 'none',
              }}
              title={methodsOpen ? 'Hide methods' : 'Show methodology details'}
            >
              <FlaskConical size={11} />
              <span>Methods</span>
            </button>
          )}

          {/* Right action slot (toggle buttons, filters, etc.) */}
          {rightAction}
        </div>
      </div>

      {/* Description — full-width conversational text */}
      <div
        className="text-[11px] text-muted-foreground leading-relaxed"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {description}
      </div>

      {/* Expandable Methods section — neumorphic inset */}
      {methods && (
        <motion.div
          animate={{
            height: methodsOpen ? contentHeight + 20 : 0,
            marginTop: methodsOpen ? 10 : 0,
            opacity: methodsOpen ? 1 : 0,
          }}
          transition={{
            height: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
            marginTop: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: methodsOpen ? 0.35 : 0.15, delay: methodsOpen ? 0.1 : 0 },
          }}
          className="overflow-hidden rounded-lg"
          style={{
            boxShadow: methodsOpen ? insetShadow : 'none',
            background: methodsOpen ? insetBg : 'transparent',
            border: methodsOpen ? insetBorder : '1px solid transparent',
          }}
        >
          <div
            ref={contentRef}
            className="px-3 py-2.5"
          >
            <AnimatePresence mode="wait">
              {methodsOpen && (
                <motion.div
                  key="methods-content"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                  className="text-[10px] leading-relaxed text-muted-foreground/80"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {methods}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default ChartHeader;
