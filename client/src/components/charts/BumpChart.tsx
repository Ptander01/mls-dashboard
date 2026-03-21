/**
 * BumpChart.tsx — Season Rank Flow Visualization (Session 2)
 *
 * Custom SVG bump chart showing 30 team ranking lines across 33 matchweeks.
 * Uses d3-shape's monotone cubic interpolation for smooth curves.
 *
 * Features:
 * - Deemphasis hover/click interaction system (bidirectional with snapshot table)
 * - Week window range slider with presets and play/pause animation
 * - Inflection markers with tooltips on selected team's line
 * - Selected week vertical indicator synced with table's week selector
 * - ChartHeader with description and expandable methods panel
 * - Full dark/light theme support
 * - Responsive via SVG viewBox
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
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { TEAMS, getTeam } from "@/lib/mlsData";
import {
  computeWeeklyStandings,
  getTeamTrajectory,
  getTeamEvents,
  getMaxWeek,
  type TeamWeekStanding,
  type SeasonEvent,
} from "@/lib/seasonPulse";
import { mutedTeamColor, hexToRgba } from "@/lib/chartUtils";
import { ChartHeader } from "@/components/ui/ChartHeader";

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
}

type WeekPreset = "full" | "first" | "second" | "last10";

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════

const SVG_WIDTH = 1200;
const SVG_HEIGHT = 700;
const MARGIN = { top: 30, right: 80, bottom: 40, left: 45 };
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

const WEEK_PRESETS: { key: WeekPreset; label: string; range: [number, number] }[] = [
  { key: "full", label: "Full", range: [1, 33] },
  { key: "first", label: "1st Half", range: [1, 17] },
  { key: "second", label: "2nd Half", range: [18, 33] },
  { key: "last10", label: "Last 10", range: [24, 33] },
];

// ═══════════════════════════════════════════
// LINE GENERATOR (monotone cubic interpolation)
// ═══════════════════════════════════════════

/**
 * Attempt to import d3-shape's line + curveMonotoneX.
 * Since d3-shape is available via recharts' dependency tree,
 * we implement a lightweight monotone cubic spline generator
 * to avoid import resolution issues with pnpm's strict hoisting.
 */

interface Point {
  x: number;
  y: number;
}

