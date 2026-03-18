/**
 * TravelScatterChart — V6 — Smooth 3D Relief Craters
 *
 * True 3D craters using Three.js (React Three Fiber):
 *   - Smooth parabolic bowl geometry via LatheGeometry
 *   - Subtle sinusoidal ring grooves (not staircase terraces)
 *   - Orthographic camera — top-down relief sculpture view
 *   - Soft directional shadows with shadow-radius blur
 *   - Ultra-matte plaster/clay material (roughness 0.97)
 *   - Flat surface plane (no ExtrudeGeometry holes — simpler, no gap issues)
 *   - HTML overlays for labels, axes, legend via @react-three/drei Html
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '@/contexts/ThemeContext';
import { linearRegression } from '@/lib/chartUtils';
import type { TeamResilienceMetrics } from '@/lib/resilienceUtils';

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

// World-space dimensions for the scatter plot area
const WORLD_W = 26;
const WORLD_H = 18;

// Plaster/clay palette
const LIGHT_SURFACE = '#e5e1dc';
const LIGHT_CRATER = '#e5e1dc'; // Same color — depth comes from shadows only
const DARK_SURFACE = '#3a3a50';
const DARK_CRATER = '#3a3a50';

/* ═══════════════════════════════════════════════════════════
   HEADLINE GENERATOR
   ═══════════════════════════════════════════════════════════ */

function generateHeadline(metrics: TeamResilienceMetrics[]): string {
  if (metrics.length < 5) return 'Not enough data to analyze travel-performance patterns.';
  const pts = metrics.map(m => ({ x: m.totalAwayMiles, y: m.ppgGap }));
  const reg = linearRegression(pts);
  const biggestGap = [...metrics].sort((a, b) => b.ppgGap - a.ppgGap)[0];
  const withResiduals = metrics.map(m => ({
    ...m, residual: m.ppgGap - (reg.slope * m.totalAwayMiles + reg.intercept),
  }));
  const overperformer = [...withResiduals].sort((a, b) => b.residual - a.residual)[0];
  if (Math.abs(reg.r2) < 0.1) {
    return `No clear travel penalty league-wide (R² = ${reg.r2.toFixed(2)}) — but ${biggestGap.teamShort} shows the largest home advantage gap (${biggestGap.ppgGap.toFixed(2)} PPG). ${overperformer.teamShort} outperforms expectations given their ${(overperformer.totalAwayMiles / 1000).toFixed(0)}k travel miles.`;
  }
  const direction = reg.slope > 0 ? 'increases' : 'decreases';
  return `Home advantage ${direction} with travel distance (R² = ${reg.r2.toFixed(2)}). ${overperformer.teamShort} defies the trend.`;
}

/* ═══════════════════════════════════════════════════════════
   SMOOTH CRATER BOWL GEOMETRY
   Parabolic bowl with subtle sinusoidal ring grooves
   ═══════════════════════════════════════════════════════════ */

function createCraterGeometry(radius: number, depth: number, ringCount: number): THREE.LatheGeometry {
  const segments = 64; // High segment count for smooth curve
  const clampedDepth = Math.min(depth, radius * 0.4); // Prevent punch-through
  const points: THREE.Vector2[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments; // 0 = center, 1 = edge
    const x = t * radius;

    // Smooth parabolic bowl: deepest at center, rising to surface at edge
    const bowl = Math.pow(t, 2);
    let y = -clampedDepth * (1 - bowl);

    // Subtle ring grooves — sinusoidal undulations on the bowl surface
    // Amplitude is small relative to depth, creating visible-but-subtle ridges
    if (t > 0.05 && t < 0.88 && ringCount > 0) {
      const grooveFreq = ringCount;
      const grooveAmplitude = clampedDepth * 0.04; // 4% of depth — subtle
      const groovePhase = t * grooveFreq * Math.PI * 2;
      y += Math.sin(groovePhase) * grooveAmplitude * (1 - Math.pow(2 * t - 1, 4));
    }

    // Subtle rim bump at the edge
    const rimBump = Math.exp(-Math.pow((t - 0.92) / 0.05, 2)) * clampedDepth * 0.06;
    y += rimBump;

    points.push(new THREE.Vector2(x, y));
  }

  // End flat at surface level, slightly beyond radius for seamless blending
  points.push(new THREE.Vector2(radius * 1.03, 0));

  const geo = new THREE.LatheGeometry(points, 48); // 48 radial segments
  geo.computeVertexNormals();
  return geo;
}

