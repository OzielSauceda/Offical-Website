"use client";

import { useMemo } from "react";

import * as THREE from "three";

type Vertex = readonly [number, number, number];
type Face = readonly [number, number, number, ...number[]];
type StoneTextureMode = "base" | "ledge" | "upper" | "peak";

const LOWER_BASE_WEDGE_VERTICES = [
  [-3.45, -1.38, 1.62],
  [3.15, -1.38, 1.3],
  [2.55, -1.38, -2.05],
  [-3.2, -1.38, -1.62],
  [-1.92, -0.16, 0.78],
  [1.5, -0.12, 0.64],
  [0.92, 0.07, -0.88],
  [-1.18, 0.02, -0.66],
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
  [-1.28, -0.075, 0.52],
  [1.04, -0.075, 0.44],
  [0.86, -0.045, 0.26],
  [-1.02, -0.045, 0.3],
  [-1.22, -0.015, 0.5],
  [0.98, -0.015, 0.42],
  [0.8, -0.005, 0.3],
  [-0.94, -0.005, 0.34],
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
  [-1.16, -0.03, 0.24],
  [0.98, -0.03, 0.16],
  [1.02, 0.06, -0.78],
  [-0.72, 0.045, -0.68],
  [-0.82, 0.42, 0.08],
  [0.76, 0.44, 0.02],
  [0.82, 0.66, -0.92],
  [-0.5, 0.62, -0.82],
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
  [-0.62, 0.58, 0.44],
  [0.68, 0.58, 0.36],
  [-0.04, 0.74, 0.34],
  [-0.5, 0.62, -1.32],
  [0.84, 0.62, -1.24],
  [0.52, 1.78, -1.02],
] as const satisfies readonly Vertex[];

const TOP_TRIANGULAR_PEAK_FACES = [
  [0, 3, 5, 2],
  [1, 2, 5, 4],
  [0, 1, 4, 3],
  [0, 1, 2],
  [3, 5, 4],
] as const satisfies readonly Face[];

const STONE_COLORS = {
  darkStoneBase: "#2c2c34",
  mediumStone: "#555760",
  lightStone: "#8d8e96",
  ledgeHighlight: "#b9b8b5",
  crackGroove: "#15161d",
} as const;

export function createPolyGeometry(
  vertices: readonly Vertex[],
  faces: readonly Face[],
) {
  const indices: number[] = [];

  for (const face of faces) {
    for (let i = 1; i < face.length - 1; i++) {
      const b = face[i];
      const c = face[i + 1];

      if (b === undefined || c === undefined) {
        continue;
      }

      indices.push(face[0], b, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices.flat(), 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

function createStoneTexture(
  baseColor: string,
  mode: StoneTextureMode,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create stone texture context");
  }

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 1800; i++) {
    const v = 18 + Math.floor(Math.random() * 80);
    const alpha = 0.035 + Math.random() * 0.08;
    ctx.fillStyle = `rgba(${v}, ${v}, ${v + 8}, ${alpha})`;
    ctx.fillRect(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      1 + Math.random() * 2,
      1 + Math.random() * 3,
    );
  }

  ctx.strokeStyle = STONE_COLORS.crackGroove;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.28;

  if (mode === "ledge") {
    for (let y = 20; y < canvas.height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(y) * 3);
      ctx.lineTo(canvas.width, y + Math.cos(y * 0.4) * 4);
      ctx.stroke();
    }
  } else if (mode === "base") {
    for (let x = 12; x < canvas.width; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(x) * 2, 0);
      ctx.lineTo(x + Math.cos(x * 0.3) * 6, canvas.height);
      ctx.stroke();
    }
  } else {
    for (let x = -canvas.width; x < canvas.width; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x, canvas.height);
      ctx.lineTo(x + canvas.width * 0.75, 0);
      ctx.stroke();
    }
  }

  ctx.globalAlpha = mode === "ledge" ? 0.32 : 0.18;
  ctx.strokeStyle =
    mode === "ledge" ? STONE_COLORS.lightStone : STONE_COLORS.ledgeHighlight;

  for (let i = 0; i < 34; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x + 48 + Math.random() * 120,
      y + (mode === "base" ? Math.random() * 38 : -20 + Math.random() * 40),
    );
    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.35, 1.35);

  return texture;
}

function createStoneMaterial(
  color: string,
  mode: StoneTextureMode,
) {
  return new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: createStoneTexture(color, mode),
    roughness: 0.96,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
  });
}

function asVector(vertex: Vertex) {
  return new THREE.Vector3(vertex[0], vertex[1], vertex[2]);
}

