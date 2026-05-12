"use client";

// Projects section environment: blockout for an asymmetric stage wedge.
// Mountain parts are custom BufferGeometry meshes; no stairs, cones, or
// centered stacked frustums.
/* eslint-disable react-hooks/immutability */

import { RefObject, useEffect, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  createSmokeTexture,
  createStageFloorTexture,
} from "./textures";

type Props = {
  targetRotationRef: RefObject<number>;
  reducedMotion: boolean;
  envBlendRef: RefObject<number>;
};

type Point = readonly [number, number, number];

const MODEL_SCALE = 0.43;
const MODEL_Y = 0.095;

const FLOOR_Y = 0;
const BASE_Y = 0.82;
const TERRACE_Y = 1.04;
const WEDGE_Y = 1.07;

const BASE_BOTTOM = {
  fl: [-4.25, FLOOR_Y, 2.45] as Point,
  fr: [4.35, FLOOR_Y, 2.22] as Point,
  rr: [3.75, FLOOR_Y, -2.75] as Point,
  rl: [-3.85, FLOOR_Y, -2.55] as Point,
};

const BASE_TOP = {
  fl: [-3.35, BASE_Y, 1.58] as Point,
  fr: [3.42, BASE_Y, 1.42] as Point,
  rr: [3.05, BASE_Y, -2.05] as Point,
  rl: [-2.95, BASE_Y, -1.88] as Point,
};

const TERRACE_OUTER = {
  fl: [-3.55, TERRACE_Y, 1.78] as Point,
  fr: [3.75, TERRACE_Y, 1.58] as Point,
  rr: [3.25, TERRACE_Y, -2.18] as Point,
  rl: [-3.08, TERRACE_Y, -2.0] as Point,
};

const WEDGE_BASE = {
  // Larger and less centered so it does not look like a tiny pyramid on a table.
  fl: [-2.55, WEDGE_Y, 1.18] as Point,
  fr: [1.65, WEDGE_Y, 1.02] as Point,
  rr: [1.38, WEDGE_Y, -1.72] as Point,
  rl: [-1.65, WEDGE_Y, -1.82] as Point,
};

// Long ridge instead of one centered pyramid point.
// This makes the top read like a stage wedge / mountain face.
const RIDGE_FRONT: Point = [-0.55, 3.55, 0.86];
const RIDGE_REAR: Point = [-0.2, 3.42, -1.42];

type StageGeometry = {
  platform: THREE.BufferGeometry;
  frontApron: THREE.BufferGeometry;
  lowerBase: THREE.BufferGeometry;
  frontLowerWall: THREE.BufferGeometry;
  middleTerrace: THREE.BufferGeometry;
  upperWedge: THREE.BufferGeometry;
  leftDiagonalSlope: THREE.BufferGeometry;
  rightDiagonalSlope: THREE.BufferGeometry;
  rearPlatformExtension: THREE.BufferGeometry;
  surfaceTextureLines: THREE.BufferGeometry;
};

function v(point: Point) {
  return new THREE.Vector3(
    point[0] * MODEL_SCALE,
    point[1] * MODEL_SCALE + MODEL_Y,
    point[2] * MODEL_SCALE,
  );
}

