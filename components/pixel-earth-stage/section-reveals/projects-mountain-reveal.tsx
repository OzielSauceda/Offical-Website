"use client";

import { RefObject, useEffect, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { SECTION_CONTENT, type Slab } from "@/lib/section-content";
import { SECTION_PALETTE } from "@/lib/section-palette";

import {
  createCdCaseBackTexture,
  createCdCaseShellFaceTexture,
  createCdCaseTrayTexture,
  createCdDiscTexture,
  createCdStickerTexture,
} from "../textures";

const RING_RADIUS = 1.7;
// square CD-case proportions (1:1). slightly smaller than the cassette
// so three of them in a row sit comfortably around the character.
const CASE_W = 0.82;
const CASE_H = 0.82;
const CASE_D = 0.07;
const CASE_REST_Y = 1.85;
const CASE_HIDDEN_Y = -0.6;
const RING_CENTER_Z = -0.05;
// clip against the platform surface so the case reads as passing
// through a stage slot on entry / exit, never visible below ground.
const CD_STAGE_CLIP_Y = -0.04;
const CD_CLIPPING_PLANES = [
  new THREE.Plane(new THREE.Vector3(0, 1, 0), -CD_STAGE_CLIP_Y),
];
// linear exit ramp so raw actually reaches 0 within the unmount window,
// letting the visibility guard kick in once the descent finishes.
const EXIT_DURATION = 1.5;

const CASE_ANGLES = [-Math.PI / 3, 0, Math.PI / 3];

const PALETTE = SECTION_PALETTE.projects;

// disc + sticker placement on the case front, expressed in case-local
// coords. these match the layout previously baked into the combined
// face texture: a disc offset slightly left/up of center and a
// lavender label hanging on the right. they're now their own meshes
// so the side view reads as a circle inside a clear case rather than
// a square card pasted on the inside of the front pane.
const DISC_X = -0.033;
const DISC_Y = -0.016;
const DISC_R = 0.288;
const STICKER_X = 0.218;
const STICKER_Y = 0;
const STICKER_W = 0.353;
const STICKER_H = 0.23;

// shared shell geometry + a wireframe of its 12 edges. one allocation
// for the whole ring so we don't recreate them per case mount.
const CASE_BOX_GEOMETRY = new THREE.BoxGeometry(CASE_W, CASE_H, CASE_D);
const CASE_EDGES_GEOMETRY = new THREE.EdgesGeometry(CASE_BOX_GEOMETRY);
// thin emissive accent strip running along each long side face — gives
// the transparent shell a visible edge instead of reading as a slab.
const CASE_SIDE_STRIP_GEOMETRY = new THREE.BoxGeometry(
  0.006,
  CASE_H * 0.78,
  CASE_D * 0.55,
);
const CASE_TOP_STRIP_GEOMETRY = new THREE.BoxGeometry(
  CASE_W * 0.78,
  0.006,
  CASE_D * 0.55,
);

type Props = {
  entered: boolean;
  reducedMotion: boolean;
  ringRotationRef: RefObject<number>;
};

function useEaseLerp(
  active: boolean,
  reducedMotion: boolean,
  enterRate = 2.0,
  exitDurationSec?: number,
) {
  const ref = useRef(0);
  useFrame((_, delta) => {
    if (active) {
      const k = reducedMotion ? 1 : Math.min(1, delta * enterRate);
      ref.current += (1 - ref.current) * k;
    } else if (exitDurationSec !== undefined && !reducedMotion) {
      ref.current = Math.max(0, ref.current - delta / exitDurationSec);
    } else {
      const k = reducedMotion ? 1 : Math.min(1, delta * enterRate);
      ref.current -= ref.current * k;
    }
  });
  return ref;
}

function cubicOut(t: number) {
  const u = 1 - Math.max(0, Math.min(1, t));
  return 1 - u * u * u;
}

function ProjectsCdCase({
  slab,
  angle,
  staggerOffset,
  entered,
  entryProgressRef,
  reducedMotion,
  trackIndex,
}: {
  slab: Slab;
  angle: number;
  staggerOffset: number;
  entered: boolean;
  entryProgressRef: RefObject<number>;
  reducedMotion: boolean;
  trackIndex: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const trackNumber = String(trackIndex + 1).padStart(2, "0");
  const shellFaceTexture = useMemo(
    () => createCdCaseShellFaceTexture(trackIndex),
    [trackIndex],
  );
  const trayTexture = useMemo(
    () => createCdCaseTrayTexture(trackIndex),
    [trackIndex],
  );
  const discTexture = useMemo(
    () => createCdDiscTexture(trackIndex, trackNumber),
    [trackIndex, trackNumber],
  );
  const stickerTexture = useMemo(
    () =>
      createCdStickerTexture(
        trackIndex,
        trackNumber,
        slab.heading,
        slab.body,
        slab.meta,
      ),
    [trackIndex, trackNumber, slab.heading, slab.body, slab.meta],
  );
  const backTexture = useMemo(
    () =>
      createCdCaseBackTexture(
        trackIndex,
        trackNumber,
        slab.heading,
        slab.meta,
      ),
    [trackIndex, trackNumber, slab.heading, slab.meta],
  );

  useEffect(() => {
    return () => {
      shellFaceTexture.dispose();
      trayTexture.dispose();
      discTexture.dispose();
      stickerTexture.dispose();
      backTexture.dispose();
    };
  }, [
    shellFaceTexture,
    trayTexture,
    discTexture,
    stickerTexture,
    backTexture,
  ]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const raw = entryProgressRef.current;
    let y: number;
    if (entered) {
      // rise with cubicOut + small overshoot so the case settles into its
      // rest pose snappily.
      const local = reducedMotion
        ? raw >= 1 ? 1 : 0
        : Math.max(
            0,
            Math.min(1, (raw - staggerOffset) / (1 - staggerOffset)),
          );
      const eased = cubicOut(local);
      const overshoot = reducedMotion ? 0 : Math.sin(eased * Math.PI) * 0.04;
      y = CASE_HIDDEN_Y + (CASE_REST_Y - CASE_HIDDEN_Y) * eased + overshoot;
    } else {
      // fall linearly so the descent reads at constant speed instead of
      // stalling at the top (the way cubicOut on a falling input would).
      const exitProgress = 1 - raw;
      const localDescent = reducedMotion
        ? exitProgress >= 1 ? 1 : 0
        : Math.max(
            0,
            Math.min(
              1,
              (exitProgress - staggerOffset) / (1 - staggerOffset),
            ),
          );
      y = CASE_REST_Y - (CASE_REST_Y - CASE_HIDDEN_Y) * localDescent;
    }
    g.position.y = y;
    // hide + un-raycast once the case is fully exited. the small floor
    // keeps the group visible during the descent itself.
    g.visible = entered || raw > 0.002;
  });

  const xz = useMemo(() => {
    const x = Math.sin(angle) * RING_RADIUS;
    const z = Math.cos(angle) * RING_RADIUS + RING_CENTER_Z;
    return [x, z] as const;
  }, [angle]);

  return (
    <group
      ref={groupRef}
      position={[xz[0], CASE_HIDDEN_Y, xz[1]]}
      rotation={[0, angle, 0]}
    >
      <group rotation={[-0.09, 0, 0]}>
        {/* clear plastic jewel-case shell. very low opacity + DoubleSide
            so the case reads as molded glass and the disc inside stays
            visible through the front pane. depthWrite is off so the
            transparent shell sorts cleanly behind the disc / sticker. */}
        <mesh castShadow geometry={CASE_BOX_GEOMETRY}>
          <meshStandardMaterial
            color="#c4d0e2"
            emissive={PALETTE.emissive}
            emissiveIntensity={0.12}
            roughness={0.18}
            metalness={0.05}
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
            depthWrite={false}
            clippingPlanes={CD_CLIPPING_PLANES}
          />
        </mesh>
        {/* edge wireframe — 12 box-corner lines at low opacity so the
            clear shell still reads as having defined corners from any
            angle. */}
        <lineSegments geometry={CASE_EDGES_GEOMETRY}>
          <lineBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.45}
            depthWrite={false}
            clippingPlanes={CD_CLIPPING_PLANES}
          />
        </lineSegments>
        {/* thin emissive accent strips running along each side face —
            give the transparent case a clear molded edge highlight when
            viewed from an angle. */}
        <mesh
          geometry={CASE_SIDE_STRIP_GEOMETRY}
          position={[CASE_W / 2 - 0.003, 0, 0]}
        >
          <meshBasicMaterial
            color="#dfe6f3"
            transparent
            opacity={0.55}
            depthWrite={false}
            toneMapped={false}
            clippingPlanes={CD_CLIPPING_PLANES}
          />
        </mesh>
        <mesh
          geometry={CASE_SIDE_STRIP_GEOMETRY}
          position={[-CASE_W / 2 + 0.003, 0, 0]}
        >
          <meshBasicMaterial
            color="#dfe6f3"
            transparent
            opacity={0.55}
            depthWrite={false}
            toneMapped={false}
            clippingPlanes={CD_CLIPPING_PLANES}
          />
        </mesh>
        <mesh
          geometry={CASE_TOP_STRIP_GEOMETRY}
          position={[0, CASE_H / 2 - 0.003, 0]}
        >
          <meshBasicMaterial
            color="#dfe6f3"
            transparent
            opacity={0.55}
            depthWrite={false}
            toneMapped={false}
            clippingPlanes={CD_CLIPPING_PLANES}
          />
        </mesh>
        <mesh
          geometry={CASE_TOP_STRIP_GEOMETRY}
          position={[0, -CASE_H / 2 + 0.003, 0]}
        >
          <meshBasicMaterial
            color="#dfe6f3"
            transparent
            opacity={0.55}
            depthWrite={false}
            toneMapped={false}
            clippingPlanes={CD_CLIPPING_PLANES}
          />
        </mesh>
        {/* interior tray layer — frosted gray/clear plastic with a
            faint cream paper insert + a recessed disc-well shadow +
            subtle latch grooves. forward-facing, sitting just in front
            of the back wall so it reads as the inside of the case when
            seen through the transparent front pane. the disc covers
            most of it; only the border around the disc + top/left
            strips are actually visible. */}
        <mesh position={[0, 0, -CASE_D / 2 + 0.012]}>
          <planeGeometry args={[CASE_W, CASE_H]} />
          <meshBasicMaterial
            map={trayTexture}
            transparent
            toneMapped={false}
            depthWrite={false}
            clippingPlanes={CD_CLIPPING_PLANES}
          />
        </mesh>
        {/* circular CD inside the case, sitting at mid-depth so it
            reads as a real disc behind the front pane when viewed from
            the side. DoubleSide so it still draws if the ring spins it
            past edge-on. */}
        <mesh position={[DISC_X, DISC_Y, 0]}>
          <circleGeometry args={[DISC_R, 96]} />
          <meshBasicMaterial
            map={discTexture}
            toneMapped={false}
            side={THREE.DoubleSide}
            clippingPlanes={CD_CLIPPING_PLANES}
          />
        </mesh>
        {/* shell front detail pane — transparent overlay carrying only
            the molded plastic features (corner clips, latch grooves,
            header, MD logo). everything else on the front is empty so
            the disc shows through clearly. */}
        <mesh position={[0, 0, CASE_D / 2 + 0.0015]}>
          <planeGeometry args={[CASE_W, CASE_H]} />
          <meshBasicMaterial
            map={shellFaceTexture}
            toneMapped={false}
            transparent
            depthWrite={false}
            clippingPlanes={CD_CLIPPING_PLANES}
          />
        </mesh>
        {/* purple project label — its own plane sitting just in front
            of the case pane so it reads as a paper sleeve glued on. */}
        <mesh position={[STICKER_X, STICKER_Y, CASE_D / 2 + 0.003]}>
          <planeGeometry args={[STICKER_W, STICKER_H]} />
          <meshBasicMaterial
            map={stickerTexture}
            toneMapped={false}
            clippingPlanes={CD_CLIPPING_PLANES}
          />
        </mesh>
        {/* back face — baked back-of-case texture. flipped 180° around
            Y so the design isn't mirrored when viewed from behind. */}
        <mesh
          position={[0, 0, -CASE_D / 2 - 0.001]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[CASE_W, CASE_H]} />
          <meshBasicMaterial
            map={backTexture}
            toneMapped={false}
            clippingPlanes={CD_CLIPPING_PLANES}
          />
        </mesh>
        {/* top emissive rim — cool blue from Projects palette */}
        <mesh position={[0, CASE_H / 2 - 0.005, CASE_D / 2 + 0.003]}>
          <planeGeometry args={[CASE_W - 0.06, 0.012]} />
          <meshBasicMaterial
            color={PALETTE.rim}
            transparent
            opacity={0.85}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
            clippingPlanes={CD_CLIPPING_PLANES}
          />
        </mesh>
      </group>
    </group>
  );
}