/* ═══════════════════════════════════════════════════════════
   3D SCENE COMPONENTS
   ═══════════════════════════════════════════════════════════ */

// Individual crater bowl
function Crater({ position, radius, depth, ringCount, color }: {
  position: [number, number, number];
  radius: number;
  depth: number;
  ringCount: number;
  color: string;
}) {
  const geometry = useMemo(
    () => createCraterGeometry(radius, depth, ringCount),
    [radius, depth, ringCount]
  );

  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      geometry={geometry}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        roughness={0.97}
        metalness={0}
        envMapIntensity={0.1}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

// Flat surface plane (no holes — bowls sit on top and overlap)
function SurfacePlane({ width, height, color }: {
  width: number;
  height: number;
  color: string;
}) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
      receiveShadow
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color={color}
        roughness={0.97}
        metalness={0}
        envMapIntensity={0.1}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

// Grid lines etched into the surface
function GridLines({ xTicks, yTicks, xScale, yScale, worldW, worldH }: {
  xTicks: number[];
  yTicks: number[];
  xScale: (v: number) => number;
  yScale: (v: number) => number;
  worldW: number;
  worldH: number;
}) {
  const points = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    const hw = worldW / 2;
    const hh = worldH / 2;

    for (const t of xTicks) {
      const x = xScale(t);
      lines.push([
        new THREE.Vector3(x, 0.01, -hh),
        new THREE.Vector3(x, 0.01, hh),
      ]);
    }
    for (const t of yTicks) {
      const z = yScale(t);
      lines.push([
        new THREE.Vector3(-hw, 0.01, z),
        new THREE.Vector3(hw, 0.01, z),
      ]);
    }
    return lines;
  }, [xTicks, yTicks, xScale, yScale, worldW, worldH]);

  return (
    <group>
      {points.map((line, i) => {
        const geo = new THREE.BufferGeometry().setFromPoints(line);
        return (
          <lineSegments key={i} geometry={geo}>
            <lineBasicMaterial color="#b5b0a8" opacity={0.15} transparent linewidth={1} />
          </lineSegments>
        );
      })}
    </group>
  );
}

