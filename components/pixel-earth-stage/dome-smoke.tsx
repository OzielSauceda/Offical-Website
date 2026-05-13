"use client";

import { RefObject, useEffect, useMemo, useRef, useState } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { createSoftPuff } from "./textures";

const DOME_R = 1.82;
const TAU = Math.PI * 2;
const PALETTE_W = 192;
const PALETTE_H = 96;

type ZoneCfg = {
  count: number;
  latMin: number;
  latMax: number;
  maxScale: number;
  opacity: number;
  rise: number;
  upward: number;
  lateral: number;
  surfaceOffset: number;
  speedMin: number;
  speedMax: number;
};

const ZONES: ZoneCfg[] = [
  {
    count: 34,
    latMin: 0.78,
    latMax: 0.97,
    maxScale: 0.44,
    opacity: 0.38,
    rise: 0.24,
    upward: 0.42,
    lateral: 0.08,
    surfaceOffset: 0.055,
    speedMin: 0.045,
    speedMax: 0.085,
  },
  {
    count: 46,
    latMin: 0.3,
    latMax: 0.7,
    maxScale: 0.66,
    opacity: 0.2,
    rise: 0.44,
    upward: 0.22,
    lateral: 0.18,
    surfaceOffset: 0.06,
    speedMin: 0.04,
    speedMax: 0.075,
  },
  {
    count: 34,
    latMin: 0.05,
    latMax: 0.22,
    maxScale: 0.74,
    opacity: 0.1,
    rise: 0.52,
    upward: 0.12,
    lateral: 0.24,
    surfaceOffset: 0.045,
    speedMin: 0.035,
    speedMax: 0.065,
  },
];

type Props = {
  targetRotationRef: RefObject<number>;
  reducedMotion: boolean;
  isGlobeEnvironment: boolean;
};

type SmokePalette = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

type PuffCfg = {
  angle: number;
  lat: number;
  zone: number;
  phase: number;
  speed: number;
  maxScale: number;
  opacity: number;
  rise: number;
  upward: number;
  lateral: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  tangentX: number;
  tangentZ: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
};

