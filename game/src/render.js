// Simmer & Serve — the painter. Everything is drawn with canvas shapes:
// the tiled kitchen floor, the counters and stations, the chef and the plate
// they carry, the order board, and the title / pause / end screens.
import { HUD_HEIGHT, INGREDIENTS, STATIONS, VIEW } from './config.js';
import { matchingOrder, stationInRange, trayReady } from './state.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TILE_A = '#c98f5f';
const TILE_B = '#bd7f52';
const WALL = '#8a5a3b';
const COUNTER_TOP = '#a4713f';
const COUNTER_BODY = '#7c4f2a';
const CREAM = '#fff4dd';
const INK = '#3a2415';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'center', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

// --- Ingredient icons -------------------------------------------------------
export function drawIngredient(ctx, id, x, y, r) {
  const def = INGREDIENTS[id] ?? INGREDIENTS.tomato;
  ctx.save();
  ctx.translate(x, y);
  switch (id) {
    case 'tomato':
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 2, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3e8f31';
      ctx.beginPath(); ctx.moveTo(0, -r - 2); ctx.lineTo(-r * 0.5, -r * 0.2); ctx.lineTo(0, -r * 0.45); ctx.lineTo(r * 0.5, -r * 0.2); ctx.closePath(); ctx.fill();
      break;
    case 'tomato_chopped':
      // A tomato slice: red ring, pale flesh, seeds.
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd9d0';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2a49a';
      ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.1, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.25, -r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.12, 0, Math.PI * 2); ctx.fill();
      break;
    case 'lettuce':
      ctx.fillStyle = def.dark;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = def.color;
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.55, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'lettuce_chopped':
      ctx.strokeStyle = def.color;
      ctx.lineWidth = r * 0.34;
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath(); ctx.moveTo(-r * 0.8, i * r * 0.55); ctx.lineTo(r * 0.8, i * r * 0.55); ctx.stroke();
      }
      break;
    case 'onion':
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 1, r * 0.95, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e8d5f5';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 1, r * 0.6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 1, r * 0.3, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'onion_chopped':
      ctx.fillStyle = def.color;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath(); ctx.arc(-r * 0.4 + (i % 2) * r * 0.8, -r * 0.35 + Math.floor(i / 2) * r * 0.7, r * 0.32, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = '#e8d5f5';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath(); ctx.arc(-r * 0.4 + (i % 2) * r * 0.8, -r * 0.35 + Math.floor(i / 2) * r * 0.7, r * 0.16, 0, Math.PI * 2); ctx.stroke();
      }
      break;
    case 'cheese':
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.moveTo(-r, r * 0.7); ctx.lineTo(r, r * 0.7); ctx.lineTo(0, -r * 0.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = def.dark;
      ctx.beginPath(); ctx.arc(-r * 0.25, r * 0.3, r * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.3, r * 0.05, r * 0.12, 0, Math.PI * 2); ctx.fill();
      break;
    case 'bun':
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, r * 0.25, r, Math.PI, 0); ctx.fill();
      ctx.fillRect(-r, r * 0.25, r * 2, r * 0.35);
      ctx.fillStyle = '#fff2cf';
      ctx.beginPath(); ctx.arc(-r * 0.4, -r * 0.3, r * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.1, -r * 0.55, r * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.5, -r * 0.25, r * 0.1, 0, Math.PI * 2); ctx.fill();
      break;
    case 'egg':
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.75, r, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = def.dark;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.75, r, 0, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'egg_cooked':
      ctx.fillStyle = '#fffdf5';
      ctx.beginPath(); ctx.arc(-r * 0.15, r * 0.1, r * 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.2, r * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffbf2e';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffdf6b';
      ctx.beginPath(); ctx.arc(-r * 0.12, -r * 0.12, r * 0.22, 0, Math.PI * 2); ctx.fill();
      break;
    case 'patty':
      ctx.fillStyle = def.color;
      rr(ctx, -r, -r * 0.62, r * 2, r * 1.24, r * 0.5);
      ctx.fill();
      ctx.fillStyle = def.dark;
      ctx.beginPath(); ctx.arc(-r * 0.4, 0, r * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.2, r * 0.14, 0, Math.PI * 2); ctx.fill();
      break;
    case 'patty_cooked':
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.68, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = def.dark;
      ctx.lineWidth = 2.5;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath(); ctx.moveTo(i * r * 0.45 - r * 0.3, -r * 0.5); ctx.lineTo(i * r * 0.45 + r * 0.3, r * 0.5); ctx.stroke();
      }
      break;
    case 'patty_burnt':
    case 'egg_burnt':
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a4632';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.3); ctx.lineTo(r * 0.3, r * 0.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.4, -r * 0.4); ctx.lineTo(-r * 0.3, r * 0.3); ctx.stroke();
      break;
    default:
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawFloor(ctx) {
  const tile = 64;
  for (let y = HUD_HEIGHT; y < VIEW.height; y += tile) {
    for (let x = 0; x < VIEW.width; x += tile) {
      const even = ((x / tile) + (y / tile)) % 2 === 0;
      ctx.fillStyle = even ? TILE_A : TILE_B;
      ctx.fillRect(x, y, tile, tile);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let y = HUD_HEIGHT; y < VIEW.height; y += tile) ctx.fillRect(0, y, VIEW.width, 2);
  for (let x = 0; x < VIEW.width; x += tile) ctx.fillRect(x, HUD_HEIGHT, 2, VIEW.height - HUD_HEIGHT);
  // A worn rug where the chef does most of the running.
  ctx.fillStyle = '#a34d3a';
  rr(ctx, 400, 620, 480, 120, 18);
  ctx.fill();
  ctx.strokeStyle = '#e8c9a0';
  ctx.lineWidth = 3;
  rr(ctx, 412, 632, 456, 96, 12);
  ctx.stroke();
  ctx.fillStyle = 'rgba(232,201,160,0.35)';
  ctx.beginPath(); ctx.arc(640, 680, 26, 0, Math.PI * 2); ctx.fill();
}

function drawCounter(ctx, s, near) {
  ctx.fillStyle = COUNTER_BODY;
  rr(ctx, s.x, s.y + 10, s.w, s.h - 6, 8);
  ctx.fill();
  ctx.fillStyle = COUNTER_TOP;
  rr(ctx, s.x - 4, s.y, s.w + 8, 18, 8);
  ctx.fill();
  if (near) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 3;
    rr(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 10);
    ctx.stroke();
  }
}

