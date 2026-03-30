/**
 * CardInsight — Per-card insight with inline neumorphic rising container
 *
 * When the user clicks the lightbulb button in a card header, a new
 * NeuInsightContainer appears INSIDE the card body (below the header,
 * above the chart/content), pushing the content down. The container
 * uses the same mechanical-door animation as the tab-wide ANALYZE panel,
 * scaled down for the compact variant.
 *
 * The CardInsightToggle renders as an IconAction (Lightbulb, amber active)
 * for consistent Three-Zone architecture integration.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { NeuInsightContainer } from "./NeuInsightContainer";
import { IconAction } from "./ui/ChartControls";

export interface CardInsightItem {
  text: string;
  accent: "cyan" | "amber" | "emerald" | "coral";
}

interface CardInsightButtonProps {
  insights: CardInsightItem[];
  isDark: boolean;
  compact?: boolean;
}

const ACCENT_COLORS: Record<string, string> = {
  cyan: "var(--cyan)",
  amber: "var(--amber)",
  emerald: "var(--emerald)",
  coral: "var(--coral)",
};

/**
 * CardInsightToggle — The toggle button that goes in the card header.
 * Now renders as an IconAction (Lightbulb icon, amber active state)
 * for consistent Three-Zone architecture.
 *
 * Usage:
 *   const [showInsights, setShowInsights] = useState(false);
 *   // In header zone2Analysis: <CardInsightToggle isOpen={showInsights} onToggle={() => setShowInsights(v => !v)} isDark={isDark} />
 *   // In body:                 <CardInsightSection isOpen={showInsights} insights={...} isDark={isDark} />
 */
interface CardInsightToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  isDark: boolean;
  compact?: boolean;
}

export function CardInsightToggle({
  isOpen,
  onToggle,
  isDark,
  compact = false,
}: CardInsightToggleProps) {
  return (
    <IconAction
      icon={<Lightbulb size={compact ? 11 : 13} />}
      tooltip={isOpen ? "Hide Insights" : "AI Insights"}
      isActive={isOpen}
      onToggle={onToggle}
      isDark={isDark}
      activeColor="amber"
    />
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

export function CardInsightSection({
  isOpen,
  insights,
  isDark,
}: CardInsightSectionProps) {
  if (insights.length === 0) return null;

  return (
    <div className="px-3 pb-1 pt-1">
      <NeuInsightContainer
        isOpen={isOpen}
        isDark={isDark}
        variant="compact"
      >
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              key="card-insights"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-1.5"
            >
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
                      fontFamily: "Space Grotesk, sans-serif",
                      color: "var(--foreground)",
                    }}
                  >
                    {item.text}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </NeuInsightContainer>
    </div>
  );
}

/**
 * Legacy CardInsightButton — Self-contained button + floating popup.
 * DEPRECATED: Use CardInsightToggle + CardInsightSection instead.
 * Kept temporarily for backward compatibility during migration.
 */
export function CardInsightButton({
  insights,
  isDark,
  compact = false,
}: CardInsightButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (insights.length === 0) return null;

  return (
    <div>
      <CardInsightToggle
        isOpen={isOpen}
        onToggle={() => setIsOpen((v) => !v)}
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
export function CardInsightInline({
  insights,
  isDark,
  compact = false,
}: CardInsightButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (insights.length === 0) return null;

  return (
    <div>
      <CardInsightToggle
        isOpen={isOpen}
        onToggle={() => setIsOpen((v) => !v)}
        isDark={isDark}
        compact={compact}
      />
      <CardInsightSection isOpen={isOpen} insights={insights} isDark={isDark} />
    </div>
  );
}

export default CardInsightButton;
