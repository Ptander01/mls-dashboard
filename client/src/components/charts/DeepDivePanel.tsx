/**
 * DeepDivePanel — Squad Construction & Salary Analysis
 *
 * Collapsed panel toggled by a "DEEP DIVE — Squad Construction & Salary Analysis" button.
 * Three sub-panels with staggered Framer Motion entrance animations:
 *   Panel 1: Squad depth breakdown (minutes HHI horizontal bars)
 *   Panel 2: Salary concentration vs road performance scatter
 *   Panel 3: Age distribution stacked bars (U23 / 23-29 / 30+)
 *
 * Integrates insight generator functions from resilienceUtils.ts and insightEngine.ts.
 */

import { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import {
  mutedTeamColor,
  lighten,
  darken,
  hexToRgba,
  linearRegression,
} from "@/lib/chartUtils";
import type { TeamResilienceMetrics } from "@/lib/resilienceUtils";
import { TEAMS, PLAYERS, TEAM_BUDGETS, getTeam } from "@/lib/mlsData";
import type { Player, Team } from "@/lib/mlsData";
import {
  ChevronDown,
  ChevronUp,
  Layers,
  DollarSign,
  Users,
} from "lucide-react";

interface DeepDivePanelProps {
  metrics: TeamResilienceMetrics[];
  players: Player[];
  teams: Team[];
}

// ═══════════════════════════════════════════
// INSIGHT GENERATORS
// ═══════════════════════════════════════════

function squadDepthInsights(metrics: TeamResilienceMetrics[]): string {
  if (metrics.length < 5) return "";
  const sorted = [...metrics].sort(
    (a, b) => b.squadDepthIndex - a.squadDepthIndex
  );
  const deepest = sorted[0];
  const shallowest = sorted[sorted.length - 1];
  return `${deepest.teamShort} leads with a ${deepest.squadDepthIndex.toFixed(1)} Gini index, distributing minutes most evenly across their top 15. ${shallowest.teamShort} sits at ${shallowest.squadDepthIndex.toFixed(1)} — the most top-heavy rotation in the league.`;
}

function salaryRoadInsights(
  metrics: TeamResilienceMetrics[],
  teams: Team[]
): string {
  if (metrics.length < 5) return "";
  const withBudget = metrics
    .map(m => {
      const budget = TEAM_BUDGETS[m.teamId];
      return budget
        ? {
            ...m,
            totalSalary: budget.totalSalary,
            dpConcentration: budget.dpSalary / Math.max(1, budget.totalSalary),
          }
        : null;
    })
    .filter(Boolean) as (TeamResilienceMetrics & {
    totalSalary: number;
    dpConcentration: number;
  })[];

  if (withBudget.length < 5) return "";

  const highSpend = [...withBudget].sort(
    (a, b) => b.totalSalary - a.totalSalary
  );
  const topSpender = highSpend[0];
  const bestRoadValue = [...withBudget].sort((a, b) => {
    const aVal = a.awayPPG / Math.max(1, a.totalSalary / 1_000_000);
    const bVal = b.awayPPG / Math.max(1, b.totalSalary / 1_000_000);
    return bVal - aVal;
  })[0];

  return `$${(topSpender.totalSalary / 1_000_000).toFixed(1)}M buys ${topSpender.teamShort} just ${topSpender.awayPPG.toFixed(2)} away PPG. ${bestRoadValue.teamShort} gets ${bestRoadValue.awayPPG.toFixed(2)} PPG on $${(bestRoadValue.totalSalary / 1_000_000).toFixed(1)}M — the league’s best road-dollar value.`;
}

function ageDistributionInsight(players: Player[], teams: Team[]): string {
  const active = players.filter(p => p.minutes > 0);
  const u23 = active.filter(p => p.age < 23);
  const senior = active.filter(p => p.age >= 30);
  const u23Pct = ((u23.length / active.length) * 100).toFixed(0);
  const seniorPct = ((senior.length / active.length) * 100).toFixed(0);

  const teamAges = teams
    .map(t => {
      const tp = active.filter(p => p.team === t.id);
      if (tp.length === 0) return { team: t, avgAge: 0 };
      const totalMin = tp.reduce((s, p) => s + p.minutes, 0);
      const wAvg =
        totalMin > 0
          ? tp.reduce((s, p) => s + p.age * p.minutes, 0) / totalMin
          : 0;
      return { team: t, avgAge: wAvg };
    })
    .filter(t => t.avgAge > 0);

  const youngest = [...teamAges].sort((a, b) => a.avgAge - b.avgAge)[0];
  const oldest = [...teamAges].sort((a, b) => b.avgAge - a.avgAge)[0];

  return `${u23Pct}% of active players are U23 and ${seniorPct}% are 30+. ${youngest?.team.short || "N/A"} fields the youngest squad (${youngest?.avgAge.toFixed(1)} avg) while ${oldest?.team.short || "N/A"} skews oldest at ${oldest?.avgAge.toFixed(1)}.`;
}

// ═══════════════════════════════════════════
// SUB-PANEL 1: Squad Depth HHI Horizontal Bars
// ═══════════════════════════════════════════

function SquadDepthBars({
  metrics,
  isDark,
}: {
  metrics: TeamResilienceMetrics[];
  isDark: boolean;
}) {
  const sorted = useMemo(
    () => [...metrics].sort((a, b) => b.squadDepthIndex - a.squadDepthIndex),
    [metrics]
  );
  const maxDepth = useMemo(
    () => Math.max(...sorted.map(m => m.squadDepthIndex), 1),
    [sorted]
  );

  const barHeight = 22;
  const labelWidth = 90;
  const valueWidth = 45;
  const chartWidth = 700;
  const barAreaWidth = chartWidth - labelWidth - valueWidth;
  const svgHeight = sorted.length * (barHeight + 4) + 20;

  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const textColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)";

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${svgHeight}`}
        className="w-full"
        style={{ minWidth: "500px" }}
      >
        {/* Grid lines */}
        {[25, 50, 75, 100].map(v => {
          const x = labelWidth + (v / 100) * barAreaWidth;
          return (
            <g key={v}>
              <line
                x1={x}
                y1={0}
                x2={x}
                y2={svgHeight}
                stroke={gridColor}
                strokeDasharray="3,3"
              />
              <text
                x={x}
                y={svgHeight - 2}
                fill={textColor}
                fontSize={8}
                fontFamily="Space Grotesk"
                textAnchor="middle"
              >
                {v}
              </text>
            </g>
          );
        })}

        {sorted.map((m, i) => {
          const y = i * (barHeight + 4) + 4;
          const barW = (m.squadDepthIndex / 100) * barAreaWidth;
          const color = mutedTeamColor(m.teamId, isDark);
          const gradId = `depth-bar-${m.teamId}`;

          return (
            <g key={m.teamId}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                  <stop
                    offset="0%"
                    stopColor={lighten(color, 0.2)}
                    stopOpacity={0.9}
                  />
                  <stop offset="100%" stopColor={color} stopOpacity={0.85} />
                </linearGradient>
              </defs>

              {/* Team label */}
              <text
                x={labelWidth - 6}
                y={y + barHeight / 2 + 4}
                fill={textColor}
                fontSize={10}
                fontFamily="Space Grotesk"
                fontWeight={500}
                textAnchor="end"
              >
                {m.teamShort}
              </text>

              {/* Bar shadow */}
              <rect
                x={labelWidth + 2}
                y={y + 3}
                width={barW}
                height={barHeight}
                rx={3}
                fill={isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.06)"}
              />

              {/* Bar */}
              <rect
                x={labelWidth}
                y={y}
                width={barW}
                height={barHeight}
                rx={3}
                fill={`url(#${gradId})`}
              />

              {/* Top highlight */}
              <rect
                x={labelWidth + 1}
                y={y + 1}
                width={Math.max(0, barW - 2)}
                height={barHeight * 0.3}
                rx={2}
                fill={lighten(color, 0.4)}
                fillOpacity={0.2}
              />

              {/* Value */}
              <text
                x={labelWidth + barW + 6}
                y={y + barHeight / 2 + 4}
                fill={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)"}
                fontSize={10}
                fontFamily="Space Grotesk"
                fontWeight={600}
              >
                {m.squadDepthIndex.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════
// SUB-PANEL 2: Salary Concentration vs Road Performance
// ═══════════════════════════════════════════

function SalaryRoadScatter({
  metrics,
  isDark,
}: {
  metrics: TeamResilienceMetrics[];
  isDark: boolean;
}) {
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
  const data = useMemo(() => {
    return metrics
      .map(m => {
        const budget = TEAM_BUDGETS[m.teamId];
        if (!budget || budget.totalSalary === 0) return null;
        const dpConcentration = (budget.dpSalary / budget.totalSalary) * 100;
        return {
          ...m,
          totalSalary: budget.totalSalary,
          dpConcentration,
        };
      })
      .filter(Boolean) as (TeamResilienceMetrics & {
      totalSalary: number;
      dpConcentration: number;
    })[];
  }, [metrics]);

  const width = 700;
  const height = 400;
  const margin = { top: 25, right: 30, bottom: 50, left: 60 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const xExtent = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 100 };
    const vals = data.map(d => d.dpConcentration);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.15 || 10;
    return { min: Math.max(0, min - pad), max: Math.min(100, max + pad) };
  }, [data]);

  const yExtent = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 3 };
    const vals = data.map(d => d.awayPPG);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.15 || 0.3;
    return { min: Math.max(0, min - pad), max: max + pad };
  }, [data]);

  const xScale = (val: number) =>
    margin.left + ((val - xExtent.min) / (xExtent.max - xExtent.min)) * plotW;
  const yScale = (val: number) =>
    margin.top +
    plotH -
    ((val - yExtent.min) / (yExtent.max - yExtent.min)) * plotH;

  // Regression
  const regression = useMemo(() => {
    if (data.length < 3) return null;
    return linearRegression(
      data.map(d => ({ x: d.dpConcentration, y: d.awayPPG }))
    );
  }, [data]);

  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const textColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
  const labelColor = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)";
  const regressionColor = isDark
    ? "rgba(255,180,80,0.4)"
    : "rgba(200,140,40,0.3)";

  // X ticks
  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = 10;
    let v = Math.ceil(xExtent.min / step) * step;
    while (v <= xExtent.max) {
      ticks.push(v);
      v += step;
    }
    return ticks;
  }, [xExtent]);

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = 0.25;
    let v = Math.ceil(yExtent.min / step) * step;
    while (v <= yExtent.max) {
      ticks.push(Math.round(v * 100) / 100);
      v += step;
    }
    return ticks;
  }, [yExtent]);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ minWidth: "500px" }}
      >
        <defs>
          <filter
            id="salary-shadow"
            x="-40%"
            y="-20%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
          </filter>
        </defs>

        {/* Grid */}
        {xTicks.map(t => (
          <line
            key={`xg-${t}`}
            x1={xScale(t)}
            y1={margin.top}
            x2={xScale(t)}
            y2={margin.top + plotH}
            stroke={gridColor}
            strokeDasharray="3,3"
          />
        ))}
        {yTicks.map(t => (
          <line
            key={`yg-${t}`}
            x1={margin.left}
            y1={yScale(t)}
            x2={margin.left + plotW}
            y2={yScale(t)}
            stroke={gridColor}
            strokeDasharray="3,3"
          />
        ))}

        {/* Axes */}
        <line
          x1={margin.left}
          y1={margin.top + plotH}
          x2={margin.left + plotW}
          y2={margin.top + plotH}
          stroke={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}
        />
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + plotH}
          stroke={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}
        />

        {/* X labels */}
        {xTicks.map(t => (
          <text
            key={`xl-${t}`}
            x={xScale(t)}
            y={margin.top + plotH + 16}
            fill={textColor}
            fontSize={9}
            fontFamily="Space Grotesk"
            textAnchor="middle"
          >
            {t}%
          </text>
        ))}
        {/* Y labels */}
        {yTicks.map(t => (
          <text
            key={`yl-${t}`}
            x={margin.left - 8}
            y={yScale(t) + 3}
            fill={textColor}
            fontSize={9}
            fontFamily="Space Grotesk"
            textAnchor="end"
          >
            {t.toFixed(2)}
          </text>
        ))}

        {/* Axis titles */}
        <text
          x={margin.left + plotW / 2}
          y={height - 6}
          fill={labelColor}
          fontSize={11}
          fontWeight={600}
          fontFamily="Space Grotesk"
          textAnchor="middle"
        >
          DP Salary Concentration (%)
        </text>
        <text
          x={12}
          y={margin.top + plotH / 2}
          fill={labelColor}
          fontSize={11}
          fontWeight={600}
          fontFamily="Space Grotesk"
          textAnchor="middle"
          transform={`rotate(-90, 12, ${margin.top + plotH / 2})`}
        >
          Away PPG
        </text>

        {/* Regression */}
        {regression && (
          <>
            <line
              x1={xScale(xExtent.min)}
              y1={yScale(regression.slope * xExtent.min + regression.intercept)}
              x2={xScale(xExtent.max)}
              y2={yScale(regression.slope * xExtent.max + regression.intercept)}
              stroke={regressionColor}
              strokeWidth={1.5}
              strokeDasharray="6,4"
            />
            <text
              x={xScale(xExtent.max) - 5}
              y={
                yScale(regression.slope * xExtent.max + regression.intercept) -
                8
              }
              fill={regressionColor}
              fontSize={9}
              fontWeight={600}
              fontFamily="Space Grotesk"
              textAnchor="end"
            >
              R² = {regression.r2.toFixed(2)}
            </text>
          </>
        )}

        {/* Dot shadows */}
        {data.map(d => {
          const dimmed = hoveredTeam !== null && hoveredTeam !== d.teamId;
          return (
            <ellipse
              key={`ss-${d.teamId}`}
              cx={xScale(d.dpConcentration) + 2}
              cy={yScale(d.awayPPG) + 6}
              rx={8}
              ry={3}
              fill={isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.08)"}
              filter="url(#salary-shadow)"
              style={{
                opacity: dimmed ? 0.15 : 1,
                transition: "opacity 0.2s ease",
              }}
            />
          );
        })}

        {/* Dots */}
        {data.map(d => {
          const color = mutedTeamColor(d.teamId, isDark);
          const isHovered = hoveredTeam === d.teamId;
          const dimmed = hoveredTeam !== null && !isHovered;
          return (
            <g
              key={`sd-${d.teamId}`}
              style={{
                opacity: dimmed ? 0.15 : 1,
                transition: "opacity 0.2s ease, transform 0.2s ease",
                transformOrigin: `${xScale(d.dpConcentration)}px ${yScale(d.awayPPG)}px`,
                transform: isHovered ? "scale(1.25)" : "scale(1)",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHoveredTeam(d.teamId)}
              onMouseLeave={() => setHoveredTeam(null)}
            >
              <circle
                cx={xScale(d.dpConcentration)}
                cy={yScale(d.awayPPG)}
                r={7}
                fill={color}
                fillOpacity={0.85}
                stroke={lighten(color, 0.3)}
                strokeWidth={1}
                strokeOpacity={0.4}
              />
              <circle
                cx={xScale(d.dpConcentration) - 1.5}
                cy={yScale(d.awayPPG) - 1.5}
                r={2}
                fill="white"
                fillOpacity={isDark ? 0.15 : 0.25}
              />
              <text
                x={xScale(d.dpConcentration)}
                y={yScale(d.awayPPG) - 10}
                fill={labelColor}
                fontSize={isHovered ? 10 : 8.5}
                fontFamily="Space Grotesk"
                fontWeight={isHovered ? 700 : 500}
                textAnchor="middle"
              >
                {d.teamShort}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════
// SUB-PANEL 3: Age Distribution Ridgeline Plot
// ═══════════════════════════════════════════

/**
 * Gaussian kernel density estimation for smooth ridgeline curves.
 * bandwidth controls smoothness — higher = smoother.
 */
function kernelDensity(
  values: number[],
  bandwidth: number,
  xMin: number,
  xMax: number,
  steps: number
): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  const step = (xMax - xMin) / steps;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * step;
    let sum = 0;
    for (const v of values) {
      const z = (x - v) / bandwidth;
      sum += Math.exp(-0.5 * z * z) / (bandwidth * Math.sqrt(2 * Math.PI));
    }
    result.push({ x, y: sum / Math.max(1, values.length) });
  }
  return result;
}

function AgeRidgeline({
  metrics,
  players,
  isDark,
}: {
  metrics: TeamResilienceMetrics[];
  players: Player[];
  isDark: boolean;
}) {
  // Build per-team age distributions (weighted by minutes)
  const teamData = useMemo(() => {
    return metrics
      .map(m => {
        const teamPlayers = players.filter(
          p => p.team === m.teamId && p.minutes > 0
        );
        const totalMin = teamPlayers.reduce((s, p) => s + p.minutes, 0);
        const ages: number[] = [];
        for (const p of teamPlayers) {
          const weight = Math.max(
            1,
            Math.round((p.minutes / Math.max(1, totalMin)) * 50)
          );
          for (let i = 0; i < weight; i++) ages.push(p.age);
        }
        const avgAge =
          totalMin > 0
            ? teamPlayers.reduce((s, p) => s + p.age * p.minutes, 0) / totalMin
            : 0;
        return { ...m, ages, avgAge };
      })
      .sort((a, b) => a.avgAge - b.avgAge); // Youngest at front (bottom), oldest at back (top)
  }, [metrics, players]);

  const chartWidth = 800;
  const rowHeight = 28;
  const overlapFactor = 0.42; // Less overlap for opaque stacked-paper look
  const labelWidth = 85;
  const rightPad = 30;
  const plotWidth = chartWidth - labelWidth - rightPad;
  const topPad = 20;
  const bottomPad = 35;
  const svgHeight =
    topPad +
    teamData.length * rowHeight * (1 - overlapFactor) +
    rowHeight +
    bottomPad;

  const ageMin = 16;
  const ageMax = 40;
  const bandwidth = 1.8;
  const densitySteps = 80;

  const densities = useMemo(() => {
    return teamData.map(td =>
      kernelDensity(td.ages, bandwidth, ageMin, ageMax, densitySteps)
    );
  }, [teamData]);

  const globalMaxDensity = useMemo(() => {
    let max = 0;
    for (const d of densities) {
      for (const pt of d) {
        if (pt.y > max) max = pt.y;
      }
    }
    return max || 1;
  }, [densities]);

  const xScale = (age: number) =>
    labelWidth + ((age - ageMin) / (ageMax - ageMin)) * plotWidth;
  const maxRidgeHeight = rowHeight * 1.8;

  const ageBrackets = [
    { age: 23, label: "U23" },
    { age: 30, label: "30+" },
  ];

  const textColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
  const bracketColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  // Background fill for opaque paper layers
  const bgFill = isDark ? "#1a1a2a" : "#eeedf5";

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${svgHeight}`}
        className="w-full"
        style={{ minWidth: "550px" }}
      >
        <defs>
          {teamData.map((td, i) => {
            const color = mutedTeamColor(td.teamId, isDark);
            // Depth-based tint: back layers (oldest) are darker, front layers (youngest) are lighter
            const depthFactor = i / Math.max(1, teamData.length - 1); // 0 = back, 1 = front
            const baseOpacity = isDark ? 0.92 : 0.95;
            return (
              <linearGradient
                key={td.teamId}
                id={`ridge-grad-${td.teamId}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={lighten(color, 0.25 + depthFactor * 0.1)}
                  stopOpacity={baseOpacity}
                />
                <stop
                  offset="40%"
                  stopColor={lighten(color, 0.1)}
                  stopOpacity={baseOpacity}
                />
                <stop
                  offset="100%"
                  stopColor={darken(color, 0.05)}
                  stopOpacity={baseOpacity * 0.95}
                />
              </linearGradient>
            );
          })}
          <filter id="ridge-shadow" x="-5%" y="-10%" width="110%" height="130%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
          </filter>
          <filter id="ridge-drop" x="-5%" y="-5%" width="110%" height="120%">
            <feDropShadow
              dx="0"
              dy="1.5"
              stdDeviation="1.5"
              floodColor="rgba(0,0,0,0.15)"
            />
          </filter>
        </defs>

        {/* Age bracket reference lines */}
        {ageBrackets.map(b => (
          <g key={b.age}>
            <line
              x1={xScale(b.age)}
              y1={topPad - 5}
              x2={xScale(b.age)}
              y2={svgHeight - bottomPad + 5}
              stroke={bracketColor}
              strokeDasharray="4,4"
              strokeWidth={1}
            />
            <text
              x={xScale(b.age)}
              y={topPad - 8}
              fill={isDark ? "rgba(0,212,255,0.25)" : "rgba(0,160,200,0.2)"}
              fontSize={8}
              fontFamily="Space Grotesk"
              fontWeight={600}
              textAnchor="middle"
              letterSpacing="0.05em"
            >
              {b.label}
            </text>
          </g>
        ))}

        {/* X-axis ticks */}
        {[18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38].map(age => (
          <g key={age}>
            <line
              x1={xScale(age)}
              y1={svgHeight - bottomPad}
              x2={xScale(age)}
              y2={svgHeight - bottomPad + 4}
              stroke={textColor}
            />
            <text
              x={xScale(age)}
              y={svgHeight - bottomPad + 16}
              fill={textColor}
              fontSize={9}
              fontFamily="Space Grotesk"
              textAnchor="middle"
            >
              {age}
            </text>
          </g>
        ))}

        {/* X-axis label */}
        <text
          x={labelWidth + plotWidth / 2}
          y={svgHeight - 4}
          fill={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)"}
          fontSize={10}
          fontFamily="Space Grotesk"
          fontWeight={500}
          textAnchor="middle"
        >
          Player Age (minutes-weighted)
        </text>

        {/* Ridgeline rows — render from BACK (oldest, top of chart) to FRONT (youngest, bottom) */}
        {/* Reverse iteration so front layers paint over back layers */}
        {[...teamData].reverse().map((td, ri) => {
          const origIndex = teamData.length - 1 - ri; // original index in teamData
          const density = densities[origIndex];
          const baseY =
            topPad +
            (teamData.length - 1 - origIndex) *
              rowHeight *
              (1 - overlapFactor) +
            rowHeight;
          const color = mutedTeamColor(td.teamId, isDark);

          // Build the ridge path
          const pathPoints = density.map(pt => {
            const px = xScale(pt.x);
            const py = baseY - (pt.y / globalMaxDensity) * maxRidgeHeight;
            return `${px},${py}`;
          });

          // Closed polygon path
          const pathD = `M ${xScale(ageMin)},${baseY} L ${pathPoints.join(" L ")} L ${xScale(ageMax)},${baseY} Z`;
          const strokeD = `M ${pathPoints.join(" L ")}`;

          return (
            <g key={td.teamId}>
              {/* Cast shadow beneath the polygon — creates depth between layers */}
              <path
                d={pathD}
                fill={isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.06)"}
                transform="translate(1, 2.5)"
                filter="url(#ridge-shadow)"
              />

              {/* Opaque background fill — makes each layer a solid "sheet of paper" */}
              <path d={pathD} fill={bgFill} />

              {/* Team-colored fill with near-full opacity */}
              <path d={pathD} fill={`url(#ridge-grad-${td.teamId})`} />

              {/* Top edge highlight — thin lighter line simulating paper edge catch-light */}
              <path
                d={strokeD}
                fill="none"
                stroke={lighten(color, 0.45)}
                strokeWidth={1.8}
                strokeOpacity={isDark ? 0.5 : 0.7}
              />

              {/* Very thin bright specular on the top edge */}
              <path
                d={strokeD}
                fill="none"
                stroke={
                  isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.5)"
                }
                strokeWidth={0.6}
                transform="translate(0, -0.8)"
              />

              {/* Team label */}
              <text
                x={labelWidth - 8}
                y={baseY - rowHeight * 0.15}
                fill={isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)"}
                fontSize={9.5}
                fontFamily="Space Grotesk"
                fontWeight={500}
                textAnchor="end"
              >
                {td.teamShort}
              </text>

              {/* Average age marker — sits on the ridge surface */}
              <circle
                cx={xScale(td.avgAge)}
                cy={
                  baseY -
                  ((kernelDensity(
                    td.ages,
                    bandwidth,
                    td.avgAge,
                    td.avgAge,
                    0
                  )[0]?.y || 0) /
                    globalMaxDensity) *
                    maxRidgeHeight
                }
                r={2.5}
                fill={color}
                fillOpacity={0.9}
                stroke={lighten(color, 0.3)}
                strokeWidth={0.8}
              />
              <text
                x={xScale(td.avgAge)}
                y={
                  baseY -
                  ((kernelDensity(
                    td.ages,
                    bandwidth,
                    td.avgAge,
                    td.avgAge,
                    0
                  )[0]?.y || 0) /
                    globalMaxDensity) *
                    maxRidgeHeight -
                  6
                }
                fill={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)"}
                fontSize={7.5}
                fontFamily="Space Grotesk"
                fontWeight={600}
                textAnchor="middle"
              >
                {td.avgAge.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN DEEP DIVE PANEL
// ═══════════════════════════════════════════

function DeepDivePanelInner({ metrics, players, teams }: DeepDivePanelProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isExpanded, setIsExpanded] = useState(false);

  const depthInsight = useMemo(() => squadDepthInsights(metrics), [metrics]);
  const salaryInsight = useMemo(
    () => salaryRoadInsights(metrics, teams),
    [metrics, teams]
  );
  const ageInsight = useMemo(
    () => ageDistributionInsight(players, teams),
    [players, teams]
  );

  const panelVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15 + 0.2,
        duration: 0.4,
        ease: "easeOut" as const,
      },
    }),
  };

  return (
    <div>
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all text-[12px] font-bold tracking-wider uppercase ${
          isExpanded
            ? "neu-pressed text-amber"
            : "neu-raised text-muted-foreground hover:text-foreground"
        }`}
        style={{ fontFamily: "Space Grotesk" }}
      >
        {isExpanded ? (
          <>
            Close Deep Dive <ChevronUp size={14} />
          </>
        ) : (
          <>
            Deep Dive — Squad Construction & Salary Analysis{" "}
            <ChevronDown size={14} />
          </>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-5">
              {/* ─── Panel 1: Squad Depth Breakdown ─── */}
              <motion.div
                custom={0}
                initial="hidden"
                animate="visible"
                variants={panelVariants}
                className="rounded-xl p-4"
                style={{
                  background: isDark
                    ? "linear-gradient(145deg, rgba(25,25,40,0.7), rgba(18,18,30,0.9))"
                    : "linear-gradient(145deg, rgba(245,245,252,0.8), rgba(230,230,240,0.9))",
                  boxShadow: isDark
                    ? "4px 4px 12px rgba(0,0,0,0.4), -3px -3px 8px rgba(60,60,80,0.06)"
                    : "4px 4px 12px rgba(0,0,0,0.06), -3px -3px 8px rgba(255,255,255,0.7)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Layers size={14} className="text-cyan" />
                  <h4
                    className="text-[12px] font-bold uppercase tracking-wider"
                    style={{ fontFamily: "Space Grotesk" }}
                  >
                    Squad Depth Breakdown
                  </h4>
                  <span className="text-[9px] text-muted-foreground/50 ml-1">
                    Gini Index (top 15) — higher = more even rotation
                  </span>
                </div>
                {depthInsight && (
                  <p
                    className="text-[10px] text-muted-foreground mb-3 leading-relaxed px-1"
                    style={{ fontFamily: "Space Grotesk" }}
                  >
                    {depthInsight}
                  </p>
                )}
                <SquadDepthBars metrics={metrics} isDark={isDark} />
              </motion.div>

              {/* ─── Panel 2: Salary vs Road Performance ─── */}
              <motion.div
                custom={1}
                initial="hidden"
                animate="visible"
                variants={panelVariants}
                className="rounded-xl p-4"
                style={{
                  background: isDark
                    ? "linear-gradient(145deg, rgba(25,25,40,0.7), rgba(18,18,30,0.9))"
                    : "linear-gradient(145deg, rgba(245,245,252,0.8), rgba(230,230,240,0.9))",
                  boxShadow: isDark
                    ? "4px 4px 12px rgba(0,0,0,0.4), -3px -3px 8px rgba(60,60,80,0.06)"
                    : "4px 4px 12px rgba(0,0,0,0.06), -3px -3px 8px rgba(255,255,255,0.7)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={14} className="text-amber" />
                  <h4
                    className="text-[12px] font-bold uppercase tracking-wider"
                    style={{ fontFamily: "Space Grotesk" }}
                  >
                    Salary Concentration vs Road Performance
                  </h4>
                </div>
                {salaryInsight && (
                  <p
                    className="text-[10px] text-muted-foreground mb-3 leading-relaxed px-1"
                    style={{ fontFamily: "Space Grotesk" }}
                  >
                    {salaryInsight}
                  </p>
                )}
                <SalaryRoadScatter metrics={metrics} isDark={isDark} />
              </motion.div>

              {/* ─── Panel 3: Age Distribution ─── */}
              <motion.div
                custom={2}
                initial="hidden"
                animate="visible"
                variants={panelVariants}
                className="rounded-xl p-4"
                style={{
                  background: isDark
                    ? "linear-gradient(145deg, rgba(25,25,40,0.7), rgba(18,18,30,0.9))"
                    : "linear-gradient(145deg, rgba(245,245,252,0.8), rgba(230,230,240,0.9))",
                  boxShadow: isDark
                    ? "4px 4px 12px rgba(0,0,0,0.4), -3px -3px 8px rgba(60,60,80,0.06)"
                    : "4px 4px 12px rgba(0,0,0,0.06), -3px -3px 8px rgba(255,255,255,0.7)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Users size={14} className="text-emerald" />
                  <h4
                    className="text-[12px] font-bold uppercase tracking-wider"
                    style={{ fontFamily: "Space Grotesk" }}
                  >
                    Age Distribution
                  </h4>
                  <span className="text-[9px] text-muted-foreground/50 ml-1">
                    Minutes-weighted age density per team
                  </span>
                </div>
                {ageInsight && (
                  <p
                    className="text-[10px] text-muted-foreground mb-3 leading-relaxed px-1"
                    style={{ fontFamily: "Space Grotesk" }}
                  >
                    {ageInsight}
                  </p>
                )}
                <AgeRidgeline
                  metrics={metrics}
                  players={players}
                  isDark={isDark}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const DeepDivePanel = memo(
  DeepDivePanelInner,
  (prev, next) =>
    prev.metrics === next.metrics &&
    prev.players === next.players &&
    prev.teams === next.teams
);
export default DeepDivePanel;
