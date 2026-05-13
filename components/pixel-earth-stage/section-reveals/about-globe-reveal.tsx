"use client";

import { RefObject, useEffect, useMemo, useRef, useState } from "react";

import { ThreeEvent, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { SECTION_CONTENT, type Slab } from "@/lib/section-content";
import { SECTION_PALETTE } from "@/lib/section-palette";

import {
  createCassetteBackTexture,
  createCassetteFaceTexture,
  createJCardCenterPanelTexture,
  createJCardLeftPanelTexture,
  createJCardRightPanelTexture,
} from "../textures";

const RING_RADIUS = 1.85;
// bumped up so the labels read cleanly without the user having to lean in.
const CASSETTE_W = 1.3;
const CASSETTE_H = 0.83;
const CASSETTE_D = 0.09;
const CASSETTE_REST_Y = 1.85;
const CASSETTE_HIDDEN_Y = -0.6;
const RING_CENTER_Z = -0.05;
// clear-plastic case around each cassette. small air gap on every face so
// the cassette appears to sit inside rather than be flush with the case.
const CASE_PAD = 0.035;
const CASE_W = CASSETTE_W + CASE_PAD * 2;
const CASE_H = CASSETTE_H + CASE_PAD * 2;
const CASE_D = CASSETTE_D + CASE_PAD * 2;
// Clip against the platform surface instead of toggling visibility. That
// makes entry and exit read like the cassette is passing through a stage slot.
const CASSETTE_STAGE_CLIP_Y = -0.04;
const CASSETTE_CLIPPING_PLANES = [
  new THREE.Plane(new THREE.Vector3(0, 1, 0), -CASSETTE_STAGE_CLIP_Y),
];
// linear exit ramp duration in seconds. matches the rise's perceived
// length so the descent reads at the same speed as the ascent.
const EXIT_DURATION = 1.5;
// J-card panel size — the legacy three-panel unfold meshes are no
// longer animated, but the panel planes still exist (hidden) so their
// material refs stay typed.
const PANEL_W = 1.46;
const PANEL_H = 0.94;
// where a selected cassette parks itself — pulled forward of the ring
// toward the camera so the hero clears the other slots without having
// to push the unselected cassettes further back into the globe.
const FOCUS_FRONT_Z = RING_RADIUS + 0.55;
const FOCUS_TILT_X = 0;
// lid swings open around the left vertical hinge axis. negative Y
// rotation opens the existing transparent lid toward the camera's
// left ~105° — minimal hinge proof, no content yet.
const OPEN_LID_ANGLE = -1.83;
// focus value at which the cassette is considered upright enough to
// start opening the lid. opening sequence: focus → 1 first, then lid.
// closing sequence: lid → 0 first, then focus back to 0.
const FOCUS_SETTLE = 0.95;
const LID_DONE = 0.05;

// three cassettes at chest height arranged in a fan around the character
const CASSETTE_ANGLES = [-Math.PI / 3, 0, Math.PI / 3];

// rounded-rect helper for the case body + perimeter frame. quadratic
// curves at each corner give the molded-plastic bevel look.
function makeRoundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

const CASE_CORNER_R = 0.045;
// very thin molded plastic lip — just enough to read as a case edge.
const FRAME_THICKNESS = 0.009;

// case body split into two clamshell halves. front half holds the
// cassette and is what swings around the spine when opened. back half
// holds the J-card and stays facing the camera.
const CASE_HALF_DEPTH = CASE_D / 2;
const CASE_FRONT_HALF_GEOMETRY = new THREE.ExtrudeGeometry(
  makeRoundedRectShape(CASE_W, CASE_H, CASE_CORNER_R),
  {
    depth: CASE_HALF_DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 1,
    curveSegments: 6,
  },
);
const CASE_BACK_HALF_GEOMETRY = (() => {
  const g = new THREE.ExtrudeGeometry(
    makeRoundedRectShape(CASE_W, CASE_H, CASE_CORNER_R),
    {
      depth: CASE_HALF_DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 1,
      curveSegments: 6,
    },
  );
  g.translate(0, 0, -CASE_HALF_DEPTH);
  return g;
})();

// perimeter frame — rounded outer rect with a rounded inner hole. sits on
// the very front of the case as a thin molded lip around the lid.
const CASE_FRAME_GEOMETRY = (() => {
  const outer = makeRoundedRectShape(CASE_W, CASE_H, CASE_CORNER_R);
  const inner = makeRoundedRectShape(
    CASE_W - FRAME_THICKNESS * 2,
    CASE_H - FRAME_THICKNESS * 2,
    Math.max(0.014, CASE_CORNER_R - FRAME_THICKNESS),
  );
  outer.holes.push(inner);
  return new THREE.ExtrudeGeometry(outer, {
    depth: 0.004,
    bevelEnabled: true,
    bevelThickness: 0.0015,
    bevelSize: 0.0015,
    bevelSegments: 1,
    curveSegments: 5,
  });
})();

// hinge barrel: small vertical cylinder. three sit along the spine edge.
// significantly slimmer than before so the hinge reads as detail, not
// as a chunky block.
const CASE_HINGE_BARREL_GEOMETRY = new THREE.CylinderGeometry(
  CASE_D * 0.26,
  CASE_D * 0.26,
  CASE_H * 0.11,
  12,
);

// latch clasp tab — small thin notch on the opposite edge.
const CASE_LATCH_GEOMETRY = new THREE.BoxGeometry(0.014, 0.022, CASE_D * 0.42);

// inner rails — thin molded ridges that hug the cassette edges.
const INNER_RAIL_H_GEOMETRY = new THREE.BoxGeometry(
  CASSETTE_W * 0.86,
  0.0045,
  0.006,
);
const INNER_RAIL_V_GEOMETRY = new THREE.BoxGeometry(
  0.0045,
  CASSETTE_H * 0.82,
  0.006,
);

// small molded posts — circular bumps at the inside corners.
const CASE_POST_GEOMETRY = (() => {
  const g = new THREE.CylinderGeometry(0.0085, 0.0085, 0.004, 12);
  g.rotateX(Math.PI / 2);
  return g;
})();

// lid well — gives the opened lid half its shallow tray depth. an
// extruded rounded frame with a hole, positioned so it extends
// backward from just behind the lid pane into the case interior.
const LID_WELL_INSET = 0.006;
const LID_WELL_WALL_THICKNESS = 0.012;
const LID_WELL_DEPTH = 0.020;
const LID_WELL_INNER_W =
  CASE_W - LID_WELL_INSET * 2 - LID_WELL_WALL_THICKNESS * 2;
const LID_WELL_INNER_H =
  CASE_H - LID_WELL_INSET * 2 - LID_WELL_WALL_THICKNESS * 2;
const CASE_LID_WELL_GEOMETRY = (() => {
  const outer = makeRoundedRectShape(
    CASE_W - LID_WELL_INSET * 2,
    CASE_H - LID_WELL_INSET * 2,
    Math.max(0.012, CASE_CORNER_R - LID_WELL_INSET),
  );
  const inner = makeRoundedRectShape(
    LID_WELL_INNER_W,
    LID_WELL_INNER_H,
    Math.max(0.008, CASE_CORNER_R - LID_WELL_INSET - LID_WELL_WALL_THICKNESS),
  );
  outer.holes.push(inner);
  return new THREE.ExtrudeGeometry(outer, {
    depth: LID_WELL_DEPTH,
    bevelEnabled: false,
    curveSegments: 5,
  });
})();

// thin molded rails inside the lid well above + below the J-card
const LID_WELL_RAIL_GEOMETRY = new THREE.BoxGeometry(
  LID_WELL_INNER_W * 0.86,
  0.0035,
  0.005,
);

// rim outline at the front opening of the well — bright thin edge
const CASE_LID_WELL_RIM_GEOMETRY = new THREE.EdgesGeometry(
  new THREE.ExtrudeGeometry(
    makeRoundedRectShape(
      LID_WELL_INNER_W,
      LID_WELL_INNER_H,
      Math.max(
        0.008,
        CASE_CORNER_R - LID_WELL_INSET - LID_WELL_WALL_THICKNESS,
      ),
    ),
    { depth: 0.001, bevelEnabled: false, curveSegments: 5 },
  ),
);

// thin lid-pane edge highlight — a 1px-feeling rounded outline that
// defines where the front lid plastic sits, without washing out the face.
const CASE_LID_OUTLINE_GEOMETRY = (() => {
  const w = CASE_W - FRAME_THICKNESS * 2 - 0.006;
  const h = CASE_H - FRAME_THICKNESS * 2 - 0.006;
  const r = Math.max(0.01, CASE_CORNER_R - FRAME_THICKNESS - 0.004);
  return new THREE.EdgesGeometry(
    new THREE.ExtrudeGeometry(makeRoundedRectShape(w, h, r), {
      depth: 0.001,
      bevelEnabled: false,
      curveSegments: 6,
    }),
  );
})();

type Props = {
  entered: boolean;
  reducedMotion: boolean;
  ringRotationRef: RefObject<number>;
};

const PALETTE = SECTION_PALETTE.about;

function useEaseLerp(
  active: boolean,
  reducedMotion: boolean,
  enterRate = 2.0,
  exitDurationSec?: number,
) {
  const ref = useRef(0);
  useFrame((_, delta) => {
    if (active) {
      // geometric approach toward 1 — gives the rise its snappy initial
      // climb and gentle settle near the top.
      const k = reducedMotion ? 1 : Math.min(1, delta * enterRate);
      ref.current += (1 - ref.current) * k;
    } else if (exitDurationSec !== undefined && !reducedMotion) {
      // linear ramp toward 0 over a fixed duration — total descent time
      // is deterministic so the fall reads at the rise's perceived speed.
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

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function AboutCassette({
  slab,
  angle,
  staggerOffset,
  entered,
  entryProgressRef,
  ringGroupRef,
  reducedMotion,
  trackIndex,
  isOpen,
  isAnotherOpen,
  onSelect,
}: {
  slab: Slab;
  angle: number;
  staggerOffset: number;
  entered: boolean;
  entryProgressRef: RefObject<number>;
  ringGroupRef: RefObject<THREE.Group | null>;
  reducedMotion: boolean;
  trackIndex: number;
  isOpen: boolean;
  isAnotherOpen: boolean;
  onSelect: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const tiltGroupRef = useRef<THREE.Group>(null);
  const cassetteGroupRef = useRef<THREE.Group>(null);
  const lidGroupRef = useRef<THREE.Group>(null);
  const jcardInsertMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const jcardGroupRef = useRef<THREE.Group>(null);
  const leftPanelRef = useRef<THREE.Mesh>(null);
  const centerPanelRef = useRef<THREE.Mesh>(null);
  const rightPanelRef = useRef<THREE.Mesh>(null);
  const leftPanelMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const centerPanelMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const rightPanelMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const shellMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const faceMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const rimMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const openRef = useRef(0);
  const lidOpenRef = useRef(0);
  const hideRef = useRef(0);
  const hoverRef = useRef(0);

  const trackNumber = String(trackIndex + 1).padStart(2, "0");

  const faceTexture = useMemo(
    () =>
      createCassetteFaceTexture(
        trackIndex,
        trackNumber,
        slab.heading,
        slab.body,
        slab.meta,
        "Oziel Sauceda",
      ),
    [trackIndex, trackNumber, slab.heading, slab.body, slab.meta],
  );

  const backTexture = useMemo(
    () => createCassetteBackTexture(trackIndex, trackNumber),
    [trackIndex, trackNumber],
  );

  const leftPanelTexture = useMemo(
    () =>
      createJCardLeftPanelTexture(
        trackIndex,
        slab.heading,
        slab.tagline ?? slab.body,
        slab.meta,
      ),
    [trackIndex, slab.heading, slab.tagline, slab.body, slab.meta],
  );

  const centerPanelTexture = useMemo(
    () =>
      createJCardCenterPanelTexture(slab.detail ?? slab.body, slab.heading),
    [slab.detail, slab.body, slab.heading],
  );

  const rightPanelTexture = useMemo(
    () =>
      createJCardRightPanelTexture(
        slab.credits ?? [],
        slab.heading,
        "Oziel Sauceda",
      ),
    [slab.credits, slab.heading],
  );

  useEffect(() => {
    return () => {
      faceTexture.dispose();
      backTexture.dispose();
      leftPanelTexture.dispose();
      centerPanelTexture.dispose();
      rightPanelTexture.dispose();
    };
  }, [
    faceTexture,
    backTexture,
    leftPanelTexture,
    centerPanelTexture,
    rightPanelTexture,
  ]);

  const xz = useMemo(() => {
    const x = Math.sin(angle) * RING_RADIUS;
    const z = Math.cos(angle) * RING_RADIUS + RING_CENTER_Z;
    return [x, z] as const;
  }, [angle]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    const tilt = tiltGroupRef.current;
    const jcard = jcardGroupRef.current;
    const cassette = cassetteGroupRef.current;
    if (!g || !tilt || !jcard || !cassette) return;

    // rise / drop animation from the entry-progress ref. on exit the
    // stagger mirrors entry — first cassette falls first, last falls last.
    const raw = entryProgressRef.current;
    let y: number;
    if (entered) {
      // rise from HIDDEN to REST. cubicOut gives a fast initial climb and
      // a gentle settle at the top, with a small overshoot bounce.
      const local = reducedMotion
        ? raw >= 1
          ? 1
          : 0
        : Math.max(
            0,
            Math.min(1, (raw - staggerOffset) / (1 - staggerOffset)),
          );
      const eased = cubicOut(local);
      const overshoot = reducedMotion ? 0 : Math.sin(eased * Math.PI) * 0.04;
      y =
        CASSETTE_HIDDEN_Y +
        (CASSETTE_REST_Y - CASSETTE_HIDDEN_Y) * eased +
        overshoot;
    } else {
      // fall from REST to HIDDEN with constant speed (linear). exit stagger
      // delays the trailing cassettes so they leave the stage in the same
      // order they arrived.
      const exitProgress = 1 - raw;
      const localDescent = reducedMotion
        ? exitProgress >= 1
          ? 1
          : 0
        : Math.max(
            0,
            Math.min(
              1,
              (exitProgress - staggerOffset) / (1 - staggerOffset),
            ),
          );
      y =
        CASSETTE_REST_Y -
        (CASSETTE_REST_Y - CASSETTE_HIDDEN_Y) * localDescent;
    }
    g.position.y = y;
    g.visible = true;

    // SEQUENCED OPEN / CLOSE
    //
    // opening: cassette moves to its upright focus pose first
    // (openRef → 1). only once focus has settled (>= FOCUS_SETTLE) is the
    // lid allowed to start swinging (lidOpenRef → 1).
    //
    // closing: the lid is told to shut first (lidOpenRef → 0). only once
    // it is essentially closed (<= LID_DONE) does focus start unwinding
    // (openRef → 0) so the cassette returns to the ring.
    const focusSettled = openRef.current >= FOCUS_SETTLE;
    const lidSettled = lidOpenRef.current <= LID_DONE;
    const openTarget = isOpen ? 1 : lidSettled ? 0 : 1;
    const lidTarget = isOpen && focusSettled ? 1 : 0;
    const hideTarget = isAnotherOpen ? 1 : 0;
    const hoverTarget = isOpen ? 0 : 1;
    const ok = reducedMotion ? 1 : Math.min(1, delta * 5);
    const lk = reducedMotion ? 1 : Math.min(1, delta * 5);
    const hk = reducedMotion ? 1 : Math.min(1, delta * 4);
    openRef.current += (openTarget - openRef.current) * ok;
    lidOpenRef.current += (lidTarget - lidOpenRef.current) * lk;
    hideRef.current += (hideTarget - hideRef.current) * hk;
    hoverRef.current += (hoverTarget - hoverRef.current) * hk;

    const focus = openRef.current;
    const hideAmt = hideRef.current;

    // FOCUS — move the whole cassette group from its ring slot to the
    // front-center reading spot, rotate it to face the camera, drop the
    // forward tilt, and roll it 90° around screen-Z so the long edge
    // stands vertical (portrait presentation pose). target is expressed
    // in ring-local coords by compensating for the ring's current Y
    // rotation, so whichever cassette is clicked lands at world-front.
    const ringY = ringGroupRef.current?.rotation.y ?? 0;
    const sinR = Math.sin(ringY);
    const cosR = Math.cos(ringY);
    const focusTargetX = -FOCUS_FRONT_Z * sinR;
    const focusTargetZ = FOCUS_FRONT_Z * cosR;
    g.position.x = lerp(xz[0], focusTargetX, focus);
    g.position.z = lerp(xz[1], focusTargetZ, focus);
    g.rotation.y = lerp(angle, -ringY, focus);
    g.rotation.z = focus * (Math.PI / 2);
    tilt.rotation.x = lerp(-0.09, FOCUS_TILT_X, focus);

    // cassette body stays put inside the group — the whole group moves.
    cassette.position.y = 0;
    cassette.position.z = 0;

    // non-selected cassettes slide back slightly + dim subtly. kept
    // visible so the row still reads as a row.
    const fade = 1 - hideAmt * 0.35;
    const pushBack = lerp(0, -0.18, hideAmt);
    const scale = lerp(1, 0.94, hideAmt);
    cassette.scale.setScalar(scale);
    if (shellMatRef.current) {
      shellMatRef.current.opacity = fade;
      shellMatRef.current.transparent = true;
    }
    if (faceMatRef.current) {
      faceMatRef.current.opacity = fade;
      faceMatRef.current.transparent = true;
    }
    if (rimMatRef.current) {
      rimMatRef.current.opacity = 0.85 * fade;
    }
    cassette.position.z += pushBack;

    // lid rotates around its hinge pivot based on lidOpenRef. the
    // rotation is around local X, which — once the parent group has
    // rolled into the portrait pose — corresponds to world Y (vertical).
    // result: the lid swings sideways around a vertical book-spine
    // hinge instead of folding down.
    const lid = lidGroupRef.current;
    if (lid) {
      lid.rotation.x = lidOpenRef.current * OPEN_LID_ANGLE;
    }
    // J-card paper insert fades in with the lid open progress, so the
    // cassette face stays visible through the closed lid plastic.
    if (jcardInsertMatRef.current) {
      jcardInsertMatRef.current.opacity = lidOpenRef.current;
    }

    // J-card stays closed — its content reveal comes in a later step.
    jcard.visible = false;
    const panelMatRefs = [leftPanelMatRef, centerPanelMatRef, rightPanelMatRef];
    for (let i = 0; i < 3; i++) {
      const mat = panelMatRefs[i]?.current;
      if (mat) {
        mat.opacity = 0;
      }
    }
  });

  const handleClick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.nativeEvent && "stopPropagation" in e.nativeEvent) {
      e.nativeEvent.stopPropagation();
    }
    onSelect();
  };

  return (
    <group
      ref={groupRef}
      position={[xz[0], CASSETTE_HIDDEN_Y, xz[1]]}
      rotation={[0, angle, 0]}
    >
      <group ref={tiltGroupRef} rotation={[-0.09, 0, 0]}>
        {/* cassette body — clickable. while another cassette is the
            active selection, this one becomes a non-interactive
            background prop: no pointer handlers wired in. */}
        <group
          ref={cassetteGroupRef}
          onPointerDown={isAnotherOpen ? undefined : handleClick}
          onPointerOver={
            isAnotherOpen
              ? undefined
              : (e) => {
                  e.stopPropagation();
                  document.body.style.cursor = "pointer";
                }
          }
          onPointerOut={
            isAnotherOpen
              ? undefined
              : () => {
                  document.body.style.cursor = "";
                }
          }
        >
          {/* ===== BACK HALF (static — J-card tray side) =====
              stays facing the camera when the case opens. holds the
              cream J-card recessed in a shallow plastic well. */}
          <mesh geometry={CASE_BACK_HALF_GEOMETRY} renderOrder={1}>
            <meshStandardMaterial
              color="#f4f5f6"
              transparent
              opacity={0.07}
              roughness={0.22}
              metalness={0}
              side={THREE.DoubleSide}
              depthWrite={false}
              clippingPlanes={CASSETTE_CLIPPING_PLANES}
            />
          </mesh>
          {/* J-card well — extruded rounded frame at the back of the
              back half, walls extending forward toward the spine. */}
          <mesh
            geometry={CASE_LID_WELL_GEOMETRY}
            position={[0, 0, -CASE_D / 2 + 0.005]}
            renderOrder={2}
          >
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.18}
              toneMapped={false}
              side={THREE.DoubleSide}
              depthWrite={false}
              clippingPlanes={CASSETTE_CLIPPING_PLANES}
            />
          </mesh>
          {/* clear plate at the back of the well */}
          <mesh
            position={[0, 0, -CASE_D / 2 + 0.005]}
            renderOrder={2}
          >
            <planeGeometry args={[LID_WELL_INNER_W, LID_WELL_INNER_H]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.08}
              toneMapped={false}
              side={THREE.DoubleSide}
              depthWrite={false}
              clippingPlanes={CASSETTE_CLIPPING_PLANES}
            />
          </mesh>
          {/* cream J-card paper insert — sits recessed against the
              back wall of the back half. fades in once the case is
              fully open so the closed case still reads as the cassette
              face through the transparent front lid. */}
          <mesh
            position={[0, 0, -CASE_D / 2 + 0.007]}
            renderOrder={3}
          >
            <planeGeometry args={[CASSETTE_W * 0.92, CASSETTE_H * 0.9]} />
            <meshBasicMaterial
              ref={jcardInsertMatRef}
              color="#f3e8d0"
              transparent
              opacity={0}
              toneMapped={false}
              side={THREE.DoubleSide}
              clippingPlanes={CASSETTE_CLIPPING_PLANES}
            />
          </mesh>
          {/* thin molded rails inside the well that "hold" the J-card */}
          {[CASSETTE_H * 0.43, -CASSETTE_H * 0.43].map((ry, i) => (
            <mesh
              key={`backwell-rail-${i}`}
              geometry={LID_WELL_RAIL_GEOMETRY}
              position={[0, ry, -CASE_D / 2 + 0.009]}
              renderOrder={3}
            >
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.28}
                toneMapped={false}
                depthWrite={false}
                clippingPlanes={CASSETTE_CLIPPING_PLANES}
              />
            </mesh>
          ))}
          {/* well rim — bright thin edge at the front of the well */}
          <lineSegments
            geometry={CASE_LID_WELL_RIM_GEOMETRY}
            position={[0, 0, -CASE_D / 2 + LID_WELL_DEPTH + 0.005]}
            renderOrder={4}
          >
            <lineBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.42}
              depthWrite={false}
              clippingPlanes={CASSETTE_CLIPPING_PLANES}
            />
          </lineSegments>
          {/* ===== FRONT HALF (rotates around the spine when open) =====
              carries the cassette + the visible clear lid plastic.
              pivots around the top long edge in the landscape frame,
              which becomes the LEFT vertical edge once the parent
              group has rolled into the portrait pose, so the lid
              swings around the vertical book-spine hinge. */}
          <group ref={lidGroupRef} position={[0, CASE_H / 2, 0]}>
            <group position={[0, -CASE_H / 2, 0]}>
              {/* cassette body shell — held in the front half */}
              <mesh castShadow>
                <boxGeometry args={[CASSETTE_W, CASSETTE_H, CASSETTE_D]} />
                <meshStandardMaterial
                  ref={shellMatRef}
                  color="#ece4d4"
                  emissive={PALETTE.emissive}
                  emissiveIntensity={0.16}
                  roughness={0.55}
                  metalness={0.06}
                  clippingPlanes={CASSETTE_CLIPPING_PLANES}
                />
              </mesh>
              {/* cassette face — texture-mapped plane in front of the
                  cassette body */}
              <mesh position={[0, 0, CASSETTE_D / 2 + 0.001]}>
                <planeGeometry args={[CASSETTE_W, CASSETTE_H]} />
                <meshBasicMaterial
                  ref={faceMatRef}
                  map={faceTexture}
                  toneMapped={false}
                  transparent
                  clippingPlanes={CASSETTE_CLIPPING_PLANES}
                />
              </mesh>
              {/* cassette rim accent stripe */}
              <mesh position={[0, CASSETTE_H / 2 - 0.005, CASSETTE_D / 2 + 0.003]}>
                <planeGeometry args={[CASSETTE_W - 0.06, 0.012]} />
                <meshBasicMaterial
                  ref={rimMatRef}
                  color={PALETTE.rim}
                  transparent
                  opacity={0.85}
                  toneMapped={false}
                  blending={THREE.AdditiveBlending}
                  clippingPlanes={CASSETTE_CLIPPING_PLANES}
                />
              </mesh>
              {/* cassette back — molded plastic detail (seams, spindle
                  holes, screws, stamps) so the opened cassette half
                  doesn't read as a blank slab. flipped 180° around Y so
                  the texture isn't a mirror image of the front. */}
              <mesh
                position={[0, 0, -CASSETTE_D / 2 - 0.001]}
                rotation={[0, Math.PI, 0]}
              >
                <planeGeometry args={[CASSETTE_W, CASSETTE_H]} />
                <meshBasicMaterial
                  map={backTexture}
                  toneMapped={false}
                  clippingPlanes={CASSETTE_CLIPPING_PLANES}
                />
              </mesh>
              {/* front-half clear plastic shell — wraps the cassette */}
              <mesh geometry={CASE_FRONT_HALF_GEOMETRY} renderOrder={1}>
                <meshStandardMaterial
                  color="#f4f5f6"
                  transparent
                  opacity={0.07}
                  roughness={0.22}
                  metalness={0}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                  clippingPlanes={CASSETTE_CLIPPING_PLANES}
                />
              </mesh>
              {/* latch clasps — opposite the spine */}
              {[-CASE_W * 0.32, CASE_W * 0.32].map((latchX, i) => (
                <mesh
                  key={`latch-${i}`}
                  geometry={CASE_LATCH_GEOMETRY}
                  position={[latchX, -CASE_H / 2 + 0.002, 0]}
                  rotation={[0, 0, Math.PI / 2]}
                  renderOrder={3}
                >
                  <meshStandardMaterial
                    color="#c2c6cb"
                    roughness={0.42}
                    metalness={0.08}
                    transparent
                    opacity={0.6}
                    depthWrite={false}
                    clippingPlanes={CASSETTE_CLIPPING_PLANES}
                  />
                </mesh>
              ))}
              {/* front lid pane — clear plastic. lighting-independent so
                  it can never tint gray under the stage fill. */}
              <mesh
                position={[0, 0, CASE_D / 2 - 0.009]}
                renderOrder={2}
              >
                <planeGeometry
                  args={[
                    CASE_W - FRAME_THICKNESS * 2 - 0.004,
                    CASE_H - FRAME_THICKNESS * 2 - 0.004,
                  ]}
                />
                <meshBasicMaterial
                  color="#ffffff"
                  transparent
                  opacity={0.04}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                  depthWrite={false}
                  clippingPlanes={CASSETTE_CLIPPING_PLANES}
                />
              </mesh>
              {/* lid pane outline — thin bright edge that defines the lid plane */}
              <lineSegments
                geometry={CASE_LID_OUTLINE_GEOMETRY}
                position={[0, 0, CASE_D / 2 - 0.006]}
                renderOrder={4}
              >
                <lineBasicMaterial
                  color="#ffffff"
                  transparent
                  opacity={0.35}
                  depthWrite={false}
                  clippingPlanes={CASSETTE_CLIPPING_PLANES}
                />
              </lineSegments>
              {/* very slim molded perimeter lip — lighting-independent
                  white at very low opacity so the open lid reads as a
                  thin clear plastic shell, never as a gray door. */}
              <mesh
                geometry={CASE_FRAME_GEOMETRY}
                position={[0, 0, CASE_D / 2 - 0.001]}
                renderOrder={3}
              >
                <meshBasicMaterial
                  color="#ffffff"
                  transparent
                  opacity={0.22}
                  toneMapped={false}
                  depthWrite={false}
                  clippingPlanes={CASSETTE_CLIPPING_PLANES}
                />
              </mesh>
              {/* upper-right corner glare — pushed away from the cassette
                  face details so the heading + heart stay clean */}
              <mesh
                position={[CASE_W * 0.26, CASE_H * 0.32, CASE_D / 2 + 0.0014]}
                rotation={[0, 0, -0.32]}
                renderOrder={4}
              >
                <planeGeometry args={[CASE_W * 0.4, 0.03]} />
                <meshBasicMaterial
                  color="#ffffff"
                  transparent
                  opacity={0.12}
                  depthWrite={false}
                  toneMapped={false}
                  clippingPlanes={CASSETTE_CLIPPING_PLANES}
                />
              </mesh>
              {/* bright top-edge highlight along the lid */}
              <mesh
                position={[0, CASE_H / 2 - 0.009, CASE_D / 2 + 0.0017]}
                renderOrder={4}
              >
                <planeGeometry args={[CASE_W * 0.78, 0.004]} />
                <meshBasicMaterial
                  color="#ffffff"
                  transparent
                  opacity={0.5}
                  depthWrite={false}
                  toneMapped={false}
                  clippingPlanes={CASSETTE_CLIPPING_PLANES}
                />
              </mesh>
              {/* faint scuffs near the edges only — kept off the cassette
                  face center so they don't cross headings or body copy. */}
              {[
                { x: CASE_W * 0.34, y: -CASE_H * 0.32, rot: -0.32, w: 0.18, o: 0.06 },
                { x: -CASE_W * 0.32, y: -CASE_H * 0.32, rot: -0.36, w: 0.14, o: 0.05 },
                { x: -CASE_W * 0.3, y: CASE_H * 0.28, rot: -0.3, w: 0.14, o: 0.05 },
              ].map((s, i) => (
                <mesh
                  key={`streak-${i}`}
                  position={[s.x, s.y, CASE_D / 2 + 0.0019]}
                  rotation={[0, 0, s.rot]}
                  renderOrder={4}
                >
                  <planeGeometry args={[s.w, 0.0028]} />
                  <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={s.o}
                    depthWrite={false}
                    toneMapped={false}
                    clippingPlanes={CASSETTE_CLIPPING_PLANES}
                  />
                </mesh>
              ))}
            </group>
          </group>
          {/* hinge barrels — sit on the top long edge in the landscape
              frame so they align with the lid pivot. once the parent
              rolls into portrait, they end up running down the LEFT
              vertical spine of the upright case. */}
          {[-CASE_W * 0.33, 0, CASE_W * 0.33].map((hx, i) => (
            <mesh
              key={`hinge-${i}`}
              geometry={CASE_HINGE_BARREL_GEOMETRY}
              position={[hx, CASE_H / 2 - 0.002, 0]}
              rotation={[0, 0, Math.PI / 2]}
              renderOrder={3}
            >
              <meshStandardMaterial
                color="#c2c6cb"
                roughness={0.42}
                metalness={0.08}
                transparent
                opacity={0.6}
                depthWrite={false}
                clippingPlanes={CASSETTE_CLIPPING_PLANES}
              />
            </mesh>
          ))}
          {/* inner molded rails — sit at the front face of the back
              half where they cradled the cassette before it swung out.
              now visible as the tray's molded features. */}
          {[CASSETTE_H / 2 + 0.008, -(CASSETTE_H / 2 + 0.008)].map((ry, i) => (
            <mesh
              key={`rail-h-${i}`}
              geometry={INNER_RAIL_H_GEOMETRY}
              position={[0, ry, 0]}
              renderOrder={2}
            >
              <meshStandardMaterial
                color="#d8dbde"
                roughness={0.5}
                metalness={0}
                transparent
                opacity={0.55}
                depthWrite={false}
                clippingPlanes={CASSETTE_CLIPPING_PLANES}
              />
            </mesh>
          ))}
          {[CASSETTE_W / 2 + 0.008, -(CASSETTE_W / 2 + 0.008)].map((rx, i) => (
            <mesh
              key={`rail-v-${i}`}
              geometry={INNER_RAIL_V_GEOMETRY}
              position={[rx, 0, 0]}
              renderOrder={2}
            >
              <meshStandardMaterial
                color="#d8dbde"
                roughness={0.5}
                metalness={0}
                transparent
                opacity={0.5}
                depthWrite={false}
                clippingPlanes={CASSETTE_CLIPPING_PLANES}
              />
            </mesh>
          ))}
          {/* small molded posts near the inside corners */}
          {(
            [
              [CASSETTE_W / 2 + 0.018, CASSETTE_H / 2 + 0.018],
              [-(CASSETTE_W / 2 + 0.018), CASSETTE_H / 2 + 0.018],
              [CASSETTE_W / 2 + 0.018, -(CASSETTE_H / 2 + 0.018)],
              [-(CASSETTE_W / 2 + 0.018), -(CASSETTE_H / 2 + 0.018)],
            ] as const
          ).map(([px, py], i) => (
            <mesh
              key={`post-${i}`}
              geometry={CASE_POST_GEOMETRY}
              position={[px, py, 0]}
              renderOrder={2}
            >
              <meshStandardMaterial
                color="#cfd2d6"
                roughness={0.48}
                metalness={0}
                transparent
                opacity={0.62}
                depthWrite={false}
                clippingPlanes={CASSETTE_CLIPPING_PLANES}
              />
            </mesh>
          ))}
        </group>

        {/* J-card insert — three paper panels that fan out when the
            cassette is selected. closed: tucked behind the cassette
            face at zero scale. open: spread horizontally and tilted
            toward the camera for reading. */}
        <group ref={jcardGroupRef} position={[0, 0, CASSETTE_D / 2]}>
          <mesh ref={leftPanelRef}>
            <planeGeometry args={[PANEL_W, PANEL_H]} />
            <meshBasicMaterial
              ref={leftPanelMatRef}
              map={leftPanelTexture}
              toneMapped={false}
              transparent
              opacity={0}
              side={THREE.DoubleSide}
              clippingPlanes={CASSETTE_CLIPPING_PLANES}
            />
          </mesh>
          <mesh ref={centerPanelRef}>
            <planeGeometry args={[PANEL_W, PANEL_H]} />
            <meshBasicMaterial
              ref={centerPanelMatRef}
              map={centerPanelTexture}
              toneMapped={false}
              transparent
              opacity={0}
              side={THREE.DoubleSide}
              clippingPlanes={CASSETTE_CLIPPING_PLANES}
            />
          </mesh>
          <mesh ref={rightPanelRef}>
            <planeGeometry args={[PANEL_W, PANEL_H]} />
            <meshBasicMaterial
              ref={rightPanelMatRef}
              map={rightPanelTexture}
              toneMapped={false}
              transparent
              opacity={0}
              side={THREE.DoubleSide}
              clippingPlanes={CASSETTE_CLIPPING_PLANES}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function AboutCassetteRing({
  entered,
  reducedMotion,
  ringRotationRef,
}: Props) {
  const ringRef = useRef<THREE.Group>(null);
  const entryProgressRef = useEaseLerp(
    entered,
    reducedMotion,
    1.6,
    EXIT_DURATION,
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // close any open panel when the section is exited so the next entry
  // starts with all cassettes closed.
  useEffect(() => {
    if (!entered) {
      // syncing local panel state to the external "entered" signal —
      // exactly what effects exist for.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedIndex(null);
    }
  }, [entered]);

  // ESC closes an open J-card without exiting the section. parent's ESC
  // handler still exits when no panel is open.
  useEffect(() => {
    if (selectedIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setSelectedIndex(null);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [selectedIndex]);

  useFrame((_, delta) => {
    const g = ringRef.current;
    if (!g) return;
    // freeze ring rotation while a cassette is open so the J-card stays
    // squarely in front of the camera. ring re-tracks once closed.
    if (selectedIndex !== null) return;
    const target = ringRotationRef.current;
    const current = g.rotation.y;
    const k = reducedMotion ? 1 : Math.min(1, delta * 7);
    g.rotation.y = current + (target - current) * k;
  });

  const slabs = SECTION_CONTENT.about.slabs;

  return (
    <group ref={ringRef}>
      {slabs.map((slab, i) => (
        <AboutCassette
          key={i}
          slab={slab}
          angle={CASSETTE_ANGLES[i] ?? 0}
          staggerOffset={i * 0.12}
          entered={entered}
          entryProgressRef={entryProgressRef}
          ringGroupRef={ringRef}
          reducedMotion={reducedMotion}
          trackIndex={i}
          isOpen={selectedIndex === i}
          isAnotherOpen={selectedIndex !== null && selectedIndex !== i}
          onSelect={() =>
            setSelectedIndex((cur) => (cur === i ? null : i))
          }
        />
      ))}
    </group>
  );
}

// keep the ring mounted permanently. building cassette + J-card textures
// (12 canvases at 1024px) and compiling their shaders is the source of the
// click-to-enter lag — paying it once on app load instead of on every
// entry makes ENTER feel instant. when `entered` is false the cassettes
// sit at HIDDEN_Y, fully clipped by the stage plane, costing nothing
// visually beyond a few ref reads per frame.
export function AboutGlobeReveal(props: Props) {
  return <AboutCassetteRing {...props} />;
}
