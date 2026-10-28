import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLabCameraControls, createBubbleProjector } from '../public/labCamera.js';

class Events {
  listeners = new Map();
  addEventListener(type, callback, capture = false) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push({ callback, capture: capture === true });
  }
  removeEventListener(type, callback, capture = false) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter(item =>
      item.callback !== callback || item.capture !== (capture === true)));
  }
  dispatchEvent(event) {
    for (const item of [...(this.listeners.get(event.type) || [])].sort((a, b) => Number(b.capture) - Number(a.capture))) {
      item.callback(event);
    }
    return true;
  }
  emit(type, values = {}) { return this.dispatchEvent({ type, ...values }); }
}

class Vector {
  static allocations = 0;
  constructor(x = 0, y = 0, z = 0) { Vector.allocations++; this.set(x, y, z); }
  set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
  clone() { return new Vector(this.x, this.y, this.z); }
  copy(other) { return this.set(other.x, other.y, other.z); }
  add(other) { return this.set(this.x + other.x, this.y + other.y, this.z + other.z); }
  project(camera) { const point = camera.project(this); return this.set(point.x, point.y, point.z); }
}
const xyz = point => ({ x: point.x, y: point.y, z: point.z });

// Model the adapter contract, not Three.js orbit maths. Browser tests cover the
// actual pinned controls; this fake verifies policy, ownership and cleanup.
class FakeControls extends Events {
  constructor(camera, element) {
    super();
    this.camera = camera; this.element = element;
    this.target = new Vector(); this.activePointers = new Set();
    this.cancelledPointers = []; this.updateCount = 0; this.disposed = false;
    element.controls = this;
    element.style.touchAction = 'none';
    this.saveState();
    this.onDown = event => {
      if (!this.activePointers.size) element.setPointerCapture(event.pointerId);
      this.activePointers.add(event.pointerId);
    };
    this.onUp = event => {
      this.activePointers.delete(event.pointerId);
      if (event.type === 'pointercancel') this.cancelledPointers.push(event.pointerId);
      if (!this.activePointers.size && element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    element.addEventListener('pointerdown', this.onDown);
    element.addEventListener('pointerup', this.onUp);
    element.addEventListener('pointercancel', this.onUp);
  }
  saveState() {
    this.homePosition = this.camera.position.clone(); this.homeTarget = this.target.clone();
    this.homeZoom = this.camera.zoom; this.homeQuaternion = { ...this.camera.quaternion };
  }
  update() { this.updateCount++; }
  reset() {
    this.camera.position.copy(this.homePosition); this.target.copy(this.homeTarget);
    this.camera.zoom = this.homeZoom; Object.assign(this.camera.quaternion, this.homeQuaternion);
    this.emit('change'); this.update();
  }
  dispose() {
    this.disposed = true;
    this.element.removeEventListener('pointerdown', this.onDown);
    this.element.removeEventListener('pointerup', this.onUp);
    this.element.removeEventListener('pointercancel', this.onUp);
  }
}

function setup(options = {}) {
  const view = new Events();
  view.PointerEvent = class { constructor(type, values) { Object.assign(this, { type }, values); } };
  const doc = Object.assign(new Events(), { defaultView: view });
  const element = Object.assign(new Events(), { ownerDocument: doc, style: { touchAction: 'manipulation' } });
  const captures = new Set();
  element.setPointerCapture = id => captures.add(id);
  element.hasPointerCapture = id => captures.has(id);
  element.releasePointerCapture = id => captures.delete(id);
  let rect = { left: 12, top: 24, width: 400, height: 600 };
  element.getBoundingClientRect = () => ({ ...rect });
  const camera = {
    position: new Vector(20, 20, 20), zoom: 1,
    quaternion: { x: -.279848, y: .364705, z: .115916, w: .880476 },
    left: -5, right: 5, top: 7, bottom: -7, matrixUpdates: 0,
    updateMatrixWorld() { this.matrixUpdates++; },
    project: point => xyz(point),
  };
  const resetButton = new Events();
  const api = createLabCameraControls({ camera, element, Controls: FakeControls, resetButton, ...options });
  return { api, camera, element, controls: element.controls, view, doc, resetButton, captures,
    setRect(next) { rect = next; },
    pointer(type, pointerId, pointerType = 'touch') { element.emit(type, { pointerId, pointerType }); },
  };
}

test('enables orbit, zoom and floor pan without altering initial pose or framing', () => {
  const q = setup(), c = q.controls;
  assert.deepEqual(xyz(q.camera.position), { x: 20, y: 20, z: 20 });
  assert.equal(q.camera.zoom, 1); assert.equal(q.camera.left, -5); assert.equal(q.camera.top, 7);
  assert.equal(c.enableRotate, true); assert.equal(c.enableZoom, true); assert.equal(c.enablePan, true);
  assert.equal(c.enableDamping, false); assert.equal(c.autoRotate, false);
  assert.equal(c.screenSpacePanning, false); assert.equal(c.zoomToCursor, false);
  assert.equal(c.minZoom, .6); assert.equal(c.maxZoom, 2.5);
  assert.equal(c.minPolarAngle, Math.PI / 10); assert.equal(c.maxPolarAngle, Math.PI * .45);
  assert.equal(q.element.style.touchAction, 'none'); assert.ok(q.camera.matrixUpdates > 0);
});

test('clamps every floor boundary and translates camera and target by identical deltas', () => {
  for (const [x, y, z, expected] of [[-40, 3, -30, [-11, 0, -7]], [40, -3, 30, [11, 0, 11]], [3, 0, 4, [3, 0, 4]]]) {
    const q = setup(); q.controls.target.set(x, y, z); q.camera.position.set(x + 8, y + 20, z - 9);
    const rotation = { ...q.camera.quaternion }; q.api.update();
    assert.deepEqual(xyz(q.controls.target), { x: expected[0], y: expected[1], z: expected[2] });
    assert.deepEqual(xyz(q.camera.position), { x: expected[0] + 8, y: expected[1] + 20, z: expected[2] - 9 });
    assert.deepEqual(q.camera.quaternion, rotation);
  }
});

test('change event clamps immediately and custom bounds are honored', () => {
  const q = setup({ bounds: { xMin: -2, xMax: 2, zMin: -3, zMax: 3 } });
  q.controls.target.set(50, 2, -20); q.camera.position.set(58, 22, -11);
  const updates = q.camera.matrixUpdates; q.controls.emit('change');
  assert.deepEqual(xyz(q.controls.target), { x: 2, y: 0, z: -3 });
  assert.deepEqual(xyz(q.camera.position), { x: 10, y: 20, z: 6 });
  assert.equal(q.camera.matrixUpdates, updates + 1);
});

test('resize preserves user pose, zoom and updated frustum while ending old gestures', () => {
  const q = setup(); q.controls.target.set(2, 0, 4); q.camera.position.set(-10, 15, 23);
  q.camera.quaternion.y = .5; q.camera.zoom = 1.8;
  Object.assign(q.camera, { left: -20, right: 20, top: 10, bottom: -10 });
  q.pointer('pointerdown', 1); q.pointer('pointerdown', 2);
  const before = { position: xyz(q.camera.position), quaternion: { ...q.camera.quaternion } };
  q.api.resize();
  assert.deepEqual(xyz(q.camera.position), before.position); assert.deepEqual(q.camera.quaternion, before.quaternion);
  assert.deepEqual(xyz(q.controls.target), { x: 2, y: 0, z: 4 }); assert.equal(q.camera.zoom, 1.8);
  assert.deepEqual([q.camera.left, q.camera.right, q.camera.top, q.camera.bottom], [-20, 20, 10, -10]);
  assert.equal(q.controls.activePointers.size, 0); assert.equal(q.captures.size, 0);
});

test('reset button restores original pose and zoom without reverting resized frustum', () => {
  const q = setup(), initialRotation = { ...q.camera.quaternion };
  q.controls.target.set(5, 0, 7); q.camera.position.set(-5, 22, -10); q.camera.zoom = 2;
  q.camera.quaternion.y = -.5; q.camera.left = -25; q.camera.right = 25;
  q.pointer('pointerdown', 1); q.resetButton.emit('click');
  assert.deepEqual(xyz(q.camera.position), { x: 20, y: 20, z: 20 });
  assert.deepEqual(xyz(q.controls.target), { x: 0, y: 0, z: 0 });
  assert.deepEqual(q.camera.quaternion, initialRotation); assert.equal(q.camera.zoom, 1);
  assert.equal(q.camera.left, -25); assert.equal(q.camera.right, 25);
  assert.equal(q.controls.activePointers.size, 0); assert.equal(q.captures.size, 0);
});

test('native pointerup and cancel remove tracking so blur does not cancel stale fingers', () => {
  const q = setup(); q.pointer('pointerdown', 1); q.pointer('pointerup', 1);
  q.pointer('pointerdown', 2); q.pointer('pointercancel', 2); q.view.emit('blur');
  assert.deepEqual(q.controls.cancelledPointers, [2]); assert.equal(q.controls.activePointers.size, 0);
  assert.equal(q.captures.size, 0);
});

test('blur and visibility changes cancel all active pointers using normal control handlers', () => {
  for (const event of ['blur', 'visibilitychange']) {
    const q = setup(); q.pointer('pointerdown', 4); q.pointer('pointerdown', 9);
    (event === 'blur' ? q.view : q.doc).emit(event);
    assert.deepEqual(q.controls.cancelledPointers, [4, 9]);
    assert.equal(q.controls.activePointers.size, 0); assert.equal(q.captures.size, 0);
    q.pointer('pointerdown', 12); assert.deepEqual([...q.controls.activePointers], [12]);
  }
});

test('dispose removes adapter and control listeners, cancels gesture and restores touch-action', () => {
  const q = setup(); q.pointer('pointerdown', 1); q.api.dispose();
  assert.equal(q.controls.disposed, true); assert.equal(q.controls.activePointers.size, 0);
  assert.equal(q.captures.size, 0); assert.equal(q.element.style.touchAction, 'manipulation');
  for (const target of [q.element, q.controls, q.doc, q.view, q.resetButton]) {
    for (const callbacks of target.listeners.values()) assert.equal(callbacks.length, 0);
  }
});

test('camera update reuses its correction vector instead of allocating each frame', () => {
  const q = setup(), before = Vector.allocations;
  for (let frame = 0; frame < 100; frame++) q.api.update();
  assert.equal(Vector.allocations, before);
});

test('bubble projection includes canvas offset and character height without changing inputs or opacity', () => {
  const q = setup(), projector = createBubbleProjector(q.camera, q.element);
  const position = new Vector(.2, -.3, .1), bubble = { style: { opacity: '.75' } };
  const original = xyz(position); projector.update(bubble, position, .5);
  assert.equal(bubble.style.left, '252px'); assert.equal(bubble.style.top, '264px');
  assert.equal(bubble.style.visibility, 'visible'); assert.equal(bubble.style.opacity, '.75');
  assert.deepEqual(xyz(position), original);
});

test('bubble projection uses current camera transformation on every frame and no new vectors', () => {
  const q = setup(), projector = createBubbleProjector(q.camera, q.element);
  const position = new Vector(.2, .2, .1), bubble = { style: { opacity: '1' } };
  projector.update(bubble, position, 0); const before = { ...bubble.style }, allocations = Vector.allocations;
  q.camera.project = point => ({ x: -point.x, y: point.y * 2, z: point.z });
  projector.update(bubble, position, 0);
  assert.notEqual(bubble.style.left, before.left); assert.notEqual(bubble.style.top, before.top);
  assert.equal(bubble.style.left, '172px'); assert.equal(bubble.style.top, '204px');
  assert.equal(Vector.allocations, allocations);
});

test('bubble hides offscreen or clipped anchors and restores after they return, retaining dialogue opacity', () => {
  for (const point of [[-1.01, 0, 0], [1.01, 0, 0], [0, -1.01, 0], [0, 1.01, 0], [0, 0, -1.01], [0, 0, 1.01], [NaN, 0, 0], [0, Infinity, 0], [0, 0, -Infinity]]) {
    const q = setup(), projector = createBubbleProjector(q.camera, q.element);
    const position = new Vector(...point), bubble = { style: { opacity: '0', left: '12px', top: '34px' } };
    projector.update(bubble, position, 0);
    assert.equal(bubble.style.visibility, 'hidden'); assert.equal(bubble.style.opacity, '0');
    assert.equal(bubble.style.left, '12px'); assert.equal(bubble.style.top, '34px');
    position.set(0, 0, 0); projector.update(bubble, position, 0);
    assert.equal(bubble.style.visibility, 'visible'); assert.equal(bubble.style.opacity, '0');
  }
});

test('bubble projector refreshes cached canvas bounds on resize and rejects zero-size surfaces', () => {
  const q = setup(), projector = createBubbleProjector(q.camera, q.element);
  const position = new Vector(), bubble = { style: {} };
  q.setRect({ left: 50, top: 40, width: 800, height: 400 }); projector.resize();
  projector.update(bubble, position, 0);
  assert.equal(bubble.style.left, '450px'); assert.equal(bubble.style.top, '240px');
  for (const [width, height] of [[0, 400], [800, 0]]) {
    q.setRect({ left: 0, top: 0, width, height }); projector.resize(); projector.update(bubble, position, 0);
    assert.equal(bubble.style.visibility, 'hidden');
  }
});
