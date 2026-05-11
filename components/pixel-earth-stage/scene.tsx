"use client";

import { RefObject } from "react";

import { Stars } from "@react-three/drei";

import { Dome } from "./dome";
import { GlowRing } from "./glow-ring";
import { PixelCharacter } from "./pixel-character";
import { StageBeams } from "./stage-beams";

type Props = {
  targetRotationRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  lastInteractionRef: RefObject<number>;
  reducedMotion: boolean;
};

// dome centered on look-at so it sits at the visual middle of the viewport
const STAGE_Y = 0;

export function Scene(props: Props) {
  return (
    <>
      <color attach="background" args={["#07060d"]} />
      <fog attach="fog" args={["#07060d", 2.6, 6.5]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 2]} intensity={1.2} color="#cdd7ff" />
      <directionalLight position={[-3, 2, -1]} intensity={0.4} color="#ff8aa0" />
      <hemisphereLight args={["#9aa9ff", "#1a0f25", 0.35]} />

      {!props.reducedMotion && (
        <Stars radius={28} depth={18} count={500} factor={2} fade speed={0.4} />
      )}

      <group position={[0, STAGE_Y, 0]}>
        <Dome
          targetRotationRef={props.targetRotationRef}
          isDraggingRef={props.isDraggingRef}
          lastInteractionRef={props.lastInteractionRef}
          reducedMotion={props.reducedMotion}
        />
        <GlowRing />
        <StageBeams reducedMotion={props.reducedMotion} />
        <PixelCharacter reducedMotion={props.reducedMotion} />
      </group>
    </>
  );
}
