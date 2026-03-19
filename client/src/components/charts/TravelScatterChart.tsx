/**
 * TravelScatterChart — V11 — Scatter Plot Polish Sprint
 *
 * Fixes:
 *   - #62: Solid invisible hit-area disc inside each ring for reliable tooltip hover.
 *          Win% math corrected (already 0-100 from resilienceUtils, no double-multiply).
 *          Multi-ring overlap: tooltip picks closest ring centroid to pointer.
 *   - #61: Ghost hint text updated with specific wording, Y-axis hints rotated 90°,
 *          extruded 3D block geometry with shadow casting, positioned to avoid data corners.
 *   - #63: Insights engine integration — colored cluster region overlays on canvas
 *          (inspired by Nicolas Cage scatter grouping), quadrant-based team grouping,
 *          and a summarized insight banner rendered directly on the 3D canvas.
 */

import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
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
   CLUSTER / QUADRANT GROUPING (Issue #63)
   ═══════════════════════════════════════════════════════════ */

interface ClusterGroup {
  id: string;
  label: string;
  fillColor: string;    // fill color for the region
  labelColor: string;   // darker text color for the label
  // Quadrant bounds in world coordinates
  x1: number; z1: number;  // top-left corner
  x2: number; z2: number;  // bottom-right corner
  // Label position (corner)
  labelX: number;
  labelZ: number;
  teams: TeamResilienceMetrics[];
}

function computeClusterGroups(
  metrics: TeamResilienceMetrics[],
  xScale: (v: number) => number,
  yScale: (v: number) => number,
): ClusterGroup[] {
  if (metrics.length < 5) return [];

  // Compute medians for quadrant splitting
  const sortedMiles = [...metrics].map(m => m.totalAwayMiles).sort((a, b) => a - b);
  const sortedGap = [...metrics].map(m => m.ppgGap).sort((a, b) => a - b);
  const medianMiles = sortedMiles[Math.floor(sortedMiles.length / 2)];
  const medianGap = sortedGap[Math.floor(sortedGap.length / 2)];

  // World-space split point
  const splitX = xScale(medianMiles);
  const splitZ = yScale(medianGap);

  const hw = WORLD_W / 2;
  const hh = WORLD_H / 2;
  const pad = 0.5; // small gap between quadrants so they don't touch

  // Quadrant definitions — non-overlapping rectangles with labels in their respective corners
  const quadrants: {
    id: string; label: string; fillColor: string; labelColor: string;
    x1: number; z1: number; x2: number; z2: number;
    labelX: number; labelZ: number;
    filter: (m: TeamResilienceMetrics) => boolean;
  }[] = [
    {
      id: 'fortress',
      label: 'Fortress Teams',
      fillColor: '#2e8b57',       // sea green
      labelColor: '#1a6b3d',      // darker green
      x1: -hw, z1: -hh,          // top-left of chart
      x2: splitX - pad, z2: splitZ - pad,
      labelX: -hw + 1.5, labelZ: -hh + 1.2,  // top-left corner
      filter: m => m.totalAwayMiles <= medianMiles && m.ppgGap >= medianGap,
    },
    {
      id: 'road-warriors',
      label: 'Road Warriors',
      fillColor: '#0096c8',       // blue
      labelColor: '#006a96',      // darker blue
      x1: splitX + pad, z1: -hh,  // top-right of chart
      x2: hw, z2: splitZ - pad,
      labelX: hw - 1.5, labelZ: -hh + 1.2,   // top-right corner
      filter: m => m.totalAwayMiles > medianMiles && m.ppgGap >= medianGap,
    },
    {
      id: 'steady-locals',
      label: 'Steady Locals',
      fillColor: '#b4a03c',       // olive/amber
      labelColor: '#8a7a20',      // darker amber
      x1: -hw, z1: splitZ + pad,  // bottom-left of chart
      x2: splitX - pad, z2: hh,
      labelX: -hw + 1.5, labelZ: hh - 1.2,   // bottom-left corner
      filter: m => m.totalAwayMiles <= medianMiles && m.ppgGap < medianGap,
    },
    {
      id: 'fragile-travelers',
      label: 'Fragile Travelers',
      fillColor: '#c8503c',       // coral/red
      labelColor: '#a03020',      // darker red
      x1: splitX + pad, z1: splitZ + pad,  // bottom-right of chart
      x2: hw, z2: hh,
      labelX: hw - 1.5, labelZ: hh - 1.2,  // bottom-right corner
      filter: m => m.totalAwayMiles > medianMiles && m.ppgGap < medianGap,
    },
  ];

  return quadrants
    .map(q => {
      const teams = metrics.filter(q.filter);
      if (teams.length === 0) return null;
      return {
        id: q.id,
        label: q.label,
        fillColor: q.fillColor,
        labelColor: q.labelColor,
        x1: q.x1, z1: q.z1,
        x2: q.x2, z2: q.z2,
        labelX: q.labelX,
        labelZ: q.labelZ,
        teams,
      } as ClusterGroup;
    })
    .filter(Boolean) as ClusterGroup[];
}

/* Cluster region — non-overlapping rounded rectangle quadrant on the surface */
function ClusterBlob({ group, isDark }: { group: ClusterGroup; isDark: boolean }) {
  const geo = useMemo(() => {
    const w = group.x2 - group.x1;
    const h = group.z2 - group.z1;
    const r = Math.min(1.2, Math.min(w, h) * 0.08); // corner radius
    const shape = new THREE.Shape();
    // Rounded rectangle
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const g = new THREE.ShapeGeometry(shape, 32);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [group.x1, group.z1, group.x2, group.z2]);

  const cx = (group.x1 + group.x2) / 2;
  const cz = (group.z1 + group.z2) / 2;

  return (
    <group position={[cx, 0.006, cz]}>
      {/* Filled rounded rectangle */}
      <mesh geometry={geo}>
        <meshBasicMaterial
          color={group.fillColor}
          transparent
          opacity={isDark ? 0.10 : 0.07}
          depthWrite={false}
        />
      </mesh>
      {/* Label in the respective corner */}
      <Html
        position={[group.labelX - cx, 0.1, group.labelZ - cz]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          fontSize: '11px',
          fontWeight: 800,
          fontFamily: 'Space Grotesk, sans-serif',
          color: group.labelColor,
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          opacity: 0.75,
        }}>
          {group.label}
        </div>
      </Html>
    </group>
  );
}

/* Summary insight banner rendered on the 3D canvas */
function InsightBanner({ metrics, isDark, worldW, worldH }: {
  metrics: TeamResilienceMetrics[];
  isDark: boolean;
  worldW: number;
  worldH: number;
}) {
  const summary = useMemo(() => {
    if (metrics.length < 5) return null;

    const sortedMiles = [...metrics].map(m => m.totalAwayMiles).sort((a, b) => a - b);
    const sortedGap = [...metrics].map(m => m.ppgGap).sort((a, b) => a - b);
    const medianMiles = sortedMiles[Math.floor(sortedMiles.length / 2)];
    const medianGap = sortedGap[Math.floor(sortedGap.length / 2)];

    const highTravelResilient = metrics.filter(m => m.totalAwayMiles > medianMiles && m.ppgGap >= medianGap);
    const lowTravelFragile = metrics.filter(m => m.totalAwayMiles <= medianMiles && m.ppgGap < medianGap);

    const pts = metrics.map(m => ({ x: m.totalAwayMiles, y: m.ppgGap }));
    const reg = linearRegression(pts);

    let text = '';
    if (highTravelResilient.length > 0 && lowTravelFragile.length > 0) {
      text = `${highTravelResilient.length} team${highTravelResilient.length > 1 ? 's' : ''} thrive despite heavy travel (Road Warriors) while ${lowTravelFragile.length} struggle even with short trips (Steady Locals). R² = ${reg.r2.toFixed(2)}`;
    } else {
      text = `Travel burden shows ${reg.r2 < 0.1 ? 'no clear' : reg.r2 < 0.3 ? 'a weak' : 'a moderate'} link to home advantage (R² = ${reg.r2.toFixed(2)})`;
    }
    return text;
  }, [metrics]);

  if (!summary) return null;

  return (
    <Html
      position={[0, 0.3, -(worldH / 2) - 2.6]}
      center
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '11px',
        fontWeight: 600,
        color: isDark ? 'rgba(200,220,255,0.7)' : 'rgba(40,40,60,0.6)',
        background: isDark ? 'rgba(20,20,40,0.5)' : 'rgba(255,255,255,0.6)',
        padding: '6px 14px',
        borderRadius: '6px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
        whiteSpace: 'nowrap',
        maxWidth: '600px',
        textAlign: 'center',
        letterSpacing: '0.02em',
      }}>
        {summary}
      </div>
    </Html>
  );
}

