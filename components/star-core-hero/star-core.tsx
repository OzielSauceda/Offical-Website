"use client";

import { RefObject, useRef } from "react";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { getSoftPuff } from "@/lib/three-helpers/soft-puff";

import { CircuitTraces } from "./circuit-traces";
import { ReferenceStarShell } from "./reference-star-shell";

const STAR_Y = 1.94;
const AUTO_ROT_RESUME_MS = 1800;
const AUTO_ROT_RATE = 0.35;

type Props = {
  targetRotationRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  lastInteractionRef: RefObject<number>;
  reducedMotion: boolean;
};

export function StarCore({
  targetRotationRef,
  isDraggingRef,
  lastInteractionRef,
  reducedMotion,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const bobRef = useRef<THREE.Group>(null);
  const { size } = useThree();
  const presentationScale = size.width < 640 ? 0.78 : 1.18;
  const puffTex = getSoftPuff();

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    if (
      !reducedMotion &&
      !isDraggingRef.current &&
      performance.now() - lastInteractionRef.current > AUTO_ROT_RESUME_MS
    ) {
      targetRotationRef.current += AUTO_ROT_RATE * delta;
    }

    const k = reducedMotion ? 1 : Math.min(1, delta * 12);
    g.rotation.y += (targetRotationRef.current - g.rotation.y) * k;

    if (reducedMotion) {
      g.rotation.x = 0;
      if (bobRef.current) bobRef.current.position.y = STAR_Y;
      return;
    }

    const t = performance.now() / 1000;
    g.rotation.x = Math.sin((t * Math.PI * 2) / 6) * 0.018;
    if (bobRef.current) {
      bobRef.current.position.y =
        STAR_Y + Math.sin((t * (Math.PI * 2)) / 7) * 0.02;
    }
  });

  return (
    <group
      ref={bobRef}
      position={[0, STAR_Y, 0]}
      scale={[presentationScale, presentationScale, presentationScale]}
    >
      {/* background atmosphere — outside the rotating group so it
          doesn't drift across the screen when the star rotates */}
      <sprite position={[0, 0, -0.32]} scale={[5.8, 5.8, 1]}>
        <spriteMaterial
          map={puffTex}
          color="#4ec5f0"
          transparent
          opacity={0.28}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <sprite position={[0, 0, -0.2]} scale={[3.6, 3.6, 1]}>
        <spriteMaterial
          map={puffTex}
          color="#a8e8ff"
          transparent
          opacity={0.32}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      <group ref={groupRef}>
        <ReferenceStarShell />
        <CircuitTraces reducedMotion={reducedMotion} />
      </group>
    </group>
  );
}
