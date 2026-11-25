// Simmer & Serve — the world and its rules. Pure logic, no DOM: the renderer
// paints this state, the tests drive it in Node, and main.js just feeds it input.
//
// A shift: orders arrive on the board, each with a patience timer. The chef
// fetches ingredients from the bins, chops raw veg on the board, grills patties
// and eggs on the grill (leave them too long and they burn), stacks the finished
// dish on the plate they carry, and serves it at the hatch before patience runs
// out. Serve three orders in a row without a miss and the next one pays a combo
// bonus. Three expired orders end the shift early; otherwise the shift ends
// when the clock runs out and the chef is graded in stars.

import {
  CHEF_RADIUS, CHEF_SPEED, CHOP_SECONDS, HUD_HEIGHT, INGREDIENTS, INTERACT_RANGE,
  LEVEL_AT_SERVED, MAX_ORDERS, MAX_STRIKES, RECIPES, SHIFT_SECONDS, STAR_COINS,
  TRAY_MAX, VIEW, allStations, obstacles, patienceSeconds, recipesForLevel,
  spawnInterval,
} from './config.js';
import { pick } from './rng.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1 << 0;
export const EVENT_CHOP_START = 1 << 1;
export const EVENT_CHOP_DONE = 1 << 2;
export const EVENT_GRILL_PLACE = 1 << 3;
export const EVENT_GRILL_DONE = 1 << 4;
export const EVENT_GRILL_READY = 1 << 5;
export const EVENT_BURNT = 1 << 6;
export const EVENT_SERVED = 1 << 7;
export const EVENT_EXPIRED = 1 << 8;
export const EVENT_TRASH = 1 << 9;
export const EVENT_DENIED = 1 << 10;
export const EVENT_LEVEL_UP = 1 << 11;
export const EVENT_SHIFT_OVER = 1 << 12;
export const EVENT_COMBO = 1 << 13;

export const STEP = 1 / 60;

let nextOrderId = 1;

export function createWorld(rng) {
  const world = {
    rng,
    time: 0,
    shiftLeft: SHIFT_SECONDS,
    over: false,
    won: false,
    stars: 0,
    score: 0,
    coins: 0,
    served: 0,
    expiredCount: 0,
    strikes: 0,
    combo: 0,
    bestCombo: 0,
    level: 1,
    orders: [],
    spawnIn: 2,
    grill: [null, null],
    popups: [],
    particles: [],
    chef: {
      x: VIEW.width / 2, y: 470, dir: 1, moving: false,
      busy: 0, busyKind: null, busyTarget: null, chopFlash: 0,
    },
    tray: [],
    hint: '',
    hintUntil: 0,
    servedOrder: null,
  };
  return world;
}

export function resetWorld(world) {
  const fresh = createWorld(world.rng);
  for (const key of Object.keys(fresh)) world[key] = fresh[key];
}

function orderPatience(world) {
  return patienceSeconds(world.level);
}

export function spawnOrder(world) {
  const pool = recipesForLevel(world.level);
  const recipe = pick(world.rng, pool);
  const order = {
    id: nextOrderId,
    recipe,
    patience: orderPatience(world),
    maxPatience: orderPatience(world),
    born: world.time,
  };
  nextOrderId += 1;
  world.orders.push(order);
  return order;
}

/** The recipe the carried plate currently completes, or null. */
export function matchingOrder(world) {
  if (world.tray.length === 0) return null;
  const have = [...world.tray].sort().join('|');
  for (const order of world.orders) {
    const want = [...order.recipe.needs].sort().join('|');
    if (have === want) return order;
  }
  return null;
}

export function trayReady(world) {
  return matchingOrder(world) !== null;
}

function addPopup(world, x, y, text, color) {
  world.popups.push({ x, y, text, color: color ?? '#fff', life: 1.4, max: 1.4 });
}

function burst(world, x, y, color, n) {
  for (let i = 0; i < n; i += 1) {
    const a = world.rng() * Math.PI * 2;
    const sp = 40 + world.rng() * 120;
    world.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.6 + world.rng() * 0.4, max: 1, color, r: 2 + world.rng() * 3 });
  }
}

export function levelForServed(served) {
  let level = 1;
  for (let i = 0; i < LEVEL_AT_SERVED.length; i += 1) {
    if (served >= LEVEL_AT_SERVED[i]) level = i + 1;
  }
  return level;
}

