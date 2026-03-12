/**
 * chartUtils.tsx — Shared chart utilities for muted earthy colors and 3D extruded shapes
 * 
 * Design Philosophy: "Sculptural Data"
 * - Data elements appear physically extruded from the chart surface
 * - Each element casts a directional shadow onto the chart background
 * - Light source is positioned at upper-left, creating shadows that fall down-right
 * - Bars have front-face highlights, side-face shading, and ground-contact shadows
 * - Dots sit on the surface with elliptical contact shadows
 * - Lines have thick shadow underneath simulating a raised ridge
 * - All effects adapt to light/dark theme
 */

import React from 'react';

// ─── MUTED EARTHY TEAM COLOR PALETTE ───
const MUTED_DARK: Record<string, string> = {
  ATL:  '#8B6914',
  ATX:  '#1B5E20',
  MTL:  '#2C3E6B',
  CLT:  '#1A6B7A',
  CHI:  '#7A2020',
  COL:  '#5C2233',
  CLB:  '#8B7B2A',
  DC:   '#6B2030',
  CIN:  '#9B4A1A',
  DAL:  '#8B2030',
  HOU:  '#9B5A1A',
  MIA:  '#8B5A6B',
  LAG:  '#1A3050',
  LAFC: '#7A6A3A',
  MIN:  '#3A6A7A',
  NSH:  '#8B8A2A',
  NE:   '#1A2A4A',
  NYRB: '#8B2A2A',
  NYC:  '#3A5A7A',
  ORL:  '#4A2A5A',
  PHI:  '#1A2A3A',
  POR:  '#1A3A1A',
  RSL:  '#7A1A2A',
  SD:   '#4A2A5A',
  SEA:  '#2A5A2A',
  SJ:   '#1A4A6A',
  SKC:  '#4A5A7A',
  STL:  '#7A2020',
  TOR:  '#7A1A2A',
  VAN:  '#1A2A4A',
};

