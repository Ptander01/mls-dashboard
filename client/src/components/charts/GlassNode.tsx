/**
 * GlassNode — Cinematic 3D glass sphere representing a player node.
 *
 * Visual polish v2:
 *   - Dramatic MeshPhysicalMaterial with high transmission + IOR for crystal-ball refraction
 *   - Procedural HDR-style environment map for specular highlights (no external asset)
 *   - Layered glow: inner core + outer radial sprite + rim highlight ring
 *   - Aggressive hover scale-up with spring-like animation
 *   - Position-based color coding via emissive + attenuation
 */

import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface GlassNodeProps {
  position: [number, number, number];
  color: string;
  radius: number;
  opacity: number;
  glowIntensity: number;
  onPointerOver?: (e: THREE.Event) => void;
  onPointerOut?: (e: THREE.Event) => void;
  onClick?: (e: THREE.Event) => void;
}

// Generate a simple procedural environment map for specular highlights
function makeEnvMap(): THREE.CubeTexture {
  const size = 64;
  const faces: HTMLCanvasElement[] = [];
  for (let f = 0; f < 6; f++) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    // Dark base with subtle gradient to simulate studio lighting
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, f < 2 ? "#1a1a2e" : "#0d0d1a");
    grad.addColorStop(0.5, "#111122");
    grad.addColorStop(1, f >= 4 ? "#1e1e3a" : "#0a0a14");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    // Add a bright spot on top face for specular highlight
    if (f === 2) {
      const spot = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      spot.addColorStop(0, "rgba(200,220,255,0.6)");
      spot.addColorStop(0.3, "rgba(150,180,220,0.2)");
      spot.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, size, size);
    }
    // Add a secondary highlight on front face
    if (f === 4) {
      const spot2 = ctx.createRadialGradient(size * 0.3, size * 0.3, 0, size * 0.3, size * 0.3, size * 0.4);
      spot2.addColorStop(0, "rgba(180,200,255,0.35)");
      spot2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = spot2;
      ctx.fillRect(0, 0, size, size);
    }
    faces.push(canvas);
  }
  const loader = new THREE.CubeTextureLoader();
  // CubeTexture from canvases
  const tex = new THREE.CubeTexture(faces);
  tex.needsUpdate = true;
  return tex;
}

// Singleton env map
let _envMap: THREE.CubeTexture | null = null;
function getEnvMap() {
  if (!_envMap) _envMap = makeEnvMap();
  return _envMap;
}

export default function GlassNode({
  position,
  color,
  radius,
  opacity,
  glowIntensity,
  onPointerOver,
  onPointerOut,
  onClick,
}: GlassNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const targetScale = useRef(1);

  const threeColor = useMemo(() => new THREE.Color(color), [color]);
  const envMap = useMemo(() => getEnvMap(), []);

  // Glow texture — radial gradient with color tint
  const glowTexture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.15, "rgba(255,255,255,0.5)");
    gradient.addColorStop(0.4, "rgba(255,255,255,0.15)");
    gradient.addColorStop(0.7, "rgba(255,255,255,0.03)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Floating animation + smooth hover scale
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.position.y =
        Math.sin(clock.elapsedTime * 0.6 + position[0] * 0.5) * 0.12;
    }
    if (groupRef.current) {
      targetScale.current = hovered ? 1.25 : 1;
      const s = groupRef.current.scale.x;
      const newS = THREE.MathUtils.lerp(s, targetScale.current, 0.12);
      groupRef.current.scale.setScalar(newS);
    }
  });

  const glowScale = radius * 5.5;

  return (
    <group ref={groupRef} position={position}>
      {/* Outer glow sprite */}
      <sprite scale={[glowScale, glowScale, 1]} position={[0, -0.05, 0]}>
        <spriteMaterial
          map={glowTexture}
          color={threeColor}
          transparent
          opacity={opacity * glowIntensity * 0.8}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* Secondary wider glow for atmosphere */}
      <sprite scale={[glowScale * 1.6, glowScale * 1.6, 1]} position={[0, -0.05, 0]}>
        <spriteMaterial
          map={glowTexture}
          color={threeColor}
          transparent
          opacity={opacity * glowIntensity * 0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* Glass sphere — dramatic refraction */}
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
          onPointerOver?.(e);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = "default";
          onPointerOut?.(e);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
      >
        <sphereGeometry args={[radius, 48, 48]} />
        <meshPhysicalMaterial
          color={threeColor}
          transmission={0.92}
          roughness={0.05}
          thickness={3.5}
          ior={2.0}
          envMap={envMap}
          envMapIntensity={2.5}
          clearcoat={1}
          clearcoatRoughness={0.05}
          emissive={threeColor}
          emissiveIntensity={hovered ? 1.8 : 0.6}
          transparent
          opacity={opacity}
          metalness={0.02}
          attenuationColor={threeColor}
          attenuationDistance={0.3}
          reflectivity={1}
          specularIntensity={1.5}
          specularColor={new THREE.Color("#ffffff")}
          sheen={0.3}
          sheenColor={threeColor}
          sheenRoughness={0.2}
        />
      </mesh>

      {/* Inner core — bright hot center */}
      <mesh>
        <sphereGeometry args={[radius * 0.45, 24, 24]} />
        <meshBasicMaterial
          color={threeColor}
          transparent
          opacity={opacity * 0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Specular highlight cap — small bright spot on top */}
      <mesh position={[radius * 0.25, radius * 0.35, radius * 0.2]}>
        <sphereGeometry args={[radius * 0.18, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={opacity * 0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
