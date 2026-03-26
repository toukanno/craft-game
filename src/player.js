import { PLAYER_SPEED, PLAYER_MAX_HP, PLAYER_MAX_HUNGER, PLAYER_INVENTORY_SIZE,
         PLAYER_REACH, TILE_INFO, ITEMS, INVINCIBILITY_FRAMES } from './constants.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.hp = PLAYER_MAX_HP;
    this.maxHp = PLAYER_MAX_HP;
    this.hunger = PLAYER_MAX_HUNGER;
    this.maxHunger = PLAYER_MAX_HUNGER;
    this.inventory = []; // { item: string, count: number }
    this.selectedSlot = 0;
    this.direction = 'down'; // up, down, left, right
    this.mining = false;
    this.miningProgress = 0;
    this.miningTarget = null;
    this.invincibleTimer = 0;
    this.attackCooldown = 0;
    this.speed = PLAYER_SPEED;
    this.spawnPoint = { x, y }; // Updated when sleeping in a bed

    // Initialize empty inventory
    for (let i = 0; i < PLAYER_INVENTORY_SIZE; i++) {
      this.inventory.push(null);
    }
  }

  update(keys, world, dt) {
    // Movement
    this.vx = 0;
    this.vy = 0;

    if (keys['ArrowUp'] || keys['KeyW']) { this.vy = -1; this.direction = 'up'; }
    if (keys['ArrowDown'] || keys['KeyS']) { this.vy = 1; this.direction = 'down'; }
    if (keys['ArrowLeft'] || keys['KeyA']) { this.vx = -1; this.direction = 'left'; }
    if (keys['ArrowRight'] || keys['KeyD']) { this.vx = 1; this.direction = 'right'; }

    // Normalize diagonal movement
    if (this.vx !== 0 && this.vy !== 0) {
      const len = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      this.vx /= len;
      this.vy /= len;
    }

    // Apply speed
    const newX = this.x + this.vx * this.speed * dt;
    const newY = this.y + this.vy * this.speed * dt;

    // Collision detection
    if (!world.isSolid(Math.floor(newX), Math.floor(this.y))) {
      this.x = newX;
    }
    if (!world.isSolid(Math.floor(this.x), Math.floor(newY))) {
      this.y = newY;
    }

    // Clamp to world bounds
    this.x = Math.max(0.5, Math.min(world.width - 0.5, this.x));
    this.y = Math.max(0.5, Math.min(world.height - 0.5, this.y));

    // Timers
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt * 60;
    if (this.attackCooldown > 0) this.attackCooldown -= dt * 60;

    // Hunger drain
    this.hunger -= dt * 0.15;
    if (this.hunger <= 0) {
      this.hunger = 0;
      this.hp -= dt * 2; // Starving
    } else if (this.hunger > 50) {
      this.hp = Math.min(this.maxHp, this.hp + dt * 0.5); // Regen when well-fed
    }
  }

  getFacingTile() {
    let tx = Math.floor(this.x);
    let ty = Math.floor(this.y);

    switch (this.direction) {
      case 'up': ty -= 1; break;
      case 'down': ty += 1; break;
      case 'left': tx -= 1; break;
      case 'right': tx += 1; break;
    }
    return { x: tx, y: ty };
  }

  canReach(tx, ty) {
    const dx = (tx + 0.5) - this.x;
    const dy = (ty + 0.5) - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= PLAYER_REACH;
  }

  mine(world) {
    const target = this.getFacingTile();
    if (!this.canReach(target.x, target.y)) return;

    const tile = world.getTile(target.x, target.y);
    const info = TILE_INFO[tile];
    if (!info || !info.mineable) return;

    // Check tool requirement
    if (info.tool === 'pickaxe' && !this.hasTool('pickaxe')) return;

    if (!this.miningTarget || this.miningTarget.x !== target.x || this.miningTarget.y !== target.y) {
      this.miningTarget = target;
      this.miningProgress = 0;
    }

    // Tool speed bonus
    let speedMultiplier = 1;
    const tool = this.getEquippedTool();
    if (tool) {
      const toolInfo = ITEMS[tool.item];
      if (toolInfo?.tool === info.tool || toolInfo?.tool === 'axe' && tile === 6) {
        speedMultiplier = 1 + toolInfo.power;
      }
    }

    this.miningProgress += speedMultiplier;
    this.mining = true;

    if (this.miningProgress >= info.time) {
      // Drop item
      if (info.drop) {
        this.addItem(info.drop, 1);
      }
      world.setTile(target.x, target.y, info.drop === 'wood' ? 1 : 0); // Replace with grass or air
      this.miningProgress = 0;
      this.miningTarget = null;
      this.mining = false;
      return true;
    }
    return false;
  }

  stopMining() {
    this.mining = false;
    this.miningProgress = 0;
    this.miningTarget = null;
  }

  placeBlock(world) {
    const target = this.getFacingTile();
    if (!this.canReach(target.x, target.y)) return false;
    if (world.isSolid(target.x, target.y)) return false;

    const slot = this.inventory[this.selectedSlot];
    if (!slot) return false;

    const itemInfo = ITEMS[slot.item];
    if (!itemInfo?.placeTile) return false;

    // Don't place on self
    if (Math.floor(this.x) === target.x && Math.floor(this.y) === target.y) return false;

    world.setTile(target.x, target.y, itemInfo.placeTile);
    this.removeItem(this.selectedSlot, 1);
    return true;
  }

  attack(enemies) {
    if (this.attackCooldown > 0) return;

    const slot = this.inventory[this.selectedSlot];
    let damage = 5; // Fist damage
    if (slot) {
      const info = ITEMS[slot.item];
      if (info?.damage) damage = info.damage;
    }

    const facing = this.getFacingTile();
    const attackRange = 1.8;

    for (const enemy of enemies) {
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= attackRange) {
        enemy.takeDamage(damage, this);
        this.attackCooldown = 20;
        return true;
      }
    }
    return false;
  }

  takeDamage(amount) {
    if (this.invincibleTimer > 0) return;
    this.hp -= amount;
    this.invincibleTimer = INVINCIBILITY_FRAMES;
    if (this.hp <= 0) {
      this.hp = 0;
    }
  }

  eat() {
    // Find food in inventory
    for (let i = 0; i < this.inventory.length; i++) {
      const slot = this.inventory[i];
      if (slot && (slot.item === 'food' || slot.item === 'cooked_food')) {
        const heal = slot.item === 'cooked_food' ? 30 : 15;
        this.hunger = Math.min(this.maxHunger, this.hunger + heal);
        this.hp = Math.min(this.maxHp, this.hp + (slot.item === 'cooked_food' ? 15 : 5));
        this.removeItem(i, 1);
        return true;
      }
    }
    return false;
  }

  addItem(itemId, count = 1) {
    // Stack with existing
    for (let i = 0; i < this.inventory.length; i++) {
      const slot = this.inventory[i];
      if (slot && slot.item === itemId) {
        const maxStack = ITEMS[itemId]?.stackSize || 64;
        const canAdd = Math.min(count, maxStack - slot.count);
        if (canAdd > 0) {
          slot.count += canAdd;
          count -= canAdd;
          if (count <= 0) return true;
        }
      }
    }

    // Find empty slot
    while (count > 0) {
      const emptySlot = this.inventory.findIndex(s => s === null);
      if (emptySlot === -1) return false; // Inventory full
      const maxStack = ITEMS[itemId]?.stackSize || 64;
      const toAdd = Math.min(count, maxStack);
      this.inventory[emptySlot] = { item: itemId, count: toAdd };
      count -= toAdd;
    }
    return true;
  }

  removeItem(slotIndex, count = 1) {
    const slot = this.inventory[slotIndex];
    if (!slot) return false;
    slot.count -= count;
    if (slot.count <= 0) {
      this.inventory[slotIndex] = null;
    }
    return true;
  }

  hasItem(itemId, count = 1) {
    let total = 0;
    for (const slot of this.inventory) {
      if (slot && slot.item === itemId) total += slot.count;
    }
    return total >= count;
  }

  countItem(itemId) {
    let total = 0;
    for (const slot of this.inventory) {
      if (slot && slot.item === itemId) total += slot.count;
    }
    return total;
  }

  removeItemByType(itemId, count) {
    let remaining = count;
    for (let i = 0; i < this.inventory.length && remaining > 0; i++) {
      const slot = this.inventory[i];
      if (slot && slot.item === itemId) {
        const toRemove = Math.min(remaining, slot.count);
        slot.count -= toRemove;
        remaining -= toRemove;
        if (slot.count <= 0) this.inventory[i] = null;
      }
    }
    return remaining <= 0;
  }

  hasTool(toolType) {
    for (const slot of this.inventory) {
      if (slot) {
        const info = ITEMS[slot.item];
        if (info?.tool === toolType) return true;
      }
    }
    return false;
  }

  getEquippedTool() {
    return this.inventory[this.selectedSlot];
  }

  craft(recipe) {
    // Check materials
    for (const [item, count] of Object.entries(recipe.materials)) {
      if (!this.hasItem(item, count)) return false;
    }

    // Remove materials
    for (const [item, count] of Object.entries(recipe.materials)) {
      this.removeItemByType(item, count);
    }

    // Add result
    this.addItem(recipe.result, recipe.amount);
    return true;
  }

  get isAlive() {
    return this.hp > 0;
  }
}
