// OrbitControls is supplied by index.html's existing pinned Three.js import map.
// Keep the policy here independent of the renderer and the character logic.
export function createLabCameraControls({ camera, element, Controls, resetButton,
  bounds = { xMin: -11, xMax: 11, zMin: -7, zMax: 11 },
}) {
  const originalTouchAction = element.style.touchAction;
  const view = element.ownerDocument.defaultView;
  const pointers = new Map();
  const trackPointer = event => pointers.set(event.pointerId, event.pointerType);
  const releasePointer = event => pointers.delete(event.pointerId);
  element.addEventListener('pointerdown', trackPointer, true);
  element.addEventListener('pointerup', releasePointer, true);
  element.addEventListener('pointercancel', releasePointer, true);

  const controls = new Controls(camera, element);
  controls.enableRotate = true;
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.enableDamping = false;
  controls.autoRotate = false;
  controls.screenSpacePanning = false; // Pan along the floor, never underground.
  controls.zoomToCursor = false;
  controls.rotateSpeed = .7;
  controls.zoomSpeed = .9;
  controls.panSpeed = .8;
  controls.minZoom = .6;
  controls.maxZoom = 2.5;
  controls.minPolarAngle = Math.PI / 10;
  controls.maxPolarAngle = Math.PI * .45;
  // Default bindings: left drag / one finger = rotate, wheel = zoom,
  // right drag = pan, two fingers = dolly + pan. Azimuth is unrestricted.
  const correction = camera.position.clone();
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

  function syncCamera() {
    const target = controls.target;
    correction.set(clamp(target.x, bounds.xMin, bounds.xMax) - target.x,
      -target.y, clamp(target.z, bounds.zMin, bounds.zMax) - target.z);
    target.add(correction);
    camera.position.add(correction);
    // Applying the same correction to both preserves the current orbit angle.
    // Update before DOM bubble projection, not one frame later in render().
    camera.updateMatrixWorld();
  }

  function cancelGesture() {
    // OrbitControls r160 keeps its own pointer list. Clear it through its normal
    // cancel handler on orientation/keyboard resize, blur or reset so no old
    // touch gets mistaken for a second finger when the user returns.
    for (const [pointerId, pointerType] of [...pointers]) {
      element.dispatchEvent(new view.PointerEvent('pointercancel', { pointerId, pointerType }));
      if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
    }
    pointers.clear();
  }

  function update() {
    controls.update();
    syncCamera();
  }
  function reset() {
    cancelGesture();
    controls.reset();
    syncCamera();
  }
  function resize() {
    cancelGesture();
    update();
  }
  controls.addEventListener('change', syncCamera);
  view.addEventListener('blur', cancelGesture);
  element.ownerDocument.addEventListener('visibilitychange', cancelGesture);
  resetButton?.addEventListener('click', reset);
  update();

  return {
    update, resize, reset,
    dispose() {
      cancelGesture();
      controls.removeEventListener('change', syncCamera);
      controls.dispose();
      element.removeEventListener('pointerdown', trackPointer, true);
      element.removeEventListener('pointerup', releasePointer, true);
      element.removeEventListener('pointercancel', releasePointer, true);
      view.removeEventListener('blur', cancelGesture);
      element.ownerDocument.removeEventListener('visibilitychange', cancelGesture);
      resetButton?.removeEventListener('click', reset);
      element.style.touchAction = originalTouchAction;
    },
  };
}

export function createBubbleProjector(camera, element) {
  const point = camera.position.clone();
  let rect = element.getBoundingClientRect();
  return {
    resize() { rect = element.getBoundingClientRect(); },
    update(bubble, position, height) {
      point.copy(position);
      point.y += height;
      point.project(camera);
      // Leave dialogue opacity alone. Do not pin a label to the viewport edge
      // when its character has moved out of shot or behind the camera.
      const visible = Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)
        && Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && Math.abs(point.z) <= 1
        && rect.width > 0 && rect.height > 0;
      bubble.style.visibility = visible ? 'visible' : 'hidden';
      if (!visible) return;
      bubble.style.left = `${rect.left + (point.x * .5 + .5) * rect.width}px`;
      bubble.style.top = `${rect.top + (-point.y * .5 + .5) * rect.height}px`;
    },
  };
}
