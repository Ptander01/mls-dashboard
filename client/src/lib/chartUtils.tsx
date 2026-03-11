/**
 * chartUtils.tsx — Shared chart utilities for muted earthy colors and 3D extruded shapes
 * 
 * Design Philosophy: "Velvet Data"
 * - Team colors are desaturated and darkened to earthy/jewel tones
 * - Bars have gradient fills with a highlight edge on top and shadow on bottom
 * - Dots/scatter points have radial gradients for a spherical 3D look
 * - Lines have subtle glow underneath for depth
 * - All effects adapt to light/dark theme
 */

import React from 'react';

// ─── MUTED EARTHY TEAM COLOR PALETTE ───
// Each team's original hue is preserved but shifted to a darker, desaturated velvet tone.
// Dark mode: deep jewel tones. Light mode: slightly lifted but still muted.
const MUTED_DARK: Record<string, string> = {
  ATL:  '#8B6914',  // gold → warm umber
  ATX:  '#1B5E20',  // green → deep forest
  MTL:  '#2C3E6B',  // blue → navy slate
  CLT:  '#1A6B7A',  // teal → deep teal
  CHI:  '#7A2020',  // red → crimson velvet
  COL:  '#5C2233',  // burgundy → wine
  CLB:  '#8B7B2A',  // gold/black → dark gold
  DC:   '#6B2030',  // red/black → oxblood
  CIN:  '#9B4A1A',  // orange → burnt sienna
  DAL:  '#8B2030',  // red → garnet
  HOU:  '#9B5A1A',  // orange → copper
  MIA:  '#8B5A6B',  // pink → dusty rose
  LAG:  '#1A3050',  // navy → deep navy
  LAFC: '#7A6A3A',  // gold → antique bronze
  MIN:  '#3A6A7A',  // sky blue → steel blue
  NSH:  '#8B8A2A',  // yellow → olive gold
  NE:   '#1A2A4A',  // navy → midnight
  NYRB: '#8B2A2A',  // red → brick red
  NYC:  '#3A5A7A',  // sky blue → slate blue
  ORL:  '#4A2A5A',  // purple → deep plum
  PHI:  '#1A2A3A',  // navy → charcoal navy
  POR:  '#1A3A1A',  // green → dark forest
  RSL:  '#7A1A2A',  // red → crimson
  SD:   '#4A2A5A',  // purple → amethyst dark
  SEA:  '#2A5A2A',  // green → hunter green
  SJ:   '#1A4A6A',  // blue → ocean deep
  SKC:  '#4A5A7A',  // light blue → pewter blue
  STL:  '#7A2020',  // red → ruby dark
  TOR:  '#7A1A2A',  // red → dark cherry
  VAN:  '#1A2A4A',  // navy → ink blue
};

const MUTED_LIGHT: Record<string, string> = {
  ATL:  '#A07828',  // warmer, slightly lifted
  ATX:  '#2D6B35',
  MTL:  '#3A4F7A',
  CLT:  '#2A7A8A',
  CHI:  '#8A3030',
  COL:  '#6A3040',
  CLB:  '#9A8A3A',
  DC:   '#7A3040',
  CIN:  '#A85A2A',
  DAL:  '#9A3040',
  HOU:  '#A86A2A',
  MIA:  '#9A6A7A',
  LAG:  '#2A4060',
  LAFC: '#8A7A4A',
  MIN:  '#4A7A8A',
  NSH:  '#9A9A3A',
  NE:   '#2A3A5A',
  NYRB: '#9A3A3A',
  NYC:  '#4A6A8A',
  ORL:  '#5A3A6A',
  PHI:  '#2A3A4A',
  POR:  '#2A4A2A',
  RSL:  '#8A2A3A',
  SD:   '#5A3A6A',
  SEA:  '#3A6A3A',
  SJ:   '#2A5A7A',
  SKC:  '#5A6A8A',
  STL:  '#8A3030',
  TOR:  '#8A2A3A',
  VAN:  '#2A3A5A',
};

/**
 * Get the muted earthy color for a team
 */
export function mutedTeamColor(teamId: string, isDark: boolean): string {
  return isDark ? (MUTED_DARK[teamId] || '#4A4A5A') : (MUTED_LIGHT[teamId] || '#6A6A7A');
}

/**
 * Lighten a hex color by a percentage (0-1)
 */
function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.round(r + (255 - r) * amount));
  const ng = Math.min(255, Math.round(g + (255 - g) * amount));
  const nb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

/**
 * Darken a hex color by a percentage (0-1)
 */
function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.max(0, Math.round(r * (1 - amount)));
  const ng = Math.max(0, Math.round(g * (1 - amount)));
  const nb = Math.max(0, Math.round(b * (1 - amount)));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

// Counter for unique gradient IDs
let gradientCounter = 0;

