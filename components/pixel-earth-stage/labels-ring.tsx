"use client";

import { useEffect, useMemo } from "react";

import * as THREE from "three";

import { createLabelsTexture } from "./textures";

// slightly outside the screen cylinder (RADIUS=1.78) to avoid z-fight
const RADIUS = 1.785;
const HEIGHT = 0.85;
const Y = 2.85;
const SEGMENTS = 96;

export function LabelsRing() {
  const { texture, redraw } = useMemo(() => createLabelsTexture(), []);

  // re-paint once the web font finishes loading so the initial render isn't stuck
  // on the Georgia fallback
  useEffect(() => {
    if (typeof document === "undefined") return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) redraw();
    });
    return () => {
      cancelled = true;
    };
  }, [redraw]);

  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);

  return (
    <mesh position={[0, Y, 0]} renderOrder={3}>
      <cylinderGeometry args={[RADIUS, RADIUS, HEIGHT, SEGMENTS, 1, true]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.FrontSide}
        toneMapped={false}
        transparent
        depthWrite={false}
        opacity={0.95}
      />
    </mesh>
  );
}
