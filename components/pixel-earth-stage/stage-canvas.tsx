"use client";

import { RefObject } from "react";

import { Canvas } from "@react-three/fiber";

import type { EnvironmentId, SectionId } from "@/lib/sections";

import { Scene } from "./scene";

type Props = {
  targetRotationRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  lastInteractionRef: RefObject<number>;
  reducedMotion: boolean;
  screenRotationTargetRef: RefObject<number>;
  environment: EnvironmentId;
  enteredSectionId: SectionId | null;
  enteredHeader: string;
  enteredSubhead: string;
  contentRingRotationRef: RefObject<number>;
};

export function StageCanvas({
  targetRotationRef,
  isDraggingRef,
  lastInteractionRef,
  reducedMotion,
  screenRotationTargetRef,
  environment,
  enteredSectionId,
  enteredHeader,
  enteredSubhead,
  contentRingRotationRef,
}: Props) {
  return (
    <Canvas
      camera={{ position: [0, 1.72, 4.85], fov: 64 }}
      dpr={[1, 2]}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
    >
      <Scene
        targetRotationRef={targetRotationRef}
        isDraggingRef={isDraggingRef}
        lastInteractionRef={lastInteractionRef}
        reducedMotion={reducedMotion}
        screenRotationTargetRef={screenRotationTargetRef}
        environment={environment}
        enteredSectionId={enteredSectionId}
        enteredHeader={enteredHeader}
        enteredSubhead={enteredSubhead}
        contentRingRotationRef={contentRingRotationRef}
      />
    </Canvas>
  );
}
