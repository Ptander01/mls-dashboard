/**
 * ChartHeader — Three-Zone chart header architecture (Option D)
 *
 * Every chart card in the dashboard uses this component for its header.
 * Three rows:
 *   Row 1: Title + Subtitle (Left) AND Zone 2/3 Actions (Top Right, pinned)
 *   Row 2: Description (Full width, below title)
 *   Row 3: Zone 1 Toolbar (Full width, below description, containing data controls)
 *
 * The Methods section uses a neumorphic pressed/inset style when expanded,
 * with a smooth height animation via framer-motion.
 *
 * Props:
 *   title         — chart title (ReactNode)
 *   subtitle      — optional subtitle (ReactNode)
 *   description   — conversational hook (ReactNode)
 *   methods       — academic detail (ReactNode, collapsed by default)
 *   zone1Toolbar  — distributed flex row of data controls (Zone 1)
 *   zone2Analysis — trend toggle, insights toggle, etc. (Zone 2)
 *   zone3Utility  — maximize button, etc. (Zone 3)
 *   rightAction   — DEPRECATED: kept for backward compatibility during migration
 */

import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { IconAction, ZoneSeparator } from "@/components/ui/ChartControls";

export interface ChartHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  methods?: ReactNode;

  // Three-Zone props
  zone1Toolbar?: ReactNode;
  zone2Analysis?: ReactNode;
  zone3Utility?: ReactNode;

  // DEPRECATED — backward compatibility during migration
  rightAction?: ReactNode;
}

export function ChartHeader({
  title,
  subtitle,
  description,
  methods,
  zone1Toolbar,
  zone2Analysis,
  zone3Utility,
  rightAction,
}: ChartHeaderProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [methodsOpen, setMethodsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Determine if we're using the new zone system
  const isNewLayout = !!(zone1Toolbar || zone2Analysis || zone3Utility);

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
    ? "inset 3px 3px 8px rgba(0,0,0,0.5), inset -3px -3px 8px rgba(60,60,80,0.08)"
    : "inset 3px 3px 8px rgba(166,170,190,0.35), inset -3px -3px 8px rgba(255,255,255,0.6)";

  const insetBg = isDark ? "#141422" : "#d8d8e2";

  const insetBorder = isDark
    ? "1px solid rgba(255,255,255,0.03)"
    : "1px solid rgba(0,0,0,0.04)";

  // Check if Zone 2/3 cluster has any content
  const hasZone2or3 = !!(zone2Analysis || zone3Utility || methods);

  return (
    <div className="mb-4">
      {/* Row 1: Title + Zone 2/3 (or legacy rightAction) */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              className="text-[10px] text-muted-foreground mt-0.5"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Zone 2/3 Cluster (new layout) */}
        {isNewLayout ? (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Zone 2: Analysis actions */}
            {zone2Analysis}

            {/* Separator between Zone 2 and Zone 3 */}
            {(zone2Analysis || false) && (methods || zone3Utility) && (
              <ZoneSeparator isDark={isDark} />
            )}

            {/* Methods Button (Zone 3, first item) */}
            {methods && (
              <IconAction
                icon={<FlaskConical size={13} />}
                tooltip="Methods & Methodology"
                isActive={methodsOpen}
                onToggle={() => setMethodsOpen(!methodsOpen)}
                isDark={isDark}
                activeColor="emerald"
              />
            )}

            {/* Zone 3: Utility actions */}
            {zone3Utility}
          </div>
        ) : (
          /* Legacy layout — backward compatibility */
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Methods toggle button (legacy style) */}
            {methods && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMethodsOpen((v) => !v);
                }}
                className="flex items-center gap-1 transition-all rounded-md cursor-pointer select-none"
                style={{
                  padding: "3px 8px",
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  background: methodsOpen
                    ? "var(--neu-bg-pressed)"
                    : "transparent",
                  color: methodsOpen
                    ? "var(--cyan)"
                    : "var(--muted-foreground)",
                  boxShadow: methodsOpen
                    ? isDark
                      ? "inset 1px 1px 3px rgba(0,0,0,0.4), inset -1px -1px 2px rgba(60,60,80,0.06)"
                      : "inset 1px 1px 3px rgba(0,0,0,0.08), inset -1px -1px 2px rgba(255,255,255,0.4)"
                    : "none",
                }}
                title={
                  methodsOpen ? "Hide methods" : "Show methodology details"
                }
              >
                <FlaskConical size={11} />
                <span>Methods</span>
              </button>
            )}

            {/* Right action slot (legacy) */}
            {rightAction}
          </div>
        )}
      </div>

      {/* Row 2: Description — full-width conversational text */}
      {description && (
        <div
          className="text-[11px] text-muted-foreground leading-relaxed"
          style={{ fontFamily: "Space Grotesk, sans-serif" }}
        >
          {description}
        </div>
      )}

      {/* Row 3: Zone 1 Toolbar — full-width data controls below description */}
      {zone1Toolbar && (
        <div
          className="flex items-center justify-between gap-2 mt-3 mb-2 py-2 px-3 rounded-lg flex-wrap"
          style={{
            background: isDark
              ? "rgba(255,255,255,0.02)"
              : "rgba(0,0,0,0.015)",
            borderTop: `1px solid ${
              isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"
            }`,
            borderBottom: `1px solid ${
              isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"
            }`,
          }}
        >
          {zone1Toolbar}
        </div>
      )}

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
            opacity: {
              duration: methodsOpen ? 0.35 : 0.15,
              delay: methodsOpen ? 0.1 : 0,
            },
          }}
          className="overflow-hidden rounded-lg"
          style={{
            boxShadow: methodsOpen ? insetShadow : "none",
            background: methodsOpen ? insetBg : "transparent",
            border: methodsOpen ? insetBorder : "1px solid transparent",
          }}
        >
          <div ref={contentRef} className="px-3 py-2.5">
            <AnimatePresence mode="wait">
              {methodsOpen && (
                <motion.div
                  key="methods-content"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                  className="text-[10px] leading-relaxed text-muted-foreground/80"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
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
