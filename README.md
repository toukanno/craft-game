# Craft World 3D / クラフトワールド3D

**ブラウザで遊べる3Dクラフトゲーム（マインクラフト風）**

A browser-based 3D voxel sandbox built with Three.js. Explore a procedurally
generated world, break and place blocks, and build whatever you want — no
install required.

## Features

- 3D voxel world rendered with Three.js
- Chunk-based procedural terrain (Simplex noise + biomes)
- Trees, beaches, snowy peaks, lakes
- First-person controls with mouse-look (Pointer Lock API)
- AABB physics with gravity, jumping and per-axis collision
- Block breaking (left-click) and placing (right-click) with DDA voxel raycast
- Hotbar with 8 placeable block types
- Block-target wireframe highlight
- Streaming chunk load/unload around the player

## Controls

| Key / Mouse | Action |
|-------------|--------|
| `W` `A` `S` `D` / Arrow keys | Move |
| `Space` | Jump |
| `Shift` | Sprint |
| Mouse | Look around |
| Left click | Break block |
| Right click | Place block |
| `1`〜`8` | Select hotbar slot |
| Mouse wheel | Cycle hotbar |
| `Esc` | Release pointer / pause |

## How to Run

No build step. Serve the directory with any static file server, then open
`index.html` in a browser:

```bash
# Option 1: npm script
npm start

# Option 2: any static server
npx serve .
python3 -m http.server 8000
```

> Three.js is loaded from a CDN via an `<script type="importmap">`, so an
> internet connection is required on first load.

## Architecture

```
src/
├── noise.js   # Simplex noise (terrain + tree placement)
├── blocks.js  # Block ids, names, procedural textures, hotbar icons
├── world.js   # Chunk generation, mesh building (face culling), DDA raycast
├── player.js  # First-person camera, AABB physics, input, pointer lock
└── main.js    # Three.js scene, lighting, hotbar UI, click handlers, loop
```

### Implementation notes

- **Chunks** are 16×16 columns of 64-block-tall voxels, stored as flat
  `Uint8Array`s. Each chunk owns one `THREE.Group` of meshes — one per
  (block id, face direction) so a single texture can repeat per face — and is
  rebuilt on the next frame whenever a block changes.
- **Face culling** skips faces whose neighbour is opaque, dropping the
  vertex/face count by an order of magnitude vs. naive cubes.
- **Targeting** uses an Amanatides–Woo (DDA) voxel raycast to find the first
  solid block under the crosshair, plus the face hit (for placement).
- **Player physics** is a simple AABB swept along each axis independently —
  enough for stable wall sliding and standing on edges.

## Tech Stack

- Three.js 0.160 (loaded via CDN import map)
- Pure ES Modules — no bundler, no build step
