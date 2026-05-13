"use client";

import { useMemo } from "react";

import * as THREE from "three";

type Vertex = readonly [number, number, number];

const PANEL_OFFSET = 0.006;
const SEAM_OFFSET = 0.018;
const SEAM_COLOR = "#0a0b14";

// shallow shade deltas so facets read as carved planes, not pasted panels
const SHADES = {
  base: { light: "#5a5a62", dark: "#3f3f47" },
  ledge: { light: "#cbcac5", dark: "#aeaea8" },
  upper: { light: "#787880", dark: "#5a5a62" },
  peak: { light: "#93939a", dark: "#76767c" },
} as const;

type ShadePair = keyof typeof SHADES;

type FacetPanel = {
  quad: readonly [number, number, number, number];
  diagonal: "diag-02" | "diag-13";
  shade0: "light" | "dark";
  shade1: "light" | "dark";
};

type SeamLine = {
  quad: readonly [number, number, number, number];
  diagonal: "diag-02" | "diag-13";
};

function vec3(v: Vertex) {
  return new THREE.Vector3(v[0], v[1], v[2]);
}

function quadCorners(
  vertices: readonly Vertex[],
  quad: readonly [number, number, number, number],
) {
  return quad.map((i) => vec3(vertices[i]!));
}

function quadNormal(corners: THREE.Vector3[]) {
  return new THREE.Vector3()
    .crossVectors(
      new THREE.Vector3().subVectors(corners[1]!, corners[0]!),
      new THREE.Vector3().subVectors(corners[2]!, corners[0]!),
    )
    .normalize();
}

function buildTriGeometry(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z],
      3,
    ),
  );
  geo.computeVertexNormals();
  return geo;
}

function buildLineGeometry(a: THREE.Vector3, b: THREE.Vector3) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([a.x, a.y, a.z, b.x, b.y, b.z], 3),
  );
  return geo;
}

function buildPanel(
  vertices: readonly Vertex[],
  spec: FacetPanel,
  shade: (typeof SHADES)[ShadePair],
) {
  const corners = quadCorners(vertices, spec.quad);
  const normal = quadNormal(corners);
  const lifted = corners.map((c) =>
    c.clone().addScaledVector(normal, PANEL_OFFSET),
  );

  let tri0: [number, number, number];
  let tri1: [number, number, number];
  if (spec.diagonal === "diag-02") {
    tri0 = [0, 1, 2];
    tri1 = [0, 2, 3];
  } else {
    tri0 = [0, 1, 3];
    tri1 = [1, 2, 3];
  }

  return {
    geo0: buildTriGeometry(
      lifted[tri0[0]]!,
      lifted[tri0[1]]!,
      lifted[tri0[2]]!,
    ),
    geo1: buildTriGeometry(
      lifted[tri1[0]]!,
      lifted[tri1[1]]!,
      lifted[tri1[2]]!,
    ),
    color0: shade[spec.shade0],
    color1: shade[spec.shade1],
  };
}

function buildSeam(vertices: readonly Vertex[], spec: SeamLine) {
  const corners = quadCorners(vertices, spec.quad);
  const normal = quadNormal(corners);
  const a = spec.diagonal === "diag-02" ? corners[0]! : corners[1]!;
  const b = spec.diagonal === "diag-02" ? corners[2]! : corners[3]!;
  return buildLineGeometry(
    a.clone().addScaledVector(normal, SEAM_OFFSET),
    b.clone().addScaledVector(normal, SEAM_OFFSET),
  );
}

