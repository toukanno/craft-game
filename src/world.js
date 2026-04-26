// Chunk-based voxel world with mesh building and terrain generation.
import * as THREE from 'three';
import { SimplexNoise } from './noise.js';
import { BLOCK, isOpaque, isSolid } from './blocks.js';

export const CHUNK_SIZE = 16;
export const WORLD_HEIGHT = 64;
export const SEA_LEVEL = 20;

// Face direction lookup: order [px, nx, py, ny, pz, nz]
const FACES = [
  { dir: [ 1, 0, 0], corners: [ [1,1,0],[1,0,0],[1,1,1],[1,0,1] ] }, // +X
  { dir: [-1, 0, 0], corners: [ [0,1,1],[0,0,1],[0,1,0],[0,0,0] ] }, // -X
  { dir: [ 0, 1, 0], corners: [ [0,1,1],[1,1,1],[0,1,0],[1,1,0] ] }, // +Y (top)
  { dir: [ 0,-1, 0], corners: [ [0,0,0],[1,0,0],[0,0,1],[1,0,1] ] }, // -Y (bottom)
  { dir: [ 0, 0, 1], corners: [ [1,1,1],[1,0,1],[0,1,1],[0,0,1] ] }, // +Z
  { dir: [ 0, 0,-1], corners: [ [0,1,0],[0,0,0],[1,1,0],[1,0,0] ] }, // -Z
];

const FACE_UVS = [ [0, 1], [0, 0], [1, 1], [1, 0] ];

function chunkKey(cx, cz) { return `${cx},${cz}`; }

export class World {
  constructor(scene, blockTextures, seed = Math.floor(Math.random() * 65536)) {
    this.scene = scene;
    this.blockTextures = blockTextures;
    this.seed = seed;
    this.noise = new SimplexNoise(seed);
    this.treeNoise = new SimplexNoise(seed + 9001);

    this.chunks = new Map();
    this.viewDistance = 5;
  }

  worldToChunk(x, z) {
    return [Math.floor(x / CHUNK_SIZE), Math.floor(z / CHUNK_SIZE)];
  }

  blockIndex(lx, y, lz) {
    return lx + CHUNK_SIZE * (lz + CHUNK_SIZE * y);
  }

  generateChunk(cx, cz) {
    const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT);
    const heightMap = new Int32Array(CHUNK_SIZE * CHUNK_SIZE);

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;

        const continental = this.noise.fbm(wx * 0.008, wz * 0.008, 4, 2, 0.5);
        const detail = this.noise.fbm(wx * 0.04, wz * 0.04, 3, 2, 0.5);
        const h = Math.floor(SEA_LEVEL + continental * 14 + detail * 4);
        const height = Math.max(2, Math.min(WORLD_HEIGHT - 2, h));
        heightMap[lx + lz * CHUNK_SIZE] = height;

        const biomeNoise = this.noise.noise2D(wx * 0.005, wz * 0.005);
        const isSnowy = height > SEA_LEVEL + 12;
        const isSandy = height <= SEA_LEVEL + 1 || biomeNoise > 0.55;

        for (let y = 0; y < height; y++) {
          if (y === 0) blocks[this.blockIndex(lx, y, lz)] = BLOCK.STONE;
          else if (y < height - 4) blocks[this.blockIndex(lx, y, lz)] = BLOCK.STONE;
          else if (y < height - 1) blocks[this.blockIndex(lx, y, lz)] = isSandy ? BLOCK.SAND : BLOCK.DIRT;
          else {
            if (isSnowy) blocks[this.blockIndex(lx, y, lz)] = BLOCK.SNOW;
            else if (isSandy) blocks[this.blockIndex(lx, y, lz)] = BLOCK.SAND;
            else blocks[this.blockIndex(lx, y, lz)] = BLOCK.GRASS;
          }
        }

