import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

const BLOCKS = [
  { id: 'grass', color: 0x5aa14f },
  { id: 'dirt', color: 0x7d5537 },
  { id: 'stone', color: 0x888888 },
  { id: 'wood', color: 0x8d6748 },
  { id: 'sand', color: 0xd8c68a },
];

const WORLD_SIZE = 34;
const MAX_HEIGHT = 10;
const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.35;

const canvas = document.getElementById('game');
const overlay = document.getElementById('overlay');
const hotbarEl = document.getElementById('hotbar');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 20, 70);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 120);

const hemi = new THREE.HemisphereLight(0xb8e8ff, 0x567d46, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(20, 35, 8);
sun.castShadow = true;
scene.add(sun);

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const blockMats = Object.fromEntries(BLOCKS.map((b) => [b.id, new THREE.MeshStandardMaterial({ color: b.color })]));

const blocks = new Map();
const blockMeshes = new Map();

function k(x, y, z) {
  return `${x},${y},${z}`;
}

function heightAt(x, z) {
  const nx = x / WORLD_SIZE;
  const nz = z / WORLD_SIZE;
  const hills = Math.sin(nx * Math.PI * 4.5) * 1.8 + Math.cos(nz * Math.PI * 5.2) * 1.5;
  const ridge = Math.sin((nx + nz) * Math.PI * 3) * 1.3;
  return Math.floor(6 + hills + ridge);
}

function blockTypeForLayer(y, h) {
  if (y === h) {
    return h <= 4 ? 'sand' : 'grass';
  }
  if (h - y <= 2) return 'dirt';
  return 'stone';
}

function addBlock(x, y, z, type) {
  const key = k(x, y, z);
  if (blocks.has(key)) return;

  const mesh = new THREE.Mesh(blockGeometry, blockMats[type]);
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.block = { x, y, z, type };
  scene.add(mesh);

  blocks.set(key, { x, y, z, type });
  blockMeshes.set(key, mesh);
}

function removeBlock(x, y, z) {
  const key = k(x, y, z);
  const mesh = blockMeshes.get(key);
  if (!mesh) return false;
  scene.remove(mesh);
  mesh.geometry.dispose();
  blocks.delete(key);
  blockMeshes.delete(key);
  return true;
}

function generateWorld() {
  for (let x = 0; x < WORLD_SIZE; x += 1) {
    for (let z = 0; z < WORLD_SIZE; z += 1) {
      const h = Math.min(MAX_HEIGHT, Math.max(2, heightAt(x, z)));
      for (let y = 0; y <= h; y += 1) {
        addBlock(x, y, z, blockTypeForLayer(y, h));
      }

      if ((x * 13 + z * 7) % 29 === 0 && h > 4) {
        addBlock(x, h + 1, z, 'wood');
      }
    }
  }
}

generateWorld();

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x89c48f }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.001;
ground.receiveShadow = true;
scene.add(ground);

const player = {
  position: new THREE.Vector3(WORLD_SIZE / 2, MAX_HEIGHT + 4, WORLD_SIZE / 2),
  velocity: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  onGround: false,
};

const controls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  down: false,
  jump: false,
};

let selectedBlock = 0;
BLOCKS.forEach((b, i) => {
  const slot = document.createElement('div');
  slot.className = `slot ${i === selectedBlock ? 'active' : ''}`;
  slot.textContent = `${i + 1}:${b.id}`;
  slot.dataset.index = i;
  hotbarEl.appendChild(slot);
});

function updateHotbar() {
  [...hotbarEl.children].forEach((node, idx) => {
    node.classList.toggle('active', idx === selectedBlock);
  });
}

function columnTopY(x, z) {
  let top = -1;
  for (let y = MAX_HEIGHT + 6; y >= 0; y -= 1) {
    if (blocks.has(k(x, y, z))) return y;
    if (y < top) break;
  }
  return top;
}

