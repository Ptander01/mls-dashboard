/**
 * PassingNetwork3D — Cinematic 3D passing network & centrality visualization.
 *
 * Visual polish v2:
 *   - Stadium atmosphere: exponential fog, floodlight cones, volumetric haze
 *   - Position-colored neon tubes (DF=pink, MF=purple, AM=cyan, FW=gold)
 *   - Aggressive node size scaling for centrality hierarchy
 *   - On-canvas glassmorphism "NETWORK METRICS" card
 *   - Stronger bloom with lower threshold for plasma glow
 *   - Richer pitch ground with grass-like dark texture
 */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
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
// CONSTANTS — v2 aggressive scaling
// ═══════════════════════════════════════════

const NODE_Y = 1.0;
const MIN_NODE_RADIUS = 0.8;
const MAX_NODE_RADIUS = 2.6;
const MIN_TUBE_THICKNESS = 0.04;
const MAX_TUBE_THICKNESS = 0.22;
const DEEMPHASIS_OPACITY = 0.06;
const PITCH_HALF_X = 60;
const PITCH_HALF_Z = 40;

// Position group color map
const POS_COLOR: Record<string, string> = {
  Defender: "#ff69b4",
  Midfielder: "#9b59b6",
  "Attacking Mid": "#00d4ff",
  Wing: "#00d4ff",
  Striker: "#ffd700",
};

function getEdgeColor(srcNode: NetworkNode, tgtNode: NetworkNode): string {
  // Blend source and target colors for a gradient-like feel
  const srcC = new THREE.Color(POS_COLOR[srcNode.posGroup] || srcNode.color);
  const tgtC = new THREE.Color(POS_COLOR[tgtNode.posGroup] || tgtNode.color);
  const blended = new THREE.Color().lerpColors(srcC, tgtC, 0.5);
  return "#" + blended.getHexString();
}

// ═══════════════════════════════════════════
// PITCH GROUND — dark grass with subtle texture
// ═══════════════════════════════════════════

function PitchGround() {
  const texture = useMemo(() => {
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Dark base with slight green tint (like night pitch)
    ctx.fillStyle = "#080e08";
    ctx.fillRect(0, 0, size, size);

    // Grass stripe pattern
    for (let i = 0; i < size; i += 32) {
      ctx.fillStyle = i % 64 === 0 ? "rgba(15,30,15,0.4)" : "rgba(10,20,10,0.3)";
      ctx.fillRect(0, i, size, 16);
    }

    // Subtle noise for texture
    const imgData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + noise));
      imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1] + noise));
      imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle grid overlay
    ctx.strokeStyle = "rgba(0, 212, 255, 0.025)";
    ctx.lineWidth = 1;
    const step = size / 20;
    for (let i = 0; i <= 20; i++) {
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
      <planeGeometry args={[PITCH_HALF_X * 2 + 20, PITCH_HALF_Z * 2 + 20]} />
      <meshStandardMaterial
        map={texture}
        color="#0a1a0a"
        roughness={0.92}
        metalness={0.02}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════
// PITCH LINES
// ═══════════════════════════════════════════

function PitchLines() {
  const lineColor = "#ffffff";
  const lineOpacity = 0.15;

  const points = useMemo(() => {
    const lines: { start: THREE.Vector3; end: THREE.Vector3 }[] = [];
    const y = 0.02;
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
    const paW = 16.5 * (hx / 52.5);
    const paH = 20.15 * (hz / 34);
    lines.push(
      { start: new THREE.Vector3(-hx, y, -paH), end: new THREE.Vector3(-hx + paW, y, -paH) },
      { start: new THREE.Vector3(-hx + paW, y, -paH), end: new THREE.Vector3(-hx + paW, y, paH) },
      { start: new THREE.Vector3(-hx + paW, y, paH), end: new THREE.Vector3(-hx, y, paH) },
    );
    lines.push(
      { start: new THREE.Vector3(hx, y, -paH), end: new THREE.Vector3(hx - paW, y, -paH) },
      { start: new THREE.Vector3(hx - paW, y, -paH), end: new THREE.Vector3(hx - paW, y, paH) },
      { start: new THREE.Vector3(hx - paW, y, paH), end: new THREE.Vector3(hx, y, paH) },
    );

    // Goal areas (6-yard box)
    const gaW = 5.5 * (hx / 52.5);
    const gaH = 9.16 * (hz / 34);
    lines.push(
      { start: new THREE.Vector3(-hx, y, -gaH), end: new THREE.Vector3(-hx + gaW, y, -gaH) },
      { start: new THREE.Vector3(-hx + gaW, y, -gaH), end: new THREE.Vector3(-hx + gaW, y, gaH) },
      { start: new THREE.Vector3(-hx + gaW, y, gaH), end: new THREE.Vector3(-hx, y, gaH) },
    );
    lines.push(
      { start: new THREE.Vector3(hx, y, -gaH), end: new THREE.Vector3(hx - gaW, y, -gaH) },
      { start: new THREE.Vector3(hx - gaW, y, -gaH), end: new THREE.Vector3(hx - gaW, y, gaH) },
      { start: new THREE.Vector3(hx - gaW, y, gaH), end: new THREE.Vector3(hx, y, gaH) },
    );

    return lines;
  }, []);

  // Center circle
  const circlePoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 64;
    const r = 9.15 * (PITCH_HALF_X / 52.5);
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * r, 0.02, Math.sin(angle) * r));
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
          lineWidth={1.5}
        />
      ))}
      <Line
        points={circlePoints}
        color={lineColor}
        transparent
        opacity={lineOpacity}
        lineWidth={1.5}
      />
    </group>
  );
}

