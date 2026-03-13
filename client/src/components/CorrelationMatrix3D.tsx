/**
 * CorrelationMatrix3D — React Three Fiber replacement for the SVG-based
 * pseudo-3D correlation matrix.
 *
 * Architecture:
 *   - Orthographic camera with a gentle top-down tilt for depth perception
 *   - One DirectionalLight from upper-left (matching bar chart light source)
 *   - Each cell is a real BoxGeometry with height driven by |r|
 *   - Positive correlations extrude upward (blue), negative downward (red)
 *   - MeshStandardMaterial with roughness ~0.7, metalness ~0.1 for matte industrial feel
 *   - Shadow mapping enabled on the directional light
 *   - HTML overlays via @react-three/drei for labels and hover tooltips
 *   - 3D Legend on the right side with raised/recessed indicators
 *
 * Props match the old CorrelationMatrix interface so StatsPlayground can
 * swap rendering layers without touching data computation.
 */

import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrthographicCamera, Html } from '@react-three/drei';
import * as THREE from 'three';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface StatDef {
  key: string;
  label: string;
  shortLabel: string;
}

interface CorrelationMatrix3DProps {
  matrix: number[][];
  activeStats: StatDef[];
  isDark: boolean;
  onCellClick: (xKey: string, yKey: string) => void;
}

// ═══════════════════════════════════════════
// COLOR UTILITIES
// ═══════════════════════════════════════════

/**
 * Map a correlation value r ∈ [-1, 1] to a THREE.Color.
 * Blue for positive, red for negative, neutral gray at zero.
 */
function getCellColor(r: number, isDark: boolean): THREE.Color {
  const absR = Math.min(Math.abs(r), 1);

  if (absR < 0.02) {
    return new THREE.Color(isDark ? '#2a2a3e' : '#d8d8e0');
  }

  if (r > 0) {
    if (isDark) {
      const rv = Math.round(42 - absR * 20);
      const gv = Math.round(42 + absR * 80);
      const bv = Math.round(62 + absR * 180);
      return new THREE.Color(`rgb(${clamp(rv)},${clamp(gv)},${clamp(bv)})`);
    } else {
      const rv = Math.round(210 - absR * 175);
      const gv = Math.round(215 - absR * 130);
      const bv = Math.round(235 - absR * 25);
      return new THREE.Color(`rgb(${clamp(rv)},${clamp(gv)},${clamp(bv)})`);
    }
  } else {
    if (isDark) {
      const rv = Math.round(42 + absR * 190);
      const gv = Math.round(42 - absR * 15);
      const bv = Math.round(62 - absR * 20);
      return new THREE.Color(`rgb(${clamp(rv)},${clamp(gv)},${clamp(bv)})`);
    } else {
      const rv = Math.round(235 - absR * 30);
      const gv = Math.round(215 - absR * 170);
      const bv = Math.round(215 - absR * 170);
      return new THREE.Color(`rgb(${clamp(rv)},${clamp(gv)},${clamp(bv)})`);
    }
  }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, v));
}

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════

const CELL_SIZE = 1;        // world units per cell
const GAP = 0.08;           // gap between cells
const CELL_DIM = CELL_SIZE - GAP; // actual box width/depth
const BASE_HEIGHT = 0.06;   // minimum slab thickness for near-zero cells
const MAX_HEIGHT = 0.55;    // maximum extrusion height for |r| = 1
const DIAGONAL_HEIGHT = 0.10; // subtle height for diagonal cells
const BASE_PLANE_Y = 0.08;  // Y position of the base plane surface — cells sit on top or sink below this

// ═══════════════════════════════════════════
// INDIVIDUAL CELL MESH
// ═══════════════════════════════════════════

interface CellMeshProps {
  row: number;
  col: number;
  r: number;
  isDark: boolean;
  isDiagonal: boolean;
  totalCells: number;
  hoveredCell: { row: number; col: number } | null;
  onHover: (cell: { row: number; col: number } | null) => void;
  onClick: () => void;
}

