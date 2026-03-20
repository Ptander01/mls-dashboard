/**
 * CorrelationMatrix3D — React Three Fiber 3D correlation matrix.
 *
 * Architecture:
 *   - Orthographic camera, perfectly top-down — grid is square on screen
 *   - Each cell is rendered as a flat colored plane (the "top face")
 *   - Darker strips on the RIGHT and BOTTOM edges of each cell simulate
 *     3D depth, exactly like the CSS-based 3D bar charts elsewhere in the
 *     dashboard. Strip width scales with |r| to convey "height."
 *   - Positive correlations (blue) show right+bottom strips (raised look)
 *   - Negative correlations (red) show left+top strips (recessed look)
 *   - Directional lighting adds subtle shading variation across top faces
 *   - HTML overlays via @react-three/drei for labels and hover tooltips
 *   - 3D Legend on the right side with raised/recessed indicators
 */

import { useRef, useState, useMemo, useCallback, useEffect, memo } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrthographicCamera, Html } from "@react-three/drei";
import * as THREE from "three";

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

function clamp(v: number): number {
  return Math.max(0, Math.min(255, v));
}

function getCellColor(r: number, isDark: boolean): string {
  const absR = Math.min(Math.abs(r), 1);

  if (absR < 0.02) {
    return isDark ? "#2a2a3e" : "#d8d8e0";
  }

  if (r > 0) {
    if (isDark) {
      const rv = Math.round(42 - absR * 20);
      const gv = Math.round(42 + absR * 80);
      const bv = Math.round(62 + absR * 180);
      return `rgb(${clamp(rv)},${clamp(gv)},${clamp(bv)})`;
    } else {
      const rv = Math.round(210 - absR * 175);
      const gv = Math.round(215 - absR * 130);
      const bv = Math.round(235 - absR * 25);
      return `rgb(${clamp(rv)},${clamp(gv)},${clamp(bv)})`;
    }
  } else {
    if (isDark) {
      const rv = Math.round(42 + absR * 190);
      const gv = Math.round(42 - absR * 15);
      const bv = Math.round(62 - absR * 20);
      return `rgb(${clamp(rv)},${clamp(gv)},${clamp(bv)})`;
    } else {
      const rv = Math.round(235 - absR * 30);
      const gv = Math.round(215 - absR * 170);
      const bv = Math.round(215 - absR * 170);
      return `rgb(${clamp(rv)},${clamp(gv)},${clamp(bv)})`;
    }
  }
}

/** Darken a color by a factor (0 = black, 1 = unchanged) */
function darkenColor(hex: string, factor: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(factor);
  return `#${c.getHexString()}`;
}

/** Lighten a color by blending toward white */
function lightenColor(hex: string, factor: number): string {
  const c = new THREE.Color(hex);
  const white = new THREE.Color(1, 1, 1);
  c.lerp(white, factor);
  return `#${c.getHexString()}`;
}

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════

const CELL_SIZE = 1; // world units per cell (center-to-center)
const CELL_DIM = 0.88; // actual visible cell width/depth (leaves gap)
const MAX_STRIP = 0.22; // maximum side strip width for |r|=1
const MIN_STRIP = 0.04; // minimum strip for weak correlations

// ═══════════════════════════════════════════
// INDIVIDUAL CELL (top face + side strips)
// ═══════════════════════════════════════════

