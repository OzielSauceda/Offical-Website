import * as THREE from "three";

import { SECTIONS } from "@/lib/sections";

const OCEAN = "#1b3a6f";
const OCEAN_DARK = "#142a52";
const OCEAN_LIGHT = "#274a85";
const LAND = "#2f7a3d";
const LAND_DARK = "#1f5a2a";
const LAND_LIGHT = "#56a85b";
const ICE = "#e8edf5";
const NIGHT_HIGHLIGHT = "#f7d96a";

// tiny deterministic prng so the texture is stable across reloads
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

type Bitmap = string[];

function paintBitmap(
  ctx: CanvasRenderingContext2D,
  bitmap: Bitmap,
  ox: number,
  oy: number,
  fill: string,
  shade: string,
) {
  for (let y = 0; y < bitmap.length; y++) {
    const row = bitmap[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === "#") {
        ctx.fillStyle = fill;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      } else if (ch === ".") {
        ctx.fillStyle = shade;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }
}

// recognizable continent silhouettes laid out as if the 128×64 canvas were an
// equirectangular world map (x = longitude 0-360°, y = 90°N-90°S, atlantic-centered).
// '#' = land, '.' = darker land shading along coastal pixels.
const CONTINENTS: { x: number; y: number; map: Bitmap }[] = [
  // Greenland
  {
    x: 38,
    y: 4,
    map: [
      "  ####  ",
      " ###### ",
      " ###### ",
      " ######.",
      "  ####. ",
      "   ##.  ",
    ],
  },
  // Iceland
  {
    x: 48,
    y: 12,
    map: ["##.", ".#."],
  },
  // North America
  {
    x: 7,
    y: 8,
    map: [
      "     ###   ###",
      "    ##### #####",
      "   ###############",
      "  ##################",
      "  ###################",
      " ####################",
      " ####################",
      "  ##################.",
      "   ################",
      "    ##############",
      "     ############",
      "      ##########",
      "       ########",
      "        ######",
      "         ####",
      "         #####",
      "          ####",
      "          #####",
      "           ####",
      "            ###",
      "            ##",
    ],
  },
  // South America
  {
    x: 27,
    y: 28,
    map: [
      "    #####",
      "   #######",
      "   #######",
      "    ######",
      "    ######",
      "    #####.",
      "    #####",
      "    ####",
      "    ####",
      "    ###",
      "    ###",
      "    ###",
      "     ##",
      "     ##",
      "     ##",
      "     #.",
      "     #",
      "     .",
    ],
  },
  // Europe (incl. British Isles + Scandinavia)
  {
    x: 49,
    y: 13,
    map: [
      "         ##",
      "    #   ###  ",
      "   ## ## ## ##",
      "   #############",
      "  ##############",
      "  ############.",
      "   #########.",
      "    ######",
    ],
  },
  // Africa
  {
    x: 56,
    y: 21,
    map: [
      "   ########",
      "  ###########",
      " #############",
      " #############",
      " #############",
      "  ############",
      "  ###########",
      "   ##########",
      "   #########",
      "   ########.",
      "    #######",
      "    #######",
      "    ######.",
      "    ######",
      "    ######",
      "    #####.",
      "    ####.",
      "    ####",
      "    ###",
      "    ##",
      "     #",
    ],
  },
  // Madagascar
  {
    x: 72,
    y: 38,
    map: ["#", "#", "#", "#", "#"],
  },
  // Asia + Russia (Siberia stretching east)
  {
    x: 64,
    y: 10,
    map: [
      "     ##################",
      "    ####################",
      "   #####################",
      "  #######################",
      " ########################",
      " #########################",
      "  ########################",
      "   ########################",
      "    ########################",
      "    ########################",
      "     ######################",
      "      ###################",
      "       ###############",
      "        ##########",
      "         #######",
    ],
  },
  // Arabian peninsula
  {
    x: 70,
    y: 24,
    map: [
      "######",
      " ######",
      "  ######",
      "  ######",
      "   ####",
      "    ##",
    ],
  },
  // India
  {
    x: 84,
    y: 22,
    map: [
      "  ########",
      " ##########",
      " ##########",
      "  ########",
      "  ########",
      "   ######",
      "   ######",
      "   #####.",
      "   ####",
      "    ###",
      "    ##",
      "     #",
    ],
  },
  // Indochina
  {
    x: 95,
    y: 26,
    map: [
      "######",
      " #####",
      " #####",
      "  ####",
      "   ###",
      "    ##",
      "    ##",
    ],
  },
  // Japan
  {
    x: 110,
    y: 18,
    map: ["##", "##", " ##", "  ##", "   ##", "   #"],
  },
  // Indonesia + Philippines (island arc)
  {
    x: 93,
    y: 33,
    map: [
      "  ##  ## ## #",
      " ####  ### # ",
      "  ##.  ##",
      "   ##",
      "    .",
    ],
  },
  // Australia
  {
    x: 99,
    y: 37,
    map: [
      "  ######",
      " ##########",
      "############",
      "############",
      " ##########",
      "  #######",
      "    ####",
    ],
  },
  // New Zealand
  {
    x: 115,
    y: 44,
    map: ["##", " ##", "  #"],
  },
];

export function createEarthTexture(): THREE.CanvasTexture {
  const W = 128;
  const H = 64;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");

  // base ocean
  ctx.fillStyle = OCEAN;
  ctx.fillRect(0, 0, W, H);

  const rand = rng(0xc0ffee);

  // ocean variation — darker patches
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    const w = 2 + Math.floor(rand() * 4);
    const h = 1 + Math.floor(rand() * 2);
    ctx.fillStyle = rand() > 0.5 ? OCEAN_DARK : OCEAN_LIGHT;
    ctx.fillRect(x, y, w, h);
  }

  // small north-polar ice cap. southern cap is unused (only the northern
  // hemisphere of this canvas is sampled by the upper-hemisphere dome — see
  // the offset/repeat tx on the returned texture).
  ctx.fillStyle = ICE;
  ctx.fillRect(0, 0, W, 1);
  for (let x = 0; x < W; x++) {
    if (rand() > 0.55) ctx.fillRect(x, 1, 1, 1);
    if (rand() > 0.8) ctx.fillRect(x, 2, 1, 1);
  }

  // continents
  for (const c of CONTINENTS) {
    paintBitmap(ctx, c.map, c.x, c.y, LAND, LAND_DARK);
  }

  // a few highlight pixels for "city lights" feel
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(rand() * W);
    const y = 12 + Math.floor(rand() * 40);
    ctx.fillStyle = NIGHT_HIGHLIGHT;
    ctx.fillRect(x, y, 1, 1);
  }

  // a few brighter land pixels for variation
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(rand() * W);
    const y = 10 + Math.floor(rand() * 44);
    // only paint over land
    const px = ctx.getImageData(x, y, 1, 1).data;
    const isLand = px[0]! < 100 && px[1]! > 90 && px[2]! < 100;
    if (isLand) {
      ctx.fillStyle = LAND_LIGHT;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  // upper-hemisphere geometry still uses the full uv.y range [0,1] — without
  // this remap the bottom of the canvas (south-pole region) renders at the
  // equator silhouette of the dome, producing a white band. offset+repeat=0.5
  // restricts sampling to the top half of the canvas (northern hemisphere).
  tex.offset.set(0, 0.5);
  tex.repeat.set(1, 0.5);
  tex.needsUpdate = true;
  return tex;
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

  // vertical gradient — deep cool blue framing, warmer in the middle
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0a0b1a");
  grad.addColorStop(0.18, "#1b2050");
  grad.addColorStop(0.5, "#3a4a8a");
  grad.addColorStop(0.82, "#1b2050");
  grad.addColorStop(1, "#0a0b1a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // pooled warm light around the circumference — six spots, evenly placed
  const POOLS = 6;
  for (let i = 0; i < POOLS; i++) {
    const cx = (W / POOLS) * (i + 0.5);
    const cy = H * 0.5;
    const rad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 120);
    const warm = i % 2 === 0 ? "rgba(255, 180, 140, 0.55)" : "rgba(180, 200, 255, 0.55)";
    rad.addColorStop(0, warm);
    rad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(cx - 140, cy - 140, 280, 280);
  }

  // horizontal scanlines — faint, every 4px
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 1);
  }

  // top + bottom emissive trim
  ctx.fillStyle = "rgba(220, 230, 255, 0.55)";
  ctx.fillRect(0, 0, W, 2);
  ctx.fillRect(0, H - 2, W, 2);

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

// canvas-painted titles wrapped around the screen cylinder. each title is
// drawn at the canvas U position corresponding to its angle (cylinder UV 0 =
// +Z = camera-facing, so About at angle 0 lands at canvas x=0).
//
// DM Serif Display: high-contrast Didone display serif. its heavy verticals
// hold up well at this rendering scale and against the curved-cylinder
// foreshortening — the dramatic stroke contrast reads as cinematic-marquee.
const LABELS_W = 4096;
const LABELS_H = 320;
const LABELS_FONT_PX = 132;
const LABELS_LETTER_SPACING_PX = 30;

function paintLabels(canvas: HTMLCanvasElement, fontFamily: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `400 ${LABELS_FONT_PX}px ${fontFamily}, "Times New Roman", serif`;
  ctx.fillStyle = "#f3f6ff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // letterSpacing is a modern Canvas2D property; falls back gracefully where unsupported
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
    `${LABELS_LETTER_SPACING_PX}px`;
  ctx.shadowColor = "rgba(6, 4, 18, 0.95)";
  ctx.shadowBlur = 22;

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