function drawBins(ctx, world, nearId) {
  for (const bin of STATIONS.bins) {
    const near = nearId === bin.id;
    ctx.fillStyle = '#6e4526';
    rr(ctx, bin.x, bin.y, bin.w, bin.h, 10);
    ctx.fill();
    ctx.fillStyle = '#8a5a30';
    rr(ctx, bin.x + 5, bin.y + 5, bin.w - 10, bin.h - 10, 8);
    ctx.fill();
    drawIngredient(ctx, bin.id, bin.x + 30, bin.y + bin.h / 2, 17);
    text(ctx, INGREDIENTS[bin.id].label, bin.x + 52, bin.y + bin.h / 2 - 2, 15, CREAM, 'left');
    const def = INGREDIENTS[bin.id];
    const verb = def.kind === 'raw' ? 'chop' : def.kind === 'grill' ? 'grill' : 'ready';
    text(ctx, verb, bin.x + 52, bin.y + bin.h / 2 + 18, 11, '#e8c9a0', 'left', '400');
    if (near) {
      ctx.strokeStyle = '#ffd94d';
      ctx.lineWidth = 3;
      rr(ctx, bin.x - 3, bin.y - 3, bin.w + 6, bin.h + 6, 12);
      ctx.stroke();
    }
  }
}

