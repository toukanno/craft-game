// Main game entry — Three.js scene, world, player, hotbar, interaction.
import * as THREE from 'three';
import { World, CHUNK_SIZE } from './world.js';
import { Player } from './player.js';
import {
  BLOCK,
  PLACEABLE_BLOCKS,
  BLOCK_NAMES,
  buildBlockTextures,
  renderBlockIcon,
} from './blocks.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.running = false;
    this.lastTime = 0;
    this.selectedSlot = 0;
    this.hud = document.getElementById('hud');
    this.hotbarEl = document.getElementById('hotbar');
    this.pauseEl = document.getElementById('pause-overlay');
  }

  init() {
    // ---- Renderer ----
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x87ceeb);

    // ---- Scene ----
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, CHUNK_SIZE * 3, CHUNK_SIZE * 6);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(60, 100, 30);
    this.scene.add(sun);
    const hemi = new THREE.HemisphereLight(0x99ccff, 0x4a7a3a, 0.35);
    this.scene.add(hemi);

    // ---- Camera ----
    this.camera = new THREE.PerspectiveCamera(
      72,
      window.innerWidth / window.innerHeight,
      0.1,
      400,
    );

    // ---- World ----
    this.blockTextures = buildBlockTextures();
    this.world = new World(this.scene, this.blockTextures);

    // Pre-generate chunks around spawn so the player has ground to stand on
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) this.world.ensureChunk(dx, dz);
    }
    // Build immediate visible chunks
    for (const chunk of this.world.chunks.values()) {
      this.world.buildChunkMesh(chunk);
    }

    // ---- Player ----
    this.player = new Player(this.camera, this.world, this.canvas);
    // Make sure the camera reflects the spawn position before the first frame,
    // otherwise the camera sits at (0,0,0) — inside the bedrock — and the
    // scene appears as a flat color until the first player update.
    this.player.syncCamera();

    // ---- Block selection wireframe ----
    const wireGeom = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const edges = new THREE.EdgesGeometry(wireGeom);
    this.selectionMesh = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1, transparent: true, opacity: 0.85 }),
    );
    this.selectionMesh.visible = false;
    this.scene.add(this.selectionMesh);

    // ---- UI ----
    this._buildHotbar();
    this._installInteraction();

    window.addEventListener('resize', () => this._onResize());
  }

  _buildHotbar() {
    this.hotbarEl.innerHTML = '';
    PLACEABLE_BLOCKS.forEach((blockId, i) => {
      const slot = document.createElement('div');
      slot.className = 'hotbar-slot' + (i === this.selectedSlot ? ' active' : '');

      const num = document.createElement('div');
      num.className = 'slot-num';
      num.textContent = (i + 1);
      slot.appendChild(num);

      const icon = renderBlockIcon(blockId, 32);
      if (icon) {
        icon.classList.add('slot-icon');
        slot.appendChild(icon);
      }

      const name = document.createElement('div');
      name.className = 'slot-name';
      name.textContent = BLOCK_NAMES[blockId] || '';
      slot.appendChild(name);

      slot.addEventListener('click', () => this._setSlot(i));

      this.hotbarEl.appendChild(slot);
    });
  }

  _setSlot(i) {
    this.selectedSlot = ((i % PLACEABLE_BLOCKS.length) + PLACEABLE_BLOCKS.length) % PLACEABLE_BLOCKS.length;
    [...this.hotbarEl.children].forEach((el, idx) => {
      el.classList.toggle('active', idx === this.selectedSlot);
    });
  }

  _installInteraction() {
    this.canvas.addEventListener('click', () => {
      if (!this.player.locked && this.running) this.player.requestLock();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.player.locked) return;
      if (e.button === 0) this._breakBlock();
      else if (e.button === 2) this._placeBlock();
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('wheel', (e) => {
      if (!this.player.locked) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      this._setSlot(this.selectedSlot + dir);
    }, { passive: true });

    document.addEventListener('keydown', (e) => {
      if (e.code.startsWith('Digit')) {
        const n = Number(e.code.slice(5));
        if (n >= 1 && n <= PLACEABLE_BLOCKS.length) this._setSlot(n - 1);
      }
      if (e.code === 'Escape') {
        // pointer lock release is automatic; show pause overlay
      }
    });

    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.canvas;
      this.pauseEl.classList.toggle('show', !locked && this.running);
    });
  }

  _breakBlock() {
    const hit = this.player.raycastTarget(6);
    if (!hit) return;
    if (hit.id === BLOCK.AIR) return;
    this.world.setBlock(hit.x, hit.y, hit.z, BLOCK.AIR);
  }

  _placeBlock() {
    const hit = this.player.raycastTarget(6);
    if (!hit || !hit.face) return;
    const px = hit.x + hit.face[0];
    const py = hit.y + hit.face[1];
    const pz = hit.z + hit.face[2];
    if (this.world.getBlock(px, py, pz) !== BLOCK.AIR) return;
    if (this.player.wouldIntersectPlayer(px, py, pz)) return;
    const id = PLACEABLE_BLOCKS[this.selectedSlot];
    this.world.setBlock(px, py, pz, id);
  }

  _updateSelection() {
    const hit = this.player.raycastTarget(6);
    if (hit) {
      this.selectionMesh.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      this.selectionMesh.visible = true;
    } else {
      this.selectionMesh.visible = false;
    }
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.player.requestLock();
    this._loop();
  }

  _loop = () => {
    if (!this.running) return;
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    this.lastTime = now;

    this.player.update(dt);
    this.world.update(this.player.position.x, this.player.position.z);
    this._updateSelection();
    this._updateHud();

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._loop);
  };

  _updateHud() {
    const p = this.player.position;
    const id = PLACEABLE_BLOCKS[this.selectedSlot];
    const name = BLOCK_NAMES[id] || '';
    this.hud.textContent =
      `XYZ: ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)}\n` +
      `Chunks: ${this.world.chunks.size}\n` +
      `手持ち: ${name}`;
  }
}