/**
 * 3D Extruded Bar Shape — Custom Recharts bar with gradient fill, highlight edge, and shadow
 * Creates the illusion of a physical bar with lighting from above-left
 */
export function Extruded3DBar(props: any) {
  const { x, y, width, height: h, fill, fillOpacity, stroke, strokeWidth, payload, dataKey } = props;
  if (!h || h <= 0 || !width || width <= 0) return null;

  const baseColor = fill || '#4A4A5A';
  const id = `bar3d_${gradientCounter++}`;
  const highlightColor = lighten(baseColor, 0.35);
  const shadowColor = darken(baseColor, 0.4);
  const midColor = baseColor;

  // Determine if this is a horizontal bar (layout="vertical")
  const isHorizontal = payload && dataKey && (props.layout === 'vertical' || (typeof props.background !== 'undefined'));

  return (
    <g>
      {/* SVG gradient definition */}
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={highlightColor} stopOpacity={0.95} />
          <stop offset="15%" stopColor={midColor} stopOpacity={0.9} />
          <stop offset="85%" stopColor={midColor} stopOpacity={0.85} />
          <stop offset="100%" stopColor={shadowColor} stopOpacity={0.9} />
        </linearGradient>
      </defs>
      {/* Shadow underneath */}
      <rect
        x={x + 1}
        y={y + 2}
        width={width}
        height={h}
        rx={3}
        ry={3}
        fill="rgba(0,0,0,0.25)"
        style={{ filter: 'blur(2px)' }}
      />
      {/* Main bar body with gradient */}
      <rect
        x={x}
        y={y}
        width={width}
        height={h}
        rx={3}
        ry={3}
        fill={`url(#${id})`}
        stroke={stroke || 'none'}
        strokeWidth={strokeWidth || 0}
      />
      {/* Top highlight edge — thin bright line */}
      <rect
        x={x + 1}
        y={y}
        width={width - 2}
        height={Math.min(2, h * 0.08)}
        rx={1.5}
        fill={highlightColor}
        fillOpacity={0.6}
      />
      {/* Left highlight edge — subtle side light */}
      <rect
        x={x}
        y={y + 2}
        width={Math.min(2, width * 0.1)}
        height={h - 4}
        rx={1}
        fill={highlightColor}
        fillOpacity={0.25}
      />
    </g>
  );
}

/**
 * 3D Extruded Horizontal Bar Shape — For layout="vertical" charts
 * Gradient goes left-to-right with highlight on the leading edge
 */
export function Extruded3DHorizontalBar(props: any) {
  const { x, y, width, height: h, fill, stroke, strokeWidth } = props;
  if (!h || h <= 0 || !width) return null;

  const barWidth = Math.abs(width);
  const barX = width >= 0 ? x : x + width;
  const baseColor = fill || '#4A4A5A';
  const id = `hbar3d_${gradientCounter++}`;
  const highlightColor = lighten(baseColor, 0.35);
  const shadowColor = darken(baseColor, 0.4);

  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={highlightColor} stopOpacity={0.9} />
          <stop offset="20%" stopColor={baseColor} stopOpacity={0.85} />
          <stop offset="80%" stopColor={baseColor} stopOpacity={0.85} />
          <stop offset="100%" stopColor={shadowColor} stopOpacity={0.9} />
        </linearGradient>
      </defs>
      {/* Shadow */}
      <rect
        x={barX + 1}
        y={y + 1.5}
        width={barWidth}
        height={h}
        rx={3}
        ry={3}
        fill="rgba(0,0,0,0.2)"
        style={{ filter: 'blur(1.5px)' }}
      />
      {/* Main body */}
      <rect
        x={barX}
        y={y}
        width={barWidth}
        height={h}
        rx={3}
        ry={3}
        fill={`url(#${id})`}
        stroke={stroke || 'none'}
        strokeWidth={strokeWidth || 0}
      />
      {/* Top highlight */}
      <rect
        x={barX + 1}
        y={y}
        width={barWidth - 2}
        height={Math.min(1.5, h * 0.08)}
        rx={1}
        fill={highlightColor}
        fillOpacity={0.5}
      />
      {/* Leading edge highlight (right for positive, left for negative) */}
      {width >= 0 ? (
        <rect
          x={barX + barWidth - 2}
          y={y + 1}
          width={Math.min(2, barWidth * 0.05)}
          height={h - 2}
          rx={1}
          fill={highlightColor}
          fillOpacity={0.3}
        />
      ) : (
        <rect
          x={barX}
          y={y + 1}
          width={Math.min(2, barWidth * 0.05)}
          height={h - 2}
          rx={1}
          fill={highlightColor}
          fillOpacity={0.3}
        />
      )}
    </g>
  );
}

/**
 * 3D Scatter Dot — Radial gradient for a spherical look
 */