        if (height < SEA_LEVEL) {
          for (let y = height; y < SEA_LEVEL; y++) {
            blocks[this.blockIndex(lx, y, lz)] = BLOCK.WATER;
          }
        }
      }
    }

    // Trees (deterministic-ish via tree noise)
    for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
      for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        const top = heightMap[lx + lz * CHUNK_SIZE];
        if (top <= SEA_LEVEL || top >= SEA_LEVEL + 12) continue;
        const surfaceId = blocks[this.blockIndex(lx, top - 1, lz)];
        if (surfaceId !== BLOCK.GRASS) continue;
        const r = this.treeNoise.noise2D(wx * 1.13, wz * 1.13);
        const r2 = this.treeNoise.noise2D(wx * 0.31 + 1.3, wz * 0.31 - 0.7);
        if (r > 0.5 && r2 > 0.2) {
          this.spawnTree(blocks, lx, top, lz);
        }
      }
    }

    return { blocks, mesh: null, transparentMesh: null, dirty: true, cx, cz };
  }

  spawnTree(blocks, lx, baseY, lz) {
    const trunkH = 4 + Math.floor((this.treeNoise.noise2D(lx * 7, lz * 7) + 1) * 1.5);
    for (let i = 0; i < trunkH; i++) {
      const y = baseY + i;
      if (y >= WORLD_HEIGHT) break;
      blocks[this.blockIndex(lx, y, lz)] = BLOCK.WOOD;
    }
    const topY = baseY + trunkH;
    const leafLayers = [
      { y: topY - 2, r: 2 },
      { y: topY - 1, r: 2 },
      { y: topY,     r: 1 },
      { y: topY + 1, r: 1 },
    ];
    for (const layer of leafLayers) {
      for (let dx = -layer.r; dx <= layer.r; dx++) {
        for (let dz = -layer.r; dz <= layer.r; dz++) {
          if (Math.abs(dx) === layer.r && Math.abs(dz) === layer.r) {
            const corner = this.treeNoise.noise2D(dx * 5 + lx, dz * 5 + lz);
            if (corner < 0) continue;
          }
          const x = lx + dx, z = lz + dz, y = layer.y;
          if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) continue;
          if (y < 0 || y >= WORLD_HEIGHT) continue;
          const idx = this.blockIndex(x, y, z);
          if (blocks[idx] === BLOCK.AIR) blocks[idx] = BLOCK.LEAVES;
        }
      }
    }
  }

  ensureChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    if (!this.chunks.has(key)) {
      this.chunks.set(key, this.generateChunk(cx, cz));
    }
    return this.chunks.get(key);
  }

  getChunk(cx, cz) {
    return this.chunks.get(chunkKey(cx, cz));
  }

  getBlock(wx, wy, wz) {
    if (wy < 0 || wy >= WORLD_HEIGHT) return BLOCK.AIR;
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return BLOCK.AIR;
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.blocks[this.blockIndex(lx, wy, lz)];
  }

  setBlock(wx, wy, wz, id) {
    if (wy < 0 || wy >= WORLD_HEIGHT) return false;
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.ensureChunk(cx, cz);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const idx = this.blockIndex(lx, wy, lz);
    if (chunk.blocks[idx] === id) return false;
    chunk.blocks[idx] = id;
    chunk.dirty = true;
    if (lx === 0) { const c = this.getChunk(cx - 1, cz); if (c) c.dirty = true; }
    if (lx === CHUNK_SIZE - 1) { const c = this.getChunk(cx + 1, cz); if (c) c.dirty = true; }
    if (lz === 0) { const c = this.getChunk(cx, cz - 1); if (c) c.dirty = true; }
    if (lz === CHUNK_SIZE - 1) { const c = this.getChunk(cx, cz + 1); if (c) c.dirty = true; }
    return true;
  }

  buildChunkMesh(chunk) {
    const opaqueByBlock = new Map();
    const transparentByBlock = new Map();

    const cx = chunk.cx, cz = chunk.cz;

    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const id = chunk.blocks[this.blockIndex(lx, y, lz)];
          if (id === BLOCK.AIR) continue;

          const isTrans = !isOpaque(id);
          const bucket = isTrans ? transparentByBlock : opaqueByBlock;
          if (!bucket.has(id)) {
            bucket.set(id, {
              faces: Array.from({ length: 6 }, () => ({
                positions: [], normals: [], uvs: [], indices: [],
              })),
            });
          }
          const data = bucket.get(id);

          for (let f = 0; f < 6; f++) {
            const dir = FACES[f].dir;
            const wx = cx * CHUNK_SIZE + lx + dir[0];
            const wy = y + dir[1];
            const wz = cz * CHUNK_SIZE + lz + dir[2];
            const neighbor = this.getBlock(wx, wy, wz);

            if (isOpaque(neighbor)) continue;
            if (!isOpaque(id) && neighbor === id) continue;

            const faceData = data.faces[f];
            const baseIndex = faceData.positions.length / 3;
            const corners = FACES[f].corners;
            for (let i = 0; i < 4; i++) {
              const c = corners[i];
              faceData.positions.push(lx + c[0], y + c[1], lz + c[2]);
              faceData.normals.push(dir[0], dir[1], dir[2]);
              faceData.uvs.push(FACE_UVS[i][0], FACE_UVS[i][1]);
            }
            faceData.indices.push(
              baseIndex, baseIndex + 1, baseIndex + 2,
              baseIndex + 2, baseIndex + 1, baseIndex + 3,
            );
          }
        }
      }
    }

    const opaqueGroup = new THREE.Group();
    const transparentGroup = new THREE.Group();

    const buildMeshes = (bucket, group, transparent) => {
      for (const [id, data] of bucket) {
        const tex = this.blockTextures[id];
        if (!tex) continue;
        for (let f = 0; f < 6; f++) {
          const fd = data.faces[f];
          if (fd.positions.length === 0) continue;
          const geom = new THREE.BufferGeometry();
          geom.setAttribute('position', new THREE.Float32BufferAttribute(fd.positions, 3));
          geom.setAttribute('normal', new THREE.Float32BufferAttribute(fd.normals, 3));
          geom.setAttribute('uv', new THREE.Float32BufferAttribute(fd.uvs, 2));
          geom.setIndex(fd.indices);

          let map;
          if (f === 2) map = tex.top;
          else if (f === 3) map = tex.bottom;
          else map = tex.side;

          const matOptions = { map, transparent, side: THREE.FrontSide };
          if (transparent) matOptions.alphaTest = 0.05;
          if (id === BLOCK.WATER) matOptions.opacity = 0.7;
          else if (id === BLOCK.GLASS) matOptions.opacity = 0.5;

          const mat = new THREE.MeshLambertMaterial(matOptions);
          const mesh = new THREE.Mesh(geom, mat);
          mesh.userData = { isChunkMesh: true };
          group.add(mesh);
        }
      }
    };

    buildMeshes(opaqueByBlock, opaqueGroup, false);
    buildMeshes(transparentByBlock, transparentGroup, true);

    const chunkX = chunk.cx * CHUNK_SIZE;
    const chunkZ = chunk.cz * CHUNK_SIZE;
    opaqueGroup.position.set(chunkX, 0, chunkZ);
    transparentGroup.position.set(chunkX, 0, chunkZ);

    if (chunk.mesh) {
      this.scene.remove(chunk.mesh);
      disposeGroup(chunk.mesh);
    }
    if (chunk.transparentMesh) {
      this.scene.remove(chunk.transparentMesh);
      disposeGroup(chunk.transparentMesh);
    }

    chunk.mesh = opaqueGroup;
    chunk.transparentMesh = transparentGroup;
    this.scene.add(opaqueGroup);
    this.scene.add(transparentGroup);
    chunk.dirty = false;
  }

  update(playerX, playerZ) {
    const [pcx, pcz] = this.worldToChunk(playerX, playerZ);
    const vd = this.viewDistance;
    const want = new Set();
    for (let dz = -vd; dz <= vd; dz++) {
      for (let dx = -vd; dx <= vd; dx++) {
        const cx = pcx + dx, cz = pcz + dz;
        want.add(chunkKey(cx, cz));
        this.ensureChunk(cx, cz);
      }
    }
    let built = 0;
    for (const chunk of this.chunks.values()) {
      if (chunk.dirty && built < 2) {
        this.buildChunkMesh(chunk);
        built++;
      }
    }
    for (const [key, chunk] of this.chunks) {
      if (!want.has(key)) {
        const [cx, cz] = key.split(',').map(Number);
        if (Math.abs(cx - pcx) > vd + 2 || Math.abs(cz - pcz) > vd + 2) {
          if (chunk.mesh) { this.scene.remove(chunk.mesh); disposeGroup(chunk.mesh); }
          if (chunk.transparentMesh) { this.scene.remove(chunk.transparentMesh); disposeGroup(chunk.transparentMesh); }
          this.chunks.delete(key);
        }
      }
    }
  }

  // DDA voxel raycast
  raycast(origin, direction, maxDist = 6) {
    const o = origin;
    if (direction.lengthSq() === 0) return null;
    const d = direction.clone().normalize();
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const stepX = d.x > 0 ? 1 : -1;
    const stepY = d.y > 0 ? 1 : -1;
    const stepZ = d.z > 0 ? 1 : -1;

    const tDeltaX = Math.abs(1 / d.x);
    const tDeltaY = Math.abs(1 / d.y);
    const tDeltaZ = Math.abs(1 / d.z);

    const nextBoundary = (origin, step) => step > 0 ? Math.floor(origin) + 1 : Math.floor(origin);
    let tMaxX = (d.x !== 0) ? (nextBoundary(o.x, stepX) - o.x) / d.x : Infinity;
    let tMaxY = (d.y !== 0) ? (nextBoundary(o.y, stepY) - o.y) / d.y : Infinity;
    let tMaxZ = (d.z !== 0) ? (nextBoundary(o.z, stepZ) - o.z) / d.z : Infinity;

    let face = null;
    let t = 0;
    while (t <= maxDist) {
      const id = this.getBlock(x, y, z);
      if (isSolid(id)) {
        return { x, y, z, id, face, distance: t };
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        x += stepX; t = tMaxX; tMaxX += tDeltaX;
        face = [-stepX, 0, 0];
      } else if (tMaxY < tMaxZ) {
        y += stepY; t = tMaxY; tMaxY += tDeltaY;
        face = [0, -stepY, 0];
      } else {
        z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ;
        face = [0, 0, -stepZ];
      }
    }
    return null;
  }
}

function disposeGroup(group) {
  group.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
  });
}
