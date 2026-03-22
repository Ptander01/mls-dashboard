/**
 * NeonTube — Thick glowing plasma conduit connecting two player nodes.
 *
 * Visual polish v2:
 *   - Triple-layer rendering: bright core + mid glow + wide atmospheric halo
 *   - Position-colored tubes (color passed from source node's posGroup)
 *   - Thicker base radius with pass-frequency scaling
 *   - Subtle arc lift proportional to distance for depth perception
 *   - toneMapped=false on all layers so bloom picks them up strongly
 */

import { useMemo } from "react";
import * as THREE from "three";

export interface NeonTubeProps {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  thickness: number;
  opacity: number;
}

export default function NeonTube({
  start,
  end,
  color,
  thickness,
  opacity,
}: NeonTubeProps) {
  const threeColor = useMemo(() => new THREE.Color(color), [color]);

  // Brighten the color for the hot core
  const coreColor = useMemo(() => {
    const c = new THREE.Color(color);
    c.lerp(new THREE.Color("#ffffff"), 0.4);
    return c;
  }, [color]);

  // Build curved path with distance-proportional arc
  const { coreGeo, midGeo, haloGeo } = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const dist = s.distanceTo(e);
    const mid = new THREE.Vector3().lerpVectors(s, e, 0.5);
    // Arc height scales with distance and thickness
    mid.y += 0.2 + dist * 0.02 + thickness * 3;

    const curve = new THREE.QuadraticBezierCurve3(s, mid, e);

    // Core: tight bright tube
    const core = new THREE.TubeGeometry(curve, 24, thickness, 8, false);
    // Mid glow: 2.5x radius
    const midG = new THREE.TubeGeometry(curve, 24, thickness * 2.5, 8, false);
    // Halo: 5x radius, very faint
    const halo = new THREE.TubeGeometry(curve, 24, thickness * 5, 8, false);

    return { coreGeo: core, midGeo: midG, haloGeo: halo };
  }, [start, end, thickness]);

  if (opacity < 0.01) return null;

  return (
    <group>
      {/* Layer 1: Hot bright core */}
      <mesh geometry={coreGeo}>
        <meshBasicMaterial
          color={coreColor}
          transparent
          opacity={opacity * 0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Layer 2: Mid glow — saturated color */}
      <mesh geometry={midGeo}>
        <meshBasicMaterial
          color={threeColor}
          transparent
          opacity={opacity * 0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Layer 3: Wide atmospheric halo */}
      <mesh geometry={haloGeo}>
        <meshBasicMaterial
          color={threeColor}
          transparent
          opacity={opacity * 0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