function pushLine(
  positions: number[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  normal: THREE.Vector3,
) {
  const offset = normal.clone().multiplyScalar(0.008);
  const aa = a.clone().add(offset);
  const bb = b.clone().add(offset);
  positions.push(aa.x, aa.y, aa.z, bb.x, bb.y, bb.z);
}

function createGrooveGeometry(
  vertices: readonly Vertex[],
  faces: readonly Face[],
  mode: StoneTextureMode,
) {
  const positions: number[] = [];

  for (const face of faces) {
    const faceVerts = face.map((index) => asVector(vertices[index]!));
    const normal = new THREE.Vector3()
      .subVectors(faceVerts[1]!, faceVerts[0]!)
      .cross(new THREE.Vector3().subVectors(faceVerts[2]!, faceVerts[0]!))
      .normalize();

    if (faceVerts.length === 4) {
      const [a, b, c, d] = faceVerts as [
        THREE.Vector3,
        THREE.Vector3,
        THREE.Vector3,
        THREE.Vector3,
      ];

      const isVerticalFace = Math.abs(normal.y) < 0.28;
      const count = mode === "ledge" ? 4 : 6;

      for (let i = 1; i <= count; i++) {
        const t = i / (count + 1);

        if (isVerticalFace || mode === "base") {
          pushLine(
            positions,
            a.clone().lerp(b, t),
            d.clone().lerp(c, t),
            normal,
          );
        } else {
          pushLine(
            positions,
            a.clone().lerp(d, t),
            b.clone().lerp(c, Math.min(1, t + 0.22)),
            normal,
          );
        }
      }
    } else if (faceVerts.length === 3) {
      const [a, b, c] = faceVerts as [THREE.Vector3, THREE.Vector3, THREE.Vector3];

      for (let i = 1; i <= 4; i++) {
        const t = i / 5;
        pushLine(
          positions,
          a.clone().lerp(b, t),
          a.clone().lerp(c, Math.min(1, t + 0.18)),
          normal,
        );
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

export function DebugEdges({ geometry }: { geometry: THREE.BufferGeometry }) {
  return (
    <lineSegments renderOrder={30}>
      <edgesGeometry args={[geometry]} />
      <lineBasicMaterial color={STONE_COLORS.crackGroove} />
    </lineSegments>
  );
}

function EdgeWear({ geometry }: { geometry: THREE.BufferGeometry }) {
  return (
    <lineSegments renderOrder={25}>
      <edgesGeometry args={[geometry]} />
      <lineBasicMaterial
        color={STONE_COLORS.ledgeHighlight}
        transparent
        opacity={0.22}
      />
    </lineSegments>
  );
}

function StoneGrooves({
  geometry,
  mode,
}: {
  geometry: THREE.BufferGeometry;
  mode: StoneTextureMode;
}) {
  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: STONE_COLORS.crackGroove,
        transparent: true,
        opacity: mode === "ledge" ? 0.32 : 0.42,
      }),
    [mode],
  );

  return (
    <lineSegments geometry={geometry} material={material} renderOrder={28} />
  );
}

function StoneMesh({
  geometry,
  material,
  grooveGeometry,
  mode,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  grooveGeometry: THREE.BufferGeometry;
  mode: StoneTextureMode;
}) {
  return (
    <group>
      <mesh geometry={geometry} material={material} />
      <StoneGrooves geometry={grooveGeometry} mode={mode} />
      <EdgeWear geometry={geometry} />
      <DebugEdges geometry={geometry} />
    </group>
  );
}

export function LowerBaseWedge() {
  const geometry = useMemo(
    () =>
      createPolyGeometry(
        LOWER_BASE_WEDGE_VERTICES,
        LOWER_BASE_WEDGE_FACES,
      ),
    [],
  );
  const grooveGeometry = useMemo(
    () => createGrooveGeometry(LOWER_BASE_WEDGE_VERTICES, LOWER_BASE_WEDGE_FACES, "base"),
    [],
  );
  const material = useMemo(
    () => createStoneMaterial(STONE_COLORS.darkStoneBase, "base"),
    [],
  );

  return (
    <StoneMesh
      geometry={geometry}
      grooveGeometry={grooveGeometry}
      material={material}
      mode="base"
    />
  );
}

export function MiddleHorizontalLedge() {
  const geometry = useMemo(
    () =>
      createPolyGeometry(
        MIDDLE_HORIZONTAL_LEDGE_VERTICES,
        MIDDLE_HORIZONTAL_LEDGE_FACES,
      ),
    [],
  );
  const grooveGeometry = useMemo(
    () =>
      createGrooveGeometry(
        MIDDLE_HORIZONTAL_LEDGE_VERTICES,
        MIDDLE_HORIZONTAL_LEDGE_FACES,
        "ledge",
      ),
    [],
  );
  const material = useMemo(
    () => createStoneMaterial(STONE_COLORS.ledgeHighlight, "ledge"),
    [],
  );

  return (
    <StoneMesh
      geometry={geometry}
      grooveGeometry={grooveGeometry}
      material={material}
      mode="ledge"
    />
  );
}

export function UpperBlockTier() {
  const geometry = useMemo(
    () =>
      createPolyGeometry(
        UPPER_BLOCK_TIER_VERTICES,
        UPPER_BLOCK_TIER_FACES,
      ),
    [],
  );
  const grooveGeometry = useMemo(
    () => createGrooveGeometry(UPPER_BLOCK_TIER_VERTICES, UPPER_BLOCK_TIER_FACES, "upper"),
    [],
  );
  const material = useMemo(
    () => createStoneMaterial(STONE_COLORS.mediumStone, "upper"),
    [],
  );

  return (
    <StoneMesh
      geometry={geometry}
      grooveGeometry={grooveGeometry}
      material={material}
      mode="upper"
    />
  );
}

export function TopTriangularPeak() {
  const geometry = useMemo(
    () =>
      createPolyGeometry(
        TOP_TRIANGULAR_PEAK_VERTICES,
        TOP_TRIANGULAR_PEAK_FACES,
      ),
    [],
  );
  const grooveGeometry = useMemo(
    () =>
      createGrooveGeometry(
        TOP_TRIANGULAR_PEAK_VERTICES,
        TOP_TRIANGULAR_PEAK_FACES,
        "peak",
      ),
    [],
  );
  const material = useMemo(
    () => createStoneMaterial(STONE_COLORS.lightStone, "peak"),
    [],
  );

  return (
    <StoneMesh
      geometry={geometry}
      grooveGeometry={grooveGeometry}
      material={material}
      mode="peak"
    />
  );
}

export function YeezusMountainDebug() {
  return (
    <group rotation-y={-0.28}>
      <LowerBaseWedge />
      <MiddleHorizontalLedge />
      <UpperBlockTier />
      <TopTriangularPeak />
    </group>
  );
}