function drawBoard(ctx, world, near) {
  const s = STATIONS.board;
  drawCounter(ctx, s, near);
  // Wooden chopping board with a knife.
  ctx.fillStyle = '#d9a86c';
  rr(ctx, s.x + 30, s.y + 22, 120, 40, 8);
  ctx.fill();
  ctx.fillStyle = '#e8c491';
  rr(ctx, s.x + 30, s.y + 22, 120, 40, 8);
  ctx.fill();
  ctx.strokeStyle = '#8a6a45';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(s.x + 50, s.y + 30); ctx.lineTo(s.x + 50, s.y + 54); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s.x + 80, s.y + 30); ctx.lineTo(s.x + 80, s.y + 54); ctx.stroke();
  // Knife.
  ctx.save();
  ctx.translate(s.x + 180, s.y + 42);
  ctx.rotate(-0.5);
  ctx.fillStyle = '#c8ccd4';
  rr(ctx, 0, -6, 44, 12, 5);
  ctx.fill();
  ctx.fillStyle = '#4a3220';
  rr(ctx, -20, -5, 20, 10, 4);
  ctx.fill();
  ctx.restore();
  text(ctx, 'CHOPPING BOARD', s.x + s.w / 2, s.y + s.h - 2, 11, CREAM, 'center', '700');
}

function drawGrill(ctx, world, near) {
  const s = STATIONS.grill;
  drawCounter(ctx, s, near);
  ctx.fillStyle = '#2e2a28';
  rr(ctx, s.x + 16, s.y + 20, s.w - 32, 42, 8);
  ctx.fill();
  // Two slots.
  for (let i = 0; i < 2; i += 1) {
    const cx = s.x + 70 + i * 120;
    const cy = s.y + 41;
    const slot = world.grill[i];
    ctx.strokeStyle = '#5a5148';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.stroke();
    if (slot) {
      const frac = Math.min(1, slot.t / slot.cook);
      if (slot.state === 'cooking') {
        // Flames under the food.
        ctx.fillStyle = i % 2 ? '#ff9d2e' : '#ff7a1a';
        ctx.beginPath();
        ctx.moveTo(cx - 14, cy + 16);
        ctx.quadraticCurveTo(cx - 18, cy + 2, cx - 6, cy - 4);
        ctx.quadraticCurveTo(cx, cy - 16, cx + 6, cy - 4);
        ctx.quadraticCurveTo(cx + 18, cy + 2, cx + 14, cy + 16);
        ctx.closePath();
        ctx.fill();
        drawIngredient(ctx, slot.id, cx, cy - 4, 15);
        ctx.strokeStyle = '#ffd94d';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, 27, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
      } else if (slot.state === 'ready') {
        drawIngredient(ctx, slot.doneId, cx, cy, 17);
        ctx.fillStyle = '#7be07b';
        ctx.beginPath(); ctx.arc(cx + 16, cy - 16, 8, 0, Math.PI * 2); ctx.fill();
        text(ctx, '✓', cx + 16, cy - 15, 11, '#12351a');
      } else {
        drawIngredient(ctx, slot.burntId, cx, cy, 17);
        ctx.fillStyle = 'rgba(120,120,120,0.7)';
        ctx.beginPath(); ctx.arc(cx - 6, cy - 22, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 4, cy - 30, 7, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      text(ctx, '—', cx, cy, 18, '#8a8078');
    }
  }
  text(ctx, 'GRILL', s.x + s.w / 2, s.y + s.h - 2, 11, CREAM, 'center', '700');
}

function drawServe(ctx, world, near) {
  const s = STATIONS.serve;
  const ready = trayReady(world);
  drawCounter(ctx, s, near);
  // Lit hatch.
  ctx.fillStyle = ready ? '#fff3c4' : '#ffe9b0';
  rr(ctx, s.x + 16, s.y + 18, s.w - 32, 44, 8);
  ctx.fill();
  ctx.fillStyle = '#7c4f2a';
  for (let i = 0; i < 4; i += 1) ctx.fillRect(s.x + 30 + i * 52, s.y + 18, 5, 44);
  // Service bell.
  ctx.fillStyle = '#f7c948';
  ctx.beginPath(); ctx.arc(s.x + s.w - 34, s.y + 40, 13, Math.PI, 0); ctx.fill();
  ctx.fillRect(s.x + s.w - 47, s.y + 40, 26, 4);
  ctx.fillStyle = '#d9a521';
  ctx.beginPath(); ctx.arc(s.x + s.w - 34, s.y + 47, 3, 0, Math.PI * 2); ctx.fill();
  text(ctx, ready ? 'SERVE HERE!' : 'SERVE WINDOW', s.x + s.w / 2 - 14, s.y + s.h - 2, 11, ready ? '#2e7d32' : CREAM, 'center', '700');
  if (ready) {
    ctx.strokeStyle = '#7be07b';
    ctx.lineWidth = 4;
    rr(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 10);
    ctx.stroke();
  }
}

function drawTrash(ctx, near) {
  const s = STATIONS.trash;
  ctx.fillStyle = '#5b6068';
  rr(ctx, s.x + 14, s.y + 8, s.w - 28, s.h - 8, 8);
  ctx.fill();
  ctx.fillStyle = '#787d85';
  rr(ctx, s.x + 8, s.y, s.w - 16, 14, 6);
  ctx.fill();
  ctx.strokeStyle = '#3c4046';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath(); ctx.moveTo(s.x + 34 + i * 18, s.y + 24); ctx.lineTo(s.x + 34 + i * 18, s.y + s.h - 16); ctx.stroke();
  }
  text(ctx, 'TRASH', s.x + s.w / 2, s.y + s.h - 4, 11, CREAM, 'center', '700');
  if (near) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 3;
    rr(ctx, s.x - 3, s.y - 3, s.w + 6, s.h + 6, 10);
    ctx.stroke();
  }
}

