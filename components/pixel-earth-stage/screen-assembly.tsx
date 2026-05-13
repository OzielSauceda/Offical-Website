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
  entered: boolean;
  enteredHeader: string;
  enteredSubhead: string;
};

const LERP_RATE = 8;

export function ScreenAssembly({
  targetRotationRef,
  reducedMotion,
  entered,
  enteredHeader,
  enteredSubhead,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    // while entered, the carousel is frozen on the section that was active
    // when ENTER fired. don't track the input ref any further.
    if (entered) return;
    const target = targetRotationRef.current;
    const current = g.rotation.y;
    const k = reducedMotion ? 1 : Math.min(1, delta * LERP_RATE);
    g.rotation.y = current + (target - current) * k;
  });

  return (
    <group ref={groupRef} position={[0, 0.12, 0]}>
      <ArenaScreen
        reducedMotion={reducedMotion}
        entered={entered}
        enteredHeader={enteredHeader}
        enteredSubhead={enteredSubhead}
      />
      <LabelsRing />
    </group>
  );
}
