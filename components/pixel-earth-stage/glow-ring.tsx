"use client";

import * as THREE from "three";

export function GlowRing() {
  return (
    <group position={[0, -0.01, 0]}>
      <mesh rotation-x={-Math.PI / 2}>
        <torusGeometry args={[1.01, 0.012, 8, 96]} />
        <meshBasicMaterial color="#cfd8ff" toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2}>
        <torusGeometry args={[1.04, 0.03, 8, 96]} />
        <meshBasicMaterial
          color="#9aa9ff"
          toneMapped={false}
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2}>
        <torusGeometry args={[1.1, 0.06, 8, 96]} />
        <meshBasicMaterial
          color="#9aa9ff"
          toneMapped={false}
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <ringGeometry args={[1.15, 1.45, 96]} />
        <meshBasicMaterial
          color="#9aa9ff"
          toneMapped={false}
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
