/**
 * NeonTube — Glowing neon tube connecting two player nodes.
 *
 * Rendered as a TubeGeometry with emissive material. The tube thickness
 * and opacity scale with the pass frequency between the two players.
 * Uses additive blending for the glow-through-bloom effect.
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

  // Build a curved path between start and end with a slight arc
  const { tubeGeometry, linePoints } = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const mid = new THREE.Vector3().lerpVectors(s, e, 0.5);
    // Lift the midpoint up slightly for a subtle arc
    mid.y += 0.3 + thickness * 2;

    const curve = new THREE.QuadraticBezierCurve3(s, mid, e);
    const tubeGeo = new THREE.TubeGeometry(curve, 20, thickness, 8, false);
    const pts = curve.getPoints(30);
    return { tubeGeometry: tubeGeo, linePoints: pts };
  }, [start, end, thickness]);

  if (opacity < 0.01) return null;

  return (
    <group>
      {/* Core neon tube — emissive glow */}
      <mesh geometry={tubeGeometry}>
        <meshBasicMaterial
          color={threeColor}
          transparent
          opacity={opacity * 0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Outer glow tube — slightly larger, more transparent */}
      <mesh>
        <tubeGeometry
          args={[
            new THREE.QuadraticBezierCurve3(
              new THREE.Vector3(...start),
              new THREE.Vector3(
                (start[0] + end[0]) / 2,
                (start[1] + end[1]) / 2 + 0.3 + thickness * 2,
                (start[2] + end[2]) / 2
              ),
              new THREE.Vector3(...end)
            ),
            20,
            thickness * 2.5,
            8,
            false,
          ]}
        />
        <meshBasicMaterial
          color={threeColor}
          transparent
          opacity={opacity * 0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
