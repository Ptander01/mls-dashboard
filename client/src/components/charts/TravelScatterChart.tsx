/**
 * TravelScatterChart — V10 — 3D Torus Rings with Shadow
 *
 * Each team is represented by a 3D torus ring sitting on a flat surface.
 * Ring size = PPG gap magnitude. Strong directional lighting from upper-left
 * casts crisp shadows onto the surface, creating depth and dimension.
 *
 * Design:
 *   - TorusGeometry rings — visible from any camera angle
 *   - Monochromatic cream/plaster material
 *   - Strong directional shadow casting
 *   - Slight camera tilt (10°) for ring visibility
 *   - Orthographic camera — no perspective distortion
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '@/contexts/ThemeContext';
import { linearRegression } from '@/lib/chartUtils';
import type { TeamResilienceMetrics } from '@/lib/resilienceUtils';
import { CardInsightToggle } from '@/components/CardInsight';
import type { CardInsightItem } from '@/components/CardInsight';
import { NeuInsightContainer } from '@/components/NeuInsightContainer';
import { motion, AnimatePresence } from 'framer-motion';

/* Extended insight item with optional team color for bullet matching */
interface TeamInsightItem extends CardInsightItem {
  teamColor?: string;
}

const ACCENT_COLORS: Record<string, string> = {
  cyan: 'var(--cyan)',
  amber: 'var(--amber)',
  emerald: 'var(--emerald)',
  coral: 'var(--coral)',
};

/** Custom insight section that uses team color for bullets when available */
function TeamInsightSection({ isOpen, insights, isDark }: {
  isOpen: boolean;
  insights: TeamInsightItem[];
  isDark: boolean;
}) {
  if (insights.length === 0) return null;

  return (
    <div className="px-3 pb-1 pt-1">
      <NeuInsightContainer
        isOpen={isOpen}
        isDark={isDark}
        variant="compact"
        showDepression={isOpen}
      >
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              key="card-insights"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-1.5"
            >
              {insights.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 + 0.15, duration: 0.2 }}
                  className="flex items-start gap-2"
                >
                  <span
                    className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[5px]"
                    style={{ background: item.teamColor || ACCENT_COLORS[item.accent] }}
                  />
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{
                      fontFamily: 'Space Grotesk, sans-serif',
                      color: 'var(--foreground)',
                    }}
                  >
                    {item.text}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </NeuInsightContainer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & TYPES
   ═══════════════════════════════════════════════════════════ */

type ConferenceFilter = 'ALL' | 'EAST' | 'WEST';

interface TravelScatterChartProps {
  metrics: TeamResilienceMetrics[];
}

const ABBREV: Record<string, string> = {
  'Atlanta Utd': 'ATL', 'Austin FC': 'AUS', 'CF Montréal': 'MTL',
  'Charlotte FC': 'CLT', 'Chicago Fire': 'CHI', 'Colorado Rapids': 'COL',
  'Columbus Crew': 'CLB', 'D.C. United': 'DC', 'FC Cincinnati': 'CIN',
  'FC Dallas': 'DAL', 'Houston Dynamo': 'HOU', 'Inter Miami': 'MIA',
  'LA Galaxy': 'LAG', 'LAFC': 'LAFC', 'Minnesota Utd': 'MIN',
  'Nashville SC': 'NSH', 'NE Revolution': 'NE', 'NY Red Bulls': 'NYR',
  'NYCFC': 'NYC', 'Orlando City': 'ORL', 'Philadelphia Union': 'PHI',
  'Portland Timbers': 'POR', 'Real Salt Lake': 'RSL', 'San Diego FC': 'SD',
  'Seattle Sounders': 'SEA', 'SJ Earthquakes': 'SJ', 'Sporting KC': 'SKC',
  'St. Louis City': 'STL', 'Toronto FC': 'TOR', "Vancouver W'caps": 'VAN',
};

function abbrev(name: string): string {
  return ABBREV[name] || name.slice(0, 3).toUpperCase();
}

const WORLD_W = 39;
const WORLD_H = 27;

/* ═══════════════════════════════════════════════════════════
   HEADLINE GENERATOR
   ═══════════════════════════════════════════════════════════ */

const ACCENT_CYCLE: Array<'cyan' | 'amber' | 'emerald' | 'coral'> = ['cyan', 'emerald', 'amber', 'coral'];

