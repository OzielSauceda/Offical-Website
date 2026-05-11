"use client";

// three textures need direct mutation each frame to flip the spritesheet
/* eslint-disable react-hooks/immutability */

import { useRef, useState } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { createCharacterTexture } from "./textures";

const FRAMES = 4;
const FRAME_MS = 180;

export function PixelCharacter({ reducedMotion }: { reducedMotion: boolean }) {
  const [tex] = useState(() => {
    const t = createCharacterTexture();
    t.repeat.set(1 / FRAMES, 1);
    t.offset.set(0, 0);
    return t;
  });

  const spriteRef = useRef<THREE.Sprite>(null);
  const lastSwapRef = useRef(0);
  const frameRef = useRef(0);

  useFrame(({ clock }) => {
    const sprite = spriteRef.current;
    if (!sprite) return;
    const now = clock.getElapsedTime() * 1000;
    if (!reducedMotion && now - lastSwapRef.current > FRAME_MS) {
      frameRef.current = (frameRef.current + 1) % FRAMES;
      tex.offset.x = frameRef.current / FRAMES;
      lastSwapRef.current = now;
    }
    const tt = now / 1000;
    const bob = reducedMotion ? 0 : Math.abs(Math.sin(tt * 5)) * 0.024;
    sprite.position.y = 1.57 + bob;
  });

  return (
    <sprite ref={spriteRef} position={[0, 1.57, 0]} scale={[0.42, 0.42, 0.42]}>
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
