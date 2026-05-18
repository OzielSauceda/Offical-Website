"use client";

import { useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const OUTER_R = 1.72;
const INNER_R = 0.72;
const BODY_DEPTH = 0.075;
const FRONT_Z = BODY_DEPTH / 2;
const BACK_Z = -BODY_DEPTH / 2;
const TEXTURE_EXTENT = OUTER_R * 1.2;
const TEXTURE_WORLD_SIZE = TEXTURE_EXTENT * 2;
const TEXTURE_SIZE = 1600;

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

function worldToCanvas([x, y]: StarPoint): [number, number] {
  const half = TEXTURE_SIZE / 2;
  return [
    half + (x / TEXTURE_EXTENT) * half,
    half - (y / TEXTURE_EXTENT) * half,
  ];
}

function addStarPath(
  ctx: CanvasRenderingContext2D,
  scale = 1,
  reverse = false,
) {
  const points = buildStarPoints(OUTER_R * scale, INNER_R * scale);
  const ordered = reverse ? [...points].reverse() : points;
  ordered.forEach((point, i) => {
    const [x, y] = worldToCanvas(point);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function strokeStar(
  ctx: CanvasRenderingContext2D,
  scale: number,
  width: number,
  color: string,
  blur = 0,
  shadow = color,
) {
  ctx.save();
  ctx.beginPath();
  addStarPath(ctx, scale);
  ctx.lineJoin = "miter";
  ctx.miterLimit = 7;
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.shadowBlur = blur;
  ctx.shadowColor = shadow;
  ctx.stroke();
  ctx.restore();
}

function fillStarBand(
  ctx: CanvasRenderingContext2D,
  outerScale: number,
  innerScale: number,
  color: string,
) {
  ctx.save();
  ctx.beginPath();
  addStarPath(ctx, outerScale);
  addStarPath(ctx, innerScale, true);
  ctx.fillStyle = color;
  ctx.fill("evenodd");
  ctx.restore();
}

function fillClippedStar(
  ctx: CanvasRenderingContext2D,
  draw: () => void,
) {
  ctx.save();
  ctx.beginPath();
  addStarPath(ctx);
  ctx.clip();
  draw();
  ctx.restore();
}

function drawWorldLine(
  ctx: CanvasRenderingContext2D,
  a: StarPoint,
  b: StarPoint,
) {
  const [ax, ay] = worldToCanvas(a);
  const [bx, by] = worldToCanvas(b);
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  point: StarPoint,
  radius: number,
  alpha: number,
) {
  const [x, y] = worldToCanvas(point);
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
  gradient.addColorStop(0.35, `rgba(206,244,255,${alpha * 0.55})`);
  gradient.addColorStop(1, "rgba(206,244,255,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawCircuitDot(
  ctx: CanvasRenderingContext2D,
  point: StarPoint,
  radius: number,
) {
  const [x, y] = worldToCanvas(point);
  ctx.save();
  ctx.shadowBlur = radius * 2.2;
  ctx.shadowColor = "rgba(110,214,255,0.75)";
  ctx.fillStyle = "rgba(125,211,244,0.72)";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = radius;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawReferenceStarTexture(
  ctx: CanvasRenderingContext2D,
  withEyes: boolean,
) {
  const half = TEXTURE_SIZE / 2;
  ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  ctx.imageSmoothingEnabled = true;
  ctx.lineCap = "round";
  ctx.lineJoin = "miter";
  ctx.miterLimit = 7;

  strokeStar(ctx, 1.006, 24, "rgba(196,226,246,0.11)", 26, "rgba(170,222,255,0.28)");
  strokeStar(ctx, 1, 9, "rgba(255,255,255,0.46)", 12, "rgba(245,252,255,0.62)");

  fillClippedStar(ctx, () => {
    const base = ctx.createRadialGradient(
      half,
      half + 24,
      0,
      half,
      half + 18,
      610,
    );
    base.addColorStop(0, "rgba(255,255,255,0.97)");
    base.addColorStop(0.24, "rgba(252,254,255,0.92)");
    base.addColorStop(0.56, "rgba(237,245,253,0.86)");
    base.addColorStop(0.84, "rgba(219,232,246,0.8)");
    base.addColorStop(1, "rgba(188,212,232,0.7)");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    const sheen = ctx.createLinearGradient(250, 180, 1250, 1420);
    sheen.addColorStop(0, "rgba(255,255,255,0.5)");
    sheen.addColorStop(0.42, "rgba(255,255,255,0.04)");
    sheen.addColorStop(1, "rgba(142,206,236,0.12)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    // subtle darker facet wedges between arms — adds crystal depth without busy detail
    ctx.save();
    ctx.fillStyle = "rgba(38,68,100,0.075)";
    const cx = half;
    const cy = half;
    const facetRadius = (OUTER_R * TEXTURE_SIZE) / (TEXTURE_EXTENT * 2);
    for (let arm = 0; arm < 5; arm++) {
      const a0 = -Math.PI / 2 + (arm * 2 * Math.PI) / 5;
      const a1 = a0 + (2 * Math.PI) / 5;
      const mid = (a0 + a1) / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(a0) * facetRadius,
        cy + Math.sin(a0) * facetRadius,
      );
      ctx.lineTo(
        cx + Math.cos(mid) * facetRadius * 0.7,
        cy + Math.sin(mid) * facetRadius * 0.7,
      );
      ctx.lineTo(
        cx + Math.cos(a1) * facetRadius,
        cy + Math.sin(a1) * facetRadius,
      );
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // brighter ridge highlights along each arm axis — bevel sheen
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.34)";
    ctx.lineWidth = 3.4;
    ctx.shadowBlur = 7;
    ctx.shadowColor = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    for (let arm = 0; arm < 5; arm++) {
      const a = -Math.PI / 2 + (arm * 2 * Math.PI) / 5;
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(a) * facetRadius * 0.95,
        cy + Math.sin(a) * facetRadius * 0.95,
      );
    }
    ctx.stroke();
    ctx.restore();

    strokeStar(ctx, 1, 90, "rgba(255,255,255,0.13)", 8, "rgba(255,255,255,0.22)");
    strokeStar(ctx, 0.986, 48, "rgba(225,243,255,0.13)", 5, "rgba(196,232,255,0.18)");
    strokeStar(ctx, 0.968, 18, "rgba(255,255,255,0.24)", 4, "rgba(255,255,255,0.2)");
  });

  fillStarBand(ctx, 0.962, 0.84, "rgba(235,244,252,0.13)");
  fillStarBand(ctx, 0.925, 0.855, "rgba(255,255,255,0.11)");
  strokeStar(ctx, 0.805, 2.4, "rgba(172,224,246,0.22)", 4, "rgba(145,220,255,0.24)");
  strokeStar(ctx, 0.885, 1.8, "rgba(255,255,255,0.28)", 3, "rgba(255,255,255,0.28)");

  fillClippedStar(ctx, () => {
    const points = buildStarPoints(OUTER_R, INNER_R);

    ctx.save();
    ctx.strokeStyle = "rgba(186,228,247,0.38)";
    ctx.shadowBlur = 7;
    ctx.shadowColor = "rgba(147,218,255,0.34)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let arm = 0; arm < 5; arm++) {
      const tip = points[arm * 2]!;
      drawWorldLine(
        ctx,
        [tip[0] * 0.83, tip[1] * 0.83],
        [tip[0] * 0.32, tip[1] * 0.32],
      );

      const angle = Math.PI / 2 + (arm * 2 * Math.PI) / 5;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const p0: StarPoint = [c * 0.78 - s * -0.035, s * 0.78 + c * -0.035];
      const p1: StarPoint = [c * 1.18 - s * -0.035, s * 1.18 + c * -0.035];
      const branch: StarPoint = [c * 1.28 - s * 0.08, s * 1.28 + c * 0.08];
      drawWorldLine(ctx, p0, p1);
      drawWorldLine(ctx, p1, branch);
    }
    ctx.stroke();
    ctx.restore();

    for (let arm = 0; arm < 5; arm++) {
      const angle = Math.PI / 2 + (arm * 2 * Math.PI) / 5;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      drawNode(ctx, [c * 0.76, s * 0.76], 9, 0.72);
      drawNode(ctx, [c * 1.17 - s * -0.035, s * 1.17 + c * -0.035], 7, 0.58);
    }

    const bloom = ctx.createRadialGradient(
      half,
      half + 12,
      0,
      half,
      half + 12,
      330,
    );
    bloom.addColorStop(0, "rgba(255,255,255,0.58)");
    bloom.addColorStop(0.18, "rgba(255,255,255,0.34)");
    bloom.addColorStop(0.55, "rgba(255,255,255,0.1)");
    bloom.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(half - 360, half - 340, 720, 720);

    const softLift = ctx.createRadialGradient(
      half,
      half - 120,
      0,
      half,
      half - 80,
      320,
    );
    softLift.addColorStop(0, "rgba(255,255,255,0.12)");
    softLift.addColorStop(0.45, "rgba(225,242,252,0.05)");
    softLift.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = softLift;
    ctx.fillRect(half - 360, half - 500, 720, 600);

    ctx.save();
    ctx.strokeStyle = "rgba(118,198,232,0.58)";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(150,226,255,0.62)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let arm = 0; arm < 5; arm++) {
      const angle = Math.PI / 2 + (arm * 2 * Math.PI) / 5;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const p0: StarPoint = [c * 0.86, s * 0.86];
      const p1: StarPoint = [c * 1.33, s * 1.33];
      const p2: StarPoint = [c * 1.18 - s * 0.09, s * 1.18 + c * 0.09];
      drawWorldLine(ctx, p0, p1);
      drawWorldLine(ctx, p1, p2);
    }
    ctx.stroke();
    ctx.restore();

    for (let arm = 0; arm < 5; arm++) {
      const angle = Math.PI / 2 + (arm * 2 * Math.PI) / 5;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      drawNode(ctx, [c * 0.98, s * 0.98], 12, 0.84);
      drawNode(ctx, [c * 1.28, s * 1.28], 8, 0.72);
    }
  });

  strokeStar(ctx, 0.68, 2, "rgba(138,204,235,0.26)", 4, "rgba(145,220,255,0.26)");
  strokeStar(ctx, 0.76, 1.5, "rgba(255,255,255,0.22)", 3, "rgba(255,255,255,0.22)");

  for (let arm = 0; arm < 5; arm++) {
    const angle = Math.PI / 2 + (arm * 2 * Math.PI) / 5;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    drawCircuitDot(ctx, [c * 0.9, s * 0.9], 5.8);
    drawCircuitDot(ctx, [c * 1.18, s * 1.18], 4.6);
  }

  const vertices = buildStarPoints(OUTER_R * 0.97, INNER_R * 0.97);
  vertices.forEach((point, i) => {
    drawNode(ctx, point, i % 2 === 0 ? 22 : 14, i % 2 === 0 ? 0.48 : 0.34);
  });

  if (withEyes) {
    fillClippedStar(ctx, () => {
      drawEyesIntoStar(ctx);
    });
  }

  strokeStar(ctx, 1, 3.2, "rgba(255,255,255,0.9)", 9, "rgba(255,255,255,0.5)");
  strokeStar(ctx, 0.997, 1.2, "rgba(185,228,250,0.48)", 3, "rgba(118,211,255,0.42)");
}

function createStarTexture(withEyes: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create star texture canvas");

  drawReferenceStarTexture(ctx, withEyes);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

type EyeConfig = {
  center: StarPoint;
  rx: number;
  ry: number;
  tilt: number;
  mirror: boolean;
  innerOffset: [number, number];
  accentOffsets: Array<[number, number, string, string]>;
};

// traced polygon-like Bezier contour — wider than tall, less pointy
// than a capsule. flatter inner edge (negative x side), fuller outer
// edge (positive x side). outerSign mirrors x for the opposite eye.
function addEyeJewelPath(
  ctx: CanvasRenderingContext2D,
  rxPx: number,
  ryPx: number,
  scale = 1,
  outerSign: 1 | -1 = 1,
) {
  const m = outerSign;
  const rx = rxPx * scale;
  const ry = ryPx * scale;

  ctx.beginPath();
  ctx.moveTo(m * -rx * 0.05, -ry * 1.02);

  ctx.bezierCurveTo(
    m * 0.44 * rx,
    -ry * 1.07,
    m * 0.91 * rx,
    -ry * 0.7,
    m * 0.96 * rx,
    -ry * 0.08,
  );

  ctx.bezierCurveTo(
    m * 1.0 * rx,
    ry * 0.53,
    m * 0.57 * rx,
    ry * 1.04,
    m * 0.04 * rx,
    ry * 1.04,
  );

  ctx.bezierCurveTo(
    m * -0.54 * rx,
    ry * 1.04,
    m * -0.86 * rx,
    ry * 0.58,
    m * -0.87 * rx,
    ry * 0.02,
  );

  ctx.bezierCurveTo(
    m * -0.87 * rx,
    -ry * 0.58,
    m * -0.5 * rx,
    -ry * 0.99,
    m * -0.05 * rx,
    -ry * 1.02,
  );

  ctx.closePath();
}

function drawEye(ctx: CanvasRenderingContext2D, cfg: EyeConfig) {
  const [cx, cy] = worldToCanvas(cfg.center);
  const half = TEXTURE_SIZE / 2;
  const px = (v: number) => (v / TEXTURE_EXTENT) * half;
  const rxPx = px(cfg.rx);
  const ryPx = px(cfg.ry);
  const outerSign: 1 | -1 = cfg.mirror ? -1 : 1;
  const innerX = cfg.innerOffset[0] * rxPx;
  const innerY = cfg.innerOffset[1] * ryPx;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(cfg.tilt);

  // 1. outer peach halo — larger and softer
  ctx.save();
  ctx.shadowBlur = 62;
  ctx.shadowColor = "rgba(255,184,70,1)";
  const aura = ctx.createRadialGradient(0, -ryPx * 0.02, 0, 0, 0, rxPx * 2.1);
  aura.addColorStop(0, "rgba(255,240,188,0.34)");
  aura.addColorStop(0.32, "rgba(255,184,80,0.28)");
  aura.addColorStop(0.62, "rgba(255,122,76,0.12)");
  aura.addColorStop(1, "rgba(255,170,100,0)");
  ctx.fillStyle = aura;
  addEyeJewelPath(ctx, rxPx, ryPx, 1.5, outerSign);
  ctx.fill();
  ctx.restore();

  // 2. outer lens fill — warmer amber glass across the full eye
  ctx.save();
  addEyeJewelPath(ctx, rxPx, ryPx, 1, outerSign);
  ctx.clip();
  const lens = ctx.createRadialGradient(
    -rxPx * 0.16,
    -ryPx * 0.24,
    0,
    0,
    0,
    rxPx * 1.34,
  );
  lens.addColorStop(0, "rgba(255,248,214,0.38)");
  lens.addColorStop(0.26, "rgba(255,198,102,0.36)");
  lens.addColorStop(0.56, "rgba(128,84,62,0.18)");
  lens.addColorStop(1, "rgba(26,24,38,0.08)");
  ctx.fillStyle = lens;
  ctx.fillRect(-rxPx * 2, -ryPx * 2, rxPx * 4, ryPx * 4);
  ctx.restore();

  // 3. dark interior ellipse — smaller, smoky amber-brown rather than black
  ctx.save();
  const darkGrad = ctx.createRadialGradient(
    innerX - rxPx * 0.12,
    innerY - ryPx * 0.2,
    0,
    innerX,
    innerY,
    rxPx * 0.84,
  );
  darkGrad.addColorStop(0, "rgba(92,82,90,0.82)");
  darkGrad.addColorStop(0.32, "rgba(36,33,48,0.92)");
  darkGrad.addColorStop(0.72, "rgba(12,13,25,0.95)");
  darkGrad.addColorStop(1, "rgba(6,8,18,0.74)");
  ctx.fillStyle = darkGrad;
  ctx.beginPath();
  ctx.ellipse(innerX, innerY, rxPx * 0.56, ryPx * 0.64, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4. primary outer rim — softer, less sticker-like
  ctx.save();
  ctx.shadowBlur = 42;
  ctx.shadowColor = "rgba(255,166,56,1)";
  ctx.strokeStyle = "rgba(255,174,66,0.96)";
  ctx.lineWidth = 5.4;
  addEyeJewelPath(ctx, rxPx, ryPx, 1, outerSign);
  ctx.stroke();
  ctx.shadowBlur = 20;
  ctx.strokeStyle = "rgba(255,236,164,0.9)";
  ctx.lineWidth = 1.7;
  addEyeJewelPath(ctx, rxPx, ryPx, 0.97, outerSign);
  ctx.stroke();
  ctx.restore();

  // 5. very subtle cream inner edge
  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = "rgba(255,236,170,0.95)";
  ctx.strokeStyle = "rgba(255,244,198,0.52)";
  ctx.lineWidth = 0.8;
  addEyeJewelPath(ctx, rxPx, ryPx, 0.83, outerSign);
  ctx.stroke();
  ctx.restore();

  // 6. inner golden oval ring — smaller, less sharp
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = "rgba(255,220,120,1)";
  ctx.strokeStyle = "rgba(255,236,150,0.92)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(innerX, innerY, rxPx * 0.34, ryPx * 0.38, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 7. center cream dot
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = "rgba(255,235,155,1)";
  ctx.fillStyle = "rgba(255,250,212,0.95)";
  ctx.beginPath();
  ctx.arc(innerX, innerY, ryPx * 0.105, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 8. top-left catchlight — slightly higher and left, still small
  ctx.save();
  ctx.shadowBlur = 14;
  ctx.shadowColor = "rgba(255,255,232,0.95)";
  ctx.fillStyle = "rgba(255,255,236,0.92)";
  ctx.beginPath();
  ctx.ellipse(
    innerX - rxPx * 0.24,
    innerY - ryPx * 0.48,
    rxPx * 0.13,
    ryPx * 0.085,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.fillStyle = "rgba(255,246,204,0.74)";
  ctx.beginPath();
  ctx.ellipse(
    innerX + rxPx * 0.26,
    innerY + ryPx * 0.34,
    rxPx * 0.09,
    ryPx * 0.06,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();

  // 9. accent specks — smaller, sit on top of the ring/dot
  const dotR = ryPx * 0.04;
  cfg.accentOffsets.forEach(([dxFrac, dyFrac, fill, glowC]) => {
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = glowC;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(dxFrac * rxPx, dyFrac * ryPx, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 10. final glass veil — slightly warmer so the eye reads like glass
  ctx.save();
  addEyeJewelPath(ctx, rxPx, ryPx, 1, outerSign);
  ctx.clip();
  const veil = ctx.createLinearGradient(-rxPx, -ryPx, rxPx, ryPx);
  veil.addColorStop(0, "rgba(255,255,255,0)");
  veil.addColorStop(0.22, "rgba(255,250,218,0.24)");
  veil.addColorStop(0.44, "rgba(255,194,116,0.1)");
  veil.addColorStop(0.72, "rgba(190,240,255,0.05)");
  veil.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = veil;
  ctx.fillRect(-rxPx * 2, -ryPx * 2, rxPx * 4, ryPx * 4);
  ctx.restore();

  ctx.restore();
}

function drawEyesIntoStar(ctx: CanvasRenderingContext2D) {
  const EYE_Y = 0.065;
  const EYE_X = 0.35;
  const EYE_RX = 0.225;
  const EYE_RY = 0.318;

  const CYAN_FILL = "rgba(205,246,255,0.82)";
  const CYAN_GLOW = "rgba(105,225,255,0.85)";
  const PINK_FILL = "rgba(255,145,205,0.68)";
  const PINK_GLOW = "rgba(255,90,180,0.75)";
  const CREAM_FILL = "rgba(255,246,205,0.86)";
  const CREAM_GLOW = "rgba(255,226,135,0.9)";

  const accentOffsets: Array<[number, number, string, string]> = [
    [-0.34, -0.48, CYAN_FILL, CYAN_GLOW],
    [0.44, 0.42, PINK_FILL, PINK_GLOW],
    [0.04, -0.62, CREAM_FILL, CREAM_GLOW],
    [-0.38, 0.5, PINK_FILL, PINK_GLOW],
  ];

  const leftEye: EyeConfig = {
    center: [-EYE_X, EYE_Y],
    rx: EYE_RX,
    ry: EYE_RY,
    tilt: 0.1,
    mirror: true,
    innerOffset: [0.0, -0.1],
    accentOffsets,
  };

  const rightEye: EyeConfig = {
    center: [EYE_X, EYE_Y],
    rx: EYE_RX,
    ry: EYE_RY,
    tilt: -0.1,
    mirror: false,
    innerOffset: [0.0, -0.1],
    accentOffsets,
  };

  drawEye(ctx, leftEye);
  drawEye(ctx, rightEye);
}

export function ReferenceStarShell() {
  const glowMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const frontTexture = useMemo(() => createStarTexture(true), []);
  const backTexture = useMemo(() => createStarTexture(false), []);
  const faceShape = useMemo(() => buildStarShape(OUTER_R, INNER_R), []);
  const rimLine = useMemo(
    () => buildStarLoopSegments(OUTER_R, INNER_R, 0),
    [],
  );

  const extrudeOptions = useMemo(
    () => ({
      depth: BODY_DEPTH,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.028,
      bevelThickness: 0.016,
      curveSegments: 1,
      steps: 1,
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (!glowMatRef.current) return;
    const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 1.1);
    glowMatRef.current.opacity = 0.09 + pulse * 0.04;
  });

  return (
    <group>
      <mesh position={[0, 0, -BODY_DEPTH / 2]} renderOrder={1}>
        <extrudeGeometry args={[faceShape, extrudeOptions]} />
        <meshBasicMaterial
          attach="material-0"
          color="#f7fbff"
          transparent
          opacity={0.12}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
          fog={false}
        />
        <meshBasicMaterial
          attach="material-1"
          color="#eaf8ff"
          transparent
          opacity={0.44}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      <mesh
        position={[0, 0, FRONT_Z + 0.055]}
        scale={[1.015, 1.015, 1]}
        renderOrder={2}
      >
        <planeGeometry args={[TEXTURE_WORLD_SIZE, TEXTURE_WORLD_SIZE]} />
        <meshBasicMaterial
          ref={glowMatRef}
          map={backTexture}
          transparent
          opacity={0.09}
          blending={THREE.AdditiveBlending}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      <mesh position={[0, 0, FRONT_Z + 0.06]} renderOrder={3}>
        <planeGeometry args={[TEXTURE_WORLD_SIZE, TEXTURE_WORLD_SIZE]} />
        <meshBasicMaterial
          map={frontTexture}
          transparent
          opacity={0.97}
          depthTest={false}
          depthWrite={false}
          side={THREE.FrontSide}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      <mesh position={[0, 0, BACK_Z - 0.06]} rotation-y={Math.PI} renderOrder={3}>
        <planeGeometry args={[TEXTURE_WORLD_SIZE, TEXTURE_WORLD_SIZE]} />
        <meshBasicMaterial
          map={backTexture}
          transparent
          opacity={0.78}
          depthTest={false}
          depthWrite={false}
          side={THREE.FrontSide}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      <lineSegments position={[0, 0, FRONT_Z + 0.008]} renderOrder={4}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={rimLine}
            count={rimLine.length / 3}
            itemSize={3}
            args={[rimLine, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </lineSegments>
    </group>
  );
}