interface CellProps {
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

function Cell({
  row,
  col,
  r,
  isDark,
  isDiagonal,
  totalCells,
  hoveredCell,
  onHover,
  onClick,
}: CellProps) {
  const absR = Math.min(Math.abs(r), 1);
  const isHovered = hoveredCell?.row === row && hoveredCell?.col === col;
  const isHighlighted = hoveredCell?.row === row || hoveredCell?.col === col;

  // Cell color
  const colorStr = useMemo(() => {
    if (isDiagonal) return isDark ? "#3a3a50" : "#c8c8d0";
    return getCellColor(r, isDark);
  }, [r, isDark, isDiagonal]);

  const color = useMemo(() => new THREE.Color(colorStr), [colorStr]);

  // Side strip width scales with |r|
  const stripWidth = useMemo(() => {
    if (isDiagonal || absR < 0.06) return 0;
    return MIN_STRIP + absR * (MAX_STRIP - MIN_STRIP);
  }, [absR, isDiagonal]);

  // Side face colors — right is darker, bottom is even darker
  const rightColor = useMemo(
    () => new THREE.Color(darkenColor(colorStr, 0.45)),
    [colorStr]
  );
  const bottomColor = useMemo(
    () => new THREE.Color(darkenColor(colorStr, 0.3)),
    [colorStr]
  );

  // For recessed (negative) cells: lighter top-left highlight strip
  const topHighlightColor = useMemo(
    () => new THREE.Color(lightenColor(colorStr, 0.3)),
    [colorStr]
  );
  const leftHighlightColor = useMemo(
    () => new THREE.Color(lightenColor(colorStr, 0.2)),
    [colorStr]
  );

  // Position: center of the grid is at origin
  const halfGrid = ((totalCells - 1) * CELL_SIZE) / 2;
  const x = col * CELL_SIZE - halfGrid;
  const z = row * CELL_SIZE - halfGrid;

  const isRaised = r >= 0;

  // Emissive for hover
  const emissiveIntensity = isHovered ? 0.35 : isHighlighted ? 0.08 : 0;
  const emissiveColor = useMemo(() => {
    if (isHovered) return new THREE.Color(r >= 0 ? "#3b82f6" : "#ef4444");
    return color;
  }, [isHovered, r, color]);

  // Top face dimensions — shrink slightly to make room for side strips
  const topW = stripWidth > 0 ? CELL_DIM - stripWidth : CELL_DIM;
  const topD = stripWidth > 0 ? CELL_DIM - stripWidth : CELL_DIM;

  // Offset the top face so strips appear on the correct edges
  // Raised (positive): strips on RIGHT and BOTTOM → shift top face LEFT and UP
  // Recessed (negative): strips on LEFT and TOP → shift top face RIGHT and DOWN
  const topOffsetX =
    stripWidth > 0 ? (isRaised ? -stripWidth / 2 : stripWidth / 2) : 0;
  const topOffsetZ =
    stripWidth > 0 ? (isRaised ? -stripWidth / 2 : stripWidth / 2) : 0;

  const halfDim = CELL_DIM / 2;

  return (
    <group>
      {/* Top face — the main colored square (thin box so top face is visible from above) */}
      <mesh
        position={[x + topOffsetX, 0.01, z + topOffsetZ]}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover({ row, col });
          document.body.style.cursor = isDiagonal ? "default" : "pointer";
        }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(null);
          document.body.style.cursor = "default";
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (!isDiagonal) onClick();
        }}
      >
        <boxGeometry args={[topW, 0.02, topD]} />
        <meshStandardMaterial
          color={color}
          roughness={0.72}
          metalness={0.08}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Side strips for RAISED cells (positive r): right + bottom edges */}
      {stripWidth > 0 && isRaised && (
        <>
          {/* Right strip — darker */}
          <mesh position={[x + halfDim - stripWidth / 2, 0, z + topOffsetZ]}>
            <boxGeometry args={[stripWidth, 0.02, topD]} />
            <meshBasicMaterial color={rightColor} />
          </mesh>
          {/* Bottom strip — even darker, extends full width including corner */}
          <mesh position={[x, 0, z + halfDim - stripWidth / 2]}>
            <boxGeometry args={[CELL_DIM, 0.02, stripWidth]} />
            <meshBasicMaterial color={bottomColor} />
          </mesh>
        </>
      )}

      {/* Side strips for RECESSED cells (negative r): left + top edges (highlight) */}
      {stripWidth > 0 && !isRaised && (
        <>
          {/* Left strip — lighter (as if light is hitting the inner wall) */}
          <mesh position={[x - halfDim + stripWidth / 2, 0, z + topOffsetZ]}>
            <boxGeometry args={[stripWidth, 0.02, topD]} />
            <meshBasicMaterial color={leftHighlightColor} />
          </mesh>
          {/* Top strip — slightly lighter */}
          <mesh position={[x, 0, z - halfDim + stripWidth / 2]}>
            <boxGeometry args={[CELL_DIM, 0.02, stripWidth]} />
            <meshBasicMaterial color={topHighlightColor} />
          </mesh>
          {/* Also add darker right + bottom to complete the recessed "well" look */}
          <mesh position={[x + halfDim - stripWidth / 2, 0, z + topOffsetZ]}>
            <boxGeometry args={[stripWidth, 0.02, topD]} />
            <meshBasicMaterial color={bottomColor} />
          </mesh>
          <mesh position={[x, 0, z + halfDim - stripWidth / 2]}>
            <boxGeometry args={[CELL_DIM, 0.02, stripWidth]} />
            <meshBasicMaterial color={rightColor} />
          </mesh>
        </>
      )}
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
  const halfGrid = ((n - 1) * CELL_SIZE) / 2;

  return (
    <>
      {activeStats.map((stat, i) => {
        const x = i * CELL_SIZE - halfGrid;
        const z = halfGrid + CELL_SIZE * 1.2;
        const isHighlighted = hoveredCell?.col === i;

        return (
          <Html
            key={`col-${i}`}
            position={[x, 0.02, z]}
            center
            style={{
              pointerEvents: "none",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontFamily: "JetBrains Mono, monospace",
                color: isHighlighted
                  ? isDark
                    ? "#60a5fa"
                    : "#1e40af"
                  : isDark
                    ? "#8892b0"
                    : "#64748b",
                fontWeight: isHighlighted ? 700 : 400,
                transform: "rotate(-55deg)",
                transformOrigin: "center center",
                transition: "color 0.15s, font-weight 0.15s",
              }}
            >
              {stat.label}
            </div>
          </Html>
        );
      })}
    </>
  );
}

