/**
 * TravelScatterChart — Travel Burden vs Away Performance Drop
 *
 * Cinematic recessed-impression scatter plot inspired by pressed-clay impact maps.
 * Each team is a physically "pressed into" crater with:
 *   - Thick beveled rim with directional lighting (top-left light source)
 *   - Deep inner bowl with shadow crescent and highlight crescent
 *   - Variable-spacing concentric rings that tighten toward center
 *   - Dark center pit with specular highlight
 *   - Soft cast shadow beneath
 *
 *   X-axis: Total away miles
 *   Y-axis: Home/Away PPG delta (home advantage)
 *   Crater depth (ring count): Squad depth index
 *   Crater diameter: PPG gap magnitude
 */

import { useState, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { mutedTeamColor, linearRegression, lighten, darken, hexToRgba } from '@/lib/chartUtils';
import type { TeamResilienceMetrics } from '@/lib/resilienceUtils';

type ConferenceFilter = 'ALL' | 'EAST' | 'WEST';

interface TravelScatterChartProps {
  metrics: TeamResilienceMetrics[];
}

// ─── Insight headline generator ───
function generateScatterHeadline(metrics: TeamResilienceMetrics[]): string {
  if (metrics.length < 5) return 'Not enough data to analyze travel-performance patterns.';

  const pts = metrics.map(m => ({ x: m.totalAwayMiles, y: m.ppgGap }));
  const reg = linearRegression(pts);

  const mostTravel = [...metrics].sort((a, b) => b.totalAwayMiles - a.totalAwayMiles)[0];
  const biggestGap = [...metrics].sort((a, b) => b.ppgGap - a.ppgGap)[0];

  const withResiduals = metrics.map(m => ({
    ...m,
    predicted: reg.slope * m.totalAwayMiles + reg.intercept,
    residual: m.ppgGap - (reg.slope * m.totalAwayMiles + reg.intercept),
  }));
  const overperformer = [...withResiduals].sort((a, b) => b.residual - a.residual)[0];

  if (Math.abs(reg.r2) < 0.1) {
    return `No clear travel penalty league-wide (R² = ${reg.r2.toFixed(2)}) — but ${biggestGap.teamShort} shows the largest home advantage gap (${biggestGap.ppgGap.toFixed(2)} PPG). ${overperformer.teamShort} outperforms expectations given their ${(overperformer.totalAwayMiles / 1000).toFixed(0)}k travel miles.`;
  }

  const direction = reg.slope > 0 ? 'increases' : 'decreases';
  return `Home advantage ${direction} with travel distance (R² = ${reg.r2.toFixed(2)}). ${mostTravel.teamShort} traveled the most (${(mostTravel.totalAwayMiles / 1000).toFixed(0)}k mi) with a ${mostTravel.ppgGap.toFixed(2)} PPG gap, while ${overperformer.teamShort} defies the trend — maintaining resilience despite ${(overperformer.totalAwayMiles / 1000).toFixed(0)}k miles.`;
}

// ─── Cinematic Crater Component ───
// Light source: top-left at ~315° (10 o'clock)
// This creates: highlight on top-left rim, shadow on bottom-right interior
const LIGHT_ANGLE = -0.7; // radians, ~315°
const LX = Math.cos(LIGHT_ANGLE);
const LY = Math.sin(LIGHT_ANGLE);

function Crater({
  cx,
  cy,
  baseRadius,
  ringCount,
  teamColor,
  isDark,
  teamShort,
  labelColor,
  id,
}: {
  cx: number;
  cy: number;
  baseRadius: number;
  ringCount: number;
  teamColor: string;
  isDark: boolean;
  teamShort: string;
  labelColor: string;
  id: string;
}) {
  const R = baseRadius;
  const rimWidth = R * 0.18; // Thick beveled rim

  return (
    <g>
      {/* ═══ DEFS — per-crater gradients ═══ */}
      <defs>
        {/* Cast shadow blur */}
        <filter id={`cs-${id}`} x="-60%" y="-40%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={R * 0.12} />
        </filter>

        {/* Inner bowl blur (for shadow/highlight crescents) */}
        <filter id={`ib-${id}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={R * 0.08} />
        </filter>

        {/* Rim bevel gradient — simulates a thick raised lip around the crater */}
        <radialGradient id={`rim-${id}`} cx="38%" cy="32%" r="62%">
          <stop offset="0%" stopColor={isDark ? 'rgba(70,70,90,0.5)' : 'rgba(255,255,255,0.85)'} />
          <stop offset="55%" stopColor={isDark ? 'rgba(45,45,60,0.3)' : 'rgba(240,238,235,0.6)'} />
          <stop offset="100%" stopColor={isDark ? 'rgba(20,20,30,0.5)' : 'rgba(190,188,185,0.5)'} />
        </radialGradient>

        {/* Inner bowl gradient — the recessed depression */}
        <radialGradient id={`bowl-${id}`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={isDark ? 'rgba(55,55,70,0.35)' : 'rgba(225,223,220,0.6)'} />
          <stop offset="35%" stopColor={hexToRgba(teamColor, isDark ? 0.15 : 0.1)} />
          <stop offset="70%" stopColor={isDark ? 'rgba(25,25,38,0.5)' : 'rgba(195,193,190,0.45)'} />
          <stop offset="100%" stopColor={isDark ? 'rgba(12,12,20,0.65)' : 'rgba(175,173,170,0.4)'} />
        </radialGradient>

        {/* Center pit gradient */}
        <radialGradient id={`pit-${id}`} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor={hexToRgba(teamColor, isDark ? 0.3 : 0.2)} />
          <stop offset="60%" stopColor={isDark ? darken(teamColor, 0.5) : darken(teamColor, 0.25)} />
          <stop offset="100%" stopColor={isDark ? 'rgba(5,5,10,0.9)' : 'rgba(120,118,115,0.5)'} />
        </radialGradient>

        {/* Clip for interior elements */}
        <clipPath id={`clip-${id}`}>
          <circle cx={cx} cy={cy} r={R - rimWidth * 0.5} />
        </clipPath>

        {/* Clip for rim ring */}
        <clipPath id={`rimclip-${id}`}>
          <circle cx={cx} cy={cy} r={R + rimWidth * 0.5} />
        </clipPath>
      </defs>

      {/* ═══ 1. CAST SHADOW — soft ellipse offset toward bottom-right ═══ */}
      <ellipse
        cx={cx + R * 0.08}
        cy={cy + R * 0.12}
        rx={R + rimWidth + 4}
        ry={R * 0.5 + rimWidth + 2}
        fill={isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)'}
        filter={`url(#cs-${id})`}
      />

      {/* ═══ 2. OUTER RIM — thick beveled ring ═══ */}
      {/* Rim base fill */}
      <circle
        cx={cx}
        cy={cy}
        r={R + rimWidth * 0.3}
        fill={`url(#rim-${id})`}
      />

      {/* Rim highlight arc — top-left crescent catching light */}
      <ellipse
        cx={cx + LX * R * 0.12}
        cy={cy + LY * R * 0.12}
        rx={R * 0.85}
        ry={R * 0.7}
        fill={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)'}
        clipPath={`url(#rimclip-${id})`}
      />

      {/* Rim shadow arc — bottom-right crescent in shadow */}
      <ellipse
        cx={cx - LX * R * 0.2}
        cy={cy - LY * R * 0.2}
        rx={R * 0.9}
        ry={R * 0.75}
        fill={isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.04)'}
        clipPath={`url(#rimclip-${id})`}
      />

      {/* Rim outer edge — thin bright line on light side */}
      <circle
        cx={cx}
        cy={cy}
        r={R + rimWidth * 0.3}
        fill="none"
        stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)'}
        strokeWidth={1.2}
      />

      {/* ═══ 3. INNER BOWL — the recessed depression ═══ */}
      <circle
        cx={cx}
        cy={cy}
        r={R - rimWidth * 0.3}
        fill={`url(#bowl-${id})`}
      />

      {/* Bowl shadow crescent — deep shadow on bottom-right interior */}
      <ellipse
        cx={cx - LX * R * 0.3}
        cy={cy - LY * R * 0.3}
        rx={R * 0.85}
        ry={R * 0.65}
        fill={isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.08)'}
        clipPath={`url(#clip-${id})`}
        filter={`url(#ib-${id})`}
      />

      {/* Bowl highlight crescent — light hitting the upper-left inner wall */}
      <ellipse
        cx={cx + LX * R * 0.25}
        cy={cy + LY * R * 0.25}
        rx={R * 0.55}
        ry={R * 0.4}
        fill={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.3)'}
        clipPath={`url(#clip-${id})`}
      />

      {/* ═══ 4. CONCENTRIC RINGS — variable spacing, tighter toward center ═══ */}
      {Array.from({ length: ringCount }, (_, i) => {
        // Exponential spacing: rings get tighter toward center (like topo contours descending)
        const t = (i + 1) / (ringCount + 1);
        const ringR = (R - rimWidth) * (1 - Math.pow(1 - t, 1.6)); // Tighter at center
        
        // Rings deeper in the bowl are more opaque and slightly thicker
        const depth = i / Math.max(1, ringCount - 1);
        const opacity = isDark
          ? 0.1 + depth * 0.35
          : 0.08 + depth * 0.25;
        const strokeW = 0.6 + depth * 1.0;

        // Each ring has a subtle double-line effect: dark line + offset highlight
        return (
          <g key={i}>
            {/* Shadow side of ring groove */}
            <circle
              cx={cx}
              cy={cy}
              r={ringR}
              fill="none"
              stroke={hexToRgba(isDark ? darken(teamColor, 0.2) : darken(teamColor, 0.1), opacity)}
              strokeWidth={strokeW}
              clipPath={`url(#clip-${id})`}
            />
            {/* Light side of ring groove — offset slightly toward light */}
            <circle
              cx={cx + LX * 0.4}
              cy={cy + LY * 0.4}
              r={ringR}
              fill="none"
              stroke={hexToRgba(isDark ? lighten(teamColor, 0.2) : lighten(teamColor, 0.15), opacity * 0.4)}
              strokeWidth={strokeW * 0.5}
              clipPath={`url(#clip-${id})`}
            />
          </g>
        );
      })}

      {/* ═══ 5. CENTER PIT — the deepest point ═══ */}
      {/* Pit depression */}
      <circle
        cx={cx}
        cy={cy}
        r={Math.max(3, R * 0.14)}
        fill={`url(#pit-${id})`}
      />
      {/* Pit inner shadow ring */}
      <circle
        cx={cx}
        cy={cy}
        r={Math.max(2.5, R * 0.12)}
        fill="none"
        stroke={isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)'}
        strokeWidth={0.8}
      />
      {/* Specular highlight — tiny bright dot catching light */}
      <circle
        cx={cx + LX * R * 0.03}
        cy={cy + LY * R * 0.03}
        r={Math.max(1, R * 0.04)}
        fill="white"
        fillOpacity={isDark ? 0.2 : 0.5}
      />

      {/* ═══ 6. RIM EDGE HIGHLIGHT — bright arc on the lit side of the outer rim ═══ */}
      {/* This is the key "cinematic" touch — a bright arc on the top-left rim edge */}
      <path
        d={(() => {
          // Arc from ~280° to ~20° (the lit portion of the rim)
          const arcR = R + rimWidth * 0.25;
          const startAngle = LIGHT_ANGLE - 1.2;
          const endAngle = LIGHT_ANGLE + 1.2;
          const x1 = cx + Math.cos(startAngle) * arcR;
          const y1 = cy + Math.sin(startAngle) * arcR;
          const x2 = cx + Math.cos(endAngle) * arcR;
          const y2 = cy + Math.sin(endAngle) * arcR;
          return `M ${x1},${y1} A ${arcR},${arcR} 0 0,1 ${x2},${y2}`;
        })()}
        fill="none"
        stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.65)'}
        strokeWidth={rimWidth * 0.6}
        strokeLinecap="round"
      />

      {/* Inner rim edge shadow — dark arc on the opposite (shadow) side */}
      <path
        d={(() => {
          const arcR = R - rimWidth * 0.15;
          const startAngle = LIGHT_ANGLE + Math.PI - 1.0;
          const endAngle = LIGHT_ANGLE + Math.PI + 1.0;
          const x1 = cx + Math.cos(startAngle) * arcR;
          const y1 = cy + Math.sin(startAngle) * arcR;
          const x2 = cx + Math.cos(endAngle) * arcR;
          const y2 = cy + Math.sin(endAngle) * arcR;
          return `M ${x1},${y1} A ${arcR},${arcR} 0 0,1 ${x2},${y2}`;
        })()}
        fill="none"
        stroke={isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.06)'}
        strokeWidth={rimWidth * 0.4}
        strokeLinecap="round"
      />

      {/* ═══ 7. TEAM LABEL ═══ */}
      {/* Label shadow for readability */}
      <text
        x={cx + 0.5}
        y={cy - R - rimWidth - 4.5}
        fill={isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)'}
        fontSize={10}
        fontWeight={700}
        fontFamily="Space Grotesk"
        textAnchor="middle"
        letterSpacing="0.04em"
      >
        {teamShort}
      </text>
      <text
        x={cx}
        y={cy - R - rimWidth - 5}
        fill={labelColor}
        fontSize={10}
        fontWeight={700}
        fontFamily="Space Grotesk"
        textAnchor="middle"
        letterSpacing="0.04em"
      >
        {teamShort}
      </text>
    </g>
  );
}

export default function TravelScatterChart({ metrics }: TravelScatterChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [conference, setConference] = useState<ConferenceFilter>('ALL');

  // Filter by conference
  const filtered = useMemo(() => {
    if (conference === 'ALL') return metrics;
    const conf = conference === 'EAST' ? 'Eastern' : 'Western';
    return metrics.filter(m => m.conference === conf);
  }, [metrics, conference]);

  const headline = useMemo(() => generateScatterHeadline(filtered), [filtered]);

  // ─── Chart dimensions ───
  const width = 1100;
  const height = 680;
  const margin = { top: 45, right: 50, bottom: 65, left: 75 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  // ─── Scales ───
  const xExtent = useMemo(() => {
    if (filtered.length === 0) return { min: 15000, max: 45000 };
    const vals = filtered.map(m => m.totalAwayMiles);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.15 || 5000;
    return { min: Math.max(0, min - pad), max: max + pad };
  }, [filtered]);

  const yExtent = useMemo(() => {
    if (filtered.length === 0) return { min: -0.5, max: 1.5 };
    const vals = filtered.map(m => m.ppgGap);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.2 || 0.3;
    return { min: min - pad, max: max + pad };
  }, [filtered]);

  const depthExtent = useMemo(() => {
    if (filtered.length === 0) return { min: 0, max: 100 };
    const vals = filtered.map(m => m.squadDepthIndex);
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [filtered]);

  const xScale = (val: number) => margin.left + ((val - xExtent.min) / (xExtent.max - xExtent.min)) * plotW;
  const yScale = (val: number) => margin.top + plotH - ((val - yExtent.min) / (yExtent.max - yExtent.min)) * plotH;

  // Crater radius: 18–42px based on PPG gap magnitude
  const gapExtent = useMemo(() => {
    if (filtered.length === 0) return { min: 0, max: 1 };
    const vals = filtered.map(m => Math.abs(m.ppgGap));
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [filtered]);

  const radiusScale = (gap: number) => {
    const range = gapExtent.max - gapExtent.min || 1;
    const t = (Math.abs(gap) - gapExtent.min) / range;
    return 18 + t * 24;
  };

  // Ring count: 2–7 based on squad depth
  const ringCountScale = (depth: number) => {
    const range = depthExtent.max - depthExtent.min || 1;
    const t = (depth - depthExtent.min) / range;
    return Math.round(2 + t * 5);
  };

  // ─── Regression line ───
  const regression = useMemo(() => {
    if (filtered.length < 3) return null;
    const pts = filtered.map(m => ({ x: m.totalAwayMiles, y: m.ppgGap }));
    return linearRegression(pts);
  }, [filtered]);

  // ─── Grid ticks ───
  const xTicks = useMemo(() => {
    const step = (xExtent.max - xExtent.min) > 20000 ? 5000 : 2500;
    const ticks: number[] = [];
    let v = Math.ceil(xExtent.min / step) * step;
    while (v <= xExtent.max) { ticks.push(v); v += step; }
    return ticks;
  }, [xExtent]);

  const yTicks = useMemo(() => {
    const range = yExtent.max - yExtent.min;
    const step = range > 1.5 ? 0.5 : range > 0.8 ? 0.25 : 0.1;
    const ticks: number[] = [];
    let v = Math.ceil(yExtent.min / step) * step;
    while (v <= yExtent.max) { ticks.push(Math.round(v * 100) / 100); v += step; }
    return ticks;
  }, [yExtent]);

  // ─── Quadrant boundaries (median split) ───
  const medianX = useMemo(() => {
    if (filtered.length === 0) return (xExtent.min + xExtent.max) / 2;
    const sorted = [...filtered.map(m => m.totalAwayMiles)].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }, [filtered, xExtent]);

  const medianY = useMemo(() => {
    if (filtered.length === 0) return (yExtent.min + yExtent.max) / 2;
    const sorted = [...filtered.map(m => m.ppgGap)].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }, [filtered, yExtent]);

  // Colors
  const gridColor = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.035)';
  const axisColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const textColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
  const labelColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';
  const quadrantColor = isDark ? 'rgba(0,212,255,0.06)' : 'rgba(0,160,200,0.05)';
  const regressionColor = isDark ? 'rgba(0,212,255,0.3)' : 'rgba(0,160,200,0.25)';

  // Surface texture: subtle dot grid
  const surfaceDots = useMemo(() => {
    const dots: { x: number; y: number }[] = [];
    const spacing = 16;
    for (let x = margin.left; x < margin.left + plotW; x += spacing) {
      for (let y = margin.top; y < margin.top + plotH; y += spacing) {
        const jx = x + (Math.sin(x * 0.1 + y * 0.07) * 2.5);
        const jy = y + (Math.cos(x * 0.07 + y * 0.1) * 2.5);
        dots.push({ x: jx, y: jy });
      }
    }
    return dots;
  }, [plotW, plotH, margin]);

  // Sort craters so smaller ones render on top
  const sortedFiltered = useMemo(() =>
    [...filtered].sort((a, b) => Math.abs(b.ppgGap) - Math.abs(a.ppgGap)),
    [filtered]
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
            Travel Burden vs Away Performance Drop
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Each impression represents a team pressed into the surface. Ring depth = squad rotation depth. Crater size = PPG gap magnitude.
          </p>
        </div>
        {/* Conference filter */}
        <div className="flex items-center gap-0 relative z-10">
          {(['ALL', 'EAST', 'WEST'] as ConferenceFilter[]).map((c, i) => (
            <button
              key={c}
              onClick={(e) => { e.stopPropagation(); setConference(c); }}
              className={`text-[10px] px-3 py-1.5 font-semibold tracking-wider transition-all cursor-pointer select-none ${
                conference === c
                  ? 'neu-pressed text-cyan'
                  : 'neu-raised text-muted-foreground hover:text-foreground'
              } ${i === 0 ? 'rounded-l-lg' : i === 2 ? 'rounded-r-lg' : ''}`}
              style={{ fontFamily: 'Space Grotesk', minWidth: 40, minHeight: 28 }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Insight headline */}
      <div className="mb-3 px-3 py-2 rounded-lg text-[11px] leading-relaxed"
        style={{
          fontFamily: 'Space Grotesk',
          background: isDark ? 'rgba(0,212,255,0.04)' : 'rgba(0,160,200,0.04)',
          border: `1px solid ${isDark ? 'rgba(0,212,255,0.1)' : 'rgba(0,160,200,0.08)'}`,
          color: labelColor,
        }}
      >
        <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>
          {headline.split('—')[0]}
        </span>
        {headline.includes('—') ? `—${headline.split('—').slice(1).join('—')}` : ''}
      </div>

      {/* Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ minWidth: '700px', maxHeight: '680px' }}
        >
          {/* ═══ GLOBAL DEFS ═══ */}
          <defs>
            {/* Subtle surface noise texture */}
            <filter id="clay-surface" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" result="noise" />
              <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
              <feBlend in="SourceGraphic" in2="gray" mode={isDark ? 'soft-light' : 'multiply'} result="textured" />
              <feComponentTransfer in="textured">
                <feFuncA type="linear" slope={isDark ? 0.15 : 0.08} />
              </feComponentTransfer>
            </filter>
          </defs>

          {/* Background surface — matte clay feel */}
          <rect
            x={margin.left}
            y={margin.top}
            width={plotW}
            height={plotH}
            rx={6}
            fill={isDark ? 'rgba(18,18,28,0.35)' : 'rgba(232,230,226,0.55)'}
          />

          {/* Surface texture overlay */}
          <rect
            x={margin.left}
            y={margin.top}
            width={plotW}
            height={plotH}
            rx={6}
            fill={isDark ? 'rgba(30,30,45,0.15)' : 'rgba(215,213,210,0.2)'}
            filter="url(#clay-surface)"
          />

          {/* Subtle pin-prick dot grid */}
          {surfaceDots.map((d, i) => (
            <circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={0.5}
              fill={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}
            />
          ))}

          {/* Grid lines */}
          {xTicks.map(t => (
            <line
              key={`xg-${t}`}
              x1={xScale(t)} y1={margin.top}
              x2={xScale(t)} y2={margin.top + plotH}
              stroke={gridColor}
              strokeDasharray="2,8"
            />
          ))}
          {yTicks.map(t => (
            <line
              key={`yg-${t}`}
              x1={margin.left} y1={yScale(t)}
              x2={margin.left + plotW} y2={yScale(t)}
              stroke={gridColor}
              strokeDasharray="2,8"
            />
          ))}

          {/* Quadrant dividers */}
          <line
            x1={xScale(medianX)} y1={margin.top}
            x2={xScale(medianX)} y2={margin.top + plotH}
            stroke={quadrantColor}
            strokeDasharray="4,8"
            strokeWidth={1}
          />
          <line
            x1={margin.left} y1={yScale(medianY)}
            x2={margin.left + plotW} y2={yScale(medianY)}
            stroke={quadrantColor}
            strokeDasharray="4,8"
            strokeWidth={1}
          />

          {/* Quadrant labels */}
          <text x={margin.left + 14} y={margin.top + 18}
            fill={isDark ? 'rgba(0,212,255,0.12)' : 'rgba(0,160,200,0.1)'}
            fontSize={8.5} fontWeight={700} fontFamily="Space Grotesk" letterSpacing="0.1em"
          >LOW TRAVEL · HIGH ADVANTAGE</text>
          <text x={margin.left + plotW - 14} y={margin.top + plotH - 10}
            fill={isDark ? 'rgba(0,212,255,0.12)' : 'rgba(0,160,200,0.1)'}
            fontSize={8.5} fontWeight={700} fontFamily="Space Grotesk" letterSpacing="0.1em" textAnchor="end"
          >HIGH TRAVEL · LOW ADVANTAGE</text>
          <text x={margin.left + plotW - 14} y={margin.top + 18}
            fill={isDark ? 'rgba(255,180,80,0.1)' : 'rgba(180,120,40,0.08)'}
            fontSize={8.5} fontWeight={700} fontFamily="Space Grotesk" letterSpacing="0.1em" textAnchor="end"
          >HIGH TRAVEL · HIGH ADVANTAGE</text>
          <text x={margin.left + 14} y={margin.top + plotH - 10}
            fill={isDark ? 'rgba(255,180,80,0.1)' : 'rgba(180,120,40,0.08)'}
            fontSize={8.5} fontWeight={700} fontFamily="Space Grotesk" letterSpacing="0.1em"
          >LOW TRAVEL · LOW ADVANTAGE</text>

          {/* Regression path — dotted constellation style */}
          {regression && (() => {
            const x1 = xScale(xExtent.min);
            const y1 = yScale(regression.slope * xExtent.min + regression.intercept);
            const x2 = xScale(xExtent.max);
            const y2 = yScale(regression.slope * xExtent.max + regression.intercept);
            const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            const dotCount = Math.floor(len / 7);
            const dots = Array.from({ length: dotCount }, (_, i) => {
              const t = i / (dotCount - 1);
              return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
            });

            return (
              <g>
                {dots.map((d, i) => (
                  <circle
                    key={i}
                    cx={d.x}
                    cy={d.y}
                    r={i % 4 === 0 ? 1.8 : i % 2 === 0 ? 1.1 : 0.6}
                    fill={regressionColor}
                  />
                ))}
                <text
                  x={x2 - 8}
                  y={y2 - 14}
                  fill={regressionColor}
                  fontSize={10}
                  fontWeight={600}
                  fontFamily="Space Grotesk"
                  textAnchor="end"
                >
                  R² = {regression.r2.toFixed(2)}
                </text>
              </g>
            );
          })()}

          {/* Axis lines */}
          <line
            x1={margin.left} y1={margin.top + plotH}
            x2={margin.left + plotW} y2={margin.top + plotH}
            stroke={axisColor}
          />
          <line
            x1={margin.left} y1={margin.top}
            x2={margin.left} y2={margin.top + plotH}
            stroke={axisColor}
          />

          {/* X-axis ticks & labels */}
          {xTicks.map(t => (
            <g key={`xt-${t}`}>
              <line
                x1={xScale(t)} y1={margin.top + plotH}
                x2={xScale(t)} y2={margin.top + plotH + 5}
                stroke={axisColor}
              />
              <text
                x={xScale(t)} y={margin.top + plotH + 20}
                fill={textColor} fontSize={10} fontFamily="Space Grotesk" textAnchor="middle"
              >
                {t >= 1000 ? `${(t / 1000).toFixed(0)}k` : t}
              </text>
            </g>
          ))}

          {/* Y-axis ticks & labels */}
          {yTicks.map(t => (
            <g key={`yt-${t}`}>
              <line
                x1={margin.left - 5} y1={yScale(t)}
                x2={margin.left} y2={yScale(t)}
                stroke={axisColor}
              />
              <text
                x={margin.left - 10} y={yScale(t) + 4}
                fill={textColor} fontSize={10} fontFamily="Space Grotesk" textAnchor="end"
              >
                {t.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Axis labels */}
          <text
            x={margin.left + plotW / 2} y={height - 8}
            fill={labelColor} fontSize={12} fontWeight={600} fontFamily="Space Grotesk" textAnchor="middle"
          >
            Total Away Miles Traveled
          </text>
          <text
            x={16} y={margin.top + plotH / 2}
            fill={labelColor} fontSize={12} fontWeight={600} fontFamily="Space Grotesk" textAnchor="middle"
            transform={`rotate(-90, 16, ${margin.top + plotH / 2})`}
          >
            Home Advantage (PPG Delta)
          </text>

          {/* ═══ CRATERS — render larger first, smaller on top ═══ */}
          {sortedFiltered.map(m => {
            const cx = xScale(m.totalAwayMiles);
            const cy = yScale(m.ppgGap);
            const r = radiusScale(m.ppgGap);
            const rings = ringCountScale(m.squadDepthIndex);
            const color = mutedTeamColor(m.teamId, isDark);

            return (
              <Crater
                key={m.teamId}
                cx={cx}
                cy={cy}
                baseRadius={r}
                ringCount={rings}
                teamColor={color}
                isDark={isDark}
                teamShort={m.teamShort}
                labelColor={labelColor}
                id={m.teamId}
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-[10px] text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 22 22">
            <circle cx="11" cy="11" r="9.5" fill={isDark ? 'rgba(40,40,55,0.3)' : 'rgba(220,218,215,0.5)'} />
            <circle cx="11" cy="11" r="9.5" fill="none" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)'} strokeWidth={1} />
            <circle cx="11" cy="11" r="7" fill="none" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} strokeWidth={0.5} />
            <circle cx="11" cy="11" r="4.5" fill="none" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} strokeWidth={0.5} />
            <circle cx="11" cy="11" r="2.5" fill="none" stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'} strokeWidth={0.5} />
            <circle cx="11" cy="11" r="1.2" fill={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} />
          </svg>
          <span>More rings = deeper squad rotation</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 22 22">
            <circle cx="11" cy="11" r="10" fill="none" stroke={isDark ? 'rgba(0,212,255,0.15)' : 'rgba(0,160,200,0.12)'} strokeWidth={0.8} />
            <circle cx="11" cy="11" r="6" fill="none" stroke={isDark ? 'rgba(0,212,255,0.1)' : 'rgba(0,160,200,0.08)'} strokeWidth={0.5} strokeDasharray="2,2" />
          </svg>
          <span>Larger impression = bigger PPG gap</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="28" height="6" viewBox="0 0 28 6">
            {[0, 5, 10, 15, 20, 25].map(x => (
              <circle key={x} cx={x + 1.5} cy={3} r={x % 12 === 0 ? 1.6 : x % 6 === 0 ? 1 : 0.5} fill={regressionColor} />
            ))}
          </svg>
          <span>Dotted path = regression trend</span>
        </div>
      </div>
    </div>
  );
}
