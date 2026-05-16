"use client";

import * as THREE from "three";

import { getSoftPuff } from "@/lib/three-helpers/soft-puff";

const R_PLATFORM = 2.36;

export function PlatformBase() {
  const puffTex = getSoftPuff();

  return (
    <group>
      <mesh position={[0, -0.085, 0]}>
        <cylinderGeometry args={[R_PLATFORM, R_PLATFORM, 0.1, 160]} />
        <meshStandardMaterial
          color="#0a0e1c"
          roughness={0.78}
          metalness={0.12}
          transparent
          opacity={0.96}
        />
      </mesh>
      <sprite position={[0, 0.35, 0]} scale={[3.2, 1.0, 1]}>
        <spriteMaterial
          map={puffTex}
          color="#4ad9e8"
          transparent
          opacity={0.09}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