// Regression trend as dotted path of small spheres
function RegressionPath({ regression, xExtent, xScale, yScale }: {
  regression: { slope: number; intercept: number; r2: number } | null;
  xExtent: { min: number; max: number };
  xScale: (v: number) => number;
  yScale: (v: number) => number;
}) {
  if (!regression) return null;

  const spheres = useMemo(() => {
    const count = 50;
    const result: { pos: [number, number, number]; size: number }[] = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const dataX = xExtent.min + t * (xExtent.max - xExtent.min);
      const dataY = regression.slope * dataX + regression.intercept;
      const wx = xScale(dataX);
      const wz = yScale(dataY);
      result.push({
        pos: [wx, 0.05, wz],
        size: i % 4 === 0 ? 0.06 : i % 2 === 0 ? 0.04 : 0.025,
      });
    }
    return result;
  }, [regression, xExtent, xScale, yScale]);

  return (
    <group>
      {spheres.map((s, i) => (
        <mesh key={i} position={s.pos}>
          <sphereGeometry args={[s.size, 6, 6]} />
          <meshStandardMaterial color="#7ec8c8" roughness={0.5} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

// Team labels as Html overlays
function TeamLabels({ items, isDark }: {
  items: { label: string; wx: number; wz: number; radius: number }[];
  isDark: boolean;
}) {
  return (
    <group>
      {items.map((item) => (
        <Html
          key={item.label}
          position={[item.wx, 0.3, item.wz - item.radius - 0.25]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            fontSize: '9px',
            fontWeight: 700,
            fontFamily: 'Space Grotesk, sans-serif',
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,55,50,0.6)',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
            textShadow: isDark ? 'none' : '0 1px 2px rgba(255,255,255,0.8)',
          }}>
            {item.label}
          </div>
        </Html>
      ))}
    </group>
  );
}

// Axis labels
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
      <Html position={[0, 0, hh + 1.5]} center style={{ pointerEvents: 'none' }}>
        <div style={{ ...style, fontSize: '11px', fontWeight: 700 }}>
          Total Away Miles Traveled
        </div>
      </Html>
      <Html position={[-hw - 2, 0, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{ ...style, fontSize: '11px', fontWeight: 700, transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
          Home Advantage (PPG Delta)
        </div>
      </Html>
    </group>
  );
}

// R² badge
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

// Orthographic camera — straight top-down for relief sculpture look
function CameraSetup() {
  const { camera, size } = useThree();

  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      // Fit the world into the viewport
      const aspect = size.width / size.height;
      const viewH = WORLD_H * 0.72;
      const viewW = viewH * aspect;

      camera.left = -viewW;
      camera.right = viewW;
      camera.top = viewH;
      camera.bottom = -viewH;
      camera.near = 0.1;
      camera.far = 200;

      // Slightly tilted from top-down — just enough to see into craters
      // ~15° from vertical gives subtle depth visibility
      camera.position.set(-3, 50, 8);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
  }, [camera, size]);

  return null;
}

/* ═══════════════════════════════════════════════════════════
   MAIN 3D SCENE
   ═══════════════════════════════════════════════════════════ */

interface CraterData {
  teamId: string;
  label: string;
  wx: number;
  wz: number;
  radius: number;
  depth: number;
  ringCount: number;
}

function ScatterScene({ craters, xTicks, yTicks, xScale, yScale, regression, xExtent, isDark }: {
  craters: CraterData[];
  xTicks: number[];
  yTicks: number[];
  xScale: (v: number) => number;
  yScale: (v: number) => number;
  regression: { slope: number; intercept: number; r2: number } | null;
  xExtent: { min: number; max: number };
  isDark: boolean;
}) {
  const surfaceColor = isDark ? DARK_SURFACE : LIGHT_SURFACE;
  const craterColor = isDark ? DARK_CRATER : LIGHT_CRATER;

  return (
    <>
      <CameraSetup />

      {/* Lighting for soft shadow relief effect */}
      {/* Ambient — moderate for flat plaster look */}
      <ambientLight intensity={isDark ? 0.35 : 0.55} />

      {/* Key light — upper-left, soft shadows */}
      <directionalLight
        position={[-60, 80, -40]}
        intensity={isDark ? 1.2 : 0.9}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.1}
        shadow-camera-far={200}
        shadow-bias={-0.0002}
        shadow-radius={4}
      />

      {/* Fill light — opposite side, softer */}
      <directionalLight
        position={[50, 40, 30]}
        intensity={isDark ? 0.2 : 0.3}
      />

      {/* Top-down fill to illuminate crater floors */}
      <directionalLight
        position={[0, 100, 0]}
        intensity={isDark ? 0.15 : 0.2}
      />

      {/* Flat surface plane */}
      <SurfacePlane
        width={WORLD_W + 4}
        height={WORLD_H + 4}
        color={surfaceColor}
      />

      {/* Crater bowls — sorted by Z for proper overlap */}
      {[...craters]
        .sort((a, b) => a.wz - b.wz)
        .map(c => (
          <Crater
            key={c.teamId}
            position={[c.wx, 0, c.wz]}
            radius={c.radius}
            depth={c.depth}
            ringCount={c.ringCount}
            color={craterColor}
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
      />

      {/* Regression trend */}
      <RegressionPath
        regression={regression}
        xExtent={xExtent}
        xScale={xScale}
        yScale={yScale}
      />

      {/* Team labels */}
      <TeamLabels
        items={craters.map(c => ({
          label: c.label,
          wx: c.wx,
          wz: c.wz,
          radius: c.radius,
        }))}
        isDark={isDark}
      />

      {/* R² label */}
      <R2Label
        regression={regression}
        xExtent={xExtent}
        xScale={xScale}
        yScale={yScale}
        isDark={isDark}
      />
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

  const filtered = useMemo(() => {
    if (conference === 'ALL') return metrics;
    const conf = conference === 'EAST' ? 'Eastern' : 'Western';
    return metrics.filter(m => m.conference === conf);
  }, [metrics, conference]);

  const headline = useMemo(() => generateHeadline(filtered), [filtered]);

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

  const depthExtent = useMemo(() => {
    if (filtered.length === 0) return { min: 0, max: 100 };
    const vals = filtered.map(m => m.squadDepthIndex);
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [filtered]);

  // Scales: map data values to world-space coordinates
  const hw = WORLD_W / 2;
  const hh = WORLD_H / 2;

  const xScale = useCallback((val: number) => {
    return -hw + ((val - xExtent.min) / (xExtent.max - xExtent.min)) * WORLD_W;
  }, [xExtent, hw]);

  const yScale = useCallback((val: number) => {
    return hh - ((val - yExtent.min) / (yExtent.max - yExtent.min)) * WORLD_H;
  }, [yExtent, hh]);

  const radiusScale = useCallback((gap: number) => {
    const range = gapExtent.max - gapExtent.min || 1;
    const t = (Math.abs(gap) - gapExtent.min) / range;
    return 0.6 + t * 1.6; // radius 0.6 to 2.2 — tighter range
  }, [gapExtent]);

  const depthScale = useCallback((gap: number) => {
    const range = gapExtent.max - gapExtent.min || 1;
    const t = (Math.abs(gap) - gapExtent.min) / range;
    return 0.15 + t * 0.55; // depth 0.15 to 0.70 — shallow relief
  }, [gapExtent]);

  const ringCountScale = useCallback((depthIdx: number) => {
    const range = depthExtent.max - depthExtent.min || 1;
    const t = (depthIdx - depthExtent.min) / range;
    return Math.round(3 + t * 5); // 3 to 8 rings
  }, [depthExtent]);

  // Build crater data
  const craters: CraterData[] = useMemo(() => {
    return filtered.map(m => ({
      teamId: m.teamId,
      label: abbrev(m.teamShort),
      wx: xScale(m.totalAwayMiles),
      wz: yScale(m.ppgGap),
      radius: radiusScale(m.ppgGap),
      depth: depthScale(m.ppgGap),
      ringCount: ringCountScale(m.squadDepthIndex),
    }));
  }, [filtered, xScale, yScale, radiusScale, depthScale, ringCountScale]);

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
  const bgColor = isDark ? '#1c1c2e' : '#e5e1dc';

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
            <button key={c}
              onClick={(e) => { e.stopPropagation(); setConference(c); }}
              className={`text-[10px] px-3 py-1.5 font-semibold tracking-wider transition-all cursor-pointer select-none ${
                conference === c ? 'neu-pressed text-cyan' : 'neu-raised text-muted-foreground hover:text-foreground'
              } ${i === 0 ? 'rounded-l-lg' : i === 2 ? 'rounded-r-lg' : ''}`}
              style={{ fontFamily: 'Space Grotesk', minWidth: 40, minHeight: 28 }}
            >{c}</button>
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

      {/* 3D Canvas — Orthographic camera */}
      <div className="w-full rounded-lg overflow-hidden" style={{
        height: '620px',
        background: bgColor,
      }}>
        <Canvas
          orthographic
          shadows
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 1.5]}
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={[bgColor]} />

          <ScatterScene
            craters={craters}
            xTicks={xTicks}
            yTicks={yTicks}
            xScale={xScale}
            yScale={yScale}
            regression={regression}
            xExtent={xExtent}
            isDark={isDark}
          />
        </Canvas>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-[10px] text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 22 22">
            <circle cx="11" cy="11" r="9" fill={isDark ? '#35354a' : '#c5c0b8'} />
            <circle cx="11" cy="11" r="7" fill={isDark ? '#30304a' : '#bfbab2'} />
            <circle cx="11" cy="11" r="5" fill={isDark ? '#2b2b44' : '#b9b4ac'} />
            <circle cx="11" cy="11" r="3" fill={isDark ? '#262640' : '#b3aea6'} />
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
