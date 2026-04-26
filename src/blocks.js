// Block definitions for the voxel world.
// Each block has a numeric id and a colored "texture" generated procedurally
// onto a canvas, so we have no external image dependencies.

import * as THREE from 'three';

export const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WOOD: 4,
  LEAVES: 5,
  SAND: 6,
  WATER: 7,
  PLANK: 8,
  BRICK: 9,
  GLASS: 10,
  COBBLE: 11,
  SNOW: 12,
};

// Order matters: this is used for the hotbar display.
export const PLACEABLE_BLOCKS = [
  BLOCK.GRASS,
  BLOCK.DIRT,
  BLOCK.STONE,
  BLOCK.COBBLE,
  BLOCK.WOOD,
  BLOCK.PLANK,
  BLOCK.LEAVES,
  BLOCK.BRICK,
];

// Per-block face palettes. Faces order: [px, nx, py, ny, pz, nz]
// (i.e. right, left, top, bottom, front, back)
const BASE_COLORS = {
  [BLOCK.GRASS]:  { sides: '#7caf42', top: '#5fa83a', bottom: '#83552d', noise: 0.12 },
  [BLOCK.DIRT]:   { sides: '#83552d', top: '#83552d', bottom: '#83552d', noise: 0.18 },
  [BLOCK.STONE]:  { sides: '#888c93', top: '#888c93', bottom: '#888c93', noise: 0.18 },
  [BLOCK.WOOD]:   { sides: '#6b4a26', top: '#a07a48', bottom: '#a07a48', noise: 0.18, ring: true },
  [BLOCK.LEAVES]: { sides: '#3f7a2a', top: '#3f7a2a', bottom: '#3f7a2a', noise: 0.22 },
  [BLOCK.SAND]:   { sides: '#e6d690', top: '#e6d690', bottom: '#e6d690', noise: 0.10 },
  [BLOCK.WATER]:  { sides: '#3a6fb8', top: '#3a6fb8', bottom: '#3a6fb8', noise: 0.06 },
  [BLOCK.PLANK]:  { sides: '#b58a4d', top: '#b58a4d', bottom: '#b58a4d', noise: 0.14, plank: true },
  [BLOCK.BRICK]:  { sides: '#a44a3a', top: '#a44a3a', bottom: '#a44a3a', noise: 0.10, brick: true },
  [BLOCK.GLASS]:  { sides: '#bfeaff', top: '#bfeaff', bottom: '#bfeaff', noise: 0.04, glass: true },
  [BLOCK.COBBLE]: { sides: '#7a7e85', top: '#7a7e85', bottom: '#7a7e85', noise: 0.25, cobble: true },
  [BLOCK.SNOW]:   { sides: '#f4faff', top: '#f4faff', bottom: '#f4faff', noise: 0.06 },
};

export const BLOCK_NAMES = {
  [BLOCK.GRASS]: '草',
  [BLOCK.DIRT]: '土',
  [BLOCK.STONE]: '石',
  [BLOCK.WOOD]: '原木',
  [BLOCK.LEAVES]: '葉',
  [BLOCK.SAND]: '砂',
  [BLOCK.WATER]: '水',
  [BLOCK.PLANK]: '木材',
  [BLOCK.BRICK]: 'レンガ',
  [BLOCK.GLASS]: 'ガラス',
  [BLOCK.COBBLE]: '丸石',
  [BLOCK.SNOW]: '雪',
};

export function isSolid(id) {
  return id !== BLOCK.AIR && id !== BLOCK.WATER;
}

export function isOpaque(id) {
  // For face culling: opaque blocks hide neighbor faces.
  return id !== BLOCK.AIR && id !== BLOCK.WATER && id !== BLOCK.GLASS && id !== BLOCK.LEAVES;
}

export function isTransparent(id) {
  return !isOpaque(id);
}

// ---------------- Texture generation ----------------

const TEX_SIZE = 16;

function hashRand(x, y, seed) {
  let h = (x * 73856093) ^ (y * 19349663) ^ (seed * 83492791);
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 10000) / 10000;
}

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function shade(rgb, amount) {
  return [
    Math.max(0, Math.min(255, rgb[0] + amount)),
    Math.max(0, Math.min(255, rgb[1] + amount)),
    Math.max(0, Math.min(255, rgb[2] + amount)),
  ];
}