// ═══════════════════════════════════════════
// STADIUM FLOODLIGHTS
// ═══════════════════════════════════════════

function StadiumLights() {
  return (
    <group>
      {/* Four corner floodlight towers */}
      {[
        [-PITCH_HALF_X - 10, 60, -PITCH_HALF_Z - 10],
        [PITCH_HALF_X + 10, 60, -PITCH_HALF_Z - 10],
        [-PITCH_HALF_X - 10, 60, PITCH_HALF_Z + 10],
        [PITCH_HALF_X + 10, 60, PITCH_HALF_Z + 10],
      ].map((pos, i) => (
        <group key={i}>
          <spotLight
            position={pos as [number, number, number]}
            target-position={[0, 0, 0]}
            angle={Math.PI / 4}
            penumbra={0.8}
            intensity={0.4}
            color="#e8e0d0"
            distance={150}
            decay={1.5}
          />
          {/* Visible light cone glow */}
          <pointLight
            position={pos as [number, number, number]}
            intensity={0.15}
            color="#ffe8c0"
            distance={40}
          />
        </group>
      ))}

      {/* Overhead key light — warm white */}
      <directionalLight
        position={[0, 80, -20]}
        intensity={0.35}
        color="#fff5e6"
      />

      {/* Fill light from below-camera angle */}
      <directionalLight
        position={[0, 30, 50]}
        intensity={0.15}
        color="#c0d0ff"
      />

      {/* Ambient base */}
      <ambientLight intensity={0.08} color="#1a1a2e" />

      {/* Hemisphere light: sky blue top, dark ground */}
      <hemisphereLight
        args={["#1a2040", "#050808", 0.2]}
      />

      {/* Central overhead cyan accent */}
      <pointLight
        position={[0, 25, 0]}
        intensity={0.3}
        color="#00d4ff"
        distance={100}
        decay={2}
      />
    </group>
  );
}

// ═══════════════════════════════════════════
// ATMOSPHERIC HAZE PARTICLES
// ═══════════════════════════════════════════

