"use client";

import { useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { getSoftPuff } from "@/lib/three-helpers/soft-puff";

const OUTER_R = 1.74;
const INNER_R = 0.68;
const BODY_DEPTH = 0.12;
const FRONT_Z = BODY_DEPTH / 2; // +0.06
const BACK_Z = -BODY_DEPTH / 2; // -0.06

type StarPoint = readonly [number, number];

function buildStarPoints(outer: number, inner: number): StarPoint[] {
  return Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
  });
}

function buildStarShape(outer: number, inner: number): THREE.Shape {
  const shape = new THREE.Shape();
  const points = buildStarPoints(outer, inner);
  points.forEach(([x, y], i) => {
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return shape;
}

function buildStarLoopSegments(
  outer: number,
  inner: number,
  z: number,
): Float32Array {
  const points = buildStarPoints(outer, inner);
  const arr = new Float32Array(points.length * 2 * 3);
  points.forEach((point, i) => {
    const next = points[(i + 1) % points.length]!;
    arr[i * 6] = point[0];
    arr[i * 6 + 1] = point[1];
    arr[i * 6 + 2] = z;
    arr[i * 6 + 3] = next[0];
    arr[i * 6 + 4] = next[1];
    arr[i * 6 + 5] = z;
  });
  return arr;
}

// pinwheel facet fan. each triangle: center=white, leading=white,
// trailing=cool-pale. adjacent triangles disagree at shared vertices
// so the boundaries read as soft creases.
function buildFacetGeometry(
  zOffset: number,
  cool: THREE.ColorRepresentation,
): THREE.BufferGeometry {
  const points = buildStarPoints(OUTER_R, INNER_R);
  const positions: number[] = [];
  const colors: number[] = [];
  const warmCol = new THREE.Color("#ffffff");
  const coolCol = new THREE.Color(cool);
  const centerCol = new THREE.Color("#ffffff");

  points.forEach((point, i) => {
    const next = points[(i + 1) % points.length]!;
    positions.push(0, 0, zOffset, point[0], point[1], zOffset, next[0], next[1], zOffset);
    colors.push(
      centerCol.r,
      centerCol.g,
      centerCol.b,
      warmCol.r,
      warmCol.g,
      warmCol.b,
      coolCol.r,
      coolCol.g,
      coolCol.b,
    );
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function ReferenceStarShell() {
  const puffTex = getSoftPuff();
  const centerSpriteRef = useRef<THREE.SpriteMaterial>(null);
  const centerStarRef = useRef<THREE.MeshBasicMaterial>(null);
  const surfaceRadialRef = useRef<THREE.MeshBasicMaterial>(null);
  const whiteHaloRef = useRef<THREE.MeshBasicMaterial>(null);
  const backCenterRef = useRef<THREE.MeshBasicMaterial>(null);

  const faceShape = useMemo(() => buildStarShape(OUTER_R, INNER_R), []);
  const surfaceRadialShape = useMemo(
    () => buildStarShape(OUTER_R * 0.9, INNER_R * 0.9),
    [],
  );
  const whiteHaloShape = useMemo(
    () => buildStarShape(OUTER_R * 1.012, INNER_R * 1.012),
    [],
  );
  const cyanHalo1Shape = useMemo(
    () => buildStarShape(OUTER_R * 1.035, INNER_R * 1.035),
    [],
  );
  const cyanHalo2Shape = useMemo(
    () => buildStarShape(OUTER_R * 1.075, INNER_R * 1.075),
    [],
  );
  const centerStarShape = useMemo(
    () => buildStarShape(OUTER_R * 0.52, INNER_R * 0.52),
    [],
  );
  const backCenterStarShape = useMemo(
    () => buildStarShape(OUTER_R * 0.46, INNER_R * 0.46),
    [],
  );
  const frontFacetGeometry = useMemo(
    () => buildFacetGeometry(0.001, "#b3c5d8"),
    [],
  );
  const backFacetGeometry = useMemo(
    () => buildFacetGeometry(-0.001, "#bccddc"),
    [],
  );

  const insetLine = useMemo(
    () => buildStarLoopSegments(OUTER_R * 0.86, INNER_R * 0.86, 0.018),
    [],
  );
  const innerInsetLine = useMemo(
    () => buildStarLoopSegments(OUTER_R * 0.62, INNER_R * 0.62, 0.017),
    [],
  );
  const outerLine = useMemo(
    () => buildStarLoopSegments(OUTER_R * 1.004, INNER_R * 1.004, 0.022),
    [],
  );
  const backInsetLine = useMemo(
    () => buildStarLoopSegments(OUTER_R * 0.86, INNER_R * 0.86, -0.018),
    [],
  );
  const backRimLine = useMemo(
    () => buildStarLoopSegments(OUTER_R * 1.004, INNER_R * 1.004, -0.022),
    [],
  );

  const extrudeOptions = useMemo(
    () => ({
      depth: BODY_DEPTH,
      bevelEnabled: false,
      curveSegments: 1,
      steps: 1,
    }),
    [],
  );

  useFrame(({ clock }) => {
    const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 1.05);
    if (centerStarRef.current) centerStarRef.current.opacity = 0.5 + pulse * 0.18;
    if (centerSpriteRef.current)
      centerSpriteRef.current.opacity = 0.34 + pulse * 0.16;
    if (surfaceRadialRef.current)
      surfaceRadialRef.current.opacity = 0.36 + pulse * 0.12;
    if (whiteHaloRef.current) whiteHaloRef.current.opacity = 0.42 + pulse * 0.16;
    if (backCenterRef.current) backCenterRef.current.opacity = 0.36 + pulse * 0.14;
  });

  return (
    <group>
      {/* === body — thin extrude with luminous cyan-white side band === */}
      <mesh position={[0, 0, BACK_Z]}>
        <extrudeGeometry args={[faceShape, extrudeOptions]} />
        <meshBasicMaterial
          attach="material-0"
          color="#ffffff"
          side={THREE.DoubleSide}
          toneMapped={false}
        />
        <meshBasicMaterial
          attach="material-1"
          color="#b8eaff"
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* === silhouette halo stack — all flush against the front cap,
          all at slightly larger silhouette so their rim glows past the
          body edge from any rotation angle. additive but soft. === */}
      <mesh position={[0, 0, FRONT_Z + 0.04]}>
        <shapeGeometry args={[cyanHalo2Shape]} />
        <meshBasicMaterial
          color="#7fd6ff"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, 0, FRONT_Z + 0.025]}>
        <shapeGeometry args={[cyanHalo1Shape]} />
        <meshBasicMaterial
          color="#dff1ff"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, 0, FRONT_Z + 0.013]}>
        <shapeGeometry args={[whiteHaloShape]} />
        <meshBasicMaterial
          ref={whiteHaloRef}
          color="#ffffff"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* === front face overlays, anchored to FRONT_Z === */}
      <group position={[0, 0, FRONT_Z + 0.002]}>
        {/* radial face bloom — soft puff radiating from center.
            opacity reduced so facets remain visible underneath. */}
        <mesh renderOrder={3}>
          <shapeGeometry args={[surfaceRadialShape]} />
          <meshBasicMaterial
            ref={surfaceRadialRef}
            map={puffTex}
            color="#ffffff"
            transparent
            opacity={0.42}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>

        {/* pinwheel facet shading — broad triangular planes */}
        <mesh geometry={frontFacetGeometry} renderOrder={4}>
          <meshBasicMaterial
            vertexColors
            side={THREE.DoubleSide}
            transparent
            opacity={0.6}
            toneMapped={false}
          />
        </mesh>

        {/* center star-shaped brightener — rotates with the star so
            the hotspot follows the silhouette, not a flat circle */}
        <mesh position={[0, 0, 0.008]} renderOrder={5}>
          <shapeGeometry args={[centerStarShape]} />
          <meshBasicMaterial
            ref={centerStarRef}
            color="#ffffff"
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>

        {/* delicate engraved lines */}
        <lineSegments renderOrder={7}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={innerInsetLine}
              count={innerInsetLine.length / 3}
              itemSize={3}
              args={[innerInsetLine, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#dff4ff"
            transparent
            opacity={0.06}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>

        <lineSegments renderOrder={8}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={insetLine}
              count={insetLine.length / 3}
              itemSize={3}
              args={[insetLine, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#e9f6ff"
            transparent
            opacity={0.1}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>

        {/* outer front rim — thin bright silhouette */}
        <lineSegments renderOrder={9}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={outerLine}
              count={outerLine.length / 3}
              itemSize={3}
              args={[outerLine, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      </group>

      {/* === billboarded core glow — sits at the star's pivot so it
          stays put during rotation. small, soft, vertical-biased
          puff shape from the texture itself. no tall rectangle plane,
          no asymmetric upper accent — those were the moving glare. === */}
      <sprite position={[0, 0.08, 0]} scale={[1.05, 1.55, 1]}>
        <spriteMaterial
          ref={centerSpriteRef}
          map={puffTex}
          color="#ffffff"
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      {/* === back face overlays — visible when star is rotated 180°.
          mirrored pinwheel facets + subtle linework so the back isn't
          a plain white icon. === */}
      <group position={[0, 0, BACK_Z - 0.002]}>
        {/* back radial bloom (dimmer than front) */}
        <mesh position={[0, 0, -0.005]} renderOrder={3}>
          <shapeGeometry args={[surfaceRadialShape]} />
          <meshBasicMaterial
            map={puffTex}
            color="#ffffff"
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>

        {/* mirrored pinwheel facets on the back — slightly cooler
            so the back reads as "the cooler side" while still icy */}
        <mesh geometry={backFacetGeometry} renderOrder={4}>
          <meshBasicMaterial
            vertexColors
            side={THREE.DoubleSide}
            transparent
            opacity={0.55}
            toneMapped={false}
          />
        </mesh>

        {/* back center brightener */}
        <mesh position={[0, 0, -0.012]} renderOrder={5}>
          <shapeGeometry args={[backCenterStarShape]} />
          <meshBasicMaterial
            ref={backCenterRef}
            color="#ffffff"
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>

        {/* back inscribed inner line */}
        <lineSegments renderOrder={6}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={backInsetLine}
              count={backInsetLine.length / 3}
              itemSize={3}
              args={[backInsetLine, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#e9f6ff"
            transparent
            opacity={0.08}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>

        {/* back outer rim */}
        <lineSegments renderOrder={7}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={backRimLine}
              count={backRimLine.length / 3}
              itemSize={3}
              args={[backRimLine, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.56}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      </group>
    </group>
  );
}
