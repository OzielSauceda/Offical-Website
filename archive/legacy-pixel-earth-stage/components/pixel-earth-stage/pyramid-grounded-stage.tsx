"use client";

// Projects environment stage. Pairs a sizeable grounded copy of the
// Research bridge with a fresh rainbow rim beam built around the bridge's
// rectangular footprint (the old asymmetric mountain polygon is gone).
// Both the rim and the bridge sit inside one rotating wrapper so they
// spin together as a unit, like the previous mountain rim did around the
// mountain base.

import { RefObject, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { PlatformRimBeam } from "./platform-rim-beam";
import { ResearchBridgeStage } from "./research-bridge-stage";

const AUTO_SPEED = 0.22;
const RESUME_DELAY_MS = 1400;

// Bridge natural dimensions inside ResearchBridgeStage's local space.
// Depth uses the grounded-mode override so the CD ring fits inside the
// stage walls without poking through the front or back glass.
const BRIDGE_LEN_LOCAL = 3.6;
const BRIDGE_DEPTH_LOCAL = 1.85;
const BRIDGE_HEIGHT_LOCAL = 0.72;
const BRIDGE_FLOOR_THICKNESS_LOCAL = 0.12;

// Wrapper scale — pumps the bridge up to a dominant scale comparable to
// the dome. The cap keeps the bridge top under the carousel's cable tips
// at world Y≈1.4. At 1.45 the bridge top lands near Y≈1.22.
const BRIDGE_FIT_SCALE = 1.45;
// Small lift above the floor plane so the slab underside reads as resting
// on the rim plane rather than sunk into it.
const BRIDGE_FIT_Y = 0.005;

// Bridge footprint in world units after scaling.
const BRIDGE_WIDTH_WORLD = BRIDGE_LEN_LOCAL * BRIDGE_FIT_SCALE;
const BRIDGE_DEPTH_WORLD = BRIDGE_DEPTH_LOCAL * BRIDGE_FIT_SCALE;

// Distance from the bridge frame edge to the rim filament line. Leaves
// enough breathing room for the filament + hot bloom to read against the
// floor without touching the bridge slab.
const RIM_MARGIN = 0.12;
const RIM_HALF_W = BRIDGE_WIDTH_WORLD / 2 + RIM_MARGIN;
const RIM_HALF_D = BRIDGE_DEPTH_WORLD / 2 + RIM_MARGIN;

// Rim outline rectangle in CCW order (viewed from +Y).
const RIM_RECT: ReadonlyArray<readonly [number, number]> = [
  [-RIM_HALF_W, -RIM_HALF_D],
  [+RIM_HALF_W, -RIM_HALF_D],
  [+RIM_HALF_W, +RIM_HALF_D],
  [-RIM_HALF_W, +RIM_HALF_D],
];

// Rim plane Y — matches the floor where the old mountain rim sat, so the
// rainbow border reads as light bleeding off the platform.
const RIM_Y = 0.005;

type Props = {
  targetRotationRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  lastInteractionRef: RefObject<number>;
  reducedMotion: boolean;
  isPyramidEnvironment: boolean;
  // True when the user has clicked Enter on Projects — freezes auto-spin
  // and tells the inner bridge to dim its glass / hide its ceiling.
  entered: boolean;
};

export function PyramidGroundedStage({
  targetRotationRef,
  isDraggingRef,
  lastInteractionRef,
  reducedMotion,
  isPyramidEnvironment,
  entered,
}: Props) {
  const rotGroupRef = useRef<THREE.Group>(null);

  // memoize the rim polygon ref so the rim beam doesn't tear down its
  // geometry buffers on every frame
  const rimPolygon = useMemo(() => RIM_RECT, []);

  // The whole assembly rotates as one — rim + bridge stay aligned like the
  // old mountain group did. ResearchBridgeStage in grounded mode skips its
  // internal rotation so this is the only spinner. Once entered, freeze on
  // the current orientation so the project showcase doesn't drift while
  // the user is reading the CDs.
  useFrame((_, delta) => {
    const g = rotGroupRef.current;
    if (!g) return;
    g.visible = isPyramidEnvironment;
    if (!isPyramidEnvironment) return;
    if (entered) return;

    const sinceInteraction = performance.now() - lastInteractionRef.current;
    const canAutoRotate =
      !reducedMotion &&
      !isDraggingRef.current &&
      sinceInteraction > RESUME_DELAY_MS;
    if (canAutoRotate) {
      targetRotationRef.current += AUTO_SPEED * delta;
    }

    const target = targetRotationRef.current;
    const current = g.rotation.y;
    const k = reducedMotion ? 1 : Math.min(1, delta * 14);
    g.rotation.y = current + (target - current) * k;
  });

  return (
    <group ref={rotGroupRef}>
      <PlatformRimBeam polygon={rimPolygon} polygonY={RIM_Y} />
      <group position={[0, BRIDGE_FIT_Y, 0]} scale={BRIDGE_FIT_SCALE}>
        <ResearchBridgeStage
          mode="grounded"
          isVisible={isPyramidEnvironment}
          entered={entered}
          targetRotationRef={targetRotationRef}
          isDraggingRef={isDraggingRef}
          lastInteractionRef={lastInteractionRef}
          reducedMotion={reducedMotion}
        />
      </group>
    </group>
  );
}

// Bridge dimensions exported for any debugging / sibling layout work.
export const PYRAMID_GROUNDED_BRIDGE_DIMENSIONS = {
  widthWorld: BRIDGE_WIDTH_WORLD,
  depthWorld: BRIDGE_DEPTH_WORLD,
  heightWorld: BRIDGE_HEIGHT_LOCAL * BRIDGE_FIT_SCALE,
  floorThicknessWorld: BRIDGE_FLOOR_THICKNESS_LOCAL * BRIDGE_FIT_SCALE,
};
