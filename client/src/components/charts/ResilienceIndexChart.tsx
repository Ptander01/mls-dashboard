/**
 * ResilienceIndexChart — Travel Resilience Index Ranked Bar Chart
 *
 * Full-width ranked horizontal bar chart showing the composite resilience score.
 * Uses the same 3D extruded bar aesthetic as the Stadium Fill Rate chart:
 * - Front face with vertical gradient (highlight → base → shadow)
 * - Right side face and bottom face for 3D extrusion depth
 * - Cast shadow offset below-right
 * - Top highlight strip for bevel
 *
 * Color symbology toggle:
 * - SCORE: bars colored by tier (green/cyan/amber/red)
 * - TEAM: bars use each team's muted earthy primary color from mutedTeamColor
 *
 * View modes: INDEX (overall score) | COMPONENTS (stacked breakdown)
 */

import { useState, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { lighten, darken, mutedTeamColor } from '@/lib/chartUtils';
import type { TeamResilienceMetrics } from '@/lib/resilienceUtils';
import { TIER_COLORS, TIER_LABELS } from '@/lib/resilienceUtils';

type ViewMode = 'INDEX' | 'COMPONENTS';
type ColorMode = 'SCORE' | 'TEAM';

interface ResilienceIndexChartProps {
  metrics: TeamResilienceMetrics[];
  height?: number;
}

// ─── 3D Extruded Horizontal Bar ───
// Matches the Extruded3DHorizontalBar pattern from chartUtils.tsx:
// cast shadow, bottom face, right side face, front face gradient, top highlight
function ExtrudedBar3D({
  x, y, width, height, color, id,
}: {
  x: number; y: number; width: number; height: number; color: string; id: string;
}) {
  if (width <= 0) return null;

  const highlightColor = lighten(color, 0.4);
  const shadowColor = darken(color, 0.5);
  const sideColor = darken(color, 0.35);
  const extrudeX = 2;
  const extrudeY = 3;

  return (
    <g>
      <defs>
        {/* Front face gradient — matte, top-lit, matching Extruded3DHorizontalBar */}
        <linearGradient id={`${id}_grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={highlightColor} stopOpacity={0.92} />
          <stop offset="15%" stopColor={color} stopOpacity={0.88} />
          <stop offset="85%" stopColor={color} stopOpacity={0.85} />
          <stop offset="100%" stopColor={shadowColor} stopOpacity={0.92} />
        </linearGradient>
        <filter id={`${id}_shadow`} x="-25%" y="-20%" width="160%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" />
        </filter>
      </defs>

      {/* Cast shadow — offset below-right */}
      <rect
        x={x + 5}
        y={y + 6}
        width={width + 2}
        height={height + 2}
        rx={3}
        fill="rgba(0,0,0,0.35)"
        filter={`url(#${id}_shadow)`}
      />

      {/* Ambient ground shadow */}
      <rect
        x={x + 1}
        y={y + height - 1}
        width={width}
        height={5}
        rx={2.5}
        fill="rgba(0,0,0,0.12)"
        filter={`url(#${id}_shadow)`}
      />

      {/* Bottom face (extrusion depth) */}
      <path
        d={`M${x},${y + height} L${x + extrudeX},${y + height + extrudeY} L${x + width + extrudeX},${y + height + extrudeY} L${x + width},${y + height} Z`}
        fill={sideColor}
        fillOpacity={0.65}
      />

      {/* Right side face */}
      <path
        d={`M${x + width},${y} L${x + width + extrudeX},${y + extrudeY} L${x + width + extrudeX},${y + height + extrudeY} L${x + width},${y + height} Z`}
        fill={sideColor}
        fillOpacity={0.5}
      />

      {/* Front face */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={2}
        ry={2}
        fill={`url(#${id}_grad)`}
      />

      {/* Top highlight strip */}
      <rect
        x={x + 1}
        y={y}
        width={width - 2}
        height={Math.min(2, height * 0.1)}
        rx={1}
        fill={highlightColor}
        fillOpacity={0.5}
      />
    </g>
  );
}

// ─── Component Pip Indicator ───
function PipIndicator({
  cx, cy, value, maxValue, color, label, id,
}: {
  cx: number; cy: number; value: number; maxValue: number; color: string; label: string; id: string;
}) {
  const r = 5;
  const fillPct = Math.min(1, value / maxValue);
  const highlight = lighten(color, 0.4);
  const shadow = darken(color, 0.4);

  return (
    <g>
      <defs>
        <radialGradient id={`${id}_pip`} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor={highlight} stopOpacity={0.9} />
          <stop offset="50%" stopColor={color} stopOpacity={fillPct * 0.8 + 0.2} />
          <stop offset="100%" stopColor={shadow} stopOpacity={0.7} />
        </radialGradient>
      </defs>

      {/* Pip shadow */}
      <ellipse
        cx={cx + 1}
        cy={cy + r + 1.5}
        rx={r * 1.1}
        ry={r * 0.35}
        fill="rgba(0,0,0,0.15)"
      />

      {/* Background ring */}
      <circle cx={cx} cy={cy} r={r} fill={`rgba(0,0,0,${fillPct < 0.3 ? 0.08 : 0.04})`} stroke={color} strokeWidth={0.5} strokeOpacity={0.3} />

      {/* Filled pip */}
      <circle cx={cx} cy={cy} r={r * fillPct} fill={`url(#${id}_pip)`} />

      {/* Label below */}
      <text
        x={cx}
        y={cy + r + 11}
        textAnchor="middle"
        fontSize={7.5}
        fill="currentColor"
        fillOpacity={0.45}
        fontFamily="JetBrains Mono, monospace"
      >
        {label}
      </text>
    </g>
  );
}

export default function ResilienceIndexChart({ metrics, height = 800 }: ResilienceIndexChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [viewMode, setViewMode] = useState<ViewMode>('INDEX');
  const [colorMode, setColorMode] = useState<ColorMode>('SCORE');

  const sortedMetrics = useMemo(() =>
    [...metrics].sort((a, b) => b.resilienceScore - a.resilienceScore),
    [metrics]
  );

  // Chart dimensions — balanced for readability without excessive scrolling
  const marginLeft = 160;
  const marginRight = 120;
  const marginTop = 8;
  const rowHeight = 36;
  const barHeight = 18;

  const chartWidth = 1200;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const svgHeight = marginTop + sortedMetrics.length * rowHeight + 20;
  const maxScore = 100;

  const xScale = (val: number) => marginLeft + (val / maxScore) * plotWidth;

  // Resolve bar color based on color mode
  const getBarColor = (d: TeamResilienceMetrics) => {
    if (colorMode === 'TEAM') {
      return mutedTeamColor(d.teamId, isDark);
    }
    return TIER_COLORS[d.resilienceTier];
  };

  // Score label color: in TEAM mode use a neutral cyan, in SCORE mode use tier color
  const getScoreColor = (d: TeamResilienceMetrics) => {
    if (colorMode === 'TEAM') {
      return 'var(--cyan)';
    }
    return TIER_COLORS[d.resilienceTier];
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
            Travel Resilience Index — All {sortedMetrics.length} Teams
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {colorMode === 'SCORE'
              ? <>Higher score = performance holds up better under travel and fixture congestion. Bars colored by <span style={{ color: TIER_COLORS.green }}>tier</span>.</>
              : <>Higher score = performance holds up better under travel and fixture congestion. Bars colored by <strong>team identity</strong>.</>
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Color symbology toggle */}
          <div className="flex items-center gap-0">
            {(['SCORE', 'TEAM'] as ColorMode[]).map(c => (
              <button
                key={c}
                onClick={() => setColorMode(c)}
                className={`text-[10px] px-2.5 py-1 font-semibold tracking-wider transition-all ${
                  colorMode === c
                    ? 'neu-pressed text-cyan'
                    : 'neu-raised text-muted-foreground hover:text-foreground'
                } ${c === 'SCORE' ? 'rounded-l-lg' : 'rounded-r-lg'}`}
                style={{ fontFamily: 'Space Grotesk' }}
              >
                {c}
              </button>
            ))}
          </div>
          {/* View mode toggle */}
          <div className="flex items-center gap-0">
            {(['INDEX', 'COMPONENTS'] as ViewMode[]).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`text-[10px] px-3 py-1 font-semibold tracking-wider transition-all ${
                  viewMode === m
                    ? 'neu-pressed text-cyan'
                    : 'neu-raised text-muted-foreground hover:text-foreground'
                } ${m === 'INDEX' ? 'rounded-l-lg' : 'rounded-r-lg'}`}
                style={{ fontFamily: 'Space Grotesk' }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-1 mb-1 text-[9px] text-muted-foreground/50 uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk' }}>
        <span style={{ width: marginLeft, paddingLeft: 4 }}>Team</span>
        <span className="flex-1">Resilience Score</span>
        <span style={{ width: 50, textAlign: 'right' }}>Score</span>
        <span style={{ width: 60, textAlign: 'right', paddingRight: 4 }}>Miles</span>
      </div>

      {/* SVG Chart */}
      <div style={{ overflow: 'hidden', width: '100%' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${svgHeight}`}
          width="100%"
          preserveAspectRatio="xMidYMin meet"
          className="select-none"
          style={{ display: 'block' }}
        >
          {sortedMetrics.map((d, i) => {
            const cy = marginTop + i * rowHeight + rowHeight / 2;
            const barY = cy - barHeight / 2;
            const barColor = getBarColor(d);
            const barWidth = xScale(d.resilienceScore) - marginLeft;
            const uid = `ri_${d.teamId}_${i}`;

            // Format miles
            const milesStr = d.totalAwayMiles >= 1000
              ? `${Math.round(d.totalAwayMiles / 1000)}k mi`
              : `${d.totalAwayMiles} mi`;

            return (
              <g key={d.teamId}>
                {/* Row hover background */}
                <rect
                  x={0} y={cy - rowHeight / 2}
                  width={chartWidth} height={rowHeight}
                  fill="transparent"
                  className="hover:fill-[rgba(0,128,255,0.03)]"
                />

                {/* Team color dot */}
                <circle
                  cx={12}
                  cy={cy}
                  r={4.5}
                  fill={d.teamColor}
                />

                {/* Team name */}
                <text
                  x={22}
                  y={cy + 1}
                  dominantBaseline="middle"
                  fill={isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)'}
                  fontSize={11.5}
                  fontFamily="Space Grotesk, sans-serif"
                  fontWeight={600}
                >
                  {d.teamShort}
                </text>

                {viewMode === 'INDEX' ? (
                  /* INDEX mode: single 3D extruded bar */
                  <ExtrudedBar3D
                    x={marginLeft}
                    y={barY}
                    width={Math.max(0, barWidth)}
                    height={barHeight}
                    color={barColor}
                    id={uid}
                  />
                ) : (
                  /* COMPONENTS mode: stacked segments */
                  (() => {
                    const { awayPerformance, congestionResistance, longHaulRecord } = d.scoreComponents;
                    const total = awayPerformance + congestionResistance + longHaulRecord;
                    const totalWidth = Math.max(0, barWidth);

                    // Proportional widths
                    const w1 = total > 0 ? (awayPerformance / total) * totalWidth : 0;
                    const w2 = total > 0 ? (congestionResistance / total) * totalWidth : 0;
                    const w3 = total > 0 ? (longHaulRecord / total) * totalWidth : 0;

                    const colors = ['#22c55e', '#06b6d4', '#f59e0b'];
                    const widths = [w1, w2, w3];

                    let xOffset = marginLeft;
                    return (
                      <g>
                        {widths.map((w, j) => {
                          const segX = xOffset;
                          xOffset += w;
                          if (w < 2) return null;
                          return (
                            <ExtrudedBar3D
                              key={j}
                              x={segX + (j > 0 ? 1 : 0)}
                              y={barY}
                              width={w - (j > 0 ? 1 : 0)}
                              height={barHeight}
                              color={colors[j]}
                              id={`${uid}_seg${j}`}
                            />
                          );
                        })}
                        {/* Pip indicators */}
                        {[
                          { val: awayPerformance, color: '#22c55e', label: 'Away' },
                          { val: congestionResistance, color: '#06b6d4', label: 'Depth' },
                          { val: longHaulRecord, color: '#f59e0b', label: 'L-Haul' },
                        ].map((pip, j) => (
                          <PipIndicator
                            key={j}
                            cx={marginLeft + totalWidth + 18 + j * 26}
                            cy={cy - 2}
                            value={pip.val}
                            maxValue={100}
                            color={pip.color}
                            label={pip.label}
                            id={`${uid}_pip${j}`}
                          />
                        ))}
                      </g>
                    );
                  })()
                )}

                {/* Score value */}
                <text
                  x={chartWidth - 70}
                  y={cy + 1}
                  dominantBaseline="middle"
                  textAnchor="end"
                  fill={getScoreColor(d)}
                  fontSize={11.5}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight={700}
                >
                  {Math.round(d.resilienceScore)}
                </text>

                {/* Miles value */}
                <text
                  x={chartWidth - 10}
                  y={cy + 1}
                  dominantBaseline="middle"
                  textAnchor="end"
                  fill={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'}
                  fontSize={10}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {milesStr}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend — adapts to color mode */}
      {colorMode === 'SCORE' ? (
        <div className="flex justify-center gap-5 mt-3 text-xs text-muted-foreground/60">
          {(['green', 'cyan', 'amber', 'red'] as const).map(tier => (
            <div key={tier} className="flex items-center gap-1.5">
              <span className="w-3.5 h-2.5 rounded-sm" style={{ backgroundColor: TIER_COLORS[tier] }} />
              <span>{TIER_LABELS[tier]}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex justify-center mt-3 text-xs text-muted-foreground/50">
          <span>Each bar colored by team identity — muted earthy palette</span>
        </div>
      )}
    </div>
  );
}