function AtmosphericHaze() {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 200;

  const { positions, opacities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const ops = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 160;
      pos[i * 3 + 1] = Math.random() * 40 + 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
      ops[i] = Math.random() * 0.15 + 0.02;
    }
    return { positions: pos, opacities: ops };
  }, []);

  useFrame(({ clock }) => {
    if (particlesRef.current) {
      const geo = particlesRef.current.geometry;
      const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] += Math.sin(clock.elapsedTime * 0.2 + i) * 0.01;
        arr[i * 3] += Math.cos(clock.elapsedTime * 0.1 + i * 0.5) * 0.005;
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#e8e0d0"
        size={1.5}
        transparent
        opacity={0.06}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// ═══════════════════════════════════════════
// PLAYER LABEL
// ═══════════════════════════════════════════

function PlayerLabel({
  position,
  name,
  jersey,
  color,
  opacity,
}: {
  position: [number, number, number];
  name: string;
  jersey: number;
  color: string;
  opacity: number;
}) {
  if (opacity < 0.05) return null;
  const shortName = name.split(" ").pop() || name;

  return (
    <Html
      position={[position[0], position[1] + 2.8, position[2]]}
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
          fontSize: "11px",
          fontWeight: 700,
          color: "rgba(255,255,255,0.95)",
          textShadow: `0 0 10px ${color}80, 0 0 20px ${color}40, 0 2px 4px rgba(0,0,0,0.9)`,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
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
      position={[position[0], position[1] + 5, position[2]]}
      center
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div
        style={{
          background: "rgba(8, 8, 16, 0.9)",
          backdropFilter: "blur(16px)",
          border: `1px solid ${node.color}40`,
          borderRadius: "10px",
          padding: "10px 14px",
          minWidth: "170px",
          boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 20px ${node.color}20`,
        }}
      >
        <div
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "13px",
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          <MetricBox label="Degree" value={node.degree.toString()} color="#00d4ff" />
          <MetricBox label="C_B" value={node.betweenness.toFixed(4)} color="#ffd700" />
        </div>
      </div>
    </Html>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
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

  // Find top betweenness and top degree nodes for metrics card
  const topBetweenness = useMemo(() => {
    return data.nodes.reduce((a, b) => (a.betweenness > b.betweenness ? a : b));
  }, [data.nodes]);

  const topDegree = useMemo(() => {
    return data.nodes.reduce((a, b) => (a.degree > b.degree ? a : b));
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
      <StadiumLights />
      <AtmosphericHaze />

      {/* Scene fog for depth */}
      <fogExp2 attach="fog" args={["#060810", 0.006]} />

      {/* Neon tube edges — position-colored */}
      {data.edges.map((edge) => {
        const srcNode = nodeMap.get(edge.source);
        const tgtNode = nodeMap.get(edge.target);
        if (!srcNode || !tgtNode) return null;

        // Determine opacity based on selection state
        let edgeOpacity = 0.25 + edge.weightNorm * 0.75;
        if (activeId !== null && connectedIds) {
          const isConnected =
            edge.source === activeId || edge.target === activeId;
          edgeOpacity = isConnected
            ? 0.5 + edge.weightNorm * 0.5
            : DEEMPHASIS_OPACITY;
        }

        // Position-colored: blend source and target colors
        let tubeColor: string;
        if (activeId !== null && connectedIds) {
          const isConnected =
            edge.source === activeId || edge.target === activeId;
          tubeColor = isConnected
            ? getEdgeColor(srcNode, tgtNode)
            : "#111118";
        } else {
          tubeColor = getEdgeColor(srcNode, tgtNode);
        }

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
        // Aggressive scaling: use a mix of degree and betweenness
        const combinedNorm = node.degreeNorm * 0.6 + node.betweennessNorm * 0.4;
        const radius =
          MIN_NODE_RADIUS + combinedNorm * (MAX_NODE_RADIUS - MIN_NODE_RADIUS);

        let nodeOpacity = 1;
        let glowIntensity = 1;
        if (activeId !== null && connectedIds) {
          if (connectedIds.has(node.playerId)) {
            nodeOpacity = 1;
            glowIntensity = node.playerId === activeId ? 1.8 : 1.1;
          } else {
            nodeOpacity = DEEMPHASIS_OPACITY;
            glowIntensity = 0.05;
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
              color={node.color}
              opacity={
                activeId === null
                  ? 0.85
                  : connectedIds?.has(node.playerId)
                    ? 1
                    : 0.04
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

      {/* Post-processing: Stronger Bloom + Vignette */}
      <EffectComposer>
        <Bloom
          intensity={1.8}
          luminanceThreshold={0.08}
          luminanceSmoothing={0.85}
          mipmapBlur
        />
        <Vignette offset={0.25} darkness={0.75} />
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
// POSITION LEGEND (bottom-left overlay)
// ═══════════════════════════════════════════

function PositionLegend() {
  const items = [
    { label: "Defenders", color: "#ff69b4" },
    { label: "Midfielders", color: "#9b59b6" },
    { label: "Att. Mids/Wings", color: "#00d4ff" },
    { label: "Striker", color: "#ffd700" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        left: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
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
            gap: "6px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "9px",
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "0.03em",
          }}
        >
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: `radial-gradient(circle at 35% 35%, ${item.color}, ${item.color}88)`,
              boxShadow: `0 0 8px ${item.color}80`,
              display: "inline-block",
              border: `1px solid ${item.color}60`,
            }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// ON-CANVAS NETWORK METRICS CARD
// ═══════════════════════════════════════════

function NetworkMetricsCard({ data }: { data: NetworkData }) {
  const topBetweenness = useMemo(() => {
    return data.nodes.reduce((a, b) => (a.betweenness > b.betweenness ? a : b));
  }, [data.nodes]);

  const topDegree = useMemo(() => {
    return data.nodes.reduce((a, b) => (a.degree > b.degree ? a : b));
  }, [data.nodes]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "12px",
        right: "12px",
        zIndex: 10,
        pointerEvents: "none",
        background: "rgba(8, 8, 16, 0.8)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "8px",
        padding: "10px 14px",
        minWidth: "200px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "9px",
          fontWeight: 700,
          color: "rgba(255,255,255,0.5)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: "8px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: "5px",
        }}
      >
        Network Metrics
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <MetricRow
          label={`Betweenness: ${topBetweenness.shortName}`}
          metric="C_B"
          value={topBetweenness.betweenness.toFixed(4)}
        />
        <MetricRow
          label={`Degree: ${topDegree.shortName}`}
          metric="C_D"
          value={topDegree.degree.toString()}
        />
        <MetricRow
          label="Density"
          metric=""
          value={data.meta.density.toFixed(3)}
        />
      </div>
    </div>
  );
}

function MetricRow({
  label,
  metric,
  value,
}: {
  label: string;
  metric: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "9px",
        lineHeight: 1.5,
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
      <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>
        {metric ? `${metric}=` : ""}
        {value}
      </span>
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
          background: "#060810",
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
          background: "#060810",
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
        background: "#060810",
      }}
    >
      <Canvas
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        style={{ background: "#060810" }}
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
      <NetworkMetricsCard data={data} />

      {/* Match info badge — top right */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "9px",
          color: "rgba(255,255,255,0.35)",
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
