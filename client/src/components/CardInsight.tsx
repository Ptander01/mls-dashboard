/**
 * CardInsight — Per-card insight with inline neumorphic rising container
 *
 * When the user clicks the lightbulb button in a card header, a new
 * NeuInsightContainer appears INSIDE the card body (below the header,
 * above the chart/content), pushing the content down. The container
 * uses the same depression-to-elevation animation as the tab-wide
 * ANALYZE panel, creating a consistent "insight rises above data" metaphor.
 *
 * The floating glass popup is gone — everything is inline and pushes
 * content down naturally.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';
import { NeuInsightContainer } from './NeuInsightContainer';

export interface CardInsightItem {
  text: string;
  accent: 'cyan' | 'amber' | 'emerald' | 'coral';
}

interface CardInsightButtonProps {
  insights: CardInsightItem[];
  isDark: boolean;
  compact?: boolean;
}

const ACCENT_COLORS: Record<string, string> = {
  cyan: 'var(--cyan)',
  amber: 'var(--amber)',
  emerald: 'var(--emerald)',
  coral: 'var(--coral)',
};

/**
 * CardInsightButton — The toggle button that goes in the card header.
 * This ONLY renders the button. The actual insight content is rendered
 * separately via CardInsightSection, which must be placed in the card
 * body where you want the insights to appear.
 *
 * Usage:
 *   const [showInsights, setShowInsights] = useState(false);
 *   // In header: <CardInsightButton isOpen={showInsights} onToggle={() => setShowInsights(v => !v)} />
 *   // In body:   <CardInsightSection isOpen={showInsights} insights={...} isDark={isDark} />
 */
interface CardInsightToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  isDark: boolean;
  compact?: boolean;
}

export function CardInsightToggle({ isOpen, onToggle, isDark, compact = false }: CardInsightToggleProps) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
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
  );
}

/**
 * CardInsightSection — The inline insight content that appears inside
 * the card body. Uses NeuInsightContainer for the rising effect.
 * Place this between the card header and the card's main content.
 */
interface CardInsightSectionProps {
  isOpen: boolean;
  insights: CardInsightItem[];
  isDark: boolean;
}

export function CardInsightSection({ isOpen, insights, isDark }: CardInsightSectionProps) {
  if (insights.length === 0) return null;

  return (
    <div className="px-3 pb-1 pt-1">
      <NeuInsightContainer
        isOpen={isOpen}
        isDark={isDark}
        variant="compact"
        showDepression={isOpen}
      >
        {isOpen && (
          <div className="space-y-1.5">
            {insights.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 + 0.15, duration: 0.2 }}
                className="flex items-start gap-2"
              >
                <span
                  className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[5px]"
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
        )}
      </NeuInsightContainer>
    </div>
  );
}

/**
 * Legacy CardInsightButton — Self-contained button + floating popup.
 * DEPRECATED: Use CardInsightToggle + CardInsightSection instead.
 * Kept temporarily for backward compatibility during migration.
 */
export function CardInsightButton({ insights, isDark, compact = false }: CardInsightButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (insights.length === 0) return null;

  return (
    <div>
      <CardInsightToggle
        isOpen={isOpen}
        onToggle={() => setIsOpen(v => !v)}
        isDark={isDark}
        compact={compact}
      />
      <CardInsightSection isOpen={isOpen} insights={insights} isDark={isDark} />
    </div>
  );
}

/**
 * CardInsightInline — Non-floating variant (same as CardInsightButton now).
 */
export function CardInsightInline({ insights, isDark, compact = false }: CardInsightButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (insights.length === 0) return null;

  return (
    <div>
      <CardInsightToggle
        isOpen={isOpen}
        onToggle={() => setIsOpen(v => !v)}
        isDark={isDark}
        compact={compact}
      />
      <CardInsightSection isOpen={isOpen} insights={insights} isDark={isDark} />
    </div>
  );
}

export default CardInsightButton;
