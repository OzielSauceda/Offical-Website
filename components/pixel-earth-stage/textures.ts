import * as THREE from "three";

import { SECTIONS } from "@/lib/sections";

// tiny deterministic prng so the texture is stable across reloads
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
// pale cream / gray tarp surface for the projects pyramid stage. vertical
// streaks (weathering / water marks) + faint horizontal panel seams + pixel
// dirt grain. low-saturation throughout so the stage reads as constructed
// rather than natural. wraps horizontally so the four faces share the
// canvas seamlessly.
export function createTarpTexture(): THREE.CanvasTexture {
  const W = 256;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  // base — pale cream with a hint of warm gray, slightly darker toward the bottom
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0.0, "#dccfb4");
  grad.addColorStop(0.55, "#c8bba0");
  grad.addColorStop(1.0, "#9a8e75");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const rand = rng(0x7a72);

  // vertical weathering streaks — long darker columns that vary in width and opacity
  for (let i = 0; i < 38; i++) {
    const x = Math.floor(rand() * W);
    const w = 1 + Math.floor(rand() * 3);
    const alpha = 0.04 + rand() * 0.20;
    // streaks usually start near the top and run down
    const startY = Math.floor(rand() * H * 0.20);
    const endY = startY + Math.floor(H * (0.55 + rand() * 0.45));
    ctx.fillStyle = `rgba(48, 40, 28, ${alpha})`;
    ctx.fillRect(x, startY, w, Math.min(endY - startY, H - startY));
    // occasional brighter highlight streak right next to it
    if (rand() > 0.6) {
      ctx.fillStyle = `rgba(248, 240, 222, ${0.05 + rand() * 0.07})`;
      ctx.fillRect(x + w, startY, 1, Math.min(endY - startY, H - startY));
    }
  }

  // horizontal panel seams — thin darker lines at regular-ish intervals so
  // the surface reads as a sequence of tarp panels stitched together
  const SEAM_EVERY = 64;
  for (let y = SEAM_EVERY; y < H; y += SEAM_EVERY) {
    const jitter = Math.floor((rand() - 0.5) * 4);
    const py = y + jitter;
    ctx.fillStyle = "rgba(40, 32, 22, 0.35)";
    ctx.fillRect(0, py, W, 1);
    ctx.fillStyle = "rgba(240, 230, 210, 0.10)";
    ctx.fillRect(0, py - 1, W, 1);
    // a few rivet-like punctuation dots along the seam
    for (let x = 8; x < W; x += 22) {
      const jx = Math.floor((rand() - 0.5) * 4);
      ctx.fillStyle = "rgba(30, 24, 16, 0.55)";
      ctx.fillRect(x + jx, py - 1, 2, 2);
    }
  }

  // pixel dirt grain — tiny darker/brighter pixels for pixel-art noise
  for (let i = 0; i < W * H * 0.05; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    const dark = rand() > 0.5;
    ctx.fillStyle = dark
      ? `rgba(40, 32, 22, ${0.05 + rand() * 0.18})`
      : `rgba(245, 235, 215, ${0.04 + rand() * 0.10})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // wider darker smudge bands near the bottom (weathered / stage-floor grime)
  for (let i = 0; i < 8; i++) {
    const cy = Math.floor(H * (0.65 + rand() * 0.30));
    const cw = 30 + Math.floor(rand() * 80);
    const cx = Math.floor(rand() * W);
    ctx.fillStyle = `rgba(30, 24, 16, ${0.06 + rand() * 0.10})`;
    ctx.fillRect(cx, cy, cw, 2 + Math.floor(rand() * 3));
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// dark stage flooring — pale-board panels with seams. used for the apron
// disc around the pyramid base.
export function createStageFloorTexture(): THREE.CanvasTexture {
  const W = 256;
  const H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  ctx.fillStyle = "#3a342c";
  ctx.fillRect(0, 0, W, H);

  const rand = rng(0xf100);

  // radial-ish panel pattern — concentric darker rings to imply boards
  for (let i = 0; i < 6; i++) {
    const cy = Math.floor((i + 1) * (H / 7));
    ctx.fillStyle = "rgba(24, 20, 16, 0.55)";
    ctx.fillRect(0, cy, W, 1);
  }
  // light panel highlights
  for (let i = 0; i < 6; i++) {
    const cy = Math.floor((i + 1) * (H / 7)) - 1;
    ctx.fillStyle = "rgba(110, 100, 86, 0.18)";
    ctx.fillRect(0, cy, W, 1);
  }

  // pixel grain
  for (let i = 0; i < W * H * 0.04; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    ctx.fillStyle =
      rand() > 0.5
        ? `rgba(18, 14, 10, ${0.06 + rand() * 0.16})`
        : `rgba(90, 80, 66, ${0.05 + rand() * 0.10})`;
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// soft additive smoke — pale lobed shapes used to wash the stage base in fog
export function createSmokeTexture(): THREE.CanvasTexture {
  const SIZE = 256;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  ctx.clearRect(0, 0, SIZE, SIZE);
  const rand = rng(0x5705);
  for (let i = 0; i < 30; i++) {
    const cx = rand() * SIZE;
    const cy = SIZE * 0.4 + rand() * SIZE * 0.5;
    const r = 30 + rand() * 90;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const a = 0.05 + rand() * 0.12;
    grad.addColorStop(0, `rgba(245, 240, 230, ${a})`);
    grad.addColorStop(0.6, `rgba(200, 195, 185, ${a * 0.4})`);
    grad.addColorStop(1, `rgba(0, 0, 0, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// character: 4 frames of 32x32, drawn into a 128x32 sheet
const HELMET = "#ffd84a";
const HELMET_DARK = "#c79c1f";
const SKIN = "#ffc9a3";
const SHIRT = "#d94560";
const SHIRT_DARK = "#a02b46";
const PANTS = "#2a2547";
const SHOES = "#1a1820";
const EYE = "#1a1820";

type ArmPose = "side" | "out" | "up" | "down";
type LegPose = "stand" | "kickL" | "kickR";

function drawFrame(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  armL: ArmPose,
  armR: ArmPose,
  legs: LegPose,
) {
  const cx = ox + 16;
  const top = oy + 6;
  const px = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(cx + x, top + y, 1, 1);
  };
  // helmet top
  for (let y = 0; y < 4; y++) for (let x = -2; x <= 1; x++) px(x, y, HELMET);
  // helmet shading on right side
  for (let y = 0; y < 4; y++) px(1, y, HELMET_DARK);
  // brim
  for (let x = -3; x <= 2; x++) px(x, 4, HELMET_DARK);
  // face
  for (let y = 5; y <= 7; y++) for (let x = -2; x <= 1; x++) px(x, y, SKIN);
  // eyes
  px(-1, 6, EYE);
  px(1, 6, EYE);
  // neck
  px(-1, 8, SKIN);
  px(0, 8, SKIN);
  // shirt torso
  for (let y = 8; y <= 14; y++) for (let x = -3; x <= 2; x++) px(x, y, SHIRT);
  // shirt shade on right
  for (let y = 9; y <= 14; y++) px(2, y, SHIRT_DARK);

  // arms
  const drawArm = (side: -1 | 1, pose: ArmPose) => {
    // shoulder anchor at (side*3, 9)
    const ax = side * 3;
    const ay = 9;
    if (pose === "side") {
      // arm hangs along the body
      for (let y = 0; y < 5; y++) px(ax, ay + y, SHIRT);
      px(ax, ay + 4, SHIRT_DARK);
      px(ax + side, ay + 5, SKIN); // hand
    } else if (pose === "out") {
      // arm extends horizontally
      for (let x = 0; x < 3; x++) px(ax + side * (x + 1), ay, SHIRT);
      px(ax + side * 4, ay, SKIN); // hand
    } else if (pose === "up") {
      // arm reaches up
      for (let y = 0; y < 4; y++) px(ax + side, ay - y - 1, SHIRT);
      px(ax + side, ay - 5, SKIN); // hand
      px(ax + side * 2, ay - 5, SKIN); // hand wider for wave
    } else if (pose === "down") {
      // arm tight to body
      for (let y = 0; y < 5; y++) px(ax, ay + y, SHIRT);
      px(ax, ay + 5, SKIN);
    }
  };
  drawArm(-1, armL);
  drawArm(1, armR);

  // legs
  // base: two legs side by side from y=15 to y=20, pants
  // shoes at y=21
  const standLeg = (side: -1 | 1) => {
    const lx = side * 2;
    for (let y = 15; y <= 20; y++) {
      px(lx, y, PANTS);
      px(lx + side, y, PANTS);
    }
    px(lx, 21, SHOES);
    px(lx + side, 21, SHOES);
  };
  const kickedLeg = (side: -1 | 1) => {
    const lx = side * 2;
    // bent: knee out
    for (let y = 15; y <= 17; y++) {
      px(lx, y, PANTS);
      px(lx + side, y, PANTS);
    }
    // shin sideways
    for (let x = 1; x <= 3; x++) {
      px(lx + side * x, 18, PANTS);
    }
    px(lx + side * 4, 18, SHOES);
  };
  if (legs === "stand") {
    standLeg(-1);
    standLeg(1);
  } else if (legs === "kickL") {
    kickedLeg(-1);
    standLeg(1);
  } else if (legs === "kickR") {
    standLeg(-1);
    kickedLeg(1);
  }
}

// Soft irregular puff used for stage smoke. Layered lobes and carved pockets
// stop repeated sprites from reading as perfect glowing circles.
export function createSoftPuff(): THREE.CanvasTexture {
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

// soft radial gradient used as a "spotlight pool" painted on the globe surface
export function createSpotlightGlow(): THREE.CanvasTexture {
  const SIZE = 128;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const r = SIZE / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0.0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.35, "rgba(255, 255, 255, 0.55)");
  grad.addColorStop(0.7, "rgba(255, 255, 255, 0.12)");
  grad.addColorStop(1.0, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// abstract arena-screen surface — soft horizontal bands and pooled warm lights,
// repeats cleanly around the cylinder so any viewing angle sees content.
// no photo or silhouette imagery — pure procedural light.
export function createScreenTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  // bright warm cream/ivory display surface — reads as a lit arena
  // jumbotron face rather than a dark navy banner. vertical gradient
  // adds a touch of brightness in the middle and a slightly cooler
  // taper at the very edges so the screen has some volume.
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#e8dfc8");
  grad.addColorStop(0.18, "#f3ead4");
  grad.addColorStop(0.5, "#faf2dc");
  grad.addColorStop(0.82, "#ece2c6");
  grad.addColorStop(1, "#cbbf9d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // pooled warm light around the circumference — six soft bright spots
  // that feel like backlight on the screen face. mixing warm + cool
  // for slight chromatic variation.
  const POOLS = 6;
  for (let i = 0; i < POOLS; i++) {
    const cx = (W / POOLS) * (i + 0.5);
    const cy = H * 0.5;
    const rad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 140);
    const warm =
      i % 2 === 0 ? "rgba(255, 232, 188, 0.34)" : "rgba(248, 240, 220, 0.30)";
    rad.addColorStop(0, warm);
    rad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(cx - 160, cy - 160, 320, 320);
  }

  // faint warm scanlines for screen texture
  ctx.fillStyle = "rgba(120, 92, 48, 0.05)";
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 1);
  }

  // bright top trim — emissive edge where the screen frame catches the
  // overhead light most strongly.
  ctx.fillStyle = "rgba(255, 245, 220, 0.95)";
  ctx.fillRect(0, 0, W, 3);

  // darker lower band — structural underside / skirt baked into the
  // bottom ~16% of the texture so the screen reads as a bright face on
  // a darker support, like the reference jumbotrons.
  const bandTop = Math.floor(H * 0.84);
  const bandGrad = ctx.createLinearGradient(0, bandTop, 0, H);
  bandGrad.addColorStop(0, "rgba(28, 22, 16, 0)");
  bandGrad.addColorStop(0.4, "rgba(28, 22, 16, 0.72)");
  bandGrad.addColorStop(1, "rgba(14, 10, 6, 0.96)");
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, bandTop, W, H - bandTop);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// full-face cassette texture for the About section reveal. matches the
// classic late-2000s major-label cassette layout: off-white plastic shell,
// elegant letter-spaced top title with a small red heart, vertical SIDE
// marker, two gear-toothed reel cutouts with brown wound tape + spoked
// hubs, rectangular tape window with 100/50/0 counter and tick marks, tiny
// legal-style body copy, multicolor printer-test stripe near the bottom,
// three phillips screws, and bottom access slots.
export function createCassetteFaceTexture(
  seed: number,
  trackNumber: string,
  heading: string,
  body: string,
  meta: string,
  ownerName: string,
): THREE.CanvasTexture {
  // 1.56:1 aspect to match a real cassette
  const W = 1024;
  const H = 656;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  const rand = rng(0x9b00 + seed * 23);
  const upperHeading = heading.toUpperCase();
  const upperOwner = ownerName.toUpperCase();
  const letterSpacingSetter = ctx as CanvasRenderingContext2D & {
    letterSpacing?: string;
  };

  // ── off-white shell with subtle vertical gradient + grain ──
  const shellGrad = ctx.createLinearGradient(0, 0, 0, H);
  shellGrad.addColorStop(0, "#f6f1e7");
  shellGrad.addColorStop(0.5, "#ece4d4");
  shellGrad.addColorStop(1, "#d6cdb9");
  ctx.fillStyle = shellGrad;
  ctx.fillRect(0, 0, W, H);
  // top edge highlight — single bright pixel row to suggest overhead light
  ctx.fillStyle = "rgba(255, 248, 232, 0.55)";
  ctx.fillRect(0, 0, W, 2);

  // very subtle plastic grain
  for (let i = 0; i < W * H * 0.014; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    ctx.fillStyle = `rgba(80, 70, 55, ${0.02 + rand() * 0.06})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // ── top text: owner name (large all-caps line at the top of the face) ──
  ctx.fillStyle = "#1a1614";
  ctx.font = `400 36px "Times New Roman", "Garamond", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  letterSpacingSetter.letterSpacing = "14px";
  ctx.fillText(upperOwner, W / 2 + 7, 64);
  letterSpacingSetter.letterSpacing = "0px";

  // ── small red heart icon ──
  // (where the 808 heart sits on the reference, but smaller)
  const heartCX = W / 2;
  const heartCY = 116;
  const heartSize = 14;
  ctx.fillStyle = "#d61f29";
  ctx.beginPath();
  ctx.moveTo(heartCX, heartCY + heartSize * 0.95);
  ctx.bezierCurveTo(
    heartCX - heartSize * 1.55,
    heartCY + heartSize * 0.25,
    heartCX - heartSize * 1.1,
    heartCY - heartSize * 0.95,
    heartCX,
    heartCY - heartSize * 0.2,
  );
  ctx.bezierCurveTo(
    heartCX + heartSize * 1.1,
    heartCY - heartSize * 0.95,
    heartCX + heartSize * 1.55,
    heartCY + heartSize * 0.25,
    heartCX,
    heartCY + heartSize * 0.95,
  );
  ctx.closePath();
  ctx.fill();

  // ── subtitle: slab keyword (large keyword line under the heart icon) ──
  ctx.fillStyle = "#1a1614";
  ctx.font = `400 38px "Times New Roman", "Garamond", serif`;
  letterSpacingSetter.letterSpacing = "10px";
  ctx.fillText(upperHeading, W / 2 + 5, 176);
  letterSpacingSetter.letterSpacing = "0px";

  // ── vertical "SIDE A/B/C" marker on the left, between top text and reels ──
  ctx.save();
  ctx.translate(58, 330);
  ctx.fillStyle = "#1a1614";
  ctx.font = `500 19px "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  letterSpacingSetter.letterSpacing = "0px";
  ctx.fillText("SIDE", 0, -16);
  ctx.fillText(trackNumber, 0, 12);
  ctx.restore();

  // ── reel + tape window area ──
  const reelY = 320;
  const reelR = 78;
  const leftCX = W * 0.28;
  const rightCX = W * 0.72;

  // rectangular tape window in the center — recessed dark rectangle
  // showing the brown tape passing across the playback head area
  const winX = W * 0.385;
  const winY = reelY - 38;
  const winW = W * 0.23;
  const winH = 78;
  // outer recess
  ctx.fillStyle = "#1f1814";
  ctx.fillRect(winX - 4, winY - 4, winW + 8, winH + 8);
  // inner dark slot
  ctx.fillStyle = "#0a0706";
  ctx.fillRect(winX, winY, winW, winH);
  // brown tape strip horizontally across the window
  ctx.fillStyle = "#5a3a26";
  ctx.fillRect(winX + 6, reelY - 7, winW - 12, 14);
  // tape highlight glint
  ctx.fillStyle = "rgba(200, 150, 110, 0.45)";
  ctx.fillRect(winX + 6, reelY - 7, winW - 12, 2);

  // counter ticks below the tape window
  const counterY = winY + winH + 4;
  ctx.strokeStyle = "#1a1410";
  ctx.lineWidth = 1.4;
  for (let i = 0; i <= 10; i++) {
    const tx = winX + (winW / 10) * i;
    const tickH = i % 5 === 0 ? 7 : 4;
    ctx.beginPath();
    ctx.moveTo(tx, counterY);
    ctx.lineTo(tx, counterY + tickH);
    ctx.stroke();
  }
  // "100  50  0" numbers under the ticks
  ctx.fillStyle = "#1a1410";
  ctx.font = `600 12px "Arial Narrow", "Helvetica", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("100", winX + 4, counterY + 12);
  ctx.fillText("50", winX + winW / 2, counterY + 12);
  ctx.fillText("0", winX + winW - 4, counterY + 12);

  // ── gear-toothed reel cutouts with spoked hubs ──
  const drawReel = (
    c: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    holeR: number,
  ) => {
    // outer dark recess (slight bevel)
    c.fillStyle = "#1f1814";
    c.beginPath();
    c.arc(cx, cy, holeR + 5, 0, Math.PI * 2);
    c.fill();
    // dark hole
    c.fillStyle = "#0a0706";
    c.beginPath();
    c.arc(cx, cy, holeR, 0, Math.PI * 2);
    c.fill();

    // gear teeth on the hole's inner edge — small triangles of plastic
    // color pointing inward (the cassette body has scalloped teeth around
    // each reel cutout that mesh with the deck's drive)
    c.fillStyle = "#e6dec9";
    const teethCount = 18;
    const toothLen = holeR * 0.13;
    const toothW = 0.16;
    for (let i = 0; i < teethCount; i++) {
      const a = (i / teethCount) * Math.PI * 2;
      c.beginPath();
      c.moveTo(
        cx + Math.cos(a - toothW / 2) * holeR,
        cy + Math.sin(a - toothW / 2) * holeR,
      );
      c.lineTo(
        cx + Math.cos(a + toothW / 2) * holeR,
        cy + Math.sin(a + toothW / 2) * holeR,
      );
      c.lineTo(
        cx + Math.cos(a) * (holeR - toothLen),
        cy + Math.sin(a) * (holeR - toothLen),
      );
      c.closePath();
      c.fill();
    }

    // brown wound tape spool — fills most of the inside
    c.fillStyle = "#6a4530";
    c.beginPath();
    c.arc(cx, cy, holeR * 0.7, 0, Math.PI * 2);
    c.fill();
    // a couple of faint concentric rings to suggest wound layers
    for (let i = 1; i <= 3; i++) {
      c.strokeStyle = `rgba(40, 22, 14, ${0.22 + rand() * 0.1})`;
      c.lineWidth = 1;
      c.beginPath();
      c.arc(cx, cy, holeR * 0.7 * (i / 3), 0, Math.PI * 2);
      c.stroke();
    }

    // hub spindle — small light plastic disc
    c.fillStyle = "#c6bda8";
    c.beginPath();
    c.arc(cx, cy, holeR * 0.34, 0, Math.PI * 2);
    c.fill();

    // six dark spokes radiating from the spindle center
    c.fillStyle = "#1a1410";
    const spokeCount = 6;
    for (let s = 0; s < spokeCount; s++) {
      const a = (s / spokeCount) * Math.PI * 2;
      c.save();
      c.translate(cx, cy);
      c.rotate(a);
      c.fillRect(-1.5, 0, 3, holeR * 0.32);
      c.restore();
    }
    // center pin
    c.fillStyle = "#0a0706";
    c.beginPath();
    c.arc(cx, cy, 3.5, 0, Math.PI * 2);
    c.fill();
  };
  drawReel(ctx, leftCX, reelY, reelR);
  drawReel(ctx, rightCX, reelY, reelR);

  // ── tiny legal-print body copy below the counter ──
  // small justified-center paragraph styled like cassette legal text
  const legalStartY = 432;
  ctx.fillStyle = "#3a3228";
  ctx.font = `400 13px "Arial", "Helvetica", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const legalMaxW = W * 0.72;
  const legalLineH = 17;
  const legalWords = body.split(/\s+/);
  let legalLine = "";
  let legalLineCount = 0;
  for (const w of legalWords) {
    const test = legalLine ? `${legalLine} ${w}` : w;
    if (ctx.measureText(test).width > legalMaxW && legalLine) {
      ctx.fillText(legalLine, W / 2, legalStartY + legalLineCount * legalLineH);
      legalLine = w;
      legalLineCount += 1;
    } else {
      legalLine = test;
    }
  }
  if (legalLine) {
    ctx.fillText(legalLine, W / 2, legalStartY + legalLineCount * legalLineH);
  }

  // meta string after the legal block — like a catalogue/run-length stamp
  ctx.fillStyle = "#5a4a36";
  ctx.font = `500 12px "Arial Narrow", "Helvetica", sans-serif`;
  letterSpacingSetter.letterSpacing = "3px";
  ctx.fillText(
    meta.toUpperCase(),
    W / 2,
    legalStartY + (legalLineCount + 1) * legalLineH + 4,
  );
  letterSpacingSetter.letterSpacing = "0px";

  // ── multicolor printer-test stripe near the bottom of the label ──
  const stripeY = 538;
  const stripeH = 14;
  const stripeXStart = 60;
  const stripeXEnd = W - 60;
  const palette = [
    "#e62937", // red
    "#e8541e", // orange
    "#f08c1e", // amber
    "#f0c01e", // yellow
    "#aacf3a", // chartreuse
    "#3eb04a", // green
    "#2da78a", // teal
    "#3ea4b0", // cyan
    "#3e6cb0", // blue
    "#5e4ab0", // indigo
    "#9c4ab0", // violet
    "#c4458a", // magenta
    "#e83e7a", // pink
  ];
  const blockCount = 26;
  const blockW = (stripeXEnd - stripeXStart) / blockCount;
  for (let i = 0; i < blockCount; i++) {
    ctx.fillStyle =
      palette[Math.floor(rand() * palette.length)] ?? "#e62937";
    ctx.fillRect(stripeXStart + i * blockW, stripeY, blockW + 0.5, stripeH);
  }

  // ── bottom plastic edge: access slots ──
  // the row of rectangular punch-outs along the bottom edge of a real
  // cassette where the deck heads/pinch rollers meet the tape
  const slotsY = 620;
  const slotsH = 18;
  ctx.fillStyle = "#1a1410";
  const slotPositions: Array<[number, number]> = [
    [W * 0.275, 18],
    [W * 0.355, 22],
    [W * 0.45, 18],
    [W * 0.555, 18],
    [W * 0.645, 22],
    [W * 0.725, 18],
  ];
  for (const [sx, sw] of slotPositions) {
    ctx.fillRect(sx, slotsY, sw, slotsH);
  }

  // ── three phillips screws: top corners + bottom center ──
  const drawScrew = (c: CanvasRenderingContext2D, x: number, y: number) => {
    // metallic outer ring
    c.fillStyle = "#8c8478";
    c.beginPath();
    c.arc(x, y, 9, 0, Math.PI * 2);
    c.fill();
    // dark inner well
    c.fillStyle = "#1a1612";
    c.beginPath();
    c.arc(x, y, 7, 0, Math.PI * 2);
    c.fill();
    // metallic highlight on top
    c.fillStyle = "rgba(220, 210, 198, 0.45)";
    c.beginPath();
    c.arc(x, y - 1, 7, Math.PI, Math.PI * 2);
    c.fill();
    // phillips cross
    c.strokeStyle = "#cdc4b6";
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x - 4.5, y);
    c.lineTo(x + 4.5, y);
    c.moveTo(x, y - 4.5);
    c.lineTo(x, y + 4.5);
    c.stroke();
  };
  drawScrew(ctx, 32, 32);
  drawScrew(ctx, W - 32, 32);
  drawScrew(ctx, W / 2, 600);

  // reset text defaults
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// cassette-back texture for the About section reveal. quieter than the
// face — same off-white plastic palette but no title/heart/colored
// stripe. shows the molded back of the cassette: horizontal top/bottom
// seam bands, a thin vertical center seam, two reel spindle holes
// (mirrored from the face), a small tape window in the middle, corner
// screws + a center-bottom screw, small notches, a faint HI-FI STEREO
// stamp, a "MADE IN U.S.A." mark, and the bottom transport slots.
export function createCassetteBackTexture(
  seed: number,
  sideLabel: string,
): THREE.CanvasTexture {
  const W = 1024;
  const H = 656;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  const rand = rng(0xc100 + seed * 19);
  const letterSpacingSetter = ctx as CanvasRenderingContext2D & {
    letterSpacing?: string;
  };

  // off-white shell — same palette as the face
  const shellGrad = ctx.createLinearGradient(0, 0, 0, H);
  shellGrad.addColorStop(0, "#f6f1e7");
  shellGrad.addColorStop(0.5, "#ece4d4");
  shellGrad.addColorStop(1, "#d6cdb9");
  ctx.fillStyle = shellGrad;
  ctx.fillRect(0, 0, W, H);

  // top edge highlight
  ctx.fillStyle = "rgba(255, 248, 232, 0.55)";
  ctx.fillRect(0, 0, W, 2);

  // plastic grain
  for (let i = 0; i < W * H * 0.018; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    ctx.fillStyle = `rgba(80, 70, 55, ${0.02 + rand() * 0.06})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // top + bottom molded seam bands — where the two plastic halves
  // clip together. paired dark + light pixel rows for a beveled edge.
  ctx.fillStyle = "rgba(80, 65, 50, 0.20)";
  ctx.fillRect(0, 28, W, 1);
  ctx.fillRect(0, H - 29, W, 1);
  ctx.fillStyle = "rgba(255, 248, 232, 0.28)";
  ctx.fillRect(0, 29, W, 1);
  ctx.fillRect(0, H - 28, W, 1);

  // thin vertical center seam
  ctx.fillStyle = "rgba(70, 58, 45, 0.12)";
  ctx.fillRect(W / 2 - 1, 56, 2, H - 112);
  ctx.fillStyle = "rgba(255, 248, 232, 0.18)";
  ctx.fillRect(W / 2 + 1, 56, 1, H - 112);

  // two spindle holes — mirrored from the face. simpler than the front
  // (no gear teeth or J-card text) so the back reads as quieter.
  const reelY = 320;
  const reelR = 78;
  const leftCX = W * 0.72;
  const rightCX = W * 0.28;
  const drawSpindleHole = (cx: number, cy: number, r: number) => {
    ctx.fillStyle = "#1f1814";
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0a0706";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // central spindle disc
    ctx.fillStyle = "#c6bda8";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    // dark center pin
    ctx.fillStyle = "#0a0706";
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    // faint concentric ring
    ctx.strokeStyle = "rgba(40, 22, 14, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.66, 0, Math.PI * 2);
    ctx.stroke();
  };
  drawSpindleHole(leftCX, reelY, reelR);
  drawSpindleHole(rightCX, reelY, reelR);

  // tape window slot in the center
  const winW = W * 0.18;
  const winH = 50;
  const winX = (W - winW) / 2;
  const winY = reelY - winH / 2;
  ctx.fillStyle = "#1f1814";
  ctx.fillRect(winX - 3, winY - 3, winW + 6, winH + 6);
  ctx.fillStyle = "#0a0706";
  ctx.fillRect(winX, winY, winW, winH);
  ctx.fillStyle = "#5a3a26";
  ctx.fillRect(winX + 4, reelY - 6, winW - 8, 12);
  ctx.fillStyle = "rgba(200, 150, 110, 0.4)";
  ctx.fillRect(winX + 4, reelY - 6, winW - 8, 2);

  // corner screws + a fifth screw mid-bottom
  const drawScrew = (cx: number, cy: number) => {
    ctx.fillStyle = "rgba(60, 50, 40, 0.45)";
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(140, 125, 100, 0.55)";
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(40, 32, 24, 0.85)";
    ctx.fillRect(cx - 5, cy - 1, 10, 2);
    ctx.fillRect(cx - 1, cy - 5, 2, 10);
  };
  drawScrew(52, 56);
  drawScrew(W - 52, 56);
  drawScrew(52, H - 56);
  drawScrew(W - 52, H - 56);
  drawScrew(W / 2, H - 56);

  // small notches near the top — molded plastic detail
  ctx.fillStyle = "rgba(50, 40, 30, 0.32)";
  ctx.fillRect(112, 20, 16, 5);
  ctx.fillRect(W - 128, 20, 16, 5);

  // faint hi-fi stamp top-right — generic, no Dolby trademark reference
  ctx.fillStyle = "rgba(40, 32, 24, 0.55)";
  ctx.font = `600 14px "Helvetica", "Arial", sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  letterSpacingSetter.letterSpacing = "2px";
  ctx.fillText("HI-FI STEREO", W - 95, 92);
  letterSpacingSetter.letterSpacing = "0px";

  // a small SIDE marker on the left for continuity with the face
  ctx.fillStyle = "rgba(40, 32, 24, 0.55)";
  ctx.font = `500 14px "Times New Roman", serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  letterSpacingSetter.letterSpacing = "2px";
  ctx.fillText(`SIDE ${sideLabel}`, 95, 92);
  letterSpacingSetter.letterSpacing = "0px";

  // made-in stamp bottom-left
  ctx.fillStyle = "rgba(40, 32, 24, 0.42)";
  ctx.font = `500 11px "Helvetica", "Arial", sans-serif`;
  ctx.textAlign = "left";
  letterSpacingSetter.letterSpacing = "1px";
  ctx.fillText("MADE IN U.S.A.", 90, H - 92);
  letterSpacingSetter.letterSpacing = "0px";

  // bottom access slots — mirrored from the face
  ctx.fillStyle = "rgba(50, 40, 30, 0.32)";
  for (let i = 0; i < 4; i++) {
    const sx = W * 0.32 + i * 30;
    ctx.fillRect(sx, H - 18, 20, 5);
  }

  // reset text defaults
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// front-of-case mold detail layer for the Projects CD prop. drawn on
// transparent background — only the molded plastic features (corner
// clips, edge bevel, latch grooves, raised slots, bubble screws, header
// arrow, "22" stamp, project mark) are visible. the disc and the lavender
// sticker live on their own meshes so the side view shows a circular
// disc inside a clear case instead of a square interior card.
export function createCdCaseShellFaceTexture(
  seed: number,
): THREE.CanvasTexture {
  const W = 1024;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  const rand = rng(0x7e00 + seed * 37);
  const letterSpacingSetter = ctx as CanvasRenderingContext2D & {
    letterSpacing?: string;
  };

  // canvas left transparent — the case shell mesh + box already supply
  // the translucent surface. only the molded features are drawn here.

  // very sparse plastic grain so the surface reads as having texture
  // without filling in alpha
  for (let i = 0; i < W * H * 0.003; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    ctx.fillStyle = `rgba(80, 90, 110, ${0.04 + rand() * 0.08})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // corner + side-midpoint mold clips
  const moldDots: Array<[number, number]> = [
    [50, 70],
    [W - 50, 70],
    [50, H - 70],
    [W - 50, H - 70],
    [40, H * 0.5],
    [W - 40, H * 0.5],
  ];
  for (const [mx, my] of moldDots) {
    ctx.fillStyle = "rgba(180, 188, 200, 0.55)";
    ctx.beginPath();
    ctx.arc(mx, my, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(220, 226, 235, 0.75)";
    ctx.beginPath();
    ctx.arc(mx, my, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(150, 160, 175, 0.55)";
    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // edge bevel rectangles
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.strokeStyle = "rgba(120, 130, 145, 0.45)";
  ctx.strokeRect(28, 28, W - 56, H - 56);

  // inner wall edge ridges
  ctx.fillStyle = "rgba(200, 210, 225, 0.55)";
  ctx.fillRect(36, 140, 2, H - 280);
  ctx.fillRect(W - 38, 140, 2, H - 280);
  ctx.fillStyle = "rgba(110, 120, 138, 0.45)";
  ctx.fillRect(40, 140, 1, H - 280);
  ctx.fillRect(W - 41, 140, 1, H - 280);

  // latch grooves on both inside walls
  for (let side = 0; side < 2; side++) {
    const baseX = side === 0 ? 42 : W - 56;
    for (let i = 0; i < 3; i++) {
      const ly = H * 0.32 + i * 110;
      ctx.fillStyle = "rgba(110, 120, 138, 0.55)";
      ctx.fillRect(baseX, ly, 14, 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.fillRect(baseX, ly + 2, 14, 1);
    }
  }

  // raised rounded rectangle slots along the bottom
  const raisedRects: Array<[number, number, number]> = [
    [120, H - 56, 80],
    [W - 200, H - 56, 80],
  ];
  for (const [rx, ry, rw] of raisedRects) {
    ctx.fillStyle = "rgba(220, 226, 235, 0.6)";
    ctx.fillRect(rx, ry, rw, 14);
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillRect(rx, ry, rw, 1);
    ctx.fillStyle = "rgba(110, 120, 138, 0.5)";
    ctx.fillRect(rx, ry + 13, rw, 1);
  }

  // bubble screws
  const bubbles: Array<[number, number]> = [
    [88, 110],
    [W - 88, 110],
    [88, H - 110],
    [W - 88, H - 110],
    [W / 2 - 6, H - 24],
  ];
  for (const [bx, by] of bubbles) {
    const bg = ctx.createRadialGradient(bx - 1, by - 1, 0, bx, by, 5);
    bg.addColorStop(0, "rgba(255, 255, 255, 0.78)");
    bg.addColorStop(1, "rgba(140, 150, 168, 0.5)");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(bx, by, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(60, 70, 90, 0.55)";
    ctx.beginPath();
    ctx.arc(bx, by, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // header "LOAD PROJECT SIDE ▼"
  ctx.fillStyle = "#1a1614";
  ctx.font = `700 22px "Arial Narrow", "Helvetica", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  letterSpacingSetter.letterSpacing = "2px";
  const headerY = 100;
  ctx.fillText("LOAD PROJECT SIDE", W / 2 + 30, headerY);
  letterSpacingSetter.letterSpacing = "0px";
  ctx.beginPath();
  const triX = W / 2 - 130;
  ctx.moveTo(triX - 10, headerY - 8);
  ctx.lineTo(triX + 10, headerY - 8);
  ctx.lineTo(triX, headerY + 8);
  ctx.closePath();
  ctx.fill();

  // "22" capacity stamp upper-right
  ctx.font = `800 78px "Helvetica", "Arial", sans-serif`;
  ctx.fillStyle = "#1a1614";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("22", W - 90, 270);

  // generic project mark bottom-center — replaces the prior minidisc-
  // style badge with original copy that doesn't reference Sony / MD.
  ctx.fillStyle = "rgba(40, 40, 50, 0.78)";
  ctx.font = `700 13px "Arial Narrow", "Helvetica", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  letterSpacingSetter.letterSpacing = "4px";
  ctx.fillText("PROJECT DISC", W / 2, H - 118);
  ctx.font = `500 10px "Arial Narrow", "Helvetica", sans-serif`;
  ctx.fillStyle = "rgba(40, 40, 50, 0.58)";
  letterSpacingSetter.letterSpacing = "3px";
  ctx.fillText("VOL. 02", W / 2, H - 100);
  letterSpacingSetter.letterSpacing = "0px";

  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// circular CD/minidisc texture for the Projects prop. drawn centered
// in a square canvas with a radius that fills the canvas so a
// CircleGeometry mesh can sample the whole disc. iridescent rainbow,
// data rings, glare streak, hub, lead-in groove, and curved technical
// text are all baked here.
export function createCdDiscTexture(
  seed: number,
  trackNumber: string,
): THREE.CanvasTexture {
  const W = 1024;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  const rand = rng(0x7c00 + seed * 29);
  const letterSpacingSetter = ctx as CanvasRenderingContext2D & {
    letterSpacing?: string;
  };

  const discCX = W / 2;
  const discCY = H / 2;
  const discR = W / 2 - 4;

  // silver base
  ctx.fillStyle = "#d8d8de";
  ctx.beginPath();
  ctx.arc(discCX, discCY, discR, 0, Math.PI * 2);
  ctx.fill();

  // iridescent conic rainbow
  const ctxAny = ctx as CanvasRenderingContext2D & {
    createConicGradient?: (
      startAngle: number,
      x: number,
      y: number,
    ) => CanvasGradient;
  };
  if (typeof ctxAny.createConicGradient === "function") {
    const conic = ctxAny.createConicGradient(
      rand() * Math.PI * 2,
      discCX,
      discCY,
    );
    conic.addColorStop(0.0, "rgba(255, 110, 200, 0.85)");
    conic.addColorStop(0.12, "rgba(255, 160, 100, 0.85)");
    conic.addColorStop(0.24, "rgba(240, 220, 100, 0.85)");
    conic.addColorStop(0.36, "rgba(160, 230, 130, 0.85)");
    conic.addColorStop(0.48, "rgba(90, 220, 200, 0.85)");
    conic.addColorStop(0.6, "rgba(110, 180, 240, 0.85)");
    conic.addColorStop(0.72, "rgba(170, 130, 240, 0.85)");
    conic.addColorStop(0.84, "rgba(230, 110, 220, 0.85)");
    conic.addColorStop(1.0, "rgba(255, 110, 200, 0.85)");
    ctx.fillStyle = conic;
    ctx.beginPath();
    ctx.arc(discCX, discCY, discR, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const fallbackPalette = [
      "rgba(255, 110, 200, 0.45)",
      "rgba(160, 230, 130, 0.45)",
      "rgba(90, 220, 200, 0.45)",
      "rgba(170, 130, 240, 0.45)",
    ];
    fallbackPalette.forEach((color, i) => {
      const ang = (i / fallbackPalette.length) * Math.PI * 2;
      const ox = Math.cos(ang) * discR * 0.4;
      const oy = Math.sin(ang) * discR * 0.4;
      const g = ctx.createRadialGradient(
        discCX + ox,
        discCY + oy,
        0,
        discCX + ox,
        discCY + oy,
        discR * 1.1,
      );
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(discCX, discCY, discR, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // concentric data rings (clipped to disc)
  ctx.save();
  ctx.beginPath();
  ctx.arc(discCX, discCY, discR, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < 130; i++) {
    const t = i / 129;
    const ringR = discR * (0.18 + 0.82 * t);
    const dark = i % 2 === 0;
    ctx.strokeStyle = dark
      ? "rgba(0, 0, 0, 0.07)"
      : "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(discCX, discCY, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // edge: light highlight + darker rim + outer plastic shadow
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(discCX, discCY, discR - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(28, 34, 46, 0.34)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(discCX, discCY, discR - 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(40, 50, 60, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(discCX, discCY, discR - 12, 0, Math.PI * 2);
  ctx.stroke();

  // soft iridescent glare streak (clipped to disc)
  ctx.save();
  ctx.beginPath();
  ctx.arc(discCX, discCY, discR - 4, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(discCX, discCY);
  ctx.rotate(-Math.PI / 5);
  const glareGrad = ctx.createLinearGradient(0, -discR, 0, discR);
  glareGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
  glareGrad.addColorStop(0.42, "rgba(255, 255, 255, 0.1)");
  glareGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.24)");
  glareGrad.addColorStop(0.58, "rgba(255, 255, 255, 0.1)");
  glareGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glareGrad;
  ctx.fillRect(-discR, -discR * 0.22, discR * 2, discR * 0.44);
  ctx.restore();

  // silver hub
  const hubR = discR * 0.22;
  const hubGrad = ctx.createRadialGradient(
    discCX - hubR * 0.3,
    discCY - hubR * 0.3,
    0,
    discCX,
    discCY,
    hubR,
  );
  hubGrad.addColorStop(0, "#f0f0f4");
  hubGrad.addColorStop(0.5, "#b8b8c0");
  hubGrad.addColorStop(1, "#6c6c78");
  ctx.fillStyle = hubGrad;
  ctx.beginPath();
  ctx.arc(discCX, discCY, hubR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(20, 22, 28, 0.6)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(discCX, discCY, hubR - 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(60, 64, 72, 0.5)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(discCX, discCY, hubR * (0.55 + i * 0.12), 0, Math.PI * 2);
    ctx.stroke();
  }
  // center hole
  ctx.fillStyle = "#080a10";
  ctx.beginPath();
  ctx.arc(discCX, discCY, 18, 0, Math.PI * 2);
  ctx.fill();

  // darker inner ring just outside the hub
  ctx.strokeStyle = "rgba(20, 24, 32, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(discCX, discCY, hubR + 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(discCX, discCY, hubR + 21, 0, Math.PI * 2);
  ctx.stroke();

  // curved technical text on the left arc
  const techRadius = hubR + 48;
  const techText = `PROJECT DISC · OZIEL SAUCEDA · TRACK ${trackNumber} · `;
  const arcCenter = Math.PI;
  const arcSpan = Math.PI * 0.95;
  ctx.save();
  ctx.fillStyle = "rgba(28, 30, 40, 0.8)";
  ctx.font = `600 16px "Arial Narrow", "Helvetica", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  letterSpacingSetter.letterSpacing = "1px";
  const totalChars = techText.length;
  for (let i = 0; i < totalChars; i++) {
    const t = i / Math.max(1, totalChars - 1);
    const angle = arcCenter - arcSpan / 2 + arcSpan * t;
    const x = discCX + Math.cos(angle) * techRadius;
    const y = discCY + Math.sin(angle) * techRadius;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle - Math.PI / 2);
    ctx.fillText(techText[i] ?? "", 0, 0);
    ctx.restore();
  }
  letterSpacingSetter.letterSpacing = "0px";
  ctx.restore();

  // vertical "PROJECT DISC" on the right — generic mark, no Sony/MD ref
  ctx.save();
  ctx.translate(discCX + discR * 0.74, discCY + discR * 0.25);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `700 26px "Arial", "Helvetica", sans-serif`;
  ctx.fillStyle = "#1a1614";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  letterSpacingSetter.letterSpacing = "2px";
  ctx.fillText("PROJECT DISC", 0, 0);
  letterSpacingSetter.letterSpacing = "0px";
  ctx.restore();

  // date/serial near the disc edge
  ctx.save();
  ctx.translate(discCX + discR * 0.78, discCY - discR * 0.05);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `500 18px "Arial Narrow", "Helvetica", sans-serif`;
  ctx.fillStyle = "rgba(40, 30, 26, 0.72)";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  letterSpacingSetter.letterSpacing = "1px";
  const serialChars = "SBPNRTYDX";
  const serial = `${serialChars[Math.floor(rand() * serialChars.length)] ?? "S"}${serialChars[Math.floor(rand() * serialChars.length)] ?? "B"}${Math.floor(rand() * 90 + 10)} · ${Math.floor(rand() * 90 + 10)}`;
  ctx.fillText(serial, 0, 0);
  letterSpacingSetter.letterSpacing = "0px";
  ctx.restore();

  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// lavender project label/sleeve for the Projects CD prop. drawn as its
// own rectangular texture so the label is a separate plane sitting in
// front of the transparent case, not painted onto the case glass.
export function createCdStickerTexture(
  seed: number,
  trackNumber: string,
  heading: string,
  body: string,
  meta: string,
): THREE.CanvasTexture {
  const W = 1024;
  const H = 668;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  const rand = rng(0x7f00 + seed * 41);
  const upperHeading = heading.toUpperCase();
  const letterSpacingSetter = ctx as CanvasRenderingContext2D & {
    letterSpacing?: string;
  };

  // sticker paper — lavender gradient
  const stickerGrad = ctx.createLinearGradient(0, 0, 0, H);
  stickerGrad.addColorStop(0, "#c6a3d8");
  stickerGrad.addColorStop(0.5, "#b896d4");
  stickerGrad.addColorStop(1, "#9b7cbc");
  ctx.fillStyle = stickerGrad;
  ctx.fillRect(0, 0, W, H);

  // paper fiber grain
  for (let i = 0; i < W * H * 0.04; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    const dark = rand() > 0.5;
    ctx.fillStyle = dark
      ? `rgba(60, 30, 80, ${0.04 + rand() * 0.12})`
      : `rgba(250, 240, 255, ${0.05 + rand() * 0.12})`;
    ctx.fillRect(x, y, 1, 1);
  }
  // top edge highlight
  ctx.fillStyle = "rgba(255, 250, 255, 0.5)";
  ctx.fillRect(0, 0, W, 4);
  // subtle right-edge wear shadow
  ctx.fillStyle = "rgba(70, 40, 90, 0.4)";
  ctx.fillRect(W - 14, 0, 14, H);

  // track number top-left
  ctx.fillStyle = "rgba(30, 16, 50, 0.92)";
  ctx.font = `700 32px "Arial Narrow", "Helvetica", sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  letterSpacingSetter.letterSpacing = "3px";
  ctx.fillText(`TRACK ${trackNumber}`, 50, 50);
  letterSpacingSetter.letterSpacing = "0px";

  // divider line
  ctx.fillStyle = "rgba(30, 16, 50, 0.55)";
  ctx.fillRect(50, 108, W - 130, 2);

  // heading — big condensed caps
  ctx.fillStyle = "#1a0830";
  ctx.font = `800 70px "Impact", "Arial Narrow Bold", sans-serif`;
  letterSpacingSetter.letterSpacing = "2px";
  ctx.fillText(upperHeading, 50, 130);
  letterSpacingSetter.letterSpacing = "0px";

  // wrapped body paragraph
  ctx.fillStyle = "#241038";
  ctx.font = `400 32px "Arial", "Helvetica", sans-serif`;
  const bodyMaxW = W - 100;
  const bodyStartY = 230;
  const bodyLineH = 42;
  const bodyWords = body.split(/\s+/);
  let bodyLine = "";
  let bodyLineCount = 0;
  for (const w of bodyWords) {
    const test = bodyLine ? `${bodyLine} ${w}` : w;
    if (ctx.measureText(test).width > bodyMaxW && bodyLine) {
      ctx.fillText(bodyLine, 50, bodyStartY + bodyLineCount * bodyLineH);
      bodyLine = w;
      bodyLineCount += 1;
    } else {
      bodyLine = test;
    }
  }
  if (bodyLine) {
    ctx.fillText(bodyLine, 50, bodyStartY + bodyLineCount * bodyLineH);
  }

  // meta — small caps bottom-right
  ctx.font = `600 26px "Arial Narrow", sans-serif`;
  ctx.fillStyle = "rgba(30, 16, 50, 0.8)";
  ctx.textAlign = "right";
  letterSpacingSetter.letterSpacing = "2px";
  ctx.fillText(meta.toUpperCase(), W - 50, H - 60);
  letterSpacingSetter.letterSpacing = "0px";

  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}


// interior tray layer for the Projects CD prop. drawn at low overall
// alpha so it reads as the frosted inside of a clear jewel case when
// seen through the transparent front pane. carries a faint cream paper
// insert + a recessed disc well shadow + subtle latch grooves. the
// disc mesh sits in front of this layer and covers most of it; only
// the border around the disc and the empty top/left strips are
// actually visible from front.
export function createCdCaseTrayTexture(
  seed: number,
): THREE.CanvasTexture {
  const W = 1024;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  const rand = rng(0x8000 + seed * 43);

  // faint frosted plastic wash across the whole interior
  ctx.fillStyle = "rgba(230, 234, 244, 0.22)";
  ctx.fillRect(0, 0, W, H);

  // cream paper insert behind the disc — sits within the molded tray
  // walls. soft drop shadow underneath so it reads as a real piece of
  // paper resting against the back wall.
  const paperX = 70;
  const paperY = 130;
  const paperW = W - 140;
  const paperH = H - 230;
  ctx.fillStyle = "rgba(20, 20, 25, 0.18)";
  ctx.fillRect(paperX + 8, paperY + 12, paperW, paperH);
  const paperGrad = ctx.createLinearGradient(0, paperY, 0, paperY + paperH);
  paperGrad.addColorStop(0, "rgba(245, 236, 218, 0.55)");
  paperGrad.addColorStop(0.5, "rgba(234, 222, 196, 0.55)");
  paperGrad.addColorStop(1, "rgba(212, 198, 170, 0.55)");
  ctx.fillStyle = paperGrad;
  ctx.fillRect(paperX, paperY, paperW, paperH);
  // paper fiber speckle
  for (let i = 0; i < paperW * paperH * 0.02; i++) {
    const x = paperX + Math.floor(rand() * paperW);
    const y = paperY + Math.floor(rand() * paperH);
    const dark = rand() > 0.55;
    ctx.fillStyle = dark
      ? `rgba(80, 60, 30, ${0.04 + rand() * 0.08})`
      : `rgba(255, 248, 226, ${0.04 + rand() * 0.08})`;
    ctx.fillRect(x, y, 1, 1);
  }
  // paper top edge highlight
  ctx.fillStyle = "rgba(255, 250, 235, 0.45)";
  ctx.fillRect(paperX, paperY, paperW, 2);

  // recessed disc well — a darker ring just outside where the disc
  // mesh sits, so when the disc covers the center the well's outer
  // edge peeks around it like a real molded depression. positions
  // match the disc mesh placement on the case front.
  const discCX = W * 0.46;
  const discCY = H * 0.52;
  const discR = 360;
  const wellOuter = discR + 38;
  // soft outer shadow ring
  const wellGrad = ctx.createRadialGradient(
    discCX,
    discCY,
    discR - 6,
    discCX,
    discCY,
    wellOuter,
  );
  wellGrad.addColorStop(0, "rgba(20, 26, 40, 0)");
  wellGrad.addColorStop(0.55, "rgba(20, 26, 40, 0.32)");
  wellGrad.addColorStop(1, "rgba(20, 26, 40, 0)");
  ctx.fillStyle = wellGrad;
  ctx.beginPath();
  ctx.arc(discCX, discCY, wellOuter, 0, Math.PI * 2);
  ctx.fill();
  // crisp well rim circle
  ctx.strokeStyle = "rgba(40, 50, 70, 0.42)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(discCX, discCY, discR + 6, 0, Math.PI * 2);
  ctx.stroke();
  // light highlight ring just outside that — gives the recessed well a
  // beveled lip rather than a flat dark stroke
  ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(discCX, discCY, discR + 10, 0, Math.PI * 2);
  ctx.stroke();

  // latch grooves on the left + right inner walls — mirror the front
  // shell's latches so the interior reads as part of the same molded
  // case body.
  for (let side = 0; side < 2; side++) {
    const baseX = side === 0 ? 60 : W - 74;
    for (let i = 0; i < 3; i++) {
      const ly = H * 0.32 + i * 110;
      ctx.fillStyle = "rgba(60, 70, 90, 0.32)";
      ctx.fillRect(baseX, ly, 14, 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
      ctx.fillRect(baseX, ly + 2, 14, 1);
    }
  }

  // thin inner edge bevel — frame just inside the case walls
  ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
  ctx.lineWidth = 1;
  ctx.strokeRect(46, 46, W - 92, H - 92);
  ctx.strokeStyle = "rgba(60, 70, 90, 0.3)";
  ctx.strokeRect(50, 50, W - 100, H - 100);

  // very sparse plastic grain so the tray surface isn't dead-flat
  for (let i = 0; i < W * H * 0.004; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    ctx.fillStyle = `rgba(80, 90, 110, ${0.03 + rand() * 0.06})`;
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// back-of-case texture for the Projects CD prop. translucent slate-blue
// jewel back: corner mold clips + edge bevel echo the front, a vertical
// spine label carries the track + heading text, a rear insert card on
// the right lists the (anonymized) track listing for visual continuity
// across the three cases, a barcode + catalog/serial block sits at the
// bottom-left, and a slim lavender tab top-right echoes the front
// sticker so it reads as the same physical piece.
export function createCdCaseBackTexture(
  seed: number,
  trackNumber: string,
  heading: string,
  meta: string,
): THREE.CanvasTexture {
  const W = 1024;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  const rand = rng(0x7d00 + seed * 31);
  const letterSpacingSetter = ctx as CanvasRenderingContext2D & {
    letterSpacing?: string;
  };

  // slate-blue translucent plastic back — slightly cooler than the front
  // so the back reads as the projects-palette side of the case.
  const caseGrad = ctx.createLinearGradient(0, 0, 0, H);
  caseGrad.addColorStop(0, "#dde2ec");
  caseGrad.addColorStop(0.5, "#c4ccdb");
  caseGrad.addColorStop(1, "#a8b1c6");
  ctx.fillStyle = caseGrad;
  ctx.fillRect(0, 0, W, H);

  // plastic grain
  for (let i = 0; i < W * H * 0.012; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    ctx.fillStyle = `rgba(60, 70, 95, ${0.02 + rand() * 0.06})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // corner + side-midpoint mold clips — same pattern as the front so
  // the case reads as the same molded shell
  const moldDots: Array<[number, number]> = [
    [50, 70],
    [W - 50, 70],
    [50, H - 70],
    [W - 50, H - 70],
    [40, H * 0.5],
    [W - 40, H * 0.5],
  ];
  for (const [mx, my] of moldDots) {
    ctx.fillStyle = "rgba(140, 152, 178, 0.55)";
    ctx.beginPath();
    ctx.arc(mx, my, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(210, 218, 232, 0.65)";
    ctx.beginPath();
    ctx.arc(mx, my, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(110, 124, 152, 0.5)";
    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // bevel rectangle — echoes the front edge frame
  ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.strokeStyle = "rgba(80, 92, 118, 0.35)";
  ctx.strokeRect(28, 28, W - 56, H - 56);

  // ── inner tray seam ──
  // horizontal seam ~24% from the top where the molded back tray sits
  // against the inner card. paired dark + light pixel rows so it reads
  // as a beveled inner edge.
  ctx.fillStyle = "rgba(60, 72, 96, 0.32)";
  ctx.fillRect(60, Math.floor(H * 0.22), W - 120, 1);
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.fillRect(60, Math.floor(H * 0.22) + 1, W - 120, 1);
  ctx.fillStyle = "rgba(60, 72, 96, 0.32)";
  ctx.fillRect(60, Math.floor(H * 0.82), W - 120, 1);
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.fillRect(60, Math.floor(H * 0.82) - 1, W - 120, 1);

  // ── spine label band — vertical stripe along the left edge ──
  // mimics the printed spine you see on a real jewel case viewed from
  // the back. lavender to tie back to the front sticker.
  const spineX = 56;
  const spineW = 64;
  const spineY = 70;
  const spineH = H - 140;
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.fillRect(spineX + 4, spineY + 6, spineW, spineH);
  const spineGrad = ctx.createLinearGradient(
    spineX,
    spineY,
    spineX + spineW,
    spineY,
  );
  spineGrad.addColorStop(0, "#a385c2");
  spineGrad.addColorStop(0.5, "#b896d4");
  spineGrad.addColorStop(1, "#8a6db0");
  ctx.fillStyle = spineGrad;
  ctx.fillRect(spineX, spineY, spineW, spineH);
  // tiny fiber grain on the spine
  for (let i = 0; i < spineW * spineH * 0.045; i++) {
    const x = spineX + Math.floor(rand() * spineW);
    const y = spineY + Math.floor(rand() * spineH);
    const dark = rand() > 0.55;
    ctx.fillStyle = dark
      ? `rgba(50, 24, 70, ${0.04 + rand() * 0.1})`
      : `rgba(250, 240, 255, ${0.05 + rand() * 0.1})`;
    ctx.fillRect(x, y, 1, 1);
  }
  // spine printed text — rotated 90° so it reads vertically along the
  // strip. small caps, projects-palette accent colour for "PROJECTS".
  ctx.save();
  ctx.translate(spineX + spineW / 2, spineY + spineH - 32);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "#1a0830";
  ctx.font = `800 22px "Impact", "Arial Narrow Bold", sans-serif`;
  letterSpacingSetter.letterSpacing = "3px";
  ctx.fillText(`TRACK ${trackNumber}`, 0, -2);
  letterSpacingSetter.letterSpacing = "0px";
  ctx.font = `800 28px "Impact", "Arial Narrow Bold", sans-serif`;
  letterSpacingSetter.letterSpacing = "2px";
  const upperHeading = heading.toUpperCase();
  ctx.fillText(upperHeading, 170, -2);
  letterSpacingSetter.letterSpacing = "0px";
  // small caps tail "PROJECTS B-SIDE"
  ctx.font = `600 14px "Arial Narrow", sans-serif`;
  ctx.fillStyle = "rgba(30, 16, 50, 0.78)";
  letterSpacingSetter.letterSpacing = "4px";
  ctx.fillText("PROJECTS B-SIDE", spineH - 240, -2);
  letterSpacingSetter.letterSpacing = "0px";
  ctx.restore();

  // ── rear insert card on the right side — the cream paper backing
  // that sits behind the disc when the case is closed. holds the
  // track listing + meta. shadowed so it reads as physically tucked
  // in front of the back panel.
  const cardX = spineX + spineW + 60;
  const cardY = 130;
  const cardW = W - cardX - 70;
  const cardH = H - cardY - 200;
  ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
  ctx.fillRect(cardX + 8, cardY + 10, cardW, cardH);
  const cardGrad = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
  cardGrad.addColorStop(0, "#f3ecd9");
  cardGrad.addColorStop(0.5, "#e8dfc6");
  cardGrad.addColorStop(1, "#d6caab");
  ctx.fillStyle = cardGrad;
  ctx.fillRect(cardX, cardY, cardW, cardH);
  // paper fiber grain
  for (let i = 0; i < cardW * cardH * 0.04; i++) {
    const x = cardX + Math.floor(rand() * cardW);
    const y = cardY + Math.floor(rand() * cardH);
    const dark = rand() > 0.5;
    ctx.fillStyle = dark
      ? `rgba(90, 70, 35, ${0.04 + rand() * 0.1})`
      : `rgba(255, 250, 230, ${0.05 + rand() * 0.1})`;
    ctx.fillRect(x, y, 1, 1);
  }
  // card top edge highlight
  ctx.fillStyle = "rgba(255, 250, 235, 0.5)";
  ctx.fillRect(cardX, cardY, cardW, 2);
  // card left-edge tuck shadow (wraps under the spine)
  ctx.fillStyle = "rgba(70, 50, 20, 0.32)";
  ctx.fillRect(cardX, cardY, 8, cardH);

  // card header — "TRACK LISTING"
  ctx.fillStyle = "rgba(30, 18, 6, 0.92)";
  ctx.font = `700 16px "Arial Narrow", "Helvetica", sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  letterSpacingSetter.letterSpacing = "4px";
  ctx.fillText("TRACK LISTING", cardX + 32, cardY + 26);
  letterSpacingSetter.letterSpacing = "0px";
  // header rule
  ctx.fillStyle = "rgba(60, 40, 16, 0.55)";
  ctx.fillRect(cardX + 32, cardY + 52, cardW - 64, 1);

  // three-track listing — the current track highlighted in projects
  // palette navy, the other two in muted ink. the labels are generic
  // ("RELEASE", "ENCORE", etc.) so this back panel reads as a coherent
  // tape-style B-side without needing to know the other slabs.
  const trackRows: Array<{ n: string; t: string; label: string }> = [
    { n: "01", t: "5:42", label: "OVERTURE" },
    { n: "02", t: "4:08", label: "RELEASE" },
    { n: "03", t: "6:21", label: "ENCORE" },
  ];
  const rowStartY = cardY + 80;
  const rowH = 36;
  for (let i = 0; i < trackRows.length; i++) {
    const r = trackRows[i]!;
    const isMine = r.n === trackNumber;
    const ry = rowStartY + i * rowH;
    if (isMine) {
      ctx.fillStyle = "rgba(155, 182, 255, 0.28)";
      ctx.fillRect(cardX + 26, ry - 4, cardW - 52, rowH - 8);
    }
    ctx.fillStyle = isMine ? "#1d2740" : "rgba(50, 36, 14, 0.85)";
    ctx.font = isMine
      ? `800 22px "Impact", "Arial Narrow Bold", sans-serif`
      : `600 18px "Arial Narrow", "Helvetica", sans-serif`;
    letterSpacingSetter.letterSpacing = "2px";
    ctx.fillText(r.n, cardX + 32, ry);
    ctx.fillText(
      isMine ? heading.toUpperCase() : r.label,
      cardX + 84,
      ry,
    );
    letterSpacingSetter.letterSpacing = "0px";
    ctx.textAlign = "right";
    ctx.font = `500 14px "Arial Narrow", "Helvetica", sans-serif`;
    ctx.fillStyle = isMine
      ? "rgba(29, 39, 64, 0.85)"
      : "rgba(60, 46, 20, 0.7)";
    ctx.fillText(r.t, cardX + cardW - 32, ry + 4);
    ctx.textAlign = "left";
  }

  // bottom rule + meta line on the card
  const metaY = cardY + cardH - 70;
  ctx.fillStyle = "rgba(60, 40, 16, 0.4)";
  ctx.fillRect(cardX + 32, metaY, cardW - 64, 1);
  ctx.fillStyle = "rgba(40, 26, 10, 0.78)";
  ctx.font = `600 12px "Arial Narrow", "Helvetica", sans-serif`;
  ctx.textAlign = "left";
  letterSpacingSetter.letterSpacing = "3px";
  ctx.fillText(meta.toUpperCase(), cardX + 32, metaY + 14);
  // composer / credit blurb (generic)
  ctx.font = `400 11px "Arial", "Helvetica", sans-serif`;
  ctx.fillStyle = "rgba(40, 26, 10, 0.55)";
  letterSpacingSetter.letterSpacing = "1px";
  ctx.fillText(
    "ALL TRACKS WRITTEN & PRODUCED BY O. SAUCEDA",
    cardX + 32,
    metaY + 36,
  );
  letterSpacingSetter.letterSpacing = "0px";

  // ── catalog / serial block top-right of the back ──
  ctx.fillStyle = "rgba(20, 26, 40, 0.85)";
  ctx.font = `700 14px "Arial Narrow", "Helvetica", sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  letterSpacingSetter.letterSpacing = "2px";
  const catChars = "OSZLPRJ";
  const catalogue = `OS-${catChars[Math.floor(rand() * catChars.length)] ?? "P"}${catChars[Math.floor(rand() * catChars.length)] ?? "R"}${Math.floor(rand() * 900 + 100)}`;
  ctx.fillText(catalogue, W - 60, 60);
  letterSpacingSetter.letterSpacing = "0px";
  ctx.font = `500 11px "Arial Narrow", sans-serif`;
  ctx.fillStyle = "rgba(20, 26, 40, 0.6)";
  letterSpacingSetter.letterSpacing = "1px";
  const stamp = `· ${20 + Math.floor(rand() * 10)} · MIX·MASTER`;
  ctx.fillText(stamp, W - 60, 84);
  letterSpacingSetter.letterSpacing = "0px";

  // ── small lavender index tab top-right echoing the front sticker ──
  const tabX = W - 220;
  const tabY = 24;
  const tabW = 170;
  const tabH = 24;
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fillRect(tabX + 3, tabY + 4, tabW, tabH);
  ctx.fillStyle = "#b896d4";
  ctx.fillRect(tabX, tabY, tabW, tabH);
  ctx.fillStyle = "rgba(255, 250, 255, 0.45)";
  ctx.fillRect(tabX, tabY, tabW, 1);
  ctx.fillStyle = "#1a0830";
  ctx.font = `700 12px "Arial Narrow", "Helvetica", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  letterSpacingSetter.letterSpacing = "3px";
  ctx.fillText(`TRACK ${trackNumber} · B-SIDE`, tabX + tabW / 2, tabY + tabH / 2);
  letterSpacingSetter.letterSpacing = "0px";

  // ── barcode block bottom-left ──
  const barX = spineX + spineW + 48;
  const barY = H - 130;
  const barW = 220;
  const barH = 64;
  ctx.fillStyle = "#f0eee6";
  ctx.fillRect(barX, barY, barW, barH);
  // vertical bars of varying widths
  let bx = barX + 8;
  while (bx < barX + barW - 8) {
    const w = 1 + Math.floor(rand() * 4);
    const dark = rand() > 0.35;
    if (dark) {
      ctx.fillStyle = "#0a0c14";
      ctx.fillRect(bx, barY + 8, w, barH - 28);
    }
    bx += w + 1 + Math.floor(rand() * 2);
  }
  // numerals under the barcode
  ctx.fillStyle = "#0a0c14";
  ctx.font = `600 12px "Courier New", monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  letterSpacingSetter.letterSpacing = "2px";
  ctx.fillText(
    `${Math.floor(rand() * 9 + 1)} ${Math.floor(rand() * 90000 + 10000)} ${Math.floor(rand() * 90000 + 10000)} ${Math.floor(rand() * 9)}`,
    barX + 10,
    barY + barH - 18,
  );
  letterSpacingSetter.letterSpacing = "0px";

  // ── © stamp + printed-in tail under the barcode ──
  ctx.fillStyle = "rgba(20, 26, 40, 0.7)";
  ctx.font = `500 11px "Arial Narrow", sans-serif`;
  ctx.textAlign = "left";
  letterSpacingSetter.letterSpacing = "2px";
  ctx.fillText(
    `© ${2018 + Math.floor(rand() * 7)} OS · PRINTED IN U.S.A.`,
    barX,
    barY + barH + 14,
  );
  letterSpacingSetter.letterSpacing = "0px";

  // ── subtle scuffs / scratches across the case ──
  for (let i = 0; i < 6; i++) {
    const sx = 80 + rand() * (W - 200);
    const sy = 120 + rand() * (H - 240);
    const sw = 40 + rand() * 120;
    const angle = (rand() - 0.5) * 0.5;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.04 + rand() * 0.06})`;
    ctx.fillRect(-sw / 2, 0, sw, 1);
    ctx.restore();
  }

  // top-edge glossy highlight strip across the whole case
  ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
  ctx.fillRect(0, 0, W, 2);

  // reset text defaults
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export type SlabTreatment = "paper" | "black" | "concrete";

// album-cover-style face textures for the section reveal slabs. each
// treatment bakes its own background, oversized condensed heading, and the
// decorative mark that gives the slab its visual identity (handwritten 01,
// cropped red brutalist text, dark photo plate). canvas-rendered Impact
// gives a typographic weight drei's default SDF font cannot match. body
// copy + meta still ride on top via drei Text for crisp readability.
export function createSlabFaceTexture(
  treatment: SlabTreatment,
  seed: number,
  trackNumber: string,
  heading: string,
): THREE.CanvasTexture {
  const W = 512;
  const H = 692;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  const rand = rng(0x4a00 + seed * 19);
  const upperHeading = heading.toUpperCase();

  if (treatment === "paper") {
    // PAPER — cream art-paper. sketchbook page energy. one big hand-drawn
    // number stamped in the corner; the keyword sits below in heavy black
    // condensed type with a wide letter-spaced run.
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#ede4d0");
    grad.addColorStop(0.6, "#e2d6bb");
    grad.addColorStop(1, "#cdbf9e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // paper grain
    for (let i = 0; i < W * H * 0.05; i++) {
      const x = Math.floor(rand() * W);
      const y = Math.floor(rand() * H);
      const dark = rand() > 0.5;
      ctx.fillStyle = dark
        ? `rgba(60, 48, 28, ${0.04 + rand() * 0.12})`
        : `rgba(245, 235, 210, ${0.06 + rand() * 0.14})`;
      ctx.fillRect(x, y, 1, 1);
    }
    // scattered darker dirt smudges around the edges (handled paper)
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(rand() * W);
      const y = Math.floor(rand() * H);
      const r = 12 + Math.floor(rand() * 28);
      const a = 0.04 + rand() * 0.08;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(80, 55, 25, ${a})`);
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // torn-paper darker top edge (very subtle so the slab still reads as
    // intact, but the top has a hand-cut feel)
    ctx.fillStyle = "rgba(40, 30, 18, 0.4)";
    for (let x = 0; x < W; x += 1) {
      const h = 1 + Math.floor(rand() * 3);
      ctx.fillRect(x, 0, 1, h);
    }

    // BIG hand-drawn "01" stamped center-top — like a marker on a
    // sketchbook page. drawn with slight rotation so it feels handmade.
    ctx.save();
    ctx.translate(W * 0.74, H * 0.16);
    ctx.rotate(-0.05);
    ctx.font = `900 200px "Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif`;
    ctx.fillStyle = "#0a0805";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(trackNumber, 0, 0);
    // a small horizontal ink underline below it, also slightly off
    ctx.fillRect(-58, 105, 116, 6);
    ctx.restore();

    // heading — big condensed black, letter-spaced. positioned upper-left
    // so the slab reads top-down: 01 in corner, then the keyword, then body.
    ctx.font = `900 88px "Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif`;
    ctx.fillStyle = "#120a04";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    // letterSpacing is a modern Canvas2D property; falls back where unsupported
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "8px";
    ctx.fillText(upperHeading, 32, H * 0.5);
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "0px";

    // hand-scrawled white spraypaint arrow next to the keyword. a tiny
    // mark with a tour-merch feel.
    ctx.strokeStyle = "rgba(248, 240, 220, 0.85)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W - 110, H * 0.5 - 32);
    ctx.lineTo(W - 60, H * 0.5 - 20);
    ctx.lineTo(W - 80, H * 0.5 - 8);
    ctx.moveTo(W - 60, H * 0.5 - 20);
    ctx.lineTo(W - 84, H * 0.5 - 36);
    ctx.stroke();
  } else if (treatment === "black") {
    // BLACK — pitch black field with a hint of red noise. the keyword
    // explodes across the slab in oversized blood-red Impact, cropping past
    // the edges. raw and aggressive without naming the era it references.
    ctx.fillStyle = "#070306";
    ctx.fillRect(0, 0, W, H);

    // grain — black on black with red bias
    for (let i = 0; i < W * H * 0.04; i++) {
      const x = Math.floor(rand() * W);
      const y = Math.floor(rand() * H);
      const red = rand() > 0.7;
      ctx.fillStyle = red
        ? `rgba(180, 30, 30, ${0.04 + rand() * 0.1})`
        : `rgba(40, 28, 28, ${0.08 + rand() * 0.16})`;
      ctx.fillRect(x, y, 1, 1);
    }
    // small specks of bright red — like splatter
    for (let i = 0; i < 22; i++) {
      const x = Math.floor(rand() * W);
      const y = Math.floor(rand() * H);
      const r = 1 + Math.floor(rand() * 3);
      ctx.fillStyle = `rgba(200, 30, 30, ${0.18 + rand() * 0.4})`;
      ctx.fillRect(x, y, r, r);
    }

    // tiny track number top-left in red — a quiet counterweight to the
    // oversized headline
    ctx.font = `700 36px "Impact", "Arial Narrow Bold", sans-serif`;
    ctx.fillStyle = "#c52525";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(trackNumber, 28, 56);

    // OVERSIZED heading in blood red. font sized to crop. drawn twice for
    // weight, slightly offset for a stamped-press feel.
    ctx.font = `900 200px "Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "-6px";
    // back shadow — slight offset, denser
    ctx.fillStyle = "rgba(60, 6, 6, 0.9)";
    ctx.fillText(upperHeading, W / 2 + 3, H * 0.48 + 3);
    // main fill
    ctx.fillStyle = "#e6212a";
    ctx.fillText(upperHeading, W / 2, H * 0.48);
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "0px";
  } else {
    // CONCRETE — warm cream stone surface with a dark "photo plate"
    // inset (the rectangle where an album-cover image would sit on a
    // back-sleeve). title stamped above the plate in heavy mono caps.
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#d4c8a9");
    grad.addColorStop(0.5, "#c3b693");
    grad.addColorStop(1, "#9c8e6a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // concrete grain
    for (let i = 0; i < W * H * 0.07; i++) {
      const x = Math.floor(rand() * W);
      const y = Math.floor(rand() * H);
      const dark = rand() > 0.5;
      ctx.fillStyle = dark
        ? `rgba(60, 48, 28, ${0.05 + rand() * 0.16})`
        : `rgba(245, 235, 210, ${0.06 + rand() * 0.12})`;
      ctx.fillRect(x, y, 1, 1);
    }
    // long vertical weathering streaks
    for (let i = 0; i < 12; i++) {
      const x = Math.floor(rand() * W);
      const w = 1 + Math.floor(rand() * 2);
      const a = 0.05 + rand() * 0.16;
      const startY = Math.floor(rand() * H * 0.25);
      const endY = startY + Math.floor(H * (0.5 + rand() * 0.45));
      ctx.fillStyle = `rgba(50, 38, 18, ${a})`;
      ctx.fillRect(x, startY, w, Math.min(endY - startY, H - startY));
    }
    // single hairline crack
    {
      ctx.strokeStyle = "rgba(50, 38, 22, 0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      let cx = rand() * W * 0.4 + W * 0.05;
      let cy = rand() * H * 0.3 + H * 0.1;
      ctx.moveTo(cx, cy);
      const segs = 6 + Math.floor(rand() * 4);
      for (let i = 0; i < segs; i++) {
        cx += (rand() - 0.35) * 38;
        cy += 22 + rand() * 36;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // track stamp top-left — a small dark inked label
    {
      const x = 28;
      const y = 28;
      ctx.fillStyle = "rgba(20, 12, 6, 0.88)";
      ctx.fillRect(x, y, 96, 38);
      ctx.fillStyle = "#e7d9b4";
      ctx.font = `800 24px "Impact", "Arial Narrow Bold", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(trackNumber, x + 48, y + 21);
    }

    // photo plate — large dark rectangle inset, where an album cover
    // image would live on a vinyl back. left as a flat dark color so it
    // reads as a placeholder for an absent image, not as a window.
    const plateX = W * 0.16;
    const plateY = H * 0.36;
    const plateW = W * 0.68;
    const plateH = H * 0.34;
    ctx.fillStyle = "rgba(14, 10, 6, 0.92)";
    ctx.fillRect(plateX, plateY, plateW, plateH);
    // tiny rim highlight on top of the plate so it doesn't read as a hole
    ctx.fillStyle = "rgba(220, 200, 168, 0.4)";
    ctx.fillRect(plateX, plateY, plateW, 2);

    // very faint stage-spotlight glow inside the plate, off-center so it
    // suggests an empty stage waiting for a performer
    {
      const cx = plateX + plateW * 0.32;
      const cy = plateY + plateH * 0.6;
      const r = plateW * 0.5;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, "rgba(255, 230, 180, 0.18)");
      g.addColorStop(0.5, "rgba(255, 200, 130, 0.06)");
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(plateX, plateY, plateW, plateH);
    }

    // title stamped over the plate in heavy condensed mono caps. cream on
    // dark — the headline mark for this treatment.
    ctx.font = `900 76px "Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif`;
    ctx.fillStyle = "#f3e7c2";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "10px";
    ctx.fillText(upperHeading, W / 2 + 5, plateY + plateH / 2);
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "0px";
  }

  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// title flash for the arena screen when a section is "entered". two-line
// listening-set layout: large condensed header ("PERFORMANCE 01") above a
// thin // divider and a smaller section title. width matches the regular
// screen texture so swapping is seamless. drawn once per (header, sub) pair.
export function createTitleFlashTexture(
  header: string,
  sub: string,
): THREE.CanvasTexture {
  const W = 1024;
  const H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  // bright cream display surface — matches the new base screen
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#e8dfc8");
  grad.addColorStop(0.18, "#f3ead4");
  grad.addColorStop(0.5, "#faf2dc");
  grad.addColorStop(0.82, "#ece2c6");
  grad.addColorStop(1, "#cbbf9d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // edge bleed — warm pool along the horizontal center so the title sits
  // on a lit-screen field
  {
    const cy = H / 2;
    const rad = ctx.createRadialGradient(W / 2, cy, 20, W / 2, cy, W / 2);
    rad.addColorStop(0, "rgba(255, 240, 200, 0.30)");
    rad.addColorStop(0.6, "rgba(255, 232, 188, 0.10)");
    rad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, W, H);
  }

  // two-line set-list card layout. tiled four times across the cylinder.
  // dark warm ink against the bright cream display surface.
  const headerFontPx = Math.floor(H * 0.4);
  const subFontPx = Math.floor(H * 0.2);
  const upperHeader = header.toUpperCase();
  const upperSub = sub.toUpperCase();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < 4; i++) {
    const x = (W / 4) * (i + 0.5);
    // header — heavy condensed dark warm
    ctx.font = `900 ${headerFontPx}px "Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif`;
    ctx.fillStyle = "#1c1610";
    ctx.shadowColor = "rgba(255, 240, 200, 0.5)";
    ctx.shadowBlur = 14;
    ctx.fillText(upperHeader, x, H * 0.36);
    ctx.shadowBlur = 0;
    // divider — warm dark
    ctx.fillStyle = "rgba(28, 22, 16, 0.55)";
    ctx.fillRect(x - 56, H * 0.58, 112, 1);
    // subhead — slightly softer dark
    ctx.font = `700 ${subFontPx}px "Impact", "Arial Narrow Bold", sans-serif`;
    ctx.fillStyle = "#3a2c1a";
    ctx.shadowColor = "rgba(255, 232, 188, 0.4)";
    ctx.shadowBlur = 10;
    ctx.fillText(`// ${upperSub}`, x, H * 0.76);
    ctx.shadowBlur = 0;
  }
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";

  // faint warm scanlines
  ctx.fillStyle = "rgba(120, 92, 48, 0.05)";
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }

  // bright top trim
  ctx.fillStyle = "rgba(255, 245, 220, 0.95)";
  ctx.fillRect(0, 0, W, 3);

  // darker lower band — structural underside skirt
  const bandTop = Math.floor(H * 0.84);
  const bandGrad = ctx.createLinearGradient(0, bandTop, 0, H);
  bandGrad.addColorStop(0, "rgba(28, 22, 16, 0)");
  bandGrad.addColorStop(0.4, "rgba(28, 22, 16, 0.72)");
  bandGrad.addColorStop(1, "rgba(14, 10, 6, 0.96)");
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, bandTop, W, H - bandTop);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createCharacterTexture(): THREE.CanvasTexture {
  const FRAME = 32;
  const FRAMES = 4;
  const W = FRAME * FRAMES;
  const H = FRAME;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  // transparent bg
  ctx.clearRect(0, 0, W, H);

  // frame 0: arms slightly out, standing
  drawFrame(ctx, 0, 0, "side", "side", "stand");
  // frame 1: left arm up, right arm out, right leg kick
  drawFrame(ctx, FRAME, 0, "up", "out", "kickR");
  // frame 2: both arms out, standing
  drawFrame(ctx, FRAME * 2, 0, "out", "out", "stand");
  // frame 3: right arm up, left arm out, left leg kick
  drawFrame(ctx, FRAME * 3, 0, "out", "up", "kickL");

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// pale blue-gray weathered siding for the contact house — horizontal plank
// seams with dirt streaks, scratches, and pixel grain. wraps horizontally so
// adjacent wall faces share the same canvas seamlessly.
export function createWeatheredSidingTexture(): THREE.CanvasTexture {
  const W = 256;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  // base wash — pale blue-gray, darker toward bottom (water staining)
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#c9d2d8");
  grad.addColorStop(0.5, "#b6bfc6");
  grad.addColorStop(1, "#7a838a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const rand = rng(0x517a4e);

  // horizontal plank seams — every ~26px
  const PLANK_H = 26;
  for (let y = PLANK_H; y < H; y += PLANK_H) {
    ctx.fillStyle = "rgba(40, 50, 56, 0.55)";
    ctx.fillRect(0, y, W, 1);
    ctx.fillStyle = "rgba(230, 235, 240, 0.18)";
    ctx.fillRect(0, y - 1, W, 1);
    // a few nail-head dots
    for (let x = 12; x < W; x += 36 + Math.floor(rand() * 18)) {
      const jx = Math.floor((rand() - 0.5) * 4);
      ctx.fillStyle = "rgba(30, 32, 36, 0.7)";
      ctx.fillRect(x + jx, y - 2, 2, 2);
    }
  }

  // long vertical dirt/rust streaks
  for (let i = 0; i < 24; i++) {
    const x = Math.floor(rand() * W);
    const w = 1 + Math.floor(rand() * 2);
    const a = 0.06 + rand() * 0.22;
    const startY = Math.floor(rand() * H * 0.35);
    const endY = startY + Math.floor(H * (0.4 + rand() * 0.55));
    const warm = rand() > 0.7;
    ctx.fillStyle = warm
      ? `rgba(140, 80, 40, ${a})`
      : `rgba(30, 36, 42, ${a})`;
    ctx.fillRect(x, startY, w, Math.min(endY - startY, H - startY));
  }

  // scratches — short bright/dark scratches across planks
  for (let i = 0; i < 80; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    const w = 4 + Math.floor(rand() * 18);
    const dark = rand() > 0.55;
    ctx.fillStyle = dark
      ? `rgba(30, 36, 42, ${0.1 + rand() * 0.2})`
      : `rgba(240, 245, 250, ${0.06 + rand() * 0.14})`;
    ctx.fillRect(x, y, w, 1);
  }

  // pixel grain
  for (let i = 0; i < W * H * 0.04; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    const dark = rand() > 0.5;
    ctx.fillStyle = dark
      ? `rgba(30, 38, 46, ${0.04 + rand() * 0.14})`
      : `rgba(240, 245, 250, ${0.04 + rand() * 0.1})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // smudge bands near the bottom — water/dirt line
  for (let i = 0; i < 6; i++) {
    const cy = Math.floor(H * (0.78 + rand() * 0.18));
    const cw = 30 + Math.floor(rand() * 80);
    const cx = Math.floor(rand() * W);
    ctx.fillStyle = `rgba(30, 36, 42, ${0.08 + rand() * 0.12})`;
    ctx.fillRect(cx, cy, cw, 2 + Math.floor(rand() * 3));
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// dark patchy shingle roof — overlapping shingle rows, uneven weathering,
// occasional missing/lighter shingles.
export function createRoofShingleTexture(): THREE.CanvasTexture {
  const W = 256;
  const H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  // dark base
  ctx.fillStyle = "#262228";
  ctx.fillRect(0, 0, W, H);

  const rand = rng(0x9a31);

  const SHINGLE_W = 22;
  const SHINGLE_H = 14;
  for (let row = 0; row < Math.ceil(H / SHINGLE_H) + 1; row++) {
    const y = row * SHINGLE_H;
    const stagger = (row % 2) * (SHINGLE_W / 2);
    for (let col = -1; col < Math.ceil(W / SHINGLE_W) + 1; col++) {
      const x = col * SHINGLE_W + stagger;
      // shingle color — varies tile to tile
      const r = rand();
      let fill: string;
      if (r > 0.92) fill = "#5a4838"; // rust patch
      else if (r > 0.8) fill = "#3a3640";
      else if (r > 0.5) fill = "#2b2630";
      else fill = "#1f1c24";
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, SHINGLE_W - 1, SHINGLE_H - 1);
      // subtle highlight on top edge
      ctx.fillStyle = "rgba(220, 220, 230, 0.06)";
      ctx.fillRect(x, y, SHINGLE_W - 1, 1);
      // dark seam at bottom
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(x, y + SHINGLE_H - 1, SHINGLE_W, 1);
    }
  }

  // overall grain
  for (let i = 0; i < W * H * 0.05; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    ctx.fillStyle =
      rand() > 0.5
        ? `rgba(10, 8, 12, ${0.06 + rand() * 0.18})`
        : `rgba(140, 130, 120, ${0.04 + rand() * 0.08})`;
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// muted brown dirt mound — pixel grain over a dark earthy base with darker
// scuff patches and the occasional pebble highlight.
export function createDirtMoundTexture(): THREE.CanvasTexture {
  const W = 256;
  const H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  ctx.fillStyle = "#4a3a2c";
  ctx.fillRect(0, 0, W, H);

  const rand = rng(0x21c8);

  // darker scuff patches
  for (let i = 0; i < 28; i++) {
    const cx = Math.floor(rand() * W);
    const cy = Math.floor(rand() * H);
    const r = 8 + Math.floor(rand() * 22);
    ctx.fillStyle = `rgba(28, 22, 16, ${0.18 + rand() * 0.2})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // lighter dust patches
  for (let i = 0; i < 18; i++) {
    const cx = Math.floor(rand() * W);
    const cy = Math.floor(rand() * H);
    const r = 6 + Math.floor(rand() * 16);
    ctx.fillStyle = `rgba(120, 95, 70, ${0.1 + rand() * 0.15})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // pebble pixels
  for (let i = 0; i < 220; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    const bright = rand() > 0.6;
    ctx.fillStyle = bright
      ? `rgba(180, 160, 130, ${0.3 + rand() * 0.3})`
      : `rgba(20, 16, 12, ${0.2 + rand() * 0.4})`;
    ctx.fillRect(x, y, 1 + Math.floor(rand() * 2), 1 + Math.floor(rand() * 2));
  }

  // grain
  for (let i = 0; i < W * H * 0.08; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    ctx.fillStyle =
      rand() > 0.5
        ? `rgba(20, 16, 12, ${0.05 + rand() * 0.12})`
        : `rgba(130, 100, 70, ${0.04 + rand() * 0.1})`;
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// pale window pane with a grid of mullions and a soft warm interior wash —
// shape mirrors weathered church windows: tall, narrow, 2 columns × 3 rows
// of small panes. gridCols/gridRows let callers swap to a 3×3 attic style.
export function createWindowGlowTexture(
  gridCols: number = 2,
  gridRows: number = 3,
): THREE.CanvasTexture {
  const W = 96;
  const H = 192;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  // pale cool-warm base — interior lit by a single dim bulb, mostly white
  // with a faint warm pool low in the pane
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#e6ecf2");
  grad.addColorStop(0.6, "#e0d8c4");
  grad.addColorStop(1, "#b8a072");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const rand = rng(0xafde + gridCols * 7 + gridRows);

  // faint warm pool low in the pane
  {
    const cx = W * 0.5;
    const cy = H * 0.78;
    const r = W * 0.7;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(255, 200, 130, 0.45)");
    g.addColorStop(1, "rgba(255, 180, 90, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // smudges + dust streaks
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    const w = 4 + Math.floor(rand() * 18);
    ctx.fillStyle =
      rand() > 0.5
        ? `rgba(240, 240, 230, ${0.08 + rand() * 0.12})`
        : `rgba(80, 70, 50, ${0.06 + rand() * 0.1})`;
    ctx.fillRect(x, y, w, 1);
  }
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(rand() * W);
    const startY = Math.floor(rand() * H * 0.3);
    const len = 20 + Math.floor(rand() * 80);
    ctx.fillStyle = `rgba(50, 45, 35, ${0.05 + rand() * 0.08})`;
    ctx.fillRect(x, startY, 1, len);
  }

  // mullion grid — bold dark crossbars dividing the pane
  ctx.fillStyle = "#1e1a14";
  // vertical mullions
  for (let c = 1; c < gridCols; c++) {
    const x = (W * c) / gridCols;
    ctx.fillRect(x - 1, 0, 3, H);
  }
  // horizontal mullions
  for (let r = 1; r < gridRows; r++) {
    const y = (H * r) / gridRows;
    ctx.fillRect(0, y - 1, W, 3);
  }

  // outer frame
  ctx.fillStyle = "#0c0a06";
  ctx.fillRect(0, 0, W, 4);
  ctx.fillRect(0, H - 4, W, 4);
  ctx.fillRect(0, 0, 4, H);
  ctx.fillRect(W - 4, 0, 4, H);

  // a few brighter highlights catching the mullion edges
  ctx.fillStyle = "rgba(255, 240, 210, 0.35)";
  for (let c = 1; c < gridCols; c++) {
    const x = (W * c) / gridCols;
    ctx.fillRect(x + 1, 0, 1, H);
  }
  for (let r = 1; r < gridRows; r++) {
    const y = (H * r) / gridRows;
    ctx.fillRect(0, y + 1, W, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// painterly cloud backdrop for the research bridge environment. broad bands
// of warm coral/orange centered, hot pink + magenta drifting through, with
// lavender and a cool blue wash up top. lobed radial gradients layered with
// faint scanlines + pixel grain so it reads handmade rather than photographic.
export function createResearchSkyTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  // base vertical wash: deep magenta up top fading through coral to a dusky
  // orange at the horizon, then a darker plum at the bottom
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0.0, "#2a0d3a");
  base.addColorStop(0.18, "#5a1d56");
  base.addColorStop(0.42, "#c84a6a");
  base.addColorStop(0.6, "#ff7a55");
  base.addColorStop(0.78, "#ff5a78");
  base.addColorStop(1.0, "#2a0a32");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  const rand = rng(0xb3d61);

  // cool blue cloud band up top
  for (let i = 0; i < 6; i++) {
    const cx = rand() * W;
    const cy = H * 0.05 + rand() * H * 0.18;
    const r = 110 + rand() * 220;
    const a = 0.18 + rand() * 0.22;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(120, 140, 220, ${a})`);
    g.addColorStop(0.6, `rgba(110, 90, 180, ${a * 0.4})`);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // hot pink/magenta plumes — large soft lobes drifting through the middle
  for (let i = 0; i < 14; i++) {
    const cx = rand() * W;
    const cy = H * 0.25 + rand() * H * 0.4;
    const r = 90 + rand() * 200;
    const a = 0.18 + rand() * 0.28;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255, 90, 150, ${a})`);
    g.addColorStop(0.5, `rgba(220, 60, 120, ${a * 0.5})`);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // hot orange/coral pools — concentrated around the middle horizon, brighter
  for (let i = 0; i < 18; i++) {
    const cx = rand() * W;
    const cy = H * 0.4 + rand() * H * 0.3;
    const r = 70 + rand() * 180;
    const a = 0.24 + rand() * 0.32;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255, 200, 130, ${a})`);
    g.addColorStop(0.4, `rgba(255, 130, 80, ${a * 0.7})`);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // lavender / coral wisps for variation
  for (let i = 0; i < 10; i++) {
    const cx = rand() * W;
    const cy = rand() * H;
    const r = 60 + rand() * 140;
    const a = 0.1 + rand() * 0.2;
    const lav = rand() > 0.5;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, lav ? `rgba(200, 170, 230, ${a})` : `rgba(255, 160, 140, ${a})`);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // bright hot core near the middle, sun-burst feel
  {
    const cx = W * 0.5;
    const cy = H * 0.55;
    const r = 220;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(255, 230, 200, 0.55)");
    g.addColorStop(0.4, "rgba(255, 160, 110, 0.28)");
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // faint scanline pattern — soft, every 3px, to give a painted-canvas feel
  ctx.fillStyle = "rgba(20, 8, 30, 0.04)";
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }

  // pixel grain — tiny brighter and darker pixels scattered
  for (let i = 0; i < W * H * 0.02; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    const dark = rand() > 0.5;
    ctx.fillStyle = dark
      ? `rgba(40, 10, 30, ${0.05 + rand() * 0.15})`
      : `rgba(255, 220, 200, ${0.04 + rand() * 0.12})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // a few smoky horizontal smears across the horizon line
  for (let i = 0; i < 5; i++) {
    const y = Math.floor(H * (0.5 + rand() * 0.2));
    const x = Math.floor(rand() * W);
    const w = 200 + Math.floor(rand() * 400);
    ctx.fillStyle = `rgba(255, 180, 120, ${0.05 + rand() * 0.1})`;
    ctx.fillRect(x, y, w, 2 + Math.floor(rand() * 4));
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// dark silhouette of a small standing figure — used inside the research
// bridge so the two figures read as backlit against the cloud backdrop.
// pose param shifts the arm/leg layout slightly so left + right figures
// don't look identical.
export function createSilhouetteTexture(pose: "a" | "b"): THREE.CanvasTexture {
  const W = 64;
  const H = 128;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  ctx.clearRect(0, 0, W, H);

  const ink = "#0b0610";
  const rim = "rgba(255, 150, 90, 0.55)";

  const cx = W / 2;
  ctx.fillStyle = ink;

  // head
  ctx.fillRect(cx - 7, 18, 14, 14);
  // neck
  ctx.fillRect(cx - 3, 32, 6, 4);
  // torso
  ctx.fillRect(cx - 10, 36, 20, 32);
  // hips
  ctx.fillRect(cx - 9, 68, 18, 8);
  // legs (slight stance)
  if (pose === "a") {
    ctx.fillRect(cx - 9, 76, 7, 36);
    ctx.fillRect(cx + 2, 76, 7, 36);
    // shoes
    ctx.fillRect(cx - 11, 110, 9, 4);
    ctx.fillRect(cx + 2, 110, 11, 4);
    // arm forward (mic up)
    ctx.fillRect(cx - 14, 38, 5, 22);
    ctx.fillRect(cx - 18, 38, 6, 6);
    ctx.fillRect(cx + 9, 38, 5, 28);
  } else {
    ctx.fillRect(cx - 9, 76, 7, 36);
    ctx.fillRect(cx + 2, 76, 7, 36);
    ctx.fillRect(cx - 11, 110, 9, 4);
    ctx.fillRect(cx + 2, 110, 11, 4);
    // arms at side, one slightly raised
    ctx.fillRect(cx - 14, 38, 5, 28);
    ctx.fillRect(cx + 9, 38, 5, 24);
    ctx.fillRect(cx + 13, 36, 6, 6);
  }

  // warm rim light along the right edge — single-pixel highlight
  ctx.fillStyle = rim;
  for (let y = 18; y < 114; y++) {
    const data = ctx.getImageData(0, y, W, 1).data;
    let lastInk = -1;
    for (let x = W - 1; x >= 0; x--) {
      const idx = x * 4 + 3;
      if (data[idx]! > 100) {
        lastInk = x;
        break;
      }
    }
    if (lastInk >= 0 && lastInk < W - 1) {
      ctx.fillRect(lastInk + 1, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// canvas-painted titles wrapped around the screen cylinder. each title is
// drawn at the canvas U position corresponding to its angle (cylinder UV 0 =
// +Z = camera-facing, so About at angle 0 lands at canvas x=0).
//
// DM Serif Display: high-contrast Didone display serif. its heavy verticals
// hold up well at this rendering scale and against the curved-cylinder
// foreshortening — the dramatic stroke contrast reads as cinematic-marquee.
const LABELS_W = 4096;
const LABELS_H = 320;
const LABELS_FONT_PX = 140;
const LABELS_LETTER_SPACING_PX = 34;

function paintLabels(canvas: HTMLCanvasElement, fontFamily: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `400 ${LABELS_FONT_PX}px ${fontFamily}, "Times New Roman", serif`;
  // dark warm ink so the titles punch out of the bright cream display
  // surface beneath them, like dark lettering / silhouettes on a lit
  // arena jumbotron face.
  ctx.fillStyle = "#1c1610";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // letterSpacing is a modern Canvas2D property; falls back gracefully where unsupported
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
    `${LABELS_LETTER_SPACING_PX}px`;
  ctx.shadowColor = "rgba(255, 240, 200, 0.65)";
  ctx.shadowBlur = 18;

  const cy = canvas.height / 2;
  for (const section of SECTIONS) {
    const u = section.angle / (Math.PI * 2);
    const x = u * canvas.width;
    const title = section.title.toUpperCase();
    // draw three times so labels straddling the canvas seam render fully
    ctx.fillText(title, x, cy);
    ctx.fillText(title, x + canvas.width, cy);
    ctx.fillText(title, x - canvas.width, cy);
  }
}

export function createLabelsTexture(): {
  texture: THREE.CanvasTexture;
  redraw: () => void;
} {
  const canvas = document.createElement("canvas");
  canvas.width = LABELS_W;
  canvas.height = LABELS_H;

  const readFontFamily = () => {
    if (typeof document === "undefined") return "Georgia";
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-dm-serif")
      .trim();
    return v || "Georgia";
  };

  paintLabels(canvas, readFontFamily());

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  const redraw = () => {
    paintLabels(canvas, readFontFamily());
    texture.needsUpdate = true;
  };

  return { texture, redraw };
}

// ── J-card panel textures ────────────────────────────────────────────
// when a cassette is clicked it unfolds into a 3-panel J-card insert
// (the paper liner real cassettes shipped with). these three textures
// paint the three panels — left (title + tagline), middle (body copy),
// right (credits). they share a paper-cream background so the panels
// read as one continuous liner when seen unfolded.

const JCARD_W = 720;
const JCARD_H = 460;
const CREAM_BG = "#f1e8d2";
const CREAM_SHADOW = "#e5d9be";
const INK_DARK = "#1a1410";
const INK_MID = "#3a2c1c";
const INK_SOFT = "#5a4632";
const ACCENT_RED = "#b13b2a";

function paintPaperBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // base cream with a subtle vertical gradient — cardstock with light
  // catching the top edge.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#f6eedb");
  g.addColorStop(0.5, CREAM_BG);
  g.addColorStop(1, CREAM_SHADOW);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // very faint horizontal paper ruling so the panels read as cardstock
  ctx.fillStyle = "rgba(58, 44, 28, 0.04)";
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }
  // micro grain
  const rand = rng(0x4c2a + Math.floor(w * 13));
  for (let i = 0; i < 280; i++) {
    const x = Math.floor(rand() * w);
    const y = Math.floor(rand() * h);
    ctx.fillStyle = `rgba(58, 44, 28, ${0.02 + rand() * 0.05})`;
    ctx.fillRect(x, y, 1, 1);
  }
  // hairline inset border so the panel reads as a card, not a sticker
  ctx.strokeStyle = "rgba(26, 20, 16, 0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, w - 16, h - 16);
}

// LEFT PANEL — track number, heading, tagline, side label.
// reads like the front of an album liner.
export function createJCardLeftPanelTexture(
  trackIndex: number,
  heading: string,
  tagline: string,
  sideLabel: string,
): THREE.CanvasTexture {
  const W = JCARD_W;
  const H = JCARD_H;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  paintPaperBackground(ctx, W, H);

  const letterSpacingSetter = ctx as CanvasRenderingContext2D & {
    letterSpacing?: string;
  };

  // tiny top metadata row
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 14px "Geist Mono", ui-monospace, monospace`;
  letterSpacingSetter.letterSpacing = "4px";
  ctx.fillText(`OZIEL SAUCEDA  ·  CATALOG`, 36, 36);
  letterSpacingSetter.letterSpacing = "0px";

  // large track number, top-left
  ctx.fillStyle = INK_DARK;
  ctx.font = `900 168px "Times New Roman", "Garamond", serif`;
  ctx.fillText(String(trackIndex + 1).padStart(2, "0"), 32, 70);

  // accent rule under the number
  ctx.fillStyle = ACCENT_RED;
  ctx.fillRect(36, 240, 86, 4);

  // heading — heavy serif, all caps, dropped tracking
  ctx.fillStyle = INK_DARK;
  ctx.font = `700 56px "Times New Roman", "Georgia", serif`;
  letterSpacingSetter.letterSpacing = "6px";
  ctx.fillText(heading.toUpperCase(), 36, 268);
  letterSpacingSetter.letterSpacing = "0px";

  // tagline — italic serif
  ctx.fillStyle = INK_MID;
  ctx.font = `italic 24px "Georgia", "Times New Roman", serif`;
  wrapText(ctx, tagline, 36, 348, W - 72, 30);

  // side label bottom-right — vertical stamp feel
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 13px "Geist Mono", ui-monospace, monospace`;
  letterSpacingSetter.letterSpacing = "3px";
  ctx.textAlign = "right";
  ctx.fillText(sideLabel.toUpperCase(), W - 36, H - 36);
  letterSpacingSetter.letterSpacing = "0px";

  // tiny circle "live" mark next to side label
  ctx.fillStyle = ACCENT_RED;
  ctx.beginPath();
  ctx.arc(W - 36 - ctx.measureText(sideLabel.toUpperCase()).width - 16, H - 30, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";

  return finalizeJCardTexture(canvas);
}

// MIDDLE PANEL — long-form body copy.
export function createJCardCenterPanelTexture(
  body: string,
  heading: string,
): THREE.CanvasTexture {
  const W = JCARD_W;
  const H = JCARD_H;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  paintPaperBackground(ctx, W, H);

  const letterSpacingSetter = ctx as CanvasRenderingContext2D & {
    letterSpacing?: string;
  };

  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // small section label
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 13px "Geist Mono", ui-monospace, monospace`;
  letterSpacingSetter.letterSpacing = "4px";
  ctx.fillText(`// ${heading.toUpperCase()} — LINER NOTES`, 36, 36);
  letterSpacingSetter.letterSpacing = "0px";

  // accent rule
  ctx.fillStyle = INK_DARK;
  ctx.fillRect(36, 64, 64, 2);

  // long-form body copy
  ctx.fillStyle = INK_DARK;
  ctx.font = `400 22px "Georgia", "Times New Roman", serif`;
  wrapText(ctx, body, 36, 96, W - 72, 30);

  // bottom watermark — small serif italic
  ctx.fillStyle = INK_SOFT;
  ctx.font = `italic 14px "Georgia", serif`;
  ctx.fillText(`— continued on the back panel.`, 36, H - 44);

  ctx.textBaseline = "alphabetic";
  return finalizeJCardTexture(canvas);
}

// RIGHT PANEL — credits / details list.
export function createJCardRightPanelTexture(
  credits: string[],
  heading: string,
  ownerName: string,
): THREE.CanvasTexture {
  const W = JCARD_W;
  const H = JCARD_H;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  paintPaperBackground(ctx, W, H);

  const letterSpacingSetter = ctx as CanvasRenderingContext2D & {
    letterSpacing?: string;
  };

  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // section label
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 13px "Geist Mono", ui-monospace, monospace`;
  letterSpacingSetter.letterSpacing = "4px";
  ctx.fillText(`// ${heading.toUpperCase()} — CREDITS`, 36, 36);
  letterSpacingSetter.letterSpacing = "0px";

  ctx.fillStyle = INK_DARK;
  ctx.fillRect(36, 64, 64, 2);

  // bulleted credits list
  ctx.fillStyle = INK_DARK;
  ctx.font = `400 22px "Georgia", "Times New Roman", serif`;
  const startY = 100;
  credits.forEach((line, i) => {
    const y = startY + i * 42;
    // small square bullet
    ctx.fillStyle = ACCENT_RED;
    ctx.fillRect(36, y + 9, 6, 6);
    ctx.fillStyle = INK_DARK;
    ctx.fillText(line, 56, y);
  });

  // signature block bottom-right
  ctx.fillStyle = INK_SOFT;
  ctx.font = `italic 14px "Georgia", serif`;
  ctx.textAlign = "right";
  ctx.fillText("— with care,", W - 36, H - 84);
  ctx.fillStyle = INK_DARK;
  ctx.font = `italic 28px "Georgia", serif`;
  ctx.fillText(ownerName, W - 36, H - 56);

  // small stamp/seal in corner
  ctx.save();
  ctx.translate(60, H - 60);
  ctx.rotate(-0.12);
  ctx.strokeStyle = ACCENT_RED;
  ctx.lineWidth = 2;
  ctx.strokeRect(-32, -16, 64, 32);
  ctx.fillStyle = ACCENT_RED;
  ctx.font = `700 11px "Geist Mono", ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  letterSpacingSetter.letterSpacing = "2px";
  ctx.fillText("ON FILE", 0, 0);
  letterSpacingSetter.letterSpacing = "0px";
  ctx.restore();

  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
  return finalizeJCardTexture(canvas);
}

// shared word-wrap for the J-card panels. respects line breaks in the
// source string and wraps long words at the panel width.
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const paragraphs = text.split("\n");
  let cursorY = y;
  for (const para of paragraphs) {
    const words = para.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, cursorY);
        cursorY += lineHeight;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, x, cursorY);
      cursorY += lineHeight;
    }
  }
}

function finalizeJCardTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
