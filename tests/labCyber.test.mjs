import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCyberAccents } from '../public/labCyber.js';

class Color {
  constructor(hex) { this.hex = hex; }
  setHex(hex) { this.hex = hex; return this; }
  clone() { return new Color(this.hex); }
}

function setup() {
  const calls = [], clones = [];
  const atlas = Object.freeze({ name: 'existing-screen-atlas' });
  const radial = Object.freeze({ name: 'existing-64px-radial' });
  const material = (properties) => ({
    depthTest: true, depthWrite: true, transparent: false, opacity: 1,
    ...properties,
    clone() {
      const result = { ...this, color: this.color.clone() };
      clones.push(result);
      return result;
    },
  });
  const screen = material({ name: 'screen', map: atlas, color: new Color(0xffffff), toneMapped: false });
  const pool = material({ name: 'pool', map: radial, color: new Color(0x39bbca), transparent: true, opacity: .28, depthWrite: false, blending: 'additive' });
  // A mutation of either existing material or its color should fail immediately.
  for (const original of [screen, pool]) {
    Object.freeze(original.color);
    Object.freeze(original);
  }
  const m = { screen, pool, dark: Object.freeze({ name: 'dark' }) };
  const k = {
    m,
    box(material, position, scale, rotation = [0, 0, 0], shadow = false) {
      calls.push({ type: 'box', material, position, scale, rotation, shadow });
    },
    pad(material, position, scale, rotation = [-Math.PI / 2, 0, 0]) {
      calls.push({ type: 'pad', material, position, scale, rotation });
    },
    cyl(material, position, radius, height, rotation = [0, 0, 0], smooth = false, shadow = false) {
      calls.push({ type: 'cyl', material, position, radius, height, rotation, smooth, shadow });
    },
  };
  const result = createCyberAccents(k);
  return { m, screen, pool, atlas, radial, calls, clones, result };
}

const close = (actual, expected, tolerance = 1e-10) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

// THREE.Euler's default XYZ order: apply local Z, then Y, then X rotations.
function rotate([x, y, z], [rx, ry, rz]) {
  const zx = Math.cos(rz) * x - Math.sin(rz) * y;
  const zy = Math.sin(rz) * x + Math.cos(rz) * y;
  const yx = Math.cos(ry) * zx + Math.sin(ry) * z;
  const yz = -Math.sin(ry) * zx + Math.cos(ry) * z;
  return [yx, Math.cos(rx) * zy - Math.sin(rx) * yz, Math.sin(rx) * zy + Math.cos(rx) * yz];
}

function endpoints(call) {
  return [-1, 1].map(sign => {
    const offset = rotate([0, 0, sign * call.scale[2] / 2], call.rotation);
    return offset.map((v, i) => v + call.position[i]);
  });
}

function assertSegment(calls, a, b) {
  const match = calls.find(call => call.type === 'box' && call.material === 'cyberTrace' &&
    call.position.every((v, i) => Math.abs(v - (a[i] + b[i]) / 2) < 1e-10) &&
    Math.abs(call.scale[2] - Math.hypot(...a.map((v, i) => b[i] - v))) < 1e-10);
  assert.ok(match, `missing stroke from ${a} to ${b}`);
  const [start, end] = endpoints(match);
  start.forEach((v, i) => close(v, a[i]));
  end.forEach((v, i) => close(v, b[i]));
}

test('cyber accents clone exactly two shared materials without changing existing materials', () => {
  const { m, screen, pool, clones, atlas, radial, calls } = setup();
  assert.equal(m.screen, screen);
  assert.equal(m.pool, pool);
  assert.equal(screen.map, atlas);
  assert.equal(pool.map, radial);
  assert.equal(screen.color.hex, 0xffffff);
  assert.equal(pool.color.hex, 0x39bbca);
  assert.equal(pool.opacity, .28);
  assert.deepEqual(Object.keys(m).sort(), ['cyberHalo', 'cyberTrace', 'dark', 'pool', 'screen']);
  assert.deepEqual(clones, [m.cyberTrace, m.cyberHalo]);
  assert.notEqual(m.cyberTrace.color, screen.color);
  assert.notEqual(m.cyberHalo.color, pool.color);
  assert.equal(m.cyberTrace.map, null);
  assert.equal(m.cyberTrace.toneMapped, false);
  assert.deepEqual([...new Set(calls.map(call => call.material))].sort(), ['cyberHalo', 'cyberTrace', 'dark']);
});

test('soft halos reuse the existing texture, remain depth-tested and do not write depth', () => {
  const { m, radial, calls } = setup();
  assert.equal(m.cyberHalo.map, radial);
  assert.equal(m.cyberHalo.depthTest, true);
  assert.equal(m.cyberHalo.depthWrite, false);
  assert.equal(m.cyberHalo.transparent, true);
  assert.equal(m.cyberHalo.blending, 'additive');
  assert.ok(m.cyberHalo.opacity > 0 && m.cyberHalo.opacity <= .2);
  assert.equal(m.cyberTrace.depthTest, true);
  assert.ok(calls.filter(call => call.type === 'pad').every(call => call.material === 'cyberHalo'));
});

