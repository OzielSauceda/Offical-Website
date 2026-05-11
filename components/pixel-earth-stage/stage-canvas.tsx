"use client";

import { RefObject } from "react";

import { Canvas } from "@react-three/fiber";

import { Scene } from "./scene";

type Props = {
  targetRotationRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  lastInteractionRef: RefObject<number>;
  reducedMotion: boolean;
  screenRotationTargetRef: RefObject<number>;
};

export function StageCanvas({
  targetRotationRef,
  isDraggingRef,
  lastInteractionRef,
  reducedMotion,
  screenRotationTargetRef,
}: Props) {
  return (
    <Canvas
      camera={{ position: [0, 1.75, 5.6], fov: 62 }}
      dpr={[1, 2]}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
    >
      <Scene
        targetRotationRef={targetRotationRef}
        isDraggingRef={isDraggingRef}
        lastInteractionRef={lastInteractionRef}
        reducedMotion={reducedMotion}
        screenRotationTargetRef={screenRotationTargetRef}
      />
    </Canvas>
  );
}