export function DomeSmoke({
  targetRotationRef,
  reducedMotion,
  isGlobeEnvironment,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const spriteRefs = useRef<(THREE.Sprite | null)[]>([]);
  const matRefs = useRef<(THREE.SpriteMaterial | null)[]>([]);
  const smokeTex = useMemo(() => createSoftPuff(), []);
  const [palette, setPalette] = useState<SmokePalette | null>(null);

  useEffect(() => () => smokeTex.dispose(), [smokeTex]);

  useEffect(() => {
    let disposed = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (disposed) return;
      const canvas = document.createElement("canvas");
      canvas.width = PALETTE_W;
      canvas.height = PALETTE_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(
        img,
        0,
        0,
        img.naturalWidth,
        img.naturalHeight / 2,
        0,
        0,
        PALETTE_W,
        PALETTE_H,
      );
      const data = ctx.getImageData(0, 0, PALETTE_W, PALETTE_H).data;
      setPalette({ data, width: PALETTE_W, height: PALETTE_H });
    };
    img.src = "/textures/earth-blue-marble.jpg";
    return () => {
      disposed = true;
    };
  }, []);

  const puffs: PuffCfg[] = useMemo(() => {
    const arr: PuffCfg[] = [];
    for (let z = 0; z < ZONES.length; z++) {
      const zone = ZONES[z]!;
      for (let i = 0; i < zone.count; i++) {
        const a = ((i * 137 + z * 53 + 23) % 1000) / 1000;
        const b = ((i * 211 + z * 71 + 47) % 1000) / 1000;
        const c = ((i * 53 + z * 23 + 11) % 1000) / 1000;
        const d = ((i * 97 + z * 181 + 29) % 1000) / 1000;
        const lat = zone.latMin + a * (zone.latMax - zone.latMin);
        const theta = lat * Math.PI * 0.5;
        const ringR = DOME_R * Math.cos(theta);
        const ringY = DOME_R * Math.sin(theta);
        const angle = (i / zone.count) * TAU + z * 0.37 + (b - 0.5) * 0.34;
        const cx = Math.cos(angle);
        const cz = Math.sin(angle);
        const nx = cx * Math.cos(theta);
        const ny = Math.sin(theta);
        const nz = cz * Math.cos(theta);
        const isTop = z === 0;
        const isMid = z === 1;
        const scaleX = isTop
          ? 0.55 + b * 0.32
          : isMid
            ? 1.1 + b * 0.42
            : 1.45 + b * 0.5;
        const scaleY = isTop
          ? 1.35 + c * 0.7
          : isMid
            ? 0.78 + c * 0.34
            : 0.54 + c * 0.25;

        arr.push({
          angle,
          lat,
          zone: z,
          phase: d,
          speed: zone.speedMin + b * (zone.speedMax - zone.speedMin),
          maxScale: zone.maxScale * (0.82 + c * 0.36),
          opacity: zone.opacity * (0.78 + b * 0.3),
          rise: zone.rise * (0.8 + d * 0.38),
          upward: zone.upward * (0.8 + a * 0.34),
          lateral: zone.lateral * (0.55 + c * 0.9),
          baseX: cx * ringR + nx * zone.surfaceOffset,
          baseY: ringY + ny * zone.surfaceOffset,
          baseZ: cz * ringR + nz * zone.surfaceOffset,
          normalX: nx,
          normalY: ny,
          normalZ: nz,
          tangentX: -cz,
          tangentZ: cx,
          rotation: c * TAU,
          scaleX,
          scaleY,
        });
      }
    }
    return arr;
  }, []);

  useFrame(() => {
    const grp = groupRef.current;
    if (!grp) return;
    grp.visible = isGlobeEnvironment;
    if (!isGlobeEnvironment) return;

    grp.rotation.y += (targetRotationRef.current - grp.rotation.y) * 0.08;

    const t = performance.now() / 1000;
    for (let i = 0; i < puffs.length; i++) {
      const cfg = puffs[i]!;
      const sprite = spriteRefs.current[i];
      const mat = matRefs.current[i];
      if (!sprite || !mat) continue;

      const cycle = reducedMotion ? 0.42 : (t * cfg.speed + cfg.phase) % 1;
      const fadeIn = Math.min(1, cycle / 0.16);
      const fadeOut = Math.pow(Math.max(0, 1 - (cycle - 0.16) / 0.84), 1.7);
      const envelope = fadeIn * fadeOut;
      const swell = 0.24 + cycle * 0.92;
      const scale = Math.max(0.12, cfg.maxScale * swell);
      const drift = cycle * cfg.rise;
      const swirl =
        Math.sin(t * 0.34 + cfg.phase * TAU + cfg.zone * 1.7) *
        cfg.lateral *
        cycle;

      sprite.scale.set(scale * cfg.scaleX, scale * cfg.scaleY, 1);
      sprite.position.x =
        cfg.baseX + cfg.normalX * drift + cfg.tangentX * swirl;
      sprite.position.y =
        cfg.baseY + cfg.normalY * drift + cycle * cfg.upward;
      sprite.position.z =
        cfg.baseZ + cfg.normalZ * drift + cfg.tangentZ * swirl;

      mat.opacity = cfg.opacity * envelope;
      mat.rotation = cfg.rotation + cycle * 0.85;
      if (palette) {
        const x = Math.floor((cfg.angle / TAU) * palette.width) % palette.width;
        const y = Math.min(
          palette.height - 1,
          Math.max(0, Math.floor((1 - cfg.lat) * palette.height)),
        );
        const idx = (y * palette.width + x) * 4;
        const r = palette.data[idx]! / 255;
        const g = palette.data[idx + 1]! / 255;
        const b = palette.data[idx + 2]! / 255;
        const oceanScore = b - Math.max(r, g) * 0.52;
        const landScore = g + r * 0.3 - b * 0.72;
        if (oceanScore > landScore) {
          mat.color.setRGB(0.16, 0.5 + b * 0.22, 1);
        } else {
          mat.color.setRGB(0.28 + r * 0.18, 0.7 + g * 0.22, 0.28 + b * 0.08);
        }
      } else {
        mat.color.setRGB(0.78, 0.8, 0.86);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {puffs.map((p, i) => (
        <sprite
          key={i}
          ref={(el) => {
            spriteRefs.current[i] = el;
          }}
          position={[p.baseX, p.baseY, p.baseZ]}
          scale={[0.18, 0.18, 1]}
          renderOrder={4}
        >
          <spriteMaterial
            ref={(el) => {
              matRefs.current[i] = el;
            }}
            map={smokeTex}
            color="#d8dbe0"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={p.zone === 2}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}