function CellMesh({ row, col, r, isDark, isDiagonal, totalCells, hoveredCell, onHover, onClick }: CellMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const absR = Math.min(Math.abs(r), 1);
  const isHovered = hoveredCell?.row === row && hoveredCell?.col === col;
  const isHighlighted = hoveredCell?.row === row || hoveredCell?.col === col;

  const height = useMemo(() => {
    if (isDiagonal) return DIAGONAL_HEIGHT;
    if (absR < 0.05) return BASE_HEIGHT;
    return BASE_HEIGHT + absR * (MAX_HEIGHT - BASE_HEIGHT);
  }, [absR, isDiagonal]);

  const color = useMemo(() => {
    if (isDiagonal) return new THREE.Color(isDark ? '#3a3a50' : '#c8c8d0');
    return getCellColor(r, isDark);
  }, [r, isDark, isDiagonal]);

  // Position: center of the grid is at origin
  const halfGrid = (totalCells - 1) * CELL_SIZE / 2;
  const x = col * CELL_SIZE - halfGrid;
  const z = row * CELL_SIZE - halfGrid;

  // Y position: positive r extrudes upward from the base plane surface,
  // negative r sinks downward below the base plane surface.
  // The base plane surface is at y = BASE_PLANE_Y.
  const yPos = useMemo(() => {
    if (isDiagonal || absR < 0.05) {
      // Flat cells sit with their top surface flush with the base plane
      return BASE_PLANE_Y - height / 2;
    }
    if (r >= 0) {
      // Positive: bottom of box sits on the base plane, box extrudes upward
      return BASE_PLANE_Y + height / 2;
    }
    // Negative: top of box is flush with (or slightly below) the base plane,
    // box extends downward creating a recessed "well"
    return BASE_PLANE_Y - height / 2;
  }, [r, absR, height, isDiagonal]);

  const roughness = 0.72;
  const metalness = 0.08;

  const emissiveIntensity = isHovered ? 0.3 : isHighlighted ? 0.08 : 0;
  const emissiveColor = useMemo(() => {
    if (isHovered) return new THREE.Color(r >= 0 ? '#3b82f6' : '#ef4444');
    return color;
  }, [isHovered, r, color]);

  return (
    <mesh
      ref={meshRef}
      position={[x, yPos, z]}
      castShadow
      receiveShadow
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover({ row, col });
        document.body.style.cursor = isDiagonal ? 'default' : 'pointer';
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(null);
        document.body.style.cursor = 'default';
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (!isDiagonal) onClick();
      }}
    >
      <boxGeometry args={[CELL_DIM, height, CELL_DIM]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissiveColor}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════
// BASE PLANE
// ═══════════════════════════════════════════

function BasePlane({ size, isDark }: { size: number; isDark: boolean }) {
  // The base plane sits at BASE_PLANE_Y. We make it semi-transparent so
  // recessed (negative) cells that extend below it are still visible as
  // darker wells/shadows through the surface.
  return (
    <group>
      {/* Main reference surface — semi-transparent so recessed wells show through */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, BASE_PLANE_Y, 0]}
        receiveShadow
      >
        <planeGeometry args={[size + 2, size + 2]} />
        <meshStandardMaterial
          color={isDark ? '#1a1a2e' : '#e4e4ec'}
          roughness={0.9}
          metalness={0.02}
          transparent
          opacity={0.55}
        />
      </mesh>
      {/* Floor plane below the grid to catch shadows from recessed cells */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, BASE_PLANE_Y - MAX_HEIGHT - 0.05, 0]}
        receiveShadow
      >
        <planeGeometry args={[size + 2, size + 2]} />
        <meshStandardMaterial
          color={isDark ? '#141428' : '#d0d0d8'}
          roughness={0.95}
          metalness={0.01}
        />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════
// LABELS (HTML overlays via drei)
// ═══════════════════════════════════════════

interface LabelsProps {
  activeStats: StatDef[];
  hoveredCell: { row: number; col: number } | null;
  isDark: boolean;
}

