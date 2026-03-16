/**
 * DumbbellChart — Home vs Away Performance Gap
 *
 * Neumorphic horizontal dumbbell chart inspired by audio mixer faders:
 * - Grooved inset track (pressed/concave) with inner shadows
 * - 3D raised knob endpoints with cross-hatch texture detail
 * - Colored fill inside the groove between the two endpoints
 * - Sorted by gap magnitude descending
 *
 * Toggle modes: PPG | WIN% | GD (Goal Difference per game)
 * Symbology: STANDARD (green=home, red=away) | TEAM HUE (team primary color gradient)
 */

import { useState, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { lighten, darken, hexToRgba } from '@/lib/chartUtils';
import type { TeamResilienceMetrics } from '@/lib/resilienceUtils';

type MetricMode = 'PPG' | 'WIN%' | 'GD';
type SymbologyMode = 'STANDARD' | 'TEAM';

interface DumbbellChartProps {
  metrics: TeamResilienceMetrics[];
  height?: number;
}

// ─── Neumorphic Grooved Track ───
// A horizontal capsule pressed INTO the surface with inner shadows,
// matching the mixer fader slot aesthetic.
function GroovedTrack({
  x, y, width, height, id, isDark,
}: {
  x: number; y: number; width: number; height: number; id: string; isDark: boolean;
}) {
  const halfH = height / 2;
  // Groove colors — slightly darker than surface, with inner shadow
  const grooveBg = isDark ? '#161625' : '#d4d4de';
  const innerShadowDark = isDark ? 'rgba(0,0,0,0.65)' : 'rgba(140,144,165,0.55)';
  const innerShadowLight = isDark ? 'rgba(60,60,80,0.15)' : 'rgba(255,255,255,0.75)';

  return (
    <g>
      <defs>
        {/* Inner shadow filter — dark top-left, light bottom-right */}
        <filter id={`${id}_inset`} x="-10%" y="-30%" width="120%" height="200%">
          <feFlood floodColor={innerShadowDark} result="dark" />
          <feComposite in="dark" in2="SourceGraphic" operator="in" result="darkIn" />
          <feOffset dx="1.5" dy="1.5" result="darkOffset" />
          <feGaussianBlur in="darkOffset" stdDeviation="1.5" result="darkBlur" />

          <feFlood floodColor={innerShadowLight} result="light" />
          <feComposite in="light" in2="SourceGraphic" operator="in" result="lightIn" />
          <feOffset dx="-1" dy="-1" result="lightOffset" />
          <feGaussianBlur in="lightOffset" stdDeviation="1.2" result="lightBlur" />

          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="darkBlur" />
            <feMergeNode in="lightBlur" />
          </feMerge>
        </filter>
        {/* Subtle concave gradient — darker at top, lighter at bottom */}
        <linearGradient id={`${id}_grooveGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isDark ? '#111120' : '#c8c8d4'} />
          <stop offset="50%" stopColor={grooveBg} />
          <stop offset="100%" stopColor={isDark ? '#1e1e30' : '#dcdce8'} />
        </linearGradient>
      </defs>

      {/* Groove body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={halfH}
        fill={`url(#${id}_grooveGrad)`}
        filter={`url(#${id}_inset)`}
      />
    </g>
  );
}

// ─── Colored Fill Inside Groove ───
// The portion of the groove between the two knob positions, filled with color.
function GrooveFill({
  x, y, width, height, color, id, isDark,
}: {
  x: number; y: number; width: number; height: number; color: string; id: string; isDark: boolean;
}) {
  if (width <= 0) return null;
  const halfH = height / 2;
  const topColor = lighten(color, 0.25);
  const botColor = darken(color, 0.15);

  return (
    <g>
      <defs>
        <linearGradient id={`${id}_fillGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={topColor} stopOpacity={isDark ? 0.7 : 0.6} />
          <stop offset="50%" stopColor={color} stopOpacity={isDark ? 0.6 : 0.5} />
          <stop offset="100%" stopColor={botColor} stopOpacity={isDark ? 0.65 : 0.55} />
        </linearGradient>
      </defs>
      <rect
        x={x}
        y={y + 1}
        width={width}
        height={height - 2}
        rx={Math.max(1, halfH - 1)}
        fill={`url(#${id}_fillGrad)`}
      />
      {/* Inner glow along top edge of fill */}
      <rect
        x={x + 2}
        y={y + 1.5}
        width={Math.max(0, width - 4)}
        height={Math.max(1, (height - 2) * 0.28)}
        rx={Math.max(1, halfH * 0.5)}
        fill={topColor}
        fillOpacity={0.25}
      />
    </g>
  );
}

// ─── 3D Neumorphic Knob ───
// Raised circular button with cross-hatch texture, specular highlight,
// and cast shadow — matching the mixer knob aesthetic.
function NeuKnob3D({
  cx, cy, r, color, id, isDark,
}: {
  cx: number; cy: number; r: number; color: string; id: string; isDark: boolean;
}) {
  const highlight = lighten(color, 0.5);
  const shadow = darken(color, 0.45);
  const midColor = lighten(color, 0.15);

  // Knob surface colors (raised neumorphic)
  const knobBase = isDark ? '#2a2a40' : '#e2e2ec';
  const knobHighlight = isDark ? '#3a3a55' : '#f4f4fc';
  const knobShadow = isDark ? '#151528' : '#c0c0d0';

  return (
    <g>
      <defs>
        {/* Knob body gradient — convex dome lit from upper-left */}
        <radialGradient id={`${id}_knobGrad`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={knobHighlight} />
          <stop offset="45%" stopColor={knobBase} />
          <stop offset="100%" stopColor={knobShadow} />
        </radialGradient>

        {/* Color ring gradient */}
        <radialGradient id={`${id}_ringGrad`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={highlight} stopOpacity={0.9} />
          <stop offset="50%" stopColor={color} stopOpacity={0.85} />
          <stop offset="100%" stopColor={shadow} stopOpacity={0.8} />
        </radialGradient>

        {/* Cast shadow filter */}
        <filter id={`${id}_knobShadow`} x="-60%" y="-30%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
        </filter>
      </defs>

      {/* Cast shadow — elliptical, offset below-right */}
      <ellipse
        cx={cx + 1.5}
        cy={cy + r * 0.8}
        rx={r * 1.6}
        ry={r * 0.6}
        fill={isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.18)'}
        filter={`url(#${id}_knobShadow)`}
      />

      {/* Outer color ring — thin colored border showing home/away identity */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={`url(#${id}_ringGrad)`}
      />

      {/* Inner knob body — raised neumorphic dome */}
      <circle
        cx={cx}
        cy={cy}
        r={r * 0.72}
        fill={`url(#${id}_knobGrad)`}
      />

      {/* Cross-hatch texture — four subtle grooves carved into the knob surface */}
      {/* Vertical groove */}
      <line
        x1={cx} y1={cy - r * 0.38}
        x2={cx} y2={cy + r * 0.38}
        stroke={knobShadow}
        strokeWidth={0.8}
        strokeOpacity={0.5}
        strokeLinecap="round"
      />
      {/* Horizontal groove */}
      <line
        x1={cx - r * 0.38} y1={cy}
        x2={cx + r * 0.38} y2={cy}
        stroke={knobShadow}
        strokeWidth={0.8}
        strokeOpacity={0.5}
        strokeLinecap="round"
      />
      {/* Groove highlight offsets (light side) */}
      <line
        x1={cx + 0.6} y1={cy - r * 0.38}
        x2={cx + 0.6} y2={cy + r * 0.38}
        stroke={knobHighlight}
        strokeWidth={0.5}
        strokeOpacity={0.35}
        strokeLinecap="round"
      />
      <line
        x1={cx - r * 0.38} y1={cy + 0.6}
        x2={cx + r * 0.38} y2={cy + 0.6}
        stroke={knobHighlight}
        strokeWidth={0.5}
        strokeOpacity={0.35}
        strokeLinecap="round"
      />

      {/* Specular highlight — bright spot upper-left */}
      <circle
        cx={cx - r * 0.2}
        cy={cy - r * 0.2}
        r={r * 0.22}
        fill="white"
        fillOpacity={isDark ? 0.25 : 0.4}
      />

      {/* Rim light — subtle bright arc at top */}
      <path
        d={`M${cx - r * 0.5},${cy - r * 0.55} A${r * 0.72},${r * 0.72} 0 0,1 ${cx + r * 0.5},${cy - r * 0.55}`}
        fill="none"
        stroke="white"
        strokeWidth={0.6}
        strokeOpacity={isDark ? 0.15 : 0.25}
      />
    </g>
  );
}

export default function DumbbellChart({ metrics, height = 700 }: DumbbellChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [mode, setMode] = useState<MetricMode>('PPG');
  const [symbology, setSymbology] = useState<SymbologyMode>('STANDARD');

  // Get the appropriate values based on mode
  const chartData = useMemo(() => {
    return metrics.map(m => {
      let homeVal: number, awayVal: number, gap: number;

      switch (mode) {
        case 'PPG':
          homeVal = m.homePPG;
          awayVal = m.awayPPG;
          gap = m.ppgGap;
          break;
        case 'WIN%':
          homeVal = m.homeWinPct;
          awayVal = m.awayWinPct;
          gap = m.winPctGap;
          break;
        case 'GD':
          homeVal = m.homeGDPerGame;
          awayVal = m.awayGDPerGame;
          gap = m.gdPerGameGap;
          break;
      }

      return {
        ...m,
        homeVal,
        awayVal,
        gap,
        absGap: Math.abs(gap),
      };
    }).sort((a, b) => b.absGap - a.absGap);
  }, [metrics, mode]);

  // Chart dimensions — balanced for readability without excessive scrolling
  const marginLeft = 160;
  const marginRight = 70;
  const marginTop = 40;
  const rowHeight = 38;
  const trackHeight = 7;
  const knobRadius = 10;

  const chartWidth = 1200;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const svgHeight = marginTop + chartData.length * rowHeight + 20;

  // Scale: find min/max across all values
  const allValues = chartData.flatMap(d => [d.homeVal, d.awayVal]);
  const dataMin = Math.min(...allValues, 0);
  const dataMax = Math.max(...allValues);
  const padding = (dataMax - dataMin) * 0.1 || 0.2;
  const scaleMin = Math.max(0, dataMin - padding);
  const scaleMax = dataMax + padding;

  const xScale = (val: number) => {
    return marginLeft + ((val - scaleMin) / (scaleMax - scaleMin)) * plotWidth;
  };

  // Tick marks
  const ticks = useMemo(() => {
    const range = scaleMax - scaleMin;
    let step: number;
    if (mode === 'WIN%') {
      step = range > 60 ? 20 : range > 30 ? 10 : 5;
    } else {
      step = range > 2 ? 0.5 : range > 1 ? 0.25 : 0.1;
    }
    const result: number[] = [];
    let v = Math.ceil(scaleMin / step) * step;
    while (v <= scaleMax) {
      result.push(Math.round(v * 100) / 100);
      v += step;
    }
    return result;
  }, [scaleMin, scaleMax, mode]);

  // Standard colors
  const stdHomeColor = '#22c55e';
  const stdAwayColor = '#ef4444';

  // Resolve colors per team based on symbology mode
  const getColors = (teamColor: string) => {
    if (symbology === 'STANDARD') {
      return {
        homeKnob: stdHomeColor,
        awayKnob: stdAwayColor,
        fillColor: isDark ? '#3a8a9a' : '#5aacbc', // neutral teal for the gap fill
      };
    }
    // TEAM mode: use team's primary color with lightness variation
    return {
      homeKnob: lighten(teamColor, 0.15),
      awayKnob: darken(teamColor, 0.25),
      fillColor: teamColor,
    };
  };

  return (
    <div>
      {/* Header with toggles */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
            Home vs Away Points Per Game
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {symbology === 'STANDARD'
              ? <>Each team's average points earned at home <span style={{ color: stdHomeColor }}>(green)</span> vs away <span style={{ color: stdAwayColor }}>(red)</span>. Gap width = home advantage magnitude.</>
              : <>Each team colored by primary hue — lighter knob = home, darker = away. Gap width = home advantage magnitude.</>
            }
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          {/* Symbology toggle */}
          <div className="flex items-center gap-0">
            {(['STANDARD', 'TEAM'] as SymbologyMode[]).map(s => (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); setSymbology(s); }}
                className={`text-[10px] px-2.5 py-1.5 font-semibold tracking-wider transition-all cursor-pointer select-none ${
                  symbology === s
                    ? 'neu-pressed text-cyan'
                    : 'neu-raised text-muted-foreground hover:text-foreground'
                } ${s === 'STANDARD' ? 'rounded-l-lg' : 'rounded-r-lg'}`}
                style={{ fontFamily: 'Space Grotesk', minWidth: '40px', minHeight: '28px' }}
              >
                {s === 'STANDARD' ? 'H/A' : 'TEAM'}
              </button>
            ))}
          </div>
          {/* Metric toggle */}
          <div className="flex items-center gap-0">
            {(['PPG', 'WIN%', 'GD'] as MetricMode[]).map(m => (
              <button
                key={m}
                onClick={(e) => { e.stopPropagation(); setMode(m); }}
                className={`text-[10px] px-3 py-1.5 font-semibold tracking-wider transition-all cursor-pointer select-none ${
                  mode === m
                    ? 'neu-pressed text-cyan'
                    : 'neu-raised text-muted-foreground hover:text-foreground'
                } ${m === 'PPG' ? 'rounded-l-lg' : m === 'GD' ? 'rounded-r-lg' : ''}`}
                style={{ fontFamily: 'Space Grotesk', minWidth: '40px', minHeight: '28px' }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-2 px-1 text-[11px] text-muted-foreground">
        {symbology === 'STANDARD' ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2" style={{
                borderColor: stdHomeColor,
                background: isDark ? '#2a2a40' : '#e2e2ec',
              }} />
              <span>Home</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2" style={{
                borderColor: stdAwayColor,
                background: isDark ? '#2a2a40' : '#e2e2ec',
              }} />
              <span>Away</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2" style={{
                borderColor: isDark ? '#6a6a8a' : '#888',
                background: isDark ? '#3a3a55' : '#eaeaf2',
              }} />
              <span>Home (lighter)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2" style={{
                borderColor: isDark ? '#3a3a55' : '#666',
                background: isDark ? '#1e1e30' : '#c8c8d4',
              }} />
              <span>Away (darker)</span>
            </div>
          </>
        )}
        <span className="text-muted-foreground/40 ml-1">|</span>
        <span className="text-muted-foreground/50">Gap width = advantage magnitude</span>
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
          {/* X-axis ticks and labels */}
          {ticks.map((tick, i) => {
            const x = xScale(tick);
            return (
              <g key={i}>
                <line
                  x1={x} y1={marginTop - 15}
                  x2={x} y2={svgHeight - 10}
                  stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                  strokeDasharray="2 4"
                />
                <text
                  x={x} y={marginTop - 20}
                  textAnchor="middle"
                  fill={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'}
                  fontSize={9.5}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {mode === 'WIN%' ? `${tick}%` : tick.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Rows */}
          {chartData.map((d, i) => {
            const cy = marginTop + i * rowHeight + rowHeight / 2;
            const homeX = xScale(d.homeVal);
            const awayX = xScale(d.awayVal);
            const uid = `db_${d.teamId}_${i}`;

            const colors = getColors(d.teamColor);

            // Gap label
            const gapColor = 'var(--cyan)';
            const gapSign = d.gap >= 0 ? '+' : '';
            const gapLabel = mode === 'WIN%'
              ? `${gapSign}${d.gap.toFixed(0)}%`
              : `${gapSign}${d.gap.toFixed(2)}`;

            // Track spans full plot width
            const trackX = marginLeft;
            const trackW = plotWidth;

            // Fill between the two knobs
            const fillLeft = Math.min(homeX, awayX);
            const fillWidth = Math.abs(homeX - awayX);

            return (
              <g key={d.teamId}>
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

                {/* Grooved track — full width inset rail */}
                <GroovedTrack
                  x={trackX}
                  y={cy - trackHeight / 2}
                  width={trackW}
                  height={trackHeight}
                  id={uid}
                  isDark={isDark}
                />

                {/* Colored fill inside groove between knobs */}
                <GrooveFill
                  x={fillLeft}
                  y={cy - trackHeight / 2}
                  width={fillWidth}
                  height={trackHeight}
                  color={colors.fillColor}
                  id={`${uid}_fill`}
                  isDark={isDark}
                />

                {/* Away knob — rendered first so home overlaps if very close */}
                <NeuKnob3D
                  cx={awayX}
                  cy={cy}
                  r={knobRadius}
                  color={colors.awayKnob}
                  id={`${uid}_away`}
                  isDark={isDark}
                />

                {/* Home knob */}
                <NeuKnob3D
                  cx={homeX}
                  cy={cy}
                  r={knobRadius}
                  color={colors.homeKnob}
                  id={`${uid}_home`}
                  isDark={isDark}
                />

                {/* Gap value label */}
                <text
                  x={chartWidth - 10}
                  y={cy + 1}
                  dominantBaseline="middle"
                  textAnchor="end"
                  fill={gapColor}
                  fontSize={11}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight={700}
                >
                  {gapLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
