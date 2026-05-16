"use client";

// camera is a three object designed to be mutated each frame
/* eslint-disable react-hooks/immutability */

import { useEffect, useRef } from "react";

import { useFrame, useThree } from "@react-three/fiber";

import type { CameraTarget } from "@/lib/section-camera-targets";

type Props = {
  reducedMotion: boolean;
  enteredCameraTarget: CameraTarget | null;
  readingCameraActive?: boolean;
  onReadingCameraSettled?: (settled: boolean) => void;
};

// distance from camera to target at which the reading dolly is considered
// arrived. picked small enough that the J-card has effectively grown to
// fill the frame, but large enough that the lerp doesn't asymptote forever.
const READING_SETTLE_DISTANCE = 0.12;

// pulled back from 4.85 → 5.75 so the full stage fits in frame with
// breathing room top (ABOUT ring) and bottom (outer platform/ring),
// without shrinking the stage or shifting it up.
const DEFAULT_POS: [number, number, number] = [0, 1.72, 5.75];
const DEFAULT_LOOK: [number, number, number] = [0, 1.52, 0];

// gentle mouse parallax + a per-section entry pose. when a section is
// "entered", the camera lerps from its parallax-driven default toward the
// section's target position + lookAt; on exit it lerps back.
export function CameraRig({
  reducedMotion,
  enteredCameraTarget,
  readingCameraActive,
  onReadingCameraSettled,
}: Props) {
  const { camera } = useThree();
  const target = useRef({ x: 0, y: 0 });
  const curLook = useRef<[number, number, number]>([...DEFAULT_LOOK]);
  const settledRef = useRef(false);

  // when reading mode exits, clear the latched-settled state so the next
  // entry can re-fire the callback once the camera arrives again.
  useEffect(() => {
    if (!readingCameraActive && settledRef.current) {
      settledRef.current = false;
      onReadingCameraSettled?.(false);
    }
  }, [readingCameraActive, onReadingCameraSettled]);

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      target.current.x = nx;
      target.current.y = ny;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion]);

  useFrame((_, delta) => {
    const k = reducedMotion ? 1 : Math.min(1, delta * 3);

    // base pose with parallax
    const baseX = reducedMotion ? DEFAULT_POS[0] : target.current.x * 0.08;
    const baseY = reducedMotion
      ? DEFAULT_POS[1]
      : DEFAULT_POS[1] + -target.current.y * 0.06;
    const baseZ = DEFAULT_POS[2];

    // if a section is entered, blend toward its target; otherwise use base
    const [dpx, dpy, dpz] = enteredCameraTarget
      ? enteredCameraTarget.position
      : [baseX, baseY, baseZ];
    const [dlx, dly, dlz] = enteredCameraTarget
      ? enteredCameraTarget.lookAt
      : DEFAULT_LOOK;

    // entered/exit transitions use a slightly slower rate so the dolly feels
    // deliberate. parallax-only updates still use the snappier rate.
    const ck = enteredCameraTarget
      ? reducedMotion
        ? 1
        : Math.min(1, delta * (enteredCameraTarget.transitionRate ?? 2.4))
      : k;

    camera.position.x += (dpx - camera.position.x) * ck;
    camera.position.y += (dpy - camera.position.y) * ck;
    camera.position.z += (dpz - camera.position.z) * ck;

    curLook.current[0] += (dlx - curLook.current[0]) * ck;
    curLook.current[1] += (dly - curLook.current[1]) * ck;
    curLook.current[2] += (dlz - curLook.current[2]) * ck;
    camera.lookAt(curLook.current[0], curLook.current[1], curLook.current[2]);

    // fire the reading-camera settle callback the first frame the camera
    // arrives near its target. latched until reading mode exits — handled
    // by the effect above. this is what hands off the in-cassette J-card
    // to the full-viewport DOM page, so it must come from real proximity,
    // not a timer.
    if (
      readingCameraActive &&
      enteredCameraTarget &&
      !settledRef.current
    ) {
      const ex = enteredCameraTarget.position[0] - camera.position.x;
      const ey = enteredCameraTarget.position[1] - camera.position.y;
      const ez = enteredCameraTarget.position[2] - camera.position.z;
      const dist = Math.sqrt(ex * ex + ey * ey + ez * ez);
      if (reducedMotion || dist < READING_SETTLE_DISTANCE) {
        settledRef.current = true;
        onReadingCameraSettled?.(true);
      }
    }
  });

  return null;
}
