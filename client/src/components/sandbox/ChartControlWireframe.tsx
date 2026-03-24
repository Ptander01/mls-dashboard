/**
 * ChartControlWireframe — Step 0 Sandbox (Revised)
 *
 * Option D: Hybrid layout based on user feedback.
 *
 * Architecture:
 *   Row 1 (top):  Title (left) + Zone 2 & Zone 3 pinned top-right
 *                 Zone 2 = AI Insights (Lightbulb), Trend overlay
 *                 Zone 3 = Methods (FlaskConical), Maximize
 *   Row 2:        Description text (full width)
 *   Row 3:        Zone 1 — Full-width distributed toolbar BELOW description,
 *                 closer to the chart. Toggle groups spread across card width
 *                 with icon-first approach + hover tooltips.
 *
 * Iconography System:
 *   Filter (Conference)    → Filter icon
 *   Symbology (Color)      → Palette icon
 *   Metric / Perspective   → Layers icon
 *   AI Insights            → Lightbulb icon
 *   Methods                → FlaskConical icon
 *   Maximize               → Maximize2 icon
 *   Trend overlay          → TrendingUp icon
 *   Toggle (Fill Rate)     → Percent / BarChart3 icon
 */

import { useState, type ReactNode } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  FlaskConical,
  Maximize2,
  Lightbulb,
  Palette,
  Filter,
  Layers,
  TrendingUp,
  Sun,
  Moon,
  BarChart3,
  Percent,
  Eye,
} from "lucide-react";

// ═══════════════════════════════════════════════════════
// SHARED PRIMITIVES
// ═══════════════════════════════════════════════════════

interface SegmentedControlOption<T> {
  value: T;
  label?: string;
  icon?: ReactNode;
}

