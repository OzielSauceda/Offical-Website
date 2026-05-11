"use client";

import { RefObject, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { createEarthTexture } from "./textures";

const AUTO_SPEED = 0.22;
const RESUME_DELAY_MS = 1400;

type Props = {
  targetRotationRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  lastInteractionRef: RefObject<number>;
  reducedMotion: boolean;
};

export function Dome({
  targetRotationRef,
  isDraggingRef,
  lastInteractionRef,
  reducedMotion,
}: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => createEarthTexture(), []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const now = performance.now();
    const sinceInteraction = now - lastInteractionRef.current;
    const canAutoRotate =
      !reducedMotion && !isDraggingRef.current && sinceInteraction > RESUME_DELAY_MS;
    if (canAutoRotate) {
      targetRotationRef.current += AUTO_SPEED * delta;
    }
    const current = mesh.rotation.y;
    const target = targetRotationRef.current;
    // ease toward target so drag feels responsive but not jittery
    mesh.rotation.y = current + (target - current) * Math.min(1, delta * 14);
  });

  return (
    <group>
      <mesh ref={meshRef} rotation={[0, 0, 0]}>
        <sphereGeometry args={[1, 48, 24]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.9}
          metalness={0.05}
          flatShading
        />
      </mesh>
      {/* faint atmosphere halo */}
      <mesh>
        <sphereGeometry args={[1.06, 32, 16]} />
        <meshBasicMaterial
          color="#9aa9ff"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
