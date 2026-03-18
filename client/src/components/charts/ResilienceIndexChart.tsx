/**
 * ResilienceIndexChart — 3D Extruded Treemap
 *
 * A top-down treemap where each team is a tile whose area is proportional to
 * its resilience score. Tiles are rendered with 3D extrusion (right-side face,
 * bottom face, cast shadow) in the matte "shipping container" aesthetic.
 *
 * Extrusion depth encodes a secondary metric (away PPG in INDEX mode).
 *
 * Color symbology toggle:
 *   SCORE — tiles colored by resilience tier (green/cyan/amber/red)
 *   TEAM  — tiles use each team's muted earthy primary color
 *
 * View modes:
 *   INDEX      — single tile per team, area = score, depth = away PPG
 *   COMPONENTS — each tile subdivided into 3 stacked horizontal strips
 *                (Away Perf, Congestion Resistance, Long-Haul Record)
 */

import { useState, useMemo, memo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { lighten, darken, mutedTeamColor } from '@/lib/chartUtils';
import type { TeamResilienceMetrics } from '@/lib/resilienceUtils';
import { TIER_COLORS, TIER_LABELS, tierColor } from '@/lib/resilienceUtils';

type ViewMode = 'INDEX' | 'COMPONENTS';
type ColorMode = 'SCORE' | 'TEAM';

interface ResilienceIndexChartProps {
  metrics: TeamResilienceMetrics[];
  height?: number;
}

// ═══════════════════════════════════════════
// SQUARIFIED TREEMAP LAYOUT
// ═══════════════════════════════════════════

interface TreemapRect {
  x: number;
  y: number;
  w: number;
  h: number;
  data: TeamResilienceMetrics;
}

/**
 * Squarified treemap layout — produces rectangles with aspect ratios
 * as close to 1:1 as possible for better readability.
 * Input data must be sorted descending by value.
 */
function squarify(
  items: { value: number; data: TeamResilienceMetrics }[],
  x: number, y: number, w: number, h: number,
): TreemapRect[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ x, y, w, h, data: items[0].data }];
  }

  const totalValue = items.reduce((s, d) => s + d.value, 0);
  if (totalValue <= 0) return [];

  const results: TreemapRect[] = [];
  let remaining = [...items];
  let cx = x, cy = y, cw = w, ch = h;

  while (remaining.length > 0) {
    const remTotal = remaining.reduce((s, d) => s + d.value, 0);

    // Lay out along the shorter side
    const isHorizontal = cw >= ch;
    const sideLen = isHorizontal ? ch : cw;

    // Greedily add items to the current row until aspect ratio worsens
    let row: typeof remaining = [];
    let rowSum = 0;
    let bestWorst = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = [...row, remaining[i]];
      const candidateSum = rowSum + remaining[i].value;

      // The row occupies (candidateSum / remTotal) fraction of the remaining area
      const rowFraction = candidateSum / remTotal;
      const rowLen = sideLen; // the side we're stacking along
      const rowThickness = isHorizontal
        ? cw * rowFraction
        : ch * rowFraction;

      // Compute worst aspect ratio in this candidate row
      let worstAR = 0;
      for (const item of candidate) {
        const itemFraction = item.value / candidateSum;
        const itemLen = rowLen * itemFraction;
        const ar = Math.max(itemLen / rowThickness, rowThickness / itemLen);
        worstAR = Math.max(worstAR, ar);
      }

      if (worstAR <= bestWorst || row.length === 0) {
        row = candidate;
        rowSum = candidateSum;
        bestWorst = worstAR;
      } else {
        break;
      }
    }

    // Lay out the row
    const rowFraction = rowSum / remTotal;
    const rowThickness = isHorizontal ? cw * rowFraction : ch * rowFraction;

    let offset = 0;
    for (const item of row) {
      const itemFraction = item.value / rowSum;
      const itemLen = sideLen * itemFraction;

      if (isHorizontal) {
        results.push({
          x: cx,
          y: cy + offset,
          w: rowThickness,
          h: itemLen,
          data: item.data,
        });
      } else {
        results.push({
          x: cx + offset,
          y: cy,
          w: itemLen,
          h: rowThickness,
          data: item.data,
        });
      }
      offset += itemLen;
    }

    // Update remaining area
    if (isHorizontal) {
      cx += rowThickness;
      cw -= rowThickness;
    } else {
      cy += rowThickness;
      ch -= rowThickness;
    }

    remaining = remaining.slice(row.length);
  }

  return results;
}

