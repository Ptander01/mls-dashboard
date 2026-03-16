/**
 * RadarTeamCards — 12-card grid of team resilience profiles
 *
 * Each card contains a 5-axis spider/radar chart:
 *   1. Away PPG
 *   2. Congestion Resistance
 *   3. Long-haul Record
 *   4. Squad Depth
 *   5. Age Efficiency
 *
 * Collapsed behind a "View Team Profiles →" button.
 * Uses the matte playdough aesthetic with team-colored radar fills.
 * Cards sorted by resilience score descending (rank 1–12).
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { mutedTeamColor, lighten, darken, hexToRgba } from '@/lib/chartUtils';
import type { TeamResilienceMetrics } from '@/lib/resilienceUtils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface RadarTeamCardsProps {
  metrics: TeamResilienceMetrics[];
}

// ─── Radar axes config ───
const AXES = [
  { key: 'awayPPG', label: 'Away', shortLabel: 'Away' },
  { key: 'congestion', label: 'Congestion', shortLabel: 'Conges' },
  { key: 'longHaul', label: 'Long-haul', shortLabel: 'Long-haul' },
  { key: 'depth', label: 'Depth', shortLabel: 'Depth' },
  { key: 'age', label: 'Age', shortLabel: 'Age' },
] as const;

// ─── Normalize metrics to 0–1 for radar ───
function normalizeForRadar(m: TeamResilienceMetrics): number[] {
  // Away PPG: 0–3 range → 0–1
  const awayPPG = Math.min(1, m.awayPPG / 2.5);
  // Congestion Resistance (squad depth index): already 0–100 → 0–1
  const congestion = m.scoreComponents.congestionResistance / 100;
  // Long-haul Record: already 0–100 → 0–1
  const longHaul = m.scoreComponents.longHaulRecord / 100;
  // Squad Depth: already 0–100 → 0–1
  const depth = m.squadDepthIndex / 100;
  // Age Efficiency: weighted avg age. Lower is better for efficiency.
  // Typical range 23–30. Invert: younger = higher score
  const ageRaw = m.weightedAvgAge;
  const age = Math.max(0, Math.min(1, (30 - ageRaw) / 7));

  return [awayPPG, congestion, longHaul, depth, age];
}

// ─── Single Radar Chart SVG ───
function RadarChart({
  values,
  color,
  isDark,
  size = 140,
}: {
  values: number[];
  color: string;
  isDark: boolean;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 20;
  const n = AXES.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2; // Start from top

  // Concentric rings (0.25, 0.5, 0.75, 1.0)
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Axis endpoints
  const axisPoints = AXES.map((_, i) => {
    const angle = startAngle + i * angleStep;
    return {
      x: cx + Math.cos(angle) * maxR,
      y: cy + Math.sin(angle) * maxR,
      labelX: cx + Math.cos(angle) * (maxR + 14),
      labelY: cy + Math.sin(angle) * (maxR + 14),
    };
  });

  // Data polygon points
  const dataPoints = values.map((v, i) => {
    const angle = startAngle + i * angleStep;
    const r = v * maxR;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const axisLineColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  const labelFill = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Concentric ring polygons */}
      {rings.map(ringVal => {
        const ringPoints = AXES.map((_, i) => {
          const angle = startAngle + i * angleStep;
          const r = ringVal * maxR;
          return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
        }).join(' ');
        return (
          <polygon
            key={ringVal}
            points={ringPoints}
            fill="none"
            stroke={gridColor}
            strokeWidth={0.8}
          />
        );
      })}

      {/* Axis lines */}
      {axisPoints.map((p, i) => (
        <line
          key={`axis-${i}`}
          x1={cx} y1={cy}
          x2={p.x} y2={p.y}
          stroke={axisLineColor}
          strokeWidth={0.8}
        />
      ))}

      {/* Data fill polygon */}
      <path
        d={dataPath}
        fill={hexToRgba(color, isDark ? 0.25 : 0.2)}
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={0.7}
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={`dp-${i}`}
          cx={p.x}
          cy={p.y}
          r={2.5}
          fill={color}
          fillOpacity={0.8}
          stroke={lighten(color, 0.3)}
          strokeWidth={0.8}
        />
      ))}

      {/* Axis labels */}
      {axisPoints.map((p, i) => (
        <text
          key={`label-${i}`}
          x={p.labelX}
          y={p.labelY + 3}
          fill={labelFill}
          fontSize={8.5}
          fontFamily="Space Grotesk"
          fontWeight={500}
          textAnchor="middle"
        >
          {AXES[i].shortLabel}
        </text>
      ))}
    </svg>
  );
}

export default function RadarTeamCards({ metrics }: RadarTeamCardsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isExpanded, setIsExpanded] = useState(false);

  // Top 12 teams by resilience score
  const topTeams = useMemo(() => metrics.slice(0, 12), [metrics]);

  return (
    <div>
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all text-[12px] font-semibold tracking-wider ${
          isExpanded
            ? 'neu-pressed text-cyan'
            : 'neu-raised text-muted-foreground hover:text-foreground'
        }`}
        style={{ fontFamily: 'Space Grotesk' }}
      >
        {isExpanded ? (
          <>Hide Team Profiles <ChevronUp size={14} /></>
        ) : (
          <>View Team Profiles → <ChevronDown size={14} /></>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                  Team Resilience Profiles
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  5-axis radar: Away PPG · Congestion Resistance · Long-haul Record · Squad Depth · Age Efficiency
                </p>
              </div>

              {/* Card grid — responsive: 2 cols mobile, 3 md, 4 lg, up to 5 xl */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {topTeams.map((m, idx) => {
                  const teamColor = mutedTeamColor(m.teamId, isDark);
                  const radarValues = normalizeForRadar(m);

                  return (
                    <motion.div
                      key={m.teamId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 + 0.1, duration: 0.35 }}
                      className="rounded-lg p-3"
                      style={{
                        background: isDark
                          ? 'linear-gradient(145deg, rgba(30,30,45,0.6), rgba(20,20,35,0.8))'
                          : 'linear-gradient(145deg, rgba(240,240,248,0.8), rgba(225,225,235,0.9))',
                        boxShadow: isDark
                          ? '3px 3px 8px rgba(0,0,0,0.4), -2px -2px 6px rgba(60,60,80,0.08)'
                          : '3px 3px 8px rgba(0,0,0,0.08), -2px -2px 6px rgba(255,255,255,0.7)',
                      }}
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: teamColor }}
                          />
                          <span className="text-[11px] font-semibold truncate" style={{ fontFamily: 'Space Grotesk', maxWidth: '100px' }}>
                            {m.teamShort}
                          </span>
                        </div>
                        <span
                          className="text-[11px] font-bold"
                          style={{ fontFamily: 'Space Grotesk', color: 'var(--cyan)' }}
                        >
                          #{idx + 1}
                        </span>
                      </div>

                      {/* Radar chart */}
                      <div className="flex justify-center">
                        <RadarChart
                          values={radarValues}
                          color={teamColor}
                          isDark={isDark}
                          size={140}
                        />
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1 text-[9px] font-mono text-muted-foreground">
                        <div>
                          <span className="text-muted-foreground/60">Away: </span>
                          <span className="font-semibold text-foreground">{m.awayPPG.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground/60">Miles: </span>
                          <span className="font-semibold text-foreground">{(m.totalAwayMiles / 1000).toFixed(0)}k</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground/60">Age: </span>
                          <span className="font-semibold text-foreground">{m.weightedAvgAge.toFixed(1)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground/60">RES: </span>
                          <span className="font-semibold text-foreground">{m.resilienceScore.toFixed(0)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
