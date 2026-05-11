"use client";

import { RefObject } from "react";

import { Canvas } from "@react-three/fiber";

import { Scene } from "./scene";

type Props = {
  targetRotationRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  lastInteractionRef: RefObject<number>;
  reducedMotion: boolean;
};

export function StageCanvas({
  targetRotationRef,
  isDraggingRef,
  lastInteractionRef,
  reducedMotion,
}: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0.85, 3.2], fov: 30 }}
      dpr={[1, 2]}
      gl={{ antialias: false, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor("#07060d", 1);
      }}
    >
      <Scene
        targetRotationRef={targetRotationRef}
        isDraggingRef={isDraggingRef}
        lastInteractionRef={lastInteractionRef}
        reducedMotion={reducedMotion}
      />
    </Canvas>
  );
}