/* ═══════════════════════════════════════════════════════════
   3D RING COMPONENT (Issue #62 — solid hit area + math fix)
   ═══════════════════════════════════════════════════════════ */

function Ring({ position, ringRadius, tubeRadius, label, isDark, teamColor, showColor, tooltip, teamId, hoveredTeam, onHoverTeam, active = true }: {
  position: [number, number, number];
  ringRadius: number;
  tubeRadius: number;
  label: string;
  isDark: boolean;
  teamColor: string;
  showColor: boolean;
  tooltip: TooltipData;
  teamId: string;
  hoveredTeam: string | null;
  onHoverTeam: (id: string | null) => void;
  active?: boolean;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);
  const hovered = active && hoveredTeam === teamId;
  const dimmed = hoveredTeam !== null && hoveredTeam !== teamId;

  // Conference exit animation state
  const exitProgress = useRef(active ? 1 : 0); // 1 = fully visible, 0 = fully exited
  const [labelVisible, setLabelVisible] = useState(active);

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

  // ── Issue #62: Invisible solid hit-area disc covering the entire ring interior ──
  const hitAreaGeo = useMemo(() => {
    const geo = new THREE.CircleGeometry(ringRadius + wallThickness + 0.15, 64);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [ringRadius, wallThickness]);

  // Invisible material for hit-area disc — renders nothing visually but still raycasted
  const hitMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,    // prevents any pixel output
      side: THREE.DoubleSide,
    });
    return m;
  }, []);

  // Hover scale + dim + shadow toggle + conference exit animation
  useFrame(() => {
    // Conference exit/enter animation
    const exitTarget = active ? 1 : 0;
    exitProgress.current += (exitTarget - exitProgress.current) * 0.08;
    const ep = exitProgress.current;

    // Animate the outer group position (sink into surface) and visibility
    if (groupRef.current) {
      // Sink: Y goes from 0 (visible) to -0.8 (sunk below surface)
      groupRef.current.position.y = position[1] + (ep - 1) * 0.8;
      groupRef.current.visible = ep > 0.01;
    }

    // Sync label visibility with exit progress (hide label when ring is mostly gone)
    const shouldShowLabel = ep > 0.3;
    if (shouldShowLabel !== labelVisible) setLabelVisible(shouldShowLabel);

    if (meshRef.current) {
      // Hover scale: 1.08 when hovered, normal otherwise
      const targetScale = hovered ? 1.08 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.14);

      // Opacity: combine dim + exit
      const dimTarget = dimmed ? 0.18 : 1;
      const combinedOpacity = dimTarget * ep;

      meshRef.current.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.material && mesh.material !== hitMat && 'opacity' in mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.opacity += (combinedOpacity - mat.opacity) * 0.15;
        }
        // Toggle shadow casting: only the hovered ring casts shadows when any ring is hovered
        if (mesh.isMesh && mesh.material !== hitMat) {
          mesh.castShadow = dimmed ? false : true;
        }
      });
    }
  });

  // White monochrome default; team color when toggled
  const monoColor = isDark ? '#e8e6e2' : '#f5f3f0';
  const materialColor = showColor ? teamColor : monoColor;

  return (
    <group ref={groupRef} position={position}>
      {/* Cylindrical wall sitting on the surface */}
      <group
        ref={meshRef}
        position={[0, wallHeight / 2, 0]}
        onPointerOver={(e) => { if (!active) return; e.stopPropagation(); onHoverTeam(teamId); }}
        onPointerOut={() => { if (!active) return; onHoverTeam(null); }}
      >
        {/* ── Issue #62: Invisible solid hit-area disc — visible=false but still raycasted ── */}
        <mesh geometry={hitAreaGeo} position={[0, wallHeight / 2 + 0.01, 0]} material={hitMat} />
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
          fontWeight: hovered ? 800 : 700,
          fontFamily: 'Space Grotesk, sans-serif',
          color: hovered
            ? (isDark ? 'rgba(255,255,255,0.95)' : 'rgba(30,30,30,0.95)')
            : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,55,50,0.55)'),
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
          textShadow: isDark ? 'none' : '0 1px 2px rgba(255,255,255,0.8)',
          opacity: !labelVisible ? 0 : dimmed ? 0.15 : 1,
          transition: 'opacity 0.3s ease, color 0.2s ease',
        }}>
          {label}
        </div>
      </Html>

      {/* Rich tooltip on hover — Issue #62: math validated, positioned adjacent to ring */}
      {hovered && (
        <Html
          position={[ringRadius + tubeRadius + 1.5, 1.2, 0]}
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
              {/* ── Issue #62 FIX: homeWinPct/awayWinPct are already 0-100 from resilienceUtils ── */}
              <div style={{ opacity: 0.55, fontSize: '9px' }}>HOME WIN%</div>
              <div style={{ fontWeight: 600, textAlign: 'right' }}>{tooltip.homeWinPct.toFixed(0)}%</div>
              <div style={{ opacity: 0.55, fontSize: '9px' }}>AWAY WIN%</div>
              <div style={{ fontWeight: 600, textAlign: 'right' }}>{tooltip.awayWinPct.toFixed(0)}%</div>
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
          // @ts-expect-error R3F line primitive uses geometry prop
          <line key={i} geometry={geo}>
            <lineBasicMaterial
              color={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}
              transparent
              opacity={0.03}
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
   AXIS LABELS + GHOST HINTS (Issue #61 — 3D block typography)
   ═══════════════════════════════════════════════════════════ */

/** 3D ghost hint text — subtle embossed lettering on the surface */
function GhostTextBlock({ text, position, rotation, fontSize, isDark, letterSpacing = 0.08 }: {
  text: string;
  position: [number, number, number];
  rotation: [number, number, number];
  fontSize: number;
  isDark: boolean;
  letterSpacing?: number;
}) {
  // Text color with enough contrast to be legible but still "ghost-like"
  const textColor = isDark ? '#7a7a98' : '#a09a90';

  return (
    <group position={position}>
      <Text
        rotation={rotation}
        fontSize={fontSize}
        letterSpacing={letterSpacing}
        color={textColor}
        anchorX="center"
        anchorY="middle"
      >
        {text}
        <meshBasicMaterial color={textColor} />
      </Text>
    </group>
  );
}

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

      {/* ═══ Issue #61: 3D Ghost interpretation hints ═══
          - X-axis hints: horizontal, positioned along bottom edge
          - Y-axis hints: rotated 90° to read vertically along the axis
          - All positioned away from data corners to avoid collision
          - Extruded block geometry with shadow casting */}
      <group position={[0, 0.04, 0]}>
        {/* X-axis hint: "MORE MILES >>" — bottom-center-right, horizontal */}
        <GhostTextBlock
          text="MORE  MILES  >>"
          position={[hw - 5, 0.15, hh - 0.8]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.38}
          isDark={isDark}
          letterSpacing={0.12}
        />

        {/* X-axis hint: "<< FEWER MILES" — bottom-center-left, horizontal */}
        <GhostTextBlock
          text="<<  FEWER  MILES"
          position={[-hw + 5, 0.15, hh - 0.8]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.38}
          isDark={isDark}
          letterSpacing={0.12}
        />

        {/* Y-axis hint: "STRONGER HOME EDGE ^" — left side top, rotated 90° to read vertically */}
        <GhostTextBlock
          text="STRONGER  HOME  EDGE  ^^"
          position={[-hw + 1.2, 0.15, -hh + 5]}
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          fontSize={0.34}
          isDark={isDark}
          letterSpacing={0.10}
        />

        {/* Y-axis hint: "WEAKER HOME EDGE v" — left side bottom, rotated 90° */}
        <GhostTextBlock
          text="WEAKER  HOME  EDGE  vv"
          position={[-hw + 1.2, 0.15, hh - 5]}
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          fontSize={0.34}
          isDark={isDark}
          letterSpacing={0.10}
        />
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
  conference: 'Eastern' | 'Western';
}

function ScatterScene({ rings, xTicks, yTicks, xScale, yScale, regression, xExtent, isDark, showColor, showInsights, metrics, conference }: {
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
  metrics: TeamResilienceMetrics[];
  conference: ConferenceFilter;
}) {
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
  // Surface color matches bgColor exactly to eliminate visible boundary
  const surfaceColor = isDark ? '#1e1e2e' : '#e9ebef';

  // Issue #63: Compute cluster groups
  const clusterGroups = useMemo(() => {
    if (!showInsights) return [];
    return computeClusterGroups(metrics, xScale, yScale);
  }, [showInsights, metrics, xScale, yScale]);

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
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
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

      {/* Surface plane — receives shadows, oversized to fill entire canvas */}
      <SurfacePlane
        width={WORLD_W + 20}
        height={WORLD_H + 20}
        color={surfaceColor}
      />

      {/* Issue #63: Cluster region blobs — rendered below rings */}
      {clusterGroups.map(g => (
        <ClusterBlob key={g.id} group={g} isDark={isDark} />
      ))}

      {/* Torus rings — sorted by Z for proper overlap */}
      {[...rings]
        .sort((a, b) => a.wz - b.wz)
        .map(r => {
          const isActive = conference === 'ALL'
            || (conference === 'EAST' && r.conference === 'Eastern')
            || (conference === 'WEST' && r.conference === 'Western');
          return (
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
              teamId={r.teamId}
              hoveredTeam={hoveredTeam}
              onHoverTeam={setHoveredTeam}
              active={isActive}
            />
          );
        })}

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

      {/* Issue #63: Insight summary banner on canvas */}
      {showInsights && (
        <InsightBanner
          metrics={metrics}
          isDark={isDark}
          worldW={WORLD_W}
          worldH={WORLD_H}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT COMPONENT
   ═══════════════════════════════════════════════════════════ */

function TravelScatterChartInner({ metrics }: TravelScatterChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [conference, setConference] = useState<ConferenceFilter>('ALL');
  const [showColor, setShowColor] = useState(false);

  // Delayed conference: used for axis extents so they don't jump before rings exit
  // `conference` changes immediately (for Ring active prop), `delayedConference` follows after 700ms
  const [delayedConference, setDelayedConference] = useState<ConferenceFilter>('ALL');
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleConferenceChange = useCallback((c: ConferenceFilter) => {
    setConference(c); // immediate — triggers Ring exit animations
    // Clear any pending delay
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    // Delay the axis zoom by 700ms to let exit animation play first
    delayTimerRef.current = setTimeout(() => {
      setDelayedConference(c);
    }, 700);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (delayTimerRef.current) clearTimeout(delayTimerRef.current); };
  }, []);

  // Axis extents use delayedConference so they change AFTER the exit animation
  const axisFiltered = useMemo(() => {
    if (delayedConference === 'ALL') return metrics;
    const conf = delayedConference === 'EAST' ? 'Eastern' : 'Western';
    return metrics.filter(m => m.conference === conf);
  }, [metrics, delayedConference]);

  // Insights still use the immediate conference for responsiveness
  const filtered = useMemo(() => {
    if (conference === 'ALL') return metrics;
    const conf = conference === 'EAST' ? 'Eastern' : 'Western';
    return metrics.filter(m => m.conference === conf);
  }, [metrics, conference]);

  const insights = useMemo(() => generateInsights(filtered), [filtered]);
  const [showInsights, setShowInsights] = useState(false);

  // Target extents — computed instantly from delayed-filtered data
  const xExtentTarget = useMemo(() => {
    if (axisFiltered.length === 0) return { min: 15000, max: 45000 };
    const vals = axisFiltered.map(m => m.totalAwayMiles);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.12 || 5000;
    return { min: min - pad, max: max + pad };
  }, [axisFiltered]);

  const yExtentTarget = useMemo(() => {
    if (axisFiltered.length === 0) return { min: -0.5, max: 1.5 };
    const vals = axisFiltered.map(m => m.ppgGap);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.15 || 0.3;
    return { min: min - pad, max: max + pad };
  }, [axisFiltered]);

  const gapExtentTarget = useMemo(() => {
    if (axisFiltered.length === 0) return { min: 0, max: 1 };
    const vals = axisFiltered.map(m => Math.abs(m.ppgGap));
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [axisFiltered]);

  // Animated extents — smoothly lerp from current to target over ~1s
  const [xExtent, setXExtent] = useState(xExtentTarget);
  const [yExtent, setYExtent] = useState(yExtentTarget);
  const [gapExtent, setGapExtent] = useState(gapExtentTarget);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Animate from current extent to target extent
    const startX = { ...xExtent };
    const startY = { ...yExtent };
    const startGap = { ...gapExtent };
    const duration = 1000; // 1 second smooth transition
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      // Ease-out cubic for smooth deceleration
      const rawT = Math.min(elapsed / duration, 1);
      const t = 1 - Math.pow(1 - rawT, 3);

      setXExtent({
        min: startX.min + (xExtentTarget.min - startX.min) * t,
        max: startX.max + (xExtentTarget.max - startX.max) * t,
      });
      setYExtent({
        min: startY.min + (yExtentTarget.min - startY.min) * t,
        max: startY.max + (yExtentTarget.max - startY.max) * t,
      });
      setGapExtent({
        min: startGap.min + (gapExtentTarget.min - startGap.min) * t,
        max: startGap.max + (gapExtentTarget.max - startGap.max) * t,
      });

      if (rawT < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xExtentTarget, yExtentTarget, gapExtentTarget]);

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

  // Build ring data — always from ALL metrics so exiting rings can animate out
  const rings: RingData[] = useMemo(() => {
    return metrics.map(m => ({
      teamId: m.teamId,
      label: abbrev(m.teamShort),
      wx: xScale(m.totalAwayMiles),
      wz: yScale(m.ppgGap),
      ringRadius: ringRadiusScale(m.ppgGap),
      tubeRadius: tubeRadiusScale(m.ppgGap),
      teamColor: m.teamColor,
      conference: m.conference as 'Eastern' | 'Western',
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
  }, [metrics, xScale, yScale, ringRadiusScale, tubeRadiusScale]);

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
  // Match the page background exactly: oklch(0.94 0.005 260) = #e9ebef light, oklch(0.13 0.01 280) dark
  const bgColor = isDark ? '#1e1e2e' : '#e9ebef';

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
            Travel Burden vs Away Performance Drop
          </h3>
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
                  onClick={(e) => { e.stopPropagation(); handleConferenceChange(c); }}
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
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Does flying more miles hurt a team's away form? This chart plots each MLS team's <strong className="text-foreground/80">total away miles traveled</strong> (X-axis) against their <strong className="text-foreground/80">home advantage gap</strong> — the difference between home and away points-per-game (Y-axis). Higher on the chart means a bigger drop-off when playing on the road. Each ring is a team — larger rings indicate a wider PPG gap. Hover any ring for detailed splits (Home/Away PPG, Win%, longest trip). The dashed trend line shows the league-wide correlation; R² measures how much travel alone explains the gap. Toggle the lightbulb for AI-powered quadrant analysis.
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1 leading-relaxed italic">
          Note: Correlation does not imply causation. Roster depth, schedule congestion, altitude, and opponent strength also affect away performance. Western Conference teams typically log more miles due to geography.
        </p>
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
            metrics={filtered}
            conference={conference}
          />
        </Canvas>
      </div>

      {/* Legend — graduated ring sizes */}
      <div className="flex items-center justify-center gap-6 mt-3 text-[10px] text-muted-foreground flex-wrap">
        {/* Graduated size legend */}
        <div className="flex items-center gap-1.5">
          <span className="mr-1" style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '9px', opacity: 0.6 }}>PPG GAP:</span>
          {[0.1, 0.3, 0.6, 1.0, 1.5].map((gap, i) => {
            // Mirror the ringRadiusScale: 0.4 + sqrt(t) * 1.4
            const range = gapExtent.max - gapExtent.min || 1;
            const t = (gap - gapExtent.min) / range;
            const clampedT = Math.max(0, Math.min(1, t));
            const r = 0.4 + Math.sqrt(clampedT) * 1.4;
            // Scale to pixel size: ring radius 0.4-1.8 -> 6px-22px diameter
            const pxDiameter = Math.round(6 + (r - 0.4) / 1.4 * 20);
            return (
              <div key={i} className="flex flex-col items-center" style={{ minWidth: pxDiameter + 6 }}>
                <svg width={pxDiameter + 4} height={pxDiameter + 4} viewBox={`0 0 ${pxDiameter + 4} ${pxDiameter + 4}`}>
                  <circle
                    cx={(pxDiameter + 4) / 2}
                    cy={(pxDiameter + 4) / 2}
                    r={pxDiameter / 2}
                    fill="none"
                    stroke={isDark ? '#aaa' : '#999'}
                    strokeWidth={1.2}
                    opacity={0.5}
                  />
                </svg>
                <span style={{ fontSize: '7px', opacity: 0.5, marginTop: '1px' }}>{gap.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
        {showInsights && (
          <>
            <div className="flex items-center gap-2">
              <svg width="28" height="6" viewBox="0 0 28 6">
                {[0, 7, 14, 21].map(x => (
                  <circle key={x} cx={x + 3} cy={3} r={1.2} fill={regressionColor} />
                ))}
              </svg>
              <span>Dotted path = regression trend</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(46,139,87,0.15)', border: '1px solid rgba(46,139,87,0.3)' }} />
              <span>Shaded regions = team clusters</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const TravelScatterChart = memo(TravelScatterChartInner, (prev, next) =>
  prev.metrics === next.metrics
);
export default TravelScatterChart;
