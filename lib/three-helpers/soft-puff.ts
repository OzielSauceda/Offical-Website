import * as THREE from "three";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function buildSoftPuff(): THREE.CanvasTexture {
  const SIZE = 256;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  ctx.clearRect(0, 0, SIZE, SIZE);
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const r = SIZE / 2;
  const rand = rng(0x5a6e);
  for (let i = 0; i < 34; i++) {
    const px = cx + (rand() - 0.5) * SIZE * 0.42;
    const py = cy + (rand() - 0.5) * SIZE * 0.36;
    const pr = SIZE * (0.16 + rand() * 0.28);
    const alpha = 0.045 + rand() * 0.12;
    const grad = ctx.createRadialGradient(px, py, 0, px, py, pr);
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    grad.addColorStop(0.55, `rgba(255, 255, 255, ${alpha * 0.42})`);
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  }

  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 12; i++) {
    const px = cx + (rand() - 0.5) * SIZE * 0.46;
    const py = cy + (rand() - 0.5) * SIZE * 0.42;
    const pr = SIZE * (0.08 + rand() * 0.18);
    const alpha = 0.035 + rand() * 0.075;
    const grad = ctx.createRadialGradient(px, py, 0, px, py, pr);
    grad.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  }

  ctx.globalCompositeOperation = "destination-in";
  const mask = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  mask.addColorStop(0, "rgba(255, 255, 255, 1)");
  mask.addColorStop(0.62, "rgba(255, 255, 255, 0.78)");
  mask.addColorStop(0.86, "rgba(255, 255, 255, 0.22)");
  mask.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.globalCompositeOperation = "source-over";
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// shared singleton so re-mounts (HMR, strict mode) don't recreate or
// dispose a texture that is still referenced by another component.
let cached: THREE.CanvasTexture | null = null;

export function getSoftPuff(): THREE.CanvasTexture {
  if (!cached) cached = buildSoftPuff();
  return cached;
}