const MUTED_LIGHT: Record<string, string> = {
  ATL:  '#A07828',
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

export function mutedTeamColor(teamId: string, isDark: boolean): string {
  return isDark ? (MUTED_DARK[teamId] || '#4A4A5A') : (MUTED_LIGHT[teamId] || '#6A6A7A');
}

// Position color palette — muted earthy tones for each position
const POSITION_COLORS_DARK: Record<string, string> = {
  FW: '#9A3A3A',
  MF: '#3A5A8A',
  DF: '#3A6A4A',
  GK: '#8A7A3A',
};

const POSITION_COLORS_LIGHT: Record<string, string> = {
  FW: '#B04040',
  MF: '#4A6A9A',
  DF: '#4A7A5A',
  GK: '#9A8A4A',
};

export function positionColor(position: string, isDark: boolean): string {
  return isDark
    ? (POSITION_COLORS_DARK[position] || '#4A4A5A')
    : (POSITION_COLORS_LIGHT[position] || '#6A6A7A');
}

// Linear regression calculation
export function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const d of data) {
    sumX += d.x;
    sumY += d.y;
    sumXY += d.x * d.y;
    sumX2 += d.x * d.x;
    sumY2 += d.y * d.y;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (const d of data) {
    ssTot += (d.y - yMean) ** 2;
    ssRes += (d.y - (slope * d.x + intercept)) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.round(r + (255 - r) * amount));
  const ng = Math.min(255, Math.round(g + (255 - g) * amount));
  const nb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.max(0, Math.round(r * (1 - amount)));
  const ng = Math.max(0, Math.round(g * (1 - amount)));
  const nb = Math.max(0, Math.round(b * (1 - amount)));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

let gradientCounter = 0;

// Shadow configuration — light source from upper-left
// Enhanced for topographic relief effect: deeper, more dramatic shadows
const SHADOW = {
  offsetX: 6,    // shadow falls to the right (increased for more depth)
  offsetY: 8,    // shadow falls downward (increased for elevation feel)
  blur: 8,       // softness of shadow edge (wider penumbra)
  spread: 0,
  darkAlpha: 0.55,   // shadow opacity in dark mode (more visible)
  lightAlpha: 0.35,  // shadow opacity in light mode (more visible)
};

/**
 * 3D Extruded Bar Shape — Physical bar with cast shadow on chart surface
 * The bar appears to rise from the surface with:
 * - A directional cast shadow (offset down-right)
 * - A front-face gradient (lit from top-left)
 * - A right-side face showing depth (darker edge)
 * - A top highlight showing the lit upper surface
 */
export function Extruded3DBar(props: any) {
  const { x, y, width, height: h, fill } = props;
  if (!h || h <= 0 || !width || width <= 0) return null;

  const baseColor = fill || '#4A4A5A';
  const id = `bar3d_${gradientCounter++}`;
  const highlightColor = lighten(baseColor, 0.4);
  const shadowColor = darken(baseColor, 0.5);
  const sideColor = darken(baseColor, 0.35);

  // Extrusion depth — how far the bar "rises" from the surface
  // Increased for more dramatic topographic relief
  const extrudeX = 4;
  const extrudeY = 4;

  return (
    <g>
      <defs>
        {/* Front face gradient — lit from top */}
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={highlightColor} stopOpacity={0.95} />
          <stop offset="8%" stopColor={lighten(baseColor, 0.15)} stopOpacity={0.92} />
          <stop offset="50%" stopColor={baseColor} stopOpacity={0.88} />
          <stop offset="92%" stopColor={darken(baseColor, 0.15)} stopOpacity={0.88} />
          <stop offset="100%" stopColor={shadowColor} stopOpacity={0.92} />
        </linearGradient>
        {/* Side face gradient — darker, showing depth */}
        <linearGradient id={`${id}_side`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={sideColor} stopOpacity={0.9} />
          <stop offset="100%" stopColor={darken(baseColor, 0.55)} stopOpacity={0.95} />
        </linearGradient>
        {/* Cast shadow blur filter — enhanced for topographic depth */}
        <filter id={`${id}_shadow`} x="-30%" y="-15%" width="170%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
        </filter>
      </defs>

      {/* === CAST SHADOW on chart surface === */}
      {/* Primary cast shadow — deep, offset, blurred for elevation feel */}
      <rect
        x={x + SHADOW.offsetX}
        y={y + SHADOW.offsetY}
        width={width + 2}
        height={h + 2}
        rx={3}
        ry={3}
        fill="rgba(0,0,0,0.5)"
        filter={`url(#${id}_shadow)`}
      />
      {/* Secondary ambient shadow — softer, wider spread for ground contact */}
      <rect
        x={x + 2}
        y={y + h - 2}
        width={width}
        height={6}
        rx={3}
        fill="rgba(0,0,0,0.2)"
        filter={`url(#${id}_shadow)`}
      />

      {/* === RIGHT SIDE FACE (depth/extrusion) === */}
      {/* A parallelogram showing the bar's thickness from the right */}
      <path
        d={`M${x + width},${y} L${x + width + extrudeX},${y + extrudeY} L${x + width + extrudeX},${y + h + extrudeY} L${x + width},${y + h} Z`}
        fill={`url(#${id}_side)`}
      />

      {/* === BOTTOM FACE (depth/extrusion) === */}
      {/* A parallelogram showing the bar's thickness from below */}
      <path
        d={`M${x},${y + h} L${x + extrudeX},${y + h + extrudeY} L${x + width + extrudeX},${y + h + extrudeY} L${x + width},${y + h} Z`}
        fill={darken(baseColor, 0.5)}
        fillOpacity={0.7}
      />

      {/* === FRONT FACE (main visible surface) === */}
      <rect
        x={x}
        y={y}
        width={width}
        height={h}
        rx={2}
        ry={2}
        fill={`url(#${id})`}
      />

      {/* === TOP FACE (lit surface on top of bar) === */}
      <path
        d={`M${x},${y} L${x + extrudeX},${y - extrudeY + 1} L${x + width + extrudeX},${y - extrudeY + 1} L${x + width},${y} Z`}
        fill={highlightColor}
        fillOpacity={0.35}
      />

      {/* Top highlight line — bright edge where light catches */}
      <rect
        x={x + 1}
        y={y}
        width={width - 2}
        height={Math.min(2.5, h * 0.06)}
        rx={1.5}
        fill={highlightColor}
        fillOpacity={0.55}
      />

      {/* Left highlight edge — subtle rim light */}
      <rect
        x={x}
        y={y + 2}
        width={Math.min(1.5, width * 0.08)}
        height={h - 4}
        rx={0.75}
        fill={highlightColor}
        fillOpacity={0.2}
      />
    </g>
  );
}

/**
 * 3D Extruded Horizontal Bar — For layout="vertical" charts (e.g., Gravitational Pull)
 * Same physical extrusion but oriented horizontally
 */
export function Extruded3DHorizontalBar(props: any) {
  const { x, y, width, height: h, fill } = props;
  if (!h || h <= 0 || !width) return null;

  const barWidth = Math.abs(width);
  const barX = width >= 0 ? x : x + width;
  const baseColor = fill || '#4A4A5A';
  const id = `hbar3d_${gradientCounter++}`;
  const highlightColor = lighten(baseColor, 0.4);
  const shadowColor = darken(baseColor, 0.5);
  const sideColor = darken(baseColor, 0.35);

  const extrudeX = 2;
  const extrudeY = 3;

  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={highlightColor} stopOpacity={0.92} />
          <stop offset="15%" stopColor={baseColor} stopOpacity={0.88} />
          <stop offset="85%" stopColor={baseColor} stopOpacity={0.85} />
          <stop offset="100%" stopColor={shadowColor} stopOpacity={0.92} />
        </linearGradient>
        <filter id={`${id}_shadow`} x="-25%" y="-20%" width="160%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" />
        </filter>
      </defs>

      {/* Cast shadow — enhanced for topographic depth */}
      <rect
        x={barX + 5}
        y={y + 6}
        width={barWidth + 2}
        height={h + 2}
        rx={3}
        fill="rgba(0,0,0,0.45)"
        filter={`url(#${id}_shadow)`}
      />
      {/* Ambient ground shadow */}
      <rect
        x={barX + 1}
        y={y + h - 1}
        width={barWidth}
        height={5}
        rx={2.5}
        fill="rgba(0,0,0,0.15)"
        filter={`url(#${id}_shadow)`}
      />

      {/* Bottom face (extrusion depth) */}
      <path
        d={`M${barX},${y + h} L${barX + extrudeX},${y + h + extrudeY} L${barX + barWidth + extrudeX},${y + h + extrudeY} L${barX + barWidth},${y + h} Z`}
        fill={sideColor}
        fillOpacity={0.65}
      />

      {/* Right side face */}
      {width >= 0 && (
        <path
          d={`M${barX + barWidth},${y} L${barX + barWidth + extrudeX},${y + extrudeY} L${barX + barWidth + extrudeX},${y + h + extrudeY} L${barX + barWidth},${y + h} Z`}
          fill={sideColor}
          fillOpacity={0.5}
        />
      )}

      {/* Front face */}
      <rect
        x={barX}
        y={y}
        width={barWidth}
        height={h}
        rx={2}
        ry={2}
        fill={`url(#${id})`}
      />

      {/* Top highlight */}
      <rect
        x={barX + 1}
        y={y}
        width={barWidth - 2}
        height={Math.min(2, h * 0.1)}
        rx={1}
        fill={highlightColor}
        fillOpacity={0.5}
      />
    </g>
  );
}

/**
 * 3D Scatter Dot — Sphere sitting on the chart surface with contact shadow
 * The dot appears as a physical sphere with:
 * - An elliptical contact shadow underneath (squashed circle)
 * - A directional cast shadow (offset)
 * - Radial gradient for spherical lighting
 * - Specular highlight (bright spot where light hits)
 */
export function Extruded3DDot(props: any) {
  const { cx, cy, r = 4, fill } = props;
  if (cx == null || cy == null) return null;
  
  const baseColor = fill || '#4A4A5A';
  const safeColor = baseColor.startsWith('#') ? baseColor : '#4A7A8A';
  const id = `dot3d_${gradientCounter++}`;
  const highlightColor = lighten(safeColor, 0.55);
  const shadowColor = darken(safeColor, 0.55);
  const radius = Math.max(r, 3.5);

  return (
    <g>
      <defs>
        <radialGradient id={id} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={highlightColor} stopOpacity={0.95} />
          <stop offset="35%" stopColor={safeColor} stopOpacity={0.88} />
          <stop offset="100%" stopColor={shadowColor} stopOpacity={0.8} />
        </radialGradient>
        <filter id={`${id}_shadow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
        </filter>
        <filter id={`${id}_ambient`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
        </filter>
      </defs>

      {/* === CAST SHADOW — deep elliptical, offset down-right for elevation === */}
      <ellipse
        cx={cx + 4}
        cy={cy + 5}
        rx={radius * 1.8}
        ry={radius * 0.85}
        fill="rgba(0,0,0,0.4)"
        filter={`url(#${id}_shadow)`}
      />

      {/* === CONTACT SHADOW — tight shadow directly under the sphere === */}
      <ellipse
        cx={cx + 0.5}
        cy={cy + radius * 0.65}
        rx={radius * 1.0}
        ry={radius * 0.4}
        fill="rgba(0,0,0,0.3)"
        filter={`url(#${id}_ambient)`}
      />

      {/* === SPHERE BODY === */}
      <circle cx={cx} cy={cy} r={radius} fill={`url(#${id})`} />

      {/* === SPECULAR HIGHLIGHT — bright spot from light source === */}
      <circle
        cx={cx - radius * 0.3}
        cy={cy - radius * 0.3}
        r={radius * 0.35}
        fill="white"
        fillOpacity={0.35}
      />

      {/* === RIM LIGHT — subtle edge highlight on the lit side === */}
      <path
        d={`M${cx - radius * 0.7},${cy - radius * 0.5} A${radius},${radius} 0 0,1 ${cx + radius * 0.2},${cy - radius * 0.85}`}
        stroke="white"
        strokeWidth={0.8}
        strokeOpacity={0.2}
        fill="none"
      />
    </g>
  );
}

/**
 * Generate SVG defs for 3D area gradient with enhanced depth
 */
export function create3DAreaGradient(baseColor: string, isDark: boolean): { id: string; defs: React.ReactNode } {
  const id = `area3d_${gradientCounter++}`;
  const safeColor = baseColor.startsWith('#') ? baseColor : '#00d4ff';
  const topColor = lighten(safeColor, isDark ? 0.2 : 0.15);
  const bottomColor = darken(safeColor, isDark ? 0.35 : 0.2);

  const defs = (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={topColor} stopOpacity={isDark ? 0.5 : 0.4} />
      <stop offset="30%" stopColor={baseColor} stopOpacity={isDark ? 0.3 : 0.25} />
      <stop offset="70%" stopColor={bottomColor} stopOpacity={isDark ? 0.12 : 0.08} />
      <stop offset="100%" stopColor={bottomColor} stopOpacity={0.02} />
    </linearGradient>
  );

  return { id, defs };
}

/**
 * 3D Line stroke style — enhanced shadow for raised ridge effect
 * The line appears as a physical ridge casting shadow on the chart surface
 */
export const LINE_3D_STYLE = {
  filter: 'drop-shadow(4px 6px 5px rgba(0,0,0,0.5)) drop-shadow(2px 3px 3px rgba(0,0,0,0.25)) drop-shadow(0px 1px 1px rgba(0,0,0,0.15))',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/**
 * SVG filter definition for 3D line shadow — use this in chart <defs>
 * Creates a more realistic cast shadow than CSS drop-shadow
 */
export function LineShadowFilter({ id = 'lineShadow3d' }: { id?: string }) {
  return (
    <filter id={id} x="-15%" y="-15%" width="140%" height="150%">
      <feDropShadow dx="4" dy="6" stdDeviation="4" floodColor="rgba(0,0,0,0.45)" />
      <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="rgba(0,0,0,0.25)" />
      <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.1)" />
    </filter>
  );
}

/**
 * Extruded bar with capacity ceiling marker (for Attendance home chart)
 */
export function Extruded3DBarWithCeiling(props: any) {
  const { x, y, width, height: h, fill, payload } = props;
  if (!h || h <= 0 || !width || width <= 0) return null;

  const baseColor = fill || '#4A4A5A';
  const id = `barceil3d_${gradientCounter++}`;
  const highlightColor = lighten(baseColor, 0.4);
  const shadowColor = darken(baseColor, 0.5);
  const sideColor = darken(baseColor, 0.35);

  const cap = payload?.capacity || 0;
  const avg = payload?.avg || 0;
  const yAxis = y + h;
  const barScale = avg > 0 ? h / avg : 0;
  const capY = cap > 0 ? yAxis - (cap * barScale) : 0;

  const extrudeX = 3;
  const extrudeY = 3;

  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={highlightColor} stopOpacity={0.95} />
          <stop offset="8%" stopColor={lighten(baseColor, 0.15)} stopOpacity={0.92} />
          <stop offset="50%" stopColor={baseColor} stopOpacity={0.88} />
          <stop offset="92%" stopColor={darken(baseColor, 0.15)} stopOpacity={0.88} />
          <stop offset="100%" stopColor={shadowColor} stopOpacity={0.92} />
        </linearGradient>
        <filter id={`${id}_shadow`} x="-30%" y="-15%" width="170%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
        </filter>
      </defs>

      {/* Cast shadow — enhanced for topographic depth */}
      <rect
        x={x + SHADOW.offsetX}
        y={y + SHADOW.offsetY}
        width={width + 2}
        height={h + 2}
        rx={3}
        fill="rgba(0,0,0,0.5)"
        filter={`url(#${id}_shadow)`}
      />
      {/* Ambient ground shadow */}
      <rect
        x={x + 2}
        y={y + h - 2}
        width={width}
        height={6}
        rx={3}
        fill="rgba(0,0,0,0.2)"
        filter={`url(#${id}_shadow)`}
      />

      {/* Right side face */}
      <path
        d={`M${x + width},${y} L${x + width + extrudeX},${y + extrudeY} L${x + width + extrudeX},${y + h + extrudeY} L${x + width},${y + h} Z`}
        fill={sideColor}
        fillOpacity={0.7}
      />

      {/* Bottom face */}
      <path
        d={`M${x},${y + h} L${x + extrudeX},${y + h + extrudeY} L${x + width + extrudeX},${y + h + extrudeY} L${x + width},${y + h} Z`}
        fill={darken(baseColor, 0.5)}
        fillOpacity={0.6}
      />

      {/* Front face */}
      <rect x={x} y={y} width={width} height={h} rx={2} ry={2} fill={`url(#${id})`} />

      {/* Top face */}
      <path
        d={`M${x},${y} L${x + extrudeX},${y - extrudeY + 1} L${x + width + extrudeX},${y - extrudeY + 1} L${x + width},${y} Z`}
        fill={highlightColor}
        fillOpacity={0.3}
      />

      {/* Top highlight */}
      <rect x={x + 1} y={y} width={width - 2} height={Math.min(2.5, h * 0.06)} rx={1.5}
        fill={highlightColor} fillOpacity={0.55} />

      {/* Capacity ceiling marker — white 3D bump */}
      {cap > 0 && (
        <>
          {/* Shadow line underneath for depth */}
          <line x1={x - 2} y1={capY + 1.5} x2={x + width + 2} y2={capY + 1.5}
            stroke="rgba(0,0,0,0.35)" strokeWidth={2} strokeDasharray="3 2" strokeOpacity={0.5} />
          {/* Main white dashed line */}
          <line x1={x - 2} y1={capY} x2={x + width + 2} y2={capY}
            stroke="rgba(255,255,255,0.85)" strokeWidth={1.5} strokeDasharray="3 2" strokeOpacity={0.9} />
          {/* Highlight line above for 3D bump */}
          <line x1={x - 2} y1={capY - 0.5} x2={x + width + 2} y2={capY - 0.5}
            stroke="rgba(255,255,255,0.4)" strokeWidth={0.5} strokeDasharray="3 2" strokeOpacity={0.6} />
          {/* Diamond marker instead of circle for cleaner look */}
          <circle cx={x + width / 2} cy={capY} r={2} fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.3)" strokeWidth={0.5} />
        </>
      )}
    </g>
  );
}