function PanelGroup({
  vertices,
  panels,
  shadePair,
}: {
  vertices: readonly Vertex[];
  panels: readonly FacetPanel[];
  shadePair: ShadePair;
}) {
  const shade = SHADES[shadePair];
  const flatKey = vertices.map((v) => v.join(",")).join("|");

  const items = useMemo(
    () => panels.map((p) => buildPanel(vertices, p, shade)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flatKey, panels, shade],
  );

  return (
    <>
      {items.map((item, i) => (
        <group key={i} renderOrder={34}>
          <mesh geometry={item.geo0}>
            <meshStandardMaterial
              color={item.color0}
              roughness={1}
              metalness={0}
              flatShading
              side={THREE.DoubleSide}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
          <mesh geometry={item.geo1}>
            <meshStandardMaterial
              color={item.color1}
              roughness={1}
              metalness={0}
              flatShading
              side={THREE.DoubleSide}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function SeamGroup({
  vertices,
  seams,
}: {
  vertices: readonly Vertex[];
  seams: readonly SeamLine[];
}) {
  const flatKey = vertices.map((v) => v.join(",")).join("|");

  const geos = useMemo(
    () => seams.map((s) => buildSeam(vertices, s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flatKey, seams],
  );

  return (
    <>
      {geos.map((geo, i) => (
        <lineSegments key={i} geometry={geo} renderOrder={37}>
          <lineBasicMaterial color={SEAM_COLOR} transparent opacity={0.85} />
        </lineSegments>
      ))}
    </>
  );
}

// Lower base: only 2 carved diagonal panels (front, right). Seams on all 4 sides.
const LOWER_BASE_PANELS: readonly FacetPanel[] = [
  { quad: [0, 1, 5, 4], diagonal: "diag-02", shade0: "light", shade1: "dark" },
  { quad: [1, 2, 6, 5], diagonal: "diag-02", shade0: "dark", shade1: "light" },
];

const LOWER_BASE_SEAMS: readonly SeamLine[] = [
  { quad: [0, 1, 5, 4], diagonal: "diag-02" },
  { quad: [1, 2, 6, 5], diagonal: "diag-02" },
  { quad: [2, 3, 7, 6], diagonal: "diag-02" },
  { quad: [3, 0, 4, 7], diagonal: "diag-02" },
];

// Ledge stays clean — no panels, no seams.
const MIDDLE_LEDGE_PANELS: readonly FacetPanel[] = [];
const MIDDLE_LEDGE_SEAMS: readonly SeamLine[] = [];

// Upper tier: single subtle panel on the front, two seams hinting at the ramp toward the peak.
const UPPER_TIER_PANELS: readonly FacetPanel[] = [
  { quad: [0, 1, 5, 4], diagonal: "diag-13", shade0: "light", shade1: "dark" },
];

const UPPER_TIER_SEAMS: readonly SeamLine[] = [
  { quad: [0, 1, 5, 4], diagonal: "diag-13" },
  { quad: [1, 2, 6, 5], diagonal: "diag-02" },
];

// Peak: no extra panels. Only seam lines along the fin axis on left + right slopes.
const PEAK_PANELS: readonly FacetPanel[] = [];

const PEAK_SEAMS: readonly SeamLine[] = [
  { quad: [3, 0, 4, 5], diagonal: "diag-13" },
  { quad: [1, 2, 5, 4], diagonal: "diag-02" },
];

export function MountainFacetDetails({
  baseVerts,
  ledgeVerts,
  upperVerts,
  peakVerts,
  showPanels,
  showSeams,
}: {
  baseVerts: readonly Vertex[];
  ledgeVerts: readonly Vertex[];
  upperVerts: readonly Vertex[];
  peakVerts: readonly Vertex[];
  showPanels: boolean;
  showSeams: boolean;
}) {
  return (
    <group>
      {showPanels && (
        <>
          <PanelGroup
            vertices={baseVerts}
            panels={LOWER_BASE_PANELS}
            shadePair="base"
          />
          <PanelGroup
            vertices={ledgeVerts}
            panels={MIDDLE_LEDGE_PANELS}
            shadePair="ledge"
          />
          <PanelGroup
            vertices={upperVerts}
            panels={UPPER_TIER_PANELS}
            shadePair="upper"
          />
          <PanelGroup
            vertices={peakVerts}
            panels={PEAK_PANELS}
            shadePair="peak"
          />
        </>
      )}
      {showSeams && (
        <>
          <SeamGroup vertices={baseVerts} seams={LOWER_BASE_SEAMS} />
          <SeamGroup vertices={ledgeVerts} seams={MIDDLE_LEDGE_SEAMS} />
          <SeamGroup vertices={upperVerts} seams={UPPER_TIER_SEAMS} />
          <SeamGroup vertices={peakVerts} seams={PEAK_SEAMS} />
        </>
      )}
    </group>
  );
}