export function Extruded3DDot(props: any) {
  const { cx, cy, r = 4, fill } = props;
  if (cx == null || cy == null) return null;
  
  const baseColor = fill || 'var(--cyan)';
  const id = `dot3d_${gradientCounter++}`;
  const highlightColor = lighten(baseColor.startsWith('#') ? baseColor : '#00d4ff', 0.5);
  const shadowColor = darken(baseColor.startsWith('#') ? baseColor : '#00d4ff', 0.5);

  return (
    <g>
      <defs>
        <radialGradient id={id} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor={highlightColor} stopOpacity={0.9} />
          <stop offset="50%" stopColor={baseColor} stopOpacity={0.8} />
          <stop offset="100%" stopColor={shadowColor} stopOpacity={0.7} />
        </radialGradient>
      </defs>
      {/* Shadow */}
      <circle cx={cx + 1} cy={cy + 1} r={r} fill="rgba(0,0,0,0.3)" style={{ filter: 'blur(1px)' }} />
      {/* Main sphere */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
      {/* Specular highlight */}
      <circle cx={cx - r * 0.25} cy={cy - r * 0.25} r={r * 0.3} fill="white" fillOpacity={0.25} />
    </g>
  );
}

/**
 * Generate SVG defs for 3D area gradient (used in AreaChart)
 * Returns a gradient ID and the JSX for the defs
 */
export function create3DAreaGradient(baseColor: string, isDark: boolean): { id: string; defs: React.ReactNode } {
  const id = `area3d_${gradientCounter++}`;
  const topColor = lighten(baseColor.startsWith('#') ? baseColor : '#00d4ff', isDark ? 0.15 : 0.1);
  const bottomColor = darken(baseColor.startsWith('#') ? baseColor : '#00d4ff', isDark ? 0.3 : 0.15);

  const defs = (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={topColor} stopOpacity={isDark ? 0.4 : 0.35} />
      <stop offset="50%" stopColor={baseColor} stopOpacity={isDark ? 0.2 : 0.15} />
      <stop offset="100%" stopColor={bottomColor} stopOpacity={0.02} />
    </linearGradient>
  );

  return { id, defs };
}

/**
 * 3D Line stroke style — returns a filter string for extruded line effect
 */
export const LINE_3D_STYLE = {
  filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))',
  strokeLinecap: 'round' as const,
};

/**
 * Extruded bar with capacity ceiling marker (for Attendance home chart)
 */
export function Extruded3DBarWithCeiling(props: any) {
  const { x, y, width, height: h, fill, stroke, strokeWidth, payload } = props;
  if (!h || h <= 0 || !width || width <= 0) return null;

  const baseColor = fill || '#4A4A5A';
  const id = `barceil3d_${gradientCounter++}`;
  const highlightColor = lighten(baseColor, 0.35);
  const shadowColor = darken(baseColor, 0.4);

  const cap = payload?.capacity || 0;
  const avg = payload?.avg || 0;
  const yAxis = y + h;
  const barScale = avg > 0 ? h / avg : 0;
  const capY = cap > 0 ? yAxis - (cap * barScale) : 0;

  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={highlightColor} stopOpacity={0.95} />
          <stop offset="15%" stopColor={baseColor} stopOpacity={0.9} />
          <stop offset="85%" stopColor={baseColor} stopOpacity={0.85} />
          <stop offset="100%" stopColor={shadowColor} stopOpacity={0.9} />
        </linearGradient>
      </defs>
      {/* Shadow */}
      <rect x={x + 1} y={y + 2} width={width} height={h} rx={3} ry={3}
        fill="rgba(0,0,0,0.25)" style={{ filter: 'blur(2px)' }} />
      {/* Main bar */}
      <rect x={x} y={y} width={width} height={h} rx={3} ry={3}
        fill={`url(#${id})`} stroke={stroke || 'none'} strokeWidth={strokeWidth || 0} />
      {/* Top highlight */}
      <rect x={x + 1} y={y} width={width - 2} height={Math.min(2, h * 0.08)} rx={1.5}
        fill={highlightColor} fillOpacity={0.6} />
      {/* Left highlight */}
      <rect x={x} y={y + 2} width={Math.min(2, width * 0.1)} height={h - 4} rx={1}
        fill={highlightColor} fillOpacity={0.25} />
      {/* Capacity ceiling marker */}
      {cap > 0 && (
        <>
          <line x1={x - 2} y1={capY} x2={x + width + 2} y2={capY}
            stroke="#ff6b9d" strokeWidth={1.5} strokeDasharray="3 2" strokeOpacity={0.7} />
          <circle cx={x + width / 2} cy={capY} r={2} fill="#ff6b9d" fillOpacity={0.8} />
        </>
      )}
    </g>
  );
}
