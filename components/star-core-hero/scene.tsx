"use client";

import { RefObject } from "react";

import { Stars } from "@react-three/drei";

import { CameraRig } from "./camera-rig";
import { OverheadBeams } from "./overhead-beams";
import { PlatformBase } from "./platform-base";
import { PlatformGlowRing } from "./platform-glow-ring";
import { ShootingStars } from "./shooting-stars";
import { SpaceBackground } from "./space-background";
import { StarCore } from "./star-core";

type Props = {
  targetRotationRef: RefObject<number>;
  reducedMotion: boolean;
};

export function Scene(props: Props) {
  return (
    <>
      <color attach="background" args={["#020414"]} />
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

      <SpaceBackground reducedMotion={props.reducedMotion} />

      {!props.reducedMotion && (
        <>
          <Stars radius={34} depth={26} count={320} factor={1.6} fade speed={0.55} />
          <ShootingStars />
        </>
      )}

      <PlatformBase />
      <PlatformGlowRing reducedMotion={props.reducedMotion} />
      <OverheadBeams reducedMotion={props.reducedMotion} />

      <StarCore
        targetRotationRef={props.targetRotationRef}
        reducedMotion={props.reducedMotion}
      />
    </>
  );
}
