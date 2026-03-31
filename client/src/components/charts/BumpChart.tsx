/**
 * BumpChart.tsx — Season Rank Flow Visualization (Session 2)
 *
 * Custom SVG bump chart showing team ranking lines across matchweeks.
 * Uses monotone cubic interpolation (Fritsch-Carlson) for smooth curves.
 *
 * Refactored for multi-season support: reads active season data from
 * FilterContext and dynamically adjusts WEEK_PRESETS and maxWeek.
 */

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  memo,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Eye, EyeOff, Sparkles, Filter } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useFilters } from "@/contexts/FilterContext";
import { TEAMS, getTeam } from "@/lib/mlsData";
import {
  computeWeeklyStandings,
  getTeamTrajectory,
  getTeamEvents,
  detectInflectionEvents,
  getMaxWeek,
  type TeamWeekStanding,
  type SeasonEvent,
  type EventType,
} from "@/lib/seasonPulse";
import { mutedTeamColor, hexToRgba, lighten, darken } from "@/lib/chartUtils";
import { EVENT_CATEGORIES } from "@/components/charts/SeasonTimeline";
import { ChartHeader } from "@/components/ui/ChartHeader";
import { IconAction } from "@/components/ui/ChartControls";
import {
  CardInsightToggle,
  CardInsightSection,
} from "@/components/CardInsight";
import { bumpChartCardInsights } from "@/lib/insightEngine";
import { getWeekStandings, getTeamWeeklyResults, type WeekMatchResult } from "@/lib/seasonPulse";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface BumpChartProps {
  selectedTeam: string | null;
  onSelectTeam: (teamId: string | null) => void;
  hoveredTeam: string | null;
  onHoverTeam: (teamId: string | null) => void;
  conferenceFilter: "ALL" | "EASTERN" | "WESTERN";
  rankMode: "POWER" | "POINTS";
  selectedWeek: number;
  onSelectWeek: (week: number) => void;
  activeFilters: Set<string>;
  onToggleFilter: (catId: string) => void;
}

type WeekPreset = "full" | "first" | "second" | "last10";

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════

const SVG_WIDTH = 1200;
const SVG_HEIGHT = 700;
const MARGIN = { top: 30, right: 120, bottom: 40, left: 45 };
const CHART_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
const CHART_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

const TIER_BAND_COLORS = {
  "Title Contenders": { dark: "rgba(0, 212, 255, 0.04)", light: "rgba(8, 145, 178, 0.035)" },
  Playoff: { dark: "rgba(16, 185, 129, 0.035)", light: "rgba(16, 185, 129, 0.03)" },
  Bubble: { dark: "rgba(245, 158, 11, 0.035)", light: "rgba(245, 158, 11, 0.03)" },
  Rebuilding: { dark: "rgba(239, 68, 68, 0.03)", light: "rgba(239, 68, 68, 0.025)" },
};

const EVENT_COLORS: Record<string, string> = {
  winning_streak: "#10b981",
  losing_streak: "#ef4444",
  unbeaten_run: "#10b981",
  winless_run: "#ef4444",
  rank_surge: "#10b981",
  rank_collapse: "#ef4444",
  upset_win: "#f59e0b",
  upset_loss: "#f59e0b",
  milestone: "#06b6d4",
};

/**
 * Generate dynamic WEEK_PRESETS based on the current season's maxWeek.
 */
function buildWeekPresets(maxWeek: number): { key: WeekPreset; label: string; range: [number, number] }[] {
  if (maxWeek <= 10) {
    // Short season (early 2026): just Full and Last 5
    return [
      { key: "full", label: "Full", range: [1, maxWeek] },
      { key: "last10", label: `Last ${Math.min(5, maxWeek)}`, range: [Math.max(1, maxWeek - 4), maxWeek] },
    ];
  }

  const half = Math.ceil(maxWeek / 2);
  return [
    { key: "full", label: "Full", range: [1, maxWeek] },
    { key: "first", label: "1st Half", range: [1, half] },
    { key: "second", label: "2nd Half", range: [half + 1, maxWeek] },
    { key: "last10", label: "Last 10", range: [Math.max(1, maxWeek - 9), maxWeek] },
  ];
}

// ═══════════════════════════════════════════
// LINE GENERATOR (monotone cubic interpolation)
// ═══════════════════════════════════════════

interface Point {
  x: number;
  y: number;
}

/**
 * Generate a smooth SVG path string using monotone cubic interpolation.
 * Implements the Fritsch-Carlson method for monotone piecewise cubic Hermite interpolation.
 */
function monotoneCubicPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`;
  }

  const n = points.length;

  // Compute slopes of secant lines
  const deltas: number[] = [];
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    deltas.push(dx);
    slopes.push(dx === 0 ? 0 : dy / dx);
  }

  // Compute tangent slopes using Fritsch-Carlson method
  const tangents: number[] = new Array(n);

  // Endpoint tangents
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];

  // Interior tangents
  for (let i = 1; i < n - 1; i++) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      tangents[i] = 0;
    } else {
      tangents[i] = (slopes[i - 1] + slopes[i]) / 2;
    }
  }

  // Fritsch-Carlson monotonicity correction
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(slopes[i]) < 1e-10) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const alpha = tangents[i] / slopes[i];
      const beta = tangents[i + 1] / slopes[i];
      const s = alpha * alpha + beta * beta;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        tangents[i] = tau * alpha * slopes[i];
        tangents[i + 1] = tau * beta * slopes[i];
      }
    }
  }

  // Build SVG path
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = deltas[i];
    const cp1x = points[i].x + dx / 3;
    const cp1y = points[i].y + (tangents[i] * dx) / 3;
    const cp2x = points[i + 1].x - dx / 3;
    const cp2y = points[i + 1].y - (tangents[i + 1] * dx) / 3;
    d += `C${cp1x},${cp1y},${cp2x},${cp2y},${points[i + 1].x},${points[i + 1].y}`;
  }

  return d;
}

// ═══════════════════════════════════════════
// TEAM LINE COMPONENT (memoized for performance)
// ═══════════════════════════════════════════

interface TeamLineProps {
  teamId: string;
  pathD: string;
  opacity: number;
  strokeWidth: number;
  color: string;
  isHighlighted: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

const TeamLine = memo(function TeamLine({
  teamId,
  pathD,
  opacity,
  strokeWidth,
  color,
  isHighlighted,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: TeamLineProps) {
  if (isHighlighted) {
    // 3D tube effect: shadow layer + base layer + specular highlight layer
    const shadowColor = darken(color, 0.5);
    const highlightColor = lighten(color, 0.5);
    return (
      <g
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        style={{ cursor: "pointer" }}
        data-team={teamId}
      >
        {/* Cast shadow (offset down-right) */}
        <path
          d={pathD}
          fill="none"
          stroke={shadowColor}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            opacity: opacity * 0.35,
            transition: "opacity 0.25s ease, stroke-width 0.25s ease",
            pointerEvents: "none",
          }}
          transform="translate(1.5, 2.5)"
        />
        {/* Base color path */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 1}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            opacity,
            transition: "opacity 0.25s ease, stroke-width 0.25s ease, stroke 0.25s ease",
            pointerEvents: "stroke",
            filter: `drop-shadow(0 0 4px ${hexToRgba(color, 0.4)})`,
          }}
        />
        {/* Specular highlight (offset up-left, thinner, lighter) */}
        <path
          d={pathD}
          fill="none"
          stroke={highlightColor}
          strokeWidth={Math.max(1, strokeWidth - 1)}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            opacity: opacity * 0.6,
            transition: "opacity 0.25s ease, stroke-width 0.25s ease",
            pointerEvents: "none",
          }}
          transform="translate(-0.5, -0.8)"
        />
      </g>
    );
  }

  return (
    <path
      d={pathD}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        opacity,
        transition: "opacity 0.25s ease, stroke-width 0.25s ease, stroke 0.25s ease",
        cursor: "pointer",
        pointerEvents: "stroke",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      data-team={teamId}
    />
  );
});

// ═══════════════════════════════════════════
// DESATURATION HELPER
// ═══════════════════════════════════════════

/**
 * Convert a hex color to a desaturated monochrome version.
 * Computes luminance and returns a grey hex.
 */
function desaturate(hex: string, amount: number = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Perceptual luminance
  const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const nr = Math.round(r + (lum - r) * amount);
  const ng = Math.round(g + (lum - g) * amount);
  const nb = Math.round(b + (lum - b) * amount);
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

// ═══════════════════════════════════════════
// EVENT SEGMENT LINE COMPONENT
// ═══════════════════════════════════════════

/**
 * Renders a team line with selective 3D breach effect on event segments.
 * The full path is rendered as a flat 2D line, then 3D tube segments are
 * overlaid only on the week ranges surrounding filtered events.
 */
interface EventSegmentLineProps {
  teamId: string;
  /** Full path string for the entire team line */
  fullPathD: string;
  /** Array of sub-path strings for segments that should get 3D treatment */
  segmentPaths: string[];
  opacity: number;
  strokeWidth: number;
  color: string;
  /** Ghost styling for the flat base path (non-3D segments) */
  ghostColor: string;
  ghostOpacity: number;
  ghostStrokeWidth: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

const EventSegmentLine = memo(function EventSegmentLine({
  teamId,
  fullPathD,
  segmentPaths,
  opacity,
  strokeWidth,
  color,
  ghostColor,
  ghostOpacity,
  ghostStrokeWidth,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: EventSegmentLineProps) {
  const shadowColor = darken(color, 0.5);
  const highlightColor = lighten(color, 0.5);

  return (
    <g
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={{ cursor: "pointer" }}
      data-team={teamId}
    >
      {/* Base flat 2D line for the entire path — ghosted to push focus onto 3D segments */}
      <path
        d={fullPathD}
        fill="none"
        stroke={ghostColor}
        strokeWidth={ghostStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          opacity: ghostOpacity,
          transition: "opacity 0.25s ease, stroke-width 0.25s ease, stroke 0.25s ease",
          pointerEvents: "stroke",
        }}
      />

      {/* 3D breach segments overlaid on event weeks */}
      {segmentPaths.map((segD, i) => (
        <g key={`seg-${teamId}-${i}`}>
          {/* Cast shadow (offset down-right) */}
          <path
            d={segD}
            fill="none"
            stroke={shadowColor}
            strokeWidth={strokeWidth + 4}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              opacity: opacity * 0.35,
              transition: "opacity 0.25s ease",
              pointerEvents: "none",
            }}
            transform="translate(1.5, 2.5)"
          />
          {/* Base color path (thicker) */}
          <path
            d={segD}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth + 1}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              opacity,
              transition: "opacity 0.25s ease",
              pointerEvents: "none",
              filter: `drop-shadow(0 0 4px ${hexToRgba(color, 0.4)})`,
            }}
          />
          {/* Specular highlight (offset up-left) */}
          <path
            d={segD}
            fill="none"
            stroke={highlightColor}
            strokeWidth={Math.max(1, strokeWidth - 1)}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              opacity: opacity * 0.6,
              transition: "opacity 0.25s ease",
              pointerEvents: "none",
            }}
            transform="translate(-0.5, -0.8)"
          />
        </g>
      ))}
    </g>
  );
});

// ═══════════════════════════════════════════
// INFLECTION MARKER COMPONENT
// ═══════════════════════════════════════════

interface InflectionMarkerProps {
  event: SeasonEvent;
  cx: number;
  cy: number;
  isDark: boolean;
  onHover: (event: SeasonEvent | null) => void;
}

function InflectionMarker({ event, cx, cy, isDark, onHover }: InflectionMarkerProps) {
  const color = EVENT_COLORS[event.type] || "#06b6d4";
  const radius = 2 + event.severity * 1;

  return (
    <g
      onMouseEnter={() => onHover(event)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
      }}
      style={{ cursor: "pointer" }}
    >
      {/* Glow ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius + 2}
        fill="none"
        stroke={color}
        strokeWidth={1}
        opacity={0.3}
      />
      {/* Main marker */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={color}
        stroke={isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.8)"}
        strokeWidth={1}
        style={{
          filter: `drop-shadow(0 0 3px ${hexToRgba(color, 0.5)})`,
        }}
      />
    </g>
  );
}

// ═══════════════════════════════════════════
// EVENT TOOLTIP COMPONENT
// ═══════════════════════════════════════════

function EventTooltip({
  event,
  x,
  y,
  isDark,
}: {
  event: SeasonEvent;
  x: number;
  y: number;
  isDark: boolean;
}) {
  const color = EVENT_COLORS[event.type] || "#06b6d4";
  const tooltipWidth = 220;
  const tooltipX = Math.max(tooltipWidth / 2 + 10, Math.min(x, SVG_WIDTH - tooltipWidth / 2 - 10));
  const tooltipY = Math.max(20, y - 80);

  return (
    <foreignObject
      x={tooltipX - tooltipWidth / 2}
      y={tooltipY}
      width={tooltipWidth}
      height={120}
      style={{ overflow: "visible", pointerEvents: "none" }}
    >
      <div
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(var(--glass-blur)) saturate(1.4)",
          WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(1.4)",
          border: `1px solid ${hexToRgba(color, 0.25)}`,
          borderRadius: 8,
          boxShadow: "var(--glass-shadow), var(--glass-highlight)",
          color: "var(--glass-text)",
          padding: "8px 12px",
          maxWidth: tooltipWidth,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "Space Grotesk, sans-serif",
            color,
            marginBottom: 4,
          }}
        >
          {event.title}
        </div>
        <div
          style={{
            fontSize: 10,
            fontFamily: "Space Grotesk, sans-serif",
            color: "var(--glass-text-muted)",
            lineHeight: 1.4,
            wordWrap: "break-word" as const,
          }}
        >
          {event.description}
        </div>
      </div>
    </foreignObject>
  );
}

// ═══════════════════════════════════════════
// WEEK WINDOW CONTROLS
// ═══════════════════════════════════════════

function WeekWindowControls({
  weekRange,
  setWeekRange,
  activePreset,
  setActivePreset,
  isPlaying,
  togglePlay,
  maxWeek,
  isDark,
  weekPresets,
}: {
  weekRange: [number, number];
  setWeekRange: (range: [number, number]) => void;
  activePreset: WeekPreset | null;
  setActivePreset: (preset: WeekPreset | null) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  maxWeek: number;
  isDark: boolean;
  weekPresets: { key: WeekPreset; label: string; range: [number, number] }[];
}) {
  const handleStartChange = (val: number) => {
    const clamped = Math.max(1, Math.min(val, weekRange[1] - 1));
    setWeekRange([clamped, weekRange[1]]);
    setActivePreset(null);
  };

  const handleEndChange = (val: number) => {
    const clamped = Math.min(maxWeek, Math.max(val, weekRange[0] + 1));
    setWeekRange([weekRange[0], clamped]);
    setActivePreset(null);
  };

  return (
    <div className="mt-3 space-y-2">
      {/* Range slider row */}
      <div className="flex items-center gap-3">
        <span
          className="text-[10px] font-mono text-muted-foreground w-8 text-right"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          W{weekRange[0]}
        </span>
        <div className="flex-1 relative h-6 flex items-center">
          {/* Track background */}
          <div
            className="absolute inset-x-0 h-1 rounded-full"
            style={{
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              boxShadow: isDark
                ? "inset 1px 1px 2px rgba(0,0,0,0.3)"
                : "inset 1px 1px 2px rgba(0,0,0,0.06)",
            }}
          />
          {/* Active range highlight */}
          <div
            className="absolute h-1 rounded-full"
            style={{
              left: `${((weekRange[0] - 1) / Math.max(maxWeek - 1, 1)) * 100}%`,
              right: `${100 - ((weekRange[1] - 1) / Math.max(maxWeek - 1, 1)) * 100}%`,
              background: "var(--cyan)",
              opacity: 0.4,
            }}
          />
          {/* Start handle */}
          <input
            type="range"
            min={1}
            max={maxWeek}
            value={weekRange[0]}
            onChange={(e) => handleStartChange(Number(e.target.value))}
            className="absolute inset-x-0 h-1 appearance-none bg-transparent cursor-pointer"
            style={{ zIndex: 2, accentColor: "var(--cyan)" }}
          />
          {/* End handle */}
          <input
            type="range"
            min={1}
            max={maxWeek}
            value={weekRange[1]}
            onChange={(e) => handleEndChange(Number(e.target.value))}
            className="absolute inset-x-0 h-1 appearance-none bg-transparent cursor-pointer"
            style={{ zIndex: 3, accentColor: "var(--cyan)" }}
          />
        </div>
        <span
          className="text-[10px] font-mono text-muted-foreground w-8"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          W{weekRange[1]}
        </span>
      </div>

      {/* Preset buttons + play/pause */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {weekPresets.map((preset) => (
            <button
              key={preset.key}
              onClick={() => {
                setWeekRange(preset.range);
                setActivePreset(preset.key);
              }}
              className="px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider transition-all"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                background:
                  activePreset === preset.key
                    ? isDark
                      ? "rgba(0, 212, 255, 0.12)"
                      : "rgba(8, 145, 178, 0.10)"
                    : isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.04)",
                color:
                  activePreset === preset.key
                    ? "var(--cyan)"
                    : "var(--muted-foreground)",
                boxShadow:
                  activePreset === preset.key
                    ? isDark
                      ? "0 1px 3px rgba(0,0,0,0.3), 0 0 8px rgba(0,212,255,0.1)"
                      : "0 1px 3px rgba(0,0,0,0.08), 0 0 8px rgba(8,145,178,0.08)"
                    : "none",
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          onClick={togglePlay}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wider transition-all"
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            background: isPlaying
              ? isDark
                ? "rgba(0, 212, 255, 0.15)"
                : "rgba(8, 145, 178, 0.12)"
              : isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.04)",
            color: isPlaying ? "var(--cyan)" : "var(--muted-foreground)",
            boxShadow: isPlaying
              ? isDark
                ? "0 1px 3px rgba(0,0,0,0.3), 0 0 8px rgba(0,212,255,0.15)"
                : "0 1px 3px rgba(0,0,0,0.08), 0 0 8px rgba(8,145,178,0.1)"
              : "none",
          }}
        >
          {isPlaying ? <Pause size={10} /> : <Play size={10} />}
          <span>{isPlaying ? "Pause" : "Play"}</span>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN BUMP CHART COMPONENT
// ═══════════════════════════════════════════

export default function BumpChart({
  selectedTeam,
  onSelectTeam,
  hoveredTeam,
  onHoverTeam,
  conferenceFilter,
  rankMode,
  selectedWeek,
  onSelectWeek,
  activeFilters,
  onToggleFilter,
}: BumpChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { activeSeasonData } = useFilters();

  // Extract season-specific data
  const { matches, totalWeeks, seasonYear, teams } = activeSeasonData;
  const maxWeek = getMaxWeek(totalWeeks);

  // Dynamic week presets
  const weekPresets = useMemo(() => buildWeekPresets(maxWeek), [maxWeek]);

  // Week window state
  const [weekRange, setWeekRange] = useState<[number, number]>([1, maxWeek]);
  const [activePreset, setActivePreset] = useState<WeekPreset | null>("full");
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tooltip state for inflection markers
  const [tooltipEvent, setTooltipEvent] = useState<SeasonEvent | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Match result tooltip state
  const [matchTooltip, setMatchTooltip] = useState<{
    teamId: string;
    week: number;
    result: WeekMatchResult;
    x: number;
    y: number;
  } | null>(null);

  // Weekly match results for hovered/selected team
  const activeTeamForResults = hoveredTeam || selectedTeam;
  const activeTeamResults = useMemo(() => {
    if (!activeTeamForResults) return null;
    return getTeamWeeklyResults(activeTeamForResults, teams, matches, totalWeeks);
  }, [activeTeamForResults, teams, matches, totalWeeks]);

  // View mode: "focus" (default), "colors" (all team colors), "allFocus" (all 3D highlighted)
  type ViewMode = "focus" | "colors" | "allFocus";
  const [viewMode, setViewMode] = useState<ViewMode>("allFocus");
  const cycleViewMode = useCallback(() => {
    setViewMode((prev) => {
      if (prev === "focus") return "colors";
      if (prev === "colors") return "allFocus";
      return "focus";
    });
  }, []);

  // Reset week range when season changes
  useEffect(() => {
    setWeekRange([1, maxWeek]);
    setActivePreset("full");
    setIsPlaying(false);
  }, [maxWeek]);

  // ─── Filter teams by conference ───
  const visibleTeams = useMemo(() => {
    if (conferenceFilter === "ALL") return TEAMS;
    const conf = conferenceFilter === "EASTERN" ? "Eastern" : "Western";
    return TEAMS.filter((t) => t.conference === conf);
  }, [conferenceFilter]);

  const visibleTeamIds = useMemo(() => new Set(visibleTeams.map((t) => t.id)), [visibleTeams]);

  // ─── Compute all trajectories (season-aware, conference-relative ranks) ───
  const allTrajectories = useMemo(() => {
    // First, get global trajectories for all teams
    const globalTrajectories = new Map<string, { week: number; rank: number; score: number }[]>();
    for (const team of TEAMS) {
      const trajectory = getTeamTrajectory(team.id, teams, matches, totalWeeks);
      const mapped = trajectory
        .filter((s) => s != null)
        .map((s) => ({
          week: s.week,
          rank: rankMode === "POWER" ? s.powerRank : s.pointsRank,
          score: rankMode === "POWER" ? s.powerScore : s.points,
        }));
      globalTrajectories.set(team.id, mapped);
    }

    // If showing all teams, use global ranks directly
    if (conferenceFilter === "ALL") {
      const map = new Map<string, { week: number; rank: number }[]>();
      for (const [id, traj] of Array.from(globalTrajectories.entries())) {
        map.set(id, traj.map((d: { week: number; rank: number; score: number }) => ({ week: d.week, rank: d.rank })));
      }
      return map;
    }

    // For conference filter: re-rank within the filtered set
    const filteredIds = new Set(visibleTeams.map((t) => t.id));
    const map = new Map<string, { week: number; rank: number }[]>();

    // Determine the max week present in the data
    const allWeeks = new Set<number>();
    for (const [id, traj] of Array.from(globalTrajectories.entries())) {
      if (filteredIds.has(id)) {
        for (const d of traj) allWeeks.add(d.week);
      }
    }

    // For each week, sort the filtered teams by their score and assign conference-relative ranks
    for (const week of Array.from(allWeeks)) {
      const weekEntries: { id: string; score: number }[] = [];
      for (const [id, traj] of Array.from(globalTrajectories.entries())) {
        if (!filteredIds.has(id)) continue;
        const weekData = traj.find((d) => d.week === week);
        if (weekData) weekEntries.push({ id, score: weekData.score });
      }
      // Sort descending by score (higher = better rank)
      weekEntries.sort((a, b) => b.score - a.score);
      weekEntries.forEach((entry, idx) => {
        if (!map.has(entry.id)) map.set(entry.id, []);
        map.get(entry.id)!.push({ week, rank: idx + 1 });
      });
    }

    // Sort each team's trajectory by week
    for (const [, traj] of Array.from(map.entries())) {
      traj.sort((a: { week: number; rank: number }, b: { week: number; rank: number }) => a.week - b.week);
    }

    return map;
  }, [rankMode, teams, matches, totalWeeks, conferenceFilter, visibleTeams]);

  // ─── Compute visible week range data ───
  const [startWeek, endWeek] = weekRange;
  const visibleWeekCount = endWeek - startWeek + 1;

  // ─── Scales ───
  const xScale = useCallback(
    (week: number) => {
      return MARGIN.left + ((week - startWeek) / Math.max(1, endWeek - startWeek)) * CHART_WIDTH;
    },
    [startWeek, endWeek]
  );

  const yScale = useCallback(
    (rank: number) => {
      const totalRanks = visibleTeams.length;
      return MARGIN.top + ((rank - 1) / Math.max(1, totalRanks - 1)) * CHART_HEIGHT;
    },
    [visibleTeams.length]
  );

  // ─── Generate path strings (memoized) ───
  const pathStrings = useMemo(() => {
    const paths = new Map<string, string>();
    for (const team of visibleTeams) {
      const trajectory = allTrajectories.get(team.id);
      if (!trajectory) continue;

      const points: Point[] = trajectory
        .filter((d) => d.week >= startWeek && d.week <= endWeek)
        .map((d) => ({
          x: xScale(d.week),
          y: yScale(d.rank),
        }));

      if (points.length > 0) {
        paths.set(team.id, monotoneCubicPath(points));
      }
    }
    return paths;
  }, [visibleTeams, allTrajectories, startWeek, endWeek, xScale, yScale]);

  // ─── Inflection events for selected team ───
  const selectedTeamEvents = useMemo(() => {
    if (!selectedTeam) return [];
    return getTeamEvents(selectedTeam, teams, matches, totalWeeks).filter(
      (e) => e.week >= startWeek && e.week <= endWeek
    );
  }, [selectedTeam, startWeek, endWeek, teams, matches, totalWeeks]);

  // ─── Event View Mode detection ───
  // Event view activates when NOT all filter categories are active
  const isEventViewMode = useMemo(() => {
    return activeFilters.size < EVENT_CATEGORIES.length;
  }, [activeFilters]);

  // ─── Compute allowed event types from active filters ───
  const allowedEventTypes = useMemo(() => {
    const types = new Set<EventType>();
    for (const cat of EVENT_CATEGORIES) {
      if (activeFilters.has(cat.id)) {
        for (const t of cat.types) types.add(t);
      }
    }
    return types;
  }, [activeFilters]);

  // ─── All events for all teams (for event view mode) ───
  const allTeamEvents = useMemo(() => {
    if (!isEventViewMode) return new Map<string, SeasonEvent[]>();
    const allEvents = detectInflectionEvents(teams, matches, totalWeeks);
    const filtered = allEvents.filter(
      (e) => allowedEventTypes.has(e.type) && e.week >= startWeek && e.week <= endWeek
    );
    const map = new Map<string, SeasonEvent[]>();
    for (const e of filtered) {
      if (!map.has(e.teamId)) map.set(e.teamId, []);
      map.get(e.teamId)!.push(e);
    }
    return map;
  }, [isEventViewMode, teams, matches, totalWeeks, allowedEventTypes, startWeek, endWeek]);

  // ─── Teams with matching events (for desaturation) ───
  const teamsWithEvents = useMemo(() => {
    if (!isEventViewMode) return new Set<string>();
    return new Set(allTeamEvents.keys());
  }, [isEventViewMode, allTeamEvents]);

  // ─── Event segment paths per team (for 3D breach rendering) ───
  const eventSegmentPaths = useMemo(() => {
    if (!isEventViewMode) return new Map<string, string[]>();
    const result = new Map<string, string[]>();

    for (const [teamId, events] of Array.from(allTeamEvents.entries())) {
      const trajectory = allTrajectories.get(teamId);
      if (!trajectory) continue;

      // Collect event weeks and expand to surrounding segments
      const eventWeeks = new Set<number>();
      for (const e of events) {
        eventWeeks.add(e.week);
      }

      // Build breach week ranges: for each event at week N, include N-1 to N+1
      const breachWeeks = new Set<number>();
      for (const w of Array.from(eventWeeks.values())) {
        breachWeeks.add(Math.max(startWeek, w - 1));
        breachWeeks.add(w);
        breachWeeks.add(Math.min(endWeek, w + 1));
      }

      // Find contiguous runs of breach weeks
      const sortedWeeks = Array.from(breachWeeks).sort((a, b) => a - b);
      const runs: [number, number][] = [];
      let runStart = sortedWeeks[0];
      let runEnd = sortedWeeks[0];
      for (let i = 1; i < sortedWeeks.length; i++) {
        if (sortedWeeks[i] === runEnd + 1) {
          runEnd = sortedWeeks[i];
        } else {
          runs.push([runStart, runEnd]);
          runStart = sortedWeeks[i];
          runEnd = sortedWeeks[i];
        }
      }
      runs.push([runStart, runEnd]);

      // Generate sub-paths for each contiguous run
      const segPaths: string[] = [];
      for (const [rStart, rEnd] of runs) {
        if (rStart === rEnd) continue; // Need at least 2 points for a visible segment
        const points: Point[] = trajectory
          .filter((d) => d.week >= rStart && d.week <= rEnd)
          .map((d) => ({
            x: xScale(d.week),
            y: yScale(d.rank),
          }));
        if (points.length >= 2) {
          segPaths.push(monotoneCubicPath(points));
        }
      }

      if (segPaths.length > 0) {
        result.set(teamId, segPaths);
      }
    }

    return result;
  }, [isEventViewMode, allTeamEvents, allTrajectories, startWeek, endWeek, xScale, yScale]);

  // ─── Play animation ───
  // Progressive reveal: starts from week 1 and adds one week at a time
  // at a pace slow enough for the user to absorb each week's changes.
  const playStartRef = useRef(1);

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        playStartRef.current++;
        const revealEnd = Math.min(playStartRef.current, maxWeek);

        setWeekRange([1, revealEnd]);
        setActivePreset(null);

        if (revealEnd >= maxWeek) {
          setIsPlaying(false);
        }
      }, 1200);
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [isPlaying, maxWeek]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev) {
        // Reset to week 1 and begin progressive reveal
        playStartRef.current = 1;
        setWeekRange([1, 1]);
        setActivePreset(null);
      }
      return !prev;
    });
  }, [maxWeek]);

  // ─── Interaction handlers ───
  const handleTeamHover = useCallback(
    (teamId: string | null) => {
      onHoverTeam(teamId);
    },
    [onHoverTeam]
  );

  const handleTeamClick = useCallback(
    (teamId: string) => {
      onSelectTeam(selectedTeam === teamId ? null : teamId);
    },
    [selectedTeam, onSelectTeam]
  );

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const target = e.target as SVGElement;
      // Only deselect when clicking the SVG background or the background rect,
      // NOT label rects or other interactive elements
      if (
        target.tagName === "svg" ||
        (target.tagName === "rect" && target.dataset.bg === "true")
      ) {
        onSelectTeam(null);
      }
    },
    [onSelectTeam]
  );

  // ─── Determine line appearance ───
  const getLineAppearance = useCallback(
    (teamId: string) => {
      const isSelected = selectedTeam === teamId;
      const isHovered = hoveredTeam === teamId;
      const hasAnyHighlight = selectedTeam !== null || hoveredTeam !== null;
      const teamColor = mutedTeamColor(teamId, isDark);
      const neutralColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";

      // ─── Event View Mode: all flat paths ghosted, only 3D segments get color ───
      if (isEventViewMode) {
        const hasEvents = teamsWithEvents.has(teamId);

        if (hasEvents) {
          // Teams WITH events: color is for 3D segments; base path will be ghosted via EventSegmentLine
          return { opacity: 0.85, strokeWidth: 2, color: teamColor };
        } else {
          // Teams WITHOUT events: fully ghosted
          return { opacity: 0.08, strokeWidth: 1, color: neutralColor };
        }
      }

      // ─── Normal mode (unchanged) ───
      if (!hasAnyHighlight) {
        if (viewMode === "allFocus") return { opacity: 0.9, strokeWidth: 2.2, color: teamColor };
        if (viewMode === "colors") return { opacity: 0.4, strokeWidth: 1.2, color: teamColor };
        return { opacity: 0.15, strokeWidth: 1, color: neutralColor };
      }

      if (isSelected && isHovered) {
        return { opacity: 1, strokeWidth: 2.5, color: teamColor };
      }

      if (isSelected) {
        return { opacity: 1, strokeWidth: 2.5, color: teamColor };
      }

      if (isHovered) {
        if (selectedTeam !== null) {
          return { opacity: 1, strokeWidth: 2, color: teamColor };
        }
        return { opacity: 1, strokeWidth: 2.5, color: teamColor };
      }

      if (viewMode === "allFocus") return { opacity: 0.5, strokeWidth: 1.5, color: teamColor };
      if (viewMode === "colors") return { opacity: 0.3, strokeWidth: 1, color: teamColor };
      return { opacity: 0.08, strokeWidth: 1, color: neutralColor };
    },
    [selectedTeam, hoveredTeam, isDark, viewMode, isEventViewMode, teamsWithEvents]
  );

  // ─── X-axis labels ───
  const xAxisLabels = useMemo(() => {
    const labels: number[] = [];
    for (let w = startWeek; w <= endWeek; w++) {
      if (
        w === startWeek ||
        w === endWeek ||
        w % 5 === 0 ||
        (visibleWeekCount <= 12 && w % 2 === 0) ||
        visibleWeekCount <= 5
      ) {
        labels.push(w);
      }
    }
    if (!labels.includes(startWeek)) labels.unshift(startWeek);
    if (!labels.includes(endWeek)) labels.push(endWeek);
    return Array.from(new Set(labels)).sort((a, b) => a - b);
  }, [startWeek, endWeek, visibleWeekCount]);

  // ─── Y-axis labels ───
  const yAxisLabels = useMemo(() => {
    const totalRanks = visibleTeams.length;
    const labels: number[] = [1];
    for (let r = 5; r <= totalRanks; r += 5) {
      labels.push(r);
    }
    if (!labels.includes(totalRanks)) labels.push(totalRanks);
    return labels;
  }, [visibleTeams.length]);

  // ─── Tier bands ───
  const tierBands = useMemo(() => {
    const totalRanks = visibleTeams.length;
    if (totalRanks <= 0) return [];

    const tierRanges: { tier: keyof typeof TIER_BAND_COLORS; startRank: number; endRank: number }[] =
      totalRanks === 30
        ? [
            { tier: "Title Contenders", startRank: 1, endRank: 8 },
            { tier: "Playoff", startRank: 9, endRank: 15 },
            { tier: "Bubble", startRank: 16, endRank: 22 },
            { tier: "Rebuilding", startRank: 23, endRank: 30 },
          ]
        : [
            { tier: "Title Contenders", startRank: 1, endRank: Math.ceil(totalRanks * 0.27) },
            { tier: "Playoff", startRank: Math.ceil(totalRanks * 0.27) + 1, endRank: Math.ceil(totalRanks * 0.5) },
            { tier: "Bubble", startRank: Math.ceil(totalRanks * 0.5) + 1, endRank: Math.ceil(totalRanks * 0.73) },
            { tier: "Rebuilding", startRank: Math.ceil(totalRanks * 0.73) + 1, endRank: totalRanks },
          ];

    return tierRanges.map(({ tier, startRank, endRank }) => ({
      tier,
      y: yScale(startRank) - (CHART_HEIGHT / (totalRanks - 1)) * 0.5,
      height: (endRank - startRank + 1) * (CHART_HEIGHT / (totalRanks - 1)),
      color: TIER_BAND_COLORS[tier][isDark ? "dark" : "light"],
    }));
  }, [visibleTeams.length, yScale, isDark]);

  // ─── Team endpoint labels ───
  const getEndpointLabel = useCallback(
    (teamId: string) => {
      const trajectory = allTrajectories.get(teamId);
      if (!trajectory) return null;

      const lastVisible = trajectory.filter((d) => d.week >= startWeek && d.week <= endWeek);
      if (lastVisible.length === 0) return null;

      const lastPoint = lastVisible[lastVisible.length - 1];
      const team = getTeam(teamId);
      if (!team) return null;

      return {
        x: xScale(lastPoint.week) + 8,
        y: yScale(lastPoint.rank),
        name: team.short,
      };
    },
    [allTrajectories, startWeek, endWeek, xScale, yScale]
  );

  // ─── Event marker positions ───
  const eventMarkerPositions = useMemo(() => {
    if (!selectedTeam) return [];
    const trajectory = allTrajectories.get(selectedTeam);
    if (!trajectory) return [];

    return selectedTeamEvents.map((event) => {
      const weekData = trajectory.find((d) => d.week === event.week);
      if (!weekData) return null;
      return {
        event,
        cx: xScale(event.week),
        cy: yScale(weekData.rank),
      };
    }).filter(Boolean) as { event: SeasonEvent; cx: number; cy: number }[];
  }, [selectedTeam, selectedTeamEvents, allTrajectories, xScale, yScale]);

  // ─── Event marker positions for ALL teams in event view mode ───
  const allEventMarkerPositions = useMemo(() => {
    if (!isEventViewMode) return [];
    const markers: { event: SeasonEvent; cx: number; cy: number }[] = [];
    for (const [teamId, events] of Array.from(allTeamEvents.entries())) {
      // Skip the selected team — their markers are rendered separately via eventMarkerPositions
      if (teamId === selectedTeam) continue;
      const trajectory = allTrajectories.get(teamId);
      if (!trajectory) continue;
      for (const event of events) {
        const weekData = trajectory.find((d) => d.week === event.week);
        if (weekData) {
          markers.push({
            event,
            cx: xScale(event.week),
            cy: yScale(weekData.rank),
          });
        }
      }
    }
    return markers;
  }, [isEventViewMode, allTeamEvents, selectedTeam, allTrajectories, xScale, yScale]);

  // ─── Selected week indicator position ───
  const selectedWeekX = useMemo(() => {
    if (selectedWeek < startWeek || selectedWeek > endWeek) return null;
    return xScale(selectedWeek);
  }, [selectedWeek, startWeek, endWeek, xScale]);

  // ─── Dynamic subtitle ───
  const subtitle = useMemo(() => {
    const weekLabel =
      startWeek === 1 && endWeek === maxWeek
        ? `Weeks 1-${maxWeek}`
        : `Weeks ${startWeek}-${endWeek}`;
    const teamCount = visibleTeams.length;
    const rankLabel = rankMode === "POWER" ? "Power Rankings" : "Points Rankings";
    return `${seasonYear} · ${weekLabel} · ${teamCount} teams · ${rankLabel}`;
  }, [startWeek, endWeek, maxWeek, visibleTeams.length, rankMode, seasonYear]);

  // ─── Bump chart card insights ───
  const [showBumpInsights, setShowBumpInsights] = useState(false);
  const bumpInsights = useMemo(() => {
    const currStandings = getWeekStandings(endWeek, teams, matches, totalWeeks);
    const prevStandings = startWeek < endWeek
      ? getWeekStandings(startWeek, teams, matches, totalWeeks)
      : null;
    return bumpChartCardInsights(
      currStandings,
      prevStandings,
      conferenceFilter,
      rankMode,
      startWeek,
      endWeek,
      seasonYear
    );
  }, [endWeek, startWeek, teams, matches, totalWeeks, conferenceFilter, rankMode, seasonYear]);

  // ─── Highlighted teams for labels ───
  const highlightedTeams = useMemo(() => {
    const hTeams: string[] = [];
    if (selectedTeam && visibleTeamIds.has(selectedTeam)) hTeams.push(selectedTeam);
    if (hoveredTeam && hoveredTeam !== selectedTeam && visibleTeamIds.has(hoveredTeam)) {
      hTeams.push(hoveredTeam);
    }
    return hTeams;
  }, [selectedTeam, hoveredTeam, visibleTeamIds]);

  // ─── Handle event marker tooltip ───
  const handleEventHover = useCallback(
    (event: SeasonEvent | null) => {
      if (event) {
        const trajectory = allTrajectories.get(event.teamId);
        const weekData = trajectory?.find((d) => d.week === event.week);
        if (weekData) {
          setTooltipEvent(event);
          setTooltipPos({ x: xScale(event.week), y: yScale(weekData.rank) });
        }
      } else {
        setTooltipEvent(null);
      }
    },
    [allTrajectories, xScale, yScale]
  );

  // Dynamic data source text for methods panel
  const dataSourceText = seasonYear === 2026
    ? `${matches.length} matches across ${maxWeek} matchweeks from the ${seasonYear} MLS season (in progress). Data sourced from the American Soccer Analysis (ASA) API.`
    : `510 matches across 33 matchweeks from the 2025 MLS season. Data sourced from FBref.com.`;

  return (
    <div>
      <ChartHeader
        title="Season Rank Flow"
        subtitle={subtitle}
        description={
          <>
            Watch how the league table shifted week by week. Each line traces a team's ranking trajectory. <strong>Hover or click to isolate a team</strong> and view their inflection events. Use the filter pills above to toggle <strong>Event View Mode</strong> — non-event segments will fade out, while event-relevant weeks pop with 3D highlights and dot markers to pinpoint exactly where streaks, upsets, and milestones occurred.
          </>
        }
        zone1Toolbar={
          <div className="flex items-center gap-2">
            <IconAction
              icon={viewMode === "allFocus" ? <Sparkles size={13} /> : viewMode === "colors" ? <Eye size={13} /> : <EyeOff size={13} />}
              label={viewMode === "allFocus" ? "All Focus" : viewMode === "colors" ? "All Colors" : "Focus Mode"}
              tooltip="Cycle view mode: Focus → All Colors → All Focus"
              onClick={cycleViewMode}
              isDark={isDark}
            />
            {/* Event filter pills */}
            <div
              className="flex items-center gap-1 ml-1 pl-2"
              style={{ borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}
            >
              <Filter size={11} className="mr-0.5" style={{ opacity: 0.4, color: isDark ? '#fff' : '#000' }} />
              {EVENT_CATEGORIES.map((cat) => {
                const isActive = activeFilters.has(cat.id);
                const catColor = isDark ? cat.color.dark : cat.color.light;
                return (
                  <button
                    key={cat.id}
                    onClick={(e) => { e.stopPropagation(); onToggleFilter(cat.id); }}
                    title={`${isActive ? 'Hide' : 'Show'} ${cat.label}`}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wide transition-all duration-200"
                    style={{
                      fontFamily: 'Space Grotesk, sans-serif',
                      background: isActive
                        ? `${catColor}22`
                        : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      color: isActive ? catColor : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'),
                      border: `1px solid ${isActive ? `${catColor}44` : 'transparent'}`,
                      opacity: isActive ? 1 : 0.5,
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: isActive ? catColor : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
                        flexShrink: 0,
                      }}
                    />
                    {cat.label.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        }
        zone2Analysis={
          <CardInsightToggle
            isOpen={showBumpInsights}
            onToggle={() => setShowBumpInsights(v => !v)}
            isDark={isDark}
          />
        }
        methods={
          <div className="space-y-2">
            <p>
              <strong>Data Source:</strong> {dataSourceText} Rankings computed from cumulative match results.
            </p>
            <p>
              <strong>Ranking Computation:</strong> Points-based ranking uses standard
              MLS points (3W/1D/0L), with tiebreakers: goal difference → goals for.
              Power ranking uses the composite score: Score = 0.35 × PPG_norm + 0.25 ×
              Form + 0.20 × GD_norm + 0.10 × Consistency + 0.10 × Momentum.
            </p>
            <p>
              <strong>Curve Interpolation:</strong> Lines are rendered using monotone
              cubic Hermite interpolation (Fritsch-Carlson method), which preserves
              monotonicity between data points and prevents visual overshooting at rank
              changes. Each team's path connects {maxWeek} weekly rank positions.
            </p>
            <p>
              <strong>Inflection Detection:</strong> Events are auto-detected from match
              data — winning/losing streaks (3+ consecutive), unbeaten/winless runs (5+
              matches), rank surges/collapses (5+ position change in one week), upsets
              (10+ rank gap), and milestones (30/50 point thresholds). Severity scaled
              1-5 based on magnitude.
            </p>
            <p>
              <strong>Event Symbology & Filtering:</strong> Toggling event categories activates a 3-tier visual hierarchy. <em>Tier 1:</em> Selected teams render as full 3D tubes. <em>Tier 2:</em> Event-relevant teams show 3D breach segments and colored dot markers (Green=Streaks, Amber=Rank, Red=Upsets, Cyan=Milestones) only during the weeks the events occurred. <em>Tier 3:</em> All non-event teams and flat path segments fade to a ghost grey, creating maximum contrast.
            </p>
            <p>
              <strong>Tier Bands:</strong> Background regions correspond to quartile
              breaks on the composite power score. Q3+ = Title Contenders, Q2-Q3 =
              Playoff, Q1-Q2 = Bubble, below Q1 = Rebuilding.
            </p>
          </div>
        }
      />
      <CardInsightSection isOpen={showBumpInsights} insights={bumpInsights} isDark={isDark} />

      {/* SVG Chart */}
      <div
        className="w-full overflow-x-auto"
        style={{
          background: isDark ? "var(--neu-bg-raised)" : "var(--neu-bg-raised)",
          borderRadius: 10,
          boxShadow: isDark
            ? "6px 6px 14px var(--neu-shadow-dark-strong), -4px -4px 10px var(--neu-shadow-light-strong), inset 0 1px 0 var(--neu-inset-highlight)"
            : "6px 6px 14px var(--neu-shadow-dark), -4px -4px 10px var(--neu-shadow-light), inset 0 1px 0 var(--neu-inset-highlight)",
          padding: "6px 4px 4px 4px",
          marginTop: 4,
        }}
      >
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          aria-label={`Bump chart showing ${visibleTeams.length} team rankings across weeks ${startWeek} to ${endWeek}`}
          role="img"
          onClick={handleSvgClick}
          style={{ minHeight: 350 }}
        >
          {/* SVG defs for neumorphic label tab filters */}
          <defs>
            <filter id="label-neu-shadow" x="-20%" y="-30%" width="140%" height="180%">
              <feDropShadow dx="1.5" dy="2" stdDeviation="1.5" floodColor={isDark ? "rgba(0,0,0,0.55)" : "rgba(140,144,165,0.4)"} floodOpacity="1" />
              <feDropShadow dx="-1" dy="-1" stdDeviation="1" floodColor={isDark ? "rgba(60,60,80,0.12)" : "rgba(255,255,255,0.7)"} floodOpacity="1" />
            </filter>
            <filter id="label-neu-shadow-hl" x="-25%" y="-35%" width="150%" height="200%">
              <feDropShadow dx="2" dy="2.5" stdDeviation="2" floodColor={isDark ? "rgba(0,0,0,0.6)" : "rgba(140,144,165,0.45)"} floodOpacity="1" />
              <feDropShadow dx="-1.5" dy="-1.5" stdDeviation="1.5" floodColor={isDark ? "rgba(60,60,80,0.15)" : "rgba(255,255,255,0.8)"} floodOpacity="1" />
            </filter>
          </defs>

          {/* Tier background bands */}
          {tierBands.map((band) => (
            <rect
              key={band.tier}
              x={MARGIN.left}
              y={band.y}
              width={CHART_WIDTH}
              height={band.height}
              fill={band.color}
              rx={4}
              data-bg="true"
            />
          ))}

          {/* Grid lines (horizontal) */}
          {yAxisLabels.map((rank) => (
            <line
              key={`grid-h-${rank}`}
              x1={MARGIN.left}
              y1={yScale(rank)}
              x2={MARGIN.left + CHART_WIDTH}
              y2={yScale(rank)}
              stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}
              strokeWidth={0.5}
            />
          ))}

          {/* Grid lines (vertical, subtle) */}
          {xAxisLabels.map((week) => (
            <line
              key={`grid-v-${week}`}
              x1={xScale(week)}
              y1={MARGIN.top}
              x2={xScale(week)}
              y2={MARGIN.top + CHART_HEIGHT}
              stroke={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"}
              strokeWidth={0.5}
            />
          ))}

          {/* Selected week vertical indicator */}
          {selectedWeekX !== null && (
            <line
              x1={selectedWeekX}
              y1={MARGIN.top - 5}
              x2={selectedWeekX}
              y2={MARGIN.top + CHART_HEIGHT + 5}
              stroke={isDark ? "rgba(0, 212, 255, 0.35)" : "rgba(8, 145, 178, 0.3)"}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              style={{ transition: "x1 0.3s ease, x2 0.3s ease" }}
            />
          )}

          {/* X-axis labels */}
          {xAxisLabels.map((week) => (
            <text
              key={`x-${week}`}
              x={xScale(week)}
              y={MARGIN.top + CHART_HEIGHT + 20}
              textAnchor="middle"
              fill={
                week === selectedWeek
                  ? "var(--cyan)"
                  : isDark
                    ? "rgba(255,255,255,0.4)"
                    : "rgba(0,0,0,0.35)"
              }
              fontSize={9}
              fontFamily="JetBrains Mono, monospace"
              fontWeight={week === selectedWeek ? 700 : 400}
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectWeek(week);
              }}
            >
              {week}
            </text>
          ))}

          {/* X-axis title */}
          <text
            x={MARGIN.left + CHART_WIDTH / 2}
            y={MARGIN.top + CHART_HEIGHT + 35}
            textAnchor="middle"
            fill={isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)"}
            fontSize={8}
            fontFamily="Space Grotesk, sans-serif"
            letterSpacing="0.1em"
          >
            MATCHWEEK
          </text>

          {/* Y-axis labels */}
          {yAxisLabels.map((rank) => (
            <text
              key={`y-${rank}`}
              x={MARGIN.left - 10}
              y={yScale(rank) + 3}
              textAnchor="end"
              fill={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)"}
              fontSize={9}
              fontFamily="JetBrains Mono, monospace"
            >
              {rank}
            </text>
          ))}

          {/* Y-axis title */}
          <text
            x={12}
            y={MARGIN.top + CHART_HEIGHT / 2}
            textAnchor="middle"
            fill={isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)"}
            fontSize={8}
            fontFamily="Space Grotesk, sans-serif"
            letterSpacing="0.1em"
            transform={`rotate(-90, 12, ${MARGIN.top + CHART_HEIGHT / 2})`}
          >
            RANK
          </text>

          {/* Team lines — render non-highlighted first, then highlighted on top */}
          {visibleTeams
            .filter((t) => !highlightedTeams.includes(t.id))
            .map((team) => {
              const pathD = pathStrings.get(team.id);
              if (!pathD) return null;
              const appearance = getLineAppearance(team.id);
              // In allFocus mode with no specific selection, render all lines as 3D
              const allFocus3D = viewMode === "allFocus" && selectedTeam === null && hoveredTeam === null;

              // Event view mode: use EventSegmentLine for teams with events
              if (isEventViewMode && teamsWithEvents.has(team.id)) {
                const segPaths = eventSegmentPaths.get(team.id) || [];
                const ghostNeutral = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";
                return (
                  <EventSegmentLine
                    key={`evt-${team.id}`}
                    teamId={team.id}
                    fullPathD={pathD}
                    segmentPaths={segPaths}
                    opacity={appearance.opacity}
                    strokeWidth={appearance.strokeWidth}
                    color={appearance.color}
                    ghostColor={ghostNeutral}
                    ghostOpacity={0.08}
                    ghostStrokeWidth={1}
                    onMouseEnter={() => handleTeamHover(team.id)}
                    onMouseLeave={() => handleTeamHover(null)}
                    onClick={() => handleTeamClick(team.id)}
                  />
                );
              }

              return (
                <TeamLine
                  key={team.id}
                  teamId={team.id}
                  pathD={pathD}
                  opacity={appearance.opacity}
                  strokeWidth={appearance.strokeWidth}
                  color={appearance.color}
                  isHighlighted={allFocus3D}
                  onMouseEnter={() => handleTeamHover(team.id)}
                  onMouseLeave={() => handleTeamHover(null)}
                  onClick={() => handleTeamClick(team.id)}
                />
              );
            })}

          {/* Highlighted team lines (on top) */}
          {highlightedTeams.map((teamId) => {
            const pathD = pathStrings.get(teamId);
            if (!pathD) return null;
            const appearance = getLineAppearance(teamId);

            // In event view mode, highlighted teams also get event segment treatment
            if (isEventViewMode && teamsWithEvents.has(teamId)) {
              const segPaths = eventSegmentPaths.get(teamId) || [];
              const ghostNeutral = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";
              return (
                <EventSegmentLine
                  key={`hl-evt-${teamId}`}
                  teamId={teamId}
                  fullPathD={pathD}
                  segmentPaths={segPaths}
                  opacity={appearance.opacity}
                  strokeWidth={appearance.strokeWidth}
                  color={appearance.color}
                  ghostColor={ghostNeutral}
                  ghostOpacity={0.08}
                  ghostStrokeWidth={1}
                  onMouseEnter={() => handleTeamHover(teamId)}
                  onMouseLeave={() => handleTeamHover(null)}
                  onClick={() => handleTeamClick(teamId)}
                />
              );
            }

            return (
              <TeamLine
                key={`hl-${teamId}`}
                teamId={teamId}
                pathD={pathD}
                opacity={appearance.opacity}
                strokeWidth={appearance.strokeWidth}
                color={appearance.color}
                isHighlighted={true}
                onMouseEnter={() => handleTeamHover(teamId)}
                onMouseLeave={() => handleTeamHover(null)}
                onClick={() => handleTeamClick(teamId)}
              />
            );
          })}

          {/* Week data point dots with match result hover (highlighted teams only) */}
          {activeTeamForResults && activeTeamResults && highlightedTeams.includes(activeTeamForResults) && (() => {
            const trajectory = allTrajectories.get(activeTeamForResults);
            if (!trajectory) return null;
            const teamColor = mutedTeamColor(activeTeamForResults, isDark);
            return trajectory
              .filter((d) => d.week >= startWeek && d.week <= endWeek)
              .map((d) => {
                const results = activeTeamResults.get(d.week);
                const m = results?.[0];
                const dotX = xScale(d.week);
                const dotY = yScale(d.rank);
                const isHovered = matchTooltip?.week === d.week && matchTooltip?.teamId === activeTeamForResults;
                return (
                  <circle
                    key={`dot-${activeTeamForResults}-${d.week}`}
                    cx={dotX}
                    cy={dotY}
                    r={isHovered ? 5 : 3}
                    fill={m ? (
                      m.result === "W"
                        ? isDark ? "#10b981" : "#059669"
                        : m.result === "L"
                          ? isDark ? "#ef4444" : "#dc2626"
                          : isDark ? "#6b7280" : "#9ca3af"
                    ) : teamColor}
                    stroke={isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.8)"}
                    strokeWidth={1}
                    opacity={isHovered ? 1 : 0.7}
                    style={{
                      cursor: "pointer",
                      transition: "r 0.15s ease, opacity 0.15s ease",
                      filter: isHovered ? `drop-shadow(0 0 4px ${teamColor})` : "none",
                    }}
                    onMouseEnter={() => {
                      if (m) {
                        setMatchTooltip({
                          teamId: activeTeamForResults!,
                          week: d.week,
                          result: m,
                          x: dotX,
                          y: dotY,
                        });
                      }
                    }}
                    onMouseLeave={() => setMatchTooltip(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectWeek(d.week);
                    }}
                  />
                );
              });
          })()}

          {/* Inflection markers (only on selected team) */}
          {eventMarkerPositions.map((marker, i) => (
            <InflectionMarker
              key={`event-${marker.event.week}-${marker.event.type}-${i}`}
              event={marker.event}
              cx={marker.cx}
              cy={marker.cy}
              isDark={isDark}
              onHover={handleEventHover}
            />
          ))}

          {/* Event view mode: inflection markers on ALL event-relevant teams */}
          {allEventMarkerPositions.map((marker, i) => (
            <InflectionMarker
              key={`all-evt-${marker.event.teamId}-${marker.event.week}-${marker.event.type}-${i}`}
              event={marker.event}
              cx={marker.cx}
              cy={marker.cy}
              isDark={isDark}
              onHover={handleEventHover}
            />
          ))}

          {/* Persistent team labels at endpoints — neumorphic 3D tabs */}
          {visibleTeams.map((team) => {
            const label = getEndpointLabel(team.id);
            if (!label) return null;
            const rawTeamColor = mutedTeamColor(team.id, isDark);
            // In event view mode, desaturate labels for teams without events
            const isEventDesat = isEventViewMode && !teamsWithEvents.has(team.id) && !highlightedTeams.includes(team.id);
            const neutralLabel = isDark ? "#555" : "#bbb";
            const teamColor = isEventDesat ? neutralLabel : rawTeamColor;
            const labelOpacityMod = isEventDesat ? 0.2 : 1;
            const isHL = highlightedTeams.includes(team.id);
            const labelW = 100; // uniform width for all tabs
            const labelH = isHL ? 18 : 16;
            const highlightEdge = lighten(teamColor, 0.35);
            const shadowEdge = darken(teamColor, 0.3);
            return (
              <motion.g
                key={`label-${team.id}`}
                animate={{ y: 0 }}
                style={{ y: 0, cursor: "pointer" }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                onClick={(e) => { e.stopPropagation(); handleTeamClick(team.id); }}
                onMouseEnter={() => handleTeamHover(team.id)}
                onMouseLeave={() => handleTeamHover(null)}
              >
                <motion.g
                  animate={{ y: label.y }}
                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                >
                  {/* Flat team-color base rect with outer drop shadow */}
                  <rect
                    x={label.x - 2}
                    y={-labelH / 2}
                    width={labelW}
                    height={labelH}
                    rx={4}
                    fill={teamColor}
                    opacity={(isHL ? 1 : 0.8) * labelOpacityMod}
                    filter={isHL ? "url(#label-neu-shadow-hl)" : "url(#label-neu-shadow)"}
                  />
                  {/* Inset top highlight edge — matches table row pattern */}
                  <line
                    x1={label.x - 1}
                    y1={-labelH / 2 + 0.5}
                    x2={label.x + labelW - 3}
                    y2={-labelH / 2 + 0.5}
                    stroke={isDark ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.7)"}
                    strokeWidth={1}
                    strokeLinecap="round"
                    style={{ pointerEvents: "none" }}
                  />
                  {/* Inset bottom shadow edge — matches table row pattern */}
                  <line
                    x1={label.x - 1}
                    y1={labelH / 2 - 0.5}
                    x2={label.x + labelW - 3}
                    y2={labelH / 2 - 0.5}
                    stroke={isDark ? "rgba(0,0,0,0.4)" : "rgba(166,170,190,0.35)"}
                    strokeWidth={1}
                    strokeLinecap="round"
                    style={{ pointerEvents: "none" }}
                  />
                  {/* Left highlight edge */}
                  <line
                    x1={label.x - 1.5}
                    y1={-labelH / 2 + 2}
                    x2={label.x - 1.5}
                    y2={labelH / 2 - 2}
                    stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.55)"}
                    strokeWidth={1}
                    strokeLinecap="round"
                    style={{ pointerEvents: "none" }}
                  />
                  {/* Right shadow edge */}
                  <line
                    x1={label.x + labelW - 2.5}
                    y1={-labelH / 2 + 2}
                    x2={label.x + labelW - 2.5}
                    y2={labelH / 2 - 2}
                    stroke={isDark ? "rgba(0,0,0,0.3)" : "rgba(166,170,190,0.25)"}
                    strokeWidth={1}
                    strokeLinecap="round"
                    style={{ pointerEvents: "none" }}
                  />
                  <text
                    x={label.x + 3}
                    y={isHL ? 4.5 : 4}
                    fill="#ffffff"
                    fontSize={isHL ? 9.5 : 7.5}
                    fontWeight={isHL ? 700 : 500}
                    fontFamily="Space Grotesk, sans-serif"
                    opacity={1 * labelOpacityMod}
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                  >
                    {label.name}
                  </text>
                </motion.g>
              </motion.g>
            );
          })}

          {/* Event tooltip */}
          {tooltipEvent && (
            <EventTooltip
              event={tooltipEvent}
              x={tooltipPos.x}
              y={tooltipPos.y}
              isDark={isDark}
            />
          )}

          {/* Match result tooltip */}
          {matchTooltip && !tooltipEvent && (() => {
            const m = matchTooltip.result;
            const tooltipWidth = 200;
            const tooltipX = Math.max(
              tooltipWidth / 2 + 10,
              Math.min(matchTooltip.x, SVG_WIDTH - tooltipWidth / 2 - 10)
            );
            const tooltipY = Math.max(20, matchTooltip.y - 80);
            const resultColor =
              m.result === "W"
                ? isDark ? "#10b981" : "#059669"
                : m.result === "L"
                  ? isDark ? "#ef4444" : "#dc2626"
                  : isDark ? "#6b7280" : "#9ca3af";
            return (
              <foreignObject
                x={tooltipX - tooltipWidth / 2}
                y={tooltipY}
                width={tooltipWidth}
                height={80}
                style={{ overflow: "visible", pointerEvents: "none" }}
              >
                <div
                  style={{
                    background: "var(--glass-bg)",
                    backdropFilter: "blur(var(--glass-blur)) saturate(1.4)",
                    WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(1.4)",
                    border: `1px solid ${hexToRgba(resultColor, 0.25)}`,
                    borderRadius: 8,
                    boxShadow: "var(--glass-shadow), var(--glass-highlight)",
                    color: "var(--glass-text)",
                    padding: "8px 12px",
                    maxWidth: tooltipWidth,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "Space Grotesk, sans-serif",
                      color: resultColor,
                      marginBottom: 3,
                    }}
                  >
                    Week {m.week}: {m.result === "W" ? "Win" : m.result === "L" ? "Loss" : "Draw"}{" "}
                    {m.isHome ? "vs" : "@"} {m.opponentShort}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: "JetBrains Mono, monospace",
                      color: "var(--glass-text-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    <div>{m.goalsFor}-{m.goalsAgainst} · {m.isHome ? "Home" : "Away"}</div>
                    <div style={{ fontSize: 9, marginTop: 1, opacity: 0.8 }}>{m.venue} · {m.date}</div>
                  </div>
                </div>
              </foreignObject>
            );
          })()}
        </svg>
      </div>

      {/* Week Window Controls */}
      <WeekWindowControls
        weekRange={weekRange}
        setWeekRange={setWeekRange}
        activePreset={activePreset}
        setActivePreset={setActivePreset}
        isPlaying={isPlaying}
        togglePlay={togglePlay}
        maxWeek={maxWeek}
        isDark={isDark}
        weekPresets={weekPresets}
      />
    </div>
  );
}
