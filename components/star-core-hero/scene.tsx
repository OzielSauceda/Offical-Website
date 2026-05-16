"use client";

import { RefObject, Suspense } from "react";

import { Environment, Stars } from "@react-three/drei";

import { CameraRig } from "./camera-rig";
import { OverheadBeams } from "./overhead-beams";
import { PlatformBase } from "./platform-base";
import { PlatformGlowRing } from "./platform-glow-ring";
import { ShootingStars } from "./shooting-stars";
import { SpaceBackground } from "./space-background";
import { StarCore } from "./star-core";

type Props = {
  targetRotationRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  lastInteractionRef: RefObject<number>;
  reducedMotion: boolean;
};

export function Scene(props: Props) {
  return (
    <>
      <fog attach="fog" args={["#03040b", 4.4, 11]} />
      <ambientLight intensity={0.45} />
      <spotLight
        position={[0, 5.35, 0.08]}
        angle={0.46}
        penumbra={0.9}
        distance={10}
        decay={1.08}
        intensity={7.6}
        color="#cdeaff"
      />
      <pointLight
        position={[-2.4, 1.6, 2.0]}
        intensity={0.5}
        distance={6}
        color="#a6e8ff"
      />
      <pointLight
        position={[2.8, 2.6, 1.6]}
        intensity={0.9}
        distance={5.5}
        color="#a6f0ff"
      />
      <hemisphereLight args={["#8eaccc", "#04060c", 0.3]} />

      <CameraRig reducedMotion={props.reducedMotion} />

      {/* env map for chrome material reflections. wrapped in Suspense so
          the HDRI load does not unmount the rest of the scene; if the
          fetch fails or is slow the star still renders with direct lights. */}
      <Suspense fallback={null}>
        <Environment preset="city" environmentIntensity={0.42} />
      </Suspense>

      <SpaceBackground reducedMotion={props.reducedMotion} />

      {!props.reducedMotion && (
        <>
          <Stars radius={34} depth={26} count={650} factor={2} fade speed={0.65} />
          <ShootingStars />
        </>
      )}

      <PlatformBase />
      <PlatformGlowRing reducedMotion={props.reducedMotion} />
      <OverheadBeams reducedMotion={props.reducedMotion} />

      <StarCore
        targetRotationRef={props.targetRotationRef}
        isDraggingRef={props.isDraggingRef}
        lastInteractionRef={props.lastInteractionRef}
        reducedMotion={props.reducedMotion}
      />
    </>
  );
}
