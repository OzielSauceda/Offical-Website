"use client";

import { RefObject, useRef } from "react";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { ReferenceStarShell } from "./reference-star-shell";

const STAR_Y = 1.94;

type Props = {
  targetRotationRef: RefObject<number>;
  reducedMotion: boolean;
};

export function StarCore({ targetRotationRef, reducedMotion }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const bobRef = useRef<THREE.Group>(null);
  const { size } = useThree();
  const presentationScale = size.width < 640 ? 0.78 : 1.18;

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

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
      {/* glow now lives entirely inside ReferenceStarShell as
          star-shaped silhouette bloom, so no circular background
          puff sprites here — the previous puffs were reading as a
          gray moon disc behind the crystal. */}
      <group ref={groupRef}>
        <ReferenceStarShell />
      </group>
    </group>
  );
}
