/**
 * SeasonPulse.tsx — Season Pulse Tab Container
 *
 * Session 1 deliverable: Snapshot Table (Layer 1) with week selector,
 * conference filter, rank-by toggle, and tier groupings.
 *
 * Layers 2 (Bump Chart) and 3 (Narrative Timeline) will be added
 * in Sessions 2 and 3 respectively.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Play,
  Pause,
  SkipForward,
  SkipBack,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useFilters } from "@/contexts/FilterContext";
import { TEAMS, getTeam } from "@/lib/mlsData";
import {
  getWeekStandings,
  getLatestWeek,
  getMaxWeek,
  type TeamWeekStanding,
} from "@/lib/seasonPulse";
import { mutedTeamColor, hexToRgba } from "@/lib/chartUtils";
import NeuCard from "@/components/NeuCard";
import { ChartHeader } from "@/components/ui/ChartHeader";
import StaggerContainer, { StaggerItem } from "@/components/StaggerContainer";

// ═══════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════

type ConferenceFilter = "ALL" | "EASTERN" | "WESTERN";
type RankMode = "POWER" | "POINTS";

const TIER_COLORS = {
  "Title Contenders": { dark: "rgba(0, 212, 255, 0.06)", light: "rgba(8, 145, 178, 0.05)" },
  Playoff: { dark: "rgba(16, 185, 129, 0.05)", light: "rgba(16, 185, 129, 0.04)" },
  Bubble: { dark: "rgba(245, 158, 11, 0.05)", light: "rgba(245, 158, 11, 0.04)" },
  Rebuilding: { dark: "rgba(239, 68, 68, 0.04)", light: "rgba(239, 68, 68, 0.03)" },
};

const TIER_BORDER_COLORS = {
  "Title Contenders": { dark: "rgba(0, 212, 255, 0.15)", light: "rgba(8, 145, 178, 0.12)" },
  Playoff: { dark: "rgba(16, 185, 129, 0.12)", light: "rgba(16, 185, 129, 0.10)" },
  Bubble: { dark: "rgba(245, 158, 11, 0.12)", light: "rgba(245, 158, 11, 0.10)" },
  Rebuilding: { dark: "rgba(239, 68, 68, 0.10)", light: "rgba(239, 68, 68, 0.08)" },
};

const TIER_LABEL_COLORS = {
  "Title Contenders": "var(--cyan)",
  Playoff: "var(--emerald)",
  Bubble: "var(--amber)",
  Rebuilding: "var(--coral)",
};

// ═══════════════════════════════════════════
// FORM DOT COMPONENT
// ═══════════════════════════════════════════

function FormDots({ form, isDark }: { form: ("W" | "D" | "L")[]; isDark: boolean }) {
  const colors = {
    W: isDark ? "#10b981" : "#059669",
    D: isDark ? "#6b7280" : "#9ca3af",
    L: isDark ? "#ef4444" : "#dc2626",
  };

  return (
    <div className="flex items-center gap-[3px]">
      {form.map((r, i) => (
        <div
          key={i}
          className="w-[7px] h-[7px] rounded-full"
          style={{
            background: colors[r],
            boxShadow: r === "W"
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
// POWER BAR COMPONENT
// ═══════════════════════════════════════════

function PowerBar({
  score,
  maxScore,
  color,
  isDark,
}: {
  score: number;
  maxScore: number;
  color: string;
  isDark: boolean;
}) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return (
    <div
      className="relative h-[6px] rounded-full overflow-hidden"
      style={{
        width: "60px",
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      }}
    >
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          background: color,
          boxShadow: `0 0 6px ${hexToRgba(color, 0.4)}`,
        }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// RANK DELTA BADGE
// ═══════════════════════════════════════════

function RankDelta({ delta, isDark }: { delta: number; isDark: boolean }) {
  if (delta === 0) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] font-mono"
        style={{ color: isDark ? "#6b7280" : "#9ca3af" }}
      >
        <Minus size={10} />
      </span>
    );
  }

  const isUp = delta > 0;
  const color = isUp
    ? isDark ? "#10b981" : "#059669"
    : isDark ? "#ef4444" : "#dc2626";

  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold"
      style={{ color }}
    >
      {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {Math.abs(delta)}
    </span>
  );
}

// ═══════════════════════════════════════════
// CONFERENCE TOGGLE
// ═══════════════════════════════════════════

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  isDark,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  isDark: boolean;
}) {
  return (
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
            className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              background: isActive
                ? isDark
                  ? "rgba(0, 212, 255, 0.12)"
                  : "rgba(8, 145, 178, 0.10)"
                : "transparent",
              color: isActive ? "var(--cyan)" : "var(--muted-foreground)",
              boxShadow: isActive
                ? isDark
                  ? "0 1px 3px rgba(0,0,0,0.3), 0 0 8px rgba(0,212,255,0.1)"
                  : "0 1px 3px rgba(0,0,0,0.08), 0 0 8px rgba(8,145,178,0.08)"
                : "none",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// WEEK SELECTOR
// ═══════════════════════════════════════════

function WeekSelector({
  week,
  maxWeek,
  onChange,
  isDark,
}: {
  week: number;
  maxWeek: number;
  onChange: (w: number) => void;
  isDark: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(1, week - 1))}
        disabled={week <= 1}
        className="p-1 rounded-md transition-all disabled:opacity-30"
        style={{
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
        }}
      >
        <SkipBack size={12} />
      </button>

      <div className="relative">
        <select
          value={week}
          onChange={(e) => onChange(Number(e.target.value))}
          className="appearance-none pl-2.5 pr-7 py-1 rounded-lg text-[11px] font-mono font-semibold cursor-pointer"
          style={{
            fontFamily: "JetBrains Mono, monospace",
            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
            color: "var(--foreground)",
          }}
        >
          {Array.from({ length: maxWeek }, (_, i) => i + 1).map((w) => (
            <option key={w} value={w}>
              Week {w}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--muted-foreground)" }}
        />
      </div>

      <button
        onClick={() => onChange(Math.min(maxWeek, week + 1))}
        disabled={week >= maxWeek}
        className="p-1 rounded-md transition-all disabled:opacity-30"
        style={{
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
        }}
      >
        <SkipForward size={12} />
      </button>

      {/* Week slider */}
      <input
        type="range"
        min={1}
        max={maxWeek}
        value={week}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
        style={{
          background: isDark
            ? `linear-gradient(to right, var(--cyan) ${((week - 1) / (maxWeek - 1)) * 100}%, rgba(255,255,255,0.1) ${((week - 1) / (maxWeek - 1)) * 100}%)`
            : `linear-gradient(to right, var(--cyan) ${((week - 1) / (maxWeek - 1)) * 100}%, rgba(0,0,0,0.1) ${((week - 1) / (maxWeek - 1)) * 100}%)`,
          minWidth: "120px",
          accentColor: "var(--cyan)",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// TIER SEPARATOR
// ═══════════════════════════════════════════

function TierSeparator({
  tier,
  isDark,
}: {
  tier: TeamWeekStanding["tier"];
  isDark: boolean;
}) {
  return (
    <tr>
      <td
        colSpan={9}
        className="py-1 px-3"
        style={{
          borderTop: `1px solid ${TIER_BORDER_COLORS[tier][isDark ? "dark" : "light"]}`,
        }}
      >
        <span
          className="text-[9px] font-semibold uppercase tracking-widest"
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            color: TIER_LABEL_COLORS[tier],
            opacity: 0.8,
          }}
        >
          {tier}
        </span>
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

export default function SeasonPulse() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { filters, filteredTeams } = useFilters();

  // Shared state for all three layers
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(getLatestWeek());
  const [conferenceFilter, setConferenceFilter] = useState<ConferenceFilter>("ALL");
  const [rankMode, setRankMode] = useState<RankMode>("POWER");
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);

  const maxWeek = getMaxWeek();

  // Auto-select team when exactly one team is filtered globally
  useEffect(() => {
    if (filters.selectedTeams.length === 1) {
      setSelectedTeam(filters.selectedTeams[0]);
    }
  }, [filters.selectedTeams]);

  // Get standings for selected week
  const weekStandings = useMemo(() => {
    return getWeekStandings(selectedWeek);
  }, [selectedWeek]);

  // Apply conference filter
  const filteredStandings = useMemo(() => {
    let standings = [...weekStandings];

    if (conferenceFilter !== "ALL") {
      const conf = conferenceFilter === "EASTERN" ? "Eastern" : "Western";
      standings = standings.filter((s) => {
        const team = getTeam(s.teamId);
        return team?.conference === conf;
      });
    }

    // Re-sort based on rank mode
    if (rankMode === "POINTS") {
      standings.sort((a, b) => a.pointsRank - b.pointsRank);
    } else {
      standings.sort((a, b) => a.powerRank - b.powerRank);
    }

    return standings;
  }, [weekStandings, conferenceFilter, rankMode]);

  // Max power score for bar normalization
  const maxPowerScore = useMemo(() => {
    return Math.max(...filteredStandings.map((s) => s.powerScore), 1);
  }, [filteredStandings]);

  // Group standings by tier for separators
  const standingsWithTiers = useMemo(() => {
    const result: { standing: TeamWeekStanding; showTierSep: boolean; tier: TeamWeekStanding["tier"] }[] = [];
    let lastTier: TeamWeekStanding["tier"] | null = null;

    for (const s of filteredStandings) {
      const showTierSep = s.tier !== lastTier;
      result.push({ standing: s, showTierSep, tier: s.tier });
      lastTier = s.tier;
    }

    return result;
  }, [filteredStandings]);

  const handleTeamClick = useCallback(
    (teamId: string) => {
      setSelectedTeam((prev) => (prev === teamId ? null : teamId));
    },
    []
  );

  // Dynamic headline
  const headline = useMemo(() => {
    if (filteredStandings.length === 0) return "";
    const top = filteredStandings[0];
    const topTeam = getTeam(top.teamId);
    const topName = topTeam?.short || top.teamId;

    if (selectedWeek < maxWeek) {
      return `Week ${selectedWeek} snapshot: ${topName} lead the ${rankMode === "POWER" ? "power rankings" : "points table"} with ${top.points} points from ${top.played} matches (${top.ppg.toFixed(2)} PPG). The composite power score weights current form, goal difference, and momentum — not just accumulated points.`;
    }

    const bottom = filteredStandings[filteredStandings.length - 1];
    const bottomTeam = getTeam(bottom.teamId);
    const bottomName = bottomTeam?.short || bottom.teamId;
    const gap = (top.powerScore - bottom.powerScore).toFixed(1);

    return `End-of-season rankings: ${topName} finish atop the ${rankMode === "POWER" ? "power rankings" : "points table"} with a ${gap}-point power score gap over last-place ${bottomName}. The composite score rewards teams that are hot and balanced — not just those who accumulated points early.`;
  }, [filteredStandings, selectedWeek, maxWeek, rankMode]);

  return (
    <div className="space-y-4 pt-4">
      <StaggerContainer className="space-y-4">
        {/* ═══ SNAPSHOT TABLE (Layer 1) ═══ */}
        <StaggerItem>
          <NeuCard className="p-4 md:p-5">
            <ChartHeader
              title="Season Pulse — Power Rankings"
              subtitle={`Week ${selectedWeek} of ${maxWeek} · ${filteredStandings.length} teams`}
              description={headline}
              methods={
                <div className="space-y-2">
                  <p>
                    <strong>Data Source:</strong> 510 matches across 33 matchweeks
                    from the 2025 MLS season. All statistics are computed
                    cumulatively from match results (homeGoals, awayGoals, week).
                  </p>
                  <p>
                    <strong>Composite Power Score (0–100):</strong>
                  </p>
                  <p className="pl-2">
                    Score = 0.35 × PPG_norm + 0.25 × Form + 0.20 × GD_norm +
                    0.10 × Consistency + 0.10 × Momentum
                  </p>
                  <p className="pl-2">
                    Where PPG_norm and GD_norm are min-max normalized across all
                    teams at the given week. Form = points from last 5 results /
                    max possible (15), scaled to 0–100. Consistency = 100 −
                    |homePPG − awayPPG| / 3 × 100. Momentum = (recentPPG /
                    overallPPG) × 50, clamped to [0, 100].
                  </p>
                  <p>
                    <strong>Tier Groupings:</strong> Quartile breaks on the
                    composite score. Q3+ = Title Contenders, Q2–Q3 = Playoff,
                    Q1–Q2 = Bubble, below Q1 = Rebuilding.
                  </p>
                  <p>
                    <strong>Rank Delta (Δ):</strong> Change in power rank from
                    the previous matchweek. Positive = improved, negative =
                    dropped.
                  </p>
                  <p>
                    <strong>Form Dots:</strong> Last 5 results (most recent
                    first). Green = Win, Gray = Draw, Red = Loss.
                  </p>
                </div>
              }
              rightAction={
                <div className="flex items-center gap-3 flex-wrap">
                  <ToggleGroup
                    options={[
                      { value: "ALL" as ConferenceFilter, label: "All" },
                      { value: "EASTERN" as ConferenceFilter, label: "East" },
                      { value: "WESTERN" as ConferenceFilter, label: "West" },
                    ]}
                    value={conferenceFilter}
                    onChange={setConferenceFilter}
                    isDark={isDark}
                  />
                  <ToggleGroup
                    options={[
                      { value: "POWER" as RankMode, label: "Power" },
                      { value: "POINTS" as RankMode, label: "Points" },
                    ]}
                    value={rankMode}
                    onChange={setRankMode}
                    isDark={isDark}
                  />
                </div>
              }
            />

            {/* Week Selector */}
            <div className="mb-4">
              <WeekSelector
                week={selectedWeek}
                maxWeek={maxWeek}
                onChange={setSelectedWeek}
                isDark={isDark}
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                    }}
                  >
                    <th className="text-left py-2 px-2 font-semibold text-muted-foreground w-8">#</th>
                    <th className="text-center py-2 px-1 font-semibold text-muted-foreground w-10">Δ</th>
                    <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Team</th>
                    <th className="text-center py-2 px-2 font-semibold text-muted-foreground">P</th>
                    <th className="text-center py-2 px-2 font-semibold text-muted-foreground">W-D-L</th>
                    <th className="text-center py-2 px-2 font-semibold text-muted-foreground">GD</th>
                    <th className="text-center py-2 px-2 font-semibold text-muted-foreground">PPG</th>
                    <th className="text-center py-2 px-2 font-semibold text-muted-foreground">Form</th>
                    <th className="text-center py-2 px-2 font-semibold text-muted-foreground">
                      {rankMode === "POWER" ? "Power" : "Pts"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {standingsWithTiers.map(({ standing: s, showTierSep, tier }, idx) => {
                    const team = getTeam(s.teamId);
                    if (!team) return null;

                    const isSelected = selectedTeam === s.teamId;
                    const isHovered = hoveredTeam === s.teamId;
                    const isDeemphasized =
                      (selectedTeam !== null || hoveredTeam !== null) &&
                      !isSelected &&
                      !isHovered;

                    const teamColor = mutedTeamColor(s.teamId, isDark);
                    const displayRank = rankMode === "POWER" ? s.powerRank : s.pointsRank;
                    const tierBg = TIER_COLORS[tier][isDark ? "dark" : "light"];

                    return (
                      <AnimatePresence key={s.teamId} mode="wait">
                        {showTierSep && idx > 0 && (
                          <TierSeparator tier={tier} isDark={isDark} />
                        )}
                        <motion.tr
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{
                            opacity: isDeemphasized ? 0.35 : 1,
                            y: 0,
                            scale: isSelected ? 1.005 : 1,
                          }}
                          transition={{ duration: 0.2 }}
                          onClick={() => handleTeamClick(s.teamId)}
                          onMouseEnter={() => setHoveredTeam(s.teamId)}
                          onMouseLeave={() => setHoveredTeam(null)}
                          className="cursor-pointer transition-colors"
                          style={{
                            background: isSelected
                              ? hexToRgba(teamColor, isDark ? 0.15 : 0.1)
                              : isHovered
                                ? hexToRgba(teamColor, isDark ? 0.08 : 0.05)
                                : tierBg,
                            borderLeft: isSelected
                              ? `3px solid ${teamColor}`
                              : "3px solid transparent",
                          }}
                        >
                          {/* Rank */}
                          <td className="py-2 px-2 font-bold" style={{ color: teamColor }}>
                            {displayRank}
                          </td>

                          {/* Delta */}
                          <td className="py-2 px-1 text-center">
                            <RankDelta delta={s.rankDelta} isDark={isDark} />
                          </td>

                          {/* Team */}
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{
                                  background: teamColor,
                                  boxShadow: `0 0 4px ${hexToRgba(teamColor, 0.5)}`,
                                }}
                              />
                              <span
                                className="font-semibold truncate"
                                style={{
                                  fontFamily: "Space Grotesk, sans-serif",
                                  color: isSelected ? teamColor : "var(--foreground)",
                                }}
                              >
                                {team.short}
                              </span>
                              <span
                                className="text-[9px] px-1 rounded"
                                style={{
                                  color: "var(--muted-foreground)",
                                  opacity: 0.6,
                                }}
                              >
                                {team.conference === "Eastern" ? "E" : "W"}
                              </span>
                            </div>
                          </td>

                          {/* Points */}
                          <td className="py-2 px-2 text-center font-bold">
                            {s.points}
                          </td>

                          {/* W-D-L */}
                          <td className="py-2 px-2 text-center text-muted-foreground">
                            {s.wins}-{s.draws}-{s.losses}
                          </td>

                          {/* GD */}
                          <td
                            className="py-2 px-2 text-center font-semibold"
                            style={{
                              color:
                                s.goalDifference > 0
                                  ? isDark ? "#10b981" : "#059669"
                                  : s.goalDifference < 0
                                    ? isDark ? "#ef4444" : "#dc2626"
                                    : "var(--muted-foreground)",
                            }}
                          >
                            {s.goalDifference > 0 ? "+" : ""}
                            {s.goalDifference}
                          </td>

                          {/* PPG */}
                          <td className="py-2 px-2 text-center">
                            {s.ppg.toFixed(2)}
                          </td>

                          {/* Form */}
                          <td className="py-2 px-2">
                            <div className="flex justify-center">
                              <FormDots form={s.form} isDark={isDark} />
                            </div>
                          </td>

                          {/* Power Score / Points */}
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-center gap-2">
                              <PowerBar
                                score={rankMode === "POWER" ? s.powerScore : s.points}
                                maxScore={rankMode === "POWER" ? maxPowerScore : Math.max(...filteredStandings.map((x) => x.points), 1)}
                                color={teamColor}
                                isDark={isDark}
                              />
                              <span className="text-[10px] text-muted-foreground w-8 text-right">
                                {rankMode === "POWER" ? s.powerScore.toFixed(1) : s.points}
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      </AnimatePresence>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Selected team summary */}
            <AnimatePresence>
              {selectedTeam && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <SelectedTeamSummary
                    teamId={selectedTeam}
                    week={selectedWeek}
                    standings={weekStandings}
                    isDark={isDark}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </NeuCard>
        </StaggerItem>

        {/* Placeholder for Layer 2: Bump Chart (Session 2) */}
        {/* Placeholder for Layer 3: Narrative Timeline (Session 3) */}
      </StaggerContainer>
    </div>
  );
}

// ═══════════════════════════════════════════
// SELECTED TEAM SUMMARY PANEL
// ═══════════════════════════════════════════

function SelectedTeamSummary({
  teamId,
  week,
  standings,
  isDark,
}: {
  teamId: string;
  week: number;
  standings: TeamWeekStanding[];
  isDark: boolean;
}) {
  const team = getTeam(teamId);
  const standing = standings.find((s) => s.teamId === teamId);
  if (!team || !standing) return null;

  const teamColor = mutedTeamColor(teamId, isDark);

  const stats = [
    { label: "Power Rank", value: `#${standing.powerRank}`, accent: true },
    { label: "Points Rank", value: `#${standing.pointsRank}`, accent: false },
    { label: "Record", value: `${standing.wins}W ${standing.draws}D ${standing.losses}L`, accent: false },
    { label: "Points", value: `${standing.points}`, accent: false },
    { label: "PPG", value: standing.ppg.toFixed(2), accent: false },
    { label: "Goal Diff", value: `${standing.goalDifference > 0 ? "+" : ""}${standing.goalDifference}`, accent: false },
    { label: "Home", value: `${standing.homeWins}W ${standing.homeDraws}D ${standing.homeLosses}L`, accent: false },
    { label: "Away", value: `${standing.awayWins}W ${standing.awayDraws}D ${standing.awayLosses}L`, accent: false },
    { label: "Power Score", value: standing.powerScore.toFixed(1), accent: true },
    { label: "Tier", value: standing.tier, accent: false },
  ];

  return (
    <div
      className="mt-4 p-4 rounded-xl"
      style={{
        background: isDark
          ? "rgba(255,255,255,0.02)"
          : "rgba(0,0,0,0.02)",
        border: `1px solid ${hexToRgba(teamColor, 0.2)}`,
        boxShadow: isDark
          ? "inset 2px 2px 6px rgba(0,0,0,0.3), inset -2px -2px 4px rgba(60,60,80,0.04)"
          : "inset 2px 2px 6px rgba(0,0,0,0.04), inset -2px -2px 4px rgba(255,255,255,0.5)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-3 h-3 rounded-full"
          style={{
            background: teamColor,
            boxShadow: `0 0 8px ${hexToRgba(teamColor, 0.5)}`,
          }}
        />
        <span
          className="text-sm font-bold"
          style={{ fontFamily: "Space Grotesk, sans-serif", color: teamColor }}
        >
          {team.name}
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
          Week {week} · {team.conference} Conference
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div
              className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              {stat.label}
            </div>
            <div
              className="text-[13px] font-bold"
              style={{
                fontFamily: "JetBrains Mono, monospace",
                color: stat.accent ? teamColor : "var(--foreground)",
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
