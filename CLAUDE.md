# CLAUDE.md - AI Assistant Guide for craft-game

## Project Overview

AI Craft World (ai-craft-world) - A 2D tile-based survival craft game with an AI companion system. Built entirely in vanilla JavaScript using HTML5 Canvas. The game features procedural world generation, crafting, combat, day/night cycles, and a natural-language-controlled AI companion named Airi.

## Tech Stack

- **Language:** Pure JavaScript (ES6 Modules, no transpilation)
- **Rendering:** HTML5 Canvas 2D API
- **Build System:** None - ES Modules loaded natively by the browser
- **Dev Server:** `npx serve .` (static file server)
- **Dependencies:** Zero npm dependencies
- **Testing:** No test framework configured
- **CI/CD:** None configured

## Commands

```bash
# Start development server
npm run dev      # or: npx serve .

# Start production server (same as dev)
npm start
```

There are no build, lint, test, or format commands.

## Repository Structure

```
craft-game/
├── index.html              # HTML entry point (canvas + inline CSS + module loader)
├── package.json            # NPM config (type: "module", no deps)
├── README.md               # Player-facing documentation
├── CLAUDE.md               # This file
├── docs/
│   └── GAME_DESIGN.md      # Detailed game design document
└── src/
    ├── game.js             # Main game loop, input handling, state management (entry point)
    ├── world.js            # World generation (simplex noise), pathfinding (A*), lighting
    ├── player.js           # Player entity, inventory, mining, crafting, combat
    ├── companion.js        # AI companion (Airi) - NLP commands, state machine, AI behavior
    ├── enemies.js          # Enemy types (Slime/Skeleton/Wolf), spawning, AI behavior
    ├── renderer.js         # Canvas 2D rendering, UI overlays, camera system (largest file)
    ├── constants.js        # Game data: tile types, items, recipes, enemy configs, biomes
    └── noise.js            # Simplex noise implementation for procedural terrain generation
```

## Architecture

### Module Dependency Flow

```
index.html
  └── src/game.js (Game class - central orchestrator)
        ├── src/world.js (World) ← src/noise.js (SimplexNoise), src/constants.js
        ├── src/player.js (Player) ← src/constants.js
        ├── src/companion.js (Companion) ← src/constants.js
        ├── src/enemies.js (EnemyManager) ← src/constants.js
        └── src/renderer.js (Renderer) ← src/constants.js
```

### Key Classes

- **`Game`** (`game.js`): Central orchestrator. Owns the game loop (`requestAnimationFrame`), handles keyboard/mouse input, manages game state, coordinates all subsystems.
- **`World`** (`world.js`): 128x128 tile grid. Procedural generation using simplex noise with 5 biomes. Implements A* pathfinding and dynamic lighting.
- **`Player`** (`player.js`): Player entity with 20-slot inventory, crafting (14 recipes), mining, combat, health/hunger systems.
- **`Companion`** (`companion.js`): AI companion "Airi" with state machine (idle/follow/gather/build/combat/flee/move/return_base). Processes natural language commands (Japanese + English).
- **`EnemyManager`** (`enemies.js`): Spawns enemies at night. 3 types with chase/wander AI, knockback physics, resource drops.
- **`Renderer`** (`renderer.js`): Canvas 2D rendering with camera culling, UI overlays (inventory, crafting, chat), visual effects, day/night lighting.

### Game Systems

- **World generation:** Simplex noise with fractal Brownian motion (fbm), biome assignment by noise thresholds
- **Time:** 5-minute real-time day cycle, day/night affects enemy spawning and lighting
- **Crafting:** Recipe-based system defined in `constants.js` RECIPES array
- **Combat:** Melee with knockback, weapon damage modifiers, enemy aggro ranges
- **Lighting:** Dynamic light map from torches/campfires, blended overlay rendering

## Code Conventions

- ES6 module syntax (`import`/`export`)
- Class-based architecture (one main class per file)
- Game constants and data tables centralized in `constants.js`
- Japanese comments and UI strings throughout (game targets Japanese audience)
- No TypeScript, no linting, no formatting tools configured
- Coordinates use tile-based grid (128x128), rendering converts to pixel space

## Key Data Definitions (constants.js)

- `TILE_TYPES`: 22 tile types with properties (solid, mineable, light-emitting)
- `ITEMS`: Item definitions with stack sizes and properties
- `RECIPES`: 14 crafting recipes with ingredients and results
- `ENEMY_TYPES`: Slime, Skeleton, Wolf configurations
- `BIOMES`: Forest, Plains, Desert, Mountains, Snow definitions

## Development Notes

- No build step required - edit JS files and refresh browser
- All rendering is immediate-mode canvas drawing (no retained scene graph)
- Game state is mutable and centralized in the `Game` instance
- The companion NLP system uses keyword matching, not an LLM
- World size is hardcoded at 128x128 tiles
