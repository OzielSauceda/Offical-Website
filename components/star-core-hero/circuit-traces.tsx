"use client";

import { useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const TRACE_Z = 0.095;
const NODE_Z = TRACE_Z + 0.003;

// per-arm engraved detail in arm-local coords. shorter rails and
// asymmetric small branches feel more like reference engraving and
// less like a symmetric PCB.
type LocalSegment = readonly [
  readonly [number, number],
  readonly [number, number],
];

const ARM_SEGMENTS: readonly LocalSegment[] = [
  // short upper rail near the base
  [[0.36, 0.045], [0.68, 0.045]],
  // short lower rail, offset further out for asymmetry
  [[0.5, -0.045], [0.82, -0.045]],
  // tiny upper branch outward
  [[0.68, 0.045], [0.78, 0.085]],
  // tiny lower branch outward
  [[0.82, -0.045], [0.92, -0.085]],
  // small base tick
  [[0.32, 0], [0.32, 0.04]],
];

// nodes along the arm — sparse, sitting at branch tips and rail ends
const NODE_POINTS: readonly (readonly [number, number])[] = [
  [0.36, 0.045],
  [0.78, 0.085],
  [0.92, -0.085],
  [0.32, 0.04],
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
    if (lineMatRef.current) lineMatRef.current.opacity = 0.07 + pulse * 0.03;
    if (pointMatRef.current) pointMatRef.current.opacity = 0.18 + pulse * 0.08;
  });

  return (
    <group>
      <lineSegments renderOrder={10}>
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
          color="#cfeeff"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>

      <points renderOrder={11}>
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
          color="#ffffff"
          size={0.014}
          sizeAttenuation
          transparent
          opacity={0.28}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </group>
  );
}
