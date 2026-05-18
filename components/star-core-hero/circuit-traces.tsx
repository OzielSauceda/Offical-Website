"use client";

import { useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// shell is now flat; traces sit just above the top shell layer so
// they read as embedded under the bright surface.
const TRACE_Z = 0.006;
const NODE_Z = TRACE_Z + 0.001;

// per-arm engraved detail in arm-local coords. centerline rib +
// parallel rails + small branch ticks. lines are drawn with
// NormalBlending using a deep icy cyan so they tint the bright
// body white in pale cyan and are readable on a desktop screenshot.
type LocalSegment = readonly [
  readonly [number, number],
  readonly [number, number],
];

// sparse contour-following detail — one short rib near the arm tip
// plus one tiny branch. only two nodes per arm. avoids any long
// center-radiating lines and keeps the central white area clean.
const ARM_SEGMENTS: readonly LocalSegment[] = [
  // tip-side rib along the arm centerline, well past the center
  [[0.9, 0], [1.42, 0]],
  // one small branch offset outward
  [[1.18, 0], [1.3, 0.072]],
];

// nodes at the two rib endpoints
const NODE_POINTS: readonly (readonly [number, number])[] = [
  [0.9, 0],
  [1.3, 0.072],
];

function toWorld(
  point: readonly [number, number],
  angle: number,
): readonly [number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [point[0] * c - point[1] * s, point[0] * s + point[1] * c];
}

function buildTracePositions(): Float32Array {
  const positions: number[] = [];
  for (let arm = 0; arm < 5; arm++) {
    const angle = Math.PI / 2 + (arm * 2 * Math.PI) / 5;
    ARM_SEGMENTS.forEach(([start, end]) => {
      const a = toWorld(start, angle);
      const b = toWorld(end, angle);
      positions.push(a[0], a[1], TRACE_Z, b[0], b[1], TRACE_Z);
    });
  }
  return new Float32Array(positions);
}

function buildNodePositions(): Float32Array {
  const positions: number[] = [];
  for (let arm = 0; arm < 5; arm++) {
    const angle = Math.PI / 2 + (arm * 2 * Math.PI) / 5;
    NODE_POINTS.forEach((point) => {
      const p = toWorld(point, angle);
      positions.push(p[0], p[1], NODE_Z);
    });
  }
  return new Float32Array(positions);
}

export function CircuitTraces({ reducedMotion }: { reducedMotion: boolean }) {
  const lineMatRef = useRef<THREE.LineBasicMaterial>(null);
  const pointMatRef = useRef<THREE.PointsMaterial>(null);
  const linePositions = useMemo(() => buildTracePositions(), []);
  const nodePositions = useMemo(() => buildNodePositions(), []);

  useFrame(({ clock }) => {
    const pulse = reducedMotion
      ? 0.5
      : 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 0.8);
    if (lineMatRef.current) lineMatRef.current.opacity = 0.24 + pulse * 0.05;
    if (pointMatRef.current) pointMatRef.current.opacity = 0.34 + pulse * 0.06;
  });

  return (
    <group>
      <lineSegments renderOrder={20}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={linePositions}
            count={linePositions.length / 3}
            itemSize={3}
            args={[linePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          ref={lineMatRef}
          color="#9cc8de"
          transparent
          opacity={0.34}
          blending={THREE.NormalBlending}
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </lineSegments>

      <points renderOrder={21}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={nodePositions}
            count={nodePositions.length / 3}
            itemSize={3}
            args={[nodePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={pointMatRef}
          color="#bee0f0"
          size={0.03}
          sizeAttenuation
          transparent
          opacity={0.46}
          blending={THREE.NormalBlending}
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </points>
    </group>
  );
}
