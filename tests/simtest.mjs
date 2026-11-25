// Headless rules test for Simmer & Serve — drives game/src/state.js in Node
// (no DOM, no browser): every recipe buildable, serve loop, grill burn,
// expiry/strikes, level-up, shift end, tray cap. Run: node tests/simtest.mjs
const { createRandom } = await import(new URL('../game/src/rng.js', import.meta.url));
const {
  STEP, createWorld, interact, matchingOrder, stepWorld,
} = await import(new URL('../game/src/state.js', import.meta.url));
const { RECIPES, STATIONS } = await import(new URL('../game/src/config.js', import.meta.url));

let pass = 0, fail = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  ok ? pass++ : fail++;
}
function stepN(world, n, mx = 0, my = 0) { for (let i = 0; i < n; i++) stepWorld(world, STEP, mx, my); }
function at(world, x, y) { world.chef.x = x; world.chef.y = y; }
function binPos(id) { const i = STATIONS.bins.findIndex((b) => b.id === id); return { x: 210, y: 116 + i * 92 + 42 }; }
function grab(world, id) { const p = binPos(id); at(world, p.x, p.y); return interact(world); }
function useBoard(world) { at(world, 415, 260); return interact(world); }
function useGrill(world) { at(world, 770, 260); return interact(world); }
function useServe(world) { at(world, 1130, 260); return interact(world); }
function useTrash(world) { at(world, 1100, 716); return interact(world); }

function buildDish(world, needs) {
  for (const need of needs) {
    if (need.endsWith('_chopped')) {
      const raw = need.replace('_chopped', '');
      grab(world, raw); useBoard(world); stepN(world, 90); // 1.5s > 1.2s chop
    } else if (need === 'patty_cooked' || need === 'egg_cooked') {
      const raw = need === 'patty_cooked' ? 'patty' : 'egg';
      grab(world, raw); useGrill(world);
      stepN(world, need === 'patty_cooked' ? 380 : 320); // cook + margin
      useGrill(world); // collect
    } else {
      grab(world, need);
    }
  }
}

// 1. Every recipe is buildable from a full tray (guards the Veggie Stack
// regression: it needs 4 items, so TRAY_MAX must be 4).
for (const recipe of RECIPES) {
  const world = createWorld(createRandom(7));
  world.orders = [{ id: 99, recipe, patience: 60, maxPatience: 60, born: 0 }];
  buildDish(world, recipe.needs);
  check(`recipe "${recipe.name}" (${recipe.needs.length} items) buildable`,
    matchingOrder(world) !== null, `tray=[${world.tray.join(',')}]`);
}

// 2. Full serve loop: salad served, coins + tip, tray empties.
{
  const world = createWorld(createRandom(7));
  const salad = RECIPES.find((r) => r.id === 'salad');
  world.orders = [{ id: 1, recipe: salad, patience: 50, maxPatience: 50, born: 0 }];
  buildDish(world, salad.needs);
  const before = world.coins;
  useServe(world);
  check('salad serves, coins increase', world.coins > before && world.served === 1, `coins=${world.coins}`);
  check('tray empties after serve', world.tray.length === 0);
}

// 3. Grill burns if left ~7s past ready; burnt item matches nothing, trash clears it.
{
  const world = createWorld(createRandom(7));
  grab(world, 'patty'); useGrill(world);
  stepN(world, 365); // just past 6s cook time (1/60s steps accumulate float error)
  check('patty ready just past 6s', world.grill[0]?.state === 'ready');
  stepN(world, 430); // +7.2s past ready
  check('patty burnt after ~7s past ready', world.grill[0]?.state === 'burnt');
  useGrill(world); // collect burnt
  check('burnt patty lands on tray, cannot match any order',
    world.tray.includes('patty_burnt') && matchingOrder(world) === null);
  useTrash(world);
  check('trash empties tray', world.tray.length === 0);
}

// 4. Order expiry = strike; 3 strikes end the shift (lost).
{
  const world = createWorld(createRandom(7));
  world.orders = [{ id: 1, recipe: RECIPES[0], patience: 0.5, maxPatience: 50, born: 0 }];
  stepN(world, 60);
  check('expired order = 1 strike', world.strikes === 1 && world.orders.length === 0);
  world.orders = [
    { id: 2, recipe: RECIPES[0], patience: 0.1, maxPatience: 50, born: 0 },
    { id: 3, recipe: RECIPES[0], patience: 0.1, maxPatience: 50, born: 0 },
  ];
  stepN(world, 60);
  check('3 strikes end shift (lost)', world.over === true && world.won === false, `strikes=${world.strikes}`);
}

// 5. Level-up at 4 served; with no more orders the clock ends the shift won.
{
  const world = createWorld(createRandom(7));
  const salad = RECIPES.find((r) => r.id === 'salad');
  for (let i = 0; i < 4; i++) {
    world.orders = [{ id: 10 + i, recipe: salad, patience: 50, maxPatience: 50, born: 0 }];
    buildDish(world, salad.needs);
    useServe(world);
  }
  check('level 2 after 4 served', world.level === 2, `level=${world.level} served=${world.served}`);
  world.orders = [];
  world.spawnIn = 1e9; // no new orders: an idle kitchen must not strike out
  stepN(world, 150 * 60);
  check('shift ends at 150s, won', world.over && world.won, `coins=${world.coins} stars=${world.stars}`);
}

// 6. Spawn: orders arrive, capped at 4.
{
  const world = createWorld(createRandom(1));
  stepN(world, 60 * 60);
  check('orders spawn over a minute', world.orders.length > 0, `orders=${world.orders.length}`);
  check('orders capped at 4', world.orders.length <= 4);
}

// 7. Tray cap: 4 items fit, the 5th pickup is denied.
{
  const world = createWorld(createRandom(7));
  grab(world, 'bun'); grab(world, 'cheese'); grab(world, 'tomato'); grab(world, 'lettuce');
  check('4 items fit on the tray', world.tray.length === 4, `tray=[${world.tray.join(',')}]`);
  grab(world, 'onion');
  check('5th pickup denied at tray cap 4', world.tray.length === 4);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
