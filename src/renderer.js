import { TILE_SIZE, TILE_INFO, TILES, ITEMS, ENEMY_TYPES, DAY_LENGTH,
         DAWN_START, DAY_START, DUSK_START, NIGHT_START } from './constants.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = { x: 0, y: 0 };
    this.scale = TILE_SIZE;
    this.viewWidth = 0;
    this.viewHeight = 0;
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.viewWidth = Math.ceil(this.canvas.width / this.scale) + 2;
    this.viewHeight = Math.ceil(this.canvas.height / this.scale) + 2;
  }

  render(game) {
    const { ctx } = this;
    const { world, player, companion, enemyManager, timeOfDay, gameTime } = game;

    // Update camera to follow player
    this.camera.x = player.x - this.canvas.width / (2 * this.scale);
    this.camera.y = player.y - this.canvas.height / (2 * this.scale);

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Calculate visible tile range
    const startX = Math.floor(this.camera.x);
    const startY = Math.floor(this.camera.y);
    const endX = startX + this.viewWidth;
    const endY = startY + this.viewHeight;

    // Draw tiles
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        this.drawTile(world, x, y, timeOfDay);
      }
    }

    // Draw enemies
    for (const enemy of enemyManager.enemies) {
      this.drawEnemy(enemy, gameTime);
    }

    // Draw companion
    this.drawCompanion(companion, gameTime);

    // Draw player
    this.drawPlayer(player, gameTime);

    // Draw companion chat bubble
    if (companion.chatTimer > 0) {
      this.drawChatBubble(companion);
    }

    // Draw mining progress
    if (player.mining && player.miningTarget) {
      this.drawMiningProgress(player);
    }

    // Draw companion work progress
    if (companion.state === 'gather' && companion.gatherTarget) {
      this.drawWorkProgress(companion);
    }

    // Apply night overlay
    this.drawNightOverlay(world, timeOfDay);

    // Draw sleep overlay
    if (game.sleeping) {
      this.drawSleepOverlay(game);
    }

    // Draw UI
    this.drawUI(game);
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.camera.x) * this.scale,
      y: (wy - this.camera.y) * this.scale,
    };
  }

  drawTile(world, x, y, timeOfDay) {
    const tile = world.getTile(x, y);
    const info = TILE_INFO[tile];
    if (!info) return;

    const { x: sx, y: sy } = this.worldToScreen(x, y);
    if (sx < -this.scale || sx > this.canvas.width || sy < -this.scale || sy > this.canvas.height) return;

    const { ctx } = this;

    // Base color
    ctx.fillStyle = info.color;
    ctx.fillRect(sx, sy, this.scale, this.scale);

    // Tile details
    switch (tile) {
      case TILES.TREE:
        this.drawTree(sx, sy);
        break;
      case TILES.BERRY_BUSH:
        this.drawBush(sx, sy);
        break;
      case TILES.WATER:
        this.drawWater(sx, sy, x, y);
        break;
      case TILES.TORCH:
        this.drawTorch(sx, sy);
        break;
      case TILES.CAMPFIRE:
        this.drawCampfire(sx, sy);
        break;
      case TILES.CHEST:
        this.drawChestTile(sx, sy);
        break;
      case TILES.BED:
        this.drawBedTile(sx, sy);
        break;
      case TILES.FLOWER:
        this.drawFlower(sx, sy);
        break;
      case TILES.IRON_ORE:
        this.drawOre(sx, sy);
        break;
    }

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.strokeRect(sx, sy, this.scale, this.scale);
  }

  drawTree(sx, sy) {
    const { ctx } = this;
    const s = this.scale;
    // Trunk
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(sx + s * 0.35, sy + s * 0.5, s * 0.3, s * 0.5);
    // Canopy
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.arc(sx + s * 0.5, sy + s * 0.35, s * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#388E3C';
    ctx.beginPath();
    ctx.arc(sx + s * 0.4, sy + s * 0.3, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBush(sx, sy) {
    const { ctx } = this;
    const s = this.scale;
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(sx + s * 0.5, sy + s * 0.6, s * 0.35, 0, Math.PI * 2);
    ctx.fill();
    // Berries
    ctx.fillStyle = '#E53935';
    for (let i = 0; i < 4; i++) {
      const bx = sx + s * (0.3 + Math.sin(i * 1.5) * 0.2);
      const by = sy + s * (0.5 + Math.cos(i * 1.5) * 0.15);
      ctx.beginPath();
      ctx.arc(bx, by, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawWater(sx, sy, wx, wy) {
    const { ctx } = this;
    const s = this.scale;
    const t = Date.now() * 0.001;
    const wave = Math.sin(wx * 0.5 + t) * 0.1;
    ctx.fillStyle = `rgba(33, 150, 243, ${0.7 + wave})`;
    ctx.fillRect(sx, sy, s, s);
    // Wave highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    const waveX = sx + (Math.sin(wy * 0.7 + t * 1.5) * 0.3 + 0.5) * s;
    ctx.fillRect(waveX, sy + s * 0.3, s * 0.3, s * 0.05);
  }

  drawTorch(sx, sy) {
    const { ctx } = this;
    const s = this.scale;
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(sx + s * 0.42, sy + s * 0.3, s * 0.16, s * 0.55);
    // Flame
    const flicker = Math.sin(Date.now() * 0.01) * 2;
    ctx.fillStyle = '#FF9800';
    ctx.beginPath();
    ctx.arc(sx + s * 0.5, sy + s * 0.25 + flicker, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFEB3B';
    ctx.beginPath();
    ctx.arc(sx + s * 0.5, sy + s * 0.22 + flicker, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCampfire(sx, sy) {
    const { ctx } = this;
    const s = this.scale;
    // Logs
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(sx + s * 0.15, sy + s * 0.6, s * 0.7, s * 0.15);
    ctx.fillRect(sx + s * 0.25, sy + s * 0.5, s * 0.5, s * 0.15);
    // Fire
    const t = Date.now() * 0.005;
    ctx.fillStyle = '#FF5722';
    ctx.beginPath();
    ctx.arc(sx + s * 0.5, sy + s * 0.4 + Math.sin(t) * 2, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF9800';
    ctx.beginPath();
    ctx.arc(sx + s * 0.5, sy + s * 0.35 + Math.cos(t * 1.3) * 2, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF176';
    ctx.beginPath();
    ctx.arc(sx + s * 0.5, sy + s * 0.3 + Math.sin(t * 1.7) * 1, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  drawChestTile(sx, sy) {
    const { ctx } = this;
    const s = this.scale;
    ctx.fillStyle = '#795548';
    ctx.fillRect(sx + s * 0.15, sy + s * 0.3, s * 0.7, s * 0.5);
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(sx + s * 0.15, sy + s * 0.3, s * 0.7, s * 0.15);
    ctx.fillStyle = '#FFD54F';
    ctx.fillRect(sx + s * 0.43, sy + s * 0.42, s * 0.14, s * 0.1);
  }

  drawBedTile(sx, sy) {
    const { ctx } = this;
    const s = this.scale;
    // Frame
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(sx + s * 0.1, sy + s * 0.25, s * 0.8, s * 0.6);
    // Mattress
    ctx.fillStyle = '#E57373';
    ctx.fillRect(sx + s * 0.15, sy + s * 0.3, s * 0.7, s * 0.5);
    // Pillow
    ctx.fillStyle = '#FFECB3';
    ctx.fillRect(sx + s * 0.15, sy + s * 0.3, s * 0.25, s * 0.2);
    // Blanket fold
    ctx.fillStyle = '#C62828';
    ctx.fillRect(sx + s * 0.15, sy + s * 0.55, s * 0.7, s * 0.08);
  }

  drawFlower(sx, sy) {
    const { ctx } = this;
    const s = this.scale;
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(sx + s * 0.45, sy + s * 0.5, s * 0.1, s * 0.35);
    ctx.fillStyle = '#E91E63';
    ctx.beginPath();
    ctx.arc(sx + s * 0.5, sy + s * 0.4, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF176';
    ctx.beginPath();
    ctx.arc(sx + s * 0.5, sy + s * 0.4, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  drawOre(sx, sy) {
    const { ctx } = this;
    const s = this.scale;
    ctx.fillStyle = '#FF8F00';
    ctx.fillRect(sx + s * 0.2, sy + s * 0.3, s * 0.15, s * 0.12);
    ctx.fillRect(sx + s * 0.55, sy + s * 0.5, s * 0.2, s * 0.15);
    ctx.fillRect(sx + s * 0.35, sy + s * 0.65, s * 0.18, s * 0.12);
  }

  drawPlayer(player, gameTime) {
    const { ctx } = this;
    const { x: sx, y: sy } = this.worldToScreen(player.x, player.y);
    const s = this.scale;

    // Blink when invincible
    if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer) % 4 < 2) return;

    // Body
    ctx.fillStyle = '#42A5F5';
    ctx.fillRect(sx - s * 0.3, sy - s * 0.4, s * 0.6, s * 0.7);

    // Head
    ctx.fillStyle = '#FFCC80';
    ctx.beginPath();
    ctx.arc(sx, sy - s * 0.5, s * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#333';
    const eyeOffX = player.direction === 'left' ? -0.08 : player.direction === 'right' ? 0.08 : 0;
    const eyeOffY = player.direction === 'up' ? -0.05 : 0;
    ctx.fillRect(sx - s * 0.1 + eyeOffX * s, sy - s * 0.55 + eyeOffY * s, s * 0.06, s * 0.06);
    ctx.fillRect(sx + s * 0.05 + eyeOffX * s, sy - s * 0.55 + eyeOffY * s, s * 0.06, s * 0.06);

    // Tool in hand
    const equipped = player.inventory[player.selectedSlot];
    if (equipped) {
      const icon = ITEMS[equipped.item]?.icon;
      if (icon) {
        ctx.font = `${s * 0.4}px serif`;
        ctx.fillText(icon, sx + s * 0.2, sy - s * 0.1);
      }
    }

    // Name label
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(10, s * 0.3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Player', sx, sy - s * 0.8);
    ctx.textAlign = 'left';
  }

  drawCompanion(companion, gameTime) {
    const { ctx } = this;
    const { x: sx, y: sy } = this.worldToScreen(companion.x, companion.y);
    const s = this.scale;
    const bob = Math.sin(companion.bobTimer) * 2;

    // Body (pink/magenta for AI companion)
    ctx.fillStyle = '#EC407A';
    ctx.fillRect(sx - s * 0.25, sy - s * 0.35 + bob, s * 0.5, s * 0.6);

    // Head
    ctx.fillStyle = '#FFCC80';
    ctx.beginPath();
    ctx.arc(sx, sy - s * 0.45 + bob, s * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#5C3C10';
    ctx.beginPath();
    ctx.arc(sx, sy - s * 0.52 + bob, s * 0.24, Math.PI, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(sx - s * 0.08, sy - s * 0.48 + bob, s * 0.05, s * 0.05);
    ctx.fillRect(sx + s * 0.04, sy - s * 0.48 + bob, s * 0.05, s * 0.05);

    // State indicator
    let stateColor = '#4CAF50'; // green = idle
    if (companion.state === 'gather') stateColor = '#FF9800';
    if (companion.state === 'build') stateColor = '#2196F3';
    if (companion.state === 'combat') stateColor = '#F44336';
    if (companion.state === 'flee') stateColor = '#9C27B0';

    ctx.fillStyle = stateColor;
    ctx.beginPath();
    ctx.arc(sx + s * 0.25, sy - s * 0.6 + bob, s * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Name
    ctx.fillStyle = '#FFD54F';
    ctx.font = `${Math.max(10, s * 0.3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(companion.name, sx, sy - s * 0.75 + bob);
    ctx.textAlign = 'left';
  }

  drawEnemy(enemy, gameTime) {
    const { ctx } = this;
    const { x: sx, y: sy } = this.worldToScreen(enemy.x, enemy.y);
    const s = this.scale * enemy.size;

    if (!enemy.alive) {
      // Death animation
      ctx.globalAlpha = 1 - enemy.deathTimer;
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(sx, sy, s * 0.4 * (1 + enemy.deathTimer), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    // Hurt flash
    if (enemy.hurtTimer > 0) {
      ctx.fillStyle = '#fff';
    } else {
      ctx.fillStyle = enemy.color;
    }

    if (enemy.type === 'slime') {
      // Bouncy slime
      const bounce = Math.abs(Math.sin(Date.now() * 0.005)) * s * 0.1;
      ctx.beginPath();
      ctx.ellipse(sx, sy - bounce, s * 0.4, s * 0.35 + bounce * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#333';
      ctx.fillRect(sx - s * 0.12, sy - s * 0.15 - bounce, s * 0.08, s * 0.08);
      ctx.fillRect(sx + s * 0.05, sy - s * 0.15 - bounce, s * 0.08, s * 0.08);
    } else if (enemy.type === 'skeleton') {
      // Skeleton body
      ctx.fillRect(sx - s * 0.15, sy - s * 0.35, s * 0.3, s * 0.6);
      ctx.fillStyle = enemy.hurtTimer > 0 ? '#fff' : '#BDBDBD';
      ctx.beginPath();
      ctx.arc(sx, sy - s * 0.4, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      // Eyes (red)
      ctx.fillStyle = '#F44336';
      ctx.fillRect(sx - s * 0.1, sy - s * 0.45, s * 0.06, s * 0.06);
      ctx.fillRect(sx + s * 0.04, sy - s * 0.45, s * 0.06, s * 0.06);
    } else if (enemy.type === 'wolf') {
      // Wolf body
      ctx.fillRect(sx - s * 0.3, sy - s * 0.15, s * 0.6, s * 0.3);
      ctx.beginPath();
      ctx.arc(sx + s * 0.25, sy - s * 0.2, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#FF5722';
      ctx.fillRect(sx + s * 0.2, sy - s * 0.25, s * 0.05, s * 0.05);
    }

    // HP bar
    if (enemy.hp < enemy.maxHp) {
      const barW = s * 0.8;
      const barH = 3;
      const barX = sx - barW / 2;
      const barY = sy - s * 0.6;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#F44336';
      ctx.fillRect(barX, barY, barW * (enemy.hp / enemy.maxHp), barH);
    }
  }

  drawChatBubble(companion) {
    const { ctx } = this;
    const { x: sx, y: sy } = this.worldToScreen(companion.x, companion.y);
    const s = this.scale;

    const text = companion.chatMessage;
    ctx.font = `${Math.max(11, s * 0.35)}px sans-serif`;
    const metrics = ctx.measureText(text);
    const tw = metrics.width + 16;
    const th = s * 0.5;

    const bx = sx - tw / 2;
    const by = sy - s * 1.5;

    // Bubble background
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath();
    ctx.roundRect(bx, by, tw, th, 6);
    ctx.fill();

    // Pointer
    ctx.beginPath();
    ctx.moveTo(sx - 5, by + th);
    ctx.lineTo(sx, by + th + 8);
    ctx.lineTo(sx + 5, by + th);
    ctx.fill();

    // Text
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(text, sx, by + th * 0.7);
    ctx.textAlign = 'left';
  }

  drawMiningProgress(player) {
    const { ctx } = this;
    const target = player.miningTarget;
    const { x: sx, y: sy } = this.worldToScreen(target.x, target.y);
    const s = this.scale;

    const progress = Math.min(1, player.miningProgress / (player.miningTarget ? 30 : 1));

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 2, sy + 2, s - 4, s - 4);

    // Crack overlay
    ctx.fillStyle = `rgba(0,0,0,${progress * 0.5})`;
    ctx.fillRect(sx, sy, s, s);

    // Progress bar
    ctx.fillStyle = '#333';
    ctx.fillRect(sx, sy + s - 4, s, 4);
    ctx.fillStyle = '#FFD54F';
    ctx.fillRect(sx, sy + s - 4, s * progress, 4);
  }

  drawWorkProgress(companion) {
    if (!companion.gatherTarget) return;
    const { ctx } = this;
    const { x: sx, y: sy } = this.worldToScreen(companion.gatherTarget.x, companion.gatherTarget.y);
    const s = this.scale;
    const progress = Math.min(1, companion.workProgress / 30);

    ctx.strokeStyle = '#FFD54F';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, s - 2, s - 2);

    ctx.fillStyle = '#333';
    ctx.fillRect(sx, sy + s - 3, s, 3);
    ctx.fillStyle = '#FF9800';
    ctx.fillRect(sx, sy + s - 3, s * progress, 3);
  }

  drawNightOverlay(world, timeOfDay) {
    const { ctx } = this;

    // Calculate darkness level
    let darkness = 0;
    if (timeOfDay > 0.7) {
      darkness = Math.min(0.7, (timeOfDay - 0.7) * 3.5);
    } else if (timeOfDay < 0.05) {
      darkness = 0.7 - timeOfDay * 14;
    } else if (timeOfDay < 0.2) {
      darkness = 0;
    }

    if (darkness <= 0) return;

    // Apply darkness with light map holes
    const startX = Math.floor(this.camera.x);
    const startY = Math.floor(this.camera.y);

    ctx.fillStyle = `rgba(10, 10, 40, ${darkness})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Cut out lit areas
    if (darkness > 0.1) {
      ctx.globalCompositeOperation = 'destination-out';
      for (let y = startY - 1; y <= startY + this.viewHeight + 1; y++) {
        for (let x = startX - 1; x <= startX + this.viewWidth + 1; x++) {
          const light = world.getLight(x, y);
          if (light > 0) {
            const { x: sx, y: sy } = this.worldToScreen(x + 0.5, y + 0.5);
            const radius = this.scale * 1.5 * light;
            const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
            gradient.addColorStop(0, `rgba(0,0,0,${light * darkness})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(sx, sy, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // Sky color tinting
    if (timeOfDay > 0.58 && timeOfDay < 0.72) {
      // Sunset/dusk - warm orange
      const intensity = 1 - Math.abs(timeOfDay - 0.65) / 0.07;
      ctx.fillStyle = `rgba(255, 100, 30, ${intensity * 0.15})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  drawSleepOverlay(game) {
    const { ctx } = this;
    const progress = Math.min(1, game.sleepTimer / game.sleepDuration);

    // Fade to black, then fade back
    let alpha;
    if (progress < 0.5) {
      alpha = progress * 2; // Fade in
    } else {
      alpha = 1 - (progress - 0.5) * 2; // Fade out
    }

    ctx.fillStyle = `rgba(0, 0, 20, ${alpha * 0.95})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // "Sleeping..." text
    if (alpha > 0.3) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💤 眠っている...', this.canvas.width / 2, this.canvas.height / 2);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }

  drawUI(game) {
    const { ctx } = this;
    const { player, companion, timeOfDay, gameTime } = game;

    // Hotbar
    this.drawHotbar(player);

    // HP and Hunger bars
    this.drawStatusBars(player);

    // Time indicator
    this.drawTimeIndicator(timeOfDay);

    // Companion status
    this.drawCompanionStatus(companion);

    // Minimap
    this.drawMinimap(game);

    // Craft hint
    if (game.showCraftMenu) {
      this.drawCraftMenu(game);
    }
  }

  drawHotbar(player) {
    const { ctx } = this;
    const slotSize = 48;
    const padding = 4;
    const totalWidth = (slotSize + padding) * ITEMS ? 10 : 10; // Show 10 slots
    const startX = (this.canvas.width - 10 * (slotSize + padding)) / 2;
    const startY = this.canvas.height - slotSize - 12;

    for (let i = 0; i < 10; i++) {
      const x = startX + i * (slotSize + padding);
      const y = startY;

      // Slot background
      ctx.fillStyle = i === player.selectedSlot ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, y, slotSize, slotSize);
      ctx.strokeStyle = i === player.selectedSlot ? '#FFD54F' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = i === player.selectedSlot ? 2 : 1;
      ctx.strokeRect(x, y, slotSize, slotSize);

      // Item
      const slot = player.inventory[i];
      if (slot) {
        const itemInfo = ITEMS[slot.item];
        if (itemInfo?.icon) {
          ctx.font = '24px serif';
          ctx.textAlign = 'center';
          ctx.fillText(itemInfo.icon, x + slotSize / 2, y + slotSize / 2 + 4);
          ctx.textAlign = 'left';
        }
        // Count
        if (slot.count > 1) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(slot.count.toString(), x + slotSize - 4, y + slotSize - 4);
          ctx.textAlign = 'left';
        }
      }

      // Slot number
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '10px sans-serif';
      ctx.fillText((i + 1) % 10 + '', x + 3, y + 11);
    }
  }

  drawStatusBars(player) {
    const { ctx } = this;
    const barW = 180;
    const barH = 14;
    const x = 12;
    let y = 12;

    // HP
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = '#F44336';
    ctx.fillRect(x, y, barW * (player.hp / player.maxHp), barH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`HP: ${Math.ceil(player.hp)}/${player.maxHp}`, x + 4, y + 11);
    y += barH + 4;

    // Hunger
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = '#FF9800';
    ctx.fillRect(x, y, barW * (player.hunger / player.maxHunger), barH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`Hunger: ${Math.ceil(player.hunger)}/${player.maxHunger}`, x + 4, y + 11);
  }

  drawTimeIndicator(timeOfDay) {
    const { ctx } = this;
    const x = this.canvas.width - 80;
    const y = 12;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(x, y, 68, 50, 6);
    ctx.fill();

    // Sun/Moon icon
    const isNight = timeOfDay > 0.7 || timeOfDay < 0.05;
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.fillText(isNight ? '🌙' : '☀️', x + 34, y + 22);

    // Time label
    const hours = Math.floor(timeOfDay * 24);
    const mins = Math.floor((timeOfDay * 24 - hours) * 60);
    ctx.fillStyle = '#fff';
    ctx.font = '11px sans-serif';
    ctx.fillText(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`, x + 34, y + 42);
    ctx.textAlign = 'left';
  }

  drawCompanionStatus(companion) {
    const { ctx } = this;
    const x = 12;
    const y = 52;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(x, y, 200, 40, 6);
    ctx.fill();

    // Name and state
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`${companion.name}`, x + 8, y + 16);

    // State
    const stateLabels = {
      idle: '待機中',
      follow: 'ついてくる',
      gather: '採集中',
      build: '建築中',
      combat: '戦闘中',
      flee: '逃走中',
      return_base: '帰還中',
      move: '移動中',
    };
    ctx.fillStyle = '#aaa';
    ctx.font = '11px sans-serif';
    ctx.fillText(stateLabels[companion.state] || companion.state, x + 80, y + 16);

    // HP bar
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x + 8, y + 24, 184, 8);
    ctx.fillStyle = '#EC407A';
    ctx.fillRect(x + 8, y + 24, 184 * (companion.hp / companion.maxHp), 8);
  }

  drawMinimap(game) {
    const { ctx } = this;
    const { world, player, companion } = game;
    const size = 120;
    const x = this.canvas.width - size - 12;
    const y = this.canvas.height - size - 72;
    const scale = size / world.width;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 2, y - 2, size + 4, size + 4);

    // Draw world (sampled)
    const step = Math.max(1, Math.floor(2 / scale));
    for (let wy = 0; wy < world.height; wy += step) {
      for (let wx = 0; wx < world.width; wx += step) {
        const tile = world.getTile(wx, wy);
        const info = TILE_INFO[tile];
        if (info) {
          ctx.fillStyle = info.color;
          ctx.fillRect(x + wx * scale, y + wy * scale,
            Math.max(1, step * scale), Math.max(1, step * scale));
        }
      }
    }

    // Player dot
    ctx.fillStyle = '#42A5F5';
    ctx.beginPath();
    ctx.arc(x + player.x * scale, y + player.y * scale, 3, 0, Math.PI * 2);
    ctx.fill();

    // Companion dot
    ctx.fillStyle = '#EC407A';
    ctx.beginPath();
    ctx.arc(x + companion.x * scale, y + companion.y * scale, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCraftMenu(game) {
    const { ctx } = this;
    const { player, recipes } = game;

    const menuW = 320;
    const menuH = 400;
    const mx = (this.canvas.width - menuW) / 2;
    const my = (this.canvas.height - menuH) / 2;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.beginPath();
    ctx.roundRect(mx, my, menuW, menuH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeRect(mx, my, menuW, menuH);

    // Title
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Crafting / クラフト', mx + menuW / 2, my + 28);
    ctx.textAlign = 'left';

    // Recipes
    let ry = my + 50;
    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      const resultInfo = ITEMS[recipe.result];
      const canCraft = Object.entries(recipe.materials).every(
        ([item, count]) => player.hasItem(item, count)
      );

      const isHovered = game.craftHoverIndex === i;
      if (isHovered) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(mx + 8, ry - 2, menuW - 16, 26);
      }

      // Result
      ctx.fillStyle = canCraft ? '#fff' : '#666';
      ctx.font = '13px sans-serif';
      const icon = resultInfo?.icon || '';
      ctx.fillText(`${icon} ${resultInfo?.name || recipe.result} x${recipe.amount}`, mx + 16, ry + 14);

      // Materials
      ctx.fillStyle = canCraft ? '#aaa' : '#555';
      ctx.font = '11px sans-serif';
      const mats = Object.entries(recipe.materials)
        .map(([item, count]) => `${ITEMS[item]?.name || item}x${count}`)
        .join(', ');
      ctx.fillText(mats, mx + 160, ry + 14);

      ry += 26;
    }

    // Instructions
    ctx.fillStyle = '#888';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click to craft | Press C to close', mx + menuW / 2, my + menuH - 12);
    ctx.textAlign = 'left';
  }
}
