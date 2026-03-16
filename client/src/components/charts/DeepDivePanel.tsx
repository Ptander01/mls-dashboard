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

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { mutedTeamColor, lighten, darken, hexToRgba, linearRegression } from '@/lib/chartUtils';
import type { TeamResilienceMetrics } from '@/lib/resilienceUtils';
import { TEAMS, PLAYERS, TEAM_BUDGETS, getTeam } from '@/lib/mlsData';
import type { Player, Team } from '@/lib/mlsData';
import { ChevronDown, ChevronUp, Layers, DollarSign, Users } from 'lucide-react';

interface DeepDivePanelProps {
  metrics: TeamResilienceMetrics[];
  players: Player[];
  teams: Team[];
}

// ═══════════════════════════════════════════
// INSIGHT GENERATORS
// ═══════════════════════════════════════════

function squadDepthInsights(metrics: TeamResilienceMetrics[]): string {
  if (metrics.length < 5) return '';
  const sorted = [...metrics].sort((a, b) => b.squadDepthIndex - a.squadDepthIndex);
  const deepest = sorted[0];
  const shallowest = sorted[sorted.length - 1];
  const avg = metrics.reduce((s, m) => s + m.squadDepthIndex, 0) / metrics.length;
  return `${deepest.teamShort} has the deepest squad rotation (HHI index: ${deepest.squadDepthIndex.toFixed(1)}), distributing minutes most evenly. ${shallowest.teamShort} relies heavily on a small core (${shallowest.squadDepthIndex.toFixed(1)}). League average depth index: ${avg.toFixed(1)}.`;
}

function salaryRoadInsights(metrics: TeamResilienceMetrics[], teams: Team[]): string {
  if (metrics.length < 5) return '';
  // Find teams with high salary but poor away record
  const withBudget = metrics
    .map(m => {
      const budget = TEAM_BUDGETS[m.teamId];
      return budget ? { ...m, totalSalary: budget.totalSalary, dpConcentration: budget.dpSalary / Math.max(1, budget.totalSalary) } : null;
    })
    .filter(Boolean) as (TeamResilienceMetrics & { totalSalary: number; dpConcentration: number })[];

  if (withBudget.length < 5) return '';

  const highSpend = [...withBudget].sort((a, b) => b.totalSalary - a.totalSalary);
  const topSpender = highSpend[0];
  const bestRoadValue = [...withBudget].sort((a, b) => {
    const aVal = a.awayPPG / Math.max(1, a.totalSalary / 1_000_000);
    const bVal = b.awayPPG / Math.max(1, b.totalSalary / 1_000_000);
    return bVal - aVal;
  })[0];

  return `${topSpender.teamShort} leads spending ($${(topSpender.totalSalary / 1_000_000).toFixed(1)}M) with ${topSpender.awayPPG.toFixed(2)} away PPG. Best road value: ${bestRoadValue.teamShort} at ${bestRoadValue.awayPPG.toFixed(2)} PPG on just $${(bestRoadValue.totalSalary / 1_000_000).toFixed(1)}M.`;
}

function ageDistributionInsight(players: Player[], teams: Team[]): string {
  const active = players.filter(p => p.minutes > 0);
  const u23 = active.filter(p => p.age < 23);
  const mid = active.filter(p => p.age >= 23 && p.age < 30);
  const senior = active.filter(p => p.age >= 30);
  const u23Pct = ((u23.length / active.length) * 100).toFixed(0);
  const seniorPct = ((senior.length / active.length) * 100).toFixed(0);

  // Find team with youngest and oldest squads
  const teamAges = teams.map(t => {
    const tp = active.filter(p => p.team === t.id);
    if (tp.length === 0) return { team: t, avgAge: 0 };
    const totalMin = tp.reduce((s, p) => s + p.minutes, 0);
    const wAvg = totalMin > 0 ? tp.reduce((s, p) => s + p.age * p.minutes, 0) / totalMin : 0;
    return { team: t, avgAge: wAvg };
  }).filter(t => t.avgAge > 0);

  const youngest = [...teamAges].sort((a, b) => a.avgAge - b.avgAge)[0];
  const oldest = [...teamAges].sort((a, b) => b.avgAge - a.avgAge)[0];

  return `League-wide: ${u23Pct}% U23, ${seniorPct}% over 30. ${youngest?.team.short || 'N/A'} fields the youngest squad (avg ${youngest?.avgAge.toFixed(1)}), while ${oldest?.team.short || 'N/A'} skews oldest (${oldest?.avgAge.toFixed(1)}).`;
}