function paintFace(ctx, color, opts, faceSeed) {
  const noiseAmt = opts.noise ?? 0.15;
  const base = hexToRgb(color);
  const img = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const r = hashRand(x, y, faceSeed);
      const offset = (r - 0.5) * 255 * noiseAmt;
      const c = shade(base, offset);
      const idx = (y * TEX_SIZE + x) * 4;
      img.data[idx] = c[0];
      img.data[idx + 1] = c[1];
      img.data[idx + 2] = c[2];
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  if (opts.brick) {
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1;
    for (let y = 0; y < TEX_SIZE; y += 5) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(TEX_SIZE, y + 0.5);
      ctx.stroke();
    }
    for (let row = 0; row < TEX_SIZE / 5 + 1; row++) {
      const offset = (row % 2) * 4;
      for (let x = offset; x <= TEX_SIZE; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, row * 5);
        ctx.lineTo(x + 0.5, (row + 1) * 5);
        ctx.stroke();
      }
    }
  }
  if (opts.plank) {
    ctx.strokeStyle = 'rgba(40,20,0,0.6)';
    for (let y = 0; y < TEX_SIZE; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(TEX_SIZE, y + 0.5);
      ctx.stroke();
    }
  }
  if (opts.cobble) {
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    const seed = faceSeed * 7 + 3;
    for (let i = 0; i < 8; i++) {
      const cx = Math.floor(hashRand(i, 0, seed) * TEX_SIZE);
      const cy = Math.floor(hashRand(i, 1, seed) * TEX_SIZE);
      const r = 2 + Math.floor(hashRand(i, 2, seed) * 3);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (opts.ring) {
    ctx.strokeStyle = 'rgba(50,30,10,0.5)';
    ctx.lineWidth = 1;
    for (let r = 2; r < TEX_SIZE; r += 3) {
      ctx.beginPath();
      ctx.arc(TEX_SIZE / 2, TEX_SIZE / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (opts.glass) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, TEX_SIZE - 1, TEX_SIZE - 1);
  }
}

function makeTexture(color, opts, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d');
  paintFace(ctx, color, opts, seed);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Each block id maps to 6 textures (px, nx, py, ny, pz, nz)
export function buildBlockTextures() {
  const textures = {};
  for (const idStr of Object.keys(BASE_COLORS)) {
    const id = Number(idStr);
    const def = BASE_COLORS[id];
    const sideTex = makeTexture(def.sides, def, id * 17 + 1);
    const topTex = makeTexture(def.top, def, id * 17 + 2);
    const botTex = makeTexture(def.bottom, def, id * 17 + 3);
    textures[id] = {
      side: sideTex,
      top: topTex,
      bottom: botTex,
      transparent: isTransparent(id),
      def,
    };
  }
  return textures;
}

// Render a small icon canvas of a block for the hotbar UI.
export function renderBlockIcon(id, size = 32) {
  const def = BASE_COLORS[id];
  if (!def) return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const offCanvas = document.createElement('canvas');
  offCanvas.width = TEX_SIZE;
  offCanvas.height = TEX_SIZE;
  const offCtx = offCanvas.getContext('2d');

  // top face (parallelogram)
  paintFace(offCtx, def.top, def, id * 17 + 2);
  drawParallelogram(ctx, offCanvas, [
    [size * 0.5, size * 0.05],
    [size * 0.95, size * 0.30],
    [size * 0.5, size * 0.55],
    [size * 0.05, size * 0.30],
  ]);

  // left face
  paintFace(offCtx, def.sides, def, id * 17 + 1);
  drawParallelogram(ctx, offCanvas, [
    [size * 0.05, size * 0.30],
    [size * 0.5, size * 0.55],
    [size * 0.5, size * 0.98],
    [size * 0.05, size * 0.73],
  ], 0.85);

  // right face
  paintFace(offCtx, def.sides, def, id * 17 + 1);
  drawParallelogram(ctx, offCanvas, [
    [size * 0.5, size * 0.55],
    [size * 0.95, size * 0.30],
    [size * 0.95, size * 0.73],
    [size * 0.5, size * 0.98],
  ], 0.7);

  return canvas;
}

function drawParallelogram(ctx, srcCanvas, pts, darken = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.clip();
  // simple fill using average color
  const data = srcCanvas.getContext('2d').getImageData(0, 0, TEX_SIZE, TEX_SIZE).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  r = Math.floor((r / n) * darken);
  g = Math.floor((g / n) * darken);
  b = Math.floor((b / n) * darken);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  // bounding box fill
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x; if (y < minY) minY = y;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y;
  }
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
