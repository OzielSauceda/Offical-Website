"use client";

// Donda-style weathered church-house on a dirt mound for the Contact env.
// Compact: a main rectangular body with a steep front gable + shingle roof,
// a small side wing projecting toward the camera, a porch with iron railings
// and stairs, a glowing white rooftop cross, a thin chimney, and several
// pale multi-pane windows. Cool searchlight beams + low smoke + distant
// arena pinpoints round out the staging.

/* eslint-disable react-hooks/immutability */

import { RefObject, useEffect, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  createDirtMoundTexture,
  createRoofShingleTexture,
  createSilhouetteTexture,
  createSmokeTexture,
  createWeatheredSidingTexture,
  createWindowGlowTexture,
} from "./textures";

const AUTO_SPEED = 0.22;
const RESUME_DELAY_MS = 1400;

// MAIN BODY — back portion of the church
const BODY_W = 1.3;
const BODY_H = 0.92;
const BODY_D = 0.95;

// FRONT GABLE ROOF rise above body
const ROOF_PEAK_RISE = 0.66;
const ROOF_OVERHANG = 0.08;
const ROOF_THICKNESS = 0.04;

// SIDE WING — small box jutting forward from the right portion of the body.
// Sits at the front-right, has its own small flat-ish roof.
const WING_W = 0.55;
const WING_H = 0.74;
const WING_D = 0.46;

// PORCH — in front of the left half of the body, under a small shed roof
const PORCH_W = 0.7;
const PORCH_D = 0.36;
const PORCH_H = 0.06;

// DIRT MOUND
const MOUND_R = 1.55;
const MOUND_H = 0.18;

// vertical layout — mound top at y=0 so the house sits on it
const MOUND_BASE_Y = -MOUND_H;
const BODY_BOTTOM = 0.0;
const BODY_CENTER_Y = BODY_BOTTOM + BODY_H / 2;
const ROOF_BASE_Y = BODY_BOTTOM + BODY_H;
const ROOF_PEAK_Y = ROOF_BASE_Y + ROOF_PEAK_RISE;

const SIDING_COLOR = "#d3dade";
const SIDING_SHADOW = "#a8b1b6";
const SHINGLE_COLOR = "#5a5560";
const FRAME_COLOR = "#1a1620";
const IRON_COLOR = "#15131a";
const WINDOW_HOT = "#ffd58a";
const CROSS_COLOR = "#f4f1e8";

type Props = {
  targetRotationRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  lastInteractionRef: RefObject<number>;
  reducedMotion: boolean;
  isContactEnvironment: boolean;
};

