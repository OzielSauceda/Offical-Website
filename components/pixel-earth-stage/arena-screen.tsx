"use client";

// arena screen scrolls its texture and pulses lightly each frame
/* eslint-disable react-hooks/immutability */

import { useEffect, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { createScreenTexture, createTitleFlashTexture } from "./textures";

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
  entered,
  enteredHeader,
  enteredSubhead,
}: Props) {
  const baseTexture = useMemo(() => createScreenTexture(), []);
  // one cached flash texture per header+sub pair. cleared on unmount.
  const flashCacheRef = useRef<Map<string, THREE.CanvasTexture>>(new Map());
  const screenMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const topRimRef = useRef<THREE.MeshBasicMaterial>(null);
  const botRimRef = useRef<THREE.MeshBasicMaterial>(null);
  // tracks the transition. ramps to 1 when entered, back to 0 when not.
  const flashRef = useRef(0);
  const lastAppliedKeyRef = useRef<"base" | string>("base");

  useEffect(() => {
    const cache = flashCacheRef.current;
    return () => {
      baseTexture.dispose();
      cache.forEach((t) => t.dispose());
      cache.clear();
    };
  }, [baseTexture]);

  const getFlashTexture = (header: string, sub: string) => {
    const cache = flashCacheRef.current;
    const key = `${header}${sub}`;
    let t = cache.get(key);
    if (!t) {
      t = createTitleFlashTexture(header, sub);
      cache.set(key, t);
    }
    return t;
  };

  useFrame((_, delta) => {
    const mat = screenMatRef.current;
    if (!mat) return;

    // ramp the flash transition. 0 = base scrolling screen, 1 = locked title.
    // the swap happens at the midpoint so the screen briefly dims through black.
    const targetFlash = entered ? 1 : 0;
    const rate = reducedMotion ? 1 : Math.min(1, delta * 12);
    flashRef.current += (targetFlash - flashRef.current) * rate;

    // apply texture based on current side of the swap point
    const wantKey: "base" | string = entered
      ? `${enteredHeader}${enteredSubhead}`
      : "base";
    if (lastAppliedKeyRef.current !== wantKey && flashRef.current < 0.5) {
      // mid-fade: swap the source
      mat.map = entered
        ? getFlashTexture(enteredHeader, enteredSubhead)
        : baseTexture;
      mat.needsUpdate = true;
      lastAppliedKeyRef.current = wantKey;
    }
    if (lastAppliedKeyRef.current === wantKey) {
      // already on the right texture; nothing to do for the swap
    }

    // dip the screen brightness through the swap so it reads as a flicker
    const dipBase = Math.abs(flashRef.current - (entered ? 0.5 : 0.5));
    const dip = 1.0 - Math.max(0, 0.55 - dipBase * 1.1);

    if (!entered && !reducedMotion) {
      // base mode: scroll + pulse
      baseTexture.offset.x = (baseTexture.offset.x + delta * 0.03) % 1;
    }

    const t = performance.now() / 1000;
    const beat = 0.5 + 0.5 * Math.sin(t * 1.5);
    if (topRimRef.current) {
      topRimRef.current.opacity = (0.75 + 0.22 * beat) * dip;
    }
    if (botRimRef.current) {
      botRimRef.current.opacity = (0.65 + 0.22 * beat) * dip;
    }
    // base brightness modulation while not entered; held bright while entered
    const v = entered ? 1.0 : 0.92 + 0.1 * beat;
    mat.color.setRGB(v * dip, v * dip, v * dip);
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

      {/* outer scrim — a slightly larger cylinder with subtle gradient for depth */}
      <mesh>
        <cylinderGeometry args={[RADIUS + 0.012, RADIUS + 0.012, HEIGHT, SEGMENTS, 1, true]} />
        <meshBasicMaterial
          color="#0a0c1a"
          side={THREE.DoubleSide}
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>

      {/* emissive rim — top */}
      <mesh position={[0, HEIGHT / 2, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[RADIUS + 0.008, 0.014, 8, SEGMENTS]} />
        <meshBasicMaterial
          ref={topRimRef}
          color="#eef3ff"
          toneMapped={false}
          transparent
          opacity={0.88}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* emissive rim — bottom */}
      <mesh position={[0, -HEIGHT / 2, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[RADIUS + 0.008, 0.018, 8, SEGMENTS]} />
        <meshBasicMaterial
          ref={botRimRef}
          color="#c9d4ff"
          toneMapped={false}
          transparent
          opacity={0.78}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* soft halo disc beneath the screen — fakes light spill onto the dome */}
      <mesh position={[0, -HEIGHT / 2 - 0.05, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[RADIUS - 0.05, RADIUS + 0.45, SEGMENTS]} />
        <meshBasicMaterial
          color="#a7b5ff"
          toneMapped={false}
          transparent
          opacity={0.15}
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
