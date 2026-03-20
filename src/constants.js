// === Game Constants ===

export const TILE_SIZE = 32;
export const CHUNK_SIZE = 16;
export const WORLD_WIDTH = 128;
export const WORLD_HEIGHT = 128;

// Day/night cycle (in game ticks, 60 ticks = 1 second)
export const DAY_LENGTH = 18000; // 5 minutes real time
export const DAWN_START = 0;
export const DAY_START = 3600;
export const DUSK_START = 10800;
export const NIGHT_START = 12600;

// Player
export const PLAYER_SPEED = 2.5;
export const PLAYER_MAX_HP = 100;
export const PLAYER_MAX_HUNGER = 100;
export const PLAYER_INVENTORY_SIZE = 20;
export const PLAYER_REACH = 2.5; // tiles

// AI Companion
export const COMPANION_SPEED = 2.2;
export const COMPANION_FOLLOW_DIST = 2;
export const COMPANION_WORK_RANGE = 1.5;

// Combat
export const INVINCIBILITY_FRAMES = 30;

// Tile types
export const TILES = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WATER: 4,
  SAND: 5,
  TREE: 6,
  IRON_ORE: 7,
  BERRY_BUSH: 8,
  TALL_GRASS: 9,
  WOOD_PLANK: 10,
  STONE_BRICK: 11,
  WOOD_WALL: 12,
  STONE_WALL: 13,
  TORCH: 14,
  CAMPFIRE: 15,
  CHEST: 16,
  WORKBENCH: 17,
  BED: 18,
  FLOWER: 19,
  SNOW: 20,
  DARK_STONE: 21,
};

export const TILE_INFO = {
  [TILES.AIR]:        { name: 'Air',         solid: false, mineable: false, color: '#87CEEB' },
  [TILES.GRASS]:      { name: 'Grass',       solid: false, mineable: true,  color: '#4CAF50', drop: 'fiber', time: 15 },
  [TILES.DIRT]:       { name: 'Dirt',        solid: false, mineable: true,  color: '#8B6914', drop: 'dirt',  time: 20 },
  [TILES.STONE]:      { name: 'Stone',       solid: true,  mineable: true,  color: '#808080', drop: 'stone', time: 45, tool: 'pickaxe' },
  [TILES.WATER]:      { name: 'Water',       solid: true,  mineable: false, color: '#2196F3' },
  [TILES.SAND]:       { name: 'Sand',        solid: false, mineable: true,  color: '#F4D03F', drop: 'sand',  time: 15 },
  [TILES.TREE]:       { name: 'Tree',        solid: true,  mineable: true,  color: '#2E7D32', drop: 'wood',  time: 40 },
  [TILES.IRON_ORE]:   { name: 'Iron Ore',    solid: true,  mineable: true,  color: '#B0722A', drop: 'iron',  time: 60, tool: 'pickaxe' },
  [TILES.BERRY_BUSH]: { name: 'Berry Bush',  solid: false, mineable: true,  color: '#C62828', drop: 'food',  time: 10 },
  [TILES.TALL_GRASS]: { name: 'Tall Grass',  solid: false, mineable: true,  color: '#66BB6A', drop: 'fiber', time: 5 },
  [TILES.WOOD_PLANK]: { name: 'Wood Plank',  solid: false, mineable: true,  color: '#D4A574', drop: 'wood_plank', time: 20, placeable: true },
  [TILES.STONE_BRICK]:{ name: 'Stone Brick', solid: false, mineable: true,  color: '#9E9E9E', drop: 'stone_brick', time: 30, placeable: true },
  [TILES.WOOD_WALL]:  { name: 'Wood Wall',   solid: true,  mineable: true,  color: '#A1887F', drop: 'wood_wall', time: 25, placeable: true },
  [TILES.STONE_WALL]: { name: 'Stone Wall',  solid: true,  mineable: true,  color: '#757575', drop: 'stone_wall', time: 40, placeable: true },
  [TILES.TORCH]:      { name: 'Torch',       solid: false, mineable: true,  color: '#FFD54F', drop: 'torch', time: 5, placeable: true, light: 5 },
  [TILES.CAMPFIRE]:   { name: 'Campfire',    solid: false, mineable: true,  color: '#FF8A65', drop: 'campfire', time: 15, placeable: true, light: 7 },
  [TILES.CHEST]:      { name: 'Chest',       solid: true,  mineable: true,  color: '#795548', drop: 'chest', time: 20, placeable: true },
  [TILES.WORKBENCH]:  { name: 'Workbench',   solid: true,  mineable: true,  color: '#A1887F', drop: 'workbench', time: 20, placeable: true },
  [TILES.BED]:        { name: 'Bed',         solid: true,  mineable: true,  color: '#E57373', drop: 'bed', time: 15, placeable: true },
  [TILES.FLOWER]:     { name: 'Flower',      solid: false, mineable: true,  color: '#E91E63', drop: 'flower', time: 5 },
  [TILES.SNOW]:       { name: 'Snow',        solid: false, mineable: true,  color: '#ECEFF1', drop: 'snow', time: 10 },
  [TILES.DARK_STONE]: { name: 'Dark Stone',  solid: true,  mineable: true,  color: '#455A64', drop: 'stone', time: 50, tool: 'pickaxe' },
};

