"use client";

import * as THREE from "three";

import { getSoftPuff } from "@/lib/three-helpers/soft-puff";

export function PlatformBase() {
  const puffTex = getSoftPuff();

  return (
    <group>
      {/* subtle vertical light bloom rising from the portal center.
          thin, soft, low opacity — reads as light rising off the
          projected floor, never as smoke. all other floor patches
          are intentionally absent so the inside of the portal stays
          dark except for the center glow contributed by the ring. */}
      <sprite position={[0, 0.55, 0]} scale={[1.4, 1.1, 1]}>
        <spriteMaterial
          map={puffTex}
          color="#9adcef"
          transparent
          opacity={0.07}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
