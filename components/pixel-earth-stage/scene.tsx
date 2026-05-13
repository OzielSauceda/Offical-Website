"use client";

import { RefObject } from "react";

import { Stars } from "@react-three/drei";

import { SECTION_CAMERA_TARGETS } from "@/lib/section-camera-targets";
import type { EnvironmentId, SectionId } from "@/lib/sections";

import { CameraRig } from "./camera-rig";
import { ContactHouseStage } from "./contact-house-stage";
import { Dome } from "./dome";
import { DomeLiftGroup } from "./dome-lift-group";
import { DomeRimGlow } from "./dome-rim-glow";
import { DomeSmoke } from "./dome-smoke";
import { GlowRing } from "./glow-ring";
import { PixelCharacter } from "./pixel-character";
import { ResearchBridgeStage } from "./research-bridge-stage";
import { ScreenAssembly } from "./screen-assembly";
import { SectionRevealHost } from "./section-reveals/section-reveal-host";
import { ShootingStars } from "./shooting-stars";
import { StageBeams } from "./stage-beams";
import { YeezusMountainStage } from "./yeezus-mountain-stage";

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

const STAGE_Y = 0;

export function Scene(props: Props) {
  const isGlobeEnvironment = props.environment === "globe";
  const isPyramidEnvironment = props.environment === "pyramid";
  const isResearchEnvironment = props.environment === "research";
  const isContactEnvironment = props.environment === "contact-house";
  const isAboutEntered = props.enteredSectionId === "about";
  const isEntered = props.enteredSectionId !== null;
  const enteredCameraTarget = props.enteredSectionId
    ? SECTION_CAMERA_TARGETS[props.enteredSectionId]
    : null;

  return (
    <>
      <fog attach="fog" args={["#03040b", 2.6, 7.8]} />
      {/* ambient kept high enough that the photographic earth texture reads
          across the whole upper hemisphere, not just inside the hot spot */}
      <ambientLight intensity={0.72} />
      {/* hero overhead spotlight — wide cone bathes the dome from above so
          the whole upper hemisphere catches the cool stage light, brighter
          at the top where it focuses on the performer. spotLight default
          target sits at world origin, so a source at (0, 5.2, 0) projects
          straight down. */}
      <spotLight
        position={[0, 5.35, 0.08]}
        angle={0.46}
        penumbra={0.82}
        distance={10}
        decay={1.08}
        intensity={9.2}
        color="#eaf2ff"
      />
      {/* warm rear fill — keeps the back of the dome from going flat black */}
      <directionalLight position={[-2.6, 1.8, 2]} intensity={0.58} color="#f2d8a8" />
      <pointLight position={[-2.8, 0.9, 1.6]} intensity={1.2} distance={5.5} color="#bfffdc" />
      <pointLight position={[2.8, 0.9, 1.6]} intensity={1.0} distance={5.5} color="#a9c9ff" />
      <hemisphereLight args={["#8fa4d5", "#0c0a1c", 0.42]} />

      <CameraRig
        reducedMotion={props.reducedMotion}
        enteredCameraTarget={enteredCameraTarget}
      />

      {!props.reducedMotion && (
        <>
          <Stars radius={32} depth={22} count={900} factor={2.2} fade speed={0.35} />
          <ShootingStars />
        </>
      )}

      <group position={[0, STAGE_Y, 0]}>
        <DomeLiftGroup entered={isAboutEntered} reducedMotion={props.reducedMotion}>
          <Dome
            targetRotationRef={props.targetRotationRef}
            isDraggingRef={props.isDraggingRef}
            lastInteractionRef={props.lastInteractionRef}
            reducedMotion={props.reducedMotion}
            isGlobeEnvironment={isGlobeEnvironment}
          />
          <GlowRing
            reducedMotion={props.reducedMotion}
            isGlobeEnvironment={isGlobeEnvironment}
          />
          <DomeRimGlow isGlobeEnvironment={isGlobeEnvironment} />
          <DomeSmoke
            targetRotationRef={props.targetRotationRef}
            reducedMotion={props.reducedMotion}
            isGlobeEnvironment={isGlobeEnvironment}
          />
        </DomeLiftGroup>
        <ScreenAssembly
          targetRotationRef={props.screenRotationTargetRef}
          reducedMotion={props.reducedMotion}
          entered={isEntered}
          enteredHeader={props.enteredHeader}
          enteredSubhead={props.enteredSubhead}
        />
        <StageBeams
          reducedMotion={props.reducedMotion}
          isGlobeEnvironment={isGlobeEnvironment}
          cueMode={isEntered ? "entered" : "default"}
        />
        <SectionRevealHost
          enteredSectionId={props.enteredSectionId}
          reducedMotion={props.reducedMotion}
          ringRotationRef={props.contentRingRotationRef}
        />
        <PixelCharacter
          reducedMotion={props.reducedMotion}
          isGlobeEnvironment={isGlobeEnvironment}
        />
        <YeezusMountainStage
          targetRotationRef={props.targetRotationRef}
          isDraggingRef={props.isDraggingRef}
          lastInteractionRef={props.lastInteractionRef}
          reducedMotion={props.reducedMotion}
          isPyramidEnvironment={isPyramidEnvironment}
        />
        <ResearchBridgeStage
          targetRotationRef={props.targetRotationRef}
          isDraggingRef={props.isDraggingRef}
          lastInteractionRef={props.lastInteractionRef}
          reducedMotion={props.reducedMotion}
          isResearchEnvironment={isResearchEnvironment}
        />
        <ContactHouseStage
          targetRotationRef={props.targetRotationRef}
          isDraggingRef={props.isDraggingRef}
          lastInteractionRef={props.lastInteractionRef}
          reducedMotion={props.reducedMotion}
          isContactEnvironment={isContactEnvironment}
        />
      </group>
    </>
  );
}
