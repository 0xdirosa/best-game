// Keyboard and pointer input for STARFALL. Held keys give a steering direction;
// one-shot presses (start or restart, pause) are queued as bit flags and taken once
// by the loop, so a press between two frames is never lost and never counted twice.
// Mouse and touch drag steer the drone directly: pointerdown starts a drag (and
// counts as confirm on title / game-over screens), pointermove updates the target
// in field coordinates, pointerup ends the drag.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  let left = false;
  let right = false;
  let actions = 0;
  let dragging = false;
  let targetX = null;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    dragging = false;
    targetX = null;
  });

  function fieldX(clientX) {
    // The canvas fills the window and the 1280-wide field is centred in it.
    const rect = target.getBoundingClientRect();
    const scale = Math.min(rect.width / 1280, rect.height / 720);
    const offsetX = (rect.width - 1280 * scale) / 2;
    return (clientX - rect.left - offsetX) / scale;
  }

  target.addEventListener('pointerdown', (event) => {
    actions |= ACTION_CONFIRM;
    dragging = true;
    targetX = fieldX(event.clientX);
    target.setPointerCapture(event.pointerId);
  });
  target.addEventListener('pointermove', (event) => {
    if (dragging) targetX = fieldX(event.clientX);
  });
  target.addEventListener('pointerup', () => {
    dragging = false;
    targetX = null;
  });
  target.addEventListener('pointercancel', () => {
    dragging = false;
    targetX = null;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** Field x the pointer is dragging toward, or null when not dragging. */
    pointerTarget() {
      return dragging ? targetX : null;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
