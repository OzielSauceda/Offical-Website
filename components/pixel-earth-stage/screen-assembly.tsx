"use client";

// rotating group containing the arena screen + labels ring.
// rotation is driven by user input via targetRotationRef; we lerp toward it each frame.

import { RefObject, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { ArenaScreen } from "./arena-screen";
import { LabelsRing } from "./labels-ring";

type Props = {
  targetRotationRef: RefObject<number>;
  reducedMotion: boolean;
};

const LERP_RATE = 8;

export function ScreenAssembly({ targetRotationRef, reducedMotion }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const target = targetRotationRef.current;
    const current = g.rotation.y;
    const k = reducedMotion ? 1 : Math.min(1, delta * LERP_RATE);
    g.rotation.y = current + (target - current) * k;
  });

  return (
    <group ref={groupRef}>
      <ArenaScreen reducedMotion={reducedMotion} />
      <LabelsRing />
    </group>
  );
}
