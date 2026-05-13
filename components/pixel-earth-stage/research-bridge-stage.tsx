"use client";

// suspended glass-box bridge for the Research environment. long rectangular
// platform with a dark slab floor, transparent paneled walls, vertical black
// posts, warm orange/gold rim lights along the top and bottom edges, thin
// cables extending up out of frame, and a painterly cloud backdrop behind it.
// two small silhouette figures stand inside.

/* eslint-disable react-hooks/immutability */

import { RefObject, useEffect, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { createSilhouetteTexture } from "./textures";

const AUTO_SPEED = 0.22;
const RESUME_DELAY_MS = 1400;

// bridge dimensions, centered on origin
const BRIDGE_LEN = 3.6;
const BRIDGE_HEIGHT = 0.72;
const BRIDGE_DEPTH = 0.78;
const BRIDGE_Y = 1.4;

// floor slab (dark underside)
const FLOOR_THICKNESS = 0.12;
// rim trim thickness
const RIM_THICKNESS = 0.04;
// posts
const POST_COUNT = 5; // interior posts; outer corner posts are added separately
const POST_W = 0.06;

const FRAME_COLOR = "#0a0a10";
const RIM_COLOR = "#ffb050";
const RIM_EMISSIVE = "#ff7a20";
const GLASS_TINT = "#ff8a9c";

type Props = {
  targetRotationRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  lastInteractionRef: RefObject<number>;
  reducedMotion: boolean;
  isResearchEnvironment: boolean;
};

export function ResearchBridgeStage({
  targetRotationRef,
  isDraggingRef,
  lastInteractionRef,
  reducedMotion,
  isResearchEnvironment,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const silhouetteA = useMemo(() => createSilhouetteTexture("a"), []);
  const silhouetteB = useMemo(() => createSilhouetteTexture("b"), []);
  const figAref = useRef<THREE.Sprite>(null);
  const figBref = useRef<THREE.Sprite>(null);

  useEffect(() => {
    return () => {
      silhouetteA.dispose();
      silhouetteB.dispose();
    };
  }, [silhouetteA, silhouetteB]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    g.visible = isResearchEnvironment;
    if (!isResearchEnvironment) return;

    const sinceInteraction = performance.now() - lastInteractionRef.current;
    const canAutoRotate =
      !reducedMotion &&
      !isDraggingRef.current &&
      sinceInteraction > RESUME_DELAY_MS;
    if (canAutoRotate) {
      targetRotationRef.current += AUTO_SPEED * delta * 0.35;
    }

    const target = targetRotationRef.current;
    const current = g.rotation.y;
    const k = reducedMotion ? 1 : Math.min(1, delta * 14);
    g.rotation.y = current + (target - current) * k;

    // subtle idle bob on the figures
    const t = performance.now() / 1000;
    const bob = reducedMotion ? 0 : Math.sin(t * 2.4) * 0.012;
    const bob2 = reducedMotion ? 0 : Math.sin(t * 2.4 + 1.6) * 0.012;
    if (figAref.current) figAref.current.position.y = FIG_Y + bob;
    if (figBref.current) figBref.current.position.y = FIG_Y + bob2;
  });

  const halfLen = BRIDGE_LEN / 2;
  const halfH = BRIDGE_HEIGHT / 2;
  const halfD = BRIDGE_DEPTH / 2;

  // panel divisions along the length
  const panelCount = POST_COUNT + 1;
  const panelWidth = BRIDGE_LEN / panelCount;

  // interior post positions (X) — between panels, evenly spaced
  const interiorPostX: number[] = [];
  for (let i = 1; i <= POST_COUNT; i++) {
    interiorPostX.push(-halfLen + i * panelWidth);
  }

  // suspension cable anchor points along the top
  const cableAnchors: [number, number][] = [
    [-halfLen + panelWidth * 0.5, halfD - 0.04],
    [-halfLen + panelWidth * 0.5, -halfD + 0.04],
    [halfLen - panelWidth * 0.5, halfD - 0.04],
    [halfLen - panelWidth * 0.5, -halfD + 0.04],
    [0, halfD - 0.04],
    [0, -halfD + 0.04],
  ];

  return (
    <group ref={groupRef} position={[0, BRIDGE_Y, 0]}>
      {/* SUSPENSION CABLES — thin lines extending up off-screen */}
      {cableAnchors.map((p, i) => (
        <mesh
          key={`cable-${i}`}
          position={[p[0], halfH + 1.6, p[1]]}
        >
          <cylinderGeometry args={[0.008, 0.008, 3.2, 6]} />
          <meshBasicMaterial color="#15110c" toneMapped={false} />
        </mesh>
      ))}

      {/* DARK FLOOR SLAB — underside of the bridge */}
      <mesh position={[0, -halfH - FLOOR_THICKNESS / 2, 0]}>
        <boxGeometry args={[BRIDGE_LEN + 0.04, FLOOR_THICKNESS, BRIDGE_DEPTH + 0.04]} />
        <meshStandardMaterial color="#0a0a10" roughness={0.92} metalness={0.1} />
      </mesh>

      {/* INSIDE FLOOR — slightly lighter, walking surface */}
      <mesh position={[0, -halfH + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BRIDGE_LEN - 0.04, BRIDGE_DEPTH - 0.04]} />
        <meshStandardMaterial color="#1a1014" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* GLASS PANELS — front and back walls, transparent with subtle tint */}
      <mesh position={[0, 0, halfD]}>
        <planeGeometry args={[BRIDGE_LEN, BRIDGE_HEIGHT]} />
        <meshStandardMaterial
          color={GLASS_TINT}
          transparent
          opacity={0.18}
          roughness={0.1}
          metalness={0.0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0, -halfD]}>
        <planeGeometry args={[BRIDGE_LEN, BRIDGE_HEIGHT]} />
        <meshStandardMaterial
          color="#9aa9ff"
          transparent
          opacity={0.14}
          roughness={0.1}
          metalness={0.0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* END PANELS — glass with diagonal X-brace lines */}
      <group position={[halfLen, 0, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[BRIDGE_DEPTH, BRIDGE_HEIGHT]} />
          <meshStandardMaterial
            color={GLASS_TINT}
            transparent
            opacity={0.2}
            roughness={0.1}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {/* X-brace diagonals */}
        <DiagonalBrace
          a={[0, halfH - 0.02, -halfD + 0.02]}
          b={[0, -halfH + 0.02, halfD - 0.02]}
        />
        <DiagonalBrace
          a={[0, halfH - 0.02, halfD - 0.02]}
          b={[0, -halfH + 0.02, -halfD + 0.02]}
        />
      </group>
      <group position={[-halfLen, 0, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[BRIDGE_DEPTH, BRIDGE_HEIGHT]} />
          <meshStandardMaterial
            color={GLASS_TINT}
            transparent
            opacity={0.2}
            roughness={0.1}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <DiagonalBrace
          a={[0, halfH - 0.02, -halfD + 0.02]}
          b={[0, -halfH + 0.02, halfD - 0.02]}
        />
        <DiagonalBrace
          a={[0, halfH - 0.02, halfD - 0.02]}
          b={[0, -halfH + 0.02, -halfD + 0.02]}
        />
      </group>

      {/* CEILING TRUSS — thin dark roof slats running across */}
      {Array.from({ length: 14 }, (_, i) => {
        const x = -halfLen + (i + 0.5) * (BRIDGE_LEN / 14);
        return (
          <mesh key={`slat-${i}`} position={[x, halfH - 0.01, 0]}>
            <boxGeometry args={[0.04, 0.02, BRIDGE_DEPTH - 0.06]} />
            <meshStandardMaterial color={FRAME_COLOR} roughness={0.9} />
          </mesh>
        );
      })}

      {/* VERTICAL POSTS — corner posts and interior dividers */}
      {[-halfLen, halfLen].flatMap((x) =>
        [-halfD, halfD].map((z) => (
          <mesh key={`corner-${x}-${z}`} position={[x, 0, z]}>
            <boxGeometry args={[POST_W, BRIDGE_HEIGHT + 0.02, POST_W]} />
            <meshStandardMaterial color={FRAME_COLOR} roughness={0.9} />
          </mesh>
        )),
      )}
      {interiorPostX.flatMap((x) =>
        [-halfD, halfD].map((z) => (
          <mesh key={`post-${x.toFixed(2)}-${z}`} position={[x, 0, z]}>
            <boxGeometry args={[POST_W * 0.85, BRIDGE_HEIGHT, POST_W * 0.85]} />
            <meshStandardMaterial color={FRAME_COLOR} roughness={0.9} />
          </mesh>
        )),
      )}

      {/* WARM ORANGE RIM LIGHTS — top + bottom edges along the full length,
          front and back */}
      <RimEdge
        position={[0, halfH + RIM_THICKNESS / 2, halfD]}
        length={BRIDGE_LEN + 0.04}
        thickness={RIM_THICKNESS}
        axis="x"
      />
      <RimEdge
        position={[0, halfH + RIM_THICKNESS / 2, -halfD]}
        length={BRIDGE_LEN + 0.04}
        thickness={RIM_THICKNESS}
        axis="x"
      />
      <RimEdge
        position={[0, -halfH - RIM_THICKNESS / 2, halfD]}
        length={BRIDGE_LEN + 0.04}
        thickness={RIM_THICKNESS}
        axis="x"
      />
      <RimEdge
        position={[0, -halfH - RIM_THICKNESS / 2, -halfD]}
        length={BRIDGE_LEN + 0.04}
        thickness={RIM_THICKNESS}
        axis="x"
      />
      {/* end-cap rims (short Z-axis bars) */}
      <RimEdge
        position={[halfLen, halfH + RIM_THICKNESS / 2, 0]}
        length={BRIDGE_DEPTH + 0.04}
        thickness={RIM_THICKNESS}
        axis="z"
      />
      <RimEdge
        position={[halfLen, -halfH - RIM_THICKNESS / 2, 0]}
        length={BRIDGE_DEPTH + 0.04}
        thickness={RIM_THICKNESS}
        axis="z"
      />
      <RimEdge
        position={[-halfLen, halfH + RIM_THICKNESS / 2, 0]}
        length={BRIDGE_DEPTH + 0.04}
        thickness={RIM_THICKNESS}
        axis="z"
      />
      <RimEdge
        position={[-halfLen, -halfH - RIM_THICKNESS / 2, 0]}
        length={BRIDGE_DEPTH + 0.04}
        thickness={RIM_THICKNESS}
        axis="z"
      />

      {/* FIGURES — two silhouette sprites, one left, one right */}
      <sprite
        ref={figAref}
        position={[-halfLen * 0.4, FIG_Y, 0]}
        scale={[0.34, 0.68, 1]}
      >
        <spriteMaterial
          map={silhouetteA}
          transparent
          depthTest={true}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <sprite
        ref={figBref}
        position={[halfLen * 0.4, FIG_Y, 0]}
        scale={[-0.34, 0.68, 1]}
      >
        <spriteMaterial
          map={silhouetteB}
          transparent
          depthTest={true}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}

// figure resting y — sprite scale 0.68 means half-height ≈ 0.34. floor sits
// at -halfH (= -0.36), so place center at -halfH + 0.34 to land feet on the slab.
const FIG_Y = -BRIDGE_HEIGHT / 2 + 0.34;

// glowing rim segment along an edge of the bridge
type RimProps = {
  position: [number, number, number];
  length: number;
  thickness: number;
  axis: "x" | "z";
};

function RimEdge({ position, length, thickness, axis }: RimProps) {
  const args: [number, number, number] =
    axis === "x"
      ? [length, thickness, thickness]
      : [thickness, thickness, length];
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={RIM_COLOR}
        emissive={RIM_EMISSIVE}
        emissiveIntensity={2.2}
        roughness={0.5}
        metalness={0.2}
        toneMapped={false}
      />
    </mesh>
  );
}

// a thin diagonal line from a to b — used for end-panel X-braces
function DiagonalBrace({
  a,
  b,
}: {
  a: [number, number, number];
  b: [number, number, number];
}) {
  const { position, quaternion, length } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = new THREE.Vector3().subVectors(vb, va);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(va, vb).multiplyScalar(0.5);
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(
      up,
      dir.clone().normalize(),
    );
    return { position: mid, quaternion: q, length: len };
  }, [a, b]);

  return (
    <mesh
      position={[position.x, position.y, position.z]}
      quaternion={[quaternion.x, quaternion.y, quaternion.z, quaternion.w]}
    >
      <cylinderGeometry args={[0.012, 0.012, length, 6]} />
      <meshStandardMaterial color={FRAME_COLOR} roughness={0.85} />
    </mesh>
  );
}