function serveOrder(world, order) {
  const patienceFrac = Math.max(0, order.patience / order.maxPatience);
  const tip = Math.round(order.recipe.coins * 0.5 * patienceFrac);
  let pay = order.recipe.coins + tip;
  let events = EVENT_SERVED;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  if (world.combo > 0 && world.combo % 3 === 0) {
    pay += 15;
    events |= EVENT_COMBO;
    addPopup(world, world.chef.x, world.chef.y - 60, 'COMBO x3! +15', '#ffd94d');
  }
  world.coins += pay;
  world.score += pay;
  world.served += 1;
  world.orders = world.orders.filter((o) => o.id !== order.id);
  world.tray = [];
  world.servedOrder = order;
  addPopup(world, 1130, 200, `+${pay} coins`, '#7be07b');
  burst(world, 1130, 160, '#ffd94d', 18);
  burst(world, world.chef.x, world.chef.y - 30, '#7be07b', 10);
  const newLevel = levelForServed(world.served);
  if (newLevel > world.level) {
    world.level = newLevel;
    events |= EVENT_LEVEL_UP;
    addPopup(world, VIEW.width / 2, 320, `LEVEL ${newLevel} — new recipes!`, '#ffd94d');
  }
  return events;
}

function expireOrder(world, order) {
  world.orders = world.orders.filter((o) => o.id !== order.id);
  world.strikes += 1;
  world.expiredCount += 1;
  world.combo = 0;
  addPopup(world, 300, 200, 'Order walked out!', '#ff7a6b');
  if (world.strikes >= MAX_STRIKES) endShift(world, false);
  return EVENT_EXPIRED;
}

function endShift(world, won) {
  world.over = true;
  world.won = won;
  world.stars = won ? STAR_COINS.filter((t) => world.coins >= t).length : 0;
  return EVENT_SHIFT_OVER;
}

// --- Movement ---------------------------------------------------------------

function collide(world, nx, ny) {
  const r = CHEF_RADIUS;
  const obs = obstacles();
  for (const o of obs) {
    if (nx + r > o.x && nx - r < o.x + o.w && ny + r > o.y && ny - r < o.y + o.h) {
      // Push out along the smallest penetration axis.
      const pushLeft = (nx + r) - o.x;
      const pushRight = (o.x + o.w) - (nx - r);
      const pushUp = (ny + r) - o.y;
      const pushDown = (o.y + o.h) - (ny - r);
      const min = Math.min(pushLeft, pushRight, pushUp, pushDown);
      if (min === pushLeft) nx = o.x - r;
      else if (min === pushRight) nx = o.x + o.w + r;
      else if (min === pushUp) ny = o.y - r;
      else ny = o.y + o.h + r;
    }
  }
  nx = Math.max(20 + r, Math.min(VIEW.width - 20 - r, nx));
  ny = Math.max(HUD_HEIGHT + 16 + r, Math.min(VIEW.height - 20 - r, ny));
  return { x: nx, y: ny };
}

export function moveChef(world, dx, dy, dt) {
  const chef = world.chef;
  if (chef.busy > 0) {
    chef.moving = false;
    return;
  }
  const len = Math.hypot(dx, dy);
  if (len < 0.01) {
    chef.moving = false;
    return;
  }
  const nx = chef.x + (dx / len) * CHEF_SPEED * dt;
  const ny = chef.y + (dy / len) * CHEF_SPEED * dt;
  const fixed = collide(world, nx, ny);
  chef.x = fixed.x;
  chef.y = fixed.y;
  chef.dir = dx < -0.1 ? -1 : dx > 0.1 ? 1 : chef.dir;
  chef.moving = true;
}

