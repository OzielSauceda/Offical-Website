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
    <mesh ref={meshRef} rotation={[0, 0, 0]}>
      {/* upper hemisphere only — theta runs from north pole to equator */}
      <sphereGeometry args={[1.52, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.85}
        metalness={0.08}
        emissive="#1a2148"
        emissiveIntensity={0.18}
        flatShading
        side={THREE.FrontSide}
      />
    </mesh>
  );
}
