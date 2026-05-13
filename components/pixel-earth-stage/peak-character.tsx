"use client";

// pixel character that stands on top of the Yeezus mountain peak.
// renders inside the scaled mountain group, so the sprite scale and resting y
// are passed in local coords (compensating for the parent's MODEL_SCALE).

// three textures need direct mutation each frame to flip the spritesheet
/* eslint-disable react-hooks/immutability */

import { useRef, useState } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { createCharacterTexture } from "./textures";

const FRAMES = 4;
const FRAME_MS = 180;

type Props = {
  isVisible: boolean;
  reducedMotion: boolean;
  position: [number, number, number];
  scale: number;
  bobAmplitude: number;
};

export function PeakCharacter({
  isVisible,
  reducedMotion,
  position,
  scale,
  bobAmplitude,
}: Props) {
  const [tex] = useState(() => {
    const t = createCharacterTexture();
    t.repeat.set(1 / FRAMES, 1);
    t.offset.set(0, 0);
    return t;
  });

  const spriteRef = useRef<THREE.Sprite>(null);
  const lastSwapRef = useRef(0);
  const frameRef = useRef(0);
  const restingY = position[1];

  useFrame(({ clock }) => {
    const sprite = spriteRef.current;
    if (!sprite) return;
    sprite.visible = isVisible;
    if (!isVisible) return;

    const now = clock.getElapsedTime() * 1000;
    if (!reducedMotion && now - lastSwapRef.current > FRAME_MS) {
      frameRef.current = (frameRef.current + 1) % FRAMES;
      tex.offset.x = frameRef.current / FRAMES;
      lastSwapRef.current = now;
    }
    const tt = now / 1000;
    const bob = reducedMotion ? 0 : Math.abs(Math.sin(tt * 5)) * bobAmplitude;
    sprite.position.y = restingY + bob;
  });

  return (
    <sprite ref={spriteRef} position={position} scale={[scale, scale, scale]}>
      <spriteMaterial
        map={tex}
        transparent
        depthTest={true}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}
