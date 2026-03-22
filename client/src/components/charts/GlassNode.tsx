/**
 * GlassNode — 3D glass sphere representing a player in the passing network.
 *
 * Uses MeshPhysicalMaterial with transmission for a glass/refraction effect.
 * Node size scales with Degree Centrality. A radial glow sprite sits behind
 * the sphere. Position-based color coding is applied via emissive + glow.
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

  const [hovered, setHovered] = useState(false);

  const threeColor = useMemo(() => new THREE.Color(color), [color]);

  // Glow texture — radial gradient
  const glowTexture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, "rgba(255,255,255,0.8)");
    gradient.addColorStop(0.3, "rgba(255,255,255,0.3)");
    gradient.addColorStop(0.7, "rgba(255,255,255,0.05)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Subtle floating animation
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.position.y =
        position[1] + Math.sin(clock.elapsedTime * 0.8 + position[0]) * 0.08;
    }
  });

  const glowScale = radius * 4.5;

  return (
    <group position={position}>
      {/* Glow sprite behind the node */}
      <sprite
        scale={[glowScale, glowScale, 1]}
        position={[0, -0.05, 0]}
      >
        <spriteMaterial
          map={glowTexture}
          color={threeColor}
          transparent
          opacity={opacity * glowIntensity * 0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* Glass sphere */}
      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
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
        <sphereGeometry args={[radius, 32, 32]} />
        <meshPhysicalMaterial
          color={threeColor}
          transmission={0.85}
          roughness={0.1}
          thickness={2}
          ior={1.5}
          envMapIntensity={1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          emissive={threeColor}
          emissiveIntensity={hovered ? 1.2 : 0.4}
          transparent
          opacity={opacity}
          metalness={0.05}
          attenuationColor={threeColor}
          attenuationDistance={0.5}
        />
      </mesh>

      {/* Inner core glow sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[radius * 0.5, 16, 16]} />
        <meshBasicMaterial
          color={threeColor}
          transparent
          opacity={opacity * 0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
