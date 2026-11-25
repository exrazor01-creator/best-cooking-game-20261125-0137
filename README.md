# Simmer & Serve — Rush Hour Kitchen

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/exrazor01-creator/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/exrazor01-creator/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

Built for the [make.fun best-cooking-game bounty](https://make.fun/bounty/best-cooking-game-20261125-0137).

**Simmer & Serve** is an original rush-hour cooking game. You are the only chef
on shift in a small kitchen: orders land on the board with a patience timer,
and you have 2 minutes 30 seconds to serve as many as you can before the shift
ends — or before three orders walk out hungry.

## How to play

- **Move** with **WASD / Arrow keys**, or **click** the floor to walk there.
- **Use a station** with **E / Space**, or click a station to walk over and use it.
- **Ingredient bins** (left wall): grab tomato, lettuce, onion, cheese, bun,
  egg or patty. Your tray holds up to 4 things.
- **Chopping board**: chop raw tomato, lettuce or onion (takes ~1 second).
- **Grill**: grill patties (6 s) and eggs (5 s). Collect them when the green
  tick shows — leave them ~7 s too long and they **burn**.
- **Serve window** (top right): when the plate you carry exactly matches an
  order on the board, it glows gold — serve it there for coins.
- **Trash** (bottom right): dump a wrong or burnt item.
- **P** pauses, **M** mutes, **Enter** starts / restarts.

## Recipes

| Dish | Needs | Unlocks |
| --- | --- | --- |
| Garden Salad | chopped tomato + chopped lettuce | Level 1 |
| Sunny Omelette | fried egg + cheese | Level 1 |
| Classic Burger | bun + grilled patty + chopped tomato | Level 2 |
| Cheese Melt Burger | bun + grilled patty + cheese | Level 2 |
| Veggie Stack | bun + chopped lettuce + chopped onion + chopped tomato | Level 3 |
| Sunrise Plate | fried egg + grilled patty + chopped onion | Level 4 |

Serve fast for a tip (up to +50%), and serve three orders in a row without a
miss for a **combo bonus**. Every 4 served orders raises the level: new
recipes unlock, orders arrive faster and patience runs shorter. Finish the
shift to earn 1–3 stars by coins earned.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no dependencies, no network requests — the game is static files
under `game/` (HTML + ES modules + canvas-drawn art and a tiny WebAudio synth).

## Screenshots

The four screenshots in `screenshots/` are real renders of the game's own
code, driven by `?shot=title|play|serve|results&seed=1`.

## Tests

The rules live in `game/src/state.js` (no DOM), and are driven headlessly in
Node — fetch, chop, grill, burn, serve, expiry, level-up and shift end:

```sh
node tests/simtest.mjs   # 20 checks, all passing
```

## Referral

Built for the make.fun best-cooking-game bounty — play it via my referral:
https://make.fun/r/9taf1vak
