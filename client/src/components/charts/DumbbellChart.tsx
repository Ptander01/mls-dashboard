/**
 * DumbbellChart — Home vs Away Performance Gap
 *
 * Neumorphic horizontal dumbbell chart with brushed chrome knob endpoints:
 * - Grooved inset track (pressed/concave) with inner shadows
 * - Chrome metallic knob endpoints with conical gradient sweep,
 *   rim highlight, and cast shadow — inspired by anodized metal dials
 * - Standard mode: dark forest green (home) / dark burgundy (away) chrome
 * - Team mode: each team's primary color as the anodized metal hue
 *
 * Toggle modes: PPG | WIN% | GD (Goal Difference per game)
 * Symbology: STANDARD (green=home, red=away) | TEAM HUE (team primary color gradient)
 */

import { useState, useMemo, memo } from 'react';
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
function GroovedTrack({
  x, y, width, height, id, isDark,
}: {
  x: number; y: number; width: number; height: number; id: string; isDark: boolean;
}) {
  const halfH = height / 2;
  const grooveBg = isDark ? '#161625' : '#d4d4de';
  const innerShadowDark = isDark ? 'rgba(0,0,0,0.65)' : 'rgba(140,144,165,0.55)';
  const innerShadowLight = isDark ? 'rgba(60,60,80,0.15)' : 'rgba(255,255,255,0.75)';

  return (
    <g>
      <defs>
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
        <linearGradient id={`${id}_grooveGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isDark ? '#111120' : '#c8c8d4'} />
          <stop offset="50%" stopColor={grooveBg} />
          <stop offset="100%" stopColor={isDark ? '#1e1e30' : '#dcdce8'} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={width} height={height} rx={halfH}
        fill={`url(#${id}_grooveGrad)`} filter={`url(#${id}_inset)`} />
    </g>
  );
}

// ─── Colored Fill Inside Groove ───
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
      <rect x={x} y={y + 1} width={width} height={height - 2}
        rx={Math.max(1, halfH - 1)} fill={`url(#${id}_fillGrad)`} />
      <rect x={x + 2} y={y + 1.5} width={Math.max(0, width - 4)}
        height={Math.max(1, (height - 2) * 0.28)} rx={Math.max(1, halfH * 0.5)}
        fill={topColor} fillOpacity={0.25} />
    </g>
  );
}

