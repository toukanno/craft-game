// First-person voxel player: pointer-lock camera + AABB physics + block interaction.
import * as THREE from 'three';
import { isSolid, BLOCK } from './blocks.js';
import { WORLD_HEIGHT } from './world.js';

const GRAVITY = 28;
const JUMP_VELOCITY = 9.2;
const WALK_SPEED = 4.8;
const RUN_SPEED = 7.6;
const MAX_FALL_SPEED = 50;

// Player AABB extents around the camera position
const HALF_W = 0.3;
const HEAD_HEIGHT = 0.2;   // distance from camera (eyes) to top of head
const FEET_DROP = 1.6;     // distance from camera down to feet

export class Player {
  constructor(camera, world, domElement) {
    this.camera = camera;
    this.world = world;
    this.dom = domElement;

    this.position = new THREE.Vector3(0, WORLD_HEIGHT - 5, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.onGround = false;

    this.yaw = 0;
    this.pitch = 0;

    this.keys = new Set();
    this.mouseSensitivity = 0.0022;
    this.locked = false;
    this.running = false;

    this.placeCooldown = 0;
    this.breakCooldown = 0;

    this._tmpVec = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();

    this._installInput();
    this._spawn();
  }

  _spawn() {
    // Find a safe surface above sea level around (0,0)
    for (let y = WORLD_HEIGHT - 1; y > 0; y--) {
      const id = this.world.getBlock(0, y, 0);
      if (isSolid(id)) {
        this.position.set(0.5, y + 2.5, 0.5);
        return;
      }
    }
    this.position.set(0.5, WORLD_HEIGHT - 5, 0.5);
  }

  _installInput() {
    document.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      this.running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    });
    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * this.mouseSensitivity;
      this.pitch -= e.movementY * this.mouseSensitivity;
      const limit = Math.PI / 2 - 0.01;
      if (this.pitch > limit) this.pitch = limit;
      if (this.pitch < -limit) this.pitch = -limit;
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
    });

    // Prevent stuck movement when focus/pointer lock is lost
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.running = false;
    });

  }

  requestLock() {
    this.dom.requestPointerLock?.();
  }

  // Forward direction in the XZ plane based on yaw
  getForward(out = this._forward) {
    out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    return out;
  }

  getRight(out = this._right) {
    out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    return out;
  }

  getLookDirection(out = new THREE.Vector3()) {
    out.set(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    return out;
  }

  update(dt) {
    if (this.placeCooldown > 0) this.placeCooldown -= dt;
    if (this.breakCooldown > 0) this.breakCooldown -= dt;

    // ----- Compute desired horizontal motion -----
    const wish = this._tmpVec.set(0, 0, 0);
    const fwd = this.getForward();
    const right = this.getRight();
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) wish.add(fwd);
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) wish.sub(fwd);
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) wish.add(right);
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize();

    const speed = this.running ? RUN_SPEED : WALK_SPEED;
    this.velocity.x = wish.x * speed;
    this.velocity.z = wish.z * speed;

    // ----- Vertical (gravity / jump) -----
    if (this.keys.has('Space') && this.onGround) {
      this.velocity.y = JUMP_VELOCITY;
      this.onGround = false;
    }
    this.velocity.y -= GRAVITY * dt;
    if (this.velocity.y < -MAX_FALL_SPEED) this.velocity.y = -MAX_FALL_SPEED;

    // ----- Apply with collision (axis by axis) -----
    this._moveAxis('x', this.velocity.x * dt);
    this._moveAxis('z', this.velocity.z * dt);
    const collidedY = this._moveAxis('y', this.velocity.y * dt);
    if (collidedY) {
      if (this.velocity.y < 0) this.onGround = true;
      this.velocity.y = 0;
    } else {
      this.onGround = false;
    }

    // Anti-fall floor
    if (this.position.y < -10) {
      this._spawn();
      this.velocity.set(0, 0, 0);
    }

    // ----- Sync camera -----
    this.camera.position.copy(this.position);
    const dir = this.getLookDirection();
    this.camera.lookAt(
      this.position.x + dir.x,
      this.position.y + dir.y,
      this.position.z + dir.z,
    );
  }

  _moveAxis(axis, delta) {
    if (delta === 0) return false;
    const newPos = this.position.clone();
    newPos[axis] += delta;
    if (!this._collides(newPos)) {
      this.position[axis] = newPos[axis];
      return false;
    }
    // Try smaller steps until contact (one block)
    const step = Math.sign(delta) * 0.05;
    let moved = 0;
    while (Math.abs(moved + step) <= Math.abs(delta)) {
      const test = this.position.clone();
      test[axis] += step;
      if (this._collides(test)) break;
      this.position[axis] = test[axis];
      moved += step;
    }
    return true;
  }

  _collides(pos) {
    // AABB: from (pos.x-HALF_W, pos.y-FEET_DROP, pos.z-HALF_W)
    //         to (pos.x+HALF_W, pos.y+HEAD_HEIGHT, pos.z+HALF_W)
    const minX = Math.floor(pos.x - HALF_W);
    const maxX = Math.floor(pos.x + HALF_W);
    const minY = Math.floor(pos.y - FEET_DROP);
    const maxY = Math.floor(pos.y + HEAD_HEIGHT);
    const minZ = Math.floor(pos.z - HALF_W);
    const maxZ = Math.floor(pos.z + HALF_W);

    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          if (isSolid(this.world.getBlock(x, y, z))) return true;
        }
      }
    }
    return false;
  }

  // ---------- Block targeting ----------
  raycastTarget(maxDist = 6) {
    return this.world.raycast(
      this.position.clone(),
      this.getLookDirection(),
      maxDist,
    );
  }

  // Return true if a position would intersect the player (so we don't place blocks inside ourselves)
  wouldIntersectPlayer(bx, by, bz) {
    const minX = bx, maxX = bx + 1;
    const minY = by, maxY = by + 1;
    const minZ = bz, maxZ = bz + 1;
    const pminX = this.position.x - HALF_W;
    const pmaxX = this.position.x + HALF_W;
    const pminY = this.position.y - FEET_DROP;
    const pmaxY = this.position.y + HEAD_HEIGHT;
    const pminZ = this.position.z - HALF_W;
    const pmaxZ = this.position.z + HALF_W;
    return (pmaxX > minX && pminX < maxX
         && pmaxY > minY && pminY < maxY
         && pmaxZ > minZ && pminZ < maxZ);
  }
}
