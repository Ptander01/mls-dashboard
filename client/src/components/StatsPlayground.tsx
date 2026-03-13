/**
 * StatsPlayground — Statistical analysis playground for the Player Stats tab.
 *
 * Three sections:
 * 1. Correlation Matrix — 15x15 heatmap of all numeric stat pairs
 * 2. Hypothesis Tests — t-tests comparing groups (position, age, salary bracket)
 * 3. Distribution Viewer — Histogram for any selected stat
 *
 * Design: Uses the Dark Forge neumorphic system. The correlation matrix cells
 * are sized by |r| and colored teal (positive) / coral (negative), inspired by
 * the automotive correlation reference image the user shared.
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Grid3X3, FlaskConical, Activity, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import NeuCard from './NeuCard';
import { NeuInsightContainer } from './NeuInsightContainer';
import type { Player } from '@/lib/mlsData';

// ═══════════════════════════════════════════
// STAT DEFINITIONS
// ═══════════════════════════════════════════

interface StatDef {
  key: keyof Player;
  label: string;
  shortLabel: string;
}

const NUMERIC_STATS: StatDef[] = [
  { key: 'age', label: 'Age', shortLabel: 'Age' },
  { key: 'games', label: 'Games Played', shortLabel: 'GP' },
  { key: 'starts', label: 'Starts', shortLabel: 'Starts' },
  { key: 'minutes', label: 'Minutes', shortLabel: 'Min' },
  { key: 'goals', label: 'Goals', shortLabel: 'Goals' },
  { key: 'assists', label: 'Assists', shortLabel: 'Ast' },
  { key: 'shots', label: 'Shots', shortLabel: 'Shots' },
  { key: 'shotsOnTarget', label: 'Shots on Target', shortLabel: 'SOT' },
  { key: 'shotAccuracy', label: 'Shot Accuracy', shortLabel: 'Sh%' },
  { key: 'tackles', label: 'Tackles', shortLabel: 'Tkl' },
  { key: 'interceptions', label: 'Interceptions', shortLabel: 'Int' },
  { key: 'fouls', label: 'Fouls', shortLabel: 'Fls' },
  { key: 'yellowCards', label: 'Yellow Cards', shortLabel: 'YC' },
  { key: 'crosses', label: 'Crosses', shortLabel: 'Crs' },
  { key: 'salary', label: 'Salary', shortLabel: 'Sal' },
];

/** Rate stats (per 90 minutes) — computed from raw stats, produces negative correlations */
interface RateStatDef {
  key: string;
  label: string;
  shortLabel: string;
  compute: (p: Player) => number;
}

const RATE_STATS: RateStatDef[] = [
  { key: 'age', label: 'Age', shortLabel: 'Age', compute: (p) => p.age },
  { key: 'salary', label: 'Salary', shortLabel: 'Sal', compute: (p) => p.salary },
  { key: 'shotAccuracy', label: 'Shot Accuracy', shortLabel: 'Sh%', compute: (p) => p.shotAccuracy },
  { key: 'goalConversion', label: 'Goal Conversion', shortLabel: 'GC%', compute: (p) => p.shots > 0 ? (p.goals / p.shots) * 100 : 0 },
  { key: 'goals90', label: 'Goals / 90', shortLabel: 'G/90', compute: (p) => p.minutes > 0 ? (p.goals / p.minutes) * 90 : 0 },
  { key: 'assists90', label: 'Assists / 90', shortLabel: 'A/90', compute: (p) => p.minutes > 0 ? (p.assists / p.minutes) * 90 : 0 },
  { key: 'shots90', label: 'Shots / 90', shortLabel: 'Sh/90', compute: (p) => p.minutes > 0 ? (p.shots / p.minutes) * 90 : 0 },
  { key: 'tackles90', label: 'Tackles / 90', shortLabel: 'Tkl/90', compute: (p) => p.minutes > 0 ? (p.tackles / p.minutes) * 90 : 0 },
  { key: 'interceptions90', label: 'Interceptions / 90', shortLabel: 'Int/90', compute: (p) => p.minutes > 0 ? (p.interceptions / p.minutes) * 90 : 0 },
  { key: 'fouls90', label: 'Fouls / 90', shortLabel: 'Fls/90', compute: (p) => p.minutes > 0 ? (p.fouls / p.minutes) * 90 : 0 },
];

type StatMode = 'raw' | 'rate';

const POSITIONS = ['FW', 'MF', 'DF', 'GK'] as const;

// ═══════════════════════════════════════════
// STATISTICAL UTILITIES (pure functions)
// ═══════════════════════════════════════════

function pearsonR(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i]; sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumX2 += xs[i] * xs[i];
    sumY2 += ys[i] * ys[i];
  }
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : num / den;
}

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

/**
 * Welch's t-test (two-sample, unequal variance)
 * Returns { t, df, p } where p is two-tailed
 */
function welchTTest(a: number[], b: number[]): { t: number; df: number; p: number; meanA: number; meanB: number } {
  const nA = a.length, nB = b.length;
  const mA = mean(a), mB = mean(b);
  const vA = stdDev(a) ** 2, vB = stdDev(b) ** 2;

  if (nA < 2 || nB < 2) return { t: 0, df: 0, p: 1, meanA: mA, meanB: mB };

  const seA = vA / nA, seB = vB / nB;
  const t = (mA - mB) / Math.sqrt(seA + seB);
  const df = (seA + seB) ** 2 / ((seA ** 2) / (nA - 1) + (seB ** 2) / (nB - 1));

  // Approximate p-value using the t-distribution via regularized incomplete beta function
  const p = tDistPValue(Math.abs(t), df);
  return { t, df: Math.round(df), p, meanA: mA, meanB: mB };
}

/**
 * Approximate two-tailed p-value from t-distribution
 * Uses the relationship between t-distribution and regularized incomplete beta function
 */
function tDistPValue(t: number, df: number): number {
  if (df <= 0) return 1;
  const x = df / (df + t * t);
  // Regularized incomplete beta function approximation
  const p = regIncBeta(x, df / 2, 0.5);
  return Math.min(1, Math.max(0, p));
}

/**
 * Regularized incomplete beta function via continued fraction (Lentz's method)
 * Good enough for p-value approximation
 */
function regIncBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use series expansion for small x
  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta);

  // Continued fraction
  let f = 1, c = 1, d = 0;
  for (let i = 0; i <= 200; i++) {
    let m = Math.floor(i / 2);
    let num: number;
    if (i === 0) {
      num = 1;
    } else if (i % 2 === 0) {
      num = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    } else {
      num = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    }
    d = 1 + num * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    c = 1 + num / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    f *= c * d;
    if (Math.abs(c * d - 1) < 1e-8) break;
  }
  return front * (f - 1) / a;
}

/** Lanczos approximation of ln(Gamma(x)) */
function lnGamma(x: number): number {
  const g = 7;
  const coef = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  }
  x -= 1;
  let a = coef[0];
  for (let i = 1; i < g + 2; i++) a += coef[i] / (x + i);
  const t = x + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// ═══════════════════════════════════════════
// CORRELATION MATRIX COMPONENT
// ═══════════════════════════════════════════

interface CorrelationMatrixProps {
  players: Player[];
  isDark: boolean;
  positionFilter: string;
  statMode: StatMode;
  onCellClick: (xKey: string, yKey: string) => void;
}

function CorrelationMatrix({ players, isDark, positionFilter, statMode, onCellClick }: CorrelationMatrixProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const filtered = useMemo(() => {
    let result = positionFilter === 'ALL' ? players : players.filter(p => p.position === positionFilter);
    // For rate stats, filter to players with meaningful minutes (>200)
    if (statMode === 'rate') result = result.filter(p => p.minutes > 200);
    return result;
  }, [players, positionFilter, statMode]);

  // Active stat definitions based on mode
  const activeStats = statMode === 'raw' ? NUMERIC_STATS : RATE_STATS;

  // Compute full correlation matrix
  const matrix = useMemo(() => {
    const n = activeStats.length;
    const result: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    let columns: number[][];
    if (statMode === 'raw') {
      columns = (activeStats as StatDef[]).map(s =>
        filtered.map(p => Number(p[s.key]) || 0)
      );
    } else {
      columns = (activeStats as RateStatDef[]).map(s =>
        filtered.map(p => s.compute(p))
      );
    }
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const r = i === j ? 1 : pearsonR(columns[i], columns[j]);
        result[i][j] = r;
        result[j][i] = r;
      }
    }
    return result;
  }, [filtered, activeStats, statMode]);

  // Find strongest AND most negative correlations for the insight summary
  const topCorrelations = useMemo(() => {
    const pairs: { stat1: string; stat2: string; r: number }[] = [];
    const n = activeStats.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        pairs.push({
          stat1: activeStats[i].label,
          stat2: activeStats[j].label,
          r: matrix[i][j],
        });
      }
    }
    // Get top 3 positive and top 3 most negative
    const sorted = [...pairs].sort((a, b) => b.r - a.r);
    const topPos = sorted.slice(0, 3);
    const topNeg = sorted.filter(p => p.r < -0.05).sort((a, b) => a.r - b.r).slice(0, 3);
    return [...topPos, ...topNeg];
  }, [matrix, activeStats]);

  const cellSize = 48;
  const labelWidth = 56;
  const matrixWidth = labelWidth + activeStats.length * cellSize;

  // ─── 3D EXTRUSION CONSTANTS ───
  // Matches the Extruded3DBar: 4px offset in both X and Y directions
  // Light source: upper-left → shadows/side faces fall to bottom-right
  const EXTRUDE = 4; // px offset for parallelogram faces

  /**
   * Solid opaque hex colors — crisp like the bar charts.
   * Returns hex string so we can use lighten/darken on it.
   * +1 = deep blue, 0 = neutral surface, -1 = deep red
   */
  function getCellHex(r: number): string {
    const absR = Math.min(Math.abs(r), 1);
    if (absR < 0.02) return isDark ? '#2a2a3e' : '#dddde5';
    if (r > 0) {
      if (isDark) {
        const rv = Math.round(42 - absR * 20);
        const gv = Math.round(42 + absR * 80);
        const bv = Math.round(62 + absR * 180);
        return '#' + [rv,gv,bv].map(c => Math.max(0,Math.min(255,c)).toString(16).padStart(2,'0')).join('');
      } else {
        const rv = Math.round(210 - absR * 175);
        const gv = Math.round(215 - absR * 130);
        const bv = Math.round(235 - absR * 25);
        return '#' + [rv,gv,bv].map(c => Math.max(0,Math.min(255,c)).toString(16).padStart(2,'0')).join('');
      }
    } else {
      if (isDark) {
        const rv = Math.round(42 + absR * 190);
        const gv = Math.round(42 - absR * 15);
        const bv = Math.round(62 - absR * 20);
        return '#' + [rv,gv,bv].map(c => Math.max(0,Math.min(255,c)).toString(16).padStart(2,'0')).join('');
      } else {
        const rv = Math.round(235 - absR * 30);
        const gv = Math.round(215 - absR * 170);
        const bv = Math.round(215 - absR * 170);
        return '#' + [rv,gv,bv].map(c => Math.max(0,Math.min(255,c)).toString(16).padStart(2,'0')).join('');
      }
    }
  }

  /** Lighten a hex color by amount (0-1) */
  function liten(hex: string, amt: number): string {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return '#' + [r,g,b].map(c => Math.min(255, Math.round(c + (255-c)*amt)).toString(16).padStart(2,'0')).join('');
  }
  /** Darken a hex color by amount (0-1) */
  function drken(hex: string, amt: number): string {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return '#' + [r,g,b].map(c => Math.max(0, Math.round(c*(1-amt))).toString(16).padStart(2,'0')).join('');
  }
  /** Hex to rgba */
  function hexA(hex: string, a: number): string {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  /**
   * Get extrusion depth multiplier based on |r|.
   * Scales from 0 (no extrusion at r≈0) to 1 (full EXTRUDE at |r|=1).
   */
  function getExtrudeScale(r: number): number {
    const absR = Math.min(Math.abs(r), 1);
    if (absR < 0.05) return 0;
    return absR;
  }

  return (
    <div>
      {/* Top correlations summary — now includes negative correlations */}
      <div className="mb-4 px-1">
        <p className="text-[10px] text-muted-foreground mb-2" style={{ fontFamily: 'Space Grotesk' }}>
          Strongest correlations{positionFilter !== 'ALL' ? ` (${positionFilter}s only)` : ''} — click any cell to view scatter plot:
        </p>
        <div className="flex flex-wrap gap-2">
          {topCorrelations.map((c, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-md" style={{
              fontFamily: 'JetBrains Mono',
              background: c.r >= 0
                ? (isDark ? 'rgba(59,130,246,0.15)' : 'rgba(30,64,175,0.08)')
                : (isDark ? 'rgba(239,68,68,0.15)' : 'rgba(185,28,28,0.08)'),
              color: c.r >= 0 ? (isDark ? '#60a5fa' : '#1e40af') : (isDark ? '#f87171' : '#b91c1c'),
            }}>
              {c.stat1} × {c.stat2}: <strong>{c.r.toFixed(3)}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Matrix + Vertical Legend side by side */}
      <div className="flex gap-6">
      {/* 3D Matrix grid */}
      <div className="overflow-x-auto pb-6 flex-shrink-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div style={{
          minWidth: matrixWidth,
          perspective: '1000px',
        }}>
          {/* Column labels */}
          <div className="flex" style={{ marginLeft: labelWidth }}>
            {activeStats.map((s, i) => (
              <div key={i} className="text-center" style={{
                width: cellSize,
                fontSize: '8px',
                fontFamily: 'JetBrains Mono',
                color: hoveredCell?.col === i ? (isDark ? '#60a5fa' : '#1e40af') : 'var(--muted-foreground)',
                fontWeight: hoveredCell?.col === i ? 700 : 400,
                transform: 'rotate(-45deg)',
                transformOrigin: 'center',
                height: 48,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: 4,
                transition: 'color 0.15s, font-weight 0.15s',
              }}>
                {s.shortLabel}
              </div>
            ))}
          </div>

          {/* Rows */}
          {activeStats.map((rowStat, row) => (
            <div key={row} className="flex items-center" style={{ height: cellSize + 4 }}>
              {/* Row label */}
              <div className="text-right pr-2 flex-shrink-0" style={{
                width: labelWidth,
                fontSize: '8px',
                fontFamily: 'JetBrains Mono',
                color: hoveredCell?.row === row ? (isDark ? '#60a5fa' : '#1e40af') : 'var(--muted-foreground)',
                fontWeight: hoveredCell?.row === row ? 700 : 400,
                transition: 'color 0.15s, font-weight 0.15s',
              }}>
                {rowStat.shortLabel}
              </div>

              {/* Cells */}
              {activeStats.map((colStat, col) => {
                const r = matrix[row][col];
                const absR = Math.abs(r);
                const isHovered = hoveredCell?.row === row && hoveredCell?.col === col;
                const isHighlighted = hoveredCell?.row === row || hoveredCell?.col === col;
                const isDiagonal = row === col;

                // Uniform cell size — 3D comes from geometric faces, not size
                const S = cellSize - 8; // inner square size
                const baseHex = isDiagonal ? (isDark ? '#3a3a50' : '#c8c8d0') : getCellHex(r);
                const eScale = isDiagonal ? 0.3 : getExtrudeScale(r);
                const eX = Math.round(EXTRUDE * eScale); // right offset
                const eY = Math.round(EXTRUDE * eScale); // down offset

                // Colors derived from base — exactly like Extruded3DBar
                const highlightHex = liten(baseHex, 0.4);
                const sideHex = drken(baseHex, 0.35);
                const sideDarkHex = drken(baseHex, 0.55);
                const bottomHex = drken(baseHex, 0.5);

                // SVG dimensions: front face + extrusion padding
                const svgW = S + eX + 1;
                const svgH = S + eY + 1;

                // Unique gradient ID
                const gid = `cm_${row}_${col}`;

                return (
                  <div
                    key={col}
                    className="flex items-center justify-center cursor-pointer"
                    style={{
                      width: cellSize,
                      height: cellSize + 4,
                      background: isHighlighted && !isDiagonal
                        ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)')
                        : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={() => setHoveredCell({ row, col })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => { if (!isDiagonal) onCellClick(colStat.key, rowStat.key); }}
                    title={`${rowStat.label} × ${colStat.label}: r = ${r.toFixed(3)}`}
                  >
                    {/* SVG-based 3D cell — Extruded3DBar technique */}
                    {/* RAISED (r>=0): front face at origin, right+bottom side faces offset down-right, cast shadow behind */}
                    {/* RECESSED (r<0): front face offset down-right, left+top side faces at origin edges, inset shadow on top-left */}
                    <svg width={svgW} height={svgH} style={{ overflow: 'visible' }}>
                      <defs>
                        {/* Front face gradient — RAISED: lit from top / RECESSED: inverted (dark top, light bottom) */}
                        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                          {r >= 0 ? (
                            <>
                              <stop offset="0%" stopColor={highlightHex} stopOpacity={0.95} />
                              <stop offset="8%" stopColor={liten(baseHex, 0.15)} stopOpacity={0.92} />
                              <stop offset="50%" stopColor={baseHex} stopOpacity={0.88} />
                              <stop offset="92%" stopColor={drken(baseHex, 0.15)} stopOpacity={0.88} />
                              <stop offset="100%" stopColor={drken(baseHex, 0.5)} stopOpacity={0.92} />
                            </>
                          ) : (
                            <>
                              <stop offset="0%" stopColor={drken(baseHex, 0.5)} stopOpacity={0.95} />
                              <stop offset="8%" stopColor={drken(baseHex, 0.25)} stopOpacity={0.92} />
                              <stop offset="50%" stopColor={baseHex} stopOpacity={0.88} />
                              <stop offset="92%" stopColor={liten(baseHex, 0.12)} stopOpacity={0.88} />
                              <stop offset="100%" stopColor={highlightHex} stopOpacity={0.92} />
                            </>
                          )}
                        </linearGradient>
                        {/* Side face gradient */}
                        <linearGradient id={`${gid}_s`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={sideHex} stopOpacity={0.9} />
                          <stop offset="100%" stopColor={sideDarkHex} stopOpacity={0.95} />
                        </linearGradient>
                        {/* Top/bottom side face gradient (vertical) */}
                        <linearGradient id={`${gid}_tb`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={sideHex} stopOpacity={0.9} />
                          <stop offset="100%" stopColor={sideDarkHex} stopOpacity={0.95} />
                        </linearGradient>
                        {/* Shadow blur filter */}
                        <filter id={`${gid}_sh`} x="-30%" y="-15%" width="170%" height="150%">
                          <feGaussianBlur in="SourceGraphic" stdDeviation={eScale > 0.3 ? 3 : 1.5} />
                        </filter>
                      </defs>

                      {r >= 0 ? (
                        /* ═══ RAISED CELL (r >= 0) ═══ */
                        <>
                          {/* Cast shadow — offset behind and below */}
                          {eScale > 0.05 && (
                            <rect
                              x={eX + 2} y={eY + 2} width={S} height={S} rx={2}
                              fill={isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.18)'}
                              filter={`url(#${gid}_sh)`}
                            />
                          )}
                          {/* Right side face (parallelogram) */}
                          {eScale > 0.05 && (
                            <path d={`M${S},0 L${S+eX},${eY} L${S+eX},${S+eY} L${S},${S} Z`}
                              fill={`url(#${gid}_s)`} />
                          )}
                          {/* Bottom face (parallelogram) */}
                          {eScale > 0.05 && (
                            <path d={`M0,${S} L${eX},${S+eY} L${S+eX},${S+eY} L${S},${S} Z`}
                              fill={bottomHex} fillOpacity={0.7} />
                          )}
                          {/* Front face */}
                          <rect x={0} y={0} width={S} height={S} rx={2}
                            fill={`url(#${gid})`} />
                          {/* Top face (lit surface) */}
                          {eScale > 0.05 && (
                            <path d={`M0,0 L${eX},${-eY+1} L${S+eX},${-eY+1} L${S},0 Z`}
                              fill={highlightHex} fillOpacity={0.35} />
                          )}
                          {/* Top highlight line */}
                          {absR > 0.1 && (
                            <rect x={1} y={0} width={S-2} height={Math.min(2, S*0.06)} rx={1}
                              fill={highlightHex} fillOpacity={0.55} />
                          )}
                          {/* Left rim light */}
                          {absR > 0.2 && (
                            <rect x={0} y={2} width={Math.min(1.5, S*0.06)} height={S-4} rx={0.75}
                              fill={highlightHex} fillOpacity={0.2} />
                          )}
                        </>
                      ) : (
                        /* ═══ RECESSED CELL (r < 0) ═══ */
                        /* Front face is pushed DOWN-RIGHT by (eX, eY). */
                        /* Left wall and top wall are visible at the original edges. */
                        <>
                          {/* Inset shadow — dark overlay at top-left of the well */}
                          {eScale > 0.05 && (
                            <rect
                              x={eX} y={eY} width={S} height={S} rx={2}
                              fill={isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.1)'}
                              filter={`url(#${gid}_sh)`}
                            />
                          )}
                          {/* LEFT WALL — parallelogram from top-left edge down to front face */}
                          {eScale > 0.05 && (
                            <path d={`M0,0 L${eX},${eY} L${eX},${S+eY} L0,${S} Z`}
                              fill={`url(#${gid}_s)`} />
                          )}
                          {/* TOP WALL — parallelogram from top edge across to front face */}
                          {eScale > 0.05 && (
                            <path d={`M0,0 L${eX},${eY} L${S+eX},${eY} L${S},0 Z`}
                              fill={`url(#${gid}_tb)`} />
                          )}
                          {/* Front face — offset into the well */}
                          <rect x={eX} y={eY} width={S} height={S} rx={2}
                            fill={`url(#${gid})`} />
                          {/* Bottom highlight line — light catches bottom of recessed surface */}
                          {absR > 0.1 && (
                            <rect x={eX+1} y={eY+S-2} width={S-2} height={Math.min(2, S*0.06)} rx={1}
                              fill={highlightHex} fillOpacity={0.4} />
                          )}
                          {/* Right rim light — light catches right edge of recessed surface */}
                          {absR > 0.2 && (
                            <rect x={eX+S-1.5} y={eY+2} width={Math.min(1.5, S*0.06)} height={S-4} rx={0.75}
                              fill={highlightHex} fillOpacity={0.15} />
                          )}
                        </>
                      )}

                      {/* Hover: show r value */}
                      {isHovered && !isDiagonal && (
                        <text
                          x={S / 2}
                          y={S / 2 + 3}
                          textAnchor="middle"
                          fontSize={7}
                          fontFamily="JetBrains Mono"
                          fontWeight={700}
                          fill={absR > 0.5
                            ? (isDark ? '#fff' : (r > 0 ? '#1e3a8a' : '#7f1d1d'))
                            : (isDark ? '#aaa' : '#666')}
                        >
                          {r.toFixed(2)}
                        </text>
                      )}

                      {/* Hover glow outline */}
                      {isHovered && !isDiagonal && (
                        <rect
                          x={-0.5}
                          y={-0.5}
                          width={S + 1}
                          height={S + 1}
                          rx={2.5}
                          fill="none"
                          stroke={r >= 0 ? 'rgba(59,130,246,0.6)' : 'rgba(239,68,68,0.6)'}
                          strokeWidth={1.5}
                        />
                      )}
                    </svg>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ VERTICAL LEGEND — uniform swatches, depth via elevation only ═══ */}
      <div className="flex-shrink-0 flex flex-col items-center pt-12" style={{ width: 80 }}>
        {/* +1 label at top */}
        <span className="text-[10px] font-bold mb-2" style={{
          fontFamily: 'JetBrains Mono',
          color: isDark ? '#60a5fa' : '#1e3a8a',
        }}>+1</span>
        <span className="text-[8px] mb-1" style={{
          fontFamily: 'Space Grotesk',
          color: isDark ? '#60a5fa' : '#1e3a8a',
        }}>▲ Raised</span>

        {/* Vertical swatch stack: +1 at top, -1 at bottom — SVG-based 3D matching matrix cells */}
        <div className="flex flex-col items-center gap-[3px]" style={{ padding: '4px 0' }}>
          {([1, 0.75, 0.5, 0.25, 0.1, 0, -0.1, -0.25, -0.5, -0.75, -1] as const).map((v, i) => {
            const absV = Math.abs(v);
            const LS = 28; // legend swatch size
            const baseH = v === 0 ? (isDark ? '#3a3a50' : '#c8c8d0') : getCellHex(v);
            const eS = absV < 0.05 ? 0 : absV;
            const leX = Math.round(EXTRUDE * eS);
            const leY = Math.round(EXTRUDE * eS);
            const lHighlight = liten(baseH, 0.4);
            const lSide = drken(baseH, 0.35);
            const lSideDark = drken(baseH, 0.55);
            const lBottom = drken(baseH, 0.5);
            const lsvgW = LS + leX + 1;
            const lsvgH = LS + leY + 1;
            const lgid = `lg_${i}`;

            return (
              <div key={i} className="flex items-center" style={{ height: LS + 6 }}>
                {/* Value label */}
                <span style={{
                  width: 28,
                  fontSize: '7px',
                  fontFamily: 'JetBrains Mono',
                  color: 'var(--muted-foreground)',
                  textAlign: 'right',
                  paddingRight: 4,
                  opacity: absV < 0.05 ? 1 : 0.7,
                  fontWeight: absV < 0.05 ? 600 : 400,
                }}>
                  {v === 0 ? '0' : v > 0 ? `+${v}` : `${v}`}
                </span>

                {/* SVG 3D swatch — raised/recessed matching matrix cells */}
                <svg width={lsvgW} height={lsvgH} style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id={lgid} x1="0" y1="0" x2="0" y2="1">
                      {v >= 0 ? (
                        <>
                          <stop offset="0%" stopColor={lHighlight} stopOpacity={0.95} />
                          <stop offset="8%" stopColor={liten(baseH, 0.15)} stopOpacity={0.92} />
                          <stop offset="50%" stopColor={baseH} stopOpacity={0.88} />
                          <stop offset="92%" stopColor={drken(baseH, 0.15)} stopOpacity={0.88} />
                          <stop offset="100%" stopColor={drken(baseH, 0.5)} stopOpacity={0.92} />
                        </>
                      ) : (
                        <>
                          <stop offset="0%" stopColor={drken(baseH, 0.5)} stopOpacity={0.95} />
                          <stop offset="8%" stopColor={drken(baseH, 0.25)} stopOpacity={0.92} />
                          <stop offset="50%" stopColor={baseH} stopOpacity={0.88} />
                          <stop offset="92%" stopColor={liten(baseH, 0.12)} stopOpacity={0.88} />
                          <stop offset="100%" stopColor={lHighlight} stopOpacity={0.92} />
                        </>
                      )}
                    </linearGradient>
                    <linearGradient id={`${lgid}_s`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={lSide} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={lSideDark} stopOpacity={0.95} />
                    </linearGradient>
                    <linearGradient id={`${lgid}_tb`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lSide} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={lSideDark} stopOpacity={0.95} />
                    </linearGradient>
                    <filter id={`${lgid}_sh`} x="-30%" y="-15%" width="170%" height="150%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation={eS > 0.3 ? 2.5 : 1} />
                    </filter>
                  </defs>

                  {v >= 0 ? (
                    /* ═══ RAISED LEGEND SWATCH ═══ */
                    <>
                      {eS > 0.05 && (
                        <rect x={leX+1} y={leY+1} width={LS} height={LS} rx={2}
                          fill={isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.15)'}
                          filter={`url(#${lgid}_sh)`} />
                      )}
                      {eS > 0.05 && (
                        <path d={`M${LS},0 L${LS+leX},${leY} L${LS+leX},${LS+leY} L${LS},${LS} Z`}
                          fill={`url(#${lgid}_s)`} />
                      )}
                      {eS > 0.05 && (
                        <path d={`M0,${LS} L${leX},${LS+leY} L${LS+leX},${LS+leY} L${LS},${LS} Z`}
                          fill={lBottom} fillOpacity={0.7} />
                      )}
                      <rect x={0} y={0} width={LS} height={LS} rx={2}
                        fill={`url(#${lgid})`} />
                      {eS > 0.05 && (
                        <path d={`M0,0 L${leX},${-leY+1} L${LS+leX},${-leY+1} L${LS},0 Z`}
                          fill={lHighlight} fillOpacity={0.35} />
                      )}
                      {absV > 0.1 && (
                        <rect x={1} y={0} width={LS-2} height={1.5} rx={1}
                          fill={lHighlight} fillOpacity={0.55} />
                      )}
                    </>
                  ) : (
                    /* ═══ RECESSED LEGEND SWATCH ═══ */
                    <>
                      {eS > 0.05 && (
                        <rect x={leX} y={leY} width={LS} height={LS} rx={2}
                          fill={isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'}
                          filter={`url(#${lgid}_sh)`} />
                      )}
                      {eS > 0.05 && (
                        <path d={`M0,0 L${leX},${leY} L${leX},${LS+leY} L0,${LS} Z`}
                          fill={`url(#${lgid}_s)`} />
                      )}
                      {eS > 0.05 && (
                        <path d={`M0,0 L${leX},${leY} L${LS+leX},${leY} L${LS},0 Z`}
                          fill={`url(#${lgid}_tb)`} />
                      )}
                      <rect x={leX} y={leY} width={LS} height={LS} rx={2}
                        fill={`url(#${lgid})`} />
                      {absV > 0.1 && (
                        <rect x={leX+1} y={leY+LS-1.5} width={LS-2} height={1.5} rx={1}
                          fill={lHighlight} fillOpacity={0.4} />
                      )}
                    </>
                  )}
                </svg>
              </div>
            );
          })}
        </div>

        {/* -1 label at bottom */}
        <span className="text-[8px] mt-1" style={{
          fontFamily: 'Space Grotesk',
          color: isDark ? '#f87171' : '#991b1b',
        }}>▼ Recessed</span>
        <span className="text-[10px] font-bold mt-1" style={{
          fontFamily: 'JetBrains Mono',
          color: isDark ? '#f87171' : '#991b1b',
        }}>−1</span>
      </div>
      </div> {/* end flex row */}
    </div>
  );
}

// ═══════════════════════════════════════════
// HYPOTHESIS TEST COMPONENT
// ═══════════════════════════════════════════

interface HypothesisTestProps {
  players: Player[];
  isDark: boolean;
}

interface TestResult {
  title: string;
  groupA: string;
  groupB: string;
  stat: string;
  meanA: number;
  meanB: number;
  t: number;
  p: number;
  significant: boolean;
  interpretation: string;
}

function HypothesisTests({ players, isDark }: HypothesisTestProps) {
  const [testStat, setTestStat] = useState<string>('goals');
  const [groupBy, setGroupBy] = useState<'position' | 'age' | 'salary'>('position');

  const results = useMemo((): TestResult[] => {
    const statKey = testStat as keyof Player;
    const tests: TestResult[] = [];

    if (groupBy === 'position') {
      // Compare each position pair
      const groups: Record<string, number[]> = {};
      POSITIONS.forEach(pos => {
        groups[pos] = players.filter(p => p.position === pos).map(p => Number(p[statKey]) || 0);
      });

      for (let i = 0; i < POSITIONS.length; i++) {
        for (let j = i + 1; j < POSITIONS.length; j++) {
          const a = POSITIONS[i], b = POSITIONS[j];
          if (groups[a].length < 3 || groups[b].length < 3) continue;
          const result = welchTTest(groups[a], groups[b]);
          const statLabel = NUMERIC_STATS.find(s => s.key === statKey)?.label || statKey;
          tests.push({
            title: `${a} vs ${b}`,
            groupA: `${a} (n=${groups[a].length})`,
            groupB: `${b} (n=${groups[b].length})`,
            stat: statLabel,
            meanA: result.meanA,
            meanB: result.meanB,
            t: result.t,
            p: result.p,
            significant: result.p < 0.05,
            interpretation: result.p < 0.001
              ? `Highly significant difference (p < 0.001). ${a}s average ${result.meanA.toFixed(1)} vs ${b}s at ${result.meanB.toFixed(1)}.`
              : result.p < 0.05
              ? `Significant difference (p = ${result.p.toFixed(4)}). ${result.meanA > result.meanB ? a : b}s average higher.`
              : `No significant difference (p = ${result.p.toFixed(3)}). Means are ${result.meanA.toFixed(1)} vs ${result.meanB.toFixed(1)}.`,
          });
        }
      }
    } else if (groupBy === 'age') {
      // Young (≤23) vs Prime (24-29) vs Veteran (30+)
      const groups = {
        'Young (≤23)': players.filter(p => p.age <= 23).map(p => Number(p[statKey]) || 0),
        'Prime (24-29)': players.filter(p => p.age >= 24 && p.age <= 29).map(p => Number(p[statKey]) || 0),
        'Veteran (30+)': players.filter(p => p.age >= 30).map(p => Number(p[statKey]) || 0),
      };
      const labels = Object.keys(groups) as (keyof typeof groups)[];
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i], b = labels[j];
          if (groups[a].length < 3 || groups[b].length < 3) continue;
          const result = welchTTest(groups[a], groups[b]);
          const statLabel = NUMERIC_STATS.find(s => s.key === statKey)?.label || statKey;
          tests.push({
            title: `${a} vs ${b}`,
            groupA: `${a} (n=${groups[a].length})`,
            groupB: `${b} (n=${groups[b].length})`,
            stat: statLabel,
            meanA: result.meanA,
            meanB: result.meanB,
            t: result.t,
            p: result.p,
            significant: result.p < 0.05,
            interpretation: result.p < 0.001
              ? `Highly significant. ${a} averages ${result.meanA.toFixed(1)} vs ${b} at ${result.meanB.toFixed(1)}.`
              : result.p < 0.05
              ? `Significant (p = ${result.p.toFixed(4)}). ${result.meanA > result.meanB ? a : b} averages higher.`
              : `Not significant (p = ${result.p.toFixed(3)}). No meaningful difference between groups.`,
          });
        }
      }
    } else if (groupBy === 'salary') {
      // Low (<$200K) vs Mid ($200K-$1M) vs High (>$1M)
      const groups = {
        'Low (<$200K)': players.filter(p => p.salary > 0 && p.salary < 200000).map(p => Number(p[statKey]) || 0),
        'Mid ($200K-$1M)': players.filter(p => p.salary >= 200000 && p.salary < 1000000).map(p => Number(p[statKey]) || 0),
        'High (>$1M)': players.filter(p => p.salary >= 1000000).map(p => Number(p[statKey]) || 0),
      };
      const labels = Object.keys(groups) as (keyof typeof groups)[];
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i], b = labels[j];
          if (groups[a].length < 3 || groups[b].length < 3) continue;
          const result = welchTTest(groups[a], groups[b]);
          const statLabel = NUMERIC_STATS.find(s => s.key === statKey)?.label || statKey;
          tests.push({
            title: `${a} vs ${b}`,
            groupA: `${a} (n=${groups[a].length})`,
            groupB: `${b} (n=${groups[b].length})`,
            stat: statLabel,
            meanA: result.meanA,
            meanB: result.meanB,
            t: result.t,
            p: result.p,
            significant: result.p < 0.05,
            interpretation: result.p < 0.001
              ? `Highly significant. ${a} averages ${result.meanA.toFixed(1)} vs ${b} at ${result.meanB.toFixed(1)}.`
              : result.p < 0.05
              ? `Significant (p = ${result.p.toFixed(4)}). ${result.meanA > result.meanB ? a : b} averages higher.`
              : `Not significant (p = ${result.p.toFixed(3)}). Salary bracket doesn't predict this stat.`,
          });
        }
      }
    }

    return tests;
  }, [players, testStat, groupBy]);

  const statLabel = NUMERIC_STATS.find(s => s.key === testStat)?.label || testStat;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'Space Grotesk' }}>
            Test:
          </label>
          <select
            value={testStat}
            onChange={e => setTestStat(e.target.value)}
            className="text-[10px] font-semibold rounded-md px-2 py-1 neu-flat"
            style={{
              fontFamily: 'JetBrains Mono',
              background: 'var(--neu-bg-flat)',
              color: 'var(--foreground)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              outline: 'none',
            }}
          >
            {NUMERIC_STATS.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'Space Grotesk' }}>
            Group by:
          </label>
          {(['position', 'age', 'salary'] as const).map(g => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className="text-[10px] px-2 py-1 rounded-md font-semibold uppercase tracking-wider transition-all"
              style={{
                fontFamily: 'Space Grotesk',
                background: groupBy === g ? (isDark ? 'rgba(0,212,255,0.12)' : 'rgba(8,145,178,0.08)') : 'transparent',
                color: groupBy === g ? 'var(--cyan)' : 'var(--muted-foreground)',
                border: `1px solid ${groupBy === g ? (isDark ? 'rgba(0,212,255,0.25)' : 'rgba(8,145,178,0.25)') : 'transparent'}`,
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-2">
        {results.map((test, i) => (
          <motion.div
            key={`${test.title}-${testStat}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-lg p-3"
            style={{
              background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${test.significant
                ? (isDark ? 'rgba(0,212,255,0.15)' : 'rgba(8,145,178,0.12)')
                : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')}`,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold" style={{ fontFamily: 'Space Grotesk', color: 'var(--foreground)' }}>
                {test.title}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{
                  fontFamily: 'JetBrains Mono',
                  background: test.significant
                    ? (isDark ? 'rgba(0,212,255,0.15)' : 'rgba(8,145,178,0.1)')
                    : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                  color: test.significant ? 'var(--cyan)' : 'var(--muted-foreground)',
                }}>
                  p = {test.p < 0.001 ? '<0.001' : test.p.toFixed(4)}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{
                  fontFamily: 'JetBrains Mono',
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  color: 'var(--muted-foreground)',
                }}>
                  t = {test.t.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Visual comparison bar */}
            <div className="flex items-center gap-2 my-2">
              <span className="text-[9px] w-24 text-right" style={{ fontFamily: 'JetBrains Mono', color: 'var(--muted-foreground)' }}>
                {test.groupA}
              </span>
              <div className="flex-1 h-4 rounded-full overflow-hidden" style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              }}>
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${Math.min(100, Math.max(5, (test.meanA / Math.max(test.meanA, test.meanB, 1)) * 100))}%`,
                  background: isDark ? 'rgba(0,180,220,0.5)' : 'rgba(8,145,178,0.4)',
                }} />
              </div>
              <span className="text-[9px] w-12 text-right font-semibold" style={{
                fontFamily: 'JetBrains Mono',
                color: test.meanA >= test.meanB ? 'var(--cyan)' : 'var(--muted-foreground)',
              }}>
                {test.meanA >= 1000 ? `${(test.meanA / 1000).toFixed(0)}K` : test.meanA.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] w-24 text-right" style={{ fontFamily: 'JetBrains Mono', color: 'var(--muted-foreground)' }}>
                {test.groupB}
              </span>
              <div className="flex-1 h-4 rounded-full overflow-hidden" style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              }}>
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${Math.min(100, Math.max(5, (test.meanB / Math.max(test.meanA, test.meanB, 1)) * 100))}%`,
                  background: isDark ? 'rgba(220,100,80,0.5)' : 'rgba(200,80,60,0.4)',
                }} />
              </div>
              <span className="text-[9px] w-12 text-right font-semibold" style={{
                fontFamily: 'JetBrains Mono',
                color: test.meanB >= test.meanA ? 'var(--coral)' : 'var(--muted-foreground)',
              }}>
                {test.meanB >= 1000 ? `${(test.meanB / 1000).toFixed(0)}K` : test.meanB.toFixed(1)}
              </span>
            </div>

            <p className="text-[10px] mt-2" style={{
              fontFamily: 'Space Grotesk',
              color: test.significant ? 'var(--foreground)' : 'var(--muted-foreground)',
            }}>
              {test.interpretation}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// DISTRIBUTION VIEWER COMPONENT
// ═══════════════════════════════════════════

interface DistributionViewerProps {
  players: Player[];
  isDark: boolean;
}

function DistributionViewer({ players, isDark }: DistributionViewerProps) {
  const [selectedStat, setSelectedStat] = useState<string>('goals');
  const [posFilter, setPosFilter] = useState<string>('ALL');

  const data = useMemo(() => {
    const filtered = posFilter === 'ALL' ? players : players.filter(p => p.position === posFilter);
    const values = filtered.map(p => Number(p[selectedStat as keyof Player]) || 0);
    if (values.length < 5) return { bins: [], stats: { mean: 0, median: 0, std: 0, min: 0, max: 0, n: 0 } };

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const range = max - min;
    const binCount = Math.min(25, Math.max(8, Math.ceil(Math.sqrt(values.length))));
    const binWidth = range / binCount || 1;

    const bins: { x: number; count: number; pct: number }[] = [];
    for (let i = 0; i < binCount; i++) {
      const lo = min + i * binWidth;
      const hi = lo + binWidth;
      const count = values.filter(v => i === binCount - 1 ? v >= lo && v <= hi : v >= lo && v < hi).length;
      bins.push({ x: lo + binWidth / 2, count, pct: count / values.length * 100 });
    }

    const m = mean(values);
    const med = sorted[Math.floor(sorted.length / 2)];
    const std = stdDev(values);

    return { bins, stats: { mean: m, median: med, std, min, max, n: values.length } };
  }, [players, selectedStat, posFilter]);

  const maxCount = Math.max(...data.bins.map(b => b.count), 1);
  const statLabel = NUMERIC_STATS.find(s => s.key === selectedStat)?.label || selectedStat;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={selectedStat}
          onChange={e => setSelectedStat(e.target.value)}
          className="text-[10px] font-semibold rounded-md px-2 py-1"
          style={{
            fontFamily: 'JetBrains Mono',
            background: 'var(--neu-bg-flat)',
            color: 'var(--foreground)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            outline: 'none',
          }}
        >
          {NUMERIC_STATS.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {['ALL', ...POSITIONS].map(pos => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className="text-[9px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider transition-all"
              style={{
                fontFamily: 'Space Grotesk',
                background: posFilter === pos ? (isDark ? 'rgba(0,212,255,0.12)' : 'rgba(8,145,178,0.08)') : 'transparent',
                color: posFilter === pos ? 'var(--cyan)' : 'var(--muted-foreground)',
              }}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        {[
          { label: 'Mean', value: data.stats.mean },
          { label: 'Median', value: data.stats.median },
          { label: 'Std Dev', value: data.stats.std },
          { label: 'Min', value: data.stats.min },
          { label: 'Max', value: data.stats.max },
          { label: 'N', value: data.stats.n },
        ].map(s => (
          <div key={s.label} className="text-center p-1.5 rounded-lg" style={{
            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          }}>
            <div className="text-[8px] uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'Space Grotesk' }}>
              {s.label}
            </div>
            <div className="text-xs font-semibold" style={{
              fontFamily: 'JetBrains Mono',
              color: s.label === 'N' ? 'var(--muted-foreground)' : 'var(--cyan)',
            }}>
              {s.label === 'N' ? s.value : (s.value >= 10000 ? `${(s.value / 1000).toFixed(0)}K` : s.value.toFixed(1))}
            </div>
          </div>
        ))}
      </div>

      {/* Histogram */}
      <div className="relative" style={{ height: 180 }}>
        {/* Y axis label */}
        <div className="absolute left-0 top-0 bottom-0 flex items-center">
          <span className="text-[8px] text-muted-foreground -rotate-90" style={{ fontFamily: 'JetBrains Mono' }}>
            Count
          </span>
        </div>

        {/* Bars */}
        <div className="flex items-end gap-[1px] h-full pl-4 pr-1">
          {data.bins.map((bin, i) => {
            const heightPct = (bin.count / maxCount) * 100;
            const isMeanBin = Math.abs(bin.x - data.stats.mean) < (data.bins[1]?.x - data.bins[0]?.x || 1);
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ delay: i * 0.02, duration: 0.3, ease: 'easeOut' }}
                className="flex-1 rounded-t-sm relative group"
                style={{
                  background: isMeanBin
                    ? (isDark ? 'rgba(0,212,255,0.5)' : 'rgba(8,145,178,0.45)')
                    : (isDark ? 'rgba(0,180,220,0.3)' : 'rgba(8,145,178,0.25)'),
                  minWidth: 4,
                }}
                title={`${bin.x.toFixed(1)}: ${bin.count} players (${bin.pct.toFixed(1)}%)`}
              >
                {/* Hover tooltip */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap text-[8px] px-1 py-0.5 rounded" style={{
                  fontFamily: 'JetBrains Mono',
                  background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
                  color: 'var(--foreground)',
                }}>
                  {bin.count}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* X axis */}
        <div className="flex justify-between pl-4 pr-1 mt-1">
          <span className="text-[8px] text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>
            {data.stats.min >= 10000 ? `${(data.stats.min / 1000).toFixed(0)}K` : data.stats.min.toFixed(0)}
          </span>
          <span className="text-[8px] text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>
            {statLabel}
          </span>
          <span className="text-[8px] text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>
            {data.stats.max >= 10000 ? `${(data.stats.max / 1000).toFixed(0)}K` : data.stats.max.toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN STATS PLAYGROUND COMPONENT
// ═══════════════════════════════════════════

interface StatsPlaygroundProps {
  players: Player[];
  onAxisChange?: (xKey: string, yKey: string) => void;
}

export default function StatsPlayground({ players, onAxisChange }: StatsPlaygroundProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'matrix' | 'tests' | 'distribution'>('matrix');
  const [matrixPosFilter, setMatrixPosFilter] = useState('ALL');
  const [statMode, setStatMode] = useState<StatMode>('raw');

  const handleCellClick = useCallback((xKey: string, yKey: string) => {
    if (onAxisChange) {
      onAxisChange(xKey, yKey);
      // Scroll to scatter plot
      const el = document.querySelector('[data-chart="scatter"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [onAxisChange]);

  return (
    <NeuCard delay={0.45} className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-cyan" />
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
            Statistical Playground
          </h3>
          <span className="text-[9px] px-1.5 py-0.5 rounded-md text-muted-foreground" style={{
            fontFamily: 'JetBrains Mono',
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          }}>
            {players.length} players
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all duration-300"
          style={{
            fontFamily: 'Space Grotesk',
            background: isOpen ? (isDark ? 'rgba(0,212,255,0.12)' : 'rgba(8,145,178,0.1)') : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
            color: isOpen ? 'var(--cyan)' : 'var(--table-header-color)',
            border: `1px solid ${isOpen ? (isDark ? 'rgba(0,212,255,0.3)' : 'rgba(8,145,178,0.3)') : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
          }}
        >
          {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {isOpen ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground mb-3" style={{ fontFamily: 'Space Grotesk' }}>
        Explore correlations, run hypothesis tests, and examine stat distributions across the MLS player pool.
      </p>

      {/* Expandable content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {/* Section tabs */}
            <div className="flex gap-1 mb-4 border-b" style={{
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }}>
              {[
                { id: 'matrix' as const, icon: Grid3X3, label: 'Correlation Matrix' },
                { id: 'tests' as const, icon: FlaskConical, label: 'Hypothesis Tests' },
                { id: 'distribution' as const, icon: Activity, label: 'Distributions' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition-all relative"
                  style={{
                    fontFamily: 'Space Grotesk',
                    color: activeSection === tab.id ? 'var(--cyan)' : 'var(--muted-foreground)',
                  }}
                >
                  <tab.icon size={12} />
                  {tab.label}
                  {activeSection === tab.id && (
                    <motion.div
                      layoutId="statsTab"
                      className="absolute bottom-0 left-0 right-0 h-[2px]"
                      style={{ background: 'var(--cyan)' }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Section content */}
            <AnimatePresence mode="wait">
              {activeSection === 'matrix' && (
                <motion.div
                  key="matrix"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Controls: stat mode toggle + position filter */}
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    {/* Stat mode toggle: Raw vs Rate */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'Space Grotesk' }}>
                        Mode:
                      </span>
                      {([{ id: 'raw', label: 'Raw Counts' }, { id: 'rate', label: 'Per 90 Rates' }] as const).map(mode => (
                        <button
                          key={mode.id}
                          onClick={() => setStatMode(mode.id)}
                          className="text-[9px] px-2.5 py-1 rounded-md font-semibold uppercase tracking-wider transition-all"
                          style={{
                            fontFamily: 'Space Grotesk',
                            background: statMode === mode.id
                              ? (isDark ? 'rgba(0,212,255,0.15)' : 'rgba(8,145,178,0.1)')
                              : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                            color: statMode === mode.id ? 'var(--cyan)' : 'var(--muted-foreground)',
                            border: statMode === mode.id
                              ? `1px solid ${isDark ? 'rgba(0,212,255,0.3)' : 'rgba(8,145,178,0.2)'}` 
                              : '1px solid transparent',
                          }}
                        >
                          {mode.label}
                        </button>
                      ))}
                      {statMode === 'rate' && (
                        <span className="text-[8px] text-muted-foreground italic ml-1" style={{ fontFamily: 'JetBrains Mono' }}>
                          min &gt; 200 only
                        </span>
                      )}
                    </div>
                    {/* Position filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'Space Grotesk' }}>
                        Position:
                      </span>
                      {['ALL', ...POSITIONS].map(pos => (
                        <button
                          key={pos}
                          onClick={() => setMatrixPosFilter(pos)}
                          className="text-[9px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider transition-all"
                          style={{
                            fontFamily: 'Space Grotesk',
                            background: matrixPosFilter === pos ? (isDark ? 'rgba(0,212,255,0.12)' : 'rgba(8,145,178,0.08)') : 'transparent',
                            color: matrixPosFilter === pos ? 'var(--cyan)' : 'var(--muted-foreground)',
                          }}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                  <CorrelationMatrix
                    players={players}
                    isDark={isDark}
                    positionFilter={matrixPosFilter}
                    statMode={statMode}
                    onCellClick={handleCellClick}
                  />
                </motion.div>
              )}

              {activeSection === 'tests' && (
                <motion.div
                  key="tests"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <HypothesisTests players={players} isDark={isDark} />
                </motion.div>
              )}

              {activeSection === 'distribution' && (
                <motion.div
                  key="distribution"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <DistributionViewer players={players} isDark={isDark} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </NeuCard>
  );
}
