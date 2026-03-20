import { ENEMY_TYPES, TILES } from './constants.js';

export class Enemy {
  constructor(type, x, y) {
    const info = ENEMY_TYPES[type];
    this.type = type;
    this.x = x;
    this.y = y;
    this.hp = info.hp;
    this.maxHp = info.hp;
    this.damage = info.damage;
    this.speed = info.speed;
    this.color = info.color;
    this.size = info.size;
    this.xp = info.xp;
    this.drops = info.drops;
    this.alive = true;

    this.direction = 'down';
    this.attackCooldown = 0;
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.wanderTimer = 0;
    this.wanderDx = 0;
    this.wanderDy = 0;
    this.aggroRange = 6;
    this.deathTimer = 0;
    this.hurtTimer = 0;
  }

  update(world, player, companion, dt) {
    if (!this.alive) {
      this.deathTimer += dt;
      return;
    }

    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt * 60;

    // Apply knockback
    if (Math.abs(this.knockbackX) > 0.01 || Math.abs(this.knockbackY) > 0.01) {
      const newX = this.x + this.knockbackX * dt * 10;
      const newY = this.y + this.knockbackY * dt * 10;
      if (!world.isSolid(Math.floor(newX), Math.floor(this.y))) this.x = newX;
      if (!world.isSolid(Math.floor(this.x), Math.floor(newY))) this.y = newY;
      this.knockbackX *= 0.85;
      this.knockbackY *= 0.85;
      return;
    }

    // Find nearest target
    const dpx = player.x - this.x;
    const dpy = player.y - this.y;
    const distPlayer = Math.sqrt(dpx * dpx + dpy * dpy);

    const dcx = companion.x - this.x;
    const dcy = companion.y - this.y;
    const distCompanion = Math.sqrt(dcx * dcx + dcy * dcy);

    const targetDist = Math.min(distPlayer, distCompanion);
    const targetX = distPlayer < distCompanion ? player.x : companion.x;
    const targetY = distPlayer < distCompanion ? player.y : companion.y;
    const isPlayer = distPlayer < distCompanion;

    if (targetDist < this.aggroRange) {
      // Chase
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.8) {
        const mx = (dx / dist) * this.speed * dt;
        const my = (dy / dist) * this.speed * dt;
        const newX = this.x + mx;
        const newY = this.y + my;
        if (!world.isSolid(Math.floor(newX), Math.floor(this.y))) this.x = newX;
        if (!world.isSolid(Math.floor(this.x), Math.floor(newY))) this.y = newY;

        if (Math.abs(dx) > Math.abs(dy)) {
          this.direction = dx > 0 ? 'right' : 'left';
        } else {
          this.direction = dy > 0 ? 'down' : 'up';
        }
      } else if (this.attackCooldown <= 0) {
        // Attack
        if (isPlayer) {
          player.takeDamage(this.damage);
        } else {
          companion.hp -= this.damage;
        }
        this.attackCooldown = 40;
      }
    } else {
      // Wander
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 1 + Math.random() * 3;
        const angle = Math.random() * Math.PI * 2;
        this.wanderDx = Math.cos(angle) * 0.5;
        this.wanderDy = Math.sin(angle) * 0.5;
      }

      const newX = this.x + this.wanderDx * this.speed * dt * 0.3;
      const newY = this.y + this.wanderDy * this.speed * dt * 0.3;
      if (!world.isSolid(Math.floor(newX), Math.floor(this.y))) this.x = newX;
      if (!world.isSolid(Math.floor(this.x), Math.floor(newY))) this.y = newY;
    }
  }

  takeDamage(amount, attacker) {
    this.hp -= amount;
    this.hurtTimer = 0.15;

    // Knockback
    const dx = this.x - attacker.x;
    const dy = this.y - attacker.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.knockbackX = (dx / dist) * 0.5;
    this.knockbackY = (dy / dist) * 0.5;

    if (this.hp <= 0) {
      this.alive = false;
      this.deathTimer = 0;
    }
  }

  getDrops() {
    const items = [];
    for (const drop of this.drops) {
      if (Math.random() < drop.chance) {
        items.push({ item: drop.item, count: drop.amount });
      }
    }
    return items;
  }
}

export class EnemyManager {
  constructor() {
    this.enemies = [];
    this.spawnTimer = 0;
    this.maxEnemies = 15;
  }

  update(world, player, companion, timeOfDay, dt) {
    // Spawn enemies at night
    const isNight = timeOfDay > 0.7 || timeOfDay < 0.05;

    if (isNight) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.enemies.filter(e => e.alive).length < this.maxEnemies) {
        this.spawnEnemy(world, player);
        this.spawnTimer = 3 + Math.random() * 5;
      }
    }

    // Update enemies
    for (const enemy of this.enemies) {
      enemy.update(world, player, companion, dt);
    }

    // Collect drops from dead enemies
    const drops = [];
    for (const enemy of this.enemies) {
      if (!enemy.alive && enemy.deathTimer === 0) {
        drops.push(...enemy.getDrops());
      }
    }

    // Remove dead enemies after animation
    this.enemies = this.enemies.filter(e => e.alive || e.deathTimer < 1);

    // Despawn far enemies during day
    if (!isNight) {
      this.enemies = this.enemies.filter(e => {
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        return Math.sqrt(dx * dx + dy * dy) < 20;
      });
    }

    return drops;
  }

  spawnEnemy(world, player) {
    // Spawn at random position around player (but not too close)
    const angle = Math.random() * Math.PI * 2;
    const dist = 12 + Math.random() * 8;
    const x = player.x + Math.cos(angle) * dist;
    const y = player.y + Math.sin(angle) * dist;

    // Check if position is valid
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (world.isSolid(tx, ty)) return;
    if (world.getTile(tx, ty) === 4) return; // No water spawn

    // Check if in lit area
    if (world.getLight(tx, ty) > 0.3) return;

    // Choose enemy type
    const types = ['slime', 'slime', 'slime', 'skeleton', 'wolf'];
    const type = types[Math.floor(Math.random() * types.length)];

    this.enemies.push(new Enemy(type, x, y));
  }

  getAliveEnemies() {
    return this.enemies.filter(e => e.alive);
  }
}
