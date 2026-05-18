"use client";

import { RefObject } from "react";

import { Canvas } from "@react-three/fiber";

import { Scene } from "./scene";

type Props = {
  targetRotationRef: RefObject<number>;
  reducedMotion: boolean;
};

export function StarCanvas(props: Props) {
  return (
    <Canvas
      camera={{ position: [0, 1.7, 7.25], fov: 58 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100vw", height: "100vh" }}
    >
      <Scene
        targetRotationRef={props.targetRotationRef}
        reducedMotion={props.reducedMotion}
      />
    </Canvas>
  );
}