function ProjectsCdRing({
  entered,
  reducedMotion,
  ringRotationRef,
}: Props) {
  const ringRef = useRef<THREE.Group>(null);
  const entryProgressRef = useEaseLerp(
    entered,
    reducedMotion,
    2.2,
    EXIT_DURATION,
  );

  useFrame((_, delta) => {
    const g = ringRef.current;
    if (!g) return;
    const target = ringRotationRef.current;
    const current = g.rotation.y;
    const k = reducedMotion ? 1 : Math.min(1, delta * 7);
    g.rotation.y = current + (target - current) * k;
  });

  const slabs = SECTION_CONTENT.projects.slabs;

  return (
    <group ref={ringRef}>
      {slabs.map((slab, i) => (
        <ProjectsCdCase
          key={i}
          slab={slab}
          angle={CASE_ANGLES[i] ?? 0}
          staggerOffset={i * 0.12}
          entered={entered}
          entryProgressRef={entryProgressRef}
          reducedMotion={reducedMotion}
          trackIndex={i}
        />
      ))}
    </group>
  );
}

// keep the CD ring mounted permanently. building the CD-case textures
// (three canvases) is the source of the click-to-enter hitch — paying
// it once on app load instead of on every entry makes ENTER feel
// instant. when `entered` is false the cases sit at HIDDEN_Y, clipped
// by the stage plane and hidden by the visibility guard, costing
// nothing visually beyond a few ref reads per frame.
export function ProjectsMountainReveal(props: Props) {
  return <ProjectsCdRing {...props} />;
}