function nearestStation(world) {
  let best = null;
  let bestD = Infinity;
  for (const s of allStations()) {
    const cx = Math.max(s.x, Math.min(world.chef.x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(world.chef.y, s.y + s.h));
    const d = Math.hypot(world.chef.x - cx, world.chef.y - cy);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return bestD <= INTERACT_RANGE ? best : null;
}

export function stationInRange(world) {
  return nearestStation(world);
}

function setHint(world, text) {
  world.hint = text;
  world.hintUntil = world.time + 2.2;
}

// --- Interaction ------------------------------------------------------------
// Press E / Space / click on a station: do the one thing that station does
// with what the chef is carrying. Returns an event bitmask (for sounds).
export function interact(world) {
  const chef = world.chef;
  if (world.over || chef.busy > 0) return EVENT_NONE;
  const station = nearestStation(world);
  if (!station) return EVENT_NONE;

  if (station.kind === 'bin') {
    if (world.tray.length >= TRAY_MAX) {
      setHint(world, 'Tray full! Serve or trash something first.');
      return EVENT_DENIED;
    }
    world.tray.push(station.id);
    burst(world, chef.x, chef.y - 34, INGREDIENTS[station.id].color, 6);
    return EVENT_PICKUP;
  }

  if (station.kind === 'board') {
    const idx = world.tray.findIndex((id) => INGREDIENTS[id] && INGREDIENTS[id].kind === 'raw');
    if (idx === -1) {
      setHint(world, 'Nothing to chop — grab tomato, lettuce or onion first.');
      return EVENT_DENIED;
    }
    chef.busy = CHOP_SECONDS;
    chef.busyKind = 'chop';
    chef.busyTarget = idx;
    chef.chopFlash = 0;
    return EVENT_CHOP_START;
  }

  if (station.kind === 'grill') {
    // Collect a finished piece first, if one is ready.
    for (let i = 0; i < world.grill.length; i += 1) {
      const slot = world.grill[i];
      if (slot && slot.state === 'ready') {
        if (world.tray.length >= TRAY_MAX) {
          setHint(world, 'Tray full! Serve or trash something first.');
          return EVENT_DENIED;
        }
        world.tray.push(slot.doneId);
        world.grill[i] = null;
        return EVENT_GRILL_DONE;
      }
      if (slot && slot.state === 'burnt') {
        if (world.tray.length >= TRAY_MAX) {
          setHint(world, 'Tray full! Serve or trash something first.');
          return EVENT_DENIED;
        }
        world.tray.push(slot.burntId);
        world.grill[i] = null;
        setHint(world, 'Burnt! Toss it in the trash.');
        return EVENT_BURNT;
      }
    }
    // Otherwise place a grillable item.
    const idx = world.tray.findIndex((id) => INGREDIENTS[id] && INGREDIENTS[id].kind === 'grill');
    const free = world.grill.findIndex((s) => s === null);
    if (idx === -1) {
      setHint(world, 'Nothing to grill — grab a patty or an egg first.');
      return EVENT_DENIED;
    }
    if (free === -1) {
      setHint(world, 'Grill is full!');
      return EVENT_DENIED;
    }
    const id = world.tray.splice(idx, 1)[0];
    const def = INGREDIENTS[id];
    world.grill[free] = { id, t: 0, cook: def.grillSeconds, doneId: def.grillTo, burntId: id === 'patty' ? 'patty_burnt' : 'egg_burnt', state: 'cooking' };
    return EVENT_GRILL_PLACE;
  }

  if (station.kind === 'serve') {
    const order = matchingOrder(world);
    if (!order) {
      if (world.tray.length === 0) setHint(world, 'Plate is empty — build a dish first!');
      else setHint(world, 'No order wants this dish. Check the board!');
      return EVENT_DENIED;
    }
    return serveOrder(world, order);
  }

  if (station.kind === 'trash') {
    if (world.tray.length === 0) {
      setHint(world, 'Nothing to throw away.');
      return EVENT_DENIED;
    }
    world.tray = [];
    world.combo = 0;
    return EVENT_TRASH;
  }
  return EVENT_NONE;
}

// --- Tick -------------------------------------------------------------------

export function stepWorld(world, dt, moveX, moveY) {
  if (world.over) return EVENT_NONE;
  let events = EVENT_NONE;
  world.time += dt;
  world.shiftLeft -= dt;

  // Chef busy work (chopping).
  const chef = world.chef;
  if (chef.busy > 0) {
    chef.busy -= dt;
    chef.chopFlash += dt;
    if (chef.busy <= 0 && chef.busyKind === 'chop') {
      const idx = chef.busyTarget;
      const raw = world.tray[idx];
      if (raw && INGREDIENTS[raw] && INGREDIENTS[raw].chopTo) {
        world.tray[idx] = INGREDIENTS[raw].chopTo;
        burst(world, chef.x, chef.y - 34, '#9fe870', 10);
        events |= EVENT_CHOP_DONE;
      }
      chef.busyKind = null;
      chef.busyTarget = null;
    }
  }

  moveChef(world, moveX, moveY, dt);

  // Grill timers.
  for (let i = 0; i < world.grill.length; i += 1) {
    const slot = world.grill[i];
    if (!slot) continue;
    slot.t += dt;
    if (slot.state === 'cooking' && slot.t >= slot.cook) {
      slot.state = 'ready';
      events |= EVENT_GRILL_READY;
      addPopup(world, 770, 200, `${INGREDIENTS[slot.doneId].name} ready!`, '#ffd94d');
    } else if (slot.state === 'ready' && slot.t >= slot.cook + 7) {
      slot.state = 'burnt';
      events |= EVENT_BURNT;
      addPopup(world, 770, 200, 'Burnt on the grill!', '#ff7a6b');
    }
  }

  // Orders: spawn and patience.
  world.spawnIn -= dt;
  if (world.spawnIn <= 0 && world.orders.length < MAX_ORDERS) {
    spawnOrder(world);
    world.spawnIn = spawnInterval(world.level);
  }
  for (const order of [...world.orders]) {
    order.patience -= dt;
    if (order.patience <= 0) events |= expireOrder(world, order);
    if (world.over) break;
  }
  if (world.over) return events | EVENT_SHIFT_OVER;

  // Popups and particles.
  for (const p of world.popups) p.life -= dt;
  world.popups = world.popups.filter((p) => p.life > 0);
  for (const pt of world.particles) {
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vy += 160 * dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);

  if (world.shiftLeft <= 0) {
    world.shiftLeft = 0;
    events |= endShift(world, true);
  }
  return events;
}

export function dishNameFor(order) {
  return order.recipe.name;
}

export { INGREDIENTS, RECIPES };