function ColumnLabels({ activeStats, hoveredCell, isDark }: LabelsProps) {
  const n = activeStats.length;
  const halfGrid = (n - 1) * CELL_SIZE / 2;

  return (
    <>
      {activeStats.map((stat, i) => {
        const x = i * CELL_SIZE - halfGrid;
        const z = halfGrid + CELL_SIZE * 0.75;
        const isHighlighted = hoveredCell?.col === i;

        return (
          <Html
            key={`col-${i}`}
            position={[x, 0.02, z]}
            center
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              color: isHighlighted
                ? (isDark ? '#60a5fa' : '#1e40af')
                : (isDark ? '#8892b0' : '#64748b'),
              fontWeight: isHighlighted ? 700 : 400,
              transform: 'rotate(-55deg)',
              transformOrigin: 'center center',
              transition: 'color 0.15s, font-weight 0.15s',
            }}>
              {stat.shortLabel}
            </div>
          </Html>
        );
      })}
    </>
  );
}

function RowLabels({ activeStats, hoveredCell, isDark }: LabelsProps) {
  const n = activeStats.length;
  const halfGrid = (n - 1) * CELL_SIZE / 2;

  return (
    <>
      {activeStats.map((stat, i) => {
        const x = -halfGrid - CELL_SIZE * 0.75;
        const z = i * CELL_SIZE - halfGrid;
        const isHighlighted = hoveredCell?.row === i;

        return (
          <Html
            key={`row-${i}`}
            position={[x, 0.02, z]}
            center
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              color: isHighlighted
                ? (isDark ? '#60a5fa' : '#1e40af')
                : (isDark ? '#8892b0' : '#64748b'),
              fontWeight: isHighlighted ? 700 : 400,
              transition: 'color 0.15s, font-weight 0.15s',
              textAlign: 'right',
            }}>
              {stat.shortLabel}
            </div>
          </Html>
        );
      })}
    </>
  );
}

// ═══════════════════════════════════════════
// HOVER TOOLTIP
// ═══════════════════════════════════════════

interface TooltipProps {
  hoveredCell: { row: number; col: number } | null;
  matrix: number[][];
  activeStats: StatDef[];
  isDark: boolean;
}

function HoverTooltip({ hoveredCell, matrix, activeStats, isDark }: TooltipProps) {
  if (!hoveredCell) return null;
  const { row, col } = hoveredCell;
  if (row === col) return null;

  const r = matrix[row][col];
  const n = activeStats.length;
  const halfGrid = (n - 1) * CELL_SIZE / 2;
  const x = col * CELL_SIZE - halfGrid;
  const z = row * CELL_SIZE - halfGrid;
  const absR = Math.abs(r);
  const height = absR < 0.05 ? BASE_HEIGHT : BASE_HEIGHT + absR * (MAX_HEIGHT - BASE_HEIGHT);
  const yPos = r >= 0 ? BASE_PLANE_Y + height + 0.15 : BASE_PLANE_Y + 0.2;

  return (
    <Html
      position={[x, yPos, z]}
      center
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div style={{
        background: isDark ? 'rgba(15,15,30,0.92)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        borderRadius: '6px',
        padding: '6px 10px',
        whiteSpace: 'nowrap',
        boxShadow: isDark
          ? '0 4px 12px rgba(0,0,0,0.5)'
          : '0 4px 12px rgba(0,0,0,0.12)',
      }}>
        <div style={{
          fontSize: '9px',
          fontFamily: 'Space Grotesk, sans-serif',
          color: isDark ? '#8892b0' : '#64748b',
          marginBottom: '2px',
        }}>
          {activeStats[row].label} × {activeStats[col].label}
        </div>
        <div style={{
          fontSize: '14px',
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 700,
          color: r >= 0
            ? (isDark ? '#60a5fa' : '#1e40af')
            : (isDark ? '#f87171' : '#b91c1c'),
        }}>
          r = {r.toFixed(3)}
        </div>
      </div>
    </Html>
  );
}

