import { COMPANION_SPEED, COMPANION_FOLLOW_DIST, COMPANION_WORK_RANGE,
         TILES, TILE_INFO, ITEMS } from './constants.js';

// AI Companion - the core differentiator
export class Companion {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.name = 'アイリ'; // Airi
    this.personality = 'cheerful';
    this.hp = 80;
    this.maxHp = 80;

    // State machine
    this.state = 'idle'; // idle, follow, gather, build, combat, flee, store, move
    this.previousState = 'idle';

    // Task system
    this.currentTask = null;
    this.taskQueue = [];
    this.path = null;
    this.pathIndex = 0;

    // Inventory (10 slots)
    this.inventory = new Array(10).fill(null);

    // Memory
    this.memory = [];
    this.messageLog = [];
    this.mood = 'happy'; // happy, worried, excited, tired

    // Movement
    this.speed = COMPANION_SPEED;
    this.direction = 'down';

    // Work
    this.workTarget = null;
    this.workProgress = 0;
    this.gatherTarget = null;

    // Combat
    this.attackCooldown = 0;

    // Chat
    this.chatMessage = '';
    this.chatTimer = 0;

    // Animation
    this.bobTimer = 0;
  }

  update(world, player, enemies, dt) {
    this.bobTimer += dt * 3;
    if (this.chatTimer > 0) this.chatTimer -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt * 60;

    switch (this.state) {
      case 'idle':
      case 'follow':
        this.doFollow(player, dt, world);
        break;
      case 'gather':
        this.doGather(world, player, dt);
        break;
      case 'build':
        this.doBuild(world, player, dt);
        break;
      case 'combat':
        this.doCombat(enemies, player, dt, world);
        break;
      case 'flee':
        this.doFlee(enemies, player, dt, world);
        break;
      case 'move':
        this.doMove(world, dt);
        break;
      case 'return_base':
        this.doReturnBase(world, player, dt);
        break;
    }

    // Auto-combat when enemies are close and not fleeing
    if (this.state !== 'flee' && this.state !== 'combat') {
      const nearestEnemy = this.findNearestEnemy(enemies);
      if (nearestEnemy && nearestEnemy.dist < 3) {
        this.previousState = this.state;
        this.state = 'combat';
        this.say('敵だ！気をつけて！');
      }
    }
  }

  doFollow(player, dt, world) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > COMPANION_FOLLOW_DIST) {
      const speed = dist > 6 ? this.speed * 1.5 : this.speed;
      const mx = (dx / dist) * speed * dt;
      const my = (dy / dist) * speed * dt;

      const newX = this.x + mx;
      const newY = this.y + my;

      if (!world.isSolid(Math.floor(newX), Math.floor(this.y))) this.x = newX;
      if (!world.isSolid(Math.floor(this.x), Math.floor(newY))) this.y = newY;

      this.updateDirection(dx, dy);
    }
  }

  doGather(world, player, dt) {
    if (!this.gatherTarget) {
      // Find target resource
      const targetTile = this.currentTask?.tileType ?? TILES.TREE;
      const found = world.findNearest(this.x, this.y, targetTile, 25);

      if (!found) {
        this.say('見つからないみたい...');
        this.state = 'follow';
        this.currentTask = null;
        return;
      }
      this.gatherTarget = found;
      this.path = world.findPath(Math.floor(this.x), Math.floor(this.y), found.x, found.y);
      this.pathIndex = 0;
    }

    // Move to target
    if (this.gatherTarget) {
      const dx = this.gatherTarget.x + 0.5 - this.x;
      const dy = this.gatherTarget.y + 0.5 - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= COMPANION_WORK_RANGE) {
        // Mine the tile
        const tile = world.getTile(this.gatherTarget.x, this.gatherTarget.y);
        const info = TILE_INFO[tile];

        if (!info || !info.mineable) {
          this.gatherTarget = null;
          return;
        }

        this.workProgress += 1.2;
        if (this.workProgress >= info.time) {
          if (info.drop) {
            this.addItem(info.drop, 1);
          }
          world.setTile(this.gatherTarget.x, this.gatherTarget.y,
            info.drop === 'wood' ? TILES.GRASS : TILES.AIR);
          this.workProgress = 0;
          this.gatherTarget = null;

          // Check if task has a count
          if (this.currentTask) {
            this.currentTask.gathered = (this.currentTask.gathered || 0) + 1;
            if (this.currentTask.count && this.currentTask.gathered >= this.currentTask.count) {
              this.say('集め終わったよ！');
              this.transferItemsToPlayer(player);
              this.state = 'follow';
              this.currentTask = null;
              return;
            }
          }

          // Check inventory full
          if (this.isInventoryFull()) {
            this.say('持ちきれない！アイテムを渡すね。');
            this.transferItemsToPlayer(player);
          }
        }
      } else {
        // Walk towards target
        this.moveTowards(this.gatherTarget.x + 0.5, this.gatherTarget.y + 0.5, dt, world);
      }
    }
  }

  doBuild(world, player, dt) {
    if (!this.currentTask?.blueprint) {
      this.say('何を建てればいいかな？');
      this.state = 'follow';
      return;
    }

    const bp = this.currentTask.blueprint;
    const ox = this.currentTask.originX;
    const oy = this.currentTask.originY;

    // Find next block to place
    let target = null;
    for (const block of bp) {
      const tx = ox + block.dx;
      const ty = oy + block.dy;
      if (world.getTile(tx, ty) !== block.tile) {
        target = { x: tx, y: ty, tile: block.tile };
        break;
      }
    }

    if (!target) {
      this.say('建築完了！');
      this.state = 'follow';
      this.currentTask = null;
      return;
    }

    const dx = target.x + 0.5 - this.x;
    const dy = target.y + 0.5 - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= COMPANION_WORK_RANGE) {
      this.workProgress += 2;
      if (this.workProgress >= 15) {
        world.setTile(target.x, target.y, target.tile);
        this.workProgress = 0;
      }
    } else {
      this.moveTowards(target.x + 0.5, target.y + 0.5, dt, world);
    }
  }

  doCombat(enemies, player, dt, world) {
    const nearest = this.findNearestEnemy(enemies);
    if (!nearest || nearest.dist > 8) {
      this.state = this.previousState || 'follow';
      return;
    }

    if (nearest.dist <= 1.5) {
      // Attack
      if (this.attackCooldown <= 0) {
        nearest.enemy.takeDamage(10, this);
        this.attackCooldown = 25;
      }
    } else {
      // Move towards enemy
      this.moveTowards(nearest.enemy.x, nearest.enemy.y, dt, world);
    }
  }

  doFlee(enemies, player, dt, world) {
    // Run towards player
    this.moveTowards(player.x, player.y, dt * 1.3, world);

    const nearest = this.findNearestEnemy(enemies);
    if (!nearest || nearest.dist > 10) {
      this.state = 'follow';
      this.say('もう安全かな...');
    }
  }

  doMove(world, dt) {
    if (!this.currentTask?.target) {
      this.state = 'follow';
      return;
    }

    const target = this.currentTask.target;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      this.say('着いたよ！');
      this.state = 'follow';
      this.currentTask = null;
    } else {
      this.moveTowards(target.x, target.y, dt, world);
    }
  }

  doReturnBase(world, player, dt) {
    // Just go to player for now (base = player)
    this.doFollow(player, dt, world);
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    if (Math.sqrt(dx * dx + dy * dy) < 2) {
      this.say('戻ってきたよ！');
      this.transferItemsToPlayer(player);
      this.state = 'follow';
      this.currentTask = null;
    }
  }

  // === Command Processing ===

  processCommand(text, player, world) {
    const cmd = text.toLowerCase().trim();
    this.memory.push({ command: text, time: Date.now() });

    // Gather commands
    if (this.matchCommand(cmd, ['木を集めて', 'gather wood', 'collect wood', '木を切って', '木'])) {
      return this.startGather(TILES.TREE, 'wood', 10, '了解！木を集めてくるよ！');
    }
    if (this.matchCommand(cmd, ['石を掘って', 'mine stone', 'gather stone', '石を集めて', '石'])) {
      return this.startGather(TILES.STONE, 'stone', 10, '石を探してくるね！');
    }
    if (this.matchCommand(cmd, ['鉄を探して', 'find iron', 'mine iron', '鉄'])) {
      return this.startGather(TILES.IRON_ORE, 'iron', 5, '鉄鉱石を探してくる！');
    }
    if (this.matchCommand(cmd, ['食べ物', 'food', 'berry', 'ベリー', '食料'])) {
      return this.startGather(TILES.BERRY_BUSH, 'food', 5, 'ベリーを集めてくるよ！');
    }
    if (this.matchCommand(cmd, ['草を集めて', 'gather fiber', 'fiber', '繊維'])) {
      return this.startGather(TILES.TALL_GRASS, 'fiber', 15, '繊維を集めるね！');
    }

    // Build commands
    if (this.matchCommand(cmd, ['家を建てて', 'build house', 'build a house', '家'])) {
      return this.startBuildHouse(player, world);
    }
    if (this.matchCommand(cmd, ['壁を作って', 'build wall', 'build walls', '壁'])) {
      return this.startBuildWalls(player, world);
    }

    // Movement commands
    if (this.matchCommand(cmd, ['拠点に戻って', 'return base', 'come back', '戻って'])) {
      this.state = 'return_base';
      this.say('拠点に戻るよ！');
      return this.createResponse('return_base', ['move_to_player', 'transfer_items'], '拠点に戻るよ！');
    }
    if (this.matchCommand(cmd, ['ついてきて', 'follow me', 'follow', 'come'])) {
      this.state = 'follow';
      this.currentTask = null;
      this.say('了解、ついていくよ！');
      return this.createResponse('follow', ['follow_player'], '了解、ついていくよ！');
    }

    // Combat commands
    if (this.matchCommand(cmd, ['敵を倒して', 'fight', 'attack', '戦って', '敵'])) {
      this.state = 'combat';
      this.say('任せて！戦うよ！');
      return this.createResponse('combat', ['find_enemy', 'attack'], '任せて！戦うよ！');
    }
    if (this.matchCommand(cmd, ['逃げて', 'flee', 'run', '避けて'])) {
      this.state = 'flee';
      this.say('逃げるよ！');
      return this.createResponse('flee', ['run_to_safety'], '逃げるよ！');
    }

    // Status
    if (this.matchCommand(cmd, ['状態', 'status', '元気', 'how are you', '調子'])) {
      const status = this.getStatusMessage();
      this.say(status);
      return this.createResponse('status', [], status);
    }

    // Default
    this.say('うーん、よくわからないな... 「木を集めて」「家を建てて」みたいに言ってみて！');
    return this.createResponse('unknown', [], 'コマンドがわからなかった');
  }

  matchCommand(input, patterns) {
    return patterns.some(p => input.includes(p));
  }

  startGather(tileType, resource, count, message) {
    this.state = 'gather';
    this.gatherTarget = null;
    this.workProgress = 0;
    this.currentTask = { type: 'gather', tileType, resource, count, gathered: 0 };
    this.say(message);
    return this.createResponse('gather_' + resource,
      ['move_to_resource', 'harvest', 'return_base'], message);
  }

  startBuildHouse(player, world) {
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);

    // Simple house blueprint (5x5 walls with door)
    const blueprint = [];
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (Math.abs(dx) === 2 || Math.abs(dy) === 2) {
          // Door at front
          if (dx === 0 && dy === 2) continue;
          blueprint.push({ dx: dx + 3, dy: dy + 3, tile: TILES.WOOD_WALL });
        }
      }
    }
    // Floor
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        blueprint.push({ dx: dx + 3, dy: dy + 3, tile: TILES.WOOD_PLANK });
      }
    }
    // Torch inside
    blueprint.push({ dx: 3, dy: 3, tile: TILES.TORCH });

    this.state = 'build';
    this.workProgress = 0;
    this.currentTask = {
      type: 'build',
      blueprint,
      originX: px,
      originY: py,
    };
    this.say('了解！家を建てるよ！');
    return this.createResponse('build_house',
      ['plan_layout', 'gather_materials', 'place_blocks'], '了解！家を建てるよ！');
  }

  startBuildWalls(player, world) {
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);

    const blueprint = [];
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        if (Math.abs(dx) === 3 || Math.abs(dy) === 3) {
          if (dx === 0 && dy === 3) continue; // Door
          blueprint.push({ dx, dy, tile: TILES.WOOD_WALL });
        }
      }
    }

    this.state = 'build';
    this.workProgress = 0;
    this.currentTask = { type: 'build', blueprint, originX: px, originY: py };
    this.say('壁を作るね！');
    return this.createResponse('build_walls',
      ['plan_perimeter', 'place_walls'], '壁を作るね！');
  }

  createResponse(task, steps, message) {
    return {
      task,
      steps,
      message,
    };
  }

  // === Helper Methods ===

  moveTowards(tx, ty, dt, world) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.1) return;

    const mx = (dx / dist) * this.speed * dt;
    const my = (dy / dist) * this.speed * dt;

    const newX = this.x + mx;
    const newY = this.y + my;

    if (!world.isSolid(Math.floor(newX), Math.floor(this.y))) this.x = newX;
    if (!world.isSolid(Math.floor(this.x), Math.floor(newY))) this.y = newY;

    this.updateDirection(dx, dy);
  }

  updateDirection(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
      this.direction = dx > 0 ? 'right' : 'left';
    } else {
      this.direction = dy > 0 ? 'down' : 'up';
    }
  }

  findNearestEnemy(enemies) {
    let nearest = null;
    let minDist = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = { enemy: e, dist };
      }
    }
    return nearest;
  }

  addItem(itemId, count = 1) {
    for (let i = 0; i < this.inventory.length; i++) {
      if (this.inventory[i] && this.inventory[i].item === itemId) {
        this.inventory[i].count += count;
        return true;
      }
    }
    const empty = this.inventory.findIndex(s => s === null);
    if (empty !== -1) {
      this.inventory[empty] = { item: itemId, count };
      return true;
    }
    return false;
  }

  isInventoryFull() {
    return this.inventory.every(s => s !== null);
  }

  transferItemsToPlayer(player) {
    for (let i = 0; i < this.inventory.length; i++) {
      if (this.inventory[i]) {
        player.addItem(this.inventory[i].item, this.inventory[i].count);
        this.inventory[i] = null;
      }
    }
  }

  say(message) {
    this.chatMessage = message;
    this.chatTimer = 4; // Show for 4 seconds
    this.messageLog.push({ text: message, time: Date.now() });
    if (this.messageLog.length > 50) this.messageLog.shift();
  }

  getStatusMessage() {
    const hpPct = Math.round((this.hp / this.maxHp) * 100);
    const items = this.inventory.filter(s => s !== null)
      .map(s => `${ITEMS[s.item]?.name || s.item}x${s.count}`).join(', ');

    let status = `HP: ${hpPct}%`;
    if (this.state !== 'idle' && this.state !== 'follow') {
      status += ` | ${this.state}中`;
    }
    if (items) status += ` | 持ち物: ${items}`;

    if (hpPct > 70) return `元気だよ！ ${status}`;
    if (hpPct > 30) return `ちょっと疲れてきた... ${status}`;
    return `かなりキツい... ${status}`;
  }
}
