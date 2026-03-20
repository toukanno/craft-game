import { SimplexNoise } from './noise.js';
import { TILES, TILE_INFO, WORLD_WIDTH, WORLD_HEIGHT, BIOMES } from './constants.js';

export class World {
  constructor(seed) {
    this.seed = seed || Math.floor(Math.random() * 1000000);
    this.width = WORLD_WIDTH;
    this.height = WORLD_HEIGHT;
    this.tiles = new Uint8Array(this.width * this.height);
    this.lightMap = new Float32Array(this.width * this.height);
    this.biomeMap = new Array(this.width * this.height);

    this.noise = new SimplexNoise(this.seed);
    this.biomeNoise = new SimplexNoise(this.seed + 1);
    this.detailNoise = new SimplexNoise(this.seed + 2);

    this.generate();
  }

  generate() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const biome = this.getBiome(x, y);
        this.biomeMap[y * this.width + x] = biome;
        this.tiles[y * this.width + x] = this.generateTile(x, y, biome);
      }
    }
    this.updateLightMap();
  }

  getBiome(x, y) {
    const bx = x * 0.02;
    const by = y * 0.02;
    const temp = this.biomeNoise.fbm(bx, by, 3);
    const moisture = this.biomeNoise.fbm(bx + 100, by + 100, 3);

    if (temp < -0.3) return BIOMES.SNOW;
    if (temp > 0.3 && moisture < -0.1) return BIOMES.DESERT;
    if (temp > 0.1) {
      const elevation = this.noise.fbm(bx * 2, by * 2, 2);
      if (elevation > 0.3) return BIOMES.MOUNTAINS;
    }
    if (moisture > 0.1) return BIOMES.FOREST;
    return BIOMES.PLAINS;
  }

  generateTile(x, y, biome) {
    const nx = x * 0.05;
    const ny = y * 0.05;
    const elevation = this.noise.fbm(nx, ny, 4);
    const detail = this.detailNoise.fbm(nx * 3, ny * 3, 2);

    // Water at low elevations
    if (elevation < -0.35) return TILES.WATER;

    // Biome-specific generation
    switch (biome) {
      case BIOMES.FOREST:
        return this.generateForest(detail, elevation);
      case BIOMES.PLAINS:
        return this.generatePlains(detail, elevation);
      case BIOMES.DESERT:
        return this.generateDesert(detail, elevation);
      case BIOMES.MOUNTAINS:
        return this.generateMountains(detail, elevation);
      case BIOMES.SNOW:
        return this.generateSnow(detail, elevation);
      default:
        return TILES.GRASS;
    }
  }

  generateForest(detail, elevation) {
    if (detail > 0.3) return TILES.TREE;
    if (detail > 0.15) return TILES.TALL_GRASS;
    if (detail > 0.05 && Math.random() < 0.05) return TILES.BERRY_BUSH;
    if (Math.random() < 0.02) return TILES.FLOWER;
    return TILES.GRASS;
  }

  generatePlains(detail, elevation) {
    if (detail > 0.4 && Math.random() < 0.3) return TILES.TREE;
    if (detail > 0.2) return TILES.TALL_GRASS;
    if (Math.random() < 0.03) return TILES.FLOWER;
    if (Math.random() < 0.02) return TILES.BERRY_BUSH;
    return TILES.GRASS;
  }

  generateDesert(detail, elevation) {
    if (detail > 0.4 && Math.random() < 0.1) return TILES.STONE;
    return TILES.SAND;
  }

  generateMountains(detail, elevation) {
    if (elevation > 0.5) {
      if (detail > 0.2 && Math.random() < 0.15) return TILES.IRON_ORE;
      return TILES.DARK_STONE;
    }
    if (detail > 0.3) return TILES.STONE;
    if (detail > 0.1) return TILES.DIRT;
    return TILES.GRASS;
  }

  generateSnow(detail, elevation) {
    if (detail > 0.35 && Math.random() < 0.2) return TILES.TREE;
    if (detail > 0.3) return TILES.STONE;
    return TILES.SNOW;
  }

  getTile(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return TILES.WATER;
    return this.tiles[y * this.width + x];
  }

  setTile(x, y, tile) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.tiles[y * this.width + x] = tile;
    this.updateLightAround(x, y);
  }

  isSolid(x, y) {
    const tile = this.getTile(x, y);
    return TILE_INFO[tile]?.solid || false;
  }

  isPassable(x, y) {
    return !this.isSolid(x, y);
  }

  getLight(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.lightMap[y * this.width + x];
  }

  updateLightMap() {
    // Reset
    this.lightMap.fill(0);

    // Find all light sources
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y * this.width + x];
        const info = TILE_INFO[tile];
        if (info?.light) {
          this.addLight(x, y, info.light);
        }
      }
    }
  }

  updateLightAround(cx, cy) {
    const radius = 10;
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          this.lightMap[y * this.width + x] = 0;
        }
      }
    }
    // Re-add lights in area
    for (let y = cy - radius - 7; y <= cy + radius + 7; y++) {
      for (let x = cx - radius - 7; x <= cx + radius + 7; x++) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          const tile = this.tiles[y * this.width + x];
          const info = TILE_INFO[tile];
          if (info?.light) {
            this.addLight(x, y, info.light);
          }
        }
      }
    }
  }

  addLight(sx, sy, radius) {
    for (let y = sy - radius; y <= sy + radius; y++) {
      for (let x = sx - radius; x <= sx + radius; x++) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          const dist = Math.sqrt((x - sx) ** 2 + (y - sy) ** 2);
          if (dist <= radius) {
            const intensity = 1 - (dist / radius);
            const idx = y * this.width + x;
            this.lightMap[idx] = Math.max(this.lightMap[idx], intensity);
          }
        }
      }
    }
  }

  // Find nearest tile of type within radius
  findNearest(fromX, fromY, tileType, radius = 30) {
    let bestDist = Infinity;
    let bestPos = null;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = Math.floor(fromX) + dx;
        const y = Math.floor(fromY) + dy;
        if (this.getTile(x, y) === tileType) {
          const dist = dx * dx + dy * dy;
          if (dist < bestDist) {
            bestDist = dist;
            bestPos = { x, y };
          }
        }
      }
    }
    return bestPos;
  }

  // Simple A* pathfinding
  findPath(sx, sy, tx, ty, maxSteps = 200) {
    sx = Math.floor(sx);
    sy = Math.floor(sy);
    tx = Math.floor(tx);
    ty = Math.floor(ty);

    if (sx === tx && sy === ty) return [{ x: tx, y: ty }];
    if (this.isSolid(tx, ty)) return null;

    const open = [{ x: sx, y: sy, g: 0, h: 0, f: 0, parent: null }];
    const closed = new Set();
    const key = (x, y) => `${x},${y}`;
    let steps = 0;

    while (open.length > 0 && steps < maxSteps) {
      steps++;
      open.sort((a, b) => a.f - b.f);
      const current = open.shift();

      if (current.x === tx && current.y === ty) {
        const path = [];
        let node = current;
        while (node) {
          path.unshift({ x: node.x, y: node.y });
          node = node.parent;
        }
        return path;
      }

      closed.add(key(current.x, current.y));

      const neighbors = [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
      ];

      for (const n of neighbors) {
        if (closed.has(key(n.x, n.y))) continue;
        if (this.isSolid(n.x, n.y)) continue;

        const g = current.g + 1;
        const h = Math.abs(n.x - tx) + Math.abs(n.y - ty);
        const f = g + h;

        const existing = open.find(o => o.x === n.x && o.y === n.y);
        if (existing) {
          if (g < existing.g) {
            existing.g = g;
            existing.f = f;
            existing.parent = current;
          }
        } else {
          open.push({ x: n.x, y: n.y, g, h, f, parent: current });
        }
      }
    }

    return null; // No path found
  }

  // Get spawn point (find a nice grass area near center)
  getSpawnPoint() {
    const cx = Math.floor(this.width / 2);
    const cy = Math.floor(this.height / 2);

    for (let r = 0; r < 20; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (!this.isSolid(x, y) && this.getTile(x, y) !== TILES.WATER) {
            return { x: x + 0.5, y: y + 0.5 };
          }
        }
      }
    }
    return { x: cx + 0.5, y: cy + 0.5 };
  }
}
