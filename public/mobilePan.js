// Touch-only, translation-only controls: no animation loop, inertia or controls dependency.
// A pinch/twist (including an off-centre one) must not become an accidental pan.
export function getParallelDrag(previous, current) {
  const a = { x: current[0].x - previous[0].x, y: current[0].y - previous[0].y };
  const b = { x: current[1].x - previous[1].x, y: current[1].y - previous[1].y };
  const lengthA = Math.hypot(a.x, a.y), lengthB = Math.hypot(b.x, b.y);
  // Touch events can report one finger before the other. Keep accumulating until both move.
  if (lengthA < 2 || lengthB < 2) return { pending: true };
  const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
  const aligned = a.x * b.x + a.y * b.y >= 0.9 * lengthA * lengthB;
  const together = Math.hypot(a.x - b.x, a.y - b.y) <= 0.6 * Math.hypot(x, y);
  return aligned && together ? { x, y } : null;
}

export function createMobilePan({
  camera, element, viewport = window,
  // The viewing target stays inside the 24 x 20 lab floor, with an edge margin.
  bounds = { xMin: -11, xMax: 11, zMin: -7, zMax: 11 },
}) {
  const home = camera.position.clone();
  const originalTouchAction = element.style.touchAction;
  const touchDevice = viewport.matchMedia('(hover: none) and (pointer: coarse)');
  const doc = element.ownerDocument;
  const offset = { x: 0, z: 0 };
  let enabled = false, previous = null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const resetGesture = () => { previous = null; };

  function applyOffset() {
    camera.position.set(home.x + (enabled ? offset.x : 0), home.y, home.z + (enabled ? offset.z : 0));
    // Never change quaternion, zoom, frustum or camera-to-target distance.
    // Update now so speech bubbles use the new projection on the very next frame.
    camera.updateMatrixWorld();
  }

  function resize() {
    resetGesture();
    // Short side also covers a phone rotated to landscape; narrow desktop windows stay fixed.
    enabled = touchDevice.matches && Math.min(viewport.innerWidth, viewport.innerHeight) < 800;
    element.style.touchAction = enabled ? 'none' : originalTouchAction;
    // The caller has already applied its unchanged sizing/pose rules.
    // Retain mobile translation across rotation, keyboard resize and viewport changes.
    applyOffset();
  }

  function pairFrom(event) {
    if (!enabled || event.touches.length !== 2) return null;
    const pair = Array.from(event.touches);
    // Never take a finger from the chat log, an input or another UI element.
    if (pair.some(touch => touch.target !== element)) return null;
    if (pair.some(touch => {
      const target = doc.elementFromPoint(touch.clientX, touch.clientY);
      return target && target !== element;
    })) return null;
    return pair.sort((a, b) => a.identifier - b.identifier)
      .map(touch => ({ id: touch.identifier, x: touch.clientX, y: touch.clientY }));
  }

  function preventGesture(event) {
    if (event.cancelable) event.preventDefault();
  }

  function start(event) {
    previous = pairFrom(event);
    if (previous) preventGesture(event);
  }

  function move(event) {
    const current = pairFrom(event);
    if (!current) { resetGesture(); return; }
    preventGesture(event);
    if (!previous || current.some((point, i) => point.id !== previous[i].id)) {
      previous = current;
      return;
    }
    const drag = getParallelDrag(previous, current);
    if (drag?.pending) return;
    previous = current;
    if (!drag) return;

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const screenX = -drag.x * (camera.right - camera.left) / (camera.zoom * rect.width);
    const screenY = drag.y * (camera.top - camera.bottom) / (camera.zoom * rect.height);
    // Solve screen-space translation on the floor's XZ plane. Camera height and
    // orientation remain identical while the scenery follows the two fingers.
    const m = camera.matrix.elements;
    const determinant = m[0] * m[6] - m[2] * m[4];
    if (Math.abs(determinant) < 1e-6) return;
    offset.x = clamp(offset.x + (screenX * m[6] - m[2] * screenY) / determinant, bounds.xMin, bounds.xMax);
    offset.z = clamp(offset.z + (m[0] * screenY - screenX * m[4]) / determinant, bounds.zMin, bounds.zMax);
    applyOffset();
  }

  // Canvas listeners only: one-finger taps and native chat scrolling stay untouched.
  element.addEventListener('touchstart', start, { passive: false });
  element.addEventListener('touchmove', move, { passive: false });
  element.addEventListener('touchend', resetGesture, { passive: true });
  element.addEventListener('touchcancel', resetGesture, { passive: true });
  viewport.addEventListener('blur', resetGesture);
  viewport.addEventListener('orientationchange', resetGesture);
  doc.addEventListener('visibilitychange', resetGesture);
  touchDevice.addEventListener('change', resize);
  resize();

  return {
    resize,
    dispose() {
      element.removeEventListener('touchstart', start);
      element.removeEventListener('touchmove', move);
      element.removeEventListener('touchend', resetGesture);
      element.removeEventListener('touchcancel', resetGesture);
      viewport.removeEventListener('blur', resetGesture);
      viewport.removeEventListener('orientationchange', resetGesture);
      doc.removeEventListener('visibilitychange', resetGesture);
      touchDevice.removeEventListener('change', resize);
      resetGesture();
      element.style.touchAction = originalTouchAction;
      enabled = false;
      applyOffset();
    },
  };
}