// ─── Chrome Metallic Knob ───
// Simulates a brushed conical gradient using multiple angular SVG wedge slices.
// Each slice transitions from dark to light to dark around the circumference,
// creating the characteristic "brushed metal dial" look.
function ChromeKnob({
  cx, cy, r, color, id, isDark,
}: {
  cx: number; cy: number; r: number; color: string; id: string; isDark: boolean;
}) {
  // Derive chrome palette from the base color
  const baseHue = color;
  const darkest = darken(baseHue, 0.55);
  const dark = darken(baseHue, 0.35);
  const mid = darken(baseHue, 0.1);
  const bright = lighten(baseHue, 0.25);
  const brightest = lighten(baseHue, 0.45);
  const highlight = lighten(baseHue, 0.6);

  // Number of angular slices for the conical sweep
  const SLICES = 24;

  // Conical gradient color stops — creates the brushed metal sweep pattern
  // Pattern: dark → bright → dark → bright (two highlight bands at ~90° and ~270°)
  const getSliceColor = (angle: number): string => {
    // Normalize to 0-1
    const t = angle / (2 * Math.PI);
    // Two-peak pattern for brushed metal
    const v = Math.sin(t * Math.PI * 2 + 0.3) * 0.5 + 0.5;
    // Secondary modulation for asymmetry (light source from top-left)
    const lightBias = Math.sin(t * Math.PI * 2 - 1.2) * 0.25 + 0.5;
    const combined = v * 0.65 + lightBias * 0.35;

    if (combined > 0.8) return brightest;
    if (combined > 0.65) return bright;
    if (combined > 0.45) return mid;
    if (combined > 0.3) return dark;
    return darkest;
  };

  // Generate wedge paths for conical gradient
  const wedges = useMemo(() => {
    const result: { path: string; fill: string }[] = [];
    const innerR = 0; // from center
    const outerR = r * 0.88; // leave room for rim

    for (let i = 0; i < SLICES; i++) {
      const a1 = (i / SLICES) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((i + 1) / SLICES) * Math.PI * 2 - Math.PI / 2;
      const midAngle = (a1 + a2) / 2;

      const x1o = cx + Math.cos(a1) * outerR;
      const y1o = cy + Math.sin(a1) * outerR;
      const x2o = cx + Math.cos(a2) * outerR;
      const y2o = cy + Math.sin(a2) * outerR;

      // Simple wedge from center to arc
      const path = `M ${cx},${cy} L ${x1o},${y1o} A ${outerR},${outerR} 0 0,1 ${x2o},${y2o} Z`;
      const fill = getSliceColor(midAngle + Math.PI / 2);

      result.push({ path, fill });
    }
    return result;
  }, [cx, cy, r, color]);

  return (
    <g>
      <defs>
        {/* Cast shadow */}
        <filter id={`${id}_shadow`} x="-60%" y="-30%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" />
        </filter>

        {/* Rim gradient — metallic edge ring */}
        <radialGradient id={`${id}_rim`} cx="35%" cy="28%" r="68%">
          <stop offset="0%" stopColor={brightest} stopOpacity={0.9} />
          <stop offset="40%" stopColor={mid} stopOpacity={0.85} />
          <stop offset="100%" stopColor={darkest} stopOpacity={0.9} />
        </radialGradient>

        {/* Center dimple gradient */}
        <radialGradient id={`${id}_dimple`} cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor={bright} stopOpacity={0.6} />
          <stop offset="60%" stopColor={dark} stopOpacity={0.7} />
          <stop offset="100%" stopColor={darkest} stopOpacity={0.85} />
        </radialGradient>

        {/* Clip circle for the conical wedges */}
        <clipPath id={`${id}_clip`}>
          <circle cx={cx} cy={cy} r={r * 0.88} />
        </clipPath>
      </defs>

      {/* Cast shadow */}
      <ellipse
        cx={cx + 1.2} cy={cy + r * 0.7}
        rx={r * 1.5} ry={r * 0.55}
        fill={isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.15)'}
        filter={`url(#${id}_shadow)`}
      />

      {/* Outer rim ring — metallic edge */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}_rim)`} />

      {/* Rim highlight arc — bright edge on top-left */}
      <path
        d={(() => {
          const arcR = r;
          const sa = -2.4; // ~-137°
          const ea = -0.7; // ~-40°
          const x1 = cx + Math.cos(sa) * arcR;
          const y1 = cy + Math.sin(sa) * arcR;
          const x2 = cx + Math.cos(ea) * arcR;
          const y2 = cy + Math.sin(ea) * arcR;
          return `M ${x1},${y1} A ${arcR},${arcR} 0 0,1 ${x2},${y2}`;
        })()}
        fill="none"
        stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)'}
        strokeWidth={1.2}
        strokeLinecap="round"
      />

      {/* Rim shadow arc — dark edge on bottom-right */}
      <path
        d={(() => {
          const arcR = r;
          const sa = 0.7;
          const ea = 2.4;
          const x1 = cx + Math.cos(sa) * arcR;
          const y1 = cy + Math.sin(sa) * arcR;
          const x2 = cx + Math.cos(ea) * arcR;
          const y2 = cy + Math.sin(ea) * arcR;
          return `M ${x1},${y1} A ${arcR},${arcR} 0 0,1 ${x2},${y2}`;
        })()}
        fill="none"
        stroke={isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'}
        strokeWidth={1}
        strokeLinecap="round"
      />

      {/* Conical gradient body — brushed metal sweep */}
      <g clipPath={`url(#${id}_clip)`}>
        {wedges.map((w, i) => (
          <path key={i} d={w.path} fill={w.fill} />
        ))}
      </g>

      {/* Smooth overlay — radial gradient to soften the wedge transitions */}
      <circle
        cx={cx} cy={cy} r={r * 0.87}
        fill="transparent"
        style={{ mixBlendMode: 'soft-light' }}
      />

      {/* Upper-left highlight wash — simulates directional light */}
      <ellipse
        cx={cx - r * 0.2} cy={cy - r * 0.25}
        rx={r * 0.55} ry={r * 0.45}
        fill={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)'}
        clipPath={`url(#${id}_clip)`}
      />

      {/* Lower-right shadow wash */}
      <ellipse
        cx={cx + r * 0.2} cy={cy + r * 0.25}
        rx={r * 0.5} ry={r * 0.4}
        fill={isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.06)'}
        clipPath={`url(#${id}_clip)`}
      />

      {/* Center dimple — small concave pit in the middle of the dial */}
      <circle cx={cx} cy={cy} r={r * 0.18} fill={`url(#${id}_dimple)`} />

      {/* Dimple inner shadow ring */}
      <circle cx={cx} cy={cy} r={r * 0.17} fill="none"
        stroke={isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)'} strokeWidth={0.5} />

      {/* Specular highlight — tiny bright dot */}
      <circle
        cx={cx - r * 0.06} cy={cy - r * 0.06}
        r={r * 0.06}
        fill="white"
        fillOpacity={isDark ? 0.3 : 0.5}
      />

      {/* Outer edge line — thin bright ring */}
      <circle cx={cx} cy={cy} r={r}
        fill="none"
        stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.35)'}
        strokeWidth={0.6}
      />
    </g>
  );
}

