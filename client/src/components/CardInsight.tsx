/**
 * CardInsight — Compact inline insight for NeuCard headers
 *
 * A small "analyze" button that sits in a card header and expands
 * to show 1–3 contextual insight sentences directly inside the card.
 * Designed to pair insights with the specific data they describe.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';

export interface CardInsightItem {
  text: string;
  accent: 'cyan' | 'amber' | 'emerald' | 'coral';
}

interface CardInsightProps {
  insights: CardInsightItem[];
  isDark: boolean;
  /** Compact mode renders a smaller button for tight headers */
  compact?: boolean;
}

const ACCENT_COLORS: Record<string, string> = {
  cyan: 'var(--cyan)',
  amber: 'var(--amber)',
  emerald: 'var(--emerald)',
  coral: 'var(--coral)',
};

export function CardInsightButton({ insights, isDark, compact = false }: CardInsightProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (insights.length === 0) return null;

  return (
    <div className="relative">
      {/* Small analyze toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(v => !v); }}
        className="flex items-center gap-1 transition-all rounded-md"
        style={{
          padding: compact ? '2px 6px' : '3px 8px',
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: compact ? '9px' : '10px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase' as const,
          background: isOpen ? 'var(--neu-bg-pressed)' : 'transparent',
          color: isOpen ? 'var(--cyan)' : 'var(--muted-foreground)',
          boxShadow: isOpen
            ? (isDark
                ? 'inset 1px 1px 3px rgba(0,0,0,0.4), inset -1px -1px 2px rgba(60,60,80,0.06)'
                : 'inset 1px 1px 3px rgba(0,0,0,0.08), inset -1px -1px 2px rgba(255,255,255,0.4)')
            : 'none',
        }}
        title={isOpen ? 'Hide insights' : 'Show insights for this section'}
      >
        <Lightbulb size={compact ? 10 : 11} />
        {isOpen ? <X size={compact ? 8 : 9} /> : null}
      </button>

      {/* Inline insight sentences */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-0 top-full mt-1.5 z-30 overflow-hidden"
            style={{
              minWidth: '280px',
              maxWidth: '400px',
            }}
          >
            <div
              className="rounded-lg p-2.5 space-y-1.5"
              style={{
                background: isDark ? 'rgba(20,20,40,0.95)' : 'rgba(240,240,248,0.97)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
                boxShadow: isDark
                  ? '0 8px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)'
                  : '0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {insights.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.2 }}
                  className="flex items-start gap-2"
                >
                  <span
                    className="flex-shrink-0 w-1 h-1 rounded-full mt-[6px]"
                    style={{ background: ACCENT_COLORS[item.accent] }}
                  />
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{
                      fontFamily: 'Space Grotesk, sans-serif',
                      color: 'var(--foreground)',
                    }}
                  >
                    {item.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * CardInsightInline — Non-floating variant that expands inside the card body
 * rather than as a dropdown. Better for cards with more vertical space.
 */
export function CardInsightInline({ insights, isDark, compact = false }: CardInsightProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (insights.length === 0) return null;

  return (
    <div>
      {/* Small analyze toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(v => !v); }}
        className="flex items-center gap-1 transition-all rounded-md"
        style={{
          padding: compact ? '2px 6px' : '3px 8px',
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: compact ? '9px' : '10px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase' as const,
          background: isOpen ? 'var(--neu-bg-pressed)' : 'transparent',
          color: isOpen ? 'var(--cyan)' : 'var(--muted-foreground)',
          boxShadow: isOpen
            ? (isDark
                ? 'inset 1px 1px 3px rgba(0,0,0,0.4), inset -1px -1px 2px rgba(60,60,80,0.06)'
                : 'inset 1px 1px 3px rgba(0,0,0,0.08), inset -1px -1px 2px rgba(255,255,255,0.4)')
            : 'none',
        }}
        title={isOpen ? 'Hide insights' : 'Show insights for this section'}
      >
        <Lightbulb size={compact ? 10 : 11} />
        {isOpen ? <X size={compact ? 8 : 9} /> : null}
      </button>

      {/* Inline insight sentences — expands in-place */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div
              className="rounded-lg p-2.5 mt-2 space-y-1.5"
              style={{
                background: isDark ? 'rgba(0,212,255,0.04)' : 'rgba(8,145,178,0.04)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
              }}
            >
              {insights.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.2 }}
                  className="flex items-start gap-2"
                >
                  <span
                    className="flex-shrink-0 w-1 h-1 rounded-full mt-[6px]"
                    style={{ background: ACCENT_COLORS[item.accent] }}
                  />
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{
                      fontFamily: 'Space Grotesk, sans-serif',
                      color: 'var(--foreground)',
                    }}
                  >
                    {item.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CardInsightButton;