function clampPlayerToWorld() {
  player.position.x = Math.max(0.5, Math.min(WORLD_SIZE - 0.5, player.position.x));
  player.position.z = Math.max(0.5, Math.min(WORLD_SIZE - 0.5, player.position.z));

  const samples = [
    [0, 0],
    [PLAYER_RADIUS, 0],
    [-PLAYER_RADIUS, 0],
    [0, PLAYER_RADIUS],
    [0, -PLAYER_RADIUS],
  ];

  let maxTop = -1;
  for (const [ox, oz] of samples) {
    const sx = Math.floor(player.position.x + ox);
    const sz = Math.floor(player.position.z + oz);
    maxTop = Math.max(maxTop, columnTopY(sx, sz));
  }

  const floorY = maxTop + 1 + PLAYER_HEIGHT;
  if (player.position.y <= floorY) {
    player.position.y = floorY;
    player.velocity.y = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }
}

const raycaster = new THREE.Raycaster();

function castBlockRay() {
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  return raycaster.intersectObjects([...blockMeshes.values()], false)[0] || null;
}

function destroyTargetedBlock() {
  const hit = castBlockRay();
  if (!hit || hit.distance > 8) return;
  const p = hit.object.userData.block;
  if (p.y <= 0) return;
  removeBlock(p.x, p.y, p.z);
}

function placeBlock() {
  const hit = castBlockRay();
  if (!hit || hit.distance > 8) return;
  const p = hit.object.userData.block;
  const n = hit.face.normal;
  const nx = p.x + Math.round(n.x);
  const ny = p.y + Math.round(n.y);
  const nz = p.z + Math.round(n.z);

  if (ny < 0 || ny > MAX_HEIGHT + 8) return;

  const insidePlayer =
    nx + 1 > player.position.x - PLAYER_RADIUS &&
    nx < player.position.x + PLAYER_RADIUS &&
    nz + 1 > player.position.z - PLAYER_RADIUS &&
    nz < player.position.z + PLAYER_RADIUS &&
    ny < player.position.y &&
    ny + 1 > player.position.y - PLAYER_HEIGHT;

  if (insidePlayer) return;
  addBlock(nx, ny, nz, BLOCKS[selectedBlock].id);
}

let pointerLocked = false;

overlay.addEventListener('click', () => {
  canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
  overlay.style.display = pointerLocked ? 'none' : 'grid';
});

document.addEventListener('mousemove', (e) => {
  if (!pointerLocked) return;
  const sensitivity = 0.0022;
  player.yaw -= e.movementX * sensitivity;
  player.pitch -= e.movementY * sensitivity;
  player.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, player.pitch));
});

window.addEventListener('mousedown', (e) => {
  if (!pointerLocked) return;
  if (e.button === 0) destroyTargetedBlock();
  if (e.button === 2) placeBlock();
});

window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyW') controls.forward = true;
  if (e.code === 'KeyS') controls.backward = true;
  if (e.code === 'KeyA') controls.left = true;
  if (e.code === 'KeyD') controls.right = true;
  if (e.code === 'ShiftLeft') controls.down = true;
  if (e.code === 'Space') controls.jump = true;

  const num = Number(e.key);
  if (num >= 1 && num <= BLOCKS.length) {
    selectedBlock = num - 1;
    updateHotbar();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW') controls.forward = false;
  if (e.code === 'KeyS') controls.backward = false;
  if (e.code === 'KeyA') controls.left = false;
  if (e.code === 'KeyD') controls.right = false;
  if (e.code === 'ShiftLeft') controls.down = false;
  if (e.code === 'Space') controls.jump = false;
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

let prev = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.033, (now - prev) / 1000);
  prev = now;

  const move = new THREE.Vector3();
  if (controls.forward) move.z -= 1;
  if (controls.backward) move.z += 1;
  if (controls.left) move.x -= 1;
  if (controls.right) move.x += 1;

  if (move.lengthSq() > 0) {
    move.normalize();
    const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const speed = 6;
    player.position.addScaledVector(forward, -move.z * speed * dt);
    player.position.addScaledVector(right, move.x * speed * dt);
  }

  if (controls.jump && player.onGround) {
    player.velocity.y = 6.8;
    player.onGround = false;
  }
  if (controls.down && !player.onGround) {
    player.velocity.y -= 10 * dt;
  }

  player.velocity.y -= 18 * dt;
  player.position.y += player.velocity.y * dt;

  clampPlayerToWorld();

  camera.position.copy(player.position);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  renderer.render(scene, camera);
}

animate(prev);