function createPolygonGeometry(faces: Point[][]): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let vi = 0;

  for (const face of faces) {
    const verts = face.map(v);
    const normal = new THREE.Vector3()
      .subVectors(verts[1]!, verts[0]!)
      .cross(new THREE.Vector3().subVectors(verts[2]!, verts[0]!))
      .normalize();

    for (const vert of verts) {
      positions.push(vert.x, vert.y, vert.z);
      if (Math.abs(normal.y) > 0.7) {
        uvs.push(vert.x, vert.z);
      } else {
        uvs.push(vert.x, vert.y);
      }
    }

    for (let i = 1; i < verts.length - 1; i++) {
      indices.push(vi, vi + i, vi + i + 1);
    }
    vi += verts.length;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createPrismGeometry(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number,
) {
  const a: Point = [minX, minY, maxZ];
  const b: Point = [maxX, minY, maxZ];
  const c: Point = [maxX, minY, minZ];
  const d: Point = [minX, minY, minZ];
  const e: Point = [minX, maxY, maxZ];
  const f: Point = [maxX, maxY, maxZ];
  const g: Point = [maxX, maxY, minZ];
  const h: Point = [minX, maxY, minZ];

  return createPolygonGeometry([
    [e, f, g, h],
    [a, b, f, e],
    [b, c, g, f],
    [c, d, h, g],
    [d, a, e, h],
  ]);
}

function createLowerBaseGeometry() {
  return createPolygonGeometry([
    // Top support under terrace
    [BASE_TOP.fl, BASE_TOP.fr, BASE_TOP.rr, BASE_TOP.rl],

    // Front heavy wall
    [BASE_BOTTOM.fl, BASE_BOTTOM.fr, BASE_TOP.fr, BASE_TOP.fl],

    // Right heavy wall
    [BASE_BOTTOM.fr, BASE_BOTTOM.rr, BASE_TOP.rr, BASE_TOP.fr],

    // Rear wall
    [BASE_BOTTOM.rr, BASE_BOTTOM.rl, BASE_TOP.rl, BASE_TOP.rr],

    // Left sloped wall
    [BASE_BOTTOM.rl, BASE_BOTTOM.fl, BASE_TOP.fl, BASE_TOP.rl],
  ]);
}

function createFrontLowerWallGeometry() {
  // Keep this as a darker overlay on the lower front, but do not make it a separate box.
  return createPolygonGeometry([
    [
      [-3.45, FLOOR_Y + 0.02, 2.48],
      [3.65, FLOOR_Y + 0.02, 2.28],
      [3.15, BASE_Y + 0.02, 1.48],
      [-2.85, BASE_Y + 0.02, 1.64],
    ],
  ]);
}

function createLeftDiagonalSlopeGeometry() {
  return createPolygonGeometry([
    // Big diagonal ramp-like side plane on the left/front.
    [
      [-4.2, FLOOR_Y + 0.02, 2.42],
      [-2.4, FLOOR_Y + 0.02, 2.28],
      [-1.38, TERRACE_Y + 0.02, 1.23],
      [-3.35, TERRACE_Y + 0.02, 1.72],
    ],

    // Left rear diagonal support plane.
    [
      [-3.85, FLOOR_Y + 0.02, -2.55],
      [-4.2, FLOOR_Y + 0.02, 2.42],
      [-3.35, TERRACE_Y + 0.02, 1.72],
      [-3.08, TERRACE_Y + 0.02, -2.0],
    ],
  ]);
}

function createRightDiagonalSlopeGeometry() {
  return createPolygonGeometry([
    // Big diagonal ramp-like side plane on the right/front.
    [
      [2.2, FLOOR_Y + 0.02, 2.25],
      [4.35, FLOOR_Y + 0.02, 2.22],
      [3.75, TERRACE_Y + 0.02, 1.58],
      [1.52, TERRACE_Y + 0.02, 1.08],
    ],

    // Right rear diagonal support plane.
    [
      [4.35, FLOOR_Y + 0.02, 2.22],
      [3.75, FLOOR_Y + 0.02, -2.75],
      [3.25, TERRACE_Y + 0.02, -2.18],
      [3.75, TERRACE_Y + 0.02, 1.58],
    ],
  ]);
}

function createMiddleTerraceGeometry() {
  return createPolygonGeometry([
    // Front terrace band, thinner and more stage-like.
    [TERRACE_OUTER.fl, TERRACE_OUTER.fr, WEDGE_BASE.fr, WEDGE_BASE.fl],

    // Left wrap-around terrace.
    [TERRACE_OUTER.rl, TERRACE_OUTER.fl, WEDGE_BASE.fl, WEDGE_BASE.rl],

    // Back terrace.
    [TERRACE_OUTER.rr, TERRACE_OUTER.rl, WEDGE_BASE.rl, WEDGE_BASE.rr],

    // Right terrace extension.
    [TERRACE_OUTER.fr, TERRACE_OUTER.rr, WEDGE_BASE.rr, WEDGE_BASE.fr],

    // Thin front slab thickness only. Do not make the whole thing look like a giant box.
    [
      [TERRACE_OUTER.fl[0], BASE_Y, TERRACE_OUTER.fl[2]],
      [TERRACE_OUTER.fr[0], BASE_Y, TERRACE_OUTER.fr[2]],
      TERRACE_OUTER.fr,
      TERRACE_OUTER.fl,
    ],
  ]);
}

function createRearPlatformExtensionGeometry() {
  // Disable the extra rear platform for now because it makes the structure look like a random table.
  return new THREE.BufferGeometry();
}

function createUpperWedgeGeometry() {
  return createPolygonGeometry([
    // Large dominant front sloped face.
    [WEDGE_BASE.fl, WEDGE_BASE.fr, RIDGE_FRONT],

    // Left long triangular/quad face.
    [WEDGE_BASE.rl, WEDGE_BASE.fl, RIDGE_FRONT, RIDGE_REAR],

    // Right darker face.
    [WEDGE_BASE.fr, WEDGE_BASE.rr, RIDGE_REAR, RIDGE_FRONT],

    // Rear closing face.
    [WEDGE_BASE.rr, WEDGE_BASE.rl, RIDGE_REAR],
  ]);
}

function createSurfaceTextureLineGeometry() {
  // Blockout pass: keep the named part but leave detail disabled until shape is approved.
  return new THREE.BufferGeometry();
}

function buildStageGeometry(): StageGeometry {
  return {
    platform: createPrismGeometry(-1.45, 1.45, 0, 0.08, -1.04, 1.04),
    frontApron: createPrismGeometry(-1.21, 1.21, 0.01, 0.065, 0.86, 1.28),
    lowerBase: createLowerBaseGeometry(),
    frontLowerWall: createFrontLowerWallGeometry(),
    middleTerrace: createMiddleTerraceGeometry(),
    upperWedge: createUpperWedgeGeometry(),
    leftDiagonalSlope: createLeftDiagonalSlopeGeometry(),
    rightDiagonalSlope: createRightDiagonalSlopeGeometry(),
    rearPlatformExtension: createRearPlatformExtensionGeometry(),
    surfaceTextureLines: createSurfaceTextureLineGeometry(),
  };
}

export function PyramidStageEnvironment({
  targetRotationRef,
  reducedMotion,
  envBlendRef,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const smokeLoRef = useRef<THREE.Mesh>(null);
  const smokeHiRef = useRef<THREE.Mesh>(null);

  const floorTex = useMemo(() => {
    const t = createStageFloorTexture();
    t.repeat.set(2, 2);
    return t;
  }, []);
  const smokeTex = useMemo(() => createSmokeTexture(), []);
  const geo = useMemo(() => buildStageGeometry(), []);

  const lowerBaseMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#242424"),
        roughness: 0.9,
        metalness: 0.04,
        flatShading: true,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const frontLowerWallMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#242322"),
        roughness: 0.9,
        metalness: 0.05,
        flatShading: true,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const terraceMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#aaa397"),
        roughness: 0.82,
        metalness: 0.03,
        flatShading: true,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const wedgeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#5f5c57"),
        roughness: 0.86,
        metalness: 0.06,
        flatShading: true,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const leftSlopeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#575552"),
        roughness: 0.88,
        metalness: 0.05,
        flatShading: true,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const rightSlopeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#3f3c3a"),
        roughness: 0.9,
        metalness: 0.06,
        flatShading: true,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const rearPlatformMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#8f8a82"),
        roughness: 0.84,
        metalness: 0.04,
        flatShading: true,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const floorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: floorTex,
        color: new THREE.Color("#5d5548"),
        emissive: new THREE.Color("#201812"),
        emissiveIntensity: 0.12,
        roughness: 1,
        metalness: 0,
        flatShading: true,
        transparent: true,
        opacity: 0,
      }),
    [floorTex],
  );

  const lineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color("#181612"),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  const smokeMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: smokeTex,
        color: new THREE.Color("#d8d0bd"),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [smokeTex],
  );

  useEffect(() => {
    return () => {
      floorTex.dispose();
      smokeTex.dispose();
      Object.values(geo).forEach((g) => g.dispose());
      lowerBaseMaterial.dispose();
      frontLowerWallMaterial.dispose();
      terraceMaterial.dispose();
      wedgeMaterial.dispose();
      leftSlopeMaterial.dispose();
      rightSlopeMaterial.dispose();
      rearPlatformMaterial.dispose();
      floorMaterial.dispose();
      lineMaterial.dispose();
      smokeMaterial.dispose();
    };
  }, [
    floorTex,
    smokeTex,
    geo,
    lowerBaseMaterial,
    frontLowerWallMaterial,
    terraceMaterial,
    wedgeMaterial,
    leftSlopeMaterial,
    rightSlopeMaterial,
    rearPlatformMaterial,
    floorMaterial,
    lineMaterial,
    smokeMaterial,
  ]);

  useFrame(({ clock }, delta) => {
    const g = groupRef.current;
    if (!g) return;

    const current = g.rotation.y;
    const target = targetRotationRef.current;
    const k = reducedMotion ? 1 : Math.min(1, delta * 14);
    g.rotation.y = current + (target - current) * k;

    const op = envBlendRef.current;
    lowerBaseMaterial.opacity = op;
    frontLowerWallMaterial.opacity = op;
    terraceMaterial.opacity = op;
    wedgeMaterial.opacity = op;
    leftSlopeMaterial.opacity = op;
    rightSlopeMaterial.opacity = op;
    rearPlatformMaterial.opacity = op;
    floorMaterial.opacity = op;
    lineMaterial.opacity = 0;
    smokeMaterial.opacity = op * 0.56;

    const t = clock.getElapsedTime();
    if (smokeLoRef.current) {
      smokeLoRef.current.rotation.z = reducedMotion ? 0 : t * 0.026;
    }
    if (smokeHiRef.current) {
      smokeHiRef.current.rotation.z = reducedMotion ? 0 : -t * 0.018;
    }

    g.visible = op > 0.04;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh geometry={geo.platform} material={floorMaterial} />
      <mesh geometry={geo.frontApron} material={floorMaterial} />

      <mesh geometry={geo.lowerBase} material={lowerBaseMaterial} />
      <mesh geometry={geo.frontLowerWall} material={frontLowerWallMaterial} />
      <mesh geometry={geo.leftDiagonalSlope} material={leftSlopeMaterial} />
      <mesh geometry={geo.rightDiagonalSlope} material={rightSlopeMaterial} />
      <mesh geometry={geo.middleTerrace} material={terraceMaterial} />
      <mesh geometry={geo.rearPlatformExtension} material={rearPlatformMaterial} />
      <mesh geometry={geo.upperWedge} material={wedgeMaterial} />
      <lineSegments geometry={geo.surfaceTextureLines} material={lineMaterial} />

      <mesh
        ref={smokeLoRef}
        position={[0, 0.15, 0.04]}
        rotation-x={-Math.PI / 2}
        material={smokeMaterial}
      >
        <planeGeometry args={[2.25, 1.55]} />
      </mesh>
      <mesh
        ref={smokeHiRef}
        position={[0, 0.38, 0.02]}
        rotation-x={-Math.PI / 2}
        material={smokeMaterial}
      >
        <planeGeometry args={[1.65, 1.08]} />
      </mesh>

      <pointLight
        position={[-1.65, 2.35, 1.1]}
        color="#e0e8ff"
        intensity={4.1}
        distance={4.8}
        decay={1.45}
      />
      <pointLight
        position={[1.35, 1.85, 1.05]}
        color="#ffc08a"
        intensity={2.8}
        distance={3.7}
        decay={1.55}
      />
      <pointLight
        position={[0.0, 0.42, 1.25]}
        color="#ff5f94"
        intensity={1.8}
        distance={2.5}
        decay={1.8}
      />
      <hemisphereLight args={["#d7dfff", "#21170f", 0.8]} />
    </group>
  );
}
