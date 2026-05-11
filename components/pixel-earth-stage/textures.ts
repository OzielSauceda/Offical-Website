import * as THREE from "three";

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

// chunky continents — not real geography, just blocky shapes that read as land
const CONTINENTS: { x: number; y: number; map: Bitmap }[] = [
  {
    x: 6,
    y: 14,
    map: [
      " ###  ",
      "######",
      "######",
      ".####.",
      " #### ",
      " ###  ",
    ],
  },
  {
    x: 22,
    y: 22,
    map: [
      "  ####  ",
      " ###### ",
      "########",
      "########",
      ".######.",
      " .####  ",
      "  ####  ",
      "   ##   ",
    ],
  },
  {
    x: 50,
    y: 16,
    map: [
      "  ###   ",
      " #####  ",
      " #####  ",
      "  ####. ",
    ],
  },
  {
    x: 60,
    y: 26,
    map: [
      "  ######  ",
      " ######## ",
      "##########",
      "##########",
      ".########.",
      " .######  ",
      "   ####   ",
      "    ##    ",
    ],
  },
  {
    x: 86,
    y: 18,
    map: [
      "  ####  ",
      " ###### ",
      "########",
      " .####. ",
      "  ###   ",
    ],
  },
  {
    x: 100,
    y: 30,
    map: [
      " ####  ",
      "###### ",
      "###### ",
      " ####  ",
    ],
  },
  {
    x: 110,
    y: 20,
    map: [
      " ## ",
      "####",
      "####",
      " ## ",
    ],
  },
  {
    x: 40,
    y: 40,
    map: [
      "  ###   ",
      " #####  ",
      " #####  ",
      "  ###   ",
    ],
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

  // polar caps with jagged edges
  ctx.fillStyle = ICE;
  ctx.fillRect(0, 0, W, 4);
  ctx.fillRect(0, H - 4, W, 4);
  for (let x = 0; x < W; x++) {
    if (rand() > 0.5) ctx.fillRect(x, 4, 1, 1);
    if (rand() > 0.5) ctx.fillRect(x, H - 5, 1, 1);
    if (rand() > 0.75) ctx.fillRect(x, 5, 1, 1);
    if (rand() > 0.75) ctx.fillRect(x, H - 6, 1, 1);
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
