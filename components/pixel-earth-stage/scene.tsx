"use client";

import { RefObject } from "react";

import { Stars } from "@react-three/drei";

import { Atmosphere } from "./atmosphere";
import { CameraRig } from "./camera-rig";
import { Dome } from "./dome";
import { GlowRing } from "./glow-ring";
import { PixelCharacter } from "./pixel-character";
import { ScreenAssembly } from "./screen-assembly";
import { ShootingStars } from "./shooting-stars";
import { StageBeams } from "./stage-beams";

type Props = {
  targetRotationRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  lastInteractionRef: RefObject<number>;
  reducedMotion: boolean;
  screenRotationTargetRef: RefObject<number>;
};

// dome centered on look-at so it sits at the visual middle of the viewport
const STAGE_Y = 0;

export function Scene(props: Props) {
  return (
    <>
      <fog attach="fog" args={["#06050c", 3.0, 7.2]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 4, 2]} intensity={1.25} color="#cdd7ff" />
      <directionalLight position={[-3, 2, -1]} intensity={0.55} color="#ff8aa0" />
      <hemisphereLight args={["#9aa9ff", "#1a0f25", 0.4]} />

      <CameraRig reducedMotion={props.reducedMotion} />

      {!props.reducedMotion && (
        <>
          <Stars radius={32} depth={22} count={900} factor={2.2} fade speed={0.35} />
          <ShootingStars />
        </>
      )}

      <group position={[0, STAGE_Y, 0]}>
        <Dome
          targetRotationRef={props.targetRotationRef}
          isDraggingRef={props.isDraggingRef}
          lastInteractionRef={props.lastInteractionRef}
          reducedMotion={props.reducedMotion}
        />
        <Atmosphere reducedMotion={props.reducedMotion} />
        <GlowRing reducedMotion={props.reducedMotion} />
        <ScreenAssembly
          targetRotationRef={props.screenRotationTargetRef}
          reducedMotion={props.reducedMotion}
        />
        <StageBeams reducedMotion={props.reducedMotion} />
        <PixelCharacter reducedMotion={props.reducedMotion} />
      </group>
    </>
  );
}
