// Simmer & Serve — configuration: canvas, kitchen layout, ingredients, recipes.
// Everything the rules and the renderer agree on lives here, so tuning the game
// means editing this file and nowhere else.

export const VIEW = { width: 1280, height: 800 };
export const HUD_HEIGHT = 84;
export const BEST_KEY = 'simmer-and-serve-best-coins';
export const SHIFT_SECONDS = 150;
export const MAX_STRIKES = 3;
// Tray slots: 4, because the level-3 Veggie Stack needs four items
// (bun + chopped lettuce + chopped onion + chopped tomato). At 3 the dish
// could never be built and its orders could only expire into strikes.
export const TRAY_MAX = 4;
export const MAX_ORDERS = 4;
export const CHOP_SECONDS = 1.2;
export const CHEF_SPEED = 265;
export const CHEF_RADIUS = 22;
export const INTERACT_RANGE = 100;

// One shift's star thresholds, in coins earned.
export const STAR_COINS = [300, 550, 800];

// Level thresholds: how many served orders open the next level.
export const LEVEL_AT_SERVED = [0, 4, 9, 15];

// --- Ingredients -----------------------------------------------------------
// kind: 'raw' (needs the chopping board), 'grill' (needs the grill),
// 'ready' (goes straight on the plate). chopTo / grillTo name the finished form.
export const INGREDIENTS = {
  tomato: { name: 'Tomato', kind: 'raw', chopTo: 'tomato_chopped', color: '#e5484d', dark: '#b3272e', label: 'Tomato' },
  tomato_chopped: { name: 'Chopped Tomato', kind: 'ready', color: '#ef6a5e', dark: '#c94a41', label: 'Tomato' },
  lettuce: { name: 'Lettuce', kind: 'raw', chopTo: 'lettuce_chopped', color: '#5fb84a', dark: '#3e8f31', label: 'Lettuce' },
  lettuce_chopped: { name: 'Chopped Lettuce', kind: 'ready', color: '#7cc96a', dark: '#57a047', label: 'Lettuce' },
  onion: { name: 'Onion', kind: 'raw', chopTo: 'onion_chopped', color: '#b07fd4', dark: '#8a5cb0', label: 'Onion' },
  onion_chopped: { name: 'Chopped Onion', kind: 'ready', color: '#c99be8', dark: '#a176c4', label: 'Onion' },
  cheese: { name: 'Cheese', kind: 'ready', color: '#f7c948', dark: '#d9a521', label: 'Cheese' },
  bun: { name: 'Bun', kind: 'ready', color: '#e8b06a', dark: '#c78d46', label: 'Bun' },
  egg: { name: 'Egg', kind: 'grill', grillTo: 'egg_cooked', grillSeconds: 5, color: '#fdf6e3', dark: '#e3d3a8', label: 'Egg' },
  egg_cooked: { name: 'Fried Egg', kind: 'ready', color: '#ffe9a8', dark: '#f0c94f', label: 'Egg' },
  patty: { name: 'Patty', kind: 'grill', grillTo: 'patty_cooked', grillSeconds: 6, color: '#a8663f', dark: '#7d4526', label: 'Patty' },
  patty_cooked: { name: 'Grilled Patty', kind: 'ready', color: '#8a5a33', dark: '#5f3a1e', label: 'Patty' },
  patty_burnt: { name: 'Burnt Patty', kind: 'trash', color: '#2b2118', dark: '#171008', label: 'Burnt!' },
  egg_burnt: { name: 'Burnt Egg', kind: 'trash', color: '#3a2f1d', dark: '#1d170c', label: 'Burnt!' },
};

export const BIN_ORDER = ['tomato', 'lettuce', 'onion', 'cheese', 'bun', 'egg', 'patty'];

// --- Recipes ---------------------------------------------------------------
// unlock: first level that may order this dish. coins: base pay before tip.
export const RECIPES = [
  { id: 'salad', name: 'Garden Salad', unlock: 1, coins: 25, needs: ['tomato_chopped', 'lettuce_chopped'] },
  { id: 'omelette', name: 'Sunny Omelette', unlock: 1, coins: 30, needs: ['egg_cooked', 'cheese'] },
  { id: 'burger', name: 'Classic Burger', unlock: 2, coins: 45, needs: ['bun', 'patty_cooked', 'tomato_chopped'] },
  { id: 'cheeseburger', name: 'Cheese Melt Burger', unlock: 2, coins: 45, needs: ['bun', 'patty_cooked', 'cheese'] },
  { id: 'veggie', name: 'Veggie Stack', unlock: 3, coins: 55, needs: ['bun', 'lettuce_chopped', 'onion_chopped', 'tomato_chopped'] },
  { id: 'sunrise', name: 'Sunrise Plate', unlock: 4, coins: 60, needs: ['egg_cooked', 'patty_cooked', 'onion_chopped'] },
];

export function recipesForLevel(level) {
  return RECIPES.filter((r) => r.unlock <= level);
}

// --- Kitchen layout --------------------------------------------------------
// All rects are {x, y, w, h} in canvas pixels. The chef walks the open floor and
// bumps into counters; every station is also an interaction target.
export const STATIONS = {
  bins: BIN_ORDER.map((id, i) => ({
    kind: 'bin', id, x: 28, y: 116 + i * 92, w: 122, h: 84,
  })),
  board: { kind: 'board', id: 'board', x: 300, y: 108, w: 230, h: 76 },
  grill: { kind: 'grill', id: 'grill', x: 640, y: 108, w: 260, h: 76 },
  serve: { kind: 'serve', id: 'serve', x: 1010, y: 108, w: 242, h: 76 },
  trash: { kind: 'trash', id: 'trash', x: 1150, y: 668, w: 102, h: 96 },
};

export function allStations() {
  return [...STATIONS.bins, STATIONS.board, STATIONS.grill, STATIONS.serve, STATIONS.trash];
}

// Solid obstacles the chef cannot walk through (counters, bins, trash).
export function obstacles() {
  return allStations().map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h }));
}

export function spawnInterval(level) {
  return Math.max(7, 14 - (level - 1) * 1.6);
}

export function patienceSeconds(level) {
  return Math.max(28, 50 - (level - 1) * 3);
}
