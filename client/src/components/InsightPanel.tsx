/**
 * InsightPanel — Tab-wide neumorphic insight section
 *
 * Layout:
 *   [ANALYZE button]                    ← always visible, outside the container
 *   [NeuInsightContainer]               ← depression groove when closed, elevated with cards when open
 *     └── Header line                   ← describes what the panel shows
 *     └── 2x2 grid of InsightCards      ← tactile 3D cards with embossed borders
 *
 * The container always renders (showing the depression floor when collapsed).
 * When the user clicks ANALYZE, the container rises above surrounding content
 * with deeper shadows than standard NeuCards, and the insight cards animate in.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Star,
  Zap,
  Target,
  DollarSign,
  Users,
  BarChart3,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import type { Insight } from "@/lib/insightEngine";
import { NeuInsightContainer } from "./NeuInsightContainer";

const ICON_MAP: Record<Insight["icon"], React.ElementType> = {
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  alert: AlertTriangle,
  star: Star,
  zap: Zap,
  target: Target,
  dollar: DollarSign,
  users: Users,
  "bar-chart": BarChart3,
};

const ACCENT_MAP: Record<Insight["accentColor"], string> = {
  cyan: "var(--cyan)",
  amber: "var(--amber)",
  emerald: "var(--emerald)",
  coral: "var(--coral)",
};

const ACCENT_BG_MAP: Record<
  Insight["accentColor"],
  { dark: string; light: string }
> = {
  cyan: { dark: "rgba(0,212,255,0.08)", light: "rgba(8,145,178,0.07)" },
  amber: { dark: "rgba(255,179,71,0.08)", light: "rgba(217,119,6,0.07)" },
  emerald: { dark: "rgba(0,200,151,0.08)", light: "rgba(5,150,105,0.07)" },
  coral: { dark: "rgba(255,107,107,0.08)", light: "rgba(220,38,38,0.07)" },
};

const ACCENT_BORDER_MAP: Record<
  Insight["accentColor"],
  { dark: string; light: string }
> = {
  cyan: { dark: "rgba(0,212,255,0.18)", light: "rgba(8,145,178,0.14)" },
  amber: { dark: "rgba(255,179,71,0.18)", light: "rgba(217,119,6,0.14)" },
  emerald: { dark: "rgba(0,200,151,0.18)", light: "rgba(5,150,105,0.14)" },
  coral: { dark: "rgba(255,107,107,0.18)", light: "rgba(220,38,38,0.14)" },
};

interface InsightPanelProps {
  insights: Insight[];
  isDark: boolean;
  className?: string;
  onToggle?: (isOpen: boolean) => void;
}

export function InsightPanel({
  insights,
  isDark,
  className = "",
  onToggle,
}: InsightPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (insights.length === 0) return null;

  return (
    <div className={className}>
      {/* Analyze Toggle Button — always visible, outside the container */}
      <button
        onClick={() => {
          setIsOpen(v => {
            const next = !v;
            onToggle?.(next);
            return next;
          });
        }}
        className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all mb-3"
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          background: isOpen ? "var(--neu-bg-pressed)" : "var(--neu-bg-raised)",
          color: isOpen ? "var(--cyan)" : "var(--muted-foreground)",
          boxShadow: isOpen
            ? isDark
              ? "inset 2px 2px 5px rgba(0,0,0,0.5), inset -1px -1px 3px rgba(60,60,80,0.08)"
              : "inset 2px 2px 5px rgba(0,0,0,0.1), inset -1px -1px 3px rgba(255,255,255,0.5)"
            : isDark
              ? "3px 3px 6px rgba(0,0,0,0.4), -2px -2px 4px rgba(60,60,80,0.08)"
              : "3px 3px 6px rgba(166,170,190,0.3), -2px -2px 4px rgba(255,255,255,0.7)",
        }}
      >
        <Lightbulb size={13} />
        {isOpen ? "EXPLORE" : "ANALYZE"}
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* NeuInsightContainer — shows depression groove when closed, rises when open */}
      <NeuInsightContainer
        isOpen={isOpen}
        isDark={isDark}
        variant="full"
        showDepression={true}
      >
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              key="insight-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* ── Header line ── */}
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.25 }}
                className="flex items-center gap-2.5 mb-4 pb-3"
                style={{
                  borderBottom: isDark
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <div
                  className="relative flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{
                    background: isDark
                      ? "rgba(0,212,255,0.08)"
                      : "rgba(8,145,178,0.06)",
                  }}
                >
                  {/* Bloom glow layers radiating from the icon */}
                  <div
                    className="absolute inset-0 rounded-lg pointer-events-none"
                    style={{
                      boxShadow: isDark
                        ? [
                            "0 0 12px rgba(0,212,255,0.4)",
                            "0 0 28px rgba(0,212,255,0.2)",
                            "0 0 50px rgba(0,212,255,0.1)",
                          ].join(", ")
                        : [
                            "0 0 12px rgba(8,145,178,0.35)",
                            "0 0 28px rgba(8,145,178,0.15)",
                            "0 0 50px rgba(8,145,178,0.08)",
                          ].join(", "),
                    }}
                  />
                  {/* Soft radial bloom behind the icon */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      width: 48,
                      height: 48,
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      background: isDark
                        ? "radial-gradient(circle, rgba(0,212,255,0.15) 0%, rgba(0,212,255,0.04) 50%, transparent 75%)"
                        : "radial-gradient(circle, rgba(8,145,178,0.12) 0%, rgba(8,145,178,0.03) 50%, transparent 75%)",
                      borderRadius: "50%",
                    }}
                  />
                  <Sparkles
                    size={14}
                    style={{
                      color: "var(--cyan)",
                      position: "relative",
                      zIndex: 1,
                      filter: isDark
                        ? "drop-shadow(0 0 4px rgba(0,212,255,0.6))"
                        : "drop-shadow(0 0 4px rgba(8,145,178,0.5))",
                    }}
                  />
                </div>
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      color: "var(--cyan)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    AI-Powered Insights
                  </p>
                  <p
                    className="text-[10px] mt-0.5"
                    style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    Key patterns and anomalies detected from the current data
                    view
                  </p>
                </div>
              </motion.div>

              {/* ── Insight cards grid ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, i) => (
                  <InsightCard
                    key={i}
                    insight={insight}
                    isDark={isDark}
                    index={i}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </NeuInsightContainer>
    </div>
  );
}

function InsightCard({
  insight,
  isDark,
  index,
}: {
  insight: Insight;
  isDark: boolean;
  index: number;
}) {
  const Icon: React.ElementType = ICON_MAP[insight.icon] || Zap;
  const accentColor = ACCENT_MAP[insight.accentColor];
  const bgColor = isDark
    ? ACCENT_BG_MAP[insight.accentColor].dark
    : ACCENT_BG_MAP[insight.accentColor].light;
  const borderColor = isDark
    ? ACCENT_BORDER_MAP[insight.accentColor].dark
    : ACCENT_BORDER_MAP[insight.accentColor].light;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.08 + 0.12,
        duration: 0.35,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="rounded-xl p-4 transition-colors relative"
      style={{
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
        boxShadow: isDark
          ? [
              // Outer shadow — card sits above the panel surface
              "4px 4px 12px rgba(0,0,0,0.35)",
              "-2px -2px 6px rgba(60,60,80,0.06)",
              // Inner top-left highlight — 3D bevel / light catch
              "inset 1px 1px 0 rgba(255,255,255,0.06)",
              // Inner bottom-right shadow — depth
              "inset -1px -1px 0 rgba(0,0,0,0.15)",
            ].join(", ")
          : [
              // Outer shadow — card sits above the panel surface
              "4px 4px 12px rgba(166,170,190,0.25)",
              "-2px -2px 6px rgba(255,255,255,0.7)",
              // Inner top-left highlight — 3D bevel / glossy light catch
              "inset 1px 1px 0 rgba(255,255,255,0.7)",
              // Inner bottom-right shadow — depth
              "inset -1px -1px 0 rgba(166,170,190,0.15)",
            ].join(", "),
      }}
    >
      {/* Top-left accent corner glow */}
      <div
        className="absolute top-0 left-0 w-8 h-8 rounded-tl-xl pointer-events-none"
        style={{
          background: `radial-gradient(circle at 0% 0%, ${accentColor}10 0%, transparent 70%)`,
        }}
      />

      <div className="flex items-start gap-3 relative">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
          style={{
            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            boxShadow: isDark
              ? [
                  "inset 2px 2px 4px rgba(0,0,0,0.4)",
                  "inset -1px -1px 2px rgba(255,255,255,0.04)",
                  "1px 1px 2px rgba(0,0,0,0.2)",
                ].join(", ")
              : [
                  "inset 2px 2px 4px rgba(0,0,0,0.07)",
                  "inset -1px -1px 2px rgba(255,255,255,0.7)",
                  "1px 1px 2px rgba(166,170,190,0.1)",
                ].join(", "),
            border: isDark
              ? "1px solid rgba(255,255,255,0.04)"
              : "1px solid rgba(0,0,0,0.04)",
          }}
        >
          {/* @ts-ignore — lucide-react icon typing */}
          <Icon size={15} style={{ color: accentColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[12.5px] font-semibold leading-snug mb-1.5"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: "var(--foreground)",
            }}
          >
            {insight.headline}
          </p>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: "var(--muted-foreground)" }}
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

export function InsightHeadline({
  headline,
  isAnalyzing,
  staticTitle,
  isDark,
}: InsightHeadlineProps) {
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
              fontFamily: "Space Grotesk, sans-serif",
              color: "var(--cyan)",
              fontWeight: 500,
            }}
          >
            {headline}
          </motion.p>
        )}
      </AnimatePresence>
      <div
        className="text-[11px] text-muted-foreground leading-relaxed"
        style={{ fontFamily: "Space Grotesk, sans-serif" }}
      >
        {staticTitle}
      </div>
    </div>
  );
}

export default InsightPanel;
