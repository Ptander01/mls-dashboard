/**
 * ShotMap3D — Museum-quality 3D shot map & xG visualization.
 *
 * Design language: Julian Anton / Craig Taylor — restrained elegance,
 * physical materiality, cinematic lighting, clean visual hierarchy.
 * The data is the hero; chrome is minimal.
 *
 * Every shot from Inter Miami 4-0 Toronto FC is rendered as a glass
 * sphere (power-curve scaled by xG) with outcome-differentiated neon
 * trajectory arcs. Goals are the visual heroes — thicker, brighter,
 * higher arcs. Non-goals recede gracefully.
 *
 * Reuses GlassNode and NeonTube from the Passing Network.
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
import { OrthographicCamera, Html } from "@react-three/drei";
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

interface ShotEvent {
  id: string;
  minute: number;
  second: number;
  team: string;
  player: string;
  location: [number, number];
  endLocation: [number, number];
  outcome: "goal" | "saved" | "off_target" | "blocked";
  outcomeRaw: string;
  xG: number;
  bodyPart: string;
  technique: string;
  shotType: string;
}

interface TeamSummary {
  name: string;
  shots: number;
  goals: number;
  saved: number;
  blocked: number;
  offTarget: number;
  totalXG: number;
  avgXG: number;
}

interface ShotData {
  matchId: number;
  matchLabel: string;
  matchDate: string;
  teams: TeamSummary[];
  shots: ShotEvent[];
  meta: {
    totalShots: number;
    totalGoals: number;
    coordinateSystem: string;
    source: string;
  };
}

export type TeamFilter = "both" | "Inter Miami" | "Toronto FC";
export type OutcomeFilter = {
  goals: boolean;
  saved: boolean;
  offTarget: boolean;
  blocked: boolean;
};

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════

const NODE_Y = 1.2;
const MIN_NODE_RADIUS = 0.45;
const MAX_NODE_RADIUS = 2.6;
const XG_POWER = 0.55; // power curve exponent for perceptual scaling
const DEEMPHASIS_OPACITY = 0.06;
const PITCH_HALF_X = 60;
const PITCH_HALF_Z = 40;
const SCENE_BG = "#040810";

// Refined outcome palette — restrained, not loud
const OUTCOME_COLOR: Record<string, string> = {
  goal: "#00c897",     // Emerald — the hero
  saved: "#e8a84c",    // Warm amber — muted gold
  off_target: "#c75050", // Muted coral — not screaming red
  blocked: "#4a5f78",  // Cool slate — intentional, not broken
};

// Outcome visual hierarchy multipliers
const OUTCOME_TUBE_THICKNESS: Record<string, number> = {
  goal: 1.0,
  saved: 0.55,
  off_target: 0.4,
  blocked: 0.3,
};
const OUTCOME_TUBE_OPACITY: Record<string, number> = {
  goal: 0.85,
  saved: 0.45,
  off_target: 0.3,
  blocked: 0.2,
};
const OUTCOME_GLOW: Record<string, number> = {
  goal: 1.6,
  saved: 0.9,
  off_target: 0.7,
  blocked: 0.4,
};

// ═══════════════════════════════════════════
// PITCH GROUND — 2048px procedural texture
// Mow-stripe fibre, organic micro-noise, subtle sheen
// ═══════════════════════════════════════════

function PitchGround() {
  const texture = useMemo(() => {
    const size = 2048;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Deep dark base
    ctx.fillStyle = "#060d06";
    ctx.fillRect(0, 0, size, size);

    // Mow stripes — alternating luminance bands (horizontal = across pitch width)
    const stripeCount = 24;
    const stripeH = size / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      const even = i % 2 === 0;
      ctx.fillStyle = even ? "rgba(12,22,12,0.5)" : "rgba(8,16,8,0.5)";
      ctx.fillRect(0, i * stripeH, size, stripeH);
    }

    // Grass fibre texture — fine directional lines
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#0a1a0a";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 3 + Math.random() * 8;
      const angle = -0.1 + Math.random() * 0.2; // mostly vertical
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(angle) * len, y + Math.cos(angle) * len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Micro-noise for organic feel
    const imgData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 6;
      imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + noise));
      imgData.data[i + 1] = Math.max(
        0,
        Math.min(255, imgData.data[i + 1] + noise * 1.2)
      );
      imgData.data[i + 2] = Math.max(
        0,
        Math.min(255, imgData.data[i + 2] + noise * 0.5)
      );
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 2);
    tex.anisotropy = 16;
    return tex;
  }, []);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
      receiveShadow
    >
      <planeGeometry args={[PITCH_HALF_X * 2 + 16, PITCH_HALF_Z * 2 + 16]} />
      <meshStandardMaterial
        map={texture}
        color="#091209"
        roughness={0.88}
        metalness={0.04}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════
// PITCH LINES — Extruded planes with emissive chalk
// Physical width (0.18 units ≈ 12cm at scale)
// ═══════════════════════════════════════════

function ChalkLine({
  points,
  width = 0.18,
}: {
  points: [number, number, number][];
  width?: number;
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const hw = width / 2;

    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1, z1] = points[i];
      const [x2, y2, z2] = points[i + 1];

      // Direction vector
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len < 0.001) continue;

      // Perpendicular in XZ plane
      const nx = (-dz / len) * hw;
      const nz = (dx / len) * hw;

      // Quad as two triangles
      vertices.push(
        x1 + nx, y1, z1 + nz,
        x1 - nx, y1, z1 - nz,
        x2 + nx, y2, z2 + nz,
        x2 + nx, y2, z2 + nz,
        x1 - nx, y1, z1 - nz,
        x2 - nx, y2, z2 - nz
      );
    }

    shape.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    shape.computeVertexNormals();
    return shape;
  }, [points, width]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#e8e4dc"
        emissive="#e8e4dc"
        emissiveIntensity={0.08}
        transparent
        opacity={0.18}
        roughness={0.95}
        metalness={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function ChalkArc({
  center,
  radius,
  startAngle,
  endAngle,
  segments = 48,
  y = 0.03,
}: {
  center: [number, number];
  radius: number;
  startAngle: number;
  endAngle: number;
  segments?: number;
  y?: number;
}) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / segments);
      pts.push([
        center[0] + Math.cos(angle) * radius,
        y,
        center[1] + Math.sin(angle) * radius,
      ]);
    }
    return pts;
  }, [center, radius, startAngle, endAngle, segments, y]);

  return <ChalkLine points={points} />;
}

function PitchLines3D() {
  const y = 0.03;
  const hx = PITCH_HALF_X;
  const hz = PITCH_HALF_Z;

  // Penalty area dimensions (scaled from real 105×68m pitch)
  const paW = 16.5 * (hx / 52.5);
  const paH = 20.15 * (hz / 34);
  const gaW = 5.5 * (hx / 52.5);
  const gaH = 9.16 * (hz / 34);
  const circleR = 9.15 * (hx / 52.5);
  const penSpotX = 11 * (hx / 52.5);

  return (
    <group>
      {/* Outer boundary */}
      <ChalkLine points={[[-hx, y, -hz], [hx, y, -hz], [hx, y, hz], [-hx, y, hz], [-hx, y, -hz]]} />

      {/* Center line */}
      <ChalkLine points={[[0, y, -hz], [0, y, hz]]} />

      {/* Center circle */}
      <ChalkArc center={[0, 0]} radius={circleR} startAngle={0} endAngle={Math.PI * 2} y={y} />

      {/* Center spot */}
      <mesh position={[0, y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 16]} />
        <meshStandardMaterial color="#e8e4dc" emissive="#e8e4dc" emissiveIntensity={0.1} transparent opacity={0.2} />
      </mesh>

      {/* Left penalty area */}
      <ChalkLine points={[[-hx, y, -paH], [-hx + paW, y, -paH], [-hx + paW, y, paH], [-hx, y, paH]]} />
      {/* Left goal area */}
      <ChalkLine points={[[-hx, y, -gaH], [-hx + gaW, y, -gaH], [-hx + gaW, y, gaH], [-hx, y, gaH]]} />
      {/* Left penalty spot */}
      <mesh position={[-hx + penSpotX, y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 12]} />
        <meshStandardMaterial color="#e8e4dc" emissive="#e8e4dc" emissiveIntensity={0.1} transparent opacity={0.2} />
      </mesh>
      {/* Left penalty arc (D) */}
      <ChalkArc
        center={[-hx + penSpotX, 0]}
        radius={circleR}
        startAngle={-Math.acos(paW / circleR) + Math.PI}
        endAngle={Math.acos(paW / circleR) + Math.PI}
        y={y}
      />

      {/* Right penalty area */}
      <ChalkLine points={[[hx, y, -paH], [hx - paW, y, -paH], [hx - paW, y, paH], [hx, y, paH]]} />
      {/* Right goal area */}
      <ChalkLine points={[[hx, y, -gaH], [hx - gaW, y, -gaH], [hx - gaW, y, gaH], [hx, y, gaH]]} />
      {/* Right penalty spot */}
      <mesh position={[hx - penSpotX, y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 12]} />
        <meshStandardMaterial color="#e8e4dc" emissive="#e8e4dc" emissiveIntensity={0.1} transparent opacity={0.2} />
      </mesh>
      {/* Right penalty arc (D) */}
      <ChalkArc
        center={[hx - penSpotX, 0]}
        radius={circleR}
        startAngle={-Math.acos(paW / circleR)}
        endAngle={Math.acos(paW / circleR)}
        y={y}
      />
    </group>
  );
}

