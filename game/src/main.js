// Simmer & Serve — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// and the renderer paints what is there. The game moves between four screens:
// title, play, paused and shift over.
//
// ?seed=N fixes the order pattern. ?shot=title|play|serve|results (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { BEST_KEY } from './config.js';
import { createRandom } from './rng.js';
import {
  EVENT_BURNT, EVENT_CHOP_DONE, EVENT_CHOP_START, EVENT_COMBO, EVENT_DENIED,
  EVENT_EXPIRED, EVENT_GRILL_DONE, EVENT_GRILL_PLACE, EVENT_GRILL_READY,
  EVENT_LEVEL_UP, EVENT_PICKUP, EVENT_SERVED, EVENT_SHIFT_OVER, EVENT_TRASH,
  STEP, createWorld, interact, resetWorld, stepWorld,
} from './state.js';
import { ACTION_CONFIRM, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, createRenderer } from './render.js';
import { buildScene, markShotReady } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score lasts this visit only.
  }
}

function soundFor(events) {
  if (events & EVENT_SERVED) audio.serve();
  if (events & EVENT_COMBO) audio.combo();
  if (events & EVENT_LEVEL_UP) audio.levelUp();
  if (events & EVENT_PICKUP) audio.pickup();
  if (events & EVENT_CHOP_START) audio.chop();
  if (events & EVENT_CHOP_DONE) audio.chop();
  if (events & EVENT_GRILL_PLACE) audio.grillPlace();
  if (events & EVENT_GRILL_DONE) audio.pickup();
  if (events & EVENT_GRILL_READY) audio.ready();
  if (events & EVENT_BURNT) audio.expire();
  if (events & EVENT_EXPIRED) audio.expire();
  if (events & EVENT_TRASH) audio.trash();
  if (events & EVENT_DENIED) audio.denied();
  if (events & EVENT_SHIFT_OVER) audio.end();
}

function runShot(name) {
  const scene = buildScene(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, world.coins);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else markShotReady();
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let clickGoal = null;
  let sizzleAt = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    resetWorld(world);
    accumulator = 0;
    clickGoal = null;
    screen = SCREEN_PLAY;
    announce('Cooking! Grab ingredients, chop, grill, serve before orders walk out.');
  }

  function endShift() {
    screen = SCREEN_OVER;
    if (world.coins > best) {
      best = world.coins;
      saveBest(best);
    }
    announce(world.won
      ? `Shift complete! ${world.coins} coins, ${world.served} orders served.`
      : `Shift cut short. ${world.coins} coins, ${world.served} orders served.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      audio.unlock();
      startGame();
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Cooking!');
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_INTERACT | ACTION_CONFIRM) && screen === SCREEN_PLAY) {
      audio.unlock();
      soundFor(interact(world));
    }
  }

  function handleClick() {
    const click = input.takeClick();
    if (!click) return;
    audio.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    clickGoal = { x: click.x, y: click.y, station: click.station };
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // A quiet kitchen idles behind the title: orders drift in, nothing expires.
      world.time += STEP;
      return;
    }
    let mx = 0;
    let my = 0;
    const keys = input.direction();
    mx += keys.x;
    my += keys.y;
    if (clickGoal && (mx !== 0 || my !== 0)) clickGoal = null;
    if (clickGoal && screen === SCREEN_PLAY) {
      const dx = clickGoal.x - world.chef.x;
      const dy = clickGoal.y - world.chef.y;
      const d = Math.hypot(dx, dy);
      if (d < 12) {
        if (clickGoal.station) {
          soundFor(interact(world));
          input.clearClick();
        }
        clickGoal = null;
      } else {
        mx = dx / d;
        my = dy / d;
      }
    }
    const events = stepWorld(world, STEP, mx, my);
    if (events) soundFor(events);
    if (world.grill.some((s) => s && s.state === 'cooking') && world.time - sizzleAt > 0.9) {
      sizzleAt = world.time;
      audio.sizzle();
    }
    if (world.over) endShift();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    handleClick();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Simmer and Serve. Press Enter or click to start cooking.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
