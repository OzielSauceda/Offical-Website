"use client";

import { useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type Props = {
  reducedMotion: boolean;
};

// scaled to match globe radius 1.52
const R_INNER = 1.53;
const R_MID = 1.58;
const R_OUTER = 1.71;
const R_FLAT_IN = 1.79;
const R_FLAT_OUT = 2.46;

export function GlowRing({ reducedMotion }: Props) {
  const breatheRef = useRef<THREE.Group>(null);
  const inner = useRef<THREE.MeshBasicMaterial>(null);
  const mid = useRef<THREE.MeshBasicMaterial>(null);
  const outer = useRef<THREE.MeshBasicMaterial>(null);
  const flare = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (reducedMotion || !breatheRef.current) return;
    const t = clock.getElapsedTime();
    const beat = 0.5 + 0.5 * Math.sin(t * 1.5);
    const scale = 1 + 0.02 * beat;
    breatheRef.current.scale.set(scale, 1, scale);
    if (mid.current) mid.current.opacity = 0.38 + 0.18 * beat;
    if (outer.current) outer.current.opacity = 0.14 + 0.1 * beat;
    if (flare.current) flare.current.opacity = 0.05 + 0.05 * beat;
    if (inner.current) {
      const shimmer = 0.9 + 0.1 * Math.sin(t * 6);
      inner.current.color.setRGB(shimmer, shimmer, 1);
    }
  });

  return (
    <group position={[0, -0.01, 0]} ref={breatheRef}>
      {/* sharp filament */}
      <mesh rotation-x={-Math.PI / 2}>
        <torusGeometry args={[R_INNER, 0.016, 8, 160]} />
        <meshBasicMaterial ref={inner} color="#e6ecff" toneMapped={false} />
      </mesh>
      {/* mid halo */}
      <mesh rotation-x={-Math.PI / 2}>
        <torusGeometry args={[R_MID, 0.044, 8, 160]} />
        <meshBasicMaterial
          ref={mid}
          color="#9aa9ff"
          toneMapped={false}
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* outer bloom */}
      <mesh rotation-x={-Math.PI / 2}>
        <torusGeometry args={[R_OUTER, 0.104, 8, 160]} />
        <meshBasicMaterial
          ref={outer}
          color="#9aa9ff"
          toneMapped={false}
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* flat halo disc — fakes light scatter into the surrounding fog */}
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[R_FLAT_IN, R_FLAT_OUT, 160]} />
        <meshBasicMaterial
          ref={flare}
          color="#a4b3ff"
          toneMapped={false}
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