// Items
export const ITEMS = {
  wood:         { name: 'Wood',           stackSize: 64, icon: '🪵' },
  stone:        { name: 'Stone',          stackSize: 64, icon: '🪨' },
  iron:         { name: 'Iron',           stackSize: 64, icon: '⛏️' },
  fiber:        { name: 'Fiber',          stackSize: 64, icon: '🌿' },
  food:         { name: 'Berry',          stackSize: 32, icon: '🫐' },
  dirt:         { name: 'Dirt',           stackSize: 64, icon: '🟫' },
  sand:         { name: 'Sand',           stackSize: 64, icon: '🟨' },
  flower:       { name: 'Flower',         stackSize: 64, icon: '🌸' },
  snow:         { name: 'Snow',           stackSize: 64, icon: '❄️' },
  wood_plank:   { name: 'Wood Plank',     stackSize: 64, icon: '🟫', placeTile: TILES.WOOD_PLANK },
  stone_brick:  { name: 'Stone Brick',    stackSize: 64, icon: '⬜', placeTile: TILES.STONE_BRICK },
  wood_wall:    { name: 'Wood Wall',      stackSize: 64, icon: '🚪', placeTile: TILES.WOOD_WALL },
  stone_wall:   { name: 'Stone Wall',     stackSize: 64, icon: '🧱', placeTile: TILES.STONE_WALL },
  torch:        { name: 'Torch',          stackSize: 64, icon: '🔦', placeTile: TILES.TORCH },
  campfire:     { name: 'Campfire',       stackSize: 16, icon: '🔥', placeTile: TILES.CAMPFIRE },
  chest:        { name: 'Chest',          stackSize: 16, icon: '📦', placeTile: TILES.CHEST },
  workbench:    { name: 'Workbench',      stackSize: 8,  icon: '🔨', placeTile: TILES.WORKBENCH },
  bed:          { name: 'Bed',            stackSize: 8,  icon: '🛏️', placeTile: TILES.BED },
  cooked_food:  { name: 'Cooked Food',    stackSize: 32, icon: '🍖' },
  wooden_pickaxe: { name: 'Wooden Pickaxe', stackSize: 1, icon: '⛏️', tool: 'pickaxe', power: 1 },
  stone_pickaxe:  { name: 'Stone Pickaxe',  stackSize: 1, icon: '⛏️', tool: 'pickaxe', power: 2 },
  wooden_sword:   { name: 'Wooden Sword',   stackSize: 1, icon: '🗡️', weapon: true, damage: 15 },
  stone_sword:    { name: 'Stone Sword',    stackSize: 1, icon: '🗡️', weapon: true, damage: 25 },
  wooden_axe:     { name: 'Wooden Axe',     stackSize: 1, icon: '🪓', tool: 'axe', power: 1 },
};

// Crafting recipes
export const RECIPES = [
  { id: 'wood_plank',      result: 'wood_plank',      amount: 4,  materials: { wood: 1 } },
  { id: 'stone_brick',     result: 'stone_brick',     amount: 4,  materials: { stone: 2 } },
  { id: 'wooden_pickaxe',  result: 'wooden_pickaxe',  amount: 1,  materials: { wood: 3, fiber: 2 } },
  { id: 'stone_pickaxe',   result: 'stone_pickaxe',   amount: 1,  materials: { stone: 2, wood: 1 } },
  { id: 'wooden_sword',    result: 'wooden_sword',    amount: 1,  materials: { wood: 2, fiber: 1 } },
  { id: 'stone_sword',     result: 'stone_sword',     amount: 1,  materials: { wood: 1, stone: 2 } },
  { id: 'wooden_axe',      result: 'wooden_axe',      amount: 1,  materials: { wood: 2, fiber: 2 } },
  { id: 'torch',           result: 'torch',           amount: 4,  materials: { wood: 1, fiber: 1 } },
  { id: 'campfire',        result: 'campfire',        amount: 1,  materials: { wood: 3, stone: 2 } },
  { id: 'chest',           result: 'chest',           amount: 1,  materials: { wood: 5 } },
  { id: 'workbench',       result: 'workbench',       amount: 1,  materials: { wood: 4, stone: 2 } },
  { id: 'wood_wall',       result: 'wood_wall',       amount: 2,  materials: { wood_plank: 2 } },
  { id: 'stone_wall',      result: 'stone_wall',      amount: 2,  materials: { stone_brick: 2 } },
  { id: 'bed',             result: 'bed',             amount: 1,  materials: { wood: 3, fiber: 5 } },
];

// Enemy types
export const ENEMY_TYPES = {
  slime: {
    name: 'Slime',
    hp: 30,
    damage: 10,
    speed: 0.8,
    color: '#76FF03',
    size: 0.7,
    xp: 5,
    drops: [{ item: 'fiber', chance: 0.5, amount: 1 }],
  },
  skeleton: {
    name: 'Skeleton',
    hp: 50,
    damage: 15,
    speed: 1.2,
    color: '#EEEEEE',
    size: 0.8,
    xp: 10,
    drops: [{ item: 'stone', chance: 0.3, amount: 2 }],
  },
  wolf: {
    name: 'Wolf',
    hp: 40,
    damage: 20,
    speed: 2.0,
    color: '#616161',
    size: 0.75,
    xp: 8,
    drops: [{ item: 'food', chance: 0.4, amount: 1 }],
  },
};

// Biomes
export const BIOMES = {
  FOREST: 'forest',
  PLAINS: 'plains',
  DESERT: 'desert',
  MOUNTAINS: 'mountains',
  SNOW: 'snow',
};
