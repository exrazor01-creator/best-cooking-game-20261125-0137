// Scripted scenes for screenshots (?shot=title|play|serve|results) and for the
// judge's replay. Every scene is deterministic for a given ?seed=N: orders and
// grill timers are built from the world's own rules and fixed values, never
// from a live random draw, and the frame is painted by the real renderer.
//
//   ?shot=title    — title screen over a set-up kitchen (cover)
//   ?shot=play     — mid-shift: chef chopping, patty on the grill, 3 orders up
//   ?shot=serve    — a finished burger on the plate at the serve hatch, READY!
//   ?shot=results  — end of a won shift, 3 stars, stats on the board
//
// After the scene is painted, window.__shotReady is set so the screenshot
// harness knows the frame is settled.

import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { spawnOrder } from './state.js';

function placeOrders(world, count) {
  for (let i = 0; i < count; i += 1) spawnOrder(world);
  // Spread patience so the board reads at a glance.
  world.orders.forEach((o, i) => {
    o.patience = o.maxPatience * (0.85 - i * 0.22);
  });
}

export function buildScene(shot, world) {
  if (shot === 'play') {
    world.time = 42;
    world.shiftLeft = 108;
    world.score = 120;
    world.coins = 120;
    world.served = 3;
    world.level = 2;
    world.combo = 2;
    placeOrders(world, 3);
    // Chef at the chopping board, mid-chop on a tomato.
    world.chef.x = 415;
    world.chef.y = 268;
    world.chef.dir = 1;
    world.tray = ['tomato', 'bun'];
    world.chef.busy = 0.5;
    world.chef.busyKind = 'chop';
    world.chef.busyTarget = 0;
    world.chef.chopFlash = 0.4;
    // A patty halfway through grilling.
    world.grill[0] = { id: 'patty', t: 3, cook: 6, doneId: 'patty_cooked', burntId: 'patty_burnt', state: 'cooking' };
    return { screen: SCREEN_PLAY };
  }
  if (shot === 'serve') {
    world.time = 71;
    world.shiftLeft = 79;
    world.score = 215;
    world.coins = 215;
    world.served = 6;
    world.level = 2;
    world.combo = 3;
    placeOrders(world, 3);
    // Force the first order to be the burger this plate completes.
    const burger = world.orders.find((o) => o.recipe.id === 'burger');
    if (burger) {
      world.orders = [burger, ...world.orders.filter((o) => o !== burger)];
    } else {
      world.orders[0].recipe = { id: 'burger', name: 'Classic Burger', unlock: 2, coins: 45, needs: ['bun', 'patty_cooked', 'tomato_chopped'] };
      world.orders[0].patience = world.orders[0].maxPatience * 0.62;
    }
    world.tray = ['bun', 'patty_cooked', 'tomato_chopped'];
    world.chef.x = 1130;
    world.chef.y = 305;
    world.chef.dir = 1;
    world.grill[1] = { id: 'egg', t: 5, cook: 5, doneId: 'egg_cooked', burntId: 'egg_burnt', state: 'ready' };
    world.popups.push({ x: 1130, y: 380, text: '+45 coins', color: '#7be07b', life: 1.2, max: 1.4 });
    return { screen: SCREEN_PLAY };
  }
  if (shot === 'results') {
    world.time = 150;
    world.shiftLeft = 0;
    world.score = 812;
    world.coins = 812;
    world.served = 17;
    world.bestCombo = 5;
    world.level = 4;
    world.over = true;
    world.won = true;
    world.stars = 3;
    world.expiredCount = 1;
    placeOrders(world, 2);
    world.chef.x = 640;
    world.chef.y = 470;
    return { screen: SCREEN_OVER };
  }
  // title (default): a set-up kitchen behind the title panel.
  world.time = 3;
  world.shiftLeft = 150;
  placeOrders(world, 2);
  world.chef.x = 640;
  world.chef.y = 470;
  world.tray = ['bun', 'tomato_chopped'];
  world.grill[0] = { id: 'patty', t: 2, cook: 6, doneId: 'patty_cooked', burntId: 'patty_burnt', state: 'cooking' };
  return { screen: SCREEN_TITLE };
}

export function markShotReady(delayMs = 450) {
  setTimeout(() => {
    window.__shotReady = true;
  }, delayMs);
}