/**
 * Icon-anchored segmented control with optional text labels.
 * The leading icon identifies the control group; individual
 * segment labels appear as text inside each pill.
 */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  isDark,
  groupIcon,
  groupTooltip,
}: {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (v: T) => void;
  isDark: boolean;
  groupIcon?: ReactNode;
  groupTooltip?: string;
}) {
  const control = (
    <div className="flex items-center gap-1.5">
      {/* Group icon anchor */}
      {groupIcon && (
        <div
          className="flex items-center justify-center"
          style={{
            color: "var(--muted-foreground)",
            opacity: 0.6,
          }}
        >
          {groupIcon}
        </div>
      )}
      {/* Segmented pills */}
      <div
        className="inline-flex rounded-lg p-[2px]"
        style={{
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
          boxShadow: isDark
            ? "inset 1px 1px 3px rgba(0,0,0,0.4), inset -1px -1px 2px rgba(60,60,80,0.06)"
            : "inset 1px 1px 3px rgba(0,0,0,0.06), inset -1px -1px 2px rgba(255,255,255,0.5)",
        }}
      >
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all flex items-center gap-1"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                background: isActive
                  ? isDark
                    ? "rgba(0, 212, 255, 0.12)"
                    : "rgba(8, 145, 178, 0.10)"
                  : "transparent",
                color: isActive
                  ? "var(--cyan)"
                  : "var(--muted-foreground)",
                boxShadow: isActive
                  ? isDark
                    ? "0 1px 3px rgba(0,0,0,0.3), 0 0 8px rgba(0,212,255,0.1)"
                    : "0 1px 3px rgba(0,0,0,0.08), 0 0 8px rgba(8,145,178,0.08)"
                  : "none",
              }}
            >
              {opt.icon}
              {opt.label && <span>{opt.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Wrap in tooltip if groupTooltip provided
  if (groupTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {control}
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            {groupTooltip}
          </span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return control;
}

/**
 * Icon-only action button with hover tooltip.
 * Used for Zone 2 (Analysis) and Zone 3 (Utility) actions.
 */
function IconAction({
  isActive,
  onToggle,
  isDark,
  icon,
  tooltip,
  activeColor = "cyan",
}: {
  isActive: boolean;
  onToggle: () => void;
  isDark: boolean;
  icon: ReactNode;
  tooltip: string;
  activeColor?: "cyan" | "amber";
}) {
  const colorVar = activeColor === "cyan" ? "var(--cyan)" : "var(--amber)";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex items-center justify-center rounded-lg transition-all"
          style={{
            width: "28px",
            height: "28px",
            background: isActive ? "var(--neu-bg-pressed)" : "transparent",
            color: isActive ? colorVar : "var(--muted-foreground)",
            boxShadow: isActive
              ? isDark
                ? "inset 1px 1px 3px rgba(0,0,0,0.4), inset -1px -1px 2px rgba(60,60,80,0.06)"
                : "inset 1px 1px 3px rgba(0,0,0,0.08), inset -1px -1px 2px rgba(255,255,255,0.4)"
              : "none",
          }}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          {tooltip}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Icon-only toggle for Zone 1 standalone actions (e.g., Fill Rate).
 * Shows icon + optional short label, with tooltip on hover.
 */
function ToggleAction({
  isActive,
  onToggle,
  isDark,
  icon,
  tooltip,
  label,
}: {
  isActive: boolean;
  onToggle: () => void;
  isDark: boolean;
  icon: ReactNode;
  tooltip: string;
  label?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex items-center gap-1.5 transition-all rounded-lg text-[10px] font-semibold uppercase tracking-wider"
          style={{
            padding: "4px 10px",
            fontFamily: "Space Grotesk, sans-serif",
            background: isActive ? "var(--neu-bg-pressed)" : "transparent",
            color: isActive ? "var(--cyan)" : "var(--muted-foreground)",
            boxShadow: isActive
              ? isDark
                ? "inset 1px 1px 3px rgba(0,0,0,0.4), inset -1px -1px 2px rgba(60,60,80,0.06)"
                : "inset 1px 1px 3px rgba(0,0,0,0.08), inset -1px -1px 2px rgba(255,255,255,0.4)"
              : "none",
          }}
        >
          {icon}
          {label && <span>{label}</span>}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          {tooltip}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/** Subtle vertical separator between Zone 2 and Zone 3 */
function ZoneSeparator({ isDark }: { isDark: boolean }) {
  return (
    <div
      className="self-stretch mx-0.5"
      style={{
        width: "1px",
        background: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════
// EXAMPLE CARD: SIMPLE (1 control group)
// e.g., BumpChart — only conference filter
// ═══════════════════════════════════════════════════════

function SimpleCard({ isDark }: { isDark: boolean }) {
  const [conference, setConference] = useState<"ALL" | "EAST" | "WEST">("ALL");
  const [showInsights, setShowInsights] = useState(false);
  const [methodsOpen, setMethodsOpen] = useState(false);

  return (
    <div className="neu-raised rounded-xl p-5">
      {/* Row 1: Title + Zone 2/3 top-right */}
      <div className="flex items-start justify-between gap-4 mb-1.5">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            Bump Chart — Season Rank Progression
          </h3>
          <p
            className="text-[10px] mt-0.5"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: "var(--muted-foreground)",
              opacity: 0.7,
            }}
          >
            Week-by-week standings movement
          </p>
        </div>

        {/* Zone 2 + Zone 3 pinned top-right */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <IconAction
            isActive={showInsights}
            onToggle={() => setShowInsights((v) => !v)}
            isDark={isDark}
            icon={<Lightbulb size={13} />}
            tooltip="AI Insights"
            activeColor="amber"
          />
          <ZoneSeparator isDark={isDark} />
          <IconAction
            isActive={methodsOpen}
            onToggle={() => setMethodsOpen((v) => !v)}
            isDark={isDark}
            icon={<FlaskConical size={13} />}
            tooltip="Methods & Methodology"
          />
          <IconAction
            isActive={false}
            onToggle={() => {}}
            isDark={isDark}
            icon={<Maximize2 size={13} />}
            tooltip="Expand to Full Screen"
          />
        </div>
      </div>

      {/* Row 2: Description */}
      <p
        className="text-[11px] leading-relaxed mb-3"
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          color: "var(--muted-foreground)",
        }}
      >
        How have MLS teams jockeyed for position throughout the season? This bump
        chart tracks each club's weekly standings rank, revealing momentum swings,
        late-season surges, and dramatic collapses.
      </p>

      {/* Row 3: Zone 1 — distributed toolbar below description */}
      <div
        className="flex items-center justify-start gap-2 mb-4 py-2 px-3 rounded-lg"
        style={{
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
        }}
      >
        <SegmentedControl
          options={[
            { value: "ALL" as const, label: "All" },
            { value: "EAST" as const, label: "East" },
            { value: "WEST" as const, label: "West" },
          ]}
          value={conference}
          onChange={setConference}
          isDark={isDark}
          groupIcon={<Filter size={12} />}
          groupTooltip="Filter by Conference"
        />
      </div>

      {/* Chart placeholder */}
      <div
        className="rounded-lg flex items-center justify-center"
        style={{
          height: "160px",
          background: isDark
            ? "rgba(255,255,255,0.02)"
            : "rgba(0,0,0,0.02)",
          border: `1px dashed ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        }}
      >
        <span
          className="text-[11px] uppercase tracking-widest"
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            color: "var(--muted-foreground)",
            opacity: 0.3,
          }}
        >
          Chart Visualization Area
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// EXAMPLE CARD: MEDIUM (2 control groups)
// e.g., Attendance — conference filter + fill rate toggle
// ═══════════════════════════════════════════════════════

function MediumCard({ isDark }: { isDark: boolean }) {
  const [conference, setConference] = useState<"ALL" | "EAST" | "WEST">("ALL");
  const [showFillRate, setShowFillRate] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [methodsOpen, setMethodsOpen] = useState(false);
  const [showTrend, setShowTrend] = useState(false);

  return (
    <div className="neu-raised rounded-xl p-5">
      {/* Row 1: Title + Zone 2/3 top-right */}
      <div className="flex items-start justify-between gap-4 mb-1.5">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            Home Attendance with Fill Rate
          </h3>
          <p
            className="text-[10px] mt-0.5"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: "var(--muted-foreground)",
              opacity: 0.7,
            }}
          >
            Stadium Fill Rate by Team — 2025 Season
          </p>
        </div>

        {/* Zone 2 + Zone 3 pinned top-right */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <IconAction
            isActive={showTrend}
            onToggle={() => setShowTrend((v) => !v)}
            isDark={isDark}
            icon={<TrendingUp size={13} />}
            tooltip="Show Trend Overlay"
          />
          <IconAction
            isActive={showInsights}
            onToggle={() => setShowInsights((v) => !v)}
            isDark={isDark}
            icon={<Lightbulb size={13} />}
            tooltip="AI Insights"
            activeColor="amber"
          />
          <ZoneSeparator isDark={isDark} />
          <IconAction
            isActive={methodsOpen}
            onToggle={() => setMethodsOpen((v) => !v)}
            isDark={isDark}
            icon={<FlaskConical size={13} />}
            tooltip="Methods & Methodology"
          />
          <IconAction
            isActive={false}
            onToggle={() => {}}
            isDark={isDark}
            icon={<Maximize2 size={13} />}
            tooltip="Expand to Full Screen"
          />
        </div>
      </div>

      {/* Row 2: Description */}
      <p
        className="text-[11px] leading-relaxed mb-3"
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          color: "var(--muted-foreground)",
        }}
      >
        Are MLS stadiums filling up? This chart compares each team's average home
        attendance against their stadium capacity, revealing which clubs
        consistently sell out and which have room to grow.
      </p>

      {/* Row 3: Zone 1 — distributed toolbar */}
      <div
        className="flex items-center justify-between gap-2 mb-4 py-2 px-3 rounded-lg"
        style={{
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
        }}
      >
        {/* Left: Conference filter */}
        <SegmentedControl
          options={[
            { value: "ALL" as const, label: "All" },
            { value: "EAST" as const, label: "East" },
            { value: "WEST" as const, label: "West" },
          ]}
          value={conference}
          onChange={setConference}
          isDark={isDark}
          groupIcon={<Filter size={12} />}
          groupTooltip="Filter by Conference"
        />

        {/* Right: Fill Rate toggle */}
        <ToggleAction
          isActive={showFillRate}
          onToggle={() => setShowFillRate((v) => !v)}
          isDark={isDark}
          icon={showFillRate ? <Percent size={11} /> : <BarChart3 size={11} />}
          tooltip={showFillRate ? "Switch to Absolute Attendance" : "Switch to Fill Rate %"}
          label={showFillRate ? "Fill %" : "Absolute"}
        />
      </div>

      {/* Chart placeholder */}
      <div
        className="rounded-lg flex items-center justify-center"
        style={{
          height: "160px",
          background: isDark
            ? "rgba(255,255,255,0.02)"
            : "rgba(0,0,0,0.02)",
          border: `1px dashed ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        }}
      >
        <span
          className="text-[11px] uppercase tracking-widest"
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            color: "var(--muted-foreground)",
            opacity: 0.3,
          }}
        >
          Chart Visualization Area
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// EXAMPLE CARD: COMPLEX (3 control groups)
// e.g., DumbbellChart — conference + symbology + metric
// ═══════════════════════════════════════════════════════

function ComplexCard({ isDark }: { isDark: boolean }) {
  const [conference, setConference] = useState<"ALL" | "EAST" | "WEST">("ALL");
  const [symbology, setSymbology] = useState<"HA" | "TEAM">("HA");
  const [mode, setMode] = useState<"PPG" | "WIN%" | "GD">("PPG");
  const [showInsights, setShowInsights] = useState(false);
  const [methodsOpen, setMethodsOpen] = useState(false);
  const [showTrend, setShowTrend] = useState(false);

  return (
    <div className="neu-raised rounded-xl p-5">
      {/* Row 1: Title + Zone 2/3 top-right */}
      <div className="flex items-start justify-between gap-4 mb-1.5">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            Dumbbell Chart — Home vs. Away Performance
          </h3>
          <p
            className="text-[10px] mt-0.5"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: "var(--muted-foreground)",
              opacity: 0.7,
            }}
          >
            Home vs. Away Performance Comparison
          </p>
        </div>

        {/* Zone 2 + Zone 3 pinned top-right */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <IconAction
            isActive={showTrend}
            onToggle={() => setShowTrend((v) => !v)}
            isDark={isDark}
            icon={<TrendingUp size={13} />}
            tooltip="Show League Average Overlay"
          />
          <IconAction
            isActive={showInsights}
            onToggle={() => setShowInsights((v) => !v)}
            isDark={isDark}
            icon={<Lightbulb size={13} />}
            tooltip="AI Insights"
            activeColor="amber"
          />
          <ZoneSeparator isDark={isDark} />
          <IconAction
            isActive={methodsOpen}
            onToggle={() => setMethodsOpen((v) => !v)}
            isDark={isDark}
            icon={<FlaskConical size={13} />}
            tooltip="Methods & Methodology"
          />
          <IconAction
            isActive={false}
            onToggle={() => {}}
            isDark={isDark}
            icon={<Maximize2 size={13} />}
            tooltip="Expand to Full Screen"
          />
        </div>
      </div>

      {/* Row 2: Description */}
      <p
        className="text-[11px] leading-relaxed mb-3"
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          color: "var(--muted-foreground)",
        }}
      >
        Which teams punch above their weight at home, and which crumble on the
        road? This dumbbell chart maps the gap between home and away points per
        game for every MLS club, colored by conference or team identity.
      </p>

      {/* Row 3: Zone 1 — distributed toolbar with 3 groups spread across width */}
      <div
        className="flex items-center justify-between gap-2 mb-4 py-2 px-3 rounded-lg"
        style={{
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
        }}
      >
        {/* Left: Conference filter */}
        <SegmentedControl
          options={[
            { value: "ALL" as const, label: "All" },
            { value: "EAST" as const, label: "East" },
            { value: "WEST" as const, label: "West" },
          ]}
          value={conference}
          onChange={setConference}
          isDark={isDark}
          groupIcon={<Filter size={12} />}
          groupTooltip="Filter by Conference"
        />

        {/* Center: Symbology */}
        <SegmentedControl
          options={[
            { value: "HA" as const, label: "H/A" },
            { value: "TEAM" as const, label: "Team" },
          ]}
          value={symbology}
          onChange={setSymbology}
          isDark={isDark}
          groupIcon={<Palette size={12} />}
          groupTooltip="Color Symbology"
        />

        {/* Right: Metric perspective */}
        <SegmentedControl
          options={[
            { value: "PPG" as const, label: "PPG" },
            { value: "WIN%" as const, label: "Win%" },
            { value: "GD" as const, label: "GD" },
          ]}
          value={mode}
          onChange={setMode}
          isDark={isDark}
          groupIcon={<Layers size={12} />}
          groupTooltip="Data Perspective"
        />
      </div>

      {/* Chart placeholder */}
      <div
        className="rounded-lg flex items-center justify-center"
        style={{
          height: "160px",
          background: isDark
            ? "rgba(255,255,255,0.02)"
            : "rgba(0,0,0,0.02)",
          border: `1px dashed ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        }}
      >
        <span
          className="text-[11px] uppercase tracking-widest"
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            color: "var(--muted-foreground)",
            opacity: 0.3,
          }}
        >
          Chart Visualization Area
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// EXAMPLE CARD: COMPLEX WITH 4 GROUPS
// e.g., Resilience Index — conference + symbology + metric + view mode
// ═══════════════════════════════════════════════════════

function MaxComplexCard({ isDark }: { isDark: boolean }) {
  const [conference, setConference] = useState<"ALL" | "EAST" | "WEST">("ALL");
  const [symbology, setSymbology] = useState<"HA" | "TEAM">("HA");
  const [mode, setMode] = useState<"PPG" | "WIN%" | "GD">("PPG");
  const [viewMode, setViewMode] = useState<"INDEX" | "COMPONENTS">("INDEX");
  const [showInsights, setShowInsights] = useState(false);
  const [methodsOpen, setMethodsOpen] = useState(false);

  return (
    <div className="neu-raised rounded-xl p-5">
      {/* Row 1: Title + Zone 2/3 top-right */}
      <div className="flex items-start justify-between gap-4 mb-1.5">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            Resilience Index Treemap
          </h3>
          <p
            className="text-[10px] mt-0.5"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: "var(--muted-foreground)",
              opacity: 0.7,
            }}
          >
            Composite Score — Comeback Rate, Late Goals, Road Form
          </p>
        </div>

        {/* Zone 2 + Zone 3 pinned top-right */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <IconAction
            isActive={showInsights}
            onToggle={() => setShowInsights((v) => !v)}
            isDark={isDark}
            icon={<Lightbulb size={13} />}
            tooltip="AI Insights"
            activeColor="amber"
          />
          <ZoneSeparator isDark={isDark} />
          <IconAction
            isActive={methodsOpen}
            onToggle={() => setMethodsOpen((v) => !v)}
            isDark={isDark}
            icon={<FlaskConical size={13} />}
            tooltip="Methods & Methodology"
          />
          <IconAction
            isActive={false}
            onToggle={() => {}}
            isDark={isDark}
            icon={<Maximize2 size={13} />}
            tooltip="Expand to Full Screen"
          />
        </div>
      </div>

      {/* Row 2: Description */}
      <p
        className="text-[11px] leading-relaxed mb-3"
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          color: "var(--muted-foreground)",
        }}
      >
        How resilient is each club when trailing? This treemap sizes each team by
        total away miles traveled and colors them by a composite resilience score
        incorporating comeback rate, late-goal frequency, and road form.
      </p>

      {/* Row 3: Zone 1 — 4 groups distributed across full width */}
      <div
        className="flex items-center justify-between gap-2 mb-4 py-2 px-3 rounded-lg flex-wrap"
        style={{
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
        }}
      >
        {/* Conference filter */}
        <SegmentedControl
          options={[
            { value: "ALL" as const, label: "All" },
            { value: "EAST" as const, label: "East" },
            { value: "WEST" as const, label: "West" },
          ]}
          value={conference}
          onChange={setConference}
          isDark={isDark}
          groupIcon={<Filter size={12} />}
          groupTooltip="Filter by Conference"
        />

        {/* Symbology */}
        <SegmentedControl
          options={[
            { value: "HA" as const, label: "H/A" },
            { value: "TEAM" as const, label: "Team" },
          ]}
          value={symbology}
          onChange={setSymbology}
          isDark={isDark}
          groupIcon={<Palette size={12} />}
          groupTooltip="Color Symbology"
        />

        {/* Metric */}
        <SegmentedControl
          options={[
            { value: "PPG" as const, label: "PPG" },
            { value: "WIN%" as const, label: "Win%" },
            { value: "GD" as const, label: "GD" },
          ]}
          value={mode}
          onChange={setMode}
          isDark={isDark}
          groupIcon={<Layers size={12} />}
          groupTooltip="Data Perspective"
        />

        {/* View mode */}
        <SegmentedControl
          options={[
            { value: "INDEX" as const, label: "Index" },
            { value: "COMPONENTS" as const, label: "Parts" },
          ]}
          value={viewMode}
          onChange={setViewMode}
          isDark={isDark}
          groupIcon={<Eye size={12} />}
          groupTooltip="View Mode"
        />
      </div>

      {/* Chart placeholder */}
      <div
        className="rounded-lg flex items-center justify-center"
        style={{
          height: "160px",
          background: isDark
            ? "rgba(255,255,255,0.02)"
            : "rgba(0,0,0,0.02)",
          border: `1px dashed ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        }}
      >
        <span
          className="text-[11px] uppercase tracking-widest"
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            color: "var(--muted-foreground)",
            opacity: 0.3,
          }}
        >
          Chart Visualization Area
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ICONOGRAPHY REFERENCE TABLE
// ═══════════════════════════════════════════════════════

function IconographyReference({ isDark }: { isDark: boolean }) {
  const iconMap = [
    {
      category: "Zone 1 — Data & View Controls",
      color: "var(--cyan)",
      items: [
        {
          icon: <Filter size={16} />,
          name: "Filter",
          usage: "Conference filter (All / East / West)",
          tooltip: "Filter by Conference",
        },
        {
          icon: <Palette size={16} />,
          name: "Palette",
          usage: "Color symbology (H/A vs Team, Position vs Team)",
          tooltip: "Color Symbology",
        },
        {
          icon: <Layers size={16} />,
          name: "Layers",
          usage: "Data metric / perspective (PPG, Win%, GD, Index vs Components)",
          tooltip: "Data Perspective",
        },
        {
          icon: <Eye size={16} />,
          name: "Eye",
          usage: "View mode toggle (Index vs Components, Focused vs Full Scale)",
          tooltip: "View Mode",
        },
        {
          icon: <Percent size={16} />,
          name: "Percent",
          usage: "Fill Rate toggle (active state)",
          tooltip: "Fill Rate %",
        },
        {
          icon: <BarChart3 size={16} />,
          name: "BarChart3",
          usage: "Absolute values toggle (inactive state of Fill Rate)",
          tooltip: "Absolute Values",
        },
      ],
    },
    {
      category: "Zone 2 — Analysis Actions",
      color: "var(--amber)",
      items: [
        {
          icon: <Lightbulb size={16} />,
          name: "Lightbulb",
          usage: "AI-generated insights panel toggle",
          tooltip: "AI Insights",
        },
        {
          icon: <TrendingUp size={16} />,
          name: "TrendingUp",
          usage: "Trendline / league average overlay",
          tooltip: "Show Trend Overlay",
        },
      ],
    },
    {
      category: "Zone 3 — Utility Actions",
      color: "var(--emerald)",
      items: [
        {
          icon: <FlaskConical size={16} />,
          name: "FlaskConical",
          usage: "Methods & methodology panel toggle",
          tooltip: "Methods & Methodology",
        },
        {
          icon: <Maximize2 size={16} />,
          name: "Maximize2",
          usage: "Expand chart to full-screen modal",
          tooltip: "Expand to Full Screen",
        },
      ],
    },
  ];

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: isDark
          ? "rgba(0, 212, 255, 0.04)"
          : "rgba(8, 145, 178, 0.04)",
        border: `1px solid ${isDark ? "rgba(0, 212, 255, 0.12)" : "rgba(8, 145, 178, 0.12)"}`,
      }}
    >
      <h2
        className="text-xs font-bold uppercase tracking-wider mb-4"
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          color: "var(--cyan)",
        }}
      >
        Iconography System — Icon Reference
      </h2>
      <p
        className="text-[11px] leading-relaxed mb-4"
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          color: "var(--muted-foreground)",
        }}
      >
        Every control uses an icon as its primary affordance. Text labels appear
        only on hover via tooltips. For Zone 1 segmented controls, the icon
        anchors the group and the individual segment labels (All/East/West, PPG/Win%/GD)
        remain as text inside the pills since they are short, scannable abbreviations.
      </p>

      {iconMap.map((zone) => (
        <div key={zone.category} className="mb-4 last:mb-0">
          <h3
            className="text-[10px] font-bold uppercase tracking-wider mb-2"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: zone.color,
            }}
          >
            {zone.category}
          </h3>
          <div className="overflow-x-auto">
            <table
              className="w-full text-[10px]"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                  }}
                >
                  <th className="text-left py-1.5 pr-3 font-semibold uppercase tracking-wider text-muted-foreground w-12">
                    Icon
                  </th>
                  <th className="text-left py-1.5 pr-3 font-semibold uppercase tracking-wider text-muted-foreground w-24">
                    Name
                  </th>
                  <th className="text-left py-1.5 pr-3 font-semibold uppercase tracking-wider text-muted-foreground">
                    Usage
                  </th>
                  <th className="text-left py-1.5 font-semibold uppercase tracking-wider text-muted-foreground">
                    Hover Tooltip
                  </th>
                </tr>
              </thead>
              <tbody>
                {zone.items.map((item) => (
                  <tr
                    key={item.name}
                    style={{
                      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
                    }}
                  >
                    <td className="py-1.5 pr-3" style={{ color: zone.color }}>
                      {item.icon}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-muted-foreground">
                      {item.name}
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground">
                      {item.usage}
                    </td>
                    <td className="py-1.5 text-muted-foreground italic">
                      "{item.tooltip}"
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN WIREFRAME PAGE
// ═══════════════════════════════════════════════════════

export default function ChartControlWireframe() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className="min-h-screen p-6 md:p-10"
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-xl font-bold mb-1"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              Chart Control Design System — Wireframe Sandbox
            </h1>
            <p
              className="text-xs text-muted-foreground"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              Option D: Hybrid Layout with Icon-First Controls — Sprint 13
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              background: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.06)",
              color: "var(--foreground)",
            }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            {isDark ? "Light Mode" : "Dark Mode"}
          </button>
        </div>

        {/* Architecture Overview */}
        <div
          className="rounded-xl p-5 mb-8"
          style={{
            background: isDark
              ? "rgba(0, 212, 255, 0.04)"
              : "rgba(8, 145, 178, 0.04)",
            border: `1px solid ${isDark ? "rgba(0, 212, 255, 0.12)" : "rgba(8, 145, 178, 0.12)"}`,
          }}
        >
          <h2
            className="text-xs font-bold uppercase tracking-wider mb-3"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: "var(--cyan)",
            }}
          >
            Option D — Hybrid Architecture
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  color: "var(--cyan)",
                }}
              >
                Row 1 — Title + Zone 2/3 (Top Right)
              </div>
              <p
                className="text-[10px] text-muted-foreground leading-relaxed"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                Title and subtitle on the left. AI Insights (Lightbulb),
                Trend overlay (TrendingUp), Methods (FlaskConical), and
                Maximize (Maximize2) pinned top-right as icon-only buttons
                with hover tooltips.
              </p>
            </div>
            <div>
              <div
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  color: "var(--amber)",
                }}
              >
                Row 2 — Description (Full Width)
              </div>
              <p
                className="text-[10px] text-muted-foreground leading-relaxed"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                Chart description/abstract spans the full card width without
                competing for space with any controls. Maximizes readability.
              </p>
            </div>
            <div>
              <div
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  color: "var(--emerald)",
                }}
              >
                Row 3 — Zone 1 Toolbar (Below Description)
              </div>
              <p
                className="text-[10px] text-muted-foreground leading-relaxed"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                Data controls sit in a full-width strip directly above the
                chart area. Toggle groups are spread across the card width
                with icon anchors. Each group has its own icon identifier
                with hover tooltip.
              </p>
            </div>
          </div>
        </div>

        {/* ─── ICONOGRAPHY REFERENCE ─── */}
        <div className="mb-10">
          <IconographyReference isDark={isDark} />
        </div>

        {/* ─── EXAMPLE 1: Simple (1 control group) ─── */}
        <div className="mb-10">
          <div className="flex items-baseline gap-3 mb-3">
            <span
              className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                background: isDark
                  ? "rgba(0, 212, 255, 0.12)"
                  : "rgba(8, 145, 178, 0.10)",
                color: "var(--cyan)",
              }}
            >
              Simple
            </span>
            <span
              className="text-xs font-semibold"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              1 Control Group — BumpChart
            </span>
          </div>
          <p
            className="text-[11px] text-muted-foreground mb-4 leading-relaxed max-w-3xl"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            Charts with a single Zone 1 control group. The toolbar strip is
            left-aligned since there is only one group to display. Zone 2/3
            icons remain compact in the top-right corner.
          </p>
          <SimpleCard isDark={isDark} />
        </div>

        {/* ─── EXAMPLE 2: Medium (2 control groups) ─── */}
        <div className="mb-10">
          <div className="flex items-baseline gap-3 mb-3">
            <span
              className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                background: isDark
                  ? "rgba(255, 179, 71, 0.12)"
                  : "rgba(217, 119, 6, 0.10)",
                color: "var(--amber)",
              }}
            >
              Medium
            </span>
            <span
              className="text-xs font-semibold"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              2 Control Groups — Attendance
            </span>
          </div>
          <p
            className="text-[11px] text-muted-foreground mb-4 leading-relaxed max-w-3xl"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            Charts with two Zone 1 control groups. The conference filter sits
            on the left and the Fill Rate toggle on the right, using
            justify-between to spread them across the toolbar width.
          </p>
          <MediumCard isDark={isDark} />
        </div>

        {/* ─── EXAMPLE 3: Complex (3 control groups) ─── */}
        <div className="mb-10">
          <div className="flex items-baseline gap-3 mb-3">
            <span
              className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                background: isDark
                  ? "rgba(0, 200, 151, 0.12)"
                  : "rgba(5, 150, 105, 0.10)",
                color: "var(--emerald)",
              }}
            >
              Complex
            </span>
            <span
              className="text-xs font-semibold"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              3 Control Groups — DumbbellChart
            </span>
          </div>
          <p
            className="text-[11px] text-muted-foreground mb-4 leading-relaxed max-w-3xl"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            Charts with three Zone 1 control groups. The filter, symbology,
            and metric controls are evenly distributed across the full card
            width using justify-between. Each group is anchored by its icon
            (Filter, Palette, Layers) with a hover tooltip explaining the
            control category.
          </p>
          <ComplexCard isDark={isDark} />
        </div>

        {/* ─── EXAMPLE 4: Max Complex (4 control groups) ─── */}
        <div className="mb-10">
          <div className="flex items-baseline gap-3 mb-3">
            <span
              className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                background: isDark
                  ? "rgba(255, 107, 107, 0.12)"
                  : "rgba(220, 38, 38, 0.10)",
                color: "var(--coral)",
              }}
            >
              Max Complex
            </span>
            <span
              className="text-xs font-semibold"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              4 Control Groups — ResilienceIndexChart
            </span>
          </div>
          <p
            className="text-[11px] text-muted-foreground mb-4 leading-relaxed max-w-3xl"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            Stress test: four Zone 1 control groups distributed across the
            toolbar. The flex-wrap property ensures graceful wrapping on
            narrower viewports. Each group maintains its icon anchor for
            quick identification.
          </p>
          <MaxComplexCard isDark={isDark} />
        </div>

        {/* ─── KEY DESIGN DECISIONS ─── */}
        <div
          className="rounded-xl p-5 mb-10"
          style={{
            background: isDark
              ? "rgba(0, 212, 255, 0.04)"
              : "rgba(8, 145, 178, 0.04)",
            border: `1px solid ${isDark ? "rgba(0, 212, 255, 0.12)" : "rgba(8, 145, 178, 0.12)"}`,
          }}
        >
          <h2
            className="text-xs font-bold uppercase tracking-wider mb-3"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: "var(--cyan)",
            }}
          >
            Key Design Decisions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  color: "var(--emerald)",
                }}
              >
                Icon-First Approach
              </h3>
              <p
                className="text-[10px] text-muted-foreground leading-relaxed"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                Zone 2/3 actions (Insights, Trend, Methods, Maximize) are
                icon-only with hover tooltips. Zone 1 segmented controls use
                an icon anchor for the group category, but keep short text
                labels (All/East/West, PPG/Win%/GD) inside the pills since
                they are abbreviations users need to scan quickly.
              </p>
            </div>
            <div>
              <h3
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  color: "var(--emerald)",
                }}
              >
                Distributed Spacing
              </h3>
              <p
                className="text-[10px] text-muted-foreground leading-relaxed"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                Zone 1 toggle groups use justify-between to spread across the
                full card width. This prevents clustering and gives each
                control group its own visual territory. On large displays,
                the breathing room scales naturally.
              </p>
            </div>
            <div>
              <h3
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  color: "var(--emerald)",
                }}
              >
                Controls Near the Chart
              </h3>
              <p
                className="text-[10px] text-muted-foreground leading-relaxed"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                Moving Zone 1 below the description places data controls
                directly adjacent to the visualization they affect. This
                reduces the cognitive distance between "what I'm toggling"
                and "what changes on screen."
              </p>
            </div>
            <div>
              <h3
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  color: "var(--emerald)",
                }}
              >
                Consistent Top-Right Cluster
              </h3>
              <p
                className="text-[10px] text-muted-foreground leading-relaxed"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                Zone 2 (Analysis) and Zone 3 (Utility) are always in the
                same position on every card — top-right corner. Users build
                muscle memory: "lightbulb for insights, flask for methods,
                expand icon to maximize" — always in the same spot.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p
            className="text-[10px] uppercase tracking-widest"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: "var(--muted-foreground)",
              opacity: 0.5,
            }}
          >
            Step 0 Wireframe (Revised) — Awaiting Approval Before Proceeding to Step 1
          </p>
        </div>
      </div>
    </div>
  );
}