// ═══════════════════════════════════════════
// SUB-PANEL 1: Squad Depth HHI Horizontal Bars
// ═══════════════════════════════════════════

function SquadDepthBars({ metrics, isDark }: { metrics: TeamResilienceMetrics[]; isDark: boolean }) {
  const sorted = useMemo(() => [...metrics].sort((a, b) => b.squadDepthIndex - a.squadDepthIndex), [metrics]);
  const maxDepth = useMemo(() => Math.max(...sorted.map(m => m.squadDepthIndex), 1), [sorted]);

  const barHeight = 22;
  const labelWidth = 90;
  const valueWidth = 45;
  const chartWidth = 700;
  const barAreaWidth = chartWidth - labelWidth - valueWidth;
  const svgHeight = sorted.length * (barHeight + 4) + 20;

  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const textColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${chartWidth} ${svgHeight}`} className="w-full" style={{ minWidth: '500px' }}>
        {/* Grid lines */}
        {[25, 50, 75, 100].map(v => {
          const x = labelWidth + (v / 100) * barAreaWidth;
          return (
            <g key={v}>
              <line x1={x} y1={0} x2={x} y2={svgHeight} stroke={gridColor} strokeDasharray="3,3" />
              <text x={x} y={svgHeight - 2} fill={textColor} fontSize={8} fontFamily="Space Grotesk" textAnchor="middle">
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
                  <stop offset="0%" stopColor={lighten(color, 0.2)} stopOpacity={0.9} />
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
                fill={isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)'}
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
                fill={isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'}
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

function SalaryRoadScatter({ metrics, isDark }: { metrics: TeamResilienceMetrics[]; isDark: boolean }) {
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
      .filter(Boolean) as (TeamResilienceMetrics & { totalSalary: number; dpConcentration: number })[];
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

  const xScale = (val: number) => margin.left + ((val - xExtent.min) / (xExtent.max - xExtent.min)) * plotW;
  const yScale = (val: number) => margin.top + plotH - ((val - yExtent.min) / (yExtent.max - yExtent.min)) * plotH;

  // Regression
  const regression = useMemo(() => {
    if (data.length < 3) return null;
    return linearRegression(data.map(d => ({ x: d.dpConcentration, y: d.awayPPG })));
  }, [data]);

  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const labelColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)';
  const regressionColor = isDark ? 'rgba(255,180,80,0.4)' : 'rgba(200,140,40,0.3)';

  // X ticks
  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = 10;
    let v = Math.ceil(xExtent.min / step) * step;
    while (v <= xExtent.max) { ticks.push(v); v += step; }
    return ticks;
  }, [xExtent]);

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = 0.25;
    let v = Math.ceil(yExtent.min / step) * step;
    while (v <= yExtent.max) { ticks.push(Math.round(v * 100) / 100); v += step; }
    return ticks;
  }, [yExtent]);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: '500px' }}>
        <defs>
          <filter id="salary-shadow" x="-40%" y="-20%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
          </filter>
        </defs>

        {/* Grid */}
        {xTicks.map(t => (
          <line key={`xg-${t}`} x1={xScale(t)} y1={margin.top} x2={xScale(t)} y2={margin.top + plotH} stroke={gridColor} strokeDasharray="3,3" />
        ))}
        {yTicks.map(t => (
          <line key={`yg-${t}`} x1={margin.left} y1={yScale(t)} x2={margin.left + plotW} y2={yScale(t)} stroke={gridColor} strokeDasharray="3,3" />
        ))}

        {/* Axes */}
        <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'} />
        <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'} />

        {/* X labels */}
        {xTicks.map(t => (
          <text key={`xl-${t}`} x={xScale(t)} y={margin.top + plotH + 16} fill={textColor} fontSize={9} fontFamily="Space Grotesk" textAnchor="middle">
            {t}%
          </text>
        ))}
        {/* Y labels */}
        {yTicks.map(t => (
          <text key={`yl-${t}`} x={margin.left - 8} y={yScale(t) + 3} fill={textColor} fontSize={9} fontFamily="Space Grotesk" textAnchor="end">
            {t.toFixed(2)}
          </text>
        ))}

        {/* Axis titles */}
        <text x={margin.left + plotW / 2} y={height - 6} fill={labelColor} fontSize={11} fontWeight={600} fontFamily="Space Grotesk" textAnchor="middle">
          DP Salary Concentration (%)
        </text>
        <text x={12} y={margin.top + plotH / 2} fill={labelColor} fontSize={11} fontWeight={600} fontFamily="Space Grotesk" textAnchor="middle" transform={`rotate(-90, 12, ${margin.top + plotH / 2})`}>
          Away PPG
        </text>

        {/* Regression */}
        {regression && (
          <>
            <line
              x1={xScale(xExtent.min)} y1={yScale(regression.slope * xExtent.min + regression.intercept)}
              x2={xScale(xExtent.max)} y2={yScale(regression.slope * xExtent.max + regression.intercept)}
              stroke={regressionColor} strokeWidth={1.5} strokeDasharray="6,4"
            />
            <text
              x={xScale(xExtent.max) - 5}
              y={yScale(regression.slope * xExtent.max + regression.intercept) - 8}
              fill={regressionColor} fontSize={9} fontWeight={600} fontFamily="Space Grotesk" textAnchor="end"
            >
              R² = {regression.r2.toFixed(2)}
            </text>
          </>
        )}

        {/* Dot shadows */}
        {data.map(d => (
          <ellipse
            key={`ss-${d.teamId}`}
            cx={xScale(d.dpConcentration) + 2}
            cy={yScale(d.awayPPG) + 6}
            rx={8} ry={3}
            fill={isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.08)'}
            filter="url(#salary-shadow)"
          />
        ))}

        {/* Dots */}
        {data.map(d => {
          const color = mutedTeamColor(d.teamId, isDark);
          return (
            <g key={`sd-${d.teamId}`}>
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
                fontSize={8.5}
                fontFamily="Space Grotesk"
                fontWeight={500}
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
// SUB-PANEL 3: Age Distribution Stacked Bars
// ═══════════════════════════════════════════

function AgeDistributionBars({ metrics, players, isDark }: { metrics: TeamResilienceMetrics[]; players: Player[]; isDark: boolean }) {
  const data = useMemo(() => {
    return metrics.map(m => {
      const teamPlayers = players.filter(p => p.team === m.teamId && p.minutes > 0);
      const totalMin = teamPlayers.reduce((s, p) => s + p.minutes, 0);
      if (totalMin === 0) return { ...m, u23: 0, mid: 0, senior: 0 };

      const u23Min = teamPlayers.filter(p => p.age < 23).reduce((s, p) => s + p.minutes, 0);
      const midMin = teamPlayers.filter(p => p.age >= 23 && p.age < 30).reduce((s, p) => s + p.minutes, 0);
      const seniorMin = teamPlayers.filter(p => p.age >= 30).reduce((s, p) => s + p.minutes, 0);

      return {
        ...m,
        u23: (u23Min / totalMin) * 100,
        mid: (midMin / totalMin) * 100,
        senior: (seniorMin / totalMin) * 100,
      };
    }).sort((a, b) => b.u23 - a.u23); // Sort by youngest squad
  }, [metrics, players]);

  const barHeight = 20;
  const labelWidth = 90;
  const chartWidth = 700;
  const barAreaWidth = chartWidth - labelWidth - 10;
  const svgHeight = data.length * (barHeight + 4) + 30;

  // Age group colors
  const u23Color = isDark ? '#3A7A5A' : '#4A8A6A';
  const midColor = isDark ? '#3A5A8A' : '#4A6A9A';
  const seniorColor = isDark ? '#8A5A3A' : '#9A6A4A';

  const textColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';

  return (
    <div className="w-full overflow-x-auto">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: u23Color }} />
          <span>U23</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: midColor }} />
          <span>23–29</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: seniorColor }} />
          <span>30+</span>
        </div>
        <span className="text-[9px] text-muted-foreground/50 ml-2">% of total minutes played</span>
      </div>

      <svg viewBox={`0 0 ${chartWidth} ${svgHeight}`} className="w-full" style={{ minWidth: '500px' }}>
        {/* Grid lines at 25%, 50%, 75% */}
        {[25, 50, 75].map(v => {
          const x = labelWidth + (v / 100) * barAreaWidth;
          return (
            <g key={v}>
              <line x1={x} y1={0} x2={x} y2={svgHeight - 20} stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'} strokeDasharray="3,3" />
              <text x={x} y={svgHeight - 6} fill={textColor} fontSize={8} fontFamily="Space Grotesk" textAnchor="middle">
                {v}%
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const y = i * (barHeight + 4) + 4;
          const u23W = (d.u23 / 100) * barAreaWidth;
          const midW = (d.mid / 100) * barAreaWidth;
          const seniorW = (d.senior / 100) * barAreaWidth;

          return (
            <g key={d.teamId}>
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
                {d.teamShort}
              </text>

              {/* Stacked bar shadow */}
              <rect
                x={labelWidth + 2}
                y={y + 2}
                width={barAreaWidth}
                height={barHeight}
                rx={2}
                fill={isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)'}
              />

              {/* U23 segment */}
              <rect
                x={labelWidth}
                y={y}
                width={u23W}
                height={barHeight}
                rx={2}
                fill={u23Color}
                fillOpacity={0.85}
              />
              {/* Highlight */}
              <rect
                x={labelWidth + 1}
                y={y + 1}
                width={Math.max(0, u23W - 2)}
                height={barHeight * 0.25}
                rx={1}
                fill={lighten(u23Color, 0.3)}
                fillOpacity={0.2}
              />

              {/* Mid segment */}
              <rect
                x={labelWidth + u23W}
                y={y}
                width={midW}
                height={barHeight}
                fill={midColor}
                fillOpacity={0.85}
              />

              {/* Senior segment */}
              <rect
                x={labelWidth + u23W + midW}
                y={y}
                width={seniorW}
                height={barHeight}
                rx={2}
                fill={seniorColor}
                fillOpacity={0.85}
              />

              {/* Percentage labels inside bars if wide enough */}
              {u23W > 30 && (
                <text x={labelWidth + u23W / 2} y={y + barHeight / 2 + 3.5} fill="white" fillOpacity={0.7} fontSize={8} fontFamily="Space Grotesk" fontWeight={600} textAnchor="middle">
                  {d.u23.toFixed(0)}%
                </text>
              )}
              {midW > 30 && (
                <text x={labelWidth + u23W + midW / 2} y={y + barHeight / 2 + 3.5} fill="white" fillOpacity={0.7} fontSize={8} fontFamily="Space Grotesk" fontWeight={600} textAnchor="middle">
                  {d.mid.toFixed(0)}%
                </text>
              )}
              {seniorW > 30 && (
                <text x={labelWidth + u23W + midW + seniorW / 2} y={y + barHeight / 2 + 3.5} fill="white" fillOpacity={0.7} fontSize={8} fontFamily="Space Grotesk" fontWeight={600} textAnchor="middle">
                  {d.senior.toFixed(0)}%
                </text>
              )}
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

export default function DeepDivePanel({ metrics, players, teams }: DeepDivePanelProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isExpanded, setIsExpanded] = useState(false);

  const depthInsight = useMemo(() => squadDepthInsights(metrics), [metrics]);
  const salaryInsight = useMemo(() => salaryRoadInsights(metrics, teams), [metrics, teams]);
  const ageInsight = useMemo(() => ageDistributionInsight(players, teams), [players, teams]);

  const panelVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.15 + 0.2, duration: 0.4, ease: 'easeOut' as const },
    }),
  };

  return (
    <div>
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all text-[12px] font-bold tracking-wider uppercase ${
          isExpanded
            ? 'neu-pressed text-amber'
            : 'neu-raised text-muted-foreground hover:text-foreground'
        }`}
        style={{ fontFamily: 'Space Grotesk' }}
      >
        {isExpanded ? (
          <>Close Deep Dive <ChevronUp size={14} /></>
        ) : (
          <>Deep Dive — Squad Construction & Salary Analysis <ChevronDown size={14} /></>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
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
                    ? 'linear-gradient(145deg, rgba(25,25,40,0.7), rgba(18,18,30,0.9))'
                    : 'linear-gradient(145deg, rgba(245,245,252,0.8), rgba(230,230,240,0.9))',
                  boxShadow: isDark
                    ? '4px 4px 12px rgba(0,0,0,0.4), -3px -3px 8px rgba(60,60,80,0.06)'
                    : '4px 4px 12px rgba(0,0,0,0.06), -3px -3px 8px rgba(255,255,255,0.7)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Layers size={14} className="text-cyan" />
                  <h4 className="text-[12px] font-bold uppercase tracking-wider" style={{ fontFamily: 'Space Grotesk' }}>
                    Squad Depth Breakdown
                  </h4>
                  <span className="text-[9px] text-muted-foreground/50 ml-1">Minutes HHI Index — higher = more even rotation</span>
                </div>
                {depthInsight && (
                  <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed px-1" style={{ fontFamily: 'Space Grotesk' }}>
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
                    ? 'linear-gradient(145deg, rgba(25,25,40,0.7), rgba(18,18,30,0.9))'
                    : 'linear-gradient(145deg, rgba(245,245,252,0.8), rgba(230,230,240,0.9))',
                  boxShadow: isDark
                    ? '4px 4px 12px rgba(0,0,0,0.4), -3px -3px 8px rgba(60,60,80,0.06)'
                    : '4px 4px 12px rgba(0,0,0,0.06), -3px -3px 8px rgba(255,255,255,0.7)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={14} className="text-amber" />
                  <h4 className="text-[12px] font-bold uppercase tracking-wider" style={{ fontFamily: 'Space Grotesk' }}>
                    Salary Concentration vs Road Performance
                  </h4>
                </div>
                {salaryInsight && (
                  <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed px-1" style={{ fontFamily: 'Space Grotesk' }}>
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
                    ? 'linear-gradient(145deg, rgba(25,25,40,0.7), rgba(18,18,30,0.9))'
                    : 'linear-gradient(145deg, rgba(245,245,252,0.8), rgba(230,230,240,0.9))',
                  boxShadow: isDark
                    ? '4px 4px 12px rgba(0,0,0,0.4), -3px -3px 8px rgba(60,60,80,0.06)'
                    : '4px 4px 12px rgba(0,0,0,0.06), -3px -3px 8px rgba(255,255,255,0.7)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Users size={14} className="text-emerald" />
                  <h4 className="text-[12px] font-bold uppercase tracking-wider" style={{ fontFamily: 'Space Grotesk' }}>
                    Age Distribution
                  </h4>
                  <span className="text-[9px] text-muted-foreground/50 ml-1">% of minutes by age bracket</span>
                </div>
                {ageInsight && (
                  <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed px-1" style={{ fontFamily: 'Space Grotesk' }}>
                    {ageInsight}
                  </p>
                )}
                <AgeDistributionBars metrics={metrics} players={players} isDark={isDark} />
              </motion.div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
