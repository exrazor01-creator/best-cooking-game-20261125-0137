// Keyboard + mouse input. Arrow keys / WASD move the chef, E or Space interacts,
// P pauses, M mutes, Enter confirms. Clicking the floor walks the chef there;
// clicking a station walks to it and interacts on arrival.
export const ACTION_CONFIRM = 1 << 0;
export const ACTION_PAUSE = 1 << 1;
export const ACTION_MUTE = 1 << 2;
export const ACTION_INTERACT = 1 << 3;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let clickTarget = null;
  let clickStation = false;

  function keyDown(e) {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (e.repeat) return;
    keys.add(k);
    if (k === 'enter' || k === ' ') actions |= ACTION_CONFIRM;
    if (k === 'e') actions |= ACTION_INTERACT;
    if (k === 'p' || k === 'escape') actions |= ACTION_PAUSE;
    if (k === 'm') actions |= ACTION_MUTE;
  }
  function keyUp(e) {
    keys.delete(e.key.toLowerCase());
  }
  function pointer(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    clickTarget = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
    clickStation = true;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('pointerdown', pointer);

  function direction() {
    let x = 0;
    let y = 0;
    if (keys.has('arrowleft') || keys.has('a')) x -= 1;
    if (keys.has('arrowright') || keys.has('d')) x += 1;
    if (keys.has('arrowup') || keys.has('w')) y -= 1;
    if (keys.has('arrowdown') || keys.has('s')) y += 1;
    return { x, y };
  }

  function takeActions() {
    const a = actions;
    actions = 0;
    return a;
  }

  function takeClick() {
    const t = clickTarget;
    clickTarget = null;
    const s = clickStation;
    clickStation = false;
    return t ? { ...t, station: s } : null;
  }

  function clearClick() {
    clickTarget = null;
    clickStation = false;
  }

  return { direction, takeActions, takeClick, clearClick, keys };
}
