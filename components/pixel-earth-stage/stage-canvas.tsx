"use client";

import { RefObject } from "react";

import { Canvas } from "@react-three/fiber";

import type { EnvironmentId, SectionId } from "@/lib/sections";

import type { JCardScreenRect } from "./jcard-page";
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
  aboutReadModeActive: boolean;
  aboutPageActive: boolean;
  paperProgressRef?: RefObject<number>;
  jcardScreenRectRef?: RefObject<JCardScreenRect | null>;
  onAboutSelectionChange?: (index: number | null) => void;
  onAboutPageCloseRequest?: () => void;
  onReadingCameraSettled?: (settled: boolean) => void;
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
  aboutReadModeActive,
  aboutPageActive,
  paperProgressRef,
  jcardScreenRectRef,
  onAboutSelectionChange,
  onAboutPageCloseRequest,
  onReadingCameraSettled,
}: Props) {
  return (
    <Canvas
      camera={{ position: [0, 1.72, 5.75], fov: 64 }}
      dpr={[1, 2]}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
      }}
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
        aboutReadModeActive={aboutReadModeActive}
        aboutPageActive={aboutPageActive}
        paperProgressRef={paperProgressRef}
        jcardScreenRectRef={jcardScreenRectRef}
        onAboutSelectionChange={onAboutSelectionChange}
        onAboutPageCloseRequest={onAboutPageCloseRequest}
        onReadingCameraSettled={onReadingCameraSettled}
      />
    </Canvas>
  );
}
