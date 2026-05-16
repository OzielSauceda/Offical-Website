"use client";

// arena screen scrolls its texture and pulses lightly each frame
/* eslint-disable react-hooks/immutability */

import { useEffect, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { createScreenTexture } from "./textures";

const RADIUS = 1.96;
const HEIGHT = 0.82;
const Y = 2.87;
const SEGMENTS = 96;
const CABLE_COUNT = 6;
const CABLE_LENGTH = 1.18;
const CABLE_RADIUS = 0.009;

type Props = {
  reducedMotion: boolean;
  entered: boolean;
  enteredHeader: string;
  enteredSubhead: string;
};

export function ArenaScreen({
  reducedMotion,
}: Props) {
  const baseTexture = useMemo(() => createScreenTexture(), []);
  const screenMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const topRimRef = useRef<THREE.MeshBasicMaterial>(null);
  const botRimRef = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    return () => {
      baseTexture.dispose();
    };
  }, [baseTexture]);

  useFrame((_, delta) => {
    const mat = screenMatRef.current;
    if (!mat) return;

    // screen keeps the base scrolling cream display in every state — no
    // flash-to-title swap on enter so the visual stays consistent.
    if (!reducedMotion) {
      baseTexture.offset.x = (baseTexture.offset.x + delta * 0.03) % 1;
    }

    const t = performance.now() / 1000;
    const beat = 0.5 + 0.5 * Math.sin(t * 1.5);
    if (topRimRef.current) {
      topRimRef.current.opacity = 0.85 + 0.18 * beat;
    }
    if (botRimRef.current) {
      botRimRef.current.opacity = 0.55 + 0.2 * beat;
    }
    const v = 0.98 + 0.12 * beat;
    mat.color.setRGB(v, v, v);
  });

  return (
    <group position={[0, Y, 0]}>
      {/* inner face — viewed from below the dome, slight inward glow */}
      <mesh>
        <cylinderGeometry args={[RADIUS, RADIUS, HEIGHT, SEGMENTS, 1, true]} />
        <meshBasicMaterial
          ref={screenMatRef}
          map={baseTexture}
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent
          opacity={0.98}
        />
      </mesh>

      {/* dark structural underside band — a short cylinder hanging just
          below the bright screen face, like the dark mounting skirt on a
          real arena jumbotron. gives the screen physical thickness. */}
      <mesh position={[0, -HEIGHT / 2 - 0.07, 0]}>
        <cylinderGeometry
          args={[RADIUS + 0.018, RADIUS + 0.006, 0.16, SEGMENTS, 1, true]}
        />
        <meshBasicMaterial
          color="#100c08"
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* emissive rim — top edge of the bright screen face, warm cream
          highlight where the screen meets the rigging. */}
      <mesh position={[0, HEIGHT / 2, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[RADIUS + 0.008, 0.014, 8, SEGMENTS]} />
        <meshBasicMaterial
          ref={topRimRef}
          color="#fff2cc"
          toneMapped={false}
          transparent
          opacity={0.92}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* emissive rim — bottom, a softer warm amber seam where the
          bright display face transitions into the darker structural
          underside. */}
      <mesh position={[0, -HEIGHT / 2, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[RADIUS + 0.008, 0.016, 8, SEGMENTS]} />
        <meshBasicMaterial
          ref={botRimRef}
          color="#d8a868"
          toneMapped={false}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
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
