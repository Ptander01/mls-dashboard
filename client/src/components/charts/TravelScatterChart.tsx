/**
 * TravelScatterChart — Travel Burden vs Away Performance Drop
 *
 * Bubble scatter plot:
 *   X-axis: Total away miles
 *   Y-axis: Home/Away PPG delta (home advantage)
 *   Bubble size: Squad depth index
 *
 * Features:
 *   - Regression line with R² annotation
 *   - Quadrant labels (LOW TRAVEL · HIGH ADVANTAGE, etc.)
 *   - Conference filter toggle (ALL / EAST / WEST)
 *   - Auto-generated insight headline
 *   - 3D matte playdough aesthetic with cast shadows
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

  // Find extremes
  const mostTravel = [...metrics].sort((a, b) => b.totalAwayMiles - a.totalAwayMiles)[0];
  const leastTravel = [...metrics].sort((a, b) => a.totalAwayMiles - b.totalAwayMiles)[0];
  const biggestGap = [...metrics].sort((a, b) => b.ppgGap - a.ppgGap)[0];

  // Compute residuals for outlier detection
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
  const height = 600;
  const margin = { top: 30, right: 40, bottom: 60, left: 70 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  // ─── Scales ───
  const xExtent = useMemo(() => {
    if (filtered.length === 0) return { min: 15000, max: 45000 };
    const vals = filtered.map(m => m.totalAwayMiles);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.1 || 5000;
    return { min: Math.max(0, min - pad), max: max + pad };
  }, [filtered]);

  const yExtent = useMemo(() => {
    if (filtered.length === 0) return { min: -0.5, max: 1.5 };
    const vals = filtered.map(m => m.ppgGap);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.15 || 0.3;
    return { min: min - pad, max: max + pad };
  }, [filtered]);

  const depthExtent = useMemo(() => {
    if (filtered.length === 0) return { min: 0, max: 100 };
    const vals = filtered.map(m => m.squadDepthIndex);
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [filtered]);

  const xScale = (val: number) => margin.left + ((val - xExtent.min) / (xExtent.max - xExtent.min)) * plotW;
  const yScale = (val: number) => margin.top + plotH - ((val - yExtent.min) / (yExtent.max - yExtent.min)) * plotH;

  // Bubble radius: 12–32px based on squad depth
  const radiusScale = (depth: number) => {
    const range = depthExtent.max - depthExtent.min || 1;
    const t = (depth - depthExtent.min) / range;
    return 12 + t * 20;
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
    while (v <= xExtent.max) {
      ticks.push(v);
      v += step;
    }
    return ticks;
  }, [xExtent]);

  const yTicks = useMemo(() => {
    const range = yExtent.max - yExtent.min;
    const step = range > 1.5 ? 0.5 : range > 0.8 ? 0.25 : 0.1;
    const ticks: number[] = [];
    let v = Math.ceil(yExtent.min / step) * step;
    while (v <= yExtent.max) {
      ticks.push(Math.round(v * 100) / 100);
      v += step;
    }
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
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const axisColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
  const textColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const labelColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)';
  const quadrantColor = isDark ? 'rgba(0,212,255,0.12)' : 'rgba(0,160,200,0.08)';
  const regressionColor = isDark ? 'rgba(0,212,255,0.45)' : 'rgba(0,160,200,0.35)';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
            Travel Burden vs Away Performance Drop
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            X = total miles traveled on away trips. Y = points per game difference (home minus away). Bubble size = squad depth index.
          </p>
        </div>
        {/* Conference filter */}
        <div className="flex items-center gap-0">
          {(['ALL', 'EAST', 'WEST'] as ConferenceFilter[]).map((c, i) => (
            <button
              key={c}
              onClick={() => setConference(c)}
              className={`text-[10px] px-3 py-1.5 font-semibold tracking-wider transition-all relative z-10 ${
                conference === c
                  ? 'neu-pressed text-cyan'
                  : 'neu-raised text-muted-foreground hover:text-foreground'
              } ${i === 0 ? 'rounded-l-lg' : i === 2 ? 'rounded-r-lg' : ''}`}
              style={{ fontFamily: 'Space Grotesk' }}
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
          style={{ minWidth: '700px', maxHeight: '600px' }}
        >
          <defs>
            {/* Shadow filter for bubbles */}
            <filter id="bubble-shadow" x="-40%" y="-20%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
          </defs>

          {/* Grid lines */}
          {xTicks.map(t => (
            <line
              key={`xg-${t}`}
              x1={xScale(t)} y1={margin.top}
              x2={xScale(t)} y2={margin.top + plotH}
              stroke={gridColor}
              strokeDasharray="4,4"
            />
          ))}
          {yTicks.map(t => (
            <line
              key={`yg-${t}`}
              x1={margin.left} y1={yScale(t)}
              x2={margin.left + plotW} y2={yScale(t)}
              stroke={gridColor}
              strokeDasharray="4,4"
            />
          ))}

          {/* Quadrant divider lines */}
          <line
            x1={xScale(medianX)} y1={margin.top}
            x2={xScale(medianX)} y2={margin.top + plotH}
            stroke={quadrantColor}
            strokeDasharray="6,4"
            strokeWidth={1.5}
          />
          <line
            x1={margin.left} y1={yScale(medianY)}
            x2={margin.left + plotW} y2={yScale(medianY)}
            stroke={quadrantColor}
            strokeDasharray="6,4"
            strokeWidth={1.5}
          />

          {/* Quadrant labels */}
          <text
            x={margin.left + 12}
            y={margin.top + 18}
            fill={isDark ? 'rgba(0,212,255,0.2)' : 'rgba(0,160,200,0.18)'}
            fontSize={10}
            fontWeight={700}
            fontFamily="Space Grotesk"
            letterSpacing="0.08em"
          >
            LOW TRAVEL · HIGH ADVANTAGE
          </text>
          <text
            x={margin.left + plotW - 12}
            y={margin.top + plotH - 8}
            fill={isDark ? 'rgba(0,212,255,0.2)' : 'rgba(0,160,200,0.18)'}
            fontSize={10}
            fontWeight={700}
            fontFamily="Space Grotesk"
            letterSpacing="0.08em"
            textAnchor="end"
          >
            HIGH TRAVEL · LOW ADVANTAGE
          </text>
          <text
            x={margin.left + plotW - 12}
            y={margin.top + 18}
            fill={isDark ? 'rgba(255,180,80,0.15)' : 'rgba(180,120,40,0.12)'}
            fontSize={10}
            fontWeight={700}
            fontFamily="Space Grotesk"
            letterSpacing="0.08em"
            textAnchor="end"
          >
            HIGH TRAVEL · HIGH ADVANTAGE
          </text>
          <text
            x={margin.left + 12}
            y={margin.top + plotH - 8}
            fill={isDark ? 'rgba(255,180,80,0.15)' : 'rgba(180,120,40,0.12)'}
            fontSize={10}
            fontWeight={700}
            fontFamily="Space Grotesk"
            letterSpacing="0.08em"
          >
            LOW TRAVEL · LOW ADVANTAGE
          </text>

          {/* Regression line */}
          {regression && (
            <>
              <line
                x1={xScale(xExtent.min)}
                y1={yScale(regression.slope * xExtent.min + regression.intercept)}
                x2={xScale(xExtent.max)}
                y2={yScale(regression.slope * xExtent.max + regression.intercept)}
                stroke={regressionColor}
                strokeWidth={2}
                strokeDasharray="8,5"
              />
              {/* R² annotation */}
              <text
                x={xScale(xExtent.max) - 8}
                y={yScale(regression.slope * xExtent.max + regression.intercept) - 10}
                fill={regressionColor}
                fontSize={10}
                fontWeight={600}
                fontFamily="Space Grotesk"
                textAnchor="end"
              >
                R² = {regression.r2.toFixed(2)}
              </text>
            </>
          )}

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
                x={xScale(t)}
                y={margin.top + plotH + 18}
                fill={textColor}
                fontSize={10}
                fontFamily="Space Grotesk"
                textAnchor="middle"
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
                x={margin.left - 10}
                y={yScale(t) + 4}
                fill={textColor}
                fontSize={10}
                fontFamily="Space Grotesk"
                textAnchor="end"
              >
                {t.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Axis labels */}
          <text
            x={margin.left + plotW / 2}
            y={height - 8}
            fill={labelColor}
            fontSize={12}
            fontWeight={600}
            fontFamily="Space Grotesk"
            textAnchor="middle"
          >
            Total Away Miles Traveled
          </text>
          <text
            x={14}
            y={margin.top + plotH / 2}
            fill={labelColor}
            fontSize={12}
            fontWeight={600}
            fontFamily="Space Grotesk"
            textAnchor="middle"
            transform={`rotate(-90, 14, ${margin.top + plotH / 2})`}
          >
            Home Advantage (PPG Delta)
          </text>

          {/* Bubbles — shadows first, then bubbles on top */}
          {filtered.map(m => {
            const cx = xScale(m.totalAwayMiles);
            const cy = yScale(m.ppgGap);
            const r = radiusScale(m.squadDepthIndex);
            return (
              <ellipse
                key={`shadow-${m.teamId}`}
                cx={cx + 3}
                cy={cy + r * 0.6}
                rx={r * 1.1}
                ry={r * 0.4}
                fill={isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.12)'}
                filter="url(#bubble-shadow)"
              />
            );
          })}

          {filtered.map(m => {
            const cx = xScale(m.totalAwayMiles);
            const cy = yScale(m.ppgGap);
            const r = radiusScale(m.squadDepthIndex);
            const baseColor = mutedTeamColor(m.teamId, isDark);
            const gradId = `bubble-grad-${m.teamId}`;

            return (
              <g key={`bubble-${m.teamId}`}>
                <defs>
                  <radialGradient id={gradId} cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor={lighten(baseColor, 0.35)} stopOpacity={0.95} />
                    <stop offset="50%" stopColor={baseColor} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={darken(baseColor, 0.25)} stopOpacity={0.85} />
                  </radialGradient>
                </defs>

                {/* Main bubble */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={`url(#${gradId})`}
                  stroke={lighten(baseColor, 0.2)}
                  strokeWidth={1}
                  strokeOpacity={0.4}
                />

                {/* Specular highlight */}
                <circle
                  cx={cx - r * 0.2}
                  cy={cy - r * 0.25}
                  r={r * 0.25}
                  fill="white"
                  fillOpacity={isDark ? 0.15 : 0.25}
                />

                {/* Team label */}
                <text
                  x={cx}
                  y={cy - r - 5}
                  fill={labelColor}
                  fontSize={10}
                  fontWeight={600}
                  fontFamily="Space Grotesk"
                  textAnchor="middle"
                >
                  {m.teamShort}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{
            background: isDark ? 'rgba(0,212,255,0.3)' : 'rgba(0,160,200,0.25)',
          }} />
          <span>Bubble size = Squad Depth Index</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-[1.5px]" style={{
            background: regressionColor,
            borderTop: `1.5px dashed ${regressionColor}`,
          }} />
          <span>Regression trend</span>
        </div>
      </div>
    </div>
  );
}