function drawChef(ctx, world) {
  const chef = world.chef;
  const bob = chef.moving ? Math.sin(world.time * 14) * 2 : 0;
  ctx.save();
  ctx.translate(chef.x, chef.y + bob);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 20, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
  // Body / apron.
  ctx.fillStyle = '#f5f1e6';
  rr(ctx, -20, -8, 40, 34, 12);
  ctx.fill();
  ctx.fillStyle = '#d94f3d';
  ctx.fillRect(-20, 8, 40, 6);
  // Head.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath(); ctx.arc(0, -20, 15, 0, Math.PI * 2); ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-8, -32, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -36, 10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(8, -32, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-13, -34, 26, 8);
  // Eyes.
  ctx.fillStyle = '#2b2118';
  ctx.beginPath(); ctx.arc(-5 * chef.dir, -21, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5 * chef.dir, -21, 1.8, 0, Math.PI * 2); ctx.fill();
  // Carried plate with the dish, above the head.
  if (world.tray.length > 0) {
    const ready = trayReady(world);
    ctx.save();
    ctx.translate(0, -58);
    if (ready) {
      ctx.strokeStyle = '#ffd94d';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 26 + Math.sin(world.time * 6) * 2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(0, 0, 26, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c8ccd4';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 26, 9, 0, 0, Math.PI * 2); ctx.stroke();
    const n = world.tray.length;
    world.tray.forEach((id, i) => {
      const ox = n === 1 ? 0 : (i - (n - 1) / 2) * 16;
      drawIngredient(ctx, id, ox, -4, 10);
    });
    ctx.restore();
    if (ready) {
      text(ctx, 'READY!', 0, -92, 13, '#ffd94d', 'center', '800');
    }
  }
  // Chopping progress ring.
  if (chef.busy > 0 && chef.busyKind === 'chop') {
    const frac = 1 - chef.busy / 1.2;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, -58, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#7be07b';
    ctx.beginPath(); ctx.arc(0, -58, 22, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    text(ctx, 'CHOP!', 0, 48, 12, '#fff', 'center', '800');
  }
  ctx.restore();
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPopups(ctx, world) {
  for (const p of world.popups) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 0.8));
    text(ctx, p.text, p.x, p.y - (1.4 - p.life) * 30, 20, p.color, 'center', '800');
  }
  ctx.globalAlpha = 1;
}

function drawTicket(ctx, order, x, y, w, h, highlight) {
  const frac = Math.max(0, order.patience / order.maxPatience);
  ctx.fillStyle = highlight ? '#fff8e0' : '#fffdf5';
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = highlight ? '#ffd94d' : '#d9c9a8';
  ctx.lineWidth = highlight ? 3 : 1.5;
  rr(ctx, x, y, w, h, 8);
  ctx.stroke();
  text(ctx, order.recipe.name, x + 10, y + 12, 13, INK, 'left', '800');
  text(ctx, `${order.recipe.coins}c`, x + w - 10, y + 12, 13, '#2e7d32', 'right', '800');
  order.recipe.needs.forEach((id, i) => {
    drawIngredient(ctx, id, x + 22 + i * 32, y + 31, 11);
  });
  // Patience bar.
  const barW = w - 20;
  ctx.fillStyle = '#e8dcc4';
  rr(ctx, x + 10, y + h - 12, barW, 7, 3);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#5fb84a' : frac > 0.25 ? '#f7a928' : '#e5484d';
  if (frac > 0) {
    rr(ctx, x + 10, y + h - 12, barW * frac, 7, 3);
    ctx.fill();
  }
}

function drawHud(ctx, world, best) {
  ctx.fillStyle = '#5b3a24';
  ctx.fillRect(0, 0, VIEW.width, HUD_HEIGHT);
  ctx.fillStyle = '#6e4526';
  ctx.fillRect(0, HUD_HEIGHT - 6, VIEW.width, 6);
  // Score / coins / level.
  text(ctx, `SCORE ${world.score}`, 18, 20, 17, CREAM, 'left', '800');
  ctx.fillStyle = '#f7c948';
  ctx.beginPath(); ctx.arc(26, 46, 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d9a521';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(26, 46, 7, 0, Math.PI * 2); ctx.stroke();
  text(ctx, `${world.coins} coins`, 38, 46, 15, '#ffd94d', 'left', '700');
  text(ctx, `LEVEL ${world.level}`, 18, 68, 13, '#9fe870', 'left', '700');
  // Order board.
  text(ctx, 'ORDERS', 268, 14, 11, '#e8c9a0', 'left', '800');
  for (let i = 0; i < 4; i += 1) {
    const x = 268 + i * 198;
    const order = world.orders[i];
    if (order) {
      const match = matchingOrder(world);
      drawTicket(ctx, order, x, 20, 188, 58, match !== null && match.id === order.id);
    } else {
      ctx.fillStyle = 'rgba(255,244,221,0.12)';
      rr(ctx, x, 20, 188, 58, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,244,221,0.25)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      rr(ctx, x, 20, 188, 58, 8);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // Shift timer (right).
  const shiftFrac = Math.max(0, world.shiftLeft / 150);
  const mm = Math.floor(world.shiftLeft / 60);
  const ss = Math.floor(world.shiftLeft % 60).toString().padStart(2, '0');
  text(ctx, `SHIFT ${mm}:${ss}`, 1078, 20, 16, shiftFrac < 0.2 ? '#ff9a8a' : CREAM, 'left', '800');
  ctx.fillStyle = '#3a2415';
  rr(ctx, 1078, 34, 186, 10, 5);
  ctx.fill();
  ctx.fillStyle = shiftFrac < 0.2 ? '#e5484d' : '#ffd94d';
  if (shiftFrac > 0) {
    rr(ctx, 1078, 34, 186 * shiftFrac, 10, 5);
    ctx.fill();
  }
  // Strikes.
  text(ctx, 'Walk-outs:', 1078, 60, 12, '#e8c9a0', 'left', '700');
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < world.strikes ? '#e5484d' : 'rgba(255,244,221,0.25)';
    ctx.beginPath(); ctx.arc(1136 + i * 22, 60, 8, 0, Math.PI * 2); ctx.fill();
    if (i < world.strikes) text(ctx, '✕', 1136 + i * 22, 61, 11, '#fff');
  }
  text(ctx, `BEST ${best}`, 1264, 60, 11, '#9fe870', 'right', '700');
}

function drawHint(ctx, world) {
  if (world.time < world.hintUntil && world.hint) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const w = ctx.measureText(world.hint).width + 36;
    rr(ctx, VIEW.width / 2 - w / 2, VIEW.height - 44, w, 30, 15);
    ctx.fill();
    text(ctx, world.hint, VIEW.width / 2, VIEW.height - 28, 14, '#fff');
  }
}

function dim(ctx) {
  ctx.fillStyle = 'rgba(20,12,6,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(255,248,232,0.97)';
  rr(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = '#d9a86c';
  ctx.lineWidth = 3;
  rr(ctx, x, y, w, h, 16);
  ctx.stroke();
}

function drawTitle(ctx, world, best) {
  dim(ctx);
  panel(ctx, 340, 130, 600, 500);
  text(ctx, 'SIMMER & SERVE', 640, 185, 44, '#b34724', 'center', '800');
  text(ctx, 'Rush Hour Kitchen', 640, 228, 22, '#7c4f2a', 'center', '700');
  text(ctx, 'One chef. One shift. A board full of hungry orders.', 640, 268, 16, INK, 'center', '400');
  const lines = [
    'WASD / Arrows — move   •   E / Space — use a station',
    'Click a station — walk over and use it',
    'Grab ingredients → chop veg on the board',
    'Grill patties & eggs — don\'t let them burn!',
    'Stack the dish on your plate, serve at the hatch',
    'Serve fast for tips • 3 in a row = combo bonus',
    '3 walk-outs end the shift • Shift lasts 2:30',
  ];
  lines.forEach((l, i) => text(ctx, l, 640, 312 + i * 30, 15, INK, 'center', i === 0 ? '700' : '400'));
  text(ctx, '▶  Press ENTER or click to start cooking', 640, 556, 18, '#2e7d32', 'center', '800');
  if (best > 0) text(ctx, `Best shift: ${best} coins`, 640, 590, 14, '#7c4f2a', 'center', '700');
}

function drawPaused(ctx) {
  dim(ctx);
  panel(ctx, 440, 300, 400, 140);
  text(ctx, 'PAUSED', 640, 340, 36, INK, 'center', '800');
  text(ctx, 'Press P or Enter to keep cooking', 640, 390, 15, '#7c4f2a', 'center', '400');
}

function drawOver(ctx, world) {
  dim(ctx);
  panel(ctx, 380, 170, 520, 440);
  if (world.won) {
    text(ctx, 'SHIFT COMPLETE!', 640, 225, 38, '#2e7d32', 'center', '800');
    text(ctx, 'The dinner rush is over — and you survived it.', 640, 262, 15, INK, 'center', '400');
  } else {
    text(ctx, 'SHIFT CUT SHORT', 640, 225, 38, '#b3272e', 'center', '800');
    text(ctx, 'Too many orders walked out hungry.', 640, 262, 15, INK, 'center', '400');
  }
  // Stars.
  for (let i = 0; i < 3; i += 1) {
    const cx = 640 + (i - 1) * 90;
    const lit = i < world.stars;
    ctx.fillStyle = lit ? '#ffd94d' : '#d9c9a8';
    ctx.strokeStyle = lit ? '#d9a521' : '#b8a888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 10; k += 1) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const r = k % 2 === 0 ? 34 : 15;
      const px = cx + Math.cos(a) * r;
      const py = 320 + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  const rows = [
    [`Coins earned`, `${world.coins}`],
    [`Orders served`, `${world.served}`],
    [`Best combo`, `x${world.bestCombo}`],
    [`Level reached`, `${world.level}`],
    [`Walk-outs`, `${world.expiredCount}`],
  ];
  rows.forEach(([k, v], i) => {
    text(ctx, k, 470, 400 + i * 28, 15, '#7c4f2a', 'left', '700');
    text(ctx, v, 810, 400 + i * 28, 15, INK, 'right', '800');
  });
  text(ctx, 'Press ENTER to cook another shift', 640, 566, 17, '#2e7d32', 'center', '800');
}

export function createRenderer(canvas) {
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  const ctx = canvas.getContext('2d');

  function draw(world, screen, best) {
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    drawFloor(ctx);
    // Highlight the station the chef can use right now.
    const near = screen === SCREEN_PLAY && !world.over ? stationInRange(world) : null;
    const nearBin = near && near.kind === 'bin' ? near.id : null;
    drawBins(ctx, world, nearBin);
    drawBoard(ctx, world, near !== null && near.kind === 'board');
    drawGrill(ctx, world, near !== null && near.kind === 'grill');
    drawServe(ctx, world, near !== null && near.kind === 'serve');
    drawTrash(ctx, near !== null && near.kind === 'trash');
    drawChef(ctx, world);
    drawParticles(ctx, world);
    drawPopups(ctx, world);
    drawHud(ctx, world, best);
    drawHint(ctx, world);
    if (screen === SCREEN_TITLE) drawTitle(ctx, world, best);
    else if (screen === SCREEN_PAUSED) drawPaused(ctx);
    else if (screen === SCREEN_OVER) drawOver(ctx, world);
  }

  return { draw };
}
