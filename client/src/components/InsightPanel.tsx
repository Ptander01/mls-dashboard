/**
 * InsightPanel — Tab-wide neumorphic insight section
 *
 * Layout:
 *   [ANALYZE button]                    ← always visible, outside the container
 *   [NeuInsightContainer]               ← depression groove when closed, elevated with cards when open
 *     └── 2x2 grid of InsightCards      ← only when open
 *
 * The container always renders (showing the depression floor when collapsed).
 * When the user clicks ANALYZE, the container rises above surrounding content
 * with deeper shadows than standard NeuCards, and the insight cards animate in.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, AlertTriangle, Star, Zap, Target,
  DollarSign, Users, BarChart3, Lightbulb, ChevronDown, ChevronUp
} from 'lucide-react';
import type { Insight } from '@/lib/insightEngine';
import { NeuInsightContainer } from './NeuInsightContainer';

const ICON_MAP: Record<Insight['icon'], React.ElementType> = {
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'alert': AlertTriangle,
  'star': Star,
  'zap': Zap,
  'target': Target,
  'dollar': DollarSign,
  'users': Users,
  'bar-chart': BarChart3,
};

const ACCENT_MAP: Record<Insight['accentColor'], string> = {
  cyan: 'var(--cyan)',
  amber: 'var(--amber)',
  emerald: 'var(--emerald)',
  coral: 'var(--coral)',
};

const ACCENT_BG_MAP: Record<Insight['accentColor'], { dark: string; light: string }> = {
  cyan: { dark: 'rgba(0,212,255,0.06)', light: 'rgba(8,145,178,0.06)' },
  amber: { dark: 'rgba(255,179,71,0.06)', light: 'rgba(217,119,6,0.06)' },
  emerald: { dark: 'rgba(0,200,151,0.06)', light: 'rgba(5,150,105,0.06)' },
  coral: { dark: 'rgba(255,107,107,0.06)', light: 'rgba(220,38,38,0.06)' },
};

interface InsightPanelProps {
  insights: Insight[];
  isDark: boolean;
  className?: string;
  onToggle?: (isOpen: boolean) => void;
}

export function InsightPanel({ insights, isDark, className = '', onToggle }: InsightPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (insights.length === 0) return null;

  return (
    <div className={className}>
      {/* Analyze Toggle Button — always visible, outside the container */}
      <button
        onClick={() => { setIsOpen(v => { const next = !v; onToggle?.(next); return next; }); }}
        className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all mb-2"
        style={{
          fontFamily: 'Space Grotesk, sans-serif',
          background: isOpen ? 'var(--neu-bg-pressed)' : 'var(--neu-bg-raised)',
          color: isOpen ? 'var(--cyan)' : 'var(--muted-foreground)',
          boxShadow: isOpen
            ? (isDark
                ? 'inset 2px 2px 5px rgba(0,0,0,0.5), inset -1px -1px 3px rgba(60,60,80,0.08)'
                : 'inset 2px 2px 5px rgba(0,0,0,0.1), inset -1px -1px 3px rgba(255,255,255,0.5)')
            : (isDark
                ? '3px 3px 6px rgba(0,0,0,0.4), -2px -2px 4px rgba(60,60,80,0.08)'
                : '3px 3px 6px rgba(166,170,190,0.3), -2px -2px 4px rgba(255,255,255,0.7)'),
        }}
      >
        <Lightbulb size={13} />
        {isOpen ? 'EXPLORE' : 'ANALYZE'}
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* NeuInsightContainer — shows depression groove when closed, rises when open */}
      <NeuInsightContainer isOpen={isOpen} isDark={isDark} variant="full" showDepression={true}>
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              key="insight-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              {insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} isDark={isDark} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </NeuInsightContainer>
    </div>
  );
}

function InsightCard({ insight, isDark, index }: { insight: Insight; isDark: boolean; index: number }) {
  const Icon = ICON_MAP[insight.icon] || Zap;
  const accentColor = ACCENT_MAP[insight.accentColor];
  const bgColor = isDark
    ? ACCENT_BG_MAP[insight.accentColor].dark
    : ACCENT_BG_MAP[insight.accentColor].light;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08 + 0.1, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="rounded-xl p-3.5 transition-colors"
      style={{
        background: bgColor,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: isDark
          ? 'inset 1px 1px 2px rgba(255,255,255,0.02), 2px 2px 6px rgba(0,0,0,0.2)'
          : 'inset 1px 1px 2px rgba(255,255,255,0.5), 2px 2px 6px rgba(166,170,190,0.15)',
      }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
          style={{
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            boxShadow: isDark
              ? 'inset 1px 1px 3px rgba(0,0,0,0.3), -1px -1px 2px rgba(255,255,255,0.03)'
              : 'inset 1px 1px 3px rgba(0,0,0,0.06), -1px -1px 2px rgba(255,255,255,0.6)',
          }}
        >
          <Icon size={14} style={{ color: accentColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-semibold leading-snug mb-1"
            style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--foreground)' }}
          >
            {insight.headline}
          </p>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: 'var(--muted-foreground)' }}
          >
            {insight.detail}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * InsightHeadline — Animated headline that replaces the static chart title
 */
interface InsightHeadlineProps {
  headline: string;
  isAnalyzing: boolean;
  staticTitle: React.ReactNode;
  isDark: boolean;
}

export function InsightHeadline({ headline, isAnalyzing, staticTitle, isDark }: InsightHeadlineProps) {
  return (
    <div className="space-y-1.5">
      <AnimatePresence mode="wait">
        {isAnalyzing && headline && (
          <motion.p
            key={headline}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-xs leading-relaxed"
            style={{
              fontFamily: 'Space Grotesk, sans-serif',
              color: 'var(--cyan)',
              fontWeight: 500,
            }}
          >
            {headline}
          </motion.p>
        )}
      </AnimatePresence>
      <div
        className="text-[11px] text-muted-foreground leading-relaxed"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {staticTitle}
      </div>
    </div>
  );
}

export default InsightPanel;
