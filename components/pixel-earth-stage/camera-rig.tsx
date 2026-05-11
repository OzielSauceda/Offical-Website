"use client";

// camera is a three object designed to be mutated each frame
/* eslint-disable react-hooks/immutability */

import { useEffect, useRef } from "react";

import { useFrame, useThree } from "@react-three/fiber";

type Props = {
  reducedMotion: boolean;
};

// gentle mouse parallax — adds depth without disorienting the user
export function CameraRig({ reducedMotion }: Props) {
  const { camera } = useThree();
  const target = useRef({ x: 0, y: 0 });

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
    if (reducedMotion) return;
    const k = Math.min(1, delta * 3);
    // small offsets — look-at lifted so the screen above the dome stays in frame
    const desiredX = target.current.x * 0.12;
    const desiredY = 1.75 + -target.current.y * 0.08;
    camera.position.x += (desiredX - camera.position.x) * k;
    camera.position.y += (desiredY - camera.position.y) * k;
    camera.lookAt(0, 1.45, 0);
  });

  return null;
}
