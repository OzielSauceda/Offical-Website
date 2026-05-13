"use client";

import { ReactNode, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const LIFT_AMOUNT = 0.8;
const ROTATE_SPEED = 0.06;

type Props = {
  entered: boolean;
  reducedMotion: boolean;
  children: ReactNode;
};

// wraps the existing Dome in a transformable group. when entered, the globe
// lifts about 0.8 units and rotates slowly on Y so it reads as a planet
// orbiting overhead while the section content sits in the foreground.
export function DomeLiftGroup({ entered, reducedMotion, children }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  // lerped lift amount in [0, LIFT_AMOUNT]
  const liftRef = useRef(0);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const target = entered ? LIFT_AMOUNT : 0;
    const k = reducedMotion ? 1 : Math.min(1, delta * 2.2);
    liftRef.current += (target - liftRef.current) * k;
    g.position.y = liftRef.current;
    // slow continuous Y rotation only while entered; when exiting, hold the
    // current rotation so the dome doesn't snap back.
    if (entered && !reducedMotion) {
      g.rotation.y += delta * ROTATE_SPEED;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}
