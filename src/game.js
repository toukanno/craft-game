import { World } from './world.js';
import { Player } from './player.js';
import { Companion } from './companion.js';
import { EnemyManager } from './enemies.js';
import { Renderer } from './renderer.js';
import { RECIPES, ITEMS, DAY_LENGTH } from './constants.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);

    // Game state
    this.world = new World();
    const spawn = this.world.getSpawnPoint();
    this.player = new Player(spawn.x, spawn.y);
    this.companion = new Companion(spawn.x + 1, spawn.y + 1);
    this.enemyManager = new EnemyManager();
    this.recipes = RECIPES;

    // Time
    this.gameTime = 0;
    this.timeOfDay = 0.25; // Start at morning
    this.dayCount = 1;

    // Input
    this.keys = {};
    this.mouseX = 0;
    this.mouseY = 0;

    // UI state
    this.showCraftMenu = false;
    this.craftHoverIndex = -1;
    this.showChat = false;
    this.chatInput = '';
    this.messageHistory = [];
    this.paused = false;

    // Give starter items
    this.player.addItem('wood', 10);
    this.player.addItem('stone', 5);
    this.player.addItem('food', 5);

    // Companion intro
    setTimeout(() => {
      this.companion.say('こんにちは！一緒にがんばろう！');
      this.addMessage('system', `${this.companion.name}が仲間になった！`);
      this.addMessage('system', 'WASD: 移動 | Space: 採掘 | E: 食べる | C: クラフト');
      this.addMessage('system', '1-0: アイテム選択 | Q: 設置 | Enter: AI相棒に話す');
    }, 500);

    this.setupInput();
    this.lastTime = performance.now();
    this.running = true;
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (this.showChat) {
        if (e.key === 'Enter') {
          this.sendChat();
        } else if (e.key === 'Escape') {
          this.showChat = false;
          this.chatInput = '';
        } else if (e.key === 'Backspace') {
          this.chatInput = this.chatInput.slice(0, -1);
        } else if (e.key.length === 1) {
          this.chatInput += e.key;
        }
        e.preventDefault();
        return;
      }

      if (this.showCraftMenu) {
        if (e.code === 'KeyC' || e.code === 'Escape') {
          this.showCraftMenu = false;
        }
        e.preventDefault();
        return;
      }

      switch (e.code) {
        case 'Enter':
          this.showChat = true;
          this.chatInput = '';
          e.preventDefault();
          break;
        case 'KeyC':
          this.showCraftMenu = !this.showCraftMenu;
          break;
        case 'KeyE':
          if (this.player.eat()) {
            this.addMessage('system', '食べ物を食べた！');
          }
          break;
        case 'KeyQ':
          if (this.player.placeBlock(this.world)) {
            this.addMessage('system', 'ブロックを設置した');
          }
          break;
        case 'Space':
          e.preventDefault();
          break;
        case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5':
        case 'Digit6': case 'Digit7': case 'Digit8': case 'Digit9': case 'Digit0':
          const num = e.code === 'Digit0' ? 9 : parseInt(e.code.slice(5)) - 1;
          this.player.selectedSlot = num;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Space') {
        this.player.stopMining();
      }
    });

    // Mouse for craft menu
    this.canvas.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;

      if (this.showCraftMenu) {
        const menuW = 320;
        const menuH = 400;
        const mx = (this.canvas.width - menuW) / 2;
        const my = (this.canvas.height - menuH) / 2;
        const relY = e.clientY - my - 50;
        if (relY >= 0 && e.clientX > mx && e.clientX < mx + menuW) {
          this.craftHoverIndex = Math.floor(relY / 26);
          if (this.craftHoverIndex >= this.recipes.length) this.craftHoverIndex = -1;
        } else {
          this.craftHoverIndex = -1;
        }
      }
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.showCraftMenu && this.craftHoverIndex >= 0) {
        const recipe = this.recipes[this.craftHoverIndex];
        if (this.player.craft(recipe)) {
          this.addMessage('system', `${ITEMS[recipe.result]?.name || recipe.result} x${recipe.amount} をクラフトした！`);
        } else {
          this.addMessage('system', '素材が足りない...');
        }
      }
    });

    window.addEventListener('resize', () => {
      this.renderer.resize();
    });
  }

  sendChat() {
    const text = this.chatInput.trim();
    if (!text) {
      this.showChat = false;
      return;
    }

    this.addMessage('player', text);
    const response = this.companion.processCommand(text, this.player, this.world);
    this.addMessage('companion', response.message);

    this.showChat = false;
    this.chatInput = '';
  }

  addMessage(sender, text) {
    this.messageHistory.push({
      sender,
      text,
      time: Date.now(),
    });
    if (this.messageHistory.length > 100) {
      this.messageHistory.shift();
    }
  }

  update(dt) {
    if (this.paused || this.showCraftMenu) return;

    // Update time
    this.gameTime += dt;
    this.timeOfDay += dt / (DAY_LENGTH / 60); // Convert to fraction
    if (this.timeOfDay >= 1) {
      this.timeOfDay -= 1;
      this.dayCount++;
      this.addMessage('system', `Day ${this.dayCount}`);
    }

    // Update entities
    this.player.update(this.keys, this.world, dt);

    // Mining
    if (this.keys['Space']) {
      const result = this.player.mine(this.world);
      if (result) {
        // Mining complete
      }
    }

    // Attack with space when holding weapon
    if (this.keys['Space']) {
      const equipped = this.player.inventory[this.player.selectedSlot];
      if (equipped && ITEMS[equipped.item]?.weapon) {
        this.player.attack(this.enemyManager.getAliveEnemies());
      }
    }

    // Update companion
    this.companion.update(this.world, this.player, this.enemyManager.getAliveEnemies(), dt);

    // Update enemies
    const drops = this.enemyManager.update(
      this.world, this.player, this.companion, this.timeOfDay, dt
    );

    // Collect enemy drops
    for (const drop of drops) {
      this.player.addItem(drop.item, drop.count);
    }

    // Check player death
    if (!this.player.isAlive) {
      this.addMessage('system', 'やられた... リスポーン中...');
      const spawn = this.world.getSpawnPoint();
      this.player.x = spawn.x;
      this.player.y = spawn.y;
      this.player.hp = this.player.maxHp / 2;
      this.player.hunger = this.player.maxHunger / 2;
    }

    // Companion death
    if (this.companion.hp <= 0) {
      this.companion.hp = this.companion.maxHp / 2;
      this.companion.x = this.player.x + 1;
      this.companion.y = this.player.y + 1;
      this.companion.state = 'follow';
      this.companion.say('危なかった... もう大丈夫！');
    }

    // Night warning
    if (this.timeOfDay > 0.68 && this.timeOfDay < 0.685) {
      this.companion.say('夜になりそうだ... 気をつけて！');
    }
  }

  render() {
    this.renderer.render(this);

    // Draw chat overlay
    this.drawChatOverlay();
  }

  drawChatOverlay() {
    const ctx = this.renderer.ctx;

    // Message history (bottom left, above hotbar)
    const recentMessages = this.messageHistory
      .filter(m => Date.now() - m.time < 8000)
      .slice(-5);

    if (recentMessages.length > 0 || this.showChat) {
      const msgX = 12;
      let msgY = this.canvas.height - 90;

      for (let i = recentMessages.length - 1; i >= 0; i--) {
        const msg = recentMessages[i];
        const age = (Date.now() - msg.time) / 8000;
        const alpha = age > 0.7 ? 1 - (age - 0.7) / 0.3 : 1;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.font = '13px sans-serif';
        const text = msg.sender === 'player' ? `> ${msg.text}` :
                     msg.sender === 'companion' ? `${this.companion.name}: ${msg.text}` :
                     `[${msg.text}]`;
        const tw = ctx.measureText(text).width;
        ctx.fillRect(msgX - 4, msgY - 14, tw + 8, 20);

        ctx.fillStyle = msg.sender === 'player' ? '#42A5F5' :
                        msg.sender === 'companion' ? '#EC407A' : '#888';
        ctx.fillText(text, msgX, msgY);
        msgY -= 22;
      }
      ctx.globalAlpha = 1;
    }

    // Chat input
    if (this.showChat) {
      const inputX = 12;
      const inputY = this.canvas.height - 68;
      const inputW = 400;

      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(inputX, inputY, inputW, 28);
      ctx.strokeStyle = '#FFD54F';
      ctx.strokeRect(inputX, inputY, inputW, 28);

      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      const cursor = Math.floor(Date.now() / 500) % 2 === 0 ? '|' : '';
      ctx.fillText(`> ${this.chatInput}${cursor}`, inputX + 8, inputY + 19);

      ctx.fillStyle = '#888';
      ctx.font = '11px sans-serif';
      ctx.fillText('例: 木を集めて / 家を建てて / 拠点に戻って', inputX, inputY - 6);
    }
  }

  loop(currentTime) {
    if (!this.running) return;

    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  start() {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }
}