// ═══════════════════════════════════════════
// GOAL POSTS — Polished aluminium + translucent net
// ═══════════════════════════════════════════

function GoalFrame({ xSign }: { xSign: 1 | -1 }) {
  const goalWidth = 7.32 * (PITCH_HALF_Z / 34);
  const goalHeight = 2.44;
  const postR = 0.1;
  const netDepth = 2.0;

  // Net texture — procedural grid
  const netTexture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 0.8;
    const step = size / 12;
    for (let i = 0; i <= 12; i++) {
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
    tex.repeat.set(2, 1);
    return tex;
  }, []);

  const x = PITCH_HALF_X * xSign;

  return (
    <group position={[x, 0, 0]}>
      {/* Posts — polished aluminium */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[0, goalHeight / 2, (side * goalWidth) / 2]}
          castShadow
        >
          <cylinderGeometry args={[postR, postR, goalHeight, 12]} />
          <meshStandardMaterial
            color="#c0c8d0"
            metalness={0.85}
            roughness={0.15}
            emissive="#ffffff"
            emissiveIntensity={0.02}
          />
        </mesh>
      ))}

      {/* Crossbar */}
      <mesh
        position={[0, goalHeight, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[postR, postR, goalWidth + postR * 2, 12]} />
        <meshStandardMaterial
          color="#c0c8d0"
          metalness={0.85}
          roughness={0.15}
          emissive="#ffffff"
          emissiveIntensity={0.02}
        />
      </mesh>

      {/* Net — back plane */}
      <mesh position={[xSign * netDepth, goalHeight / 2, 0]}>
        <planeGeometry args={[0.01, goalHeight, 1, 1]} />
        <meshBasicMaterial
          map={netTexture}
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Net — side planes */}
      {[-1, 1].map((side) => (
        <mesh
          key={`net-side-${side}`}
          position={[
            (xSign * netDepth) / 2,
            goalHeight / 2,
            (side * goalWidth) / 2,
          ]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry args={[netDepth, goalHeight, 1, 1]} />
          <meshBasicMaterial
            map={netTexture}
            transparent
            opacity={0.04}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Net — top plane */}
      <mesh
        position={[(xSign * netDepth) / 2, goalHeight, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[netDepth, goalWidth, 1, 1]} />
        <meshBasicMaterial
          map={netTexture}
          transparent
          opacity={0.04}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════
// CINEMATIC LIGHTING — Asymmetric 3-point rig
// Key: cool overhead. Fill: warm side. Rim: behind goal.
// ═══════════════════════════════════════════

function CinematicLighting() {
  return (
    <group>
      {/* Key light — cool blue-white from upper-left behind camera */}
      <directionalLight
        position={[-25, 65, 45]}
        intensity={0.55}
        color="#c8d8f0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={150}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.002}
      />

      {/* Fill light — warm from the right side */}
      <directionalLight
        position={[40, 30, -20]}
        intensity={0.2}
        color="#f0d8b0"
      />

      {/* Rim light — cool edge definition from behind far goal */}
      <directionalLight
        position={[0, 15, -55]}
        intensity={0.25}
        color="#6080b0"
      />

      {/* Top-down wash for ground illumination */}
      <directionalLight
        position={[0, 80, 0]}
        intensity={0.18}
        color="#e0e8f0"
      />

      {/* Subtle accent on the attacking goal area */}
      <pointLight
        position={[50, 12, 0]}
        intensity={0.15}
        color="#00c897"
        distance={35}
        decay={2}
      />

      {/* Hemisphere — very subtle ambient fill */}
      <hemisphereLight args={["#101820", "#040608", 0.15]} />

      {/* Near-zero ambient — let shadows exist */}
      <ambientLight intensity={0.04} color="#0a1020" />
    </group>
  );
}

// ═══════════════════════════════════════════
// CONTACT SHADOW — ground glow beneath each node
// ═══════════════════════════════════════════

function ContactShadow({
  position,
  color,
  radius,
  opacity,
}: {
  position: [number, number, number];
  color: string;
  radius: number;
  opacity: number;
}) {
  const tex = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    grad.addColorStop(0, "rgba(255,255,255,0.6)");
    grad.addColorStop(0.3, "rgba(255,255,255,0.2)");
    grad.addColorStop(0.7, "rgba(255,255,255,0.04)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(canvas);
    t.needsUpdate = true;
    return t;
  }, []);

  const scale = radius * 4.5;

  return (
    <sprite
      position={[position[0], 0.04, position[2]]}
      scale={[scale, scale, 1]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <spriteMaterial
        map={tex}
        color={color}
        transparent
        opacity={opacity * 0.35}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

// ═══════════════════════════════════════════
// ATMOSPHERIC PARTICLES — restrained dust motes
// ═══════════════════════════════════════════

function AtmosphericDust() {
  const ref = useRef<THREE.Points>(null);
  const count = 120;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 140;
      pos[i * 3 + 1] = Math.random() * 25 + 3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    const t = clock.elapsedTime * 0.08;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += Math.sin(t + i * 0.4) * 0.004;
      arr[i * 3 + 1] += Math.cos(t + i * 0.25) * 0.002;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#304060"
        size={0.8}
        transparent
        opacity={0.06}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ═══════════════════════════════════════════
// SLOW CAMERA BREATHE — subtle life
// ═══════════════════════════════════════════

function CameraBreathe() {
  const { camera } = useThree();
  const basePos = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  useFrame(({ clock }) => {
    if (!initialized.current) {
      basePos.current.copy(camera.position);
      initialized.current = true;
    }
    const t = clock.elapsedTime;
    camera.position.x = basePos.current.x + Math.sin(t * 0.15) * 0.3;
    camera.position.y = basePos.current.y + Math.sin(t * 0.1) * 0.15;
  });

  return null;
}

// ═══════════════════════════════════════════
// SHOT TOOLTIP — Premium glassmorphism card
// ═══════════════════════════════════════════

function ShotTooltip({
  shot,
  position,
}: {
  shot: ShotEvent;
  position: [number, number, number];
}) {
  const color = OUTCOME_COLOR[shot.outcome] || "#4a5f78";
  const isGoal = shot.outcome === "goal";

  // Short player name: last name only
  const lastName = shot.player.split(" ").slice(-1)[0];

  return (
    <Html
      position={[position[0], position[1] + 3.5, position[2]]}
      center
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          background: "rgba(6, 8, 16, 0.92)",
          backdropFilter: "blur(16px)",
          borderLeft: `2px solid ${color}`,
          borderRadius: "6px",
          padding: "10px 14px",
          minWidth: "150px",
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.06)`,
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          animation: "fadeIn 0.2s ease-out",
        }}
      >
        {/* Player name */}
        <div
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "0.02em",
            marginBottom: "6px",
          }}
        >
          {lastName}
          <span
            style={{
              fontSize: "9px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.35)",
              marginLeft: "6px",
            }}
          >
            {shot.minute}&apos;
          </span>
        </div>

        {/* xG — hero number */}
        <div
          style={{
            fontSize: isGoal ? "20px" : "16px",
            fontWeight: 800,
            color,
            lineHeight: 1,
            marginBottom: "6px",
            letterSpacing: "-0.02em",
          }}
        >
          {shot.xG.toFixed(3)}
          <span
            style={{
              fontSize: "8px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.3)",
              marginLeft: "4px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            xG
          </span>
        </div>

        {/* Metadata — minimal */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            fontSize: "8px",
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color }}>{shot.outcomeRaw}</span>
          <span>{shot.bodyPart}</span>
        </div>
      </div>
    </Html>
  );
}

// ═══════════════════════════════════════════
// SCENE CONTENT
// ═══════════════════════════════════════════

function ShotScene({
  data,
  teamFilter,
  outcomeFilter,
}: {
  data: ShotData;
  teamFilter: TeamFilter;
  outcomeFilter: OutcomeFilter;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [lockedId, setLockedId] = useState<string | null>(null);
  const activeId = lockedId ?? hoveredId;

  const filteredShots = useMemo(() => {
    return data.shots.filter((s) => {
      if (teamFilter !== "both" && s.team !== teamFilter) return false;
      if (s.outcome === "goal" && !outcomeFilter.goals) return false;
      if (s.outcome === "saved" && !outcomeFilter.saved) return false;
      if (s.outcome === "off_target" && !outcomeFilter.offTarget) return false;
      if (s.outcome === "blocked" && !outcomeFilter.blocked) return false;
      return true;
    });
  }, [data.shots, teamFilter, outcomeFilter]);

  // Compute max xG for power-curve normalization
  const maxXG = useMemo(
    () => Math.max(...data.shots.map((s) => s.xG), 0.01),
    [data.shots]
  );

  const handleNodeHover = useCallback(
    (id: string | null) => {
      if (lockedId === null) setHoveredId(id);
    },
    [lockedId]
  );

  const handleNodeClick = useCallback((id: string) => {
    setLockedId((prev) => (prev === id ? null : id));
    setHoveredId(null);
  }, []);

  const handleBgClick = useCallback(() => {
    setLockedId(null);
    setHoveredId(null);
  }, []);

  return (
    <>
      {/* Background click catcher */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, 0]}
        onClick={handleBgClick}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <PitchGround />
      <PitchLines3D />
      <GoalFrame xSign={1} />
      <GoalFrame xSign={-1} />
      <CinematicLighting />
      <AtmosphericDust />
      <CameraBreathe />

      {/* Fog — subtle depth falloff */}
      <fogExp2 attach="fog" args={[SCENE_BG, 0.005]} />

      {/* ── Trajectory arcs ── */}
      {filteredShots.map((shot) => {
        const color = OUTCOME_COLOR[shot.outcome] || "#4a5f78";
        const isActive = activeId === shot.id;
        const isDeemphasized = activeId !== null && !isActive;

        // Outcome-differentiated thickness
        const baseThickness = 0.06 * (OUTCOME_TUBE_THICKNESS[shot.outcome] || 0.4);
        const thickness = baseThickness + shot.xG * 0.06;

        // Outcome-differentiated opacity
        let tubeOpacity = OUTCOME_TUBE_OPACITY[shot.outcome] || 0.3;
        if (isDeemphasized) tubeOpacity = DEEMPHASIS_OPACITY;
        if (isActive) tubeOpacity = Math.min(1, tubeOpacity * 1.6);

        return (
          <NeonTube
            key={`tube-${shot.id}`}
            start={[shot.location[0], NODE_Y * 0.25, shot.location[1]]}
            end={[shot.endLocation[0], NODE_Y * 0.25, shot.endLocation[1]]}
            color={isDeemphasized ? "#0a0c14" : color}
            thickness={thickness}
            opacity={tubeOpacity}
          />
        );
      })}

      {/* ── Shot nodes + contact shadows ── */}
      {filteredShots.map((shot) => {
        const color = OUTCOME_COLOR[shot.outcome] || "#4a5f78";
        const isActive = activeId === shot.id;
        const isDeemphasized = activeId !== null && !isActive;

        // Power-curve radius scaling
        const normalizedXG = shot.xG / maxXG;
        const radius =
          MIN_NODE_RADIUS +
          Math.pow(normalizedXG, XG_POWER) * (MAX_NODE_RADIUS - MIN_NODE_RADIUS);

        let nodeOpacity = 1;
        let glowIntensity = OUTCOME_GLOW[shot.outcome] || 0.7;
        if (isDeemphasized) {
          nodeOpacity = DEEMPHASIS_OPACITY + 0.04; // slightly more visible than tubes
          glowIntensity = 0.03;
        }
        if (isActive) {
          glowIntensity = Math.min(2.5, glowIntensity * 1.5);
        }

        return (
          <group key={`node-${shot.id}`}>
            {/* Contact shadow on ground */}
            <ContactShadow
              position={[shot.location[0], 0, shot.location[1]]}
              color={color}
              radius={radius}
              opacity={isDeemphasized ? DEEMPHASIS_OPACITY : 1}
            />
            <GlassNode
              position={[shot.location[0], NODE_Y, shot.location[1]]}
              color={color}
              radius={radius}
              opacity={nodeOpacity}
              glowIntensity={glowIntensity}
              onPointerOver={() => handleNodeHover(shot.id)}
              onPointerOut={() => handleNodeHover(null)}
              onClick={() => handleNodeClick(shot.id)}
            />
          </group>
        );
      })}

      {/* Tooltip */}
      {activeId !== null &&
        (() => {
          const shot = filteredShots.find((s) => s.id === activeId);
          if (!shot) return null;
          return (
            <ShotTooltip
              shot={shot}
              position={[shot.location[0], NODE_Y, shot.location[1]]}
            />
          );
        })()}

      {/* Post-processing — refined bloom */}
      <EffectComposer>
        <Bloom
          intensity={1.15}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette offset={0.3} darkness={0.65} />
      </EffectComposer>
    </>
  );
}

// ═══════════════════════════════════════════
// CAMERA SETUP — Lower angle toward attacking goal
// ═══════════════════════════════════════════

function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(5, 60, 40);
    camera.lookAt(10, 0, 0);
  }, [camera]);
  return null;
}

// ═══════════════════════════════════════════
// OVERLAY — Single consolidated legend + metrics
// Minimal, transparent, not competing with the scene
// ═══════════════════════════════════════════

function SceneOverlay({
  data,
  teamFilter,
}: {
  data: ShotData;
  teamFilter: TeamFilter;
}) {
  const stats = useMemo(() => {
    const relevant =
      teamFilter === "both"
        ? data.shots
        : data.shots.filter((s) => s.team === teamFilter);
    const goals = relevant.filter((s) => s.outcome === "goal").length;
    const totalXG = relevant.reduce((sum, s) => sum + s.xG, 0);
    return { shots: relevant.length, goals, totalXG: totalXG.toFixed(2) };
  }, [data.shots, teamFilter]);

  const legendItems = [
    { label: "Goal", color: OUTCOME_COLOR.goal },
    { label: "Saved", color: OUTCOME_COLOR.saved },
    { label: "Off Target", color: OUTCOME_COLOR.off_target },
    { label: "Blocked", color: OUTCOME_COLOR.blocked },
  ];

  return (
    <>
      {/* Bottom-left: Legend */}
      <div
        style={{
          position: "absolute",
          bottom: "14px",
          left: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "5px",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        {legendItems.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              fontFamily: "var(--font-body, 'Space Grotesk', sans-serif)",
              fontSize: "9px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.04em",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: item.color,
                boxShadow: `0 0 6px ${item.color}60`,
                display: "inline-block",
              }}
            />
            {item.label}
          </div>
        ))}
      </div>

      {/* Bottom-right: Minimal metrics */}
      <div
        style={{
          position: "absolute",
          bottom: "14px",
          right: "14px",
          zIndex: 10,
          pointerEvents: "none",
          display: "flex",
          gap: "16px",
          alignItems: "baseline",
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1,
            }}
          >
            {stats.shots}
          </div>
          <div
            style={{
              fontSize: "7px",
              color: "rgba(255,255,255,0.25)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginTop: "2px",
            }}
          >
            Shots
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: OUTCOME_COLOR.goal,
              lineHeight: 1,
            }}
          >
            {stats.goals}
          </div>
          <div
            style={{
              fontSize: "7px",
              color: "rgba(255,255,255,0.25)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginTop: "2px",
            }}
          >
            Goals
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "rgba(0,212,255,0.8)",
              lineHeight: 1,
            }}
          >
            {stats.totalXG}
          </div>
          <div
            style={{
              fontSize: "7px",
              color: "rgba(255,255,255,0.25)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginTop: "2px",
            }}
          >
            xG
          </div>
        </div>
      </div>

      {/* Top-right: Match badge — whisper-quiet */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          right: "14px",
          fontFamily: "var(--font-body, 'Space Grotesk', sans-serif)",
          fontSize: "9px",
          fontWeight: 500,
          color: "rgba(255,255,255,0.2)",
          textAlign: "right",
          pointerEvents: "none",
          lineHeight: 1.5,
          letterSpacing: "0.02em",
        }}
      >
        <div>Inter Miami 4 — 0 Toronto FC</div>
        <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.12)" }}>
          Sept 20, 2023
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════
// EXPORTED COMPONENT
// ═══════════════════════════════════════════

interface ShotMap3DProps {
  isModal?: boolean;
  teamFilter?: TeamFilter;
  outcomeFilter?: OutcomeFilter;
}

export default function ShotMap3D({
  isModal = false,
  teamFilter = "both",
  outcomeFilter = { goals: true, saved: true, offTarget: true, blocked: true },
}: ShotMap3DProps) {
  const [data, setData] = useState<ShotData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/miami_shots.json")
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
          background: SCENE_BG,
          color: "#c75050",
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          fontSize: "11px",
        }}
      >
        Error loading shot data: {error}
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
          background: SCENE_BG,
        }}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.2)",
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Loading…
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
        background: SCENE_BG,
      }}
    >
      <Canvas
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
          shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap },
        }}
        dpr={[1, 2]}
        style={{ background: SCENE_BG }}
      >
        <Suspense fallback={null}>
          <CameraSetup />
          <OrthographicCamera
            makeDefault
            zoom={isModal ? 7.5 : 5.8}
            near={0.1}
            far={200}
            position={[5, 60, 40]}
          />
          <ShotScene
            data={data}
            teamFilter={teamFilter}
            outcomeFilter={outcomeFilter}
          />
        </Suspense>
      </Canvas>

      <SceneOverlay data={data} teamFilter={teamFilter} />
    </div>
  );
}
