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

export function StarCanvas(props: Props) {
  return (
    <Canvas
      camera={{ position: [0, 1.72, 5.75], fov: 64 }}
      dpr={[1, 2]}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
    >
      <Scene
        targetRotationRef={props.targetRotationRef}
        isDraggingRef={props.isDraggingRef}
        lastInteractionRef={props.lastInteractionRef}
        reducedMotion={props.reducedMotion}
      />
    </Canvas>
  );
}
