/**
 * PassingNetwork3D — Cinematic 3D passing network & centrality visualization.
 *
 * Renders Inter Miami's passing network from the 4-0 win over Toronto FC
 * (Sept 21, 2023) as a "glass & neon" 3D scene using React Three Fiber.
 *
 * Features:
 *   - Glass sphere nodes (MeshPhysicalMaterial with transmission)
 *   - Neon tube edges scaled by pass frequency
 *   - Bloom post-processing for genuine glow
 *   - Hover/click deemphasis interaction
 *   - Floating glassmorphism player info overlay
 *   - Position-based color coding
 */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { Canvas, useThree, useFrame, type ThreeElements } from "@react-three/fiber";
import { OrthographicCamera, Html, Line } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
} from "@react-three/postprocessing";
import * as THREE from "three";
import GlassNode from "./GlassNode";
import NeonTube from "./NeonTube";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface NetworkNode {
  playerId: number;
  name: string;
  shortName: string;
  jersey: number;
  position: string;
  posGroup: string;
  color: string;
  x: number;
  z: number;
  degree: number;
  degreeNorm: number;
  betweenness: number;
  betweennessNorm: number;
}

interface NetworkEdge {
  source: number;
  target: number;
  weight: number;
  weightNorm: number;
}

interface NetworkData {
  matchId: number;
  matchLabel: string;
  matchDate: string;
  team: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  meta: {
    playerCount: number;
    edgeCount: number;
    totalPasses: number;
    density: number;
    maxDegree: number;
    maxBetweenness: number;
  };
}

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════

const NODE_Y = 0.8; // Height of nodes above pitch
const MIN_NODE_RADIUS = 0.6;
const MAX_NODE_RADIUS = 1.8;
const MIN_TUBE_THICKNESS = 0.02;
const MAX_TUBE_THICKNESS = 0.12;
const DEEMPHASIS_OPACITY = 0.08;
const PITCH_HALF_X = 60;
const PITCH_HALF_Z = 40;

// ═══════════════════════════════════════════
// PITCH GROUND
// ═══════════════════════════════════════════

function PitchGround() {
  const gridTexture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Dark base
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, size, size);

    // Subtle grid lines
    ctx.strokeStyle = "rgba(0, 212, 255, 0.04)";
    ctx.lineWidth = 1;
    const step = size / 16;
    for (let i = 0; i <= 16; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(size, i * step);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 3);
    return tex;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[PITCH_HALF_X * 2 + 10, PITCH_HALF_Z * 2 + 10]} />
      <meshStandardMaterial
        map={gridTexture}
        color="#0a0a14"
        roughness={0.95}
        metalness={0.05}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════
// PITCH LINES (SVG-style on the ground)
// ═══════════════════════════════════════════

function PitchLines() {
  const lineColor = "#00d4ff";
  const lineOpacity = 0.12;

  const points = useMemo(() => {
    const lines: { start: THREE.Vector3; end: THREE.Vector3 }[] = [];
    const y = 0.01;
    const hx = PITCH_HALF_X;
    const hz = PITCH_HALF_Z;

    // Outer boundary
    lines.push(
      { start: new THREE.Vector3(-hx, y, -hz), end: new THREE.Vector3(hx, y, -hz) },
      { start: new THREE.Vector3(hx, y, -hz), end: new THREE.Vector3(hx, y, hz) },
      { start: new THREE.Vector3(hx, y, hz), end: new THREE.Vector3(-hx, y, hz) },
      { start: new THREE.Vector3(-hx, y, hz), end: new THREE.Vector3(-hx, y, -hz) },
      // Center line
      { start: new THREE.Vector3(0, y, -hz), end: new THREE.Vector3(0, y, hz) },
    );

    // Penalty areas
    const paW = 16.5 * (hx / 52.5); // Scale from real pitch
    const paH = 20.15 * (hz / 34);
    // Left
    lines.push(
      { start: new THREE.Vector3(-hx, y, -paH), end: new THREE.Vector3(-hx + paW, y, -paH) },
      { start: new THREE.Vector3(-hx + paW, y, -paH), end: new THREE.Vector3(-hx + paW, y, paH) },
      { start: new THREE.Vector3(-hx + paW, y, paH), end: new THREE.Vector3(-hx, y, paH) },
    );
    // Right
    lines.push(
      { start: new THREE.Vector3(hx, y, -paH), end: new THREE.Vector3(hx - paW, y, -paH) },
      { start: new THREE.Vector3(hx - paW, y, -paH), end: new THREE.Vector3(hx - paW, y, paH) },
      { start: new THREE.Vector3(hx - paW, y, paH), end: new THREE.Vector3(hx, y, paH) },
    );

    return lines;
  }, []);

  // Center circle
  const circlePoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 48;
    const r = 9.15 * (PITCH_HALF_X / 52.5);
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * r, 0.01, Math.sin(angle) * r));
    }
    return pts;
  }, []);

  return (
    <group>
      {points.map((line, i) => (
        <Line
          key={i}
          points={[line.start, line.end]}
          color={lineColor}
          transparent
          opacity={lineOpacity}
          lineWidth={1}
        />
      ))}
      <Line
        points={circlePoints}
        color={lineColor}
        transparent
        opacity={lineOpacity}
        lineWidth={1}
      />
    </group>
  );
}