/**
 * Generate a smooth SVG path string using monotone cubic interpolation.
 * This implements the Fritsch-Carlson method for monotone piecewise cubic Hermite interpolation.
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
        // Future: scroll timeline to this event (Session 3)
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
  // Position tooltip above the marker, clamped within SVG bounds
  const tooltipX = Math.max(100, Math.min(x, SVG_WIDTH - 200));
  const tooltipY = Math.max(20, y - 55);

  return (
    <g>
      {/* Background rect */}
      <rect
        x={tooltipX - 95}
        y={tooltipY - 14}
        width={190}
        height={44}
        rx={6}
        fill={isDark ? "rgba(20, 20, 34, 0.95)" : "rgba(255, 255, 255, 0.95)"}
        stroke={hexToRgba(color, 0.3)}
        strokeWidth={1}
        style={{
          filter: isDark
            ? "drop-shadow(0 2px 8px rgba(0,0,0,0.5))"
            : "drop-shadow(0 2px 8px rgba(0,0,0,0.15))",
        }}
      />
      {/* Title */}
      <text
        x={tooltipX}
        y={tooltipY + 2}
        textAnchor="middle"
        fill={color}
        fontSize={10}
        fontWeight={700}
        fontFamily="Space Grotesk, sans-serif"
      >
        {event.title}
      </text>
      {/* Description (truncated) */}
      <text
        x={tooltipX}
        y={tooltipY + 18}
        textAnchor="middle"
        fill={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)"}
        fontSize={8.5}
        fontFamily="system-ui, sans-serif"
      >
        {event.description.length > 50
          ? event.description.slice(0, 47) + "..."
          : event.description}
      </text>
    </g>
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
}: {
  weekRange: [number, number];
  setWeekRange: (range: [number, number]) => void;
  activePreset: WeekPreset | null;
  setActivePreset: (preset: WeekPreset | null) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  maxWeek: number;
  isDark: boolean;
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

  const sliderTrackStyle = (value: number, min: number, max: number) => {
    const pct = ((value - min) / (max - min)) * 100;
    return {
      background: isDark
        ? `linear-gradient(to right, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`
        : `linear-gradient(to right, rgba(0,0,0,0.1) ${pct}%, rgba(0,0,0,0.1) ${pct}%)`,
      accentColor: "var(--cyan)",
    };
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
              left: `${((weekRange[0] - 1) / (maxWeek - 1)) * 100}%`,
              right: `${100 - ((weekRange[1] - 1) / (maxWeek - 1)) * 100}%`,
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
          {WEEK_PRESETS.map((preset) => (
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
}: BumpChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const maxWeek = getMaxWeek();

  // Week window state
  const [weekRange, setWeekRange] = useState<[number, number]>([1, maxWeek]);
  const [activePreset, setActivePreset] = useState<WeekPreset | null>("full");
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tooltip state for inflection markers
  const [tooltipEvent, setTooltipEvent] = useState<SeasonEvent | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // ─── Filter teams by conference ───
  const visibleTeams = useMemo(() => {
    if (conferenceFilter === "ALL") return TEAMS;
    const conf = conferenceFilter === "EASTERN" ? "Eastern" : "Western";
    return TEAMS.filter((t) => t.conference === conf);
  }, [conferenceFilter]);

  const visibleTeamIds = useMemo(() => new Set(visibleTeams.map((t) => t.id)), [visibleTeams]);

  // ─── Compute all trajectories ───
  const allTrajectories = useMemo(() => {
    const map = new Map<string, { week: number; rank: number }[]>();
    for (const team of TEAMS) {
      const trajectory = getTeamTrajectory(team.id);
      const mapped = trajectory.map((s) => ({
        week: s.week,
        rank: rankMode === "POWER" ? s.powerRank : s.pointsRank,
      }));
      map.set(team.id, mapped);
    }
    return map;
  }, [rankMode]);

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
    return getTeamEvents(selectedTeam).filter(
      (e) => e.week >= startWeek && e.week <= endWeek
    );
  }, [selectedTeam, startWeek, endWeek]);

  // ─── Play animation ───
  useEffect(() => {
    if (isPlaying) {
      const windowWidth = 8;
      let currentStart = 1;

      playIntervalRef.current = setInterval(() => {
        currentStart++;
        const newEnd = Math.min(currentStart + windowWidth - 1, maxWeek);
        const newStart = Math.max(1, newEnd - windowWidth + 1);

        setWeekRange([newStart, newEnd]);
        setActivePreset(null);

        if (newEnd >= maxWeek) {
          setIsPlaying(false);
        }
      }, 250);
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
        // Reset to start if at end
        setWeekRange([1, 8]);
        setActivePreset(null);
      }
      return !prev;
    });
  }, []);

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
      // Only deselect if clicking on the SVG background (not a line)
      if ((e.target as SVGElement).tagName === "svg" || (e.target as SVGElement).tagName === "rect") {
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

      if (!hasAnyHighlight) {
        // Default: all lines muted
        return { opacity: 0.15, strokeWidth: 1, color: neutralColor };
      }

      if (isSelected && isHovered) {
        return { opacity: 1, strokeWidth: 2.5, color: teamColor };
      }

      if (isSelected) {
        return { opacity: 1, strokeWidth: 2.5, color: teamColor };
      }

      if (isHovered) {
        // If there's a locked selection, show hovered at slightly thinner
        if (selectedTeam !== null) {
          return { opacity: 1, strokeWidth: 2, color: teamColor };
        }
        return { opacity: 1, strokeWidth: 2.5, color: teamColor };
      }

      // All others when something is highlighted
      return { opacity: 0.08, strokeWidth: 1, color: neutralColor };
    },
    [selectedTeam, hoveredTeam, isDark]
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
    // Always include start and end
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
    return `${weekLabel} · ${teamCount} teams · ${rankLabel}`;
  }, [startWeek, endWeek, maxWeek, visibleTeams.length, rankMode]);

  // ─── Highlighted teams for labels ───
  const highlightedTeams = useMemo(() => {
    const teams: string[] = [];
    if (selectedTeam && visibleTeamIds.has(selectedTeam)) teams.push(selectedTeam);
    if (hoveredTeam && hoveredTeam !== selectedTeam && visibleTeamIds.has(hoveredTeam)) {
      teams.push(hoveredTeam);
    }
    return teams;
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

  return (
    <div>
      <ChartHeader
        title="Season Rank Flow"
        subtitle={subtitle}
        description={
          <>
            Watch how the league table shifted week by week. Each line traces a team's
            ranking across the season — <strong>hover to isolate a team</strong>,
            click to lock it and see their inflection events. The tighter the lines
            cluster, the more competitive that stretch of the season was.
          </>
        }
        methods={
          <div className="space-y-2">
            <p>
              <strong>Data Source:</strong> 510 matches across 33 matchweeks from the
              2025 MLS season. Rankings computed from cumulative match results.
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
              changes. Each team's path connects 33 weekly rank positions.
            </p>
            <p>
              <strong>Inflection Detection:</strong> Events are auto-detected from match
              data — winning/losing streaks (3+ consecutive), unbeaten/winless runs (5+
              matches), rank surges/collapses (5+ position change in one week), upsets
              (10+ rank gap), and milestones (30/50 point thresholds). Severity scaled
              1-5 based on magnitude.
            </p>
            <p>
              <strong>Tier Bands:</strong> Background regions correspond to quartile
              breaks on the composite power score. Q3+ = Title Contenders, Q2-Q3 =
              Playoff, Q1-Q2 = Bubble, below Q1 = Rebuilding.
            </p>
          </div>
        }
      />

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          aria-label={`Bump chart showing ${visibleTeams.length} team rankings across weeks ${startWeek} to ${endWeek}`}
          role="img"
          onClick={handleSvgClick}
          style={{ minHeight: 350 }}
        >
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
              return (
                <TeamLine
                  key={team.id}
                  teamId={team.id}
                  pathD={pathD}
                  opacity={appearance.opacity}
                  strokeWidth={appearance.strokeWidth}
                  color={appearance.color}
                  isHighlighted={false}
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

          {/* Team name labels at endpoints */}
          {highlightedTeams.map((teamId) => {
            const label = getEndpointLabel(teamId);
            if (!label) return null;
            const teamColor = mutedTeamColor(teamId, isDark);
            return (
              <g key={`label-${teamId}`}>
                {/* Background pill */}
                <rect
                  x={label.x - 2}
                  y={label.y - 7}
                  width={label.name.length * 5.5 + 10}
                  height={14}
                  rx={4}
                  fill={isDark ? "rgba(20, 20, 34, 0.85)" : "rgba(255, 255, 255, 0.9)"}
                  stroke={hexToRgba(teamColor, 0.3)}
                  strokeWidth={0.5}
                />
                {/* Team name text */}
                <text
                  x={label.x + 3}
                  y={label.y + 3}
                  fill={teamColor}
                  fontSize={9}
                  fontWeight={700}
                  fontFamily="Space Grotesk, sans-serif"
                >
                  {label.name}
                </text>
              </g>
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
      />
    </div>
  );
}
