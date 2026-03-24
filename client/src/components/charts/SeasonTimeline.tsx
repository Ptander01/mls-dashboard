/**
 * SeasonTimeline.tsx — Narrative Timeline (Season Pulse Layer 3)
 *
 * A horizontal narrative timeline that expands below the bump chart when a
 * team is selected. Three stacked sections:
 *   A. Sticky Context Panel — team identity, key stats, mini sparkline
 *   B. Timeline Spine — SVG horizontal timeline with event nodes
 *   C. Narrative Cards — expandable detail area for events or summary
 *
 * X-axis alignment matches BumpChart.tsx (SVG viewBox 1200, same margins).
 * Supports variable-length seasons (2025 = 33 weeks, 2026 = 5 weeks).
 */

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Trophy,
  Info,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { getTeam } from "@/lib/mlsData";
import type { Team, Match } from "@/lib/mlsData";
import {
  getTeamTrajectory,
  getTeamEvents,
  getTeamWeeklyResults,
  type TeamWeekStanding,
  type SeasonEvent,
  type WeekMatchResult,
} from "@/lib/seasonPulse";
import { mutedTeamColor, hexToRgba } from "@/lib/chartUtils";
import { ChartHeader } from "@/components/ui/ChartHeader";
import {
  CardInsightToggle,
  CardInsightSection,
} from "@/components/CardInsight";
import type { CardInsightItem } from "@/components/CardInsight";
import {
  seasonNarrativeInsights,
  seasonPulseHeadline,
  seasonSummaryNarrative,
} from "@/lib/insightEngine";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface SeasonTimelineProps {
  teamId: string;
  selectedWeek: number;
  onSelectWeek: (week: number) => void;
  rankMode: "POWER" | "POINTS";
  teams: Team[];
  matches: Match[];
  totalWeeks: number;
}

// ═══════════════════════════════════════════
// CONSTANTS (matching BumpChart.tsx)
// ═══════════════════════════════════════════

const SVG_WIDTH = 1200;
const MARGIN = { left: 45, right: 120 };
const CHART_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
const TIMELINE_HEIGHT = 160;
const SPINE_Y = 55;
const RESULT_ROW_Y = SPINE_Y + 34; // Y position for match result chips

const EVENT_COLORS_DARK: Record<string, string> = {
  winning_streak: "#10b981",
  unbeaten_run: "#10b981",
  rank_surge: "#10b981",
  losing_streak: "#ef4444",
  winless_run: "#ef4444",
  rank_collapse: "#ef4444",
  upset_win: "#f59e0b",
  upset_loss: "#f59e0b",
  milestone: "#06b6d4",
};

const EVENT_COLORS_LIGHT: Record<string, string> = {
  winning_streak: "#059669",
  unbeaten_run: "#059669",
  rank_surge: "#059669",
  losing_streak: "#dc2626",
  winless_run: "#dc2626",
  rank_collapse: "#dc2626",
  upset_win: "#d97706",
  upset_loss: "#d97706",
  milestone: "#0891b2",
};

function getEventColor(type: string, isDark: boolean): string {
  return isDark
    ? EVENT_COLORS_DARK[type] || "#06b6d4"
    : EVENT_COLORS_LIGHT[type] || "#0891b2";
}

function getEventIcon(type: string) {
  switch (type) {
    case "winning_streak":
    case "unbeaten_run":
    case "rank_surge":
      return TrendingUp;
    case "losing_streak":
    case "winless_run":
    case "rank_collapse":
      return TrendingDown;
    case "upset_win":
    case "upset_loss":
      return Zap;
    case "milestone":
      return Trophy;
    default:
      return Info;
  }
}

function getEventAccent(type: string): CardInsightItem["accent"] {
  if (
    type === "winning_streak" ||
    type === "unbeaten_run" ||
    type === "rank_surge"
  )
    return "emerald";
  if (
    type === "losing_streak" ||
    type === "winless_run" ||
    type === "rank_collapse"
  )
    return "coral";
  if (type === "upset_win" || type === "upset_loss") return "amber";
  return "cyan";
}

// ═══════════════════════════════════════════
// FORM DOTS (inline version for narrative cards)
// ═══════════════════════════════════════════