// ═══════════════════════════════════════════
// PLAYER LABEL
// ═══════════════════════════════════════════

function PlayerLabel({
  position,
  name,
  jersey,
  opacity,
}: {
  position: [number, number, number];
  name: string;
  jersey: number;
  opacity: number;
}) {
  if (opacity < 0.05) return null;
  const shortName = name.split(" ").pop() || name;

  return (
    <Html
      position={[position[0], position[1] + 2.2, position[2]]}
      center
      style={{
        pointerEvents: "none",
        userSelect: "none",
        whiteSpace: "nowrap",
        transition: "opacity 0.3s ease",
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "10px",
          fontWeight: 700,
          color: "rgba(255,255,255,0.9)",
          textShadow: "0 0 8px rgba(0,212,255,0.5), 0 1px 3px rgba(0,0,0,0.8)",
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        <div style={{ fontSize: "8px", opacity: 0.6 }}>#{jersey}</div>
        <div>{shortName}</div>
      </div>
    </Html>
  );
}

// ═══════════════════════════════════════════
// HOVER INFO PANEL (glassmorphism overlay)
// ═══════════════════════════════════════════

function HoverPanel({
  node,
  position,
}: {
  node: NetworkNode;
  position: [number, number, number];
}) {
  return (
    <Html
      position={[position[0], position[1] + 4.5, position[2]]}
      center
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div
        style={{
          background: "rgba(10, 10, 20, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(0, 212, 255, 0.2)",
          borderRadius: "10px",
          padding: "10px 14px",
          minWidth: "160px",
          boxShadow:
            "0 4px 20px rgba(0,0,0,0.5), 0 0 15px rgba(0,212,255,0.1)",
        }}
      >
        <div
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "12px",
            fontWeight: 700,
            color: "#fff",
            marginBottom: "2px",
          }}
        >
          #{node.jersey} {node.name.split(" ").pop()}
        </div>
        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "9px",
            color: node.color,
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {node.position} — {node.posGroup}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
          }}
        >
          <MetricBox label="Degree" value={node.degree.toString()} color="#00d4ff" />
          <MetricBox
            label="Betweenness"
            value={node.betweenness.toFixed(4)}
            color="#ffd700"
          />
        </div>
      </div>
    </Html>
  );
}

function MetricBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: "6px",
        padding: "4px 6px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "7px",
          color: "rgba(255,255,255,0.4)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "2px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "12px",
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SCENE CONTENT
// ═══════════════════════════════════════════