// ═══════════════════════════════════════════
// 3D LEGEND (right side, vertical)
// ═══════════════════════════════════════════

interface Legend3DProps {
  isDark: boolean;
  totalCells: number;
}

function Legend3D({ isDark, totalCells }: Legend3DProps) {
  // Values from +1 (top, raised) to -1 (bottom, recessed)
  const legendValues = [1, 0.75, 0.5, 0.25, 0.1, 0, -0.1, -0.25, -0.5, -0.75, -1];
  const halfGrid = (totalCells - 1) * CELL_SIZE / 2;
  const legendX = halfGrid + CELL_SIZE * 1.8;
  // Center the legend vertically relative to the grid
  const legendTotalHeight = (legendValues.length - 1) * CELL_SIZE * 0.75;
  const legendStartZ = -legendTotalHeight / 2;
  const legendSpacing = CELL_SIZE * 0.75;
  const legendCellDim = CELL_DIM * 0.65;

  return (
    <>
      {/* "+1 Raised" label at top */}
      <Html
        position={[legendX, 0.1, legendStartZ - legendSpacing * 1.1]}
        center
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '12px',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
            color: isDark ? '#60a5fa' : '#1e3a8a',
          }}>+1</div>
          <div style={{
            fontSize: '9px',
            fontFamily: 'Space Grotesk, sans-serif',
            color: isDark ? '#60a5fa' : '#1e3a8a',
          }}>&#9650; Raised</div>
        </div>
      </Html>

      {legendValues.map((v, i) => {
        const absV = Math.abs(v);
        const z = legendStartZ + i * legendSpacing;
        const height = absV < 0.05 ? BASE_HEIGHT : BASE_HEIGHT + absV * (MAX_HEIGHT - BASE_HEIGHT);
        const yPos = v >= 0
          ? BASE_PLANE_Y + height / 2
          : (absV < 0.05 ? BASE_PLANE_Y - height / 2 : BASE_PLANE_Y - height / 2);
        const color = v === 0
          ? new THREE.Color(isDark ? '#3a3a50' : '#c8c8d0')
          : getCellColor(v, isDark);

        return (
          <group key={i}>
            <mesh
              position={[legendX, yPos, z]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[legendCellDim, height, legendCellDim]} />
              <meshStandardMaterial
                color={color}
                roughness={0.72}
                metalness={0.08}
              />
            </mesh>

            {/* Value label to the left of the swatch */}
            <Html
              position={[legendX - legendCellDim * 1.0, 0.05, z]}
              center
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              <div style={{
                fontSize: '9px',
                fontFamily: 'JetBrains Mono, monospace',
                color: isDark ? '#8892b0' : '#64748b',
                fontWeight: absV < 0.05 ? 600 : 400,
                textAlign: 'right',
                width: '32px',
              }}>
                {v === 0 ? '0' : v > 0 ? `+${v}` : `${v}`}
              </div>
            </Html>
          </group>
        );
      })}

      {/* "-1 Recessed" label at bottom */}
      <Html
        position={[legendX, 0.1, legendStartZ + legendValues.length * legendSpacing]}
        center
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '9px',
            fontFamily: 'Space Grotesk, sans-serif',
            color: isDark ? '#f87171' : '#991b1b',
          }}>&#9660; Recessed</div>
          <div style={{
            fontSize: '12px',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
            color: isDark ? '#f87171' : '#991b1b',
          }}>−1</div>
        </div>
      </Html>
    </>
  );
}

// ═══════════════════════════════════════════
// SCENE (camera, lights, all meshes)
// ═══════════════════════════════════════════

interface SceneProps {
  matrix: number[][];
  activeStats: StatDef[];
  isDark: boolean;
  hoveredCell: { row: number; col: number } | null;
  onHover: (cell: { row: number; col: number } | null) => void;
  onCellClick: (xKey: string, yKey: string) => void;
}

