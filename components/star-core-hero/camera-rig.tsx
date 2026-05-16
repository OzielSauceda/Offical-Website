"use client";

/* eslint-disable react-hooks/immutability */

import { useEffect, useRef } from "react";

import { useFrame, useThree } from "@react-three/fiber";

const DEFAULT_POS: [number, number, number] = [0, 1.72, 5.75];
const DEFAULT_LOOK: [number, number, number] = [0, 1.52, 0];

export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera } = useThree();
  const target = useRef({ x: 0, y: 0 });
  const curLook = useRef<[number, number, number]>([...DEFAULT_LOOK]);

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      target.current.x = nx;
      target.current.y = ny;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion]);

  useFrame((_, delta) => {
    const k = reducedMotion ? 1 : Math.min(1, delta * 3);

    const baseX = reducedMotion ? DEFAULT_POS[0] : target.current.x * 0.05;
    const baseY = reducedMotion
      ? DEFAULT_POS[1]
      : DEFAULT_POS[1] + -target.current.y * 0.04;
    const baseZ = DEFAULT_POS[2];

    camera.position.x += (baseX - camera.position.x) * k;
    camera.position.y += (baseY - camera.position.y) * k;
    camera.position.z += (baseZ - camera.position.z) * k;

    curLook.current[0] += (DEFAULT_LOOK[0] - curLook.current[0]) * k;
    curLook.current[1] += (DEFAULT_LOOK[1] - curLook.current[1]) * k;
    curLook.current[2] += (DEFAULT_LOOK[2] - curLook.current[2]) * k;
    camera.lookAt(curLook.current[0], curLook.current[1], curLook.current[2]);
  });

  return null;
}
