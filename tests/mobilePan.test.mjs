import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMobilePan, getParallelDrag } from '../public/mobilePan.js';

class Events {
  listeners = new Map();
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
  }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  emit(type, event = {}) { this.listeners.get(type)?.forEach(callback => callback(event)); }
}
class Vector {
  constructor(x, y, z) { this.set(x, y, z); }
  set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
  clone() { return new Vector(this.x, this.y, this.z); }
}
function setup({ width = 390, height = 844, coarse = true } = {}) {
  const media = Object.assign(new Events(), { matches: coarse });
  const viewport = Object.assign(new Events(), { innerWidth: width, innerHeight: height, matchMedia: () => media });
  const doc = new Events();
  const element = Object.assign(new Events(), { ownerDocument: doc, style: { touchAction: '' } });
  doc.elementFromPoint = () => element;
  element.getBoundingClientRect = () => ({ width: viewport.innerWidth, height: viewport.innerHeight });
  const camera = {
    position: new Vector(20, 20, 20), zoom: 1, left: -7 * width / height, right: 7 * width / height, top: 7, bottom: -7,
    quaternion: Object.freeze({ x: -.279848, y: .364705, z: .115916, w: .880476 }),
    matrix: { elements: [Math.SQRT1_2, 0, -Math.SQRT1_2, 0, -1 / Math.sqrt(6), Math.sqrt(2 / 3), -1 / Math.sqrt(6), 0, 0, 0, 0, 0, 20, 20, 20, 1] },
    updateMatrixWorld() {},
  };
  const controls = createMobilePan({ camera, element, viewport });
  const pose = () => ({ ...camera.position });
  const touch = (id, x, y, target = element) => ({ identifier: id, clientX: x, clientY: y, target });
  const event = (type, touches, cancelable = true) => {
    const e = { touches, cancelable, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    element.emit(type, e); return e;
  };
  const start = () => event('touchstart', [touch(1, 100, 200), touch(2, 200, 200)]);
  const move = (dx, dy) => event('touchmove', [touch(1, 100 + dx, 200 + dy), touch(2, 200 + dx, 200 + dy)]);
  return { media, viewport, doc, element, camera, controls, pose, touch, event, start, move };
}

test('initial mobile pose, zoom and frustum are unchanged', () => {
  const q = setup();
  assert.deepEqual(q.pose(), { x: 20, y: 20, z: 20 });
  assert.equal(q.camera.zoom, 1); assert.equal(q.camera.top, 7);
  assert.equal(q.element.style.touchAction, 'none');
});

test('parallel drag follows both screen axes without rotating, changing height or zooming', () => {
  const q = setup(), rotation = q.camera.quaternion;
  const frustum = [q.camera.left, q.camera.right, q.camera.top, q.camera.bottom, q.camera.zoom];
  q.start(); q.move(30, -20);
  const dx = q.camera.position.x - 20, dz = q.camera.position.z - 20;
  assert.ok(Math.abs((dx - dz) * Math.SQRT1_2 + 30 * 14 / 844) < 1e-10);
  assert.ok(Math.abs(-(dx + dz) / Math.sqrt(6) + 20 * 14 / 844) < 1e-10);
  assert.equal(q.camera.position.y, 20); assert.equal(q.camera.quaternion, rotation);
  assert.deepEqual([q.camera.left, q.camera.right, q.camera.top, q.camera.bottom, q.camera.zoom], frustum);
});

test('one finger is neither prevented nor used to move the camera', () => {
  const q = setup(), before = q.pose();
  assert.equal(q.event('touchstart', [q.touch(1, 100, 200)]).defaultPrevented, false);
  assert.equal(q.event('touchmove', [q.touch(1, 170, 240)]).defaultPrevented, false);
  assert.deepEqual(q.pose(), before);
});

test('symmetric and asymmetric pinches, twists and a stationary second finger cannot pan', () => {
  for (const coordinates of [[[70, 200], [230, 200]], [[95, 200], [260, 200]], [[100, 160], [200, 240]], [[150, 200], [200, 200]]]) {
    const q = setup(), before = q.pose(); q.start();
    assert.equal(q.event('touchmove', coordinates.map(([x, y], i) => q.touch(i + 1, x, y))).defaultPrevented, true);
    assert.deepEqual(q.pose(), before);
  }
});

test('separate per-finger event packets and touch-list reordering are handled', () => {
  const q = setup(); q.start();
  q.event('touchmove', [q.touch(1, 120, 210), q.touch(2, 200, 200)]);
  assert.deepEqual(q.pose(), { x: 20, y: 20, z: 20 });
  q.event('touchmove', [q.touch(2, 220, 210), q.touch(1, 120, 210)]);
  assert.notEqual(q.camera.position.x, 20);
});

test('small touch jitter is accumulated instead of moving the camera', () => {
  const q = setup(); q.start(); q.move(1, 0);
  assert.deepEqual(q.pose(), { x: 20, y: 20, z: 20 });
  q.move(4, 0); assert.notEqual(q.camera.position.x, 20);
});

test('all four floor boundaries clamp, and reversing direction responds immediately', () => {
  for (const [dx, dy] of [[100000, 0], [-100000, 0], [0, 100000], [0, -100000]]) {
    const q = setup(); q.start(); q.move(dx, dy);
    assert.ok(q.camera.position.x >= 9 && q.camera.position.x <= 31);
    assert.ok(q.camera.position.z >= 13 && q.camera.position.z <= 31);
    const edge = q.pose();
    q.move(dx - Math.sign(dx) * 20, dy - Math.sign(dy) * 20);
    assert.notDeepEqual(q.pose(), edge);
  }
});

test('lifting a finger stops immediately and remaining one-finger movement is ignored', () => {
  const q = setup(); q.start(); q.move(30, 10); const stopped = q.pose();
  q.event('touchend', [q.touch(2, 230, 210)]);
  q.event('touchmove', [q.touch(2, 320, 260)]);
  assert.deepEqual(q.pose(), stopped);
});

test('three fingers and replacement touch identifiers cannot cause jumps', () => {
  const q = setup(); q.start(); q.move(20, 0); const before = q.pose();
  q.event('touchmove', [q.touch(1, 200, 200), q.touch(2, 300, 200), q.touch(3, 350, 200)]);
  q.event('touchmove', [q.touch(1, 200, 200), q.touch(4, 300, 200)]);
  assert.deepEqual(q.pose(), before);
});

test('chat-origin touches and gestures crossing into UI are ignored', () => {
  const q = setup(), input = {};
  const mixed = [q.touch(1, 100, 200), q.touch(2, 200, 200, input)];
  assert.equal(q.event('touchstart', mixed).defaultPrevented, false);
  assert.equal(q.event('touchmove', mixed).defaultPrevented, false);
  q.start(); q.doc.elementFromPoint = () => input; q.move(30, 0);
  assert.deepEqual(q.pose(), { x: 20, y: 20, z: 20 });
});

test('desktop, narrow mouse-only windows and large touch displays stay fixed', () => {
  for (const options of [{ width: 1440, height: 960, coarse: false }, { coarse: false }, { width: 1024, height: 1366 }]) {
    const q = setup(options), before = q.pose();
    assert.equal(q.start().defaultPrevented, false); q.move(30, 20);
    assert.deepEqual(q.pose(), before); assert.equal(q.element.style.touchAction, '');
  }
});

test('mobile translation survives rotation and resize, without retaining an active gesture', () => {
  const q = setup(); q.start(); q.move(30, 20); const before = q.pose();
  Object.assign(q.viewport, { innerWidth: 844, innerHeight: 390 });
  // Reproduce index.html applying its original camera pose and landscape frustum.
  q.camera.position.set(20, 20, 20);
  Object.assign(q.camera, { left: -20 * 844 / 390 / 2, right: 20 * 844 / 390 / 2, top: 10, bottom: -10 });
  q.controls.resize(); assert.deepEqual(q.pose(), before);
  q.move(160, 70); assert.deepEqual(q.pose(), before);
  q.move(180, 70); assert.notDeepEqual(q.pose(), before);
  assert.equal(q.camera.top, 10); assert.equal(q.camera.zoom, 1);
});

test('returning to desktop restores the original fixed pose', () => {
  const q = setup(); q.start(); q.move(30, 0);
  q.media.matches = false; q.media.emit('change');
  assert.deepEqual(q.pose(), { x: 20, y: 20, z: 20 });
  assert.equal(q.element.style.touchAction, ''); q.start(); q.move(100, 100);
  assert.deepEqual(q.pose(), { x: 20, y: 20, z: 20 });
});

test('cancel, blur and visibility changes reset the gesture without inertia', () => {
  for (const cause of ['touchcancel', 'blur', 'visibilitychange']) {
    const q = setup(); q.start(); q.move(30, 20); const stopped = q.pose();
    (cause === 'touchcancel' ? q.element : cause === 'blur' ? q.viewport : q.doc).emit(cause);
    q.move(120, 80); assert.deepEqual(q.pose(), stopped);
  }
});

test('dispose removes all handlers and restores original canvas behaviour', () => {
  const q = setup(); q.start(); q.move(30, 0); q.controls.dispose();
  q.start(); q.move(120, 0);
  assert.deepEqual(q.pose(), { x: 20, y: 20, z: 20 });
  assert.equal(q.element.style.touchAction, '');
  for (const target of [q.element, q.viewport, q.doc, q.media]) {
    for (const callbacks of target.listeners.values()) assert.equal(callbacks.size, 0);
  }
});

test('parallel-drag classifier rejects mixed pinch or twist motion', () => {
  const previous = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
  assert.equal(getParallelDrag(previous, [{ x: 10, y: 10 }, { x: 110, y: -10 }]), null);
  assert.equal(getParallelDrag(previous, [{ x: 5, y: 0 }, { x: 150, y: 0 }]), null);
  assert.deepEqual(getParallelDrag(previous, [{ x: 10, y: 10 }, { x: 111, y: 10 }]), { x: 10.5, y: 10 });
});