function RowLabels({ activeStats, hoveredCell, isDark }: LabelsProps) {
  const n = activeStats.length;
  const halfGrid = ((n - 1) * CELL_SIZE) / 2;

  return (
    <>
      {activeStats.map((stat, i) => {
        const x = -halfGrid - CELL_SIZE * 1.4;
        const z = i * CELL_SIZE - halfGrid;
        const isHighlighted = hoveredCell?.row === i;

        return (
          <Html
            key={`row-${i}`}
            position={[x, 0.02, z]}
            center
            style={{
              pointerEvents: "none",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontFamily: "JetBrains Mono, monospace",
                color: isHighlighted
                  ? isDark
                    ? "#60a5fa"
                    : "#1e40af"
                  : isDark
                    ? "#8892b0"
                    : "#64748b",
                fontWeight: isHighlighted ? 700 : 400,
                transition: "color 0.15s, font-weight 0.15s",
                textAlign: "right",
              }}
            >
              {stat.label}
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

function HoverTooltip({
  hoveredCell,
  matrix,
  activeStats,
  isDark,
}: TooltipProps) {
  if (!hoveredCell) return null;
  const { row, col } = hoveredCell;
  if (row === col) return null;

  const r = matrix[row][col];
  const n = activeStats.length;
  const halfGrid = ((n - 1) * CELL_SIZE) / 2;
  const x = col * CELL_SIZE - halfGrid;
  const z = row * CELL_SIZE - halfGrid;

  return (
    <Html
      position={[x, 0.5, z]}
      center
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div
        style={{
          background: isDark ? "rgba(15,15,30,0.92)" : "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
          borderRadius: "6px",
          padding: "6px 10px",
          whiteSpace: "nowrap",
          boxShadow: isDark
            ? "0 4px 12px rgba(0,0,0,0.5)"
            : "0 4px 12px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            fontSize: "9px",
            fontFamily: "Space Grotesk, sans-serif",
            color: isDark ? "#8892b0" : "#64748b",
            marginBottom: "2px",
          }}
        >
          {activeStats[row].label} × {activeStats[col].label}
        </div>
        <div
          style={{
            fontSize: "14px",
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: 700,
            color:
              r >= 0
                ? isDark
                  ? "#60a5fa"
                  : "#1e40af"
                : isDark
                  ? "#f87171"
                  : "#b91c1c",
          }}
        >
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
  const legendValues = [
    1, 0.75, 0.5, 0.25, 0.1, 0, -0.1, -0.25, -0.5, -0.75, -1,
  ];
  const halfGrid = ((totalCells - 1) * CELL_SIZE) / 2;
  const legendX = halfGrid + CELL_SIZE * 2.8;
  const legendSpacing = CELL_SIZE * 0.75;
  const legendStartZ = -((legendValues.length - 1) * legendSpacing) / 2;
  const legendCellDim = CELL_DIM * 0.55;

  return (
    <>
      {/* "+1 Raised" label at top */}
      <Html
        position={[legendX, 0.1, legendStartZ - legendSpacing * 1.1]}
        center
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "12px",
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: 700,
              color: isDark ? "#60a5fa" : "#1e3a8a",
            }}
          >
            +1
          </div>
          <div
            style={{
              fontSize: "9px",
              fontFamily: "Space Grotesk, sans-serif",
              color: isDark ? "#60a5fa" : "#1e3a8a",
            }}
          >
            &#9650; Raised
          </div>
        </div>
      </Html>

      {legendValues.map((v, i) => {
        const absV = Math.abs(v);
        const z = legendStartZ + i * legendSpacing;
        const colorStr =
          v === 0 ? (isDark ? "#3a3a50" : "#c8c8d0") : getCellColor(v, isDark);
        const color = new THREE.Color(colorStr);
        const isRaised = v >= 0;
        const stripW = absV < 0.06 ? 0 : absV * MAX_STRIP;
        const halfLeg = legendCellDim / 2;

        // Top face dimensions
        const topW = stripW > 0 ? legendCellDim - stripW : legendCellDim;
        const topD = stripW > 0 ? legendCellDim - stripW : legendCellDim;
        const topOffX = stripW > 0 ? (isRaised ? -stripW / 2 : stripW / 2) : 0;
        const topOffZ = stripW > 0 ? (isRaised ? -stripW / 2 : stripW / 2) : 0;

        return (
          <group key={i}>
            {/* Top face */}
            <mesh position={[legendX + topOffX, 0.01, z + topOffZ]}>
              <boxGeometry args={[topW, 0.02, topD]} />
              <meshStandardMaterial
                color={color}
                roughness={0.72}
                metalness={0.08}
              />
            </mesh>

            {/* Side strips for raised */}
            {stripW > 0 && isRaised && (
              <>
                <mesh
                  position={[legendX + halfLeg - stripW / 2, 0, z + topOffZ]}
                >
                  <boxGeometry args={[stripW, 0.02, topD]} />
                  <meshBasicMaterial
                    color={new THREE.Color(darkenColor(colorStr, 0.55))}
                  />
                </mesh>
                <mesh position={[legendX, 0, z + halfLeg - stripW / 2]}>
                  <boxGeometry args={[legendCellDim, 0.02, stripW]} />
                  <meshBasicMaterial
                    color={new THREE.Color(darkenColor(colorStr, 0.35))}
                  />
                </mesh>
              </>
            )}

            {/* Side strips for recessed */}
            {stripW > 0 && !isRaised && (
              <>
                {/* Light strips on left + top */}
                <mesh
                  position={[legendX - halfLeg + stripW / 2, 0, z + topOffZ]}
                >
                  <boxGeometry args={[stripW, 0.02, topD]} />
                  <meshBasicMaterial
                    color={new THREE.Color(lightenColor(colorStr, 0.15))}
                  />
                </mesh>
                <mesh position={[legendX, 0, z - halfLeg + stripW / 2]}>
                  <boxGeometry args={[legendCellDim, 0.02, stripW]} />
                  <meshBasicMaterial
                    color={new THREE.Color(lightenColor(colorStr, 0.25))}
                  />
                </mesh>
                {/* Dark strips on right + bottom */}
                <mesh
                  position={[legendX + halfLeg - stripW / 2, 0, z + topOffZ]}
                >
                  <boxGeometry args={[stripW, 0.02, topD]} />
                  <meshBasicMaterial
                    color={new THREE.Color(darkenColor(colorStr, 0.35))}
                  />
                </mesh>
                <mesh position={[legendX, 0, z + halfLeg - stripW / 2]}>
                  <boxGeometry args={[legendCellDim, 0.02, stripW]} />
                  <meshBasicMaterial
                    color={new THREE.Color(darkenColor(colorStr, 0.55))}
                  />
                </mesh>
              </>
            )}

            {/* Value label */}
            <Html
              position={[legendX - legendCellDim * 1.4, 0.05, z]}
              center
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              <div
                style={{
                  fontSize: "9px",
                  fontFamily: "JetBrains Mono, monospace",
                  color: isDark ? "#8892b0" : "#64748b",
                  fontWeight: absV < 0.05 ? 600 : 400,
                  textAlign: "right",
                  width: "32px",
                }}
              >
                {v === 0 ? "0" : v > 0 ? `+${v}` : `${v}`}
              </div>
            </Html>
          </group>
        );
      })}

      {/* "-1 Recessed" label at bottom */}
      <Html
        position={[
          legendX,
          0.1,
          legendStartZ + legendValues.length * legendSpacing,
        ]}
        center
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "9px",
              fontFamily: "Space Grotesk, sans-serif",
              color: isDark ? "#f87171" : "#991b1b",
            }}
          >
            &#9660; Recessed
          </div>
          <div
            style={{
              fontSize: "12px",
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: 700,
              color: isDark ? "#f87171" : "#991b1b",
            }}
          >
            −1
          </div>
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

function CameraRig() {
  const { camera } = useThree();

  useEffect(() => {
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

function Scene({
  matrix,
  activeStats,
  isDark,
  hoveredCell,
  onHover,
  onCellClick,
}: SceneProps) {
  const n = activeStats.length;

  return (
    <>
      <CameraRig />

      {/* Lighting — ambient + angled directional for subtle shading on faces */}
      <ambientLight intensity={isDark ? 0.6 : 0.75} />
      <directionalLight
        position={[-8, 20, -5]}
        intensity={isDark ? 0.8 : 1.0}
      />
      {/* Fill light from opposite side */}
      <directionalLight position={[6, 15, 4]} intensity={isDark ? 0.15 : 0.2} />

      {/* Matrix cells */}
      {matrix.map((row, ri) =>
        row.map((r, ci) => (
          <Cell
            key={`${ri}-${ci}`}
            row={ri}
            col={ci}
            r={r}
            isDark={isDark}
            isDiagonal={ri === ci}
            totalCells={n}
            hoveredCell={hoveredCell}
            onHover={onHover}
            onClick={() =>
              onCellClick(activeStats[ci].key, activeStats[ri].key)
            }
          />
        ))
      )}

      {/* Labels */}
      <ColumnLabels
        activeStats={activeStats}
        hoveredCell={hoveredCell}
        isDark={isDark}
      />
      <RowLabels
        activeStats={activeStats}
        hoveredCell={hoveredCell}
        isDark={isDark}
      />

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

function CorrelationMatrix3DInner({
  matrix,
  activeStats,
  isDark,
  onCellClick,
}: CorrelationMatrix3DProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const n = activeStats.length;

  // Container height scales with grid size
  const containerHeight = Math.max(620, n * 58 + 120);

  return (
    <div
      style={{
        width: "100%",
        height: containerHeight,
        position: "relative",
        overflow: "hidden",
      }}
      onPointerLeave={() => {
        setHoveredCell(null);
        document.body.style.cursor = "default";
      }}
    >
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isDark ? 0.9 : 1.1,
        }}
        style={{
          background: "transparent",
        }}
      >
        {/* Camera: PERFECTLY top-down. Plane geometry faces camera. */}
        <OrthographicCamera
          makeDefault
          zoom={38}
          position={[0, 100, 0]}
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

const CorrelationMatrix3D = memo(
  CorrelationMatrix3DInner,
  (prev, next) =>
    prev.matrix === next.matrix &&
    prev.activeStats === next.activeStats &&
    prev.isDark === next.isDark
);
export default CorrelationMatrix3D;
