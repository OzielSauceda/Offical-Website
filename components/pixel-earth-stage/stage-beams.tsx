"use client";

import { useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type BeamProps = {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  opacity?: number;
  height?: number;
  radius?: number;
};

function Beam({
  position,
  rotation,
  color,
  opacity = 0.18,
  height = 3.4,
  radius = 0.42,
}: BeamProps) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, -height / 2, 0]}>
        <coneGeometry args={[radius, height, 28, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function StageBeams({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current || reducedMotion) return;
    groupRef.current.rotation.y += delta * 0.06;
  });

  return (
    <group ref={groupRef}>
      <Beam position={[1.8, 2.6, 0.4]} rotation={[0.1, 0, -0.45]} color="#9aa9ff" />
      <Beam position={[-1.8, 2.6, 0.4]} rotation={[0.1, 0, 0.45]} color="#ff8aa0" />
      <Beam position={[0.8, 2.6, -1.7]} rotation={[-0.3, 0, -0.2]} color="#9aa9ff" opacity={0.14} />
      <Beam position={[-0.8, 2.6, -1.7]} rotation={[-0.3, 0, 0.2]} color="#ff8aa0" opacity={0.14} />
      <Beam position={[0, 3.2, 0]} rotation={[0, 0, 0]} color="#cfd8ff" opacity={0.1} height={4} radius={0.6} />
    </group>
  );
}