// ═══════════════════════════════════════════
// 3D EXTRUDED TILE
// ═══════════════════════════════════════════

const GAP = 2; // gap between tiles

function ExtrudedTile3D({
  x, y, w, h, color, depth, id, isDark, label, score, subLabel,
}: {
  x: number; y: number; w: number; h: number;
  color: string; depth: number; id: string; isDark: boolean;
  label: string; score: number; subLabel?: string;
}) {
  // Apply gap inset
  const gx = x + GAP / 2;
  const gy = y + GAP / 2;
  const gw = w - GAP;
  const gh = h - GAP;

  if (gw < 4 || gh < 4) return null;

  const extX = Math.min(depth, 8);
  const extY = Math.min(depth, 10);

  const highlightColor = lighten(color, 0.35);
  const shadowColor = darken(color, 0.5);
  const sideColor = darken(color, 0.35);
  const topFaceColor = lighten(color, 0.15);

  // Determine if there's room for text
  const showLabel = gw > 40 && gh > 24;
  const showScore = gw > 30 && gh > 16;
  const showSubLabel = gw > 55 && gh > 40 && subLabel;

  // Font size scales with tile area
  const area = gw * gh;
  const labelSize = Math.max(8, Math.min(14, Math.sqrt(area) * 0.09));
  const scoreSize = Math.max(7, Math.min(12, Math.sqrt(area) * 0.07));
  const subLabelSize = Math.max(6, Math.min(9, Math.sqrt(area) * 0.05));

  return (
    <g>
      <defs>
        {/* Front face gradient — matte top-lit */}
        <linearGradient id={`${id}_fg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={highlightColor} stopOpacity={0.95} />
          <stop offset="20%" stopColor={topFaceColor} stopOpacity={0.9} />
          <stop offset="80%" stopColor={color} stopOpacity={0.88} />
          <stop offset="100%" stopColor={shadowColor} stopOpacity={0.92} />
        </linearGradient>
        <filter id={`${id}_sh`} x="-20%" y="-20%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
        </filter>
      </defs>

      {/* Cast shadow */}
      <rect
        x={gx + 4}
        y={gy + 5}
        width={gw + extX}
        height={gh + extY}
        rx={2}
        fill={isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.18)'}
        filter={`url(#${id}_sh)`}
      />

      {/* Bottom face (extrusion) */}
      <path
        d={`M${gx},${gy + gh} L${gx + extX},${gy + gh + extY} L${gx + gw + extX},${gy + gh + extY} L${gx + gw},${gy + gh} Z`}
        fill={sideColor}
        fillOpacity={0.6}
      />

      {/* Right side face (extrusion) */}
      <path
        d={`M${gx + gw},${gy} L${gx + gw + extX},${gy + extY} L${gx + gw + extX},${gy + gh + extY} L${gx + gw},${gy + gh} Z`}
        fill={sideColor}
        fillOpacity={0.45}
      />

      {/* Front face */}
      <rect
        x={gx} y={gy}
        width={gw} height={gh}
        rx={2}
        fill={`url(#${id}_fg)`}
      />

      {/* Top highlight bevel */}
      <rect
        x={gx + 1} y={gy}
        width={gw - 2}
        height={Math.min(2.5, gh * 0.08)}
        rx={1}
        fill={highlightColor}
        fillOpacity={0.45}
      />

      {/* Left highlight edge */}
      <rect
        x={gx} y={gy + 1}
        width={Math.min(1.5, gw * 0.03)}
        height={gh - 2}
        rx={0.5}
        fill="white"
        fillOpacity={isDark ? 0.08 : 0.15}
      />

      {/* Subtle horizontal groove lines — shipping container texture */}
      {gh > 30 && Array.from({ length: Math.min(4, Math.floor(gh / 18)) }).map((_, i) => {
        const lineY = gy + (gh / (Math.min(4, Math.floor(gh / 18)) + 1)) * (i + 1);
        return (
          <line
            key={i}
            x1={gx + 3} y1={lineY}
            x2={gx + gw - 3} y2={lineY}
            stroke={shadowColor}
            strokeWidth={0.5}
            strokeOpacity={0.3}
          />
        );
      })}

      {/* Team name label */}
      {showLabel && (
        <text
          x={gx + gw / 2}
          y={gy + gh * 0.38}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fillOpacity={0.92}
          fontSize={labelSize}
          fontFamily="Space Grotesk, sans-serif"
          fontWeight={700}
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
        >
          {label}
        </text>
      )}

      {/* Score */}
      {showScore && (
        <text
          x={gx + gw / 2}
          y={gy + gh * (showSubLabel ? 0.58 : 0.62)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fillOpacity={0.75}
          fontSize={scoreSize}
          fontFamily="JetBrains Mono, monospace"
          fontWeight={600}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
        >
          {Math.round(score)}
        </text>
      )}

      {/* Sub label (e.g., miles) */}
      {showSubLabel && (
        <text
          x={gx + gw / 2}
          y={gy + gh * 0.76}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fillOpacity={0.5}
          fontSize={subLabelSize}
          fontFamily="JetBrains Mono, monospace"
        >
          {subLabel}
        </text>
      )}
    </g>
  );
}

// ═══════════════════════════════════════════
// COMPONENT STRIP TILE — subdivided tile
// ═══════════════════════════════════════════

function ComponentTile3D({
  x, y, w, h, data, id, isDark,
}: {
  x: number; y: number; w: number; h: number;
  data: TeamResilienceMetrics; id: string; isDark: boolean;
}) {
  const gx = x + GAP / 2;
  const gy = y + GAP / 2;
  const gw = w - GAP;
  const gh = h - GAP;

  if (gw < 8 || gh < 8) return null;

  const { awayPerformance, congestionResistance, longHaulRecord } = data.scoreComponents;
  const total = awayPerformance + congestionResistance + longHaulRecord;
  if (total <= 0) return null;

  const componentColors = isDark
    ? ['#1E3A28', '#1E3448', '#4A3E1A']   // deep forest green, deep steel blue, deep olive
    : ['#2A4A35', '#2A4A64', '#5A4A2A'];  // dark forest green, dark steel blue, dark olive;
  const componentLabels = ['Away', 'Depth', 'L-Haul'];
  const values = [awayPerformance, congestionResistance, longHaulRecord];

  // Stack strips vertically within the tile
  const stripGap = 1;
  const headerH = gh > 30 ? Math.min(16, gh * 0.22) : 0;
  const availH = gh - headerH - (values.length - 1) * stripGap;

  let stripY = gy + headerH;

  const extX = 4;
  const extY = 5;

  // Outer shadow
  const outerShadow = darken(componentColors[0], 0.5);

  return (
    <g>
      <defs>
        <filter id={`${id}_csh`} x="-20%" y="-20%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
        </filter>
      </defs>

      {/* Cast shadow for entire tile */}
      <rect
        x={gx + 3}
        y={gy + 4}
        width={gw + extX}
        height={gh + extY}
        rx={2}
        fill={isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)'}
        filter={`url(#${id}_csh)`}
      />

      {/* Background tile face */}
      <rect
        x={gx} y={gy}
        width={gw} height={gh}
        rx={2}
        fill={isDark ? 'rgba(30,30,50,0.6)' : 'rgba(200,200,220,0.4)'}
      />

      {/* Team name header */}
      {headerH > 0 && gw > 35 && (
        <text
          x={gx + gw / 2}
          y={gy + headerH * 0.6}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)'}
          fontSize={Math.max(7, Math.min(11, Math.sqrt(gw * gh) * 0.065))}
          fontFamily="Space Grotesk, sans-serif"
          fontWeight={700}
        >
          {data.teamShort}
        </text>
      )}

      {/* Component strips */}
      {values.map((val, j) => {
        const fraction = val / total;
        const stripH = availH * fraction;
        const sy = stripY;
        stripY += stripH + stripGap;

        if (stripH < 2) return null;

        const color = componentColors[j];
        const highlight = lighten(color, 0.35);
        const shadow = darken(color, 0.45);
        const side = darken(color, 0.3);

        const sExtX = Math.min(3, extX);
        const sExtY = Math.min(4, extY);

        return (
          <g key={j}>
            <defs>
              <linearGradient id={`${id}_s${j}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={highlight} stopOpacity={0.9} />
                <stop offset="50%" stopColor={color} stopOpacity={0.85} />
                <stop offset="100%" stopColor={shadow} stopOpacity={0.9} />
              </linearGradient>
            </defs>

            {/* Bottom face */}
            <path
              d={`M${gx},${sy + stripH} L${gx + sExtX},${sy + stripH + sExtY} L${gx + gw + sExtX},${sy + stripH + sExtY} L${gx + gw},${sy + stripH} Z`}
              fill={side}
              fillOpacity={0.5}
            />

            {/* Right side face */}
            <path
              d={`M${gx + gw},${sy} L${gx + gw + sExtX},${sy + sExtY} L${gx + gw + sExtX},${sy + stripH + sExtY} L${gx + gw},${sy + stripH} Z`}
              fill={side}
              fillOpacity={0.35}
            />

            {/* Front face */}
            <rect
              x={gx} y={sy}
              width={gw} height={stripH}
              rx={1}
              fill={`url(#${id}_s${j})`}
            />

            {/* Label inside strip */}
            {stripH > 10 && gw > 40 && (
              <text
                x={gx + gw / 2}
                y={sy + stripH / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fillOpacity={0.8}
                fontSize={Math.max(6, Math.min(9, stripH * 0.55))}
                fontFamily="JetBrains Mono, monospace"
              >
                {componentLabels[j]} {Math.round(val)}
              </text>
            )}
          </g>
        );
      })}

      {/* Right side face for outer tile */}
      <path
        d={`M${gx + gw},${gy} L${gx + gw + extX},${gy + extY} L${gx + gw + extX},${gy + gh + extY} L${gx + gw},${gy + gh} Z`}
        fill={isDark ? 'rgba(40,40,60,0.3)' : 'rgba(150,150,170,0.2)'}
      />

      {/* Bottom face for outer tile */}
      <path
        d={`M${gx},${gy + gh} L${gx + extX},${gy + gh + extY} L${gx + gw + extX},${gy + gh + extY} L${gx + gw},${gy + gh} Z`}
        fill={isDark ? 'rgba(40,40,60,0.3)' : 'rgba(150,150,170,0.2)'}
      />
    </g>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

function ResilienceIndexChartInner({ metrics }: ResilienceIndexChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [viewMode, setViewMode] = useState<ViewMode>('INDEX');
  const [colorMode, setColorMode] = useState<ColorMode>('SCORE');

  const sortedMetrics = useMemo(() =>
    [...metrics].sort((a, b) => b.resilienceScore - a.resilienceScore),
    [metrics]
  );

  // Treemap layout dimensions
  const chartWidth = 1100;
  const chartHeight = 620;
  const extrusionPadding = 12; // extra space for 3D extrusion overflow

  const treemapRects = useMemo(() => {
    const items = sortedMetrics.map(d => ({
      value: Math.max(d.resilienceScore, 5), // minimum area so tiny teams are visible
      data: d,
    }));
    return squarify(items, 0, 0, chartWidth, chartHeight);
  }, [sortedMetrics]);

  // Resolve tile color
  const getTileColor = (d: TeamResilienceMetrics) => {
    if (colorMode === 'TEAM') {
      return mutedTeamColor(d.teamId, isDark);
    }
    return tierColor(d.resilienceTier, isDark);
  };

  // Extrusion depth based on away PPG (higher = deeper extrusion = better road form)
  const maxAwayPPG = Math.max(...sortedMetrics.map(d => d.awayPPG), 1);
  const getDepth = (d: TeamResilienceMetrics) => {
    return 3 + (d.awayPPG / maxAwayPPG) * 7; // range 3–10
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
            {viewMode === 'INDEX'
              ? <>Tile area = resilience score. Extrusion depth = away PPG. {colorMode === 'SCORE' ? <>Color = <span style={{ color: tierColor('green', isDark) }}>performance tier</span>.</> : <>Color = <strong>team identity</strong>.</>}</>
              : <>Each tile subdivided by component: <span style={{ color: isDark ? '#3A6A4A' : '#4A7A5A' }}>Away</span> · <span style={{ color: isDark ? '#4A6A8A' : '#5A7A9A' }}>Depth</span> · <span style={{ color: isDark ? '#8A7A4A' : '#7A6A3A' }}>Long-Haul</span>. Area = composite score.</>
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

      {/* SVG Treemap */}
      <div style={{ overflow: 'hidden', width: '100%' }}>
        <svg
          viewBox={`0 0 ${chartWidth + extrusionPadding} ${chartHeight + extrusionPadding}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          className="select-none"
          style={{ display: 'block' }}
        >
          {treemapRects.map((rect, i) => {
            const d = rect.data;
            const uid = `tm_${d.teamId}_${i}`;
            const color = getTileColor(d);
            const depth = getDepth(d);
            const milesStr = d.totalAwayMiles >= 1000
              ? `${Math.round(d.totalAwayMiles / 1000)}k mi`
              : `${d.totalAwayMiles} mi`;

            if (viewMode === 'COMPONENTS') {
              return (
                <ComponentTile3D
                  key={d.teamId}
                  x={rect.x}
                  y={rect.y}
                  w={rect.w}
                  h={rect.h}
                  data={d}
                  id={uid}
                  isDark={isDark}
                />
              );
            }

            return (
              <ExtrudedTile3D
                key={d.teamId}
                x={rect.x}
                y={rect.y}
                w={rect.w}
                h={rect.h}
                color={color}
                depth={depth}
                id={uid}
                isDark={isDark}
                label={d.teamShort}
                score={d.resilienceScore}
                subLabel={milesStr}
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      {colorMode === 'SCORE' && viewMode === 'INDEX' ? (
        <div className="flex justify-center gap-5 mt-3 text-xs text-muted-foreground/60">
          {(['green', 'cyan', 'amber', 'red'] as const).map(tier => (
            <div key={tier} className="flex items-center gap-1.5">
              <span className="w-3.5 h-2.5 rounded-sm" style={{ backgroundColor: tierColor(tier, isDark) }} />
              <span>{TIER_LABELS[tier]}</span>
            </div>
          ))}
        </div>
      ) : viewMode === 'COMPONENTS' ? (
        <div className="flex justify-center gap-5 mt-3 text-xs text-muted-foreground/60">
          {[
            { color: isDark ? '#1E3A28' : '#2A4A35', label: 'Away PPG (40%)' },
            { color: isDark ? '#1E3448' : '#2A4A64', label: 'Squad Depth (30%)' },
            { color: isDark ? '#4A3E1A' : '#5A4A2A', label: 'Long-Haul Record (30%)' },
          ].map(c => (
            <div key={c.label} className="flex items-center gap-1.5">
              <span className="w-3.5 h-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex justify-center mt-3 text-xs text-muted-foreground/50">
          <span>Tile area = resilience score · Depth = away PPG · Color = team identity</span>
        </div>
      )}
    </div>
  );
}

const ResilienceIndexChart = memo(ResilienceIndexChartInner, (prev, next) =>
  prev.metrics === next.metrics
);
export default ResilienceIndexChart;