test('assembly is deterministic and emits only finite, positive-size static primitives', () => {
  const first = setup(), second = setup();
  assert.equal(first.result, undefined);
  assert.deepEqual(first.calls, second.calls);
  assert.ok(first.calls.length > 20);
  for (const call of first.calls) {
    assert.equal(call.position.length, 3);
    assert.equal(call.rotation.length, 3);
    assert.ok([...call.position, ...call.rotation].every(Number.isFinite));
    const dimensions = call.type === 'cyl' ? [call.radius, call.height] : call.scale;
    assert.ok(dimensions.every(value => Number.isFinite(value) && value > 0));
    assert.notEqual(call.shadow, true);
  }
});

test('all stroke corners stay inside the lab footprint and below the rear-wall cap', () => {
  const { calls } = setup();
  for (const call of calls.filter(call => call.type === 'box')) {
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const local = [sx * call.scale[0] / 2, sy * call.scale[1] / 2, sz * call.scale[2] / 2];
      const [x, y, z] = rotate(local, call.rotation).map((value, i) => value + call.position[i]);
      assert.ok(x >= -12 && x <= 12, `stroke outside floor X: ${x}`);
      assert.ok(z >= -8 && z <= 12, `stroke outside floor Z: ${z}`);
      assert.ok(y >= 0 && y < 4.6, `stroke outside room height: ${y}`);
    }
  }
});

test('geometry stays under the small static detail budget and adds only two batch keys', () => {
  const { calls } = setup();
  const triangles = calls.reduce((count, call) => count + (call.type === 'box' ? 12 : call.type === 'pad' ? 2 : 48), 0);
  assert.ok(triangles < 3500, `${triangles} added triangles exceeds budget`);
  const accentBatches = new Set(calls.filter(call => call.material.startsWith('cyber')).map(call => `${call.type}/${call.material}`));
  assert.deepEqual([...accentBatches].sort(), ['box/cyberTrace', 'pad/cyberHalo']);
  assert.ok(calls.filter(call => call.type === 'pad').length <= 10, 'avoid excessive transparent overdraw');
});

test('stroke rotations align local Z with floor, wall and three-dimensional hologram endpoints', () => {
  const { calls } = setup();
  // Horizontal +X, diagonal +X/-Z, vertical -Z and rear-wall +X/+Y.
  assertSegment(calls, [-11.2, .04, 1.6], [-8.4, .04, 1.6]);
  assertSegment(calls, [-8.4, .04, 1.6], [-7.8, .04, 1]);
  assertSegment(calls, [-4.7, .04, .2], [-4.7, .04, -1.1]);
  assertSegment(calls, [-3.6, 3.44, -7.86], [-3.22, 3.82, -7.86]);
  // Left-wall positive Y and diagonal Y/Z, plus sloping hologram members.
  assertSegment(calls, [-11.86, 1.65, 6.42], [-11.86, 2.08, 6.42]);
  assertSegment(calls, [-11.86, 2.08, 6.42], [-11.86, 2.44, 6.78]);
  assertSegment(calls, [2.55, 3.31, -4.7], [2.91, 2.87, -4.7]);
  assertSegment(calls, [2.55, 3.31, -4.7], [2.55, 2.87, -5.06]);
  assertSegment(calls, [2.55, 2.43, -4.7], [2.19, 2.87, -4.7]);
});

test('extra diagnostic and desk accents remain mounted to their own equipment', () => {
  const { calls } = setup();
  // Open diagnostic brackets above the X-ray console, rather than across
  // characters or the central snack-table area.
  assertSegment(calls, [9.21, 3.22, -5.225], [8.96, 3.22, -5.225]);
  assertSegment(calls, [8.96, 3.22, -5.225], [8.96, 3.01, -5.225]);
  assertSegment(calls, [9.03, 2.78, -5.225], [9.59, 2.78, -5.225]);
  assertSegment(calls, [-10.105, 1.155, 4.55], [-10.105, 1.205, 4.65]);
  const baseStrips = calls.filter(call => call.type === 'box' &&
    call.position[1] === .24 && call.position[2] === -4.316);
  assert.equal(baseStrips.length, 6);
  for (const strip of baseStrips) {
    assert.equal(strip.material, 'cyberTrace');
    assert.deepEqual(strip.scale, [.3, .035, .018]);
    assert.ok(strip.position[0] > -1.49 && strip.position[0] < 2.19);
  }
  assert.equal(calls.filter(call => call.type === 'pad').length, 9);
});