export function ContactHouseStage({
  targetRotationRef,
  isDraggingRef,
  lastInteractionRef,
  reducedMotion,
  isContactEnvironment,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const beamRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const smokeRefs = useRef<(THREE.Sprite | null)[]>([]);
  const figRef = useRef<THREE.Sprite>(null);
  const crossEmissiveRef = useRef<THREE.MeshStandardMaterial>(null);
  const crossGlowRef = useRef<THREE.MeshBasicMaterial>(null);

  const sidingTex = useMemo(() => createWeatheredSidingTexture(), []);
  const shingleTex = useMemo(() => createRoofShingleTexture(), []);
  const dirtTex = useMemo(() => createDirtMoundTexture(), []);
  const smokeTex = useMemo(() => createSmokeTexture(), []);
  // tall narrow window pane (2 cols x 3 rows)
  const windowTex = useMemo(() => createWindowGlowTexture(2, 3), []);
  // square attic window (3 cols x 3 rows)
  const atticTex = useMemo(() => createWindowGlowTexture(3, 3), []);
  const silhouetteTex = useMemo(() => createSilhouetteTexture("a"), []);

  useEffect(() => {
    return () => {
      sidingTex.dispose();
      shingleTex.dispose();
      dirtTex.dispose();
      smokeTex.dispose();
      windowTex.dispose();
      atticTex.dispose();
      silhouetteTex.dispose();
    };
  }, [
    sidingTex,
    shingleTex,
    dirtTex,
    smokeTex,
    windowTex,
    atticTex,
    silhouetteTex,
  ]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    g.visible = isContactEnvironment;
    if (!isContactEnvironment) return;

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

    const t = performance.now() / 1000;

    // cross flicker — slow breathing on the emissive intensity
    if (crossEmissiveRef.current) {
      const flicker = reducedMotion ? 1 : 1 + Math.sin(t * 1.8) * 0.06;
      crossEmissiveRef.current.emissiveIntensity = 3.4 * flicker;
    }
    if (crossGlowRef.current) {
      const pulse = reducedMotion ? 0.55 : 0.5 + Math.sin(t * 1.4) * 0.1;
      crossGlowRef.current.opacity = pulse;
    }

    // searchlight beam pulses
    for (let i = 0; i < beamRefs.current.length; i++) {
      const mat = beamRefs.current[i];
      if (!mat) continue;
      const base = i === 0 ? 0.16 : 0.12;
      const pulse = reducedMotion ? 0 : Math.sin(t * (1.2 + i * 0.3) + i) * 0.05;
      mat.opacity = Math.max(0, base + pulse);
    }

    // smoke drift
    for (let i = 0; i < smokeRefs.current.length; i++) {
      const s = smokeRefs.current[i];
      if (!s) continue;
      if (reducedMotion) continue;
      const phase = i * 0.7;
      s.material.opacity = 0.2 + Math.sin(t * 0.6 + phase) * 0.07;
    }

    if (figRef.current) {
      const bob = reducedMotion ? 0 : Math.sin(t * 2.2) * 0.008;
      figRef.current.position.y = FIG_Y + bob;
    }
  });

  const halfW = BODY_W / 2;
  const halfD = BODY_D / 2;
  const roofSlopeLen = Math.sqrt(halfW * halfW + ROOF_PEAK_RISE * ROOF_PEAK_RISE);
  const roofTilt = Math.atan2(ROOF_PEAK_RISE, halfW);

  // side wing position — front-right, projecting toward +Z
  const wingX = halfW - WING_W / 2 + 0.04;
  const wingZ = halfD + WING_D / 2 - 0.06;
  const wingFrontZ = wingZ + WING_D / 2;
  const wingLeftX = wingX - WING_W / 2;

  // porch position — left of the wing, in front of the body's gable wall
  const porchX = -(halfW - PORCH_W / 2 - 0.08);
  const porchZ = halfD + PORCH_D / 2;
  const porchFrontZ = porchZ + PORCH_D / 2;

  return (
    <group ref={groupRef} position={[0, MOUND_BASE_Y + MOUND_H, 0]}>
      {/* DIRT MOUND */}
      <mesh position={[0, -MOUND_H / 2, 0]}>
        <cylinderGeometry args={[MOUND_R, MOUND_R * 1.06, MOUND_H, 36]} />
        <meshStandardMaterial
          map={dirtTex}
          color="#ffffff"
          roughness={0.98}
          metalness={0}
        />
      </mesh>

      {/* HOUSE BODY */}
      <mesh position={[0, BODY_CENTER_Y, 0]}>
        <boxGeometry args={[BODY_W, BODY_H, BODY_D]} />
        <meshStandardMaterial
          map={sidingTex}
          color={SIDING_COLOR}
          roughness={0.92}
          metalness={0.04}
        />
      </mesh>

      {/* CORNER TRIM — vertical dark strips on body corners */}
      {[
        [-halfW + 0.012, halfD + 0.001],
        [halfW - 0.012, halfD + 0.001],
        [-halfW + 0.012, -halfD - 0.001],
        [halfW - 0.012, -halfD - 0.001],
      ].map(([x, z], i) => (
        <mesh
          key={`trim-${i}`}
          position={[x!, BODY_CENTER_Y, z!]}
        >
          <boxGeometry args={[0.04, BODY_H + 0.01, 0.04]} />
          <meshStandardMaterial color={SIDING_SHADOW} roughness={0.9} />
        </mesh>
      ))}

      {/* GABLE TRIANGLES — front (+Z) and back (-Z) */}
      <GableTriangle
        y={ROOF_BASE_Y}
        z={halfD + 0.001}
        halfW={halfW}
        peakRise={ROOF_PEAK_RISE}
        texture={sidingTex}
      />
      <GableTriangle
        y={ROOF_BASE_Y}
        z={-halfD - 0.001}
        halfW={halfW}
        peakRise={ROOF_PEAK_RISE}
        texture={sidingTex}
        flip
      />

      {/* PITCHED ROOF — slanted boxes */}
      <group position={[0, ROOF_BASE_Y, 0]}>
        <mesh
          position={[(halfW + ROOF_OVERHANG / 2) / 2, ROOF_PEAK_RISE / 2, 0]}
          rotation={[0, 0, -roofTilt]}
        >
          <boxGeometry
            args={[roofSlopeLen + ROOF_OVERHANG, ROOF_THICKNESS, BODY_D + ROOF_OVERHANG * 2]}
          />
          <meshStandardMaterial
            map={shingleTex}
            color={SHINGLE_COLOR}
            roughness={0.95}
            metalness={0.02}
          />
        </mesh>
        <mesh
          position={[-(halfW + ROOF_OVERHANG / 2) / 2, ROOF_PEAK_RISE / 2, 0]}
          rotation={[0, 0, roofTilt]}
        >
          <boxGeometry
            args={[roofSlopeLen + ROOF_OVERHANG, ROOF_THICKNESS, BODY_D + ROOF_OVERHANG * 2]}
          />
          <meshStandardMaterial
            map={shingleTex}
            color={SHINGLE_COLOR}
            roughness={0.95}
            metalness={0.02}
          />
        </mesh>
        {/* ridge cap */}
        <mesh position={[0, ROOF_PEAK_RISE + 0.005, 0]}>
          <boxGeometry args={[0.06, 0.04, BODY_D + ROOF_OVERHANG * 2 + 0.04]} />
          <meshStandardMaterial color="#1a1620" roughness={0.95} />
        </mesh>
        {/* gable fascia trim — pale strip along the gable edges */}
        <FasciaLine
          a={[-halfW - ROOF_OVERHANG, 0.01, halfD + 0.005]}
          b={[0, ROOF_PEAK_RISE + 0.02, halfD + 0.005]}
        />
        <FasciaLine
          a={[halfW + ROOF_OVERHANG, 0.01, halfD + 0.005]}
          b={[0, ROOF_PEAK_RISE + 0.02, halfD + 0.005]}
        />
      </group>

      {/* CHIMNEY — thin box near the back ridge */}
      <mesh position={[0.28, ROOF_BASE_Y + 0.55, -halfD + 0.18]}>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color="#3a3540" roughness={0.95} />
      </mesh>
      <mesh position={[0.28, ROOF_BASE_Y + 0.81, -halfD + 0.18]}>
        <boxGeometry args={[0.14, 0.04, 0.14]} />
        <meshStandardMaterial color="#1a1620" roughness={0.9} />
      </mesh>

      {/* GLOWING WHITE CROSS on front gable peak */}
      <group position={[0, ROOF_PEAK_Y + 0.02, halfD + 0.03]}>
        <mesh position={[0, 0.28, 0]} renderOrder={2}>
          <boxGeometry args={[0.06, 0.62, 0.05]} />
          <meshStandardMaterial
            ref={crossEmissiveRef}
            color={CROSS_COLOR}
            emissive="#ffffff"
            emissiveIntensity={3.4}
            roughness={0.5}
            metalness={0.05}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0.36, 0]} renderOrder={2}>
          <boxGeometry args={[0.34, 0.06, 0.05]} />
          <meshStandardMaterial
            color={CROSS_COLOR}
            emissive="#ffffff"
            emissiveIntensity={3.4}
            roughness={0.5}
            metalness={0.05}
            toneMapped={false}
          />
        </mesh>
        {/* additive halo behind the cross */}
        <sprite position={[0, 0.32, -0.02]} scale={[0.95, 1.1, 1]}>
          <spriteMaterial
            ref={crossGlowRef}
            color="#ffffff"
            transparent
            opacity={0.55}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      </group>

      {/* ATTIC GABLE WINDOW — square 3×3 pane, centered in the gable */}
      <Window
        position={[0, ROOF_BASE_Y + 0.28, halfD + 0.012]}
        size={[0.26, 0.3]}
        texture={atticTex}
        emissiveIntensity={1.4}
      />

      {/* MAIN BODY — left-side wall windows (-X facing) */}
      <Window
        position={[-halfW - 0.011, BODY_BOTTOM + 0.55, halfD * 0.32]}
        size={[0.2, 0.55]}
        texture={windowTex}
        rotateY={-Math.PI / 2}
        emissiveIntensity={1.6}
      />
      <Window
        position={[-halfW - 0.011, BODY_BOTTOM + 0.55, -halfD * 0.32]}
        size={[0.2, 0.55]}
        texture={windowTex}
        rotateY={-Math.PI / 2}
        emissiveIntensity={1.6}
      />

      {/* BACK WALL — single small window */}
      <Window
        position={[0, BODY_BOTTOM + 0.55, -halfD - 0.011]}
        size={[0.22, 0.5]}
        texture={windowTex}
        rotateY={Math.PI}
        emissiveIntensity={1.4}
      />

      {/* SIDE WING — small box jutting forward from the right */}
      <mesh position={[wingX, BODY_BOTTOM + WING_H / 2, wingZ]}>
        <boxGeometry args={[WING_W, WING_H, WING_D]} />
        <meshStandardMaterial
          map={sidingTex}
          color={SIDING_COLOR}
          roughness={0.92}
          metalness={0.04}
        />
      </mesh>
      {/* wing flat roof (slight pitch) */}
      <mesh position={[wingX, BODY_BOTTOM + WING_H + 0.025, wingZ]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[WING_W + 0.06, 0.04, WING_D + 0.08]} />
        <meshStandardMaterial
          map={shingleTex}
          color={SHINGLE_COLOR}
          roughness={0.95}
        />
      </mesh>
      {/* wing front window (faces +Z, multi-pane) */}
      <Window
        position={[wingX, BODY_BOTTOM + 0.5, wingFrontZ + 0.001]}
        size={[0.38, 0.58]}
        texture={windowTex}
        emissiveIntensity={1.8}
      />
      {/* wing right-side window */}
      <Window
        position={[wingX + WING_W / 2 + 0.001, BODY_BOTTOM + 0.5, wingZ]}
        size={[0.26, 0.5]}
        texture={windowTex}
        rotateY={Math.PI / 2}
        emissiveIntensity={1.6}
      />
      {/* wing left-side narrow vertical window (faces -X, toward porch) */}
      <Window
        position={[wingLeftX - 0.001, BODY_BOTTOM + 0.55, wingZ + 0.06]}
        size={[0.16, 0.55]}
        texture={windowTex}
        rotateY={-Math.PI / 2}
        emissiveIntensity={1.5}
      />

      {/* DOOR — on the porch side of the wing (facing -X / toward porch).
          Pale, set inside a dark frame. */}
      <group position={[wingLeftX - 0.002, BODY_BOTTOM + 0.42, wingZ - WING_D * 0.18]} rotation={[0, -Math.PI / 2, 0]}>
        {/* dark recess */}
        <mesh position={[0, 0, -0.008]}>
          <planeGeometry args={[0.32, 0.78]} />
          <meshStandardMaterial color="#0d0a06" roughness={0.95} />
        </mesh>
        {/* door slab */}
        <mesh>
          <planeGeometry args={[0.28, 0.74]} />
          <meshStandardMaterial
            color="#d8d3c4"
            roughness={0.85}
            emissive="#553a20"
            emissiveIntensity={0.18}
          />
        </mesh>
        {/* horizontal panel divider */}
        <mesh position={[0, -0.04, 0.001]}>
          <planeGeometry args={[0.26, 0.018]} />
          <meshStandardMaterial color="#1a1610" roughness={0.9} />
        </mesh>
        {/* doorknob */}
        <mesh position={[0.1, -0.08, 0.005]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshStandardMaterial color="#2a2218" roughness={0.6} metalness={0.4} />
        </mesh>
      </group>

      {/* PORCH PLATFORM — under the porch shed roof */}
      <mesh position={[porchX, BODY_BOTTOM + PORCH_H / 2, porchZ]}>
        <boxGeometry args={[PORCH_W, PORCH_H, PORCH_D]} />
        <meshStandardMaterial color="#3d3530" roughness={0.95} />
      </mesh>

      {/* PORCH SHED ROOF — slight pitch from body wall outward */}
      <mesh
        position={[porchX, BODY_BOTTOM + 0.86, porchZ + 0.02]}
        rotation={[-0.22, 0, 0]}
      >
        <boxGeometry args={[PORCH_W + 0.18, 0.035, PORCH_D + 0.12]} />
        <meshStandardMaterial
          map={shingleTex}
          color={SHINGLE_COLOR}
          roughness={0.95}
        />
      </mesh>

      {/* PORCH POSTS — thin, supporting the shed roof corners */}
      {[-1, 1].map((side) => (
        <mesh
          key={`post-${side}`}
          position={[
            porchX + side * (PORCH_W / 2 - 0.02),
            BODY_BOTTOM + 0.43,
            porchFrontZ - 0.02,
          ]}
        >
          <boxGeometry args={[0.04, 0.86, 0.04]} />
          <meshStandardMaterial color={SIDING_SHADOW} roughness={0.9} />
        </mesh>
      ))}

      {/* WROUGHT-IRON RAILINGS — thin top + bottom bars, vertical pickets,
          + a single decorative S-curve in the middle of each side */}
      {[-1, 1].map((side) => (
        <group
          key={`rail-${side}`}
          position={[
            porchX + side * (PORCH_W / 2 - 0.16),
            BODY_BOTTOM + 0.21,
            porchFrontZ - 0.02,
          ]}
        >
          <mesh>
            <boxGeometry args={[0.32, 0.012, 0.012]} />
            <meshStandardMaterial color={IRON_COLOR} roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <boxGeometry args={[0.32, 0.012, 0.012]} />
            <meshStandardMaterial color={IRON_COLOR} roughness={0.6} metalness={0.4} />
          </mesh>
          {[-1.5, -0.5, 0.5, 1.5].map((p, i) => (
            <mesh key={`pi-${side}-${i}`} position={[p * 0.08, 0.07, 0]}>
              <boxGeometry args={[0.01, 0.14, 0.01]} />
              <meshStandardMaterial color={IRON_COLOR} roughness={0.6} metalness={0.4} />
            </mesh>
          ))}
          {/* decorative S-curve approximated with three tiny offset segments */}
          <mesh position={[0, 0.05, 0.001]}>
            <boxGeometry args={[0.06, 0.012, 0.008]} />
            <meshStandardMaterial color={IRON_COLOR} roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh position={[0.018, 0.09, 0.001]}>
            <boxGeometry args={[0.04, 0.012, 0.008]} />
            <meshStandardMaterial color={IRON_COLOR} roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh position={[-0.018, 0.11, 0.001]}>
            <boxGeometry args={[0.04, 0.012, 0.008]} />
            <meshStandardMaterial color={IRON_COLOR} roughness={0.6} metalness={0.4} />
          </mesh>
        </group>
      ))}

      {/* PORCH FRONT RAIL — connecting the two posts in front */}
      <mesh
        position={[porchX, BODY_BOTTOM + 0.28, porchFrontZ - 0.01]}
      >
        <boxGeometry args={[PORCH_W - 0.04, 0.012, 0.012]} />
        <meshStandardMaterial color={IRON_COLOR} roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh
        position={[porchX, BODY_BOTTOM + 0.14, porchFrontZ - 0.01]}
      >
        <boxGeometry args={[PORCH_W - 0.04, 0.012, 0.012]} />
        <meshStandardMaterial color={IRON_COLOR} roughness={0.6} metalness={0.4} />
      </mesh>

      {/* STAIRS — 4 small steps descending forward from porch */}
      {Array.from({ length: 4 }, (_, i) => {
        const stepDepth = 0.08;
        const stepHeight = PORCH_H + (3 - i) * 0.025;
        const stepZ = porchFrontZ + (i + 0.5) * stepDepth;
        return (
          <mesh
            key={`step-${i}`}
            position={[porchX, stepHeight / 2, stepZ]}
          >
            <boxGeometry args={[0.42, stepHeight, stepDepth]} />
            <meshStandardMaterial color="#36302a" roughness={0.95} />
          </mesh>
        );
      })}

      {/* WARM DOORWAY POOL — small additive disc on the porch floor */}
      <mesh
        position={[porchX + PORCH_W / 2 - 0.05, BODY_BOTTOM + PORCH_H + 0.002, porchZ + 0.04]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.22, 24]} />
        <meshBasicMaterial
          color="#ffb050"
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* SILHOUETTE FIGURE on the porch */}
      <sprite
        ref={figRef}
        position={[porchX + 0.05, FIG_Y, porchZ + 0.04]}
        scale={[0.22, 0.46, 1]}
      >
        <spriteMaterial
          map={silhouetteTex}
          transparent
          depthTest={true}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      {/* SEARCHLIGHTS — two cool truncated cones from offstage */}
      <Searchlight
        from={[-2.6, 2.8, -1.6]}
        to={[-0.3, 0.6, 0.3]}
        topRadius={0.04}
        bottomRadius={0.35}
        color="#cfe3ff"
        matRefSetter={(el) => {
          beamRefs.current[0] = el;
        }}
      />
      <Searchlight
        from={[2.4, 2.6, -1.0]}
        to={[0.6, 0.8, 0.45]}
        topRadius={0.05}
        bottomRadius={0.36}
        color="#e0eaff"
        matRefSetter={(el) => {
          beamRefs.current[1] = el;
        }}
      />

      {/* DISTANT ARENA LIGHT DOTS */}
      <DistantLights />

      {/* LOW FOG SMOKE PUFFS around the mound */}
      {[
        [-1.3, 0.04, 0.5],
        [1.2, 0.06, 0.6],
        [-0.5, 0.04, 1.2],
        [0.7, 0.05, -1.0],
        [-1.5, 0.04, -0.6],
        [1.4, 0.05, 0.0],
        [0.0, 0.04, 1.3],
      ].map((p, i) => (
        <sprite
          key={`smoke-${i}`}
          ref={(el) => {
            smokeRefs.current[i] = el;
          }}
          position={[p[0]!, p[1]!, p[2]!]}
          scale={[1.3 + (i % 3) * 0.25, 0.85 + (i % 2) * 0.18, 1]}
        >
          <spriteMaterial
            map={smokeTex}
            transparent
            opacity={0.2}
            depthWrite={false}
            depthTest={true}
            blending={THREE.NormalBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}

const FIG_Y = PORCH_H + 0.23;

// --- subcomponents ---

type GableProps = {
  y: number;
  z: number;
  halfW: number;
  peakRise: number;
  texture: THREE.Texture;
  flip?: boolean;
};

function GableTriangle({ y, z, halfW, peakRise, texture, flip }: GableProps) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array([
      -halfW, 0, 0,
      halfW, 0, 0,
      0, peakRise, 0,
    ]);
    const uvs = new Float32Array([0, 0, 1, 0, 0.5, 1]);
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    g.setIndex(flip ? [0, 2, 1] : [0, 1, 2]);
    g.computeVertexNormals();
    return g;
  }, [halfW, peakRise, flip]);

  useEffect(() => () => geom.dispose(), [geom]);

  return (
    <mesh position={[0, y, z]} geometry={geom}>
      <meshStandardMaterial
        map={texture}
        color={SIDING_COLOR}
        roughness={0.92}
        metalness={0.04}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

type WindowProps = {
  position: [number, number, number];
  size: [number, number];
  texture: THREE.Texture;
  rotateY?: number;
  emissiveIntensity?: number;
};

function Window({
  position,
  size,
  texture,
  rotateY = 0,
  emissiveIntensity = 1.6,
}: WindowProps) {
  return (
    <group position={position} rotation={[0, rotateY, 0]}>
      <mesh position={[0, 0, -0.001]}>
        <planeGeometry args={[size[0] + 0.03, size[1] + 0.03]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.9} />
      </mesh>
      <mesh>
        <planeGeometry args={size} />
        <meshStandardMaterial
          map={texture}
          color="#ffffff"
          emissive={WINDOW_HOT}
          emissiveIntensity={emissiveIntensity}
          roughness={0.6}
          metalness={0}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// pale fascia line on the gable trim — thin slanted bar between two points
function FasciaLine({
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
      <boxGeometry args={[0.04, length, 0.02]} />
      <meshStandardMaterial color={SIDING_SHADOW} roughness={0.85} />
    </mesh>
  );
}

type SearchlightProps = {
  from: [number, number, number];
  to: [number, number, number];
  topRadius: number;
  bottomRadius: number;
  color: string;
  matRefSetter: (el: THREE.MeshBasicMaterial | null) => void;
};

function Searchlight({
  from,
  to,
  topRadius,
  bottomRadius,
  color,
  matRefSetter,
}: SearchlightProps) {
  const { position, quaternion, length } = useMemo(() => {
    const va = new THREE.Vector3(...from);
    const vb = new THREE.Vector3(...to);
    const dir = new THREE.Vector3().subVectors(vb, va);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(va, vb).multiplyScalar(0.5);
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(
      up,
      dir.clone().normalize(),
    );
    return { position: mid, quaternion: q, length: len };
  }, [from, to]);

  return (
    <mesh
      position={[position.x, position.y, position.z]}
      quaternion={[quaternion.x, quaternion.y, quaternion.z, quaternion.w]}
      renderOrder={3}
    >
      <cylinderGeometry args={[topRadius, bottomRadius, length, 32, 1, true]} />
      <meshBasicMaterial
        ref={matRefSetter}
        color={color}
        transparent
        opacity={0.16}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        depthTest={true}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function DistantLights() {
  const points = useMemo(() => {
    let r = 0x4caf >>> 0;
    const next = () => {
      r = (r * 1664525 + 1013904223) >>> 0;
      return r / 0xffffffff;
    };
    const pts: { p: [number, number, number]; c: string; sz: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const angle = next() * Math.PI * 2;
      const radius = 5.5 + next() * 2.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 0.4 + next() * 2.6;
      const warm = next() > 0.5;
      const c = warm ? "#ffdca8" : "#bccfff";
      const sz = 0.018 + next() * 0.034;
      pts.push({ p: [x, y, z], c, sz });
    }
    return pts;
  }, []);

  return (
    <group>
      {points.map((pt, i) => (
        <mesh key={`dot-${i}`} position={pt.p}>
          <sphereGeometry args={[pt.sz, 6, 6]} />
          <meshBasicMaterial color={pt.c} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