function CameraRig({ gridWorldSize }: { gridWorldSize: number }) {
  const { camera } = useThree();

  useEffect(() => {
    // Ensure camera looks at the center of the grid
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, gridWorldSize]);

  return null;
}

function Scene({ matrix, activeStats, isDark, hoveredCell, onHover, onCellClick }: SceneProps) {
  const n = activeStats.length;
  const gridWorldSize = n * CELL_SIZE;

  return (
    <>
      <CameraRig gridWorldSize={gridWorldSize} />
      {/* Lighting — primary directional from upper-left */}
      <ambientLight intensity={isDark ? 0.4 : 0.55} />
      <directionalLight
        position={[-gridWorldSize * 0.5, gridWorldSize * 1.5, -gridWorldSize * 0.6]}
        intensity={isDark ? 1.5 : 1.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-gridWorldSize}
        shadow-camera-right={gridWorldSize * 1.5}
        shadow-camera-top={gridWorldSize}
        shadow-camera-bottom={-gridWorldSize}
        shadow-camera-near={0.1}
        shadow-camera-far={gridWorldSize * 5}
        shadow-bias={-0.001}
        shadow-normalBias={0.02}
      />
      {/* Subtle fill light from opposite side */}
      <directionalLight
        position={[gridWorldSize * 0.4, gridWorldSize * 0.6, gridWorldSize * 0.3]}
        intensity={isDark ? 0.15 : 0.22}
      />

      {/* Base plane */}
      <BasePlane size={gridWorldSize} isDark={isDark} />

      {/* Matrix cells */}
      {matrix.map((row, ri) =>
        row.map((r, ci) => (
          <CellMesh
            key={`${ri}-${ci}`}
            row={ri}
            col={ci}
            r={r}
            isDark={isDark}
            isDiagonal={ri === ci}
            totalCells={n}
            hoveredCell={hoveredCell}
            onHover={onHover}
            onClick={() => onCellClick(activeStats[ci].key, activeStats[ri].key)}
          />
        ))
      )}

      {/* Labels */}
      <ColumnLabels activeStats={activeStats} hoveredCell={hoveredCell} isDark={isDark} />
      <RowLabels activeStats={activeStats} hoveredCell={hoveredCell} isDark={isDark} />

      {/* Hover tooltip */}
      <HoverTooltip
        hoveredCell={hoveredCell}
        matrix={matrix}
        activeStats={activeStats}
        isDark={isDark}
      />

      {/* 3D Legend on the right */}
      <Legend3D isDark={isDark} totalCells={n} />
    </>
  );
}

// ═══════════════════════════════════════════
// MAIN EXPORT COMPONENT
// ═══════════════════════════════════════════

export default function CorrelationMatrix3D({
  matrix,
  activeStats,
  isDark,
  onCellClick,
}: CorrelationMatrix3DProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const n = activeStats.length;
  const gridWorldSize = n * CELL_SIZE;

  // Container height scales with grid size — generous for large displays
  const containerHeight = Math.max(560, n * 55 + 100);

  // Camera: nearly top-down with a subtle forward tilt for depth perception
  // Position: mostly above with a gentle tilt from the front-right
  // This gives a "looking down at a table" feel with visible extrusion front faces
  const camDist = gridWorldSize * 1.0;

  return (
    <div
      style={{
        width: '100%',
        height: containerHeight,
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
      onPointerLeave={() => {
        setHoveredCell(null);
        document.body.style.cursor = 'default';
      }}
    >
      <Canvas
        shadows
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isDark ? 0.9 : 1.1,
        }}
        style={{
          background: 'transparent',
        }}
      >
        <OrthographicCamera
          makeDefault
          zoom={42}
          position={[camDist * 0.02, camDist * 1.8, camDist * 0.35]}
          near={0.1}
          far={1000}
        />
        <Scene
          matrix={matrix}
          activeStats={activeStats}
          isDark={isDark}
          hoveredCell={hoveredCell}
          onHover={setHoveredCell}
          onCellClick={onCellClick}
        />
      </Canvas>
    </div>
  );
}
