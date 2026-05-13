"use client";

// Yeezus-style carved stone mountain — production version for the Projects environment.
// Geometry was tuned in yeezus-mountain-debug.tsx; this is the production render.

import { RefObject, useEffect, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { PeakCharacter } from "./peak-character";

type Vertex = readonly [number, number, number];
type Face = readonly [number, number, number, ...number[]];

const STONE = {
  darkStone: "#2c2c34",
  mediumStone: "#555760",
  lightStone: "#8d8e96",
  ledgeHighlight: "#b9b8b5",
  crack: "#15161d",
} as const;

type StoneStyle = "base" | "ledge" | "upper" | "peak";

const STONE_STYLE: Record<
  StoneStyle,
  { fill: string; streak: string; highlight: string }
> = {
  base: { fill: STONE.darkStone, streak: STONE.crack, highlight: STONE.mediumStone },
  ledge: { fill: STONE.ledgeHighlight, streak: STONE.lightStone, highlight: "#d6d5d1" },
  upper: { fill: STONE.mediumStone, streak: STONE.crack, highlight: STONE.lightStone },
  peak: { fill: STONE.lightStone, streak: STONE.darkStone, highlight: STONE.ledgeHighlight },
};

const LOWER_BASE_WEDGE_VERTICES = [
  [-3.8, -1.6, 2.15],
  [3.35, -1.6, 1.6],
  [2.95, -1.6, -2.3],
  [-2.6, -1.6, -2.55],
  [-1.95, -0.18, 1.1],
  [2.05, -0.18, 1.0],
  [1.9, -0.04, -1.92],
  [-1.1, -0.04, -1.82],
] as const satisfies readonly Vertex[];

const LOWER_BASE_WEDGE_FACES = [
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [1, 2, 6, 5],
  [2, 3, 7, 6],
  [3, 0, 4, 7],
  [3, 2, 1, 0],
] as const satisfies readonly Face[];

const MIDDLE_HORIZONTAL_LEDGE_VERTICES = [
  [-1.6, -0.22, 1.0],
  [2.22, -0.16, 0.88],
  [2.02, -0.1, -1.98],
  [-0.92, -0.08, -1.86],
  [-1.5, -0.04, 0.92],
  [2.14, 0.02, 0.78],
  [1.92, 0.1, -1.96],
  [-0.85, 0.12, -1.82],
] as const satisfies readonly Vertex[];

const MIDDLE_HORIZONTAL_LEDGE_FACES = [
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [1, 2, 6, 5],
  [2, 3, 7, 6],
  [3, 0, 4, 7],
  [3, 2, 1, 0],
] as const satisfies readonly Face[];

const UPPER_BLOCK_TIER_VERTICES = [
  [-0.88, 0.04, 0.88],
  [1.92, 0.04, 0.72],
  [1.6, 0.04, -1.82],
  [-0.68, 0.04, -1.66],
  [-0.48, 0.3, 0.52],
  [1.5, 0.38, 0.26],
  [1.32, 0.98, -1.64],
  [0.08, 0.74, -1.4],
] as const satisfies readonly Vertex[];

const UPPER_BLOCK_TIER_FACES = [
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [1, 2, 6, 5],
  [2, 3, 7, 6],
  [3, 0, 4, 7],
  [3, 2, 1, 0],
] as const satisfies readonly Face[];

const TOP_TRIANGULAR_PEAK_VERTICES = [
  [-0.5, 0.18, 0.42],
  [1.0, 0.18, 0.2],
  [1.32, 0.18, -1.2],
  [-0.05, 0.18, -1.34],
  [0.35, 0.94, 0.04],
  [1.18, 2.3, -1.32],
] as const satisfies readonly Vertex[];

const TOP_TRIANGULAR_PEAK_FACES = [
  [0, 3, 2, 1],
  [1, 2, 5, 4],
  [3, 0, 4, 5],
  [0, 1, 4],
  [2, 3, 5],
] as const satisfies readonly Face[];

function createPolyGeometry(
  vertices: readonly Vertex[],
  faces: readonly Face[],
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let cursor = 0;

  for (const face of faces) {
    const corners: THREE.Vector3[] = [];
    for (const idx of face) {
      const v = vertices[idx]!;
      corners.push(new THREE.Vector3(v[0], v[1], v[2]));
    }
    if (corners.length < 3) continue;

    const edge1 = new THREE.Vector3().subVectors(corners[1]!, corners[0]!);
    const edge2 = new THREE.Vector3().subVectors(corners[2]!, corners[0]!);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    const absN = new THREE.Vector3(
      Math.abs(normal.x),
      Math.abs(normal.y),
      Math.abs(normal.z),
    );
    const ref =
      absN.y >= absN.x && absN.y >= absN.z
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3().crossVectors(normal, ref).normalize();
    const bitangent = new THREE.Vector3()
      .crossVectors(normal, tangent)
      .normalize()
      .negate();

    const origin = corners[0]!;
    const baseIndex = cursor;

    for (const c of corners) {
      positions.push(c.x, c.y, c.z);
      const local = new THREE.Vector3().subVectors(c, origin);
      uvs.push(local.dot(tangent), local.dot(bitangent));
      cursor += 1;
    }

    for (let i = 1; i < corners.length - 1; i++) {
      indices.push(baseIndex, baseIndex + i, baseIndex + i + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createStoneTexture(style: StoneStyle) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create stone texture context");

  const palette = STONE_STYLE[style];

  ctx.fillStyle = palette.fill;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 2400; i++) {
    const v = 14 + Math.floor(Math.random() * 70);
    const alpha = 0.035 + Math.random() * 0.09;
    ctx.fillStyle = `rgba(${v}, ${v}, ${v + 6}, ${alpha})`;
    ctx.fillRect(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      1 + Math.random() * 2,
      1 + Math.random() * 3,
    );
  }

  ctx.lineCap = "round";
  ctx.strokeStyle = palette.streak;

  if (style === "base") {
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.32;
    for (let x = 6; x < canvas.width; x += 12 + Math.random() * 18) {
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(x * 0.32) * 5, -10);
      ctx.lineTo(x + Math.cos(x * 0.18) * 9, canvas.height + 10);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      let cx = x;
      let cy = y;
      for (let s = 0; s < 3; s++) {
        cx += (Math.random() - 0.5) * 30;
        cy += 30 + Math.random() * 60;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  } else if (style === "ledge") {
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.22;
    for (let y = 4; y < canvas.height; y += 16 + Math.random() * 10) {
      ctx.beginPath();
      ctx.moveTo(-10, y + Math.sin(y * 0.22) * 3);
      ctx.lineTo(canvas.width + 10, y + Math.cos(y * 0.15) * 4);
      ctx.stroke();
    }
    ctx.strokeStyle = palette.highlight;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const y = (i + 0.5) * 100 + (Math.random() - 0.5) * 30;
      ctx.beginPath();
      ctx.moveTo(-10, y);
      ctx.lineTo(canvas.width + 10, y + (Math.random() - 0.5) * 18);
      ctx.stroke();
    }
  } else {
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.32;
    for (
      let i = -canvas.width;
      i < canvas.width * 2;
      i += 12 + Math.random() * 18
    ) {
      ctx.beginPath();
      ctx.moveTo(i, canvas.height + 10);
      ctx.lineTo(i + canvas.width * 0.72, -10);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + 60 + Math.random() * 100,
        y - 80 - Math.random() * 60,
      );
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = palette.highlight;
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40 + Math.random() * 90, y + (Math.random() - 0.5) * 20);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.45, 0.45);
  texture.anisotropy = 4;
  return texture;
}

function createStoneMaterial(style: StoneStyle) {
  return new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: createStoneTexture(style),
    roughness: 0.96,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
  });
}

