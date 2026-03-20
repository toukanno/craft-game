# AI Craft World - Game Design Document

## Concept
**"話しかけるだけで仲間が働くクラフトゲーム"**
(A craft game where your companion works just by talking to them)

An AI companion craft game where players survive, build, and explore alongside
an intelligent AI partner who understands natural language commands.

## Core Pillars
1. **AI Companionship** - A partner who understands, remembers, and acts
2. **Creative Building** - Place blocks, build structures, shape the world
3. **Survival** - Manage resources, survive nights, defend your base
4. **Exploration** - Discover biomes, find resources, uncover secrets

## World
- 2D top-down tile-based world (procedurally generated)
- Biomes: Forest, Plains, Desert, Mountains, Caves
- Day/night cycle (5 min real-time = 1 game day)
- Tile types: Grass, Dirt, Stone, Water, Sand, Trees, Ores

## Player
- Move in 4/8 directions
- Mine/harvest tiles (hold action key)
- Place blocks from inventory
- Craft items at workbench
- Health + Hunger bars
- Inventory (20 slots)

## AI Companion
The core differentiator. One AI companion follows the player.

### Commands (Natural Language)
- "木を集めて" / "Gather wood" → companion pathfinds to trees, harvests
- "ここに家を建てて" / "Build a house here" → companion plans & places blocks
- "敵を避けて" / "Avoid enemies" → companion switches to evasion behavior
- "拠点に戻って" / "Return to base" → companion pathfinds home
- "チェストにしまって" / "Store items" → companion deposits inventory

### Companion Behaviors
- **Idle**: Follow player at a distance
- **Gather**: Collect specified resources
- **Build**: Place blocks in planned pattern
- **Combat**: Fight nearby enemies
- **Flee**: Run from danger
- **Store**: Manage chest inventory

### Companion Personality
- Has a name and simple personality traits
- Remembers recent commands and context
- Comments on situation ("夜になりそうだ..." / "It's getting dark...")
- Learns player preferences over time

## Resources & Crafting

### Raw Resources
| Resource | Source | Tool Needed |
|----------|--------|-------------|
| Wood | Trees | None/Axe |
| Stone | Rock tiles | Pickaxe |
| Iron Ore | Cave/Mountain | Pickaxe |
| Fiber | Grass | None |
| Food | Berry bushes | None |

### Crafting Recipes
| Item | Materials | Effect |
|------|-----------|--------|
| Wood Plank | 1 Wood | Building block |
| Stone Brick | 2 Stone | Strong building block |
| Wooden Pickaxe | 3 Wood + 2 Fiber | Mine stone |
| Stone Pickaxe | 2 Stone + 1 Wood | Mine iron |
| Wooden Sword | 2 Wood + 1 Fiber | Basic weapon |
| Stone Sword | 2 Stone + 1 Wood | Better weapon |
| Torch | 1 Wood + 1 Fiber | Light source |
| Campfire | 3 Wood + 2 Stone | Cook food, light |
| Chest | 5 Wood | Storage (20 slots) |
| Workbench | 4 Wood + 2 Stone | Advanced crafting |
| Wood Wall | 2 Wood Plank | Defensive wall |
| Stone Wall | 2 Stone Brick | Strong wall |
| Bed | 3 Wood + 5 Fiber | Set spawn, skip night |
| Cooked Food | 1 Food + Campfire | Better healing |

## Enemies
- **Slime**: Appears at night, slow, weak
- **Skeleton**: Appears at night, medium speed, ranged
- **Wolf**: Appears in forest at night, fast, pack behavior

Enemies spawn at night outside lit areas. Torches and campfires create safe zones.

## Day/Night Cycle
- **Dawn** (0:00-1:00): Enemies retreat
- **Day** (1:00-3:00): Safe, gather resources
- **Dusk** (3:00-3:30): Warning period
- **Night** (3:30-5:00): Enemies spawn, danger

## MVP Scope
1. ✅ Procedural 2D world with 3 biomes
2. ✅ Player movement and interaction
3. ✅ Resource gathering (wood, stone, fiber, food)
4. ✅ Basic crafting (tools, building blocks, torch)
5. ✅ Block placement and building
6. ✅ AI companion with command system
7. ✅ Day/night cycle
8. ✅ Basic enemies (slimes)
9. ✅ Simple combat

## Future Expansions
- AI villagers with personalities and roles
- AI civilization system (trade, conflict)
- Underground/cave exploration
- Boss encounters
- Multiplayer
- Story/quest generation via AI
