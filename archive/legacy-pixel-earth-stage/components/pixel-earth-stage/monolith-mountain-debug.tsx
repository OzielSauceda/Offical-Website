"use client";

import { useCallback, useMemo, useState } from "react";

import { Html } from "@react-three/drei";
import { button, useControls } from "leva";
import * as THREE from "three";

import { MountainFacetDetails } from "./mountain-facet-details";

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

const STONE_STYLE: Record<StoneStyle, { fill: string; streak: string; highlight: string }> = {
  base: { fill: STONE.darkStone, streak: STONE.crack, highlight: STONE.mediumStone },
  ledge: { fill: STONE.ledgeHighlight, streak: STONE.lightStone, highlight: "#d6d5d1" },
  upper: { fill: STONE.mediumStone, streak: STONE.crack, highlight: STONE.lightStone },
  peak: { fill: STONE.lightStone, streak: STONE.darkStone, highlight: STONE.ledgeHighlight },
};

const MARKER_COLORS = {
  "Lower Base Wedge": "#4dd0e1",
  "Middle Horizontal Ledge": "#ffeb3b",
  "Upper Block Tier": "#66bb6a",
  "Top Triangular Peak": "#ba68c8",
} as const;

const LOWER_BASE_WEDGE_INITIAL = [
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

const MIDDLE_HORIZONTAL_LEDGE_INITIAL = [
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

const UPPER_BLOCK_TIER_INITIAL = [
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

const TOP_TRIANGULAR_PEAK_INITIAL = [
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

const COMPONENTS = {
  "Lower Base Wedge": LOWER_BASE_WEDGE_INITIAL,
  "Middle Horizontal Ledge": MIDDLE_HORIZONTAL_LEDGE_INITIAL,
  "Upper Block Tier": UPPER_BLOCK_TIER_INITIAL,
  "Top Triangular Peak": TOP_TRIANGULAR_PEAK_INITIAL,
} as const;

type ComponentLabel = keyof typeof COMPONENTS;

export function createPolyGeometry(
  vertices: readonly Vertex[],
  faces: readonly Face[],
) {
  // duplicate verts per-face so each face can carry its own planar UVs.
  // pure positional UV projection along the face normal — gives stone texture a believable tile direction per face.
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
    // pick the world axis least aligned with the normal as the up reference
    const ref =
      absN.y >= absN.x && absN.y >= absN.z
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3()
      .crossVectors(normal, ref)
      .normalize();
    const bitangent = new THREE.Vector3()
      .crossVectors(normal, tangent)
      .normalize()
      .negate(); // flip so v increases upward / outward consistently

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
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(uvs, 2),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

function createStoneTexture(style: StoneStyle) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create stone texture context");
  }

  const palette = STONE_STYLE[style];

  ctx.fillStyle = palette.fill;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // grit / noise pass
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
    // vertical streaks for vertical faces
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.32;
    for (let x = 6; x < canvas.width; x += 12 + Math.random() * 18) {
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(x * 0.32) * 5, -10);
      ctx.lineTo(x + Math.cos(x * 0.18) * 9, canvas.height + 10);
      ctx.stroke();
    }
    // sparse jagged cracks
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const steps = 3;
      let cx = x;
      let cy = y;
      for (let s = 0; s < steps; s++) {
        cx += (Math.random() - 0.5) * 30;
        cy += 30 + Math.random() * 60;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  } else if (style === "ledge") {
    // gentle horizontal banding — reads as a polished band but with grain
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.22;
    for (let y = 4; y < canvas.height; y += 16 + Math.random() * 10) {
      ctx.beginPath();
      ctx.moveTo(-10, y + Math.sin(y * 0.22) * 3);
      ctx.lineTo(canvas.width + 10, y + Math.cos(y * 0.15) * 4);
      ctx.stroke();
    }
    // brighter ledge highlights
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
    // diagonal streaks for sloped faces (upper tier + peak)
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

  // subtle bright nicks (highlights on sharp ledges, anywhere)
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
  // UVs are in world units → 0.4 means one tile every 2.5 world units
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

export function DebugEdges({ geometry }: { geometry: THREE.BufferGeometry }) {
  return (
    <lineSegments renderOrder={30}>
      <edgesGeometry args={[geometry]} />
      <lineBasicMaterial
        color={STONE.crack}
        transparent
        opacity={0.55}
      />
    </lineSegments>
  );
}

function buildVertexSchema(
  initial: readonly Vertex[],
  onFocus: (path: string | null) => void,
) {
  const schema: Record<string, unknown> = {};
  for (let i = 0; i < initial.length; i++) {
    const v = initial[i]!;
    schema[`v${i}`] = {
      value: [v[0], v[1], v[2]] as [number, number, number],
      step: 0.01,
      onEditStart: (_value: unknown, path: string) => onFocus(path),
      onEditEnd: () => onFocus(null),
    };
  }
  return schema;
}

function useVertexControls(
  label: ComponentLabel,
  initial: readonly Vertex[],
  onFocus: (path: string | null) => void,
): Vertex[] {
  const schema = useMemo(
    () => buildVertexSchema(initial, onFocus),
    [initial, onFocus],
  );
  const values = useControls(label, schema) as Record<
    string,
    [number, number, number]
  >;

  return initial.map((_, i) => {
    const v = values[`v${i}`];
    return v ? ([v[0], v[1], v[2]] as Vertex) : initial[i]!;
  });
}

function DebugBlock({
  vertices,
  faces,
  style,
}: {
  vertices: readonly Vertex[];
  faces: readonly Face[];
  style: StoneStyle;
}) {
  const flatKey = vertices.map((v) => `${v[0]},${v[1]},${v[2]}`).join("|");

  const geometry = useMemo(
    () => createPolyGeometry(vertices, faces),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flatKey, faces],
  );

  const material = useMemo(() => createStoneMaterial(style), [style]);

  return (
    <group>
      <mesh geometry={geometry} material={material} />
      <DebugEdges geometry={geometry} />
    </group>
  );
}

function VertexMarker({
  position,
  index,
  color,
  isFocus,
  size,
  showMarkers,
}: {
  position: Vertex;
  index: number;
  color: string;
  isFocus: boolean;
  size: number;
  showMarkers: boolean;
}) {
  if (!showMarkers && !isFocus) return null;

  const sphereRadius = isFocus ? size * 2.1 : size;
  const displayColor = isFocus ? "#ffffff" : color;

  return (
    <group position={[position[0], position[1], position[2]]}>
      <mesh renderOrder={50}>
        <sphereGeometry args={[sphereRadius, 16, 16]} />
        <meshBasicMaterial
          color={displayColor}
          depthTest={false}
          transparent
          opacity={isFocus ? 1 : 0.95}
          toneMapped={false}
        />
      </mesh>
      {isFocus && (
        <mesh renderOrder={49}>
          <ringGeometry args={[sphereRadius * 1.4, sphereRadius * 1.7, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            side={THREE.DoubleSide}
            depthTest={false}
            transparent
            opacity={0.6}
            toneMapped={false}
          />
        </mesh>
      )}
      <Html
        position={[0, sphereRadius + 0.04, 0]}
        center
        zIndexRange={[100, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            padding: "1px 5px",
            borderRadius: 3,
            fontSize: isFocus ? 12 : 10,
            fontFamily: "ui-monospace, Menlo, monospace",
            fontWeight: isFocus ? 700 : 500,
            color: "#0d0e14",
            background: displayColor,
            border: "1px solid rgba(0,0,0,0.4)",
            whiteSpace: "nowrap",
            transform: isFocus ? "scale(1.1)" : "scale(1)",
            transition: "transform 0.1s ease-out",
          }}
        >
          {`v${index}`}
        </div>
      </Html>
    </group>
  );
}

function VertexMarkers({
  vertices,
  label,
  color,
  focusKey,
  size,
  showMarkers,
}: {
  vertices: readonly Vertex[];
  label: ComponentLabel;
  color: string;
  focusKey: string | null;
  size: number;
  showMarkers: boolean;
}) {
  return (
    <>
      {vertices.map((v, i) => (
        <VertexMarker
          key={i}
          position={v}
          index={i}
          color={color}
          isFocus={focusKey === `${label}.v${i}`}
          size={size}
          showMarkers={showMarkers}
        />
      ))}
    </>
  );
}

function AxisLabel({
  position,
  letter,
  color,
}: {
  position: [number, number, number];
  letter: string;
  color: string;
}) {
  return (
    <Html
      position={position}
      center
      zIndexRange={[100, 0]}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div
        style={{
          padding: "2px 6px",
          borderRadius: 3,
          fontSize: 14,
          fontFamily: "ui-monospace, Menlo, monospace",
          fontWeight: 700,
          color: "#0d0e14",
          background: color,
          border: "1px solid rgba(0,0,0,0.5)",
        }}
      >
        {letter}
      </div>
    </Html>
  );
}

function AxisHelpers({ length }: { length: number }) {
  return (
    <group>
      <axesHelper args={[length]} />
      <AxisLabel position={[length + 0.18, 0, 0]} letter="X" color="#ff5566" />
      <AxisLabel position={[0, length + 0.18, 0]} letter="Y" color="#66ff77" />
      <AxisLabel position={[0, 0, length + 0.18]} letter="Z" color="#6699ff" />
    </group>
  );
}

function useHelpersControls(focusOptions: string[]) {
  return useControls("Helpers", {
    showFacets: { value: false, label: "Slope facet panels" },
    showSeams: { value: false, label: "Seam lines" },
    showMarkers: { value: false, label: "Vertex dots + labels" },
    showAxes: { value: false, label: "XYZ axes" },
    vertexSize: {
      value: 0.05,
      min: 0.02,
      max: 0.18,
      step: 0.005,
      label: "Vertex dot size",
    },
    spotlight: {
      value: "none",
      options: focusOptions,
      label: "Spotlight vertex",
    },
  });
}

function useLogButton() {
  useControls("Actions", {
    "Log Vertices": button((get) => {
      const dump: Record<string, Vertex[]> = {};
      for (const [label, initial] of Object.entries(COMPONENTS)) {
        const verts: Vertex[] = [];
        for (let i = 0; i < initial.length; i++) {
          const value = get(`${label}.v${i}`) as
            | [number, number, number]
            | undefined;
          verts.push(value ?? initial[i]!);
        }
        dump[label] = verts;
      }
      console.log("=== Monolith mountain vertices ===");
      console.log(JSON.stringify(dump, null, 2));
    }),
    "Log as TS Code": button((get) => {
      const sections: string[] = [];
      const exportNames: Record<string, string> = {
        "Lower Base Wedge": "LOWER_BASE_WEDGE_VERTICES",
        "Middle Horizontal Ledge": "MIDDLE_HORIZONTAL_LEDGE_VERTICES",
        "Upper Block Tier": "UPPER_BLOCK_TIER_VERTICES",
        "Top Triangular Peak": "TOP_TRIANGULAR_PEAK_VERTICES",
      };
      for (const [label, initial] of Object.entries(COMPONENTS)) {
        const lines: string[] = [];
        for (let i = 0; i < initial.length; i++) {
          const v = get(`${label}.v${i}`) as
            | [number, number, number]
            | undefined;
          const fallback = initial[i]!;
          const value = v ?? fallback;
          lines.push(
            `  [${value[0].toFixed(3)}, ${value[1].toFixed(3)}, ${value[2].toFixed(3)}],`,
          );
        }
        sections.push(
          `const ${exportNames[label]} = [\n${lines.join("\n")}\n] as const satisfies readonly Vertex[];`,
        );
      }
      console.log(sections.join("\n\n"));
    }),
  });
}

export function MonolithMountainDebug() {
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const onFocus = useCallback((path: string | null) => {
    setEditingPath(path);
  }, []);

  const baseVerts = useVertexControls(
    "Lower Base Wedge",
    LOWER_BASE_WEDGE_INITIAL,
    onFocus,
  );
  const ledgeVerts = useVertexControls(
    "Middle Horizontal Ledge",
    MIDDLE_HORIZONTAL_LEDGE_INITIAL,
    onFocus,
  );
  const upperVerts = useVertexControls(
    "Upper Block Tier",
    UPPER_BLOCK_TIER_INITIAL,
    onFocus,
  );
  const peakVerts = useVertexControls(
    "Top Triangular Peak",
    TOP_TRIANGULAR_PEAK_INITIAL,
    onFocus,
  );

  const focusOptions = useMemo(() => {
    const opts: string[] = ["none"];
    for (const [label, initial] of Object.entries(COMPONENTS)) {
      for (let i = 0; i < initial.length; i++) {
        opts.push(`${label}.v${i}`);
      }
    }
    return opts;
  }, []);

  const { showFacets, showSeams, showMarkers, showAxes, vertexSize, spotlight } =
    useHelpersControls(focusOptions);

  useLogButton();

  const activeFocus = editingPath ?? (spotlight === "none" ? null : spotlight);

  return (
    <group rotation-y={-0.28}>
      <DebugBlock
        vertices={baseVerts}
        faces={LOWER_BASE_WEDGE_FACES}
        style="base"
      />
      <DebugBlock
        vertices={ledgeVerts}
        faces={MIDDLE_HORIZONTAL_LEDGE_FACES}
        style="ledge"
      />
      <DebugBlock
        vertices={upperVerts}
        faces={UPPER_BLOCK_TIER_FACES}
        style="upper"
      />
      <DebugBlock
        vertices={peakVerts}
        faces={TOP_TRIANGULAR_PEAK_FACES}
        style="peak"
      />

      <VertexMarkers
        vertices={baseVerts}
        label="Lower Base Wedge"
        color={MARKER_COLORS["Lower Base Wedge"]}
        focusKey={activeFocus}
        size={vertexSize}
        showMarkers={showMarkers}
      />
      <VertexMarkers
        vertices={ledgeVerts}
        label="Middle Horizontal Ledge"
        color={MARKER_COLORS["Middle Horizontal Ledge"]}
        focusKey={activeFocus}
        size={vertexSize}
        showMarkers={showMarkers}
      />
      <VertexMarkers
        vertices={upperVerts}
        label="Upper Block Tier"
        color={MARKER_COLORS["Upper Block Tier"]}
        focusKey={activeFocus}
        size={vertexSize}
        showMarkers={showMarkers}
      />
      <VertexMarkers
        vertices={peakVerts}
        label="Top Triangular Peak"
        color={MARKER_COLORS["Top Triangular Peak"]}
        focusKey={activeFocus}
        size={vertexSize}
        showMarkers={showMarkers}
      />

      <MountainFacetDetails
        baseVerts={baseVerts}
        ledgeVerts={ledgeVerts}
        upperVerts={upperVerts}
        peakVerts={peakVerts}
        showPanels={showFacets}
        showSeams={showSeams}
      />

      {showAxes && <AxisHelpers length={1.6} />}
    </group>
  );
}