function generateInsights(metrics: TeamResilienceMetrics[]): TeamInsightItem[] {
  if (metrics.length < 5) return [{ text: 'Not enough data to analyze travel-performance patterns.', accent: 'cyan' }];

  const items: TeamInsightItem[] = [];
  const pts = metrics.map(m => ({ x: m.totalAwayMiles, y: m.ppgGap }));
  const reg = linearRegression(pts);

  // Helper to find team color
  const tc = (name: string) => metrics.find(m => m.teamShort === name)?.teamColor;

  // 1. Correlation summary (league-wide, no specific team)
  const r2Str = reg.r2.toFixed(2);
  if (Math.abs(reg.r2) < 0.1) {
    items.push({ text: `No clear travel penalty league-wide (R² = ${r2Str}). Travel distance alone does not predict home advantage.`, accent: 'cyan' });
  } else {
    const dir = reg.slope > 0 ? 'increases' : 'decreases';
    const strength = Math.abs(reg.r2) > 0.3 ? 'moderate' : 'weak';
    items.push({ text: `Home advantage ${dir} with travel distance (R² = ${r2Str}, ${strength} correlation).`, accent: 'cyan' });
  }

  // 2. Biggest home advantage
  const byGap = [...metrics].sort((a, b) => b.ppgGap - a.ppgGap);
  const biggest = byGap[0];
  items.push({ text: `${biggest.teamShort} has the largest home advantage gap at +${biggest.ppgGap.toFixed(2)} PPG (${biggest.homePPG.toFixed(2)} home vs ${biggest.awayPPG.toFixed(2)} away).`, accent: 'emerald', teamColor: tc(biggest.teamShort) });

  // 3. Worst home advantage (or best away)
  const worst = byGap[byGap.length - 1];
  if (worst.ppgGap < 0) {
    items.push({ text: `${worst.teamShort} actually performs better away (${worst.ppgGap.toFixed(2)} PPG gap) — a reverse home advantage.`, accent: 'coral', teamColor: tc(worst.teamShort) });
  } else {
    items.push({ text: `${worst.teamShort} has the smallest home advantage at +${worst.ppgGap.toFixed(2)} PPG.`, accent: 'amber', teamColor: tc(worst.teamShort) });
  }

  // 4. Overperformer (positive residual — better than regression predicts)
  const withResiduals = metrics.map(m => ({
    ...m, residual: m.ppgGap - (reg.slope * m.totalAwayMiles + reg.intercept),
  }));
  const overperformer = [...withResiduals].sort((a, b) => b.residual - a.residual)[0];
  items.push({ text: `${overperformer.teamShort} outperforms expectations given their ${(overperformer.totalAwayMiles / 1000).toFixed(0)}k travel miles — the most travel-resilient team.`, accent: 'emerald', teamColor: tc(overperformer.teamShort) });

  // 5. Underperformer (negative residual)
  const underperformer = [...withResiduals].sort((a, b) => a.residual - b.residual)[0];
  items.push({ text: `${underperformer.teamShort} underperforms relative to their ${(underperformer.totalAwayMiles / 1000).toFixed(0)}k travel load — most travel-sensitive.`, accent: 'coral', teamColor: tc(underperformer.teamShort) });

  // 6. Most traveled
  const mostTraveled = [...metrics].sort((a, b) => b.totalAwayMiles - a.totalAwayMiles)[0];
  items.push({ text: `${mostTraveled.teamShort} logs the most away miles at ${(mostTraveled.totalAwayMiles / 1000).toFixed(1)}k — PPG gap of ${mostTraveled.ppgGap >= 0 ? '+' : ''}${mostTraveled.ppgGap.toFixed(2)}.`, accent: 'amber', teamColor: tc(mostTraveled.teamShort) });

  // 7. Conference split (league-wide, no specific team)
  const east = metrics.filter(m => m.conference === 'Eastern');
  const west = metrics.filter(m => m.conference === 'Western');
  if (east.length > 2 && west.length > 2) {
    const avgEastMiles = east.reduce((s, m) => s + m.totalAwayMiles, 0) / east.length;
    const avgWestMiles = west.reduce((s, m) => s + m.totalAwayMiles, 0) / west.length;
    const avgEastGap = east.reduce((s, m) => s + m.ppgGap, 0) / east.length;
    const avgWestGap = west.reduce((s, m) => s + m.ppgGap, 0) / west.length;
    items.push({ text: `Western teams average ${(avgWestMiles / 1000).toFixed(1)}k miles vs Eastern ${(avgEastMiles / 1000).toFixed(1)}k. Home advantage: East +${avgEastGap.toFixed(2)} PPG, West +${avgWestGap.toFixed(2)} PPG.`, accent: 'cyan' });
  }

  return items;
}

