/**
 * TravelScatterChart — Travel Burden vs Away Performance Drop
 *
 * Cinematic recessed-impression scatter plot inspired by pressed-clay impact maps.
 * v3 upgrades:
 *   - Deeper 3D lighting: stronger shadow crescents, brighter rim highlights,
 *     inner shelf shadow at rim-bowl junction, darkened bowl floor
 *   - Y-based z-ordering: craters higher on screen render first (behind),
 *     lower craters render last (in front) for natural depth stacking
 *   - Smart labels: 3-4 char city abbreviations with collision-aware placement
 *     that tests 8 positions around each crater to find the least overlap
 */

import { useState, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { mutedTeamColor, linearRegression, lighten, darken, hexToRgba } from '@/lib/chartUtils';
import type { TeamResilienceMetrics } from '@/lib/resilienceUtils';

type ConferenceFilter = 'ALL' | 'EAST' | 'WEST';

interface TravelScatterChartProps {
  metrics: TeamResilienceMetrics[];
}

// ─── Short label map ───
const ABBREV: Record<string, string> = {
  'Atlanta Utd': 'ATL',
  'Austin FC': 'AUS',
  'CF Montréal': 'MTL',
  'Charlotte FC': 'CLT',
  'Chicago Fire': 'CHI',
  'Colorado Rapids': 'COL',
  'Columbus Crew': 'CLB',
  'D.C. United': 'DC',
  'FC Cincinnati': 'CIN',
  'FC Dallas': 'DAL',
  'Houston Dynamo': 'HOU',
  'Inter Miami': 'MIA',
  'LA Galaxy': 'LAG',
  'LAFC': 'LAFC',
  'Minnesota Utd': 'MIN',
  'Nashville SC': 'NSH',
  'NE Revolution': 'NE',
  'NY Red Bulls': 'NYR',
  'NYCFC': 'NYC',
  'Orlando City': 'ORL',
  'Philadelphia Union': 'PHI',
  'Portland Timbers': 'POR',
  'Real Salt Lake': 'RSL',
  'San Diego FC': 'SD',
  'Seattle Sounders': 'SEA',
  'SJ Earthquakes': 'SJ',
  'Sporting KC': 'SKC',
  'St. Louis City': 'STL',
  'Toronto FC': 'TOR',
  "Vancouver W'caps": 'VAN',
};

function abbrev(teamShort: string): string {
  return ABBREV[teamShort] || teamShort.slice(0, 3).toUpperCase();
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

// ─── Light source constants ───
const LIGHT_ANGLE = -0.7; // radians, ~315° (10 o'clock)
const LX = Math.cos(LIGHT_ANGLE);
const LY = Math.sin(LIGHT_ANGLE);

// ─── Cinematic Crater Component (v3) ───
function Crater({
  cx,
  cy,
  baseRadius,
  ringCount,
  teamColor,
  isDark,
  label,
  labelX,
  labelY,
  labelAnchor,
  labelColor,
  id,
}: {
  cx: number;
  cy: number;
  baseRadius: number;
  ringCount: number;
  teamColor: string;
  isDark: boolean;
  label: string;
  labelX: number;
  labelY: number;
  labelAnchor: 'start' | 'middle' | 'end';
  labelColor: string;
  id: string;
}) {
  const R = baseRadius;
  const rimW = R * 0.2; // Slightly thicker rim for more pronounced bevel

  return (
    <g>
      <defs>
        {/* Cast shadow blur */}
        <filter id={`cs-${id}`} x="-60%" y="-40%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={R * 0.14} />
        </filter>

        {/* Inner bowl blur */}
        <filter id={`ib-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={R * 0.1} />
        </filter>

        {/* Shelf shadow blur (rim-to-bowl junction) */}
        <filter id={`sh-${id}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={R * 0.06} />
        </filter>

        {/* Rim bevel gradient */}
        <radialGradient id={`rim-${id}`} cx="35%" cy="28%" r="65%">
          <stop offset="0%" stopColor={isDark ? 'rgba(80,80,100,0.55)' : 'rgba(255,255,255,0.9)'} />
          <stop offset="45%" stopColor={isDark ? 'rgba(50,50,65,0.35)' : 'rgba(245,243,240,0.7)'} />
          <stop offset="100%" stopColor={isDark ? 'rgba(18,18,28,0.55)' : 'rgba(180,178,175,0.55)'} />
        </radialGradient>

        {/* Inner bowl gradient — darker floor */}
        <radialGradient id={`bowl-${id}`} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor={isDark ? 'rgba(50,50,65,0.3)' : 'rgba(218,216,212,0.55)'} />
          <stop offset="25%" stopColor={hexToRgba(teamColor, isDark ? 0.18 : 0.12)} />
          <stop offset="60%" stopColor={isDark ? 'rgba(20,20,32,0.55)' : 'rgba(188,186,182,0.5)'} />
          <stop offset="100%" stopColor={isDark ? 'rgba(8,8,15,0.7)' : 'rgba(165,163,160,0.45)'} />
        </radialGradient>

        {/* Center pit gradient */}
        <radialGradient id={`pit-${id}`} cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor={hexToRgba(teamColor, isDark ? 0.35 : 0.25)} />
          <stop offset="50%" stopColor={isDark ? darken(teamColor, 0.5) : darken(teamColor, 0.3)} />
          <stop offset="100%" stopColor={isDark ? 'rgba(3,3,8,0.95)' : 'rgba(100,98,95,0.6)'} />
        </radialGradient>

        {/* Clips */}
        <clipPath id={`clip-${id}`}>
          <circle cx={cx} cy={cy} r={R - rimW * 0.4} />
        </clipPath>
        <clipPath id={`rimclip-${id}`}>
          <circle cx={cx} cy={cy} r={R + rimW * 0.4} />
        </clipPath>
      </defs>

      {/* ═══ 1. CAST SHADOW ═══ */}
      <ellipse
        cx={cx + R * 0.1}
        cy={cy + R * 0.15}
        rx={R + rimW + 5}
        ry={R * 0.55 + rimW + 3}
        fill={isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.07)'}
        filter={`url(#cs-${id})`}
      />

      {/* ═══ 2. OUTER RIM — thick beveled ring ═══ */}
      <circle cx={cx} cy={cy} r={R + rimW * 0.35} fill={`url(#rim-${id})`} />

      {/* Rim highlight crescent — top-left, brighter */}
      <ellipse
        cx={cx + LX * R * 0.15}
        cy={cy + LY * R * 0.15}
        rx={R * 0.88}
        ry={R * 0.72}
        fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.65)'}
        clipPath={`url(#rimclip-${id})`}
      />

      {/* Rim shadow crescent — bottom-right, darker */}
      <ellipse
        cx={cx - LX * R * 0.22}
        cy={cy - LY * R * 0.22}
        rx={R * 0.92}
        ry={R * 0.78}
        fill={isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.06)'}
        clipPath={`url(#rimclip-${id})`}
      />

      {/* Rim outer edge — bright line */}
      <circle
        cx={cx} cy={cy} r={R + rimW * 0.35}
        fill="none"
        stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)'}
        strokeWidth={1.4}
      />

      {/* ═══ 3. RIM EDGE HIGHLIGHT ARC — cinematic bright arc on lit side ═══ */}
      <path
        d={(() => {
          const arcR = R + rimW * 0.3;
          const sa = LIGHT_ANGLE - 1.3;
          const ea = LIGHT_ANGLE + 1.3;
          const x1 = cx + Math.cos(sa) * arcR;
          const y1 = cy + Math.sin(sa) * arcR;
          const x2 = cx + Math.cos(ea) * arcR;
          const y2 = cy + Math.sin(ea) * arcR;
          return `M ${x1},${y1} A ${arcR},${arcR} 0 0,1 ${x2},${y2}`;
        })()}
        fill="none"
        stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.75)'}
        strokeWidth={rimW * 0.7}
        strokeLinecap="round"
      />

      {/* Inner rim edge shadow arc — dark arc on shadow side */}
      <path
        d={(() => {
          const arcR = R - rimW * 0.1;
          const sa = LIGHT_ANGLE + Math.PI - 1.1;
          const ea = LIGHT_ANGLE + Math.PI + 1.1;
          const x1 = cx + Math.cos(sa) * arcR;
          const y1 = cy + Math.sin(sa) * arcR;
          const x2 = cx + Math.cos(ea) * arcR;
          const y2 = cy + Math.sin(ea) * arcR;
          return `M ${x1},${y1} A ${arcR},${arcR} 0 0,1 ${x2},${y2}`;
        })()}
        fill="none"
        stroke={isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.08)'}
        strokeWidth={rimW * 0.5}
        strokeLinecap="round"
      />

      {/* ═══ 4. INNER BOWL ═══ */}
      <circle cx={cx} cy={cy} r={R - rimW * 0.35} fill={`url(#bowl-${id})`} />

      {/* Shelf shadow — dark ring at the rim-to-bowl junction */}
      <circle
        cx={cx} cy={cy} r={R - rimW * 0.35}
        fill="none"
        stroke={isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'}
        strokeWidth={rimW * 0.5}
        filter={`url(#sh-${id})`}
        clipPath={`url(#clip-${id})`}
      />

      {/* Bowl shadow crescent — deep shadow on bottom-right interior */}
      <ellipse
        cx={cx - LX * R * 0.35}
        cy={cy - LY * R * 0.35}
        rx={R * 0.88}
        ry={R * 0.68}
        fill={isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.1)'}
        clipPath={`url(#clip-${id})`}
        filter={`url(#ib-${id})`}
      />

      {/* Second shadow layer — deeper, tighter crescent for more depth */}
      <ellipse
        cx={cx - LX * R * 0.45}
        cy={cy - LY * R * 0.45}
        rx={R * 0.6}
        ry={R * 0.45}
        fill={isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)'}
        clipPath={`url(#clip-${id})`}
        filter={`url(#ib-${id})`}
      />

      {/* Bowl highlight crescent — light hitting upper-left inner wall */}
      <ellipse
        cx={cx + LX * R * 0.28}
        cy={cy + LY * R * 0.28}
        rx={R * 0.5}
        ry={R * 0.38}
        fill={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.35)'}
        clipPath={`url(#clip-${id})`}
      />

      {/* ═══ 5. CONCENTRIC RINGS — variable spacing ═══ */}
      {Array.from({ length: ringCount }, (_, i) => {
        const t = (i + 1) / (ringCount + 1);
        const ringR = (R - rimW) * (1 - Math.pow(1 - t, 1.7));
        const depth = i / Math.max(1, ringCount - 1);
        const opacity = isDark ? 0.12 + depth * 0.4 : 0.1 + depth * 0.3;
        const strokeW = 0.5 + depth * 1.2;

        return (
          <g key={i}>
            {/* Shadow side of ring groove */}
            <circle
              cx={cx} cy={cy} r={ringR} fill="none"
              stroke={hexToRgba(isDark ? darken(teamColor, 0.25) : darken(teamColor, 0.15), opacity)}
              strokeWidth={strokeW}
              clipPath={`url(#clip-${id})`}
            />
            {/* Light side of ring groove */}
            <circle
              cx={cx + LX * 0.5} cy={cy + LY * 0.5} r={ringR} fill="none"
              stroke={hexToRgba(isDark ? lighten(teamColor, 0.25) : lighten(teamColor, 0.2), opacity * 0.45)}
              strokeWidth={strokeW * 0.5}
              clipPath={`url(#clip-${id})`}
            />
          </g>
        );
      })}

      {/* ═══ 6. CENTER PIT ═══ */}
      <circle cx={cx} cy={cy} r={Math.max(3.5, R * 0.15)} fill={`url(#pit-${id})`} />
      {/* Pit inner shadow ring */}
      <circle
        cx={cx} cy={cy} r={Math.max(3, R * 0.13)}
        fill="none"
        stroke={isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.12)'}
        strokeWidth={1}
      />
      {/* Specular highlight */}
      <circle
        cx={cx + LX * R * 0.04}
        cy={cy + LY * R * 0.04}
        r={Math.max(1.2, R * 0.045)}
        fill="white"
        fillOpacity={isDark ? 0.25 : 0.6}
      />

      {/* ═══ 7. LABEL — positioned by collision-aware placement ═══ */}
      <text
        x={labelX + 0.5}
        y={labelY + 0.5}
        fill={isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)'}
        fontSize={9}
        fontWeight={800}
        fontFamily="Space Grotesk"
        textAnchor={labelAnchor as 'start' | 'middle' | 'end'}
        letterSpacing="0.06em"
      >
        {label}
      </text>
      <text
        x={labelX}
        y={labelY}
        fill={labelColor}
        fontSize={9}
        fontWeight={800}
        fontFamily="Space Grotesk"
        textAnchor={labelAnchor as 'start' | 'middle' | 'end'}
        letterSpacing="0.06em"
      >
        {label}
      </text>
    </g>
  );
}

// ─── Label placement engine ───
// Tests 8 candidate positions around each crater and picks the one with least overlap
interface LabelPlacement {
  x: number;
  y: number;
  anchor: string;
  w: number;
  h: number;
}

function computeLabelPlacements(
  items: { cx: number; cy: number; r: number; label: string }[],
  plotBounds: { left: number; top: number; right: number; bottom: number },
): LabelPlacement[] {
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const results: LabelPlacement[] = [];
  const FONT_W = 6.5; // approx width per char at 9px
  const FONT_H = 11;

  for (const item of items) {
    const labelW = item.label.length * FONT_W;
    const gap = 5;

    // 8 candidate positions: top, bottom, left, right, and 4 diagonals
    const candidates: { x: number; y: number; anchor: string }[] = [
      { x: item.cx, y: item.cy - item.r - gap - 2, anchor: 'middle' },           // top
      { x: item.cx, y: item.cy + item.r + gap + FONT_H, anchor: 'middle' },      // bottom
      { x: item.cx + item.r + gap, y: item.cy + 3, anchor: 'start' },            // right
      { x: item.cx - item.r - gap, y: item.cy + 3, anchor: 'end' },              // left
      { x: item.cx + item.r * 0.7 + gap, y: item.cy - item.r * 0.5 - 2, anchor: 'start' },  // top-right
      { x: item.cx - item.r * 0.7 - gap, y: item.cy - item.r * 0.5 - 2, anchor: 'end' },    // top-left
      { x: item.cx + item.r * 0.7 + gap, y: item.cy + item.r * 0.5 + FONT_H, anchor: 'start' }, // bottom-right
      { x: item.cx - item.r * 0.7 - gap, y: item.cy + item.r * 0.5 + FONT_H, anchor: 'end' },   // bottom-left
    ];

    let bestScore = Infinity;
    let bestCandidate = candidates[0];

    for (const cand of candidates) {
      // Compute bounding box of this label
      let lx = cand.x;
      if (cand.anchor === 'middle') lx -= labelW / 2;
      else if (cand.anchor === 'end') lx -= labelW;
      const ly = cand.y - FONT_H;
      const lw = labelW;
      const lh = FONT_H + 2;

      // Penalty: out of bounds
      let score = 0;
      if (lx < plotBounds.left) score += 50;
      if (lx + lw > plotBounds.right) score += 50;
      if (ly < plotBounds.top) score += 50;
      if (ly + lh > plotBounds.bottom) score += 50;

      // Penalty: overlap with other craters
      for (const other of items) {
        if (other === item) continue;
        const dx = (lx + lw / 2) - other.cx;
        const dy = (ly + lh / 2) - other.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < other.r + 8) score += 30;
      }

      // Penalty: overlap with already-placed labels
      for (const p of placed) {
        const overlapX = Math.max(0, Math.min(lx + lw, p.x + p.w) - Math.max(lx, p.x));
        const overlapY = Math.max(0, Math.min(ly + lh, p.y + p.h) - Math.max(ly, p.y));
        if (overlapX > 0 && overlapY > 0) score += 40;
      }

      if (score < bestScore) {
        bestScore = score;
        bestCandidate = cand;
      }
    }

    // Compute final bbox for placed list
    let lx = bestCandidate.x;
    if (bestCandidate.anchor === 'middle') lx -= labelW / 2;
    else if (bestCandidate.anchor === 'end') lx -= labelW;
    const ly = bestCandidate.y - FONT_H;

    placed.push({ x: lx, y: ly, w: labelW, h: FONT_H + 2 });
    results.push({ x: bestCandidate.x, y: bestCandidate.y, anchor: bestCandidate.anchor, w: labelW, h: FONT_H + 2 });
  }

  return results;
}

