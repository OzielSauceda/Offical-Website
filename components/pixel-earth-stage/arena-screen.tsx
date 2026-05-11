"use client";

// arena screen scrolls its texture and pulses lightly each frame
/* eslint-disable react-hooks/immutability */

import { useEffect, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { createScreenTexture } from "./textures";

const RADIUS = 1.78;
const HEIGHT = 0.85;
const Y = 2.85;
const SEGMENTS = 96;
const CABLE_COUNT = 6;
const CABLE_LENGTH = 1.0;
const CABLE_RADIUS = 0.009;

type Props = {
  reducedMotion: boolean;
};

export function ArenaScreen({ reducedMotion }: Props) {
  const texture = useMemo(() => createScreenTexture(), []);
  const screenMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const topRimRef = useRef<THREE.MeshBasicMaterial>(null);
  const botRimRef = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    // slow scroll so the pooled lights drift around the cylinder
    texture.offset.x = (texture.offset.x + delta * 0.03) % 1;
    const t = performance.now() / 1000;
    const beat = 0.5 + 0.5 * Math.sin(t * 1.5);
    if (topRimRef.current) topRimRef.current.opacity = 0.55 + 0.2 * beat;
    if (botRimRef.current) botRimRef.current.opacity = 0.45 + 0.2 * beat;
    if (screenMatRef.current) {
      // gentle brightness modulation on the screen itself
      const v = 0.88 + 0.12 * beat;
      screenMatRef.current.color.setRGB(v, v, v);
    }
  });

  return (
    <group position={[0, Y, 0]}>
      {/* inner face — viewed from below the dome, slight inward glow */}
      <mesh>
        <cylinderGeometry args={[RADIUS, RADIUS, HEIGHT, SEGMENTS, 1, true]} />
        <meshBasicMaterial
          ref={screenMatRef}
          map={texture}
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent
          opacity={0.96}
        />
      </mesh>

      {/* outer scrim — a slightly larger cylinder with subtle gradient for depth */}
      <mesh>
        <cylinderGeometry args={[RADIUS + 0.012, RADIUS + 0.012, HEIGHT, SEGMENTS, 1, true]} />
        <meshBasicMaterial
          color="#0a0c1a"
          side={THREE.DoubleSide}
          transparent
          opacity={0.32}
          depthWrite={false}
        />
      </mesh>

      {/* emissive rim — top */}
      <mesh position={[0, HEIGHT / 2, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[RADIUS + 0.008, 0.012, 8, SEGMENTS]} />
        <meshBasicMaterial
          ref={topRimRef}
          color="#dbe3ff"
          toneMapped={false}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* emissive rim — bottom */}
      <mesh position={[0, -HEIGHT / 2, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[RADIUS + 0.008, 0.014, 8, SEGMENTS]} />
        <meshBasicMaterial
          ref={botRimRef}
          color="#9aa9ff"
          toneMapped={false}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* soft halo disc beneath the screen — fakes light spill onto the dome */}
      <mesh position={[0, -HEIGHT / 2 - 0.05, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[RADIUS - 0.05, RADIUS + 0.35, SEGMENTS]} />
        <meshBasicMaterial
          color="#9aa9ff"
          toneMapped={false}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* suspension cables — six thin verticals anchored at the top rim,
          extending up off-frame so the screen reads as physically rigged */}
      {Array.from({ length: CABLE_COUNT }).map((_, i) => {
        const a = (i / CABLE_COUNT) * Math.PI * 2;
        const x = Math.cos(a) * (RADIUS + 0.012);
        const z = Math.sin(a) * (RADIUS + 0.012);
        // anchored at the top rim (y = HEIGHT/2) so the cable BOTTOM sits flush
        // with the rim and the cable extends straight up by CABLE_LENGTH
        const cy = HEIGHT / 2 + CABLE_LENGTH / 2;
        return (
          <group key={i} position={[x, cy, z]}>
            {/* main cable */}
            <mesh>
              <cylinderGeometry
                args={[CABLE_RADIUS, CABLE_RADIUS, CABLE_LENGTH, 6]}
              />
              <meshBasicMaterial color="#1e2030" transparent opacity={0.78} />
            </mesh>
            {/* tiny anchor stub on the rim for visual weight */}
            <mesh position={[0, -CABLE_LENGTH / 2 - 0.01, 0]}>
              <cylinderGeometry args={[CABLE_RADIUS * 1.8, CABLE_RADIUS * 1.8, 0.04, 8]} />
              <meshBasicMaterial color="#3a3d52" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