/* ═══════════════════════════════════════════════════════════
   3D RING COMPONENT
   ═══════════════════════════════════════════════════════════ */

function Ring({ position, ringRadius, tubeRadius, label, isDark, teamColor, showColor, tooltip }: {
  position: [number, number, number];
  ringRadius: number;
  tubeRadius: number;
  label: string;
  isDark: boolean;
  teamColor: string;
  showColor: boolean;
  tooltip: TooltipData;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Wall height proportional to ring size for shadow casting
  const wallHeight = ringRadius * 0.25 + 0.06;
  const wallThickness = tubeRadius;

  // Outer cylinder
  const outerGeo = useMemo(
    () => new THREE.CylinderGeometry(ringRadius + wallThickness, ringRadius + wallThickness, wallHeight, 64, 1, true),
    [ringRadius, wallThickness, wallHeight]
  );
  // Inner cylinder (slightly smaller radius, same height)
  const innerGeo = useMemo(
    () => new THREE.CylinderGeometry(ringRadius, ringRadius, wallHeight, 64, 1, true),
    [ringRadius, wallHeight]
  );
  // Top ring face (annular disc)
  const topGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, ringRadius + wallThickness, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, ringRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geo = new THREE.ShapeGeometry(shape, 64);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [ringRadius, wallThickness]);

  // Subtle hover scale
  useFrame(() => {
    if (meshRef.current) {
      const target = hovered ? 1.06 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
    }
  });

  // White monochrome default; team color when toggled
  const monoColor = isDark ? '#e8e6e2' : '#f5f3f0';
  const materialColor = showColor ? teamColor : monoColor;

  return (
    <group position={position}>
      {/* Cylindrical wall sitting on the surface */}
      <group
        ref={meshRef}
        position={[0, wallHeight / 2, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        {/* Outer wall */}
        <mesh geometry={outerGeo} castShadow receiveShadow>
          <meshStandardMaterial color={materialColor} roughness={0.92} metalness={0.02} side={THREE.DoubleSide} />
        </mesh>
        {/* Inner wall */}
        <mesh geometry={innerGeo} castShadow receiveShadow>
          <meshStandardMaterial color={materialColor} roughness={0.92} metalness={0.02} side={THREE.DoubleSide} />
        </mesh>
        {/* Top cap (annular ring) */}
        <mesh geometry={topGeo} position={[0, wallHeight / 2, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={materialColor} roughness={0.92} metalness={0.02} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Team label above ring */}
      <Html
        position={[0, 0.3, -(ringRadius + tubeRadius + 0.3)]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          fontSize: '9px',
          fontWeight: 700,
          fontFamily: 'Space Grotesk, sans-serif',
          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,55,50,0.55)',
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
          textShadow: isDark ? 'none' : '0 1px 2px rgba(255,255,255,0.8)',
        }}>
          {label}
        </div>
      </Html>

      {/* Rich tooltip on hover */}
      {hovered && (
        <Html
          position={[0, 2.2, 0]}
          center
          style={{ pointerEvents: 'none', zIndex: 1000 }}
        >
          <div style={{
            fontFamily: 'Space Grotesk, sans-serif',
            color: isDark ? '#e8e8e8' : '#2a2a2a',
            background: isDark ? 'rgba(20,20,35,0.92)' : 'rgba(255,255,255,0.96)',
            padding: '10px 14px',
            borderRadius: '8px',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            minWidth: '180px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, paddingBottom: '5px' }}>
              <span style={{ color: showColor ? teamColor : (isDark ? '#7ec8c8' : '#5aafaf') }}>●</span>{' '}
              {tooltip.teamName}
              <span style={{ fontSize: '9px', fontWeight: 500, marginLeft: '6px', opacity: 0.5 }}>{tooltip.conference}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px', fontSize: '10px' }}>
              <div style={{ opacity: 0.55, fontSize: '9px' }}>AWAY MILES</div>
              <div style={{ fontWeight: 600, textAlign: 'right' }}>{(tooltip.totalAwayMiles / 1000).toFixed(1)}k</div>
              <div style={{ opacity: 0.55, fontSize: '9px' }}>PPG GAP</div>
              <div style={{ fontWeight: 600, textAlign: 'right', color: tooltip.ppgGap > 0 ? (isDark ? '#7ec8c8' : '#2a9a8a') : (isDark ? '#e88' : '#c44') }}>
                {tooltip.ppgGap >= 0 ? '+' : ''}{tooltip.ppgGap.toFixed(2)}
              </div>
              <div style={{ opacity: 0.55, fontSize: '9px' }}>HOME PPG</div>
              <div style={{ fontWeight: 600, textAlign: 'right' }}>{tooltip.homePPG.toFixed(2)}</div>
              <div style={{ opacity: 0.55, fontSize: '9px' }}>AWAY PPG</div>
              <div style={{ fontWeight: 600, textAlign: 'right' }}>{tooltip.awayPPG.toFixed(2)}</div>
              <div style={{ opacity: 0.55, fontSize: '9px' }}>HOME WIN%</div>
              <div style={{ fontWeight: 600, textAlign: 'right' }}>{(tooltip.homeWinPct * 100).toFixed(0)}%</div>
              <div style={{ opacity: 0.55, fontSize: '9px' }}>AWAY WIN%</div>
              <div style={{ fontWeight: 600, textAlign: 'right' }}>{(tooltip.awayWinPct * 100).toFixed(0)}%</div>
              <div style={{ opacity: 0.55, fontSize: '9px' }}>LONGEST TRIP</div>
              <div style={{ fontWeight: 600, textAlign: 'right' }}>{(tooltip.longestTripMiles / 1000).toFixed(1)}k mi</div>
              <div style={{ opacity: 0.55, fontSize: '9px' }}>RESILIENCE</div>
              <div style={{ fontWeight: 600, textAlign: 'right' }}>{tooltip.resilienceScore.toFixed(0)}/100</div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   SURFACE PLANE — receives shadows
   ═══════════════════════════════════════════════════════════ */

function SurfacePlane({ width, height, color }: {
  width: number; height: number; color: string;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color={color}
        roughness={0.95}
        metalness={0}
      />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════════
   GRID LINES
   ═══════════════════════════════════════════════════════════ */

function GridLines({ xTicks, yTicks, xScale, yScale, worldW, worldH, isDark }: {
  xTicks: number[];
  yTicks: number[];
  xScale: (v: number) => number;
  yScale: (v: number) => number;
  worldW: number;
  worldH: number;
  isDark: boolean;
}) {
  const hh = worldH / 2;
  const hw = worldW / 2;

  const lines = useMemo(() => {
    const pts: THREE.Vector3[][] = [];
    for (const t of xTicks) {
      const x = xScale(t);
      pts.push([new THREE.Vector3(x, 0.005, -hh), new THREE.Vector3(x, 0.005, hh)]);
    }
    for (const t of yTicks) {
      const z = yScale(t);
      pts.push([new THREE.Vector3(-hw, 0.005, z), new THREE.Vector3(hw, 0.005, z)]);
    }
    return pts;
  }, [xTicks, yTicks, xScale, yScale, hh, hw]);

  return (
    <group>
      {lines.map((pair, i) => {
        const geo = new THREE.BufferGeometry().setFromPoints(pair);
        return (
          <line key={i} geometry={geo}>
            <lineBasicMaterial
              color={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
              transparent
              opacity={0.06}
            />
          </line>
        );
      })}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   REGRESSION DOTTED PATH
   ═══════════════════════════════════════════════════════════ */

function RegressionPath({ regression, xExtent, xScale, yScale, isDark }: {
  regression: { slope: number; intercept: number; r2: number } | null;
  xExtent: { min: number; max: number };
  xScale: (v: number) => number;
  yScale: (v: number) => number;
  isDark: boolean;
}) {
  if (!regression) return null;

  const spheres = useMemo(() => {
    const count = 40;
    const result: { pos: [number, number, number] }[] = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const dataX = xExtent.min + t * (xExtent.max - xExtent.min);
      const dataY = regression.slope * dataX + regression.intercept;
      const wx = xScale(dataX);
      const wz = yScale(dataY);
      result.push({ pos: [wx, 0.08, wz] });
    }
    return result;
  }, [regression, xExtent, xScale, yScale]);

  return (
    <group>
      {spheres.map((s, i) => (
        <mesh key={i} position={s.pos}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial
            color={isDark ? '#7ec8c8' : '#5aafaf'}
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   AXIS LABELS
   ═══════════════════════════════════════════════════════════ */

function AxisLabels({ xTicks, yTicks, xScale, yScale, worldW, worldH, isDark }: {
  xTicks: number[];
  yTicks: number[];
  xScale: (v: number) => number;
  yScale: (v: number) => number;
  worldW: number;
  worldH: number;
  isDark: boolean;
}) {
  const hh = worldH / 2;
  const hw = worldW / 2;
  const color = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(60,55,50,0.45)';
  const style: React.CSSProperties = {
    fontSize: '9px',
    fontWeight: 600,
    fontFamily: 'Space Grotesk, sans-serif',
    color,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  };

  return (
    <group>
      {xTicks.map(t => (
        <Html key={`x-${t}`} position={[xScale(t), 0, hh + 0.6]} center style={{ pointerEvents: 'none' }}>
          <div style={style}>{t >= 1000 ? `${(t / 1000).toFixed(0)}k` : t}</div>
        </Html>
      ))}
      {yTicks.map(t => (
        <Html key={`y-${t}`} position={[-hw - 0.6, 0, yScale(t)]} center style={{ pointerEvents: 'none' }}>
          <div style={style}>{t.toFixed(2)}</div>
        </Html>
      ))}
      <Html position={[0, 0, hh + 1.6]} center style={{ pointerEvents: 'none' }}>
        <div style={{ ...style, fontSize: '11px', fontWeight: 700 }}>
          Total Away Miles Traveled
        </div>
      </Html>
      <Html position={[-hw - 2.2, 0, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{ ...style, fontSize: '11px', fontWeight: 700, transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
          Home Advantage (PPG Delta)
        </div>
      </Html>

      {/* 3D Ghost interpretation hints — extruded text on the surface */}
      <group position={[0, 0.02, 0]}>
        {/* "More travel →" — bottom-right of plot */}
        <Text
          position={[hw - 4, 0.15, hh - 1.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.38}
          letterSpacing={0.12}
          color={isDark ? '#555566' : '#b8b4ae'}
          anchorX="center"
          anchorY="middle"
          castShadow
        >
          MORE TRAVEL
           <meshStandardMaterial
             color={isDark ? '#666677' : '#a8a4a0'}
            roughness={0.95}
            metalness={0.02}
          />
        </Text>

        {/* "↑ STRONGER HOME EDGE" — upper-left of plot */}
        <Text
          position={[-hw + 4, 0.15, -hh + 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.35}
          letterSpacing={0.12}
          color={isDark ? '#555566' : '#b8b4ae'}
          anchorX="center"
          anchorY="middle"
          castShadow
        >
          STRONGER HOME EDGE
           <meshStandardMaterial
             color={isDark ? '#666677' : '#a8a4a0'}
            roughness={0.95}
            metalness={0.02}
          />
        </Text>

        {/* "BETTER AWAY ↓" — lower-left of plot */}
        <Text
          position={[-hw + 3.5, 0.15, hh - 1.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.35}
          letterSpacing={0.12}
          color={isDark ? '#555566' : '#b8b4ae'}
          anchorX="center"
          anchorY="middle"
          castShadow
        >
          BETTER AWAY
           <meshStandardMaterial
             color={isDark ? '#666677' : '#a8a4a0'}
            roughness={0.95}
            metalness={0.02}
          />
        </Text>
      </group>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   R² LABEL
   ═══════════════════════════════════════════════════════════ */

function R2Label({ regression, xExtent, xScale, yScale, isDark }: {
  regression: { slope: number; intercept: number; r2: number } | null;
  xExtent: { min: number; max: number };
  xScale: (v: number) => number;
  yScale: (v: number) => number;
  isDark: boolean;
}) {
  if (!regression) return null;
  const endX = xExtent.max;
  const endY = regression.slope * endX + regression.intercept;
  const wx = xScale(endX);
  const wz = yScale(endY);

  return (
    <Html position={[wx - 0.8, 0.2, wz - 0.6]} center style={{ pointerEvents: 'none' }}>
      <div style={{
        fontSize: '10px',
        fontWeight: 600,
        fontFamily: 'Space Grotesk, sans-serif',
        color: isDark ? 'rgba(0,212,255,0.5)' : 'rgba(0,160,200,0.45)',
        whiteSpace: 'nowrap',
        background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)',
        padding: '2px 6px',
        borderRadius: '4px',
      }}>
        R² = {regression.r2.toFixed(2)}
      </div>
    </Html>
  );
}

/* ═══════════════════════════════════════════════════════════
   CAMERA — Orthographic with slight tilt for ring visibility
   ═══════════════════════════════════════════════════════════ */

function CameraSetup() {
  const { camera, size } = useThree();

  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      const aspect = size.width / size.height;
      const viewH = WORLD_H * 0.58;
      const viewW = viewH * aspect;

      camera.left = -viewW;
      camera.right = viewW;
      camera.top = viewH;
      camera.bottom = -viewH;
      camera.near = 0.1;
      camera.far = 300;

      // Slight tilt from top-down — ~10° forward tilt
      // This lets us see the ring tubes and their shadows
      // Position: high up, slightly behind (positive Z offset)
      camera.position.set(0, 80, 14);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
  }, [camera, size]);

  return null;
}

/* ═══════════════════════════════════════════════════════════
   MAIN 3D SCENE
   ═══════════════════════════════════════════════════════════ */

interface TooltipData {
  teamName: string;
  conference: string;
  totalAwayMiles: number;
  ppgGap: number;
  homePPG: number;
  awayPPG: number;
  homeWinPct: number;
  awayWinPct: number;
  longestTripMiles: number;
  awayGamesCount: number;
  resilienceScore: number;
}

interface RingData {
  teamId: string;
  label: string;
  wx: number;
  wz: number;
  ringRadius: number;
  tubeRadius: number;
  teamColor: string;
  tooltip: TooltipData;
}

function ScatterScene({ rings, xTicks, yTicks, xScale, yScale, regression, xExtent, isDark, showColor, showInsights }: {
  rings: RingData[];
  xTicks: number[];
  yTicks: number[];
  xScale: (v: number) => number;
  yScale: (v: number) => number;
  regression: { slope: number; intercept: number; r2: number } | null;
  xExtent: { min: number; max: number };
  isDark: boolean;
  showColor: boolean;
  showInsights: boolean;
}) {
  const surfaceColor = isDark ? '#3a3a50' : '#ffffff';

  return (
    <>
      <CameraSetup />

      {/* ── Lighting ──
          Strong key light from upper-left for crisp shadow casting.
          Low ambient for high shadow contrast. */}

      {/* Ambient — low for shadow contrast */}
      <ambientLight intensity={isDark ? 0.25 : 0.55} />

      {/* Hemisphere — subtle warm/cool */}
      <hemisphereLight
        args={[
          isDark ? '#4a4a6a' : '#f5f2ed',
          isDark ? '#2a2a3a' : '#d4d0ca',
          isDark ? 0.15 : 0.2,
        ]}
      />

      {/* Key light — upper-left, strong, casts shadows */}
      <directionalLight
        position={[-40, 50, -30]}
        intensity={isDark ? 1.8 : 1.2}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
        shadow-bias={-0.0003}
        shadow-radius={2}
      />

      {/* Fill light — opposite side, soft, no shadows */}
      <directionalLight
        position={[30, 20, 25]}
        intensity={isDark ? 0.15 : 0.3}
      />

      {/* Surface plane — receives shadows */}
      <SurfacePlane
        width={WORLD_W + 6}
        height={WORLD_H + 6}
        color={surfaceColor}
      />

      {/* Torus rings — sorted by Z for proper overlap */}
      {[...rings]
        .sort((a, b) => a.wz - b.wz)
        .map(r => (
          <Ring
            key={r.teamId}
            position={[r.wx, 0, r.wz]}
            ringRadius={r.ringRadius}
            tubeRadius={r.tubeRadius}
            label={r.label}
            isDark={isDark}
            teamColor={r.teamColor}
            showColor={showColor}
            tooltip={r.tooltip}
          />
        ))}

      {/* Grid lines */}
      <GridLines
        xTicks={xTicks}
        yTicks={yTicks}
        xScale={xScale}
        yScale={yScale}
        worldW={WORLD_W}
        worldH={WORLD_H}
        isDark={isDark}
      />

      {/* Regression trend — only shown when insights are open */}
      {showInsights && (
        <RegressionPath
          regression={regression}
          xExtent={xExtent}
          xScale={xScale}
          yScale={yScale}
          isDark={isDark}
        />
      )}

      {/* Axis labels */}
      <AxisLabels
        xTicks={xTicks}
        yTicks={yTicks}
        xScale={xScale}
        yScale={yScale}
        worldW={WORLD_W}
        worldH={WORLD_H}
        isDark={isDark}
      />

      {/* R² label — only shown when insights are open */}
      {showInsights && (
        <R2Label
          regression={regression}
          xExtent={xExtent}
          xScale={xScale}
          yScale={yScale}
          isDark={isDark}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function TravelScatterChart({ metrics }: TravelScatterChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [conference, setConference] = useState<ConferenceFilter>('ALL');
  const [showColor, setShowColor] = useState(false);

  const filtered = useMemo(() => {
    if (conference === 'ALL') return metrics;
    const conf = conference === 'EAST' ? 'Eastern' : 'Western';
    return metrics.filter(m => m.conference === conf);
  }, [metrics, conference]);

  const insights = useMemo(() => generateInsights(filtered), [filtered]);
  const [showInsights, setShowInsights] = useState(false);

  // Data extents
  const xExtent = useMemo(() => {
    if (filtered.length === 0) return { min: 15000, max: 45000 };
    const vals = filtered.map(m => m.totalAwayMiles);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.12 || 5000;
    return { min: min - pad, max: max + pad };
  }, [filtered]);

  const yExtent = useMemo(() => {
    if (filtered.length === 0) return { min: -0.5, max: 1.5 };
    const vals = filtered.map(m => m.ppgGap);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.15 || 0.3;
    return { min: min - pad, max: max + pad };
  }, [filtered]);

  const gapExtent = useMemo(() => {
    if (filtered.length === 0) return { min: 0, max: 1 };
    const vals = filtered.map(m => Math.abs(m.ppgGap));
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [filtered]);

  const hw = WORLD_W / 2;
  const hh = WORLD_H / 2;

  const xScale = useCallback((val: number) => {
    return -hw + ((val - xExtent.min) / (xExtent.max - xExtent.min)) * WORLD_W;
  }, [xExtent, hw]);

  const yScale = useCallback((val: number) => {
    return hh - ((val - yExtent.min) / (yExtent.max - yExtent.min)) * WORLD_H;
  }, [yExtent, hh]);

  const ringRadiusScale = useCallback((gap: number) => {
    const range = gapExtent.max - gapExtent.min || 1;
    const t = (Math.abs(gap) - gapExtent.min) / range;
    // Ring major radius: 0.4 to 1.8 (sqrt for area perception)
    return 0.4 + Math.sqrt(t) * 1.4;
  }, [gapExtent]);

  const tubeRadiusScale = useCallback((gap: number) => {
    const ringR = ringRadiusScale(gap);
    // Thin tube — wire-like raised edge, not chunky tube
    return ringR * 0.04 + 0.015;
  }, [ringRadiusScale]);

  // Build ring data
  const rings: RingData[] = useMemo(() => {
    return filtered.map(m => ({
      teamId: m.teamId,
      label: abbrev(m.teamShort),
      wx: xScale(m.totalAwayMiles),
      wz: yScale(m.ppgGap),
      ringRadius: ringRadiusScale(m.ppgGap),
      tubeRadius: tubeRadiusScale(m.ppgGap),
      teamColor: m.teamColor,
      tooltip: {
        teamName: m.teamShort,
        conference: m.conference,
        totalAwayMiles: m.totalAwayMiles,
        ppgGap: m.ppgGap,
        homePPG: m.homePPG,
        awayPPG: m.awayPPG,
        homeWinPct: m.homeWinPct,
        awayWinPct: m.awayWinPct,
        longestTripMiles: m.longestTripMiles,
        awayGamesCount: m.awayGamesCount,
        resilienceScore: m.resilienceScore,
      },
    }));
  }, [filtered, xScale, yScale, ringRadiusScale, tubeRadiusScale]);

  // Regression
  const regression = useMemo(() => {
    if (filtered.length < 3) return null;
    const pts = filtered.map(m => ({ x: m.totalAwayMiles, y: m.ppgGap }));
    return linearRegression(pts);
  }, [filtered]);

  // Axis ticks
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

  const labelColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
  const regressionColor = isDark ? 'rgba(0,212,255,0.3)' : 'rgba(0,160,200,0.25)';
  const bgColor = isDark ? '#1c1c2e' : '#ffffff';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
            Travel Burden vs Away Performance Drop
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Each impression represents a team pressed into the surface. Crater size = PPG gap magnitude.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          {/* Insights lightbulb toggle */}
          <CardInsightToggle
            isOpen={showInsights}
            onToggle={() => setShowInsights(v => !v)}
            isDark={isDark}
          />
          {/* Conference filter */}
          <div className="flex items-center gap-0">
            {(['ALL', 'EAST', 'WEST'] as ConferenceFilter[]).map((c, i) => (
              <button key={c}
                onClick={(e) => { e.stopPropagation(); setConference(c); }}
                className={`text-[10px] px-3 py-1.5 font-semibold tracking-wider transition-all cursor-pointer select-none ${
                  conference === c ? 'neu-pressed text-cyan' : 'neu-raised text-muted-foreground hover:text-foreground'
                } ${i === 0 ? 'rounded-l-lg' : i === 2 ? 'rounded-r-lg' : ''}`}
                style={{ fontFamily: 'Space Grotesk', minWidth: 40, minHeight: 28 }}
              >{c}</button>
            ))}
          </div>
          {/* Color toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowColor(prev => !prev); }}
            className={`text-[10px] px-3 py-1.5 font-semibold tracking-wider transition-all cursor-pointer select-none rounded-lg ${
              showColor ? 'neu-pressed text-cyan' : 'neu-raised text-muted-foreground hover:text-foreground'
            }`}
            style={{ fontFamily: 'Space Grotesk', minWidth: 40, minHeight: 28 }}
            title={showColor ? 'Hide team colors' : 'Show team colors'}
          >COLOR</button>
        </div>
      </div>

      {/* AI-Powered Insights — custom section with team-colored bullets */}
      <TeamInsightSection
        isOpen={showInsights}
        insights={insights}
        isDark={isDark}
      />

      {/* 3D Canvas */}
      <div className="w-full rounded-lg overflow-hidden" style={{
        height: '930px',
        background: bgColor,
      }}>
        <Canvas
          orthographic
          shadows
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 2]}
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={[bgColor]} />

          <ScatterScene
            rings={rings}
            xTicks={xTicks}
            yTicks={yTicks}
            xScale={xScale}
            yScale={yScale}
            regression={regression}
            xExtent={xExtent}
            isDark={isDark}
            showColor={showColor}
            showInsights={showInsights}
          />
        </Canvas>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-[10px] text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2">
          <div style={{ width: 28, height: 28 }}>
            <Canvas
              orthographic
              shadows
              gl={{ antialias: true, alpha: true }}
              dpr={[1, 2]}
              camera={{ position: [0, 5, 1.5], zoom: 6 }}
              style={{ width: '100%', height: '100%', background: 'transparent' }}
            >
              <ambientLight intensity={0.4} />
              <directionalLight position={[-3, 5, -2]} intensity={1.2} castShadow />
              <group position={[0, 0.15, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[1.1, 1.1, 0.3, 32, 1, true]} />
                  <meshStandardMaterial color={isDark ? '#e8e6e2' : '#d8d5d0'} roughness={0.92} metalness={0.02} side={THREE.DoubleSide} />
                </mesh>
                <mesh castShadow>
                  <cylinderGeometry args={[0.9, 0.9, 0.3, 32, 1, true]} />
                  <meshStandardMaterial color={isDark ? '#e8e6e2' : '#d8d5d0'} roughness={0.92} metalness={0.02} side={THREE.DoubleSide} />
                </mesh>
              </group>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[4, 4]} />
                <meshStandardMaterial color={isDark ? '#3a3a50' : '#ffffff'} roughness={0.95} metalness={0} />
              </mesh>
            </Canvas>
          </div>
          <span>Larger impression = bigger PPG gap</span>
        </div>
        {showInsights && (
          <div className="flex items-center gap-2">
            <svg width="28" height="6" viewBox="0 0 28 6">
              {[0, 7, 14, 21].map(x => (
                <circle key={x} cx={x + 3} cy={3} r={1.2} fill={regressionColor} />
              ))}
            </svg>
            <span>Dotted path = regression trend</span>
          </div>
        )}
      </div>
    </div>
  );
}
