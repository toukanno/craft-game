# AI Craft World / AIクラフトワールド

**話しかけるだけで仲間が働くクラフトゲーム**

A 2D craft game where you explore, build, and survive alongside an AI companion
who understands natural language commands.

## Features

- Procedurally generated world with 5 biomes (Forest, Plains, Desert, Mountains, Snow)
- AI companion "Airi" who follows natural language commands
- Resource gathering, crafting, and building
- Day/night cycle with enemy spawning
- Block placement and structure building
- Inventory and crafting system

## AI Companion Commands

| Command | Action |
|---------|--------|
| 木を集めて / Gather wood | Companion harvests trees |
| 石を掘って / Mine stone | Companion mines stone |
| 家を建てて / Build house | Companion builds a small house |
| 拠点に戻って / Return base | Companion returns to player |
| ついてきて / Follow me | Companion follows player |
| 敵を倒して / Fight | Companion enters combat mode |
| 状態 / Status | Check companion status |

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Move |
| Space | Mine / Attack |
| Q | Place block |
| E | Eat food |
| C | Open crafting menu |
| 1-0 | Select hotbar slot |
| Enter | Talk to AI companion |

## How to Run

```bash
# Serve locally (any static file server works)
npx serve .

# Or simply open index.html in a browser
```

## Tech Stack

- Pure JavaScript (ES Modules)
- HTML5 Canvas for rendering
- Simplex noise for procedural world generation
- A* pathfinding for AI navigation

## Architecture

```
src/
├── constants.js   # Game constants, tile/item/recipe definitions
├── noise.js       # Simplex noise for world generation
├── world.js       # World generation, pathfinding, light map
├── player.js      # Player movement, inventory, crafting, combat
├── companion.js   # AI companion with NLP command processing
├── enemies.js     # Enemy AI and spawn management
├── renderer.js    # Canvas-based 2D renderer with UI
└── game.js        # Main game loop, input handling, state management
```