function FormDots({
  form,
  isDark,
}: {
  form: ("W" | "D" | "L")[];
  isDark: boolean;
}) {
  const colors = {
    W: isDark ? "#10b981" : "#059669",
    D: isDark ? "#6b7280" : "#9ca3af",
    L: isDark ? "#ef4444" : "#dc2626",
  };

  return (
    <div className="flex items-center gap-1">
      {form.map((r, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            background: colors[r],
            boxShadow:
              r === "W"
                ? `0 0 4px ${colors.W}`
                : r === "L"
                  ? `0 0 4px ${colors.L}`
                  : "none",
          }}
          title={r === "W" ? "Win" : r === "D" ? "Draw" : "Loss"}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// MINI SPARKLINE
// ═══════════════════════════════════════════

function MiniSparkline({
  data,
  color,
  isDark,
}: {
  data: number[];
  color: string;
  isDark: boolean;
}) {
  if (data.length < 2) return null;

  const width = 120;
  const height = 20;
  const padding = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block"
      aria-label="Power score sparkline"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
      {/* End dot */}
      <circle
        cx={parseFloat(points.split(" ").pop()?.split(",")[0] || "0")}
        cy={parseFloat(points.split(" ").pop()?.split(",")[1] || "0")}
        r={2.5}
        fill={color}
        opacity={0.9}
      />
    </svg>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

export default function SeasonTimeline({
  teamId,
  selectedWeek,
  onSelectWeek,
  rankMode,
  teams,
  matches,
  totalWeeks,
}: SeasonTimelineProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [selectedEvent, setSelectedEvent] = useState<SeasonEvent | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<SeasonEvent | null>(null);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);
  const [hoveredResult, setHoveredResult] = useState<{ week: number; result: WeekMatchResult; x: number } | null>(null);
  const [showInsights, setShowInsights] = useState(false);

  const team = getTeam(teamId);
  const teamColor = mutedTeamColor(teamId, isDark);

  // Data
  const trajectory = useMemo(
    () => getTeamTrajectory(teamId, teams, matches, totalWeeks),
    [teamId, teams, matches, totalWeeks]
  );

  const events = useMemo(
    () => getTeamEvents(teamId, teams, matches, totalWeeks),
    [teamId, teams, matches, totalWeeks]
  );

  const weeklyResults = useMemo(
    () => getTeamWeeklyResults(teamId, teams, matches, totalWeeks),
    [teamId, teams, matches, totalWeeks]
  );

  const narrativeInsights = useMemo(
    () => seasonNarrativeInsights(teamId, teams, matches, totalWeeks),
    [teamId, teams, matches, totalWeeks]
  );

  const headline = useMemo(
    () => seasonPulseHeadline(teamId, teams, matches, totalWeeks),
    [teamId, teams, matches, totalWeeks]
  );

  const summaryNarrative = useMemo(
    () => seasonSummaryNarrative(teamId, teams, matches, totalWeeks),
    [teamId, teams, matches, totalWeeks]
  );

  // The week to display stats for (hovered week or selected week)
  const displayWeek = hoveredWeek ?? selectedWeek;
  const displayStanding = useMemo(() => {
    const idx = Math.min(displayWeek - 1, trajectory.length - 1);
    return trajectory[idx] || null;
  }, [displayWeek, trajectory]);

  // Power score data for sparkline
  const powerScores = useMemo(
    () => trajectory.map((w) => w.powerScore),
    [trajectory]
  );

  // Power score range for trend line normalization
  const powerRange = useMemo(() => {
    const scores = trajectory.map((w) => w.powerScore);
    return {
      min: Math.min(...scores),
      max: Math.max(...scores),
    };
  }, [trajectory]);

  // X scale: week number to SVG x position
  const weekToX = useCallback(
    (week: number) => {
      if (totalWeeks <= 1) return MARGIN.left;
      return MARGIN.left + ((week - 1) / (totalWeeks - 1)) * CHART_WIDTH;
    },
    [totalWeeks]
  );

  // Handle event click
  const handleEventClick = useCallback(
    (event: SeasonEvent) => {
      setSelectedEvent((prev) =>
        prev?.week === event.week && prev?.type === event.type ? null : event
      );
      onSelectWeek(event.week);
    },
    [onSelectWeek]
  );

  if (!team || !displayStanding) return null;

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  return (
    <div>
      {/* ─── CHART HEADER ─── */}
      <ChartHeader
        title={`${team.short}'s Season Story`}
        subtitle={`${events.length} inflection event${events.length !== 1 ? "s" : ""} across ${totalWeeks} weeks`}
        description={headline}
        methods={
          <div className="space-y-2">
            <p>
              <strong>Inflection Detection:</strong> Events are auto-detected
              from the weekly standings matrix using threshold-based rules.
            </p>
            <p>
              <strong>Streaks:</strong> Winning/losing streaks trigger at 3+
              consecutive results (severity scales with length: 3→2, 5→3, 7→4).
              Unbeaten/winless runs trigger at 5, 8, and 10 matches.
            </p>
            <p>
              <strong>Rank Changes:</strong> A surge or collapse is detected when
              a team's power rank changes by 5+ positions in a single week.
              Severity scales by <code>ceil(|change| / 3)</code>.
            </p>
            <p>
              <strong>Upsets:</strong> Detected when a team ranked 10+ positions
              lower beats a higher-ranked opponent (or vice versa). Severity
              scales by <code>ceil(rankGap / 5)</code>.
            </p>
            <p>
              <strong>Milestones:</strong> First win (if after Week 3), 30-point
              mark (traditional playoff threshold), and 50-point mark (elite
              territory).
            </p>
            <p>
              <strong>Power Score Trend:</strong> The background line traces the
              team's composite power score (0–100) across all weeks, normalized
              to the timeline height for visual context.
            </p>
          </div>
        }
        zone2Analysis={
          <CardInsightToggle
            isOpen={showInsights}
            onToggle={() => setShowInsights((v) => !v)}
            isDark={isDark}
          />
        }
      />

      {/* ─── CARD INSIGHTS ─── */}
      <CardInsightSection
        isOpen={showInsights}
        insights={narrativeInsights}
        isDark={isDark}
      />

      {/* ═══ A. STICKY CONTEXT PANEL ═══ */}
      <div
        className="rounded-xl p-3 mb-4"
        style={{
          background: isDark
            ? "rgba(255,255,255,0.02)"
            : "rgba(0,0,0,0.02)",
          border: `1px solid ${hexToRgba(teamColor, 0.15)}`,
          boxShadow: isDark
            ? "inset 2px 2px 6px rgba(0,0,0,0.3), inset -2px -2px 4px rgba(60,60,80,0.04)"
            : "inset 2px 2px 6px rgba(0,0,0,0.04), inset -2px -2px 4px rgba(255,255,255,0.5)",
        }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Team identity */}
          <div className="flex items-center gap-2 mr-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{
                background: teamColor,
                boxShadow: `0 0 8px ${hexToRgba(teamColor, 0.5)}`,
              }}
            />
            <span
              className="text-sm font-bold whitespace-nowrap"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                color: teamColor,
              }}
            >
              {team.name}
            </span>
          </div>

          {/* Divider */}
          <div
            className="w-px h-4 flex-shrink-0"
            style={{
              background: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.1)",
            }}
          />

          {/* Key stats */}
          <div className="flex items-center gap-3 flex-wrap">
            <StatChip
              label={`#${rankMode === "POWER" ? displayStanding.powerRank : displayStanding.pointsRank} ${rankMode === "POWER" ? "Power" : "Points"}`}
              accent={teamColor}
              isDark={isDark}
            />
            <StatChip
              label={`${displayStanding.wins}W ${displayStanding.draws}D ${displayStanding.losses}L`}
              isDark={isDark}
            />
            <StatChip
              label={`${displayStanding.goalDifference > 0 ? "+" : ""}${displayStanding.goalDifference} GD`}
              isDark={isDark}
            />
            <StatChip
              label={`${displayStanding.ppg.toFixed(2)} PPG`}
              isDark={isDark}
            />
            <StatChip
              label={displayStanding.tier}
              isDark={isDark}
            />
          </div>

          {/* Divider */}
          <div
            className="w-px h-4 flex-shrink-0"
            style={{
              background: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.1)",
            }}
          />

          {/* Mini sparkline */}
          <MiniSparkline
            data={powerScores}
            color={teamColor}
            isDark={isDark}
          />
        </div>
      </div>

      {/* ═══ B. TIMELINE SPINE ═══ */}
      <div className="w-full overflow-x-auto mb-4">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${TIMELINE_HEIGHT}`}
          className="w-full"
          style={{ minWidth: 600 }}
          aria-label={`Season timeline for ${team.name} showing ${events.length} inflection events`}
          role="img"
        >
          {/* Power score trend line (background) */}
          {trajectory.length >= 2 && (
            <polyline
              points={trajectory
                .map((w, i) => {
                  const x = weekToX(i + 1);
                  const range = powerRange.max - powerRange.min || 1;
                  const normalized =
                    (w.powerScore - powerRange.min) / range;
                  const y =
                    TIMELINE_HEIGHT - 10 - normalized * (TIMELINE_HEIGHT - 30);
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="none"
              stroke={teamColor}
              strokeWidth={1}
              opacity={0.15}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Spine line */}
          <line
            x1={MARGIN.left}
            y1={SPINE_Y}
            x2={SVG_WIDTH - MARGIN.right}
            y2={SPINE_Y}
            stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"}
            strokeWidth={2}
          />

          {/* Week ticks */}
          {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => {
            const x = weekToX(week);
            const showLabel =
              week === 1 ||
              week === totalWeeks ||
              (totalWeeks > 10 ? week % 5 === 0 : true);
            return (
              <g key={`tick-${week}`}>
                <line
                  x1={x}
                  y1={SPINE_Y - 4}
                  x2={x}
                  y2={SPINE_Y + 4}
                  stroke={
                    isDark
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(0,0,0,0.12)"
                  }
                  strokeWidth={1}
                />
                {showLabel && (
                  <text
                    x={x}
                    y={SPINE_Y + 18}
                    textAnchor="middle"
                    fill={
                      isDark
                        ? "rgba(255,255,255,0.35)"
                        : "rgba(0,0,0,0.35)"
                    }
                    fontSize={10}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    W{week}
                  </text>
                )}
              </g>
            );
          })}

          {/* Selected week indicator */}
          <line
            x1={weekToX(selectedWeek)}
            y1={8}
            x2={weekToX(selectedWeek)}
            y2={TIMELINE_HEIGHT - 8}
            stroke={teamColor}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.5}
          />

          {/* Event nodes */}
          {events.map((event, i) => {
            const x = weekToX(event.week);
            const r = event.severity * 2 + 3;
            const color = getEventColor(event.type, isDark);
            const isHovered =
              hoveredEvent?.week === event.week &&
              hoveredEvent?.type === event.type;
            const isSelected =
              selectedEvent?.week === event.week &&
              selectedEvent?.type === event.type;

            return (
              <g
                key={`event-${i}`}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => {
                  setHoveredEvent(event);
                  setHoveredWeek(event.week);
                }}
                onMouseLeave={() => {
                  setHoveredEvent(null);
                  setHoveredWeek(null);
                }}
                onClick={() => handleEventClick(event)}
              >
                {/* Glow */}
                <circle
                  cx={x}
                  cy={SPINE_Y}
                  r={r + 2}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                  opacity={isHovered || isSelected ? 0.5 : 0.2}
                />
                {/* Main node */}
                <circle
                  cx={x}
                  cy={SPINE_Y}
                  r={isHovered ? r * 1.3 : r}
                  fill={color}
                  opacity={isSelected ? 1 : 0.85}
                  style={{
                    filter: `drop-shadow(0 0 ${event.severity * 2}px ${color})`,
                    transition: "r 0.2s ease, opacity 0.2s ease",
                  }}
                />
                {/* Severity indicator (inner dot for high severity) */}
                {event.severity >= 4 && (
                  <circle
                    cx={x}
                    cy={SPINE_Y}
                    r={2}
                    fill={isDark ? "#1a1a2e" : "#ffffff"}
                    opacity={0.8}
                  />
                )}
              </g>
            );
          })}

          {/* ─── Match result chips below spine ─── */}
          {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => {
            const results = weeklyResults.get(week);
            if (!results || results.length === 0) return null;
            const x = weekToX(week);
            const m = results[0]; // primary match for the week
            const chipW = 36;
            const chipH = 14;
            const resultColor =
              m.result === "W"
                ? isDark ? "#10b981" : "#059669"
                : m.result === "L"
                  ? isDark ? "#ef4444" : "#dc2626"
                  : isDark ? "#6b7280" : "#9ca3af";
            const chipBg =
              m.result === "W"
                ? isDark ? "rgba(16,185,129,0.12)" : "rgba(5,150,105,0.08)"
                : m.result === "L"
                  ? isDark ? "rgba(239,68,68,0.12)" : "rgba(220,38,38,0.08)"
                  : isDark ? "rgba(107,114,128,0.12)" : "rgba(156,163,175,0.08)";
            const isHoveredChip = hoveredResult?.week === week;
            return (
              <g
                key={`result-${week}`}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredResult({ week, result: m, x })}
                onMouseLeave={() => setHoveredResult(null)}
                onClick={() => onSelectWeek(week)}
              >
                <rect
                  x={x - chipW / 2}
                  y={RESULT_ROW_Y - chipH / 2}
                  width={chipW}
                  height={chipH}
                  rx={4}
                  fill={chipBg}
                  stroke={resultColor}
                  strokeWidth={isHoveredChip ? 1.2 : 0.5}
                  opacity={isHoveredChip ? 1 : 0.85}
                />
                <text
                  x={x}
                  y={RESULT_ROW_Y + 3.5}
                  textAnchor="middle"
                  fill={resultColor}
                  fontSize={8}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight={600}
                >
                  {m.goalsFor}-{m.goalsAgainst}
                </text>
              </g>
            );
          })}

          {/* ─── Match result tooltip ─── */}
          {hoveredResult && (() => {
            const m = hoveredResult.result;
            const tooltipW = 180;
            const tooltipH = 52;
            const tx = Math.max(
              MARGIN.left + tooltipW / 2,
              Math.min(hoveredResult.x, SVG_WIDTH - MARGIN.right - tooltipW / 2)
            );
            const ty = RESULT_ROW_Y + 14;
            const resultColor =
              m.result === "W"
                ? isDark ? "#10b981" : "#059669"
                : m.result === "L"
                  ? isDark ? "#ef4444" : "#dc2626"
                  : isDark ? "#6b7280" : "#9ca3af";
            return (
              <foreignObject
                x={tx - tooltipW / 2}
                y={ty}
                width={tooltipW}
                height={tooltipH + 10}
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
                    padding: "6px 10px",
                    maxWidth: tooltipW,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "Space Grotesk, sans-serif",
                      color: resultColor,
                      marginBottom: 2,
                    }}
                  >
                    {m.result === "W" ? "Win" : m.result === "L" ? "Loss" : "Draw"}{" "}
                    {m.isHome ? "vs" : "@"} {m.opponentShort}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      fontFamily: "JetBrains Mono, monospace",
                      color: "var(--glass-text-muted)",
                      lineHeight: 1.4,
                    }}
                  >
                    {m.goalsFor}-{m.goalsAgainst} · {m.isHome ? "Home" : "Away"} · W{m.week} · {m.date}
                  </div>
                </div>
              </foreignObject>
            );
          })()}

          {/* Tooltip for hovered event */}
          {hoveredEvent && (
            <g>
              <rect
                x={Math.min(
                  weekToX(hoveredEvent.week) - 80,
                  SVG_WIDTH - MARGIN.right - 160
                )}
                y={SPINE_Y - 45}
                width={160}
                height={24}
                rx={6}
                fill={isDark ? "#1e1e3a" : "#f0f0f8"}
                stroke={
                  isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.08)"
                }
                strokeWidth={1}
                opacity={0.95}
              />
              <text
                x={Math.min(
                  weekToX(hoveredEvent.week),
                  SVG_WIDTH - MARGIN.right - 80
                )}
                y={SPINE_Y - 29}
                textAnchor="middle"
                fill={isDark ? "#e2e2f0" : "#2a2a3a"}
                fontSize={10}
                fontFamily="Space Grotesk, sans-serif"
                fontWeight={600}
              >
                {hoveredEvent.title}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* ═══ C. NARRATIVE CARDS ═══ */}
      <AnimatePresence mode="wait">
        {selectedEvent ? (
          <EventCard
            key={`event-${selectedEvent.week}-${selectedEvent.type}`}
            event={selectedEvent}
            trajectory={trajectory}
            teamColor={teamColor}
            isDark={isDark}
          />
        ) : (
          <SummaryCard
            key="summary"
            narrative={summaryNarrative}
            teamColor={teamColor}
            isDark={isDark}
            eventCount={events.length}
          />
        )}
      </AnimatePresence>

      {/* Empty state */}
      {events.length === 0 && (
        <div
          className="text-center py-6 text-sm text-muted-foreground"
          style={{ fontFamily: "Space Grotesk, sans-serif" }}
        >
          No major inflection events detected yet.
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// STAT CHIP
// ═══════════════════════════════════════════

function StatChip({
  label,
  accent,
  isDark,
}: {
  label: string;
  accent?: string;
  isDark: boolean;
}) {
  return (
    <span
      className="text-[11px] font-medium whitespace-nowrap"
      style={{
        fontFamily: "JetBrains Mono, monospace",
        color: accent || (isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)"),
      }}
    >
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════
// EVENT CARD
// ═══════════════════════════════════════════

function EventCard({
  event,
  trajectory,
  teamColor,
  isDark,
}: {
  event: SeasonEvent;
  trajectory: TeamWeekStanding[];
  teamColor: string;
  isDark: boolean;
}) {
  const Icon = getEventIcon(event.type);
  const color = getEventColor(event.type, isDark);

  // Before/after stats
  const beforeIdx = Math.max(0, event.week - 2);
  const afterIdx = Math.min(trajectory.length - 1, event.week - 1);
  const before = trajectory[beforeIdx];
  const after = trajectory[afterIdx];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div
        className="rounded-xl p-4"
        style={{
          borderLeft: `3px solid ${teamColor}`,
          background: isDark
            ? "rgba(255,255,255,0.02)"
            : "rgba(0,0,0,0.015)",
          boxShadow: isDark
            ? "2px 2px 8px rgba(0,0,0,0.3), -1px -1px 4px rgba(60,60,80,0.05)"
            : "2px 2px 8px rgba(0,0,0,0.06), -1px -1px 4px rgba(255,255,255,0.6)",
        }}
        role="listitem"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon size={16} style={{ color }} />
            <span
              className="text-sm font-bold"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                color,
              }}
            >
              {event.title}
            </span>
          </div>
          <span
            className="text-[10px] text-muted-foreground"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            Week {event.week}
          </span>
        </div>

        {/* Description */}
        <p
          className="text-[11px] text-muted-foreground leading-relaxed mb-3"
          style={{ fontFamily: "Space Grotesk, sans-serif" }}
        >
          {event.description}
        </p>

        {/* Before/After stats */}
        {before && after && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] text-muted-foreground"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                Before:
              </span>
              <span
                className="text-[11px] font-medium"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                #{before.powerRank} ({before.powerScore.toFixed(1)} power)
              </span>
            </div>
            <span
              className="text-muted-foreground"
              style={{ fontSize: 11 }}
            >
              →
            </span>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] text-muted-foreground"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                After:
              </span>
              <span
                className="text-[11px] font-medium"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  color,
                }}
              >
                #{after.powerRank} ({after.powerScore.toFixed(1)} power)
              </span>
            </div>

            {/* Form dots */}
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] text-muted-foreground"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                Form:
              </span>
              <FormDots form={after.form} isDark={isDark} />
            </div>

            {/* PPG change */}
            <div className="flex items-center gap-1">
              <span
                className="text-[10px] text-muted-foreground"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                PPG:
              </span>
              <span
                className="text-[11px]"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                {before.ppg.toFixed(2)} → {after.ppg.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════
// SUMMARY CARD
// ═══════════════════════════════════════════

function SummaryCard({
  narrative,
  teamColor,
  isDark,
  eventCount,
}: {
  narrative: string;
  teamColor: string;
  isDark: boolean;
  eventCount: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div
        className="rounded-xl p-4"
        style={{
          borderLeft: `3px solid ${teamColor}`,
          background: isDark
            ? "rgba(255,255,255,0.02)"
            : "rgba(0,0,0,0.015)",
          boxShadow: isDark
            ? "2px 2px 8px rgba(0,0,0,0.3), -1px -1px 4px rgba(60,60,80,0.05)"
            : "2px 2px 8px rgba(0,0,0,0.06), -1px -1px 4px rgba(255,255,255,0.6)",
        }}
        role="listitem"
      >
        <div className="flex items-center gap-2 mb-2">
          <Info
            size={14}
            style={{
              color: isDark
                ? "rgba(255,255,255,0.4)"
                : "rgba(0,0,0,0.35)",
            }}
          />
          <span
            className="text-[10px] uppercase tracking-wider text-muted-foreground"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            Season Summary
            {eventCount > 0 && (
              <span className="ml-2 normal-case tracking-normal">
                — click an event node above for details
              </span>
            )}
          </span>
        </div>
        <p
          className="text-[12px] leading-relaxed"
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            color: isDark
              ? "rgba(255,255,255,0.7)"
              : "rgba(0,0,0,0.6)",
          }}
        >
          {narrative}
        </p>
      </div>
    </motion.div>
  );
}