const MODEL_SCALE = 0.46;
// Mountain's local bottom is y = -1.6. Offsetting by +0.736 places the base at world y=0,
// landing it on the same plane as the glow ring / where the dome sat.
const MODEL_Y = 0.736;
const AUTO_SPEED = 0.22;
const RESUME_DELAY_MS = 1400;

type Props = {
  targetRotationRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  lastInteractionRef: RefObject<number>;
  reducedMotion: boolean;
  isPyramidEnvironment: boolean;
};

export function YeezusMountainStage({
  targetRotationRef,
  isDraggingRef,
  lastInteractionRef,
  reducedMotion,
  isPyramidEnvironment,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);

  const baseGeo = useMemo(
    () =>
      createPolyGeometry(LOWER_BASE_WEDGE_VERTICES, LOWER_BASE_WEDGE_FACES),
    [],
  );
  const ledgeGeo = useMemo(
    () =>
      createPolyGeometry(
        MIDDLE_HORIZONTAL_LEDGE_VERTICES,
        MIDDLE_HORIZONTAL_LEDGE_FACES,
      ),
    [],
  );
  const upperGeo = useMemo(
    () =>
      createPolyGeometry(UPPER_BLOCK_TIER_VERTICES, UPPER_BLOCK_TIER_FACES),
    [],
  );
  const peakGeo = useMemo(
    () =>
      createPolyGeometry(
        TOP_TRIANGULAR_PEAK_VERTICES,
        TOP_TRIANGULAR_PEAK_FACES,
      ),
    [],
  );

  const baseMat = useMemo(() => createStoneMaterial("base"), []);
  const ledgeMat = useMemo(() => createStoneMaterial("ledge"), []);
  const upperMat = useMemo(() => createStoneMaterial("upper"), []);
  const peakMat = useMemo(() => createStoneMaterial("peak"), []);

  useEffect(() => {
    const geos = [baseGeo, ledgeGeo, upperGeo, peakGeo];
    const mats = [baseMat, ledgeMat, upperMat, peakMat];
    return () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    };
  }, [baseGeo, ledgeGeo, upperGeo, peakGeo, baseMat, ledgeMat, upperMat, peakMat]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    g.visible = isPyramidEnvironment;
    if (!isPyramidEnvironment) return;

    // mirror the dome's auto-spin behavior so the mountain drifts slowly to
    // the right when the user isn't interacting with it.
    const sinceInteraction = performance.now() - lastInteractionRef.current;
    const canAutoRotate =
      !reducedMotion &&
      !isDraggingRef.current &&
      sinceInteraction > RESUME_DELAY_MS;
    if (canAutoRotate) {
      targetRotationRef.current += AUTO_SPEED * delta;
    }

    const target = targetRotationRef.current;
    const current = g.rotation.y;
    const k = reducedMotion ? 1 : Math.min(1, delta * 14);
    g.rotation.y = current + (target - current) * k;
  });

  return (
    <group ref={groupRef} position={[0, MODEL_Y, 0]} scale={MODEL_SCALE}>
      <group rotation-y={-0.28}>
        <mesh geometry={baseGeo} material={baseMat} />
        <mesh geometry={ledgeGeo} material={ledgeMat} />
        <mesh geometry={upperGeo} material={upperMat} />
        <mesh geometry={peakGeo} material={peakMat} />
        {/* peak vertex is v5 = (1.18, 2.3, -1.32) in this frame.
            sprite local scale 0.913 gives a world-space scale of 0.42 (same
            as the globe character), and y = peak + half the sprite height so
            the character stands on the peak instead of straddling it. */}
        <PeakCharacter
          isVisible={isPyramidEnvironment}
          reducedMotion={reducedMotion}
          position={[1.18, 2.757, -1.32]}
          scale={0.913}
          bobAmplitude={0.052}
        />
      </group>
    </group>
  );
}