export default function TravelScatterChart({ metrics }: TravelScatterChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [conference, setConference] = useState<ConferenceFilter>('ALL');

  const filtered = useMemo(() => {
    if (conference === 'ALL') return metrics;
    const conf = conference === 'EAST' ? 'Eastern' : 'Western';
    return metrics.filter(m => m.conference === conf);
  }, [metrics, conference]);

  const headline = useMemo(() => generateScatterHeadline(filtered), [filtered]);

  // ─── Chart dimensions ───
  const width = 1100;
  const height = 700;
  const margin = { top: 45, right: 55, bottom: 65, left: 75 };
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

  const ringCountScale = (depth: number) => {
    const range = depthExtent.max - depthExtent.min || 1;
    const t = (depth - depthExtent.min) / range;
    return Math.round(2 + t * 5);
  };

  const regression = useMemo(() => {
    if (filtered.length < 3) return null;
    const pts = filtered.map(m => ({ x: m.totalAwayMiles, y: m.ppgGap }));
    return linearRegression(pts);
  }, [filtered]);

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
  const labelColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)';
  const quadrantColor = isDark ? 'rgba(0,212,255,0.06)' : 'rgba(0,160,200,0.05)';
  const regressionColor = isDark ? 'rgba(0,212,255,0.3)' : 'rgba(0,160,200,0.25)';

  // Surface dots
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

  // ─── Z-ordering: sort by Y position (top of screen = behind, bottom = in front) ───
  const zSorted = useMemo(() =>
    [...filtered].sort((a, b) => {
      const ya = yScale(a.ppgGap);
      const yb = yScale(b.ppgGap);
      return ya - yb; // smaller Y (higher on screen) renders first (behind)
    }),
    [filtered, yExtent]
  );

  // ─── Compute label placements ───
  const labelPlacements = useMemo(() => {
    const items = zSorted.map(m => ({
      cx: xScale(m.totalAwayMiles),
      cy: yScale(m.ppgGap),
      r: radiusScale(m.ppgGap) + radiusScale(m.ppgGap) * 0.2, // include rim
      label: abbrev(m.teamShort),
    }));
    return computeLabelPlacements(items, {
      left: margin.left + 5,
      top: margin.top + 5,
      right: margin.left + plotW - 5,
      bottom: margin.top + plotH - 5,
    });
  }, [zSorted, xExtent, yExtent, gapExtent]);

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
          style={{ minWidth: '700px', maxHeight: '700px' }}
        >
          <defs>
            <filter id="clay-surface" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" result="noise" />
              <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
              <feBlend in="SourceGraphic" in2="gray" mode={isDark ? 'soft-light' : 'multiply'} result="textured" />
              <feComponentTransfer in="textured">
                <feFuncA type="linear" slope={isDark ? 0.15 : 0.08} />
              </feComponentTransfer>
            </filter>
          </defs>

          {/* Background surface */}
          <rect x={margin.left} y={margin.top} width={plotW} height={plotH} rx={6}
            fill={isDark ? 'rgba(18,18,28,0.35)' : 'rgba(232,230,226,0.55)'} />
          <rect x={margin.left} y={margin.top} width={plotW} height={plotH} rx={6}
            fill={isDark ? 'rgba(30,30,45,0.15)' : 'rgba(215,213,210,0.2)'}
            filter="url(#clay-surface)" />

          {/* Dot grid */}
          {surfaceDots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={0.5}
              fill={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'} />
          ))}

          {/* Grid lines */}
          {xTicks.map(t => (
            <line key={`xg-${t}`} x1={xScale(t)} y1={margin.top} x2={xScale(t)} y2={margin.top + plotH}
              stroke={gridColor} strokeDasharray="2,8" />
          ))}
          {yTicks.map(t => (
            <line key={`yg-${t}`} x1={margin.left} y1={yScale(t)} x2={margin.left + plotW} y2={yScale(t)}
              stroke={gridColor} strokeDasharray="2,8" />
          ))}

          {/* Quadrant dividers */}
          <line x1={xScale(medianX)} y1={margin.top} x2={xScale(medianX)} y2={margin.top + plotH}
            stroke={quadrantColor} strokeDasharray="4,8" strokeWidth={1} />
          <line x1={margin.left} y1={yScale(medianY)} x2={margin.left + plotW} y2={yScale(medianY)}
            stroke={quadrantColor} strokeDasharray="4,8" strokeWidth={1} />

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

          {/* Regression path */}
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
                  <circle key={i} cx={d.x} cy={d.y}
                    r={i % 4 === 0 ? 1.8 : i % 2 === 0 ? 1.1 : 0.6}
                    fill={regressionColor} />
                ))}
                <text x={x2 - 8} y={y2 - 14} fill={regressionColor}
                  fontSize={10} fontWeight={600} fontFamily="Space Grotesk" textAnchor="end">
                  R² = {regression.r2.toFixed(2)}
                </text>
              </g>
            );
          })()}

          {/* Axes */}
          <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke={axisColor} />
          <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke={axisColor} />

          {xTicks.map(t => (
            <g key={`xt-${t}`}>
              <line x1={xScale(t)} y1={margin.top + plotH} x2={xScale(t)} y2={margin.top + plotH + 5} stroke={axisColor} />
              <text x={xScale(t)} y={margin.top + plotH + 20} fill={textColor} fontSize={10} fontFamily="Space Grotesk" textAnchor="middle">
                {t >= 1000 ? `${(t / 1000).toFixed(0)}k` : t}
              </text>
            </g>
          ))}
          {yTicks.map(t => (
            <g key={`yt-${t}`}>
              <line x1={margin.left - 5} y1={yScale(t)} x2={margin.left} y2={yScale(t)} stroke={axisColor} />
              <text x={margin.left - 10} y={yScale(t) + 4} fill={textColor} fontSize={10} fontFamily="Space Grotesk" textAnchor="end">
                {t.toFixed(2)}
              </text>
            </g>
          ))}

          <text x={margin.left + plotW / 2} y={height - 8} fill={labelColor} fontSize={12} fontWeight={600} fontFamily="Space Grotesk" textAnchor="middle">
            Total Away Miles Traveled
          </text>
          <text x={16} y={margin.top + plotH / 2} fill={labelColor} fontSize={12} fontWeight={600} fontFamily="Space Grotesk" textAnchor="middle"
            transform={`rotate(-90, 16, ${margin.top + plotH / 2})`}>
            Home Advantage (PPG Delta)
          </text>

          {/* ═══ CRATERS — z-sorted by Y position ═══ */}
          {zSorted.map((m, idx) => {
            const cx = xScale(m.totalAwayMiles);
            const cy = yScale(m.ppgGap);
            const r = radiusScale(m.ppgGap);
            const rings = ringCountScale(m.squadDepthIndex);
            const color = mutedTeamColor(m.teamId, isDark);
            const lp = labelPlacements[idx];

            return (
              <Crater
                key={m.teamId}
                cx={cx}
                cy={cy}
                baseRadius={r}
                ringCount={rings}
                teamColor={color}
                isDark={isDark}
                label={abbrev(m.teamShort)}
                labelX={lp?.x ?? cx}
                labelY={lp?.y ?? (cy - r - 8)}
                labelAnchor={lp?.anchor ?? 'middle'}
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