function DumbbellChartInner({ metrics, height = 700 }: DumbbellChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [mode, setMode] = useState<MetricMode>('PPG');
  const [symbology, setSymbology] = useState<SymbologyMode>('STANDARD');

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

  const marginLeft = 160;
  const marginRight = 70;
  const marginTop = 40;
  const rowHeight = 38;
  const trackHeight = 7;
  const knobRadius = 10;

  const chartWidth = 1200;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const svgHeight = marginTop + chartData.length * rowHeight + 20;

  const allValues = chartData.flatMap(d => [d.homeVal, d.awayVal]);
  const dataMin = Math.min(...allValues, 0);
  const dataMax = Math.max(...allValues);
  const padding = (dataMax - dataMin) * 0.1 || 0.2;
  const scaleMin = dataMin - padding;
  const scaleMax = dataMax + padding;

  const xScale = (val: number) => {
    return marginLeft + ((val - scaleMin) / (scaleMax - scaleMin)) * plotWidth;
  };

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

  // Chrome colors for standard mode — dark forest green & dark burgundy
  const stdHomeColor = '#2d5a3a'; // dark forest green chrome
  const stdAwayColor = '#6b2d3a'; // dark burgundy/rose chrome

  const getColors = (teamColor: string) => {
    if (symbology === 'STANDARD') {
      return {
        homeKnob: stdHomeColor,
        awayKnob: stdAwayColor,
        fillColor: isDark ? '#3a8a9a' : '#5aacbc',
      };
    }
    return {
      homeKnob: lighten(teamColor, 0.1),
      awayKnob: darken(teamColor, 0.2),
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
              ? <>Each team's average points earned at home <span style={{ color: '#4a9a5a' }}>(green)</span> vs away <span style={{ color: '#c45a6a' }}>(red)</span>. Gap width = home advantage magnitude.</>
              : <>Each team colored by primary hue — lighter knob = home, darker = away. Gap width = home advantage magnitude.</>
            }
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
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
              <svg width="14" height="14" viewBox="0 0 14 14">
                <circle cx="7" cy="7" r="6" fill={stdHomeColor} />
                <circle cx="7" cy="7" r="6" fill="none" stroke={lighten(stdHomeColor, 0.3)} strokeWidth={0.5} />
                <circle cx="5.5" cy="5.5" r="1.5" fill="white" fillOpacity={0.2} />
              </svg>
              <span>Home</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14">
                <circle cx="7" cy="7" r="6" fill={stdAwayColor} />
                <circle cx="7" cy="7" r="6" fill="none" stroke={lighten(stdAwayColor, 0.3)} strokeWidth={0.5} />
                <circle cx="5.5" cy="5.5" r="1.5" fill="white" fillOpacity={0.2} />
              </svg>
              <span>Away</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14">
                <circle cx="7" cy="7" r="6" fill={isDark ? '#4a4a65' : '#bbbbd0'} />
                <circle cx="5.5" cy="5.5" r="1.5" fill="white" fillOpacity={0.2} />
              </svg>
              <span>Home (lighter chrome)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14">
                <circle cx="7" cy="7" r="6" fill={isDark ? '#2a2a40' : '#888898'} />
                <circle cx="5.5" cy="5.5" r="1.5" fill="white" fillOpacity={0.15} />
              </svg>
              <span>Away (darker chrome)</span>
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

            const gapColor = 'var(--cyan)';
            const gapSign = d.gap >= 0 ? '+' : '';
            const gapLabel = mode === 'WIN%'
              ? `${gapSign}${d.gap.toFixed(0)}%`
              : `${gapSign}${d.gap.toFixed(2)}`;

            const trackX = marginLeft;
            const trackW = plotWidth;
            const fillLeft = Math.min(homeX, awayX);
            const fillWidth = Math.abs(homeX - awayX);

            return (
              <g key={d.teamId}>
                {/* Team color dot */}
                <circle cx={12} cy={cy} r={4.5} fill={d.teamColor} />

                {/* Team name */}
                <text
                  x={22} y={cy + 1}
                  dominantBaseline="middle"
                  fill={isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)'}
                  fontSize={11.5}
                  fontFamily="Space Grotesk, sans-serif"
                  fontWeight={600}
                >
                  {d.teamShort}
                </text>

                {/* Grooved track */}
                <GroovedTrack
                  x={trackX} y={cy - trackHeight / 2}
                  width={trackW} height={trackHeight}
                  id={uid} isDark={isDark}
                />

                {/* Colored fill between knobs */}
                <GrooveFill
                  x={fillLeft} y={cy - trackHeight / 2}
                  width={fillWidth} height={trackHeight}
                  color={colors.fillColor} id={`${uid}_fill`} isDark={isDark}
                />

                {/* Away knob — rendered first so home overlaps if close */}
                <ChromeKnob
                  cx={awayX} cy={cy} r={knobRadius}
                  color={colors.awayKnob} id={`${uid}_away`} isDark={isDark}
                />

                {/* Home knob */}
                <ChromeKnob
                  cx={homeX} cy={cy} r={knobRadius}
                  color={colors.homeKnob} id={`${uid}_home`} isDark={isDark}
                />

                {/* Gap value label */}
                <text
                  x={chartWidth - 10} y={cy + 1}
                  dominantBaseline="middle" textAnchor="end"
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

const DumbbellChart = memo(DumbbellChartInner, (prev, next) =>
  prev.metrics === next.metrics && prev.height === next.height
);
export default DumbbellChart;