function NetworkScene({ data }: { data: NetworkData }) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [lockedId, setLockedId] = useState<number | null>(null);

  const activeId = lockedId ?? hoveredId;

  // Build a set of connected player IDs for the active node
  const connectedIds = useMemo(() => {
    if (activeId === null) return null;
    const ids = new Set<number>([activeId]);
    for (const edge of data.edges) {
      if (edge.source === activeId) ids.add(edge.target);
      if (edge.target === activeId) ids.add(edge.source);
    }
    return ids;
  }, [activeId, data.edges]);

  // Build node lookup
  const nodeMap = useMemo(() => {
    const map = new Map<number, NetworkNode>();
    for (const n of data.nodes) map.set(n.playerId, n);
    return map;
  }, [data.nodes]);

  const handleNodeHover = useCallback(
    (id: number | null) => {
      if (lockedId === null) setHoveredId(id);
    },
    [lockedId]
  );

  const handleNodeClick = useCallback(
    (id: number) => {
      setLockedId((prev) => (prev === id ? null : id));
      setHoveredId(null);
    },
    []
  );

  // Click on background to unlock
  const handleBgClick = useCallback(() => {
    setLockedId(null);
    setHoveredId(null);
  }, []);

  return (
    <>
      {/* Background click catcher */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        onClick={handleBgClick}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <PitchGround />
      <PitchLines />

      {/* Ambient + directional lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[30, 40, 20]} intensity={0.3} color="#ffffff" />
      <pointLight position={[0, 15, 0]} intensity={0.5} color="#00d4ff" distance={80} />

      {/* Neon tube edges */}
      {data.edges.map((edge) => {
        const srcNode = nodeMap.get(edge.source);
        const tgtNode = nodeMap.get(edge.target);
        if (!srcNode || !tgtNode) return null;

        // Determine opacity based on selection state
        let edgeOpacity = 0.3 + edge.weightNorm * 0.7;
        if (activeId !== null && connectedIds) {
          const isConnected =
            (edge.source === activeId || edge.target === activeId);
          edgeOpacity = isConnected
            ? 0.5 + edge.weightNorm * 0.5
            : DEEMPHASIS_OPACITY;
        }

        // Use the color of the passer (source) for the tube
        const tubeColor =
          activeId !== null && connectedIds
            ? (edge.source === activeId || edge.target === activeId)
              ? nodeMap.get(activeId)?.color || "#00d4ff"
              : "#222233"
            : "#00d4ff";

        const thickness =
          MIN_TUBE_THICKNESS + edge.weightNorm * (MAX_TUBE_THICKNESS - MIN_TUBE_THICKNESS);

        return (
          <NeonTube
            key={`${edge.source}-${edge.target}`}
            start={[srcNode.x, NODE_Y * 0.3, srcNode.z]}
            end={[tgtNode.x, NODE_Y * 0.3, tgtNode.z]}
            color={tubeColor}
            thickness={thickness}
            opacity={edgeOpacity}
          />
        );
      })}

      {/* Glass node spheres */}
      {data.nodes.map((node) => {
        const radius =
          MIN_NODE_RADIUS + node.degreeNorm * (MAX_NODE_RADIUS - MIN_NODE_RADIUS);

        let nodeOpacity = 1;
        let glowIntensity = 1;
        if (activeId !== null && connectedIds) {
          if (connectedIds.has(node.playerId)) {
            nodeOpacity = 1;
            glowIntensity = node.playerId === activeId ? 1.5 : 1;
          } else {
            nodeOpacity = DEEMPHASIS_OPACITY;
            glowIntensity = 0.1;
          }
        }

        return (
          <group key={node.playerId}>
            <GlassNode
              position={[node.x, NODE_Y, node.z]}
              color={node.color}
              radius={radius}
              opacity={nodeOpacity}
              glowIntensity={glowIntensity}
              onPointerOver={() => handleNodeHover(node.playerId)}
              onPointerOut={() => handleNodeHover(null)}
              onClick={() => handleNodeClick(node.playerId)}
            />
            <PlayerLabel
              position={[node.x, NODE_Y, node.z]}
              name={node.name}
              jersey={node.jersey}
              opacity={
                activeId === null
                  ? 0.8
                  : connectedIds?.has(node.playerId)
                    ? 1
                    : 0.05
              }
            />
          </group>
        );
      })}

      {/* Hover/locked info panel */}
      {activeId !== null && nodeMap.has(activeId) && (
        <HoverPanel
          node={nodeMap.get(activeId)!}
          position={[
            nodeMap.get(activeId)!.x,
            NODE_Y,
            nodeMap.get(activeId)!.z,
          ]}
        />
      )}

      {/* Post-processing: Bloom + Vignette */}
      <EffectComposer>
        <Bloom
          intensity={1.2}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </>
  );
}

// ═══════════════════════════════════════════
// CAMERA CONTROLLER
// ═══════════════════════════════════════════

function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 70, 35);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

// ═══════════════════════════════════════════
// POSITION LEGEND
// ═══════════════════════════════════════════

function PositionLegend() {
  const items = [
    { label: "Defenders", color: "#ff69b4" },
    { label: "Midfielders", color: "#9b59b6" },
    { label: "Att. Mids / Wings", color: "#00d4ff" },
    { label: "Strikers", color: "#ffd700" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        bottom: "12px",
        left: "12px",
        display: "flex",
        gap: "12px",
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "9px",
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.03em",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: item.color,
              boxShadow: `0 0 6px ${item.color}`,
              display: "inline-block",
            }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// EXPORTED COMPONENT
// ═══════════════════════════════════════════

interface PassingNetwork3DProps {
  isModal?: boolean;
}

export default function PassingNetwork3D({ isModal = false }: PassingNetwork3DProps) {
  const [data, setData] = useState<NetworkData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/miami_network.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-xl"
        style={{
          aspectRatio: isModal ? undefined : "16/9",
          height: isModal ? "100%" : undefined,
          background: "#0a0a14",
          color: "#ff6b6b",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "12px",
        }}
      >
        Error loading network data: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="flex items-center justify-center rounded-xl"
        style={{
          aspectRatio: isModal ? undefined : "16/9",
          height: isModal ? "100%" : undefined,
          background: "#0a0a14",
        }}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.3)",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "11px",
          }}
        >
          Loading passing network…
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        aspectRatio: isModal ? undefined : "16/9",
        height: isModal ? "100%" : undefined,
        background: "#0a0a14",
      }}
    >
      <Canvas
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ background: "#0a0a14" }}
      >
        <Suspense fallback={null}>
          <CameraSetup />
          <OrthographicCamera
            makeDefault
            zoom={isModal ? 7 : 5.5}
            near={0.1}
            far={200}
            position={[0, 70, 35]}
          />
          <NetworkScene data={data} />
        </Suspense>
      </Canvas>
      <PositionLegend />

      {/* Match info badge */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "9px",
          color: "rgba(255,255,255,0.3)",
          textAlign: "right",
          pointerEvents: "none",
          lineHeight: 1.4,
        }}
      >
        <div>Inter Miami 4-0 Toronto FC</div>
        <div>Sept 20, 2023 · MLS</div>
      </div>
    </div>
  );
}
