"use client";

import { useEffect, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { createSpotlightGlow } from "./textures";

// each "beam" is an additive light pool painted on the upper hemisphere at
// the point where the old cone's centerline would have hit the sphere, plus
// a very faint truncated-cone projection ray descending from the arena
// screen underside down to that lit point (so the screen reads as the
// source of the light). pools + rays orbit together inside this group.
type PatchCfg = {
  litPoint: [number, number, number];
  color: string;
  coreRadius: number;
  haloRadius: number;
  baseOpacity: number;
  pulseAmp: number;
  pulseSpeed: number;
  phase: number;
  rayTopRadius: number;
  rayBottomRadius: number;
  rayOpacity: number;
};

// raycast intersections from each beam source toward origin, r=1.52 sphere
const PATCHES: PatchCfg[] = [
  {
    // front-right cool
    litPoint: [0.859, 1.241, 0.190],
    color: "#a8b6ff",
    coreRadius: 0.89,
    haloRadius: 1.26,
    baseOpacity: 1.0,
    pulseAmp: 0.22,
    pulseSpeed: 1.4,
    phase: 0,
    rayTopRadius: 0.16,
    rayBottomRadius: 0.5,
    rayOpacity: 0.07,
  },
  {
    // front-left pink
    litPoint: [-0.859, 1.241, 0.190],
    color: "#ff9ab2",
    coreRadius: 0.89,
    haloRadius: 1.26,
    baseOpacity: 1.0,
    pulseAmp: 0.22,
    pulseSpeed: 1.4,
    phase: Math.PI,
    rayTopRadius: 0.16,
    rayBottomRadius: 0.5,
    rayOpacity: 0.07,
  },
  {
    // back-right cool
    litPoint: [0.379, 1.230, -0.804],
    color: "#9aa9ff",
    coreRadius: 0.68,
    haloRadius: 1.0,
    baseOpacity: 0.75,
    pulseAmp: 0.18,
    pulseSpeed: 0.9,
    phase: 1.1,
    rayTopRadius: 0.13,
    rayBottomRadius: 0.38,
    rayOpacity: 0.05,
  },
  {
    // back-left pink
    litPoint: [-0.379, 1.230, -0.804],
    color: "#ff8aa0",
    coreRadius: 0.68,
    haloRadius: 1.0,
    baseOpacity: 0.75,
    pulseAmp: 0.18,
    pulseSpeed: 0.9,
    phase: 1.1 + Math.PI,
    rayTopRadius: 0.13,
    rayBottomRadius: 0.38,
    rayOpacity: 0.05,
  },
  {
    // top spot — pale fill just behind the lighthouse
    litPoint: [0, 1.52, 0],
    color: "#cfd8ff",
    coreRadius: 0.47,
    haloRadius: 0.73,
    baseOpacity: 0.55,
    pulseAmp: 0.13,
    pulseSpeed: 0.7,
    phase: 0.5,
    rayTopRadius: 0.09,
    rayBottomRadius: 0.26,
    rayOpacity: 0.04,
  },
];

// patches sit just outside the dome surface (radius 1.52 × 1.004)
const SURFACE_OFFSET = 1.004;
const HALO_OFFSET = 1.002;
// underside of the arena screen (Y=2.85, HEIGHT=0.85 → bottom at y=2.425)
const SCREEN_UNDERSIDE_Y = 2.425;
const ZAXIS = new THREE.Vector3(0, 0, 1);

export function StageBeams({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const haloRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const rayRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const glowTex = useMemo(() => createSpotlightGlow(), []);

  useEffect(() => {
    return () => glowTex.dispose();
  }, [glowTex]);

  // patch positions/quat + ray positions/heights, computed once
  const placements = useMemo(() => {
    return PATCHES.map((p) => {
      const v = new THREE.Vector3(...p.litPoint);
      const corePos = v.clone().multiplyScalar(SURFACE_OFFSET);
      const haloPos = v.clone().multiplyScalar(HALO_OFFSET);
      const q = new THREE.Quaternion().setFromUnitVectors(ZAXIS, v.clone().normalize());
      const rayHeight = Math.max(0.01, SCREEN_UNDERSIDE_Y - v.y);
      const rayCenterY = (SCREEN_UNDERSIDE_Y + v.y) / 2;
      return {
        corePos: [corePos.x, corePos.y, corePos.z] as [number, number, number],
        haloPos: [haloPos.x, haloPos.y, haloPos.z] as [number, number, number],
        quat: [q.x, q.y, q.z, q.w] as [number, number, number, number],
        rayPos: [v.x, rayCenterY, v.z] as [number, number, number],
        rayHeight,
      };
    });
  }, []);

  useFrame((_, delta) => {
    const grp = groupRef.current;
    if (!grp) return;
    if (!reducedMotion) {
      grp.rotation.y += delta * 0.06;
    }
    const t = performance.now() / 1000;
    for (let i = 0; i < PATCHES.length; i++) {
      const core = coreRefs.current[i];
      const halo = haloRefs.current[i];
      const ray = rayRefs.current[i];
      const cfg = PATCHES[i];
      if (!cfg) continue;
      const wave = reducedMotion
        ? 0
        : Math.sin(t * cfg.pulseSpeed + cfg.phase);
      const target = cfg.baseOpacity + cfg.pulseAmp * wave;
      if (core) core.opacity = Math.min(1, target);
      if (halo) halo.opacity = Math.min(1, target * 0.45);
      if (ray) ray.opacity = Math.max(0, cfg.rayOpacity + 0.015 * wave);
    }
  });

  return (
    <group ref={groupRef}>
      {PATCHES.map((p, i) => {
        const place = placements[i];
        if (!place) return null;
        return (
          <group key={i}>
            {/* faint projection ray from screen underside down to the lit pool */}
            <mesh position={place.rayPos} renderOrder={0}>
              <cylinderGeometry
                args={[p.rayTopRadius, p.rayBottomRadius, place.rayHeight, 24, 1, true]}
              />
              <meshBasicMaterial
                ref={(el) => {
                  rayRefs.current[i] = el;
                }}
                color={p.color}
                transparent
                opacity={p.rayOpacity}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                depthTest={true}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>

            {/* soft halo, wider, sits just under the core */}
            <mesh position={place.haloPos} quaternion={place.quat} renderOrder={1}>
              <circleGeometry args={[p.haloRadius, 48]} />
              <meshBasicMaterial
                ref={(el) => {
                  haloRefs.current[i] = el;
                }}
                map={glowTex}
                color={p.color}
                transparent
                opacity={p.baseOpacity * 0.45}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                depthTest={true}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>

            {/* bright hot core */}
            <mesh position={place.corePos} quaternion={place.quat} renderOrder={2}>
              <circleGeometry args={[p.coreRadius, 48]} />
              <meshBasicMaterial
                ref={(el) => {
                  coreRefs.current[i] = el;
                }}
                map={glowTex}
                color={p.color}
                transparent
                opacity={p.baseOpacity}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                depthTest={true}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
