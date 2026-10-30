import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLabNavigation } from '../public/labNavigation.js';
import { SNACK_OBSTACLES, LAB_BOUNDS } from '../public/labLayout.js';
import { createToiletQueue } from '../public/toiletQueue.js';

const point = (x, z, y = 0) => ({ x, y, z, clone() { return point(this.x, this.z, this.y); } });
const actor = (start, target) => ({ position: start.clone(), userData: { targetPos: target.clone() } });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// Independent geometric oracle: distance from a body centre to every original
// furniture rectangle must exceed the radius. Sample between animation frames
// too, so an apparently safe endpoint cannot hide a cut across a table corner.
function assertClear(p, radius) {
  for (const r of SNACK_OBSTACLES) {
    const dx = Math.max(r.xMin - p.x, 0, p.x - r.xMax);
    const dz = Math.max(r.zMin - p.z, 0, p.z - r.zMax);
    assert.ok(Math.hypot(dx, dz) > radius - 1e-8, `furniture penetration at ${p.x}, ${p.z}`);
  }
  assert.ok(p.x >= LAB_BOUNDS.xMin + radius - 1e-8 && p.x <= LAB_BOUNDS.xMax - radius + 1e-8);
  assert.ok(p.z >= LAB_BOUNDS.zMin + radius - 1e-8 && p.z <= LAB_BOUNDS.zMax - radius + 1e-8);
}
function assertTravel(a, b, radius) {
  for (let i = 0; i <= 10; i++) assertClear(point(a.x + (b.x - a.x) * i / 10, a.z + (b.z - a.z) * i / 10), radius);
}
function walk(nav, char, radius, maxFrames = 3000) {
  for (let frame = 0; frame < maxFrames; frame++) {
    const before = char.position.clone();
    const result = nav.step(char, frame % 7 === 0 ? .15 : .025);
    assert.equal(result.blocked, false);
    assertTravel(before, char.position, radius);
    if (result.arrived) return frame;
  }
  assert.fail('character stalled before reaching destination');
}

test('humans and the wider robot detour around the table in both directions', () => {
  for (const radius of [.45, .65]) {
    const nav = createLabNavigation({ radius });
    for (const [a, b] of [[point(0, -3.5), point(0, 4)], [point(-7, 1.6), point(7, 1.6)], [point(-7, -2), point(7, 5)]]) {
      for (const [from, to] of [[a, b], [b, a]]) {
        const path = nav.findPath(from, to);
        assert.ok(path.length > 1, 'a crossing route needs a detour');
        let previous = from;
        for (const p of path) { assertTravel(previous, p, radius); previous = p; }
        const char = actor(from, to);
        walk(nav, char, radius);
        assert.ok(distance(char.position, to) < 1e-8);
      }
    }
  }
});

test('unobstructed walking is direct and preserves height and movement speed', () => {
  const nav = createLabNavigation();
  const char = actor(point(-8, -1, -1.2), point(-5, -1));
  assert.equal(nav.findPath(char.position, char.userData.targetPos).length, 1);
  const result = nav.step(char, .15);
  assert.ok(Math.abs(char.position.x + 7.85) < 1e-10);
  assert.equal(char.position.z, -1); assert.equal(char.position.y, -1.2);
  assert.equal(result.arrived, false);
});

test('every work, snack, dance and toilet destination remains reachable', () => {
  const destinations = [point(-6.5, -2), point(5, -2), point(0, -3.5), point(0, 4),
    point(-2.3, 4), point(-4.7, 4), point(-3.5, 4), point(-3.5, 5.2),
    point(-5.5, 7), point(-10, 6), point(10, 7), point(8, 7.3), point(7.2, 7.8),
    point(7, 6.7), point(5.7, 6.7), point(4.4, 6.7), point(3.1, 6.7), point(-.5, 3.5), point(.5, 4.5)];
  for (const radius of [.45, .65]) {
    const nav = createLabNavigation({ radius });
    for (const from of destinations) for (const to of destinations) {
      const char = actor(point(nav.nearestWalkable(from).x, nav.nearestWalkable(from).z), to);
      walk(nav, char, radius);
      assert.ok(distance(char.position, nav.nearestWalkable(to)) < 1e-8);
    }
  }
});

test('crowd pushes cannot tunnel into the table or the nearby stools', () => {
  for (const radius of [.45, .65]) {
    const nav = createLabNavigation({ radius });
    for (const [from, push] of [[point(-7, 1.6), [25, 0]], [point(7, 1.6), [-25, 0]],
      [point(0, -2), [0, 25]], [point(0, 5), [0, -25]], [point(5, 2.7), [-25, 0]]]) {
      const p = from.clone();
      nav.displace(p, ...push);
      assertTravel(from, p, radius);
      assert.ok(distance(from, p) < 5, 'collision must stop the large push');
    }
    const p = point(-5, 1.6);
    for (let i = 0; i < 100; i++) {
      const before = p.clone(); nav.displace(p, .03, .025); assertTravel(before, p, radius);
    }
  }
});

test('embedded or out-of-room starts and targets recover without changing requested target or height', () => {
  const nav = createLabNavigation();
  for (const start of [point(0, 1.6, .8), point(3, 1.4, .8), point(100, -100, .8)]) {
    nav.constrain(start); assertClear(start, .45); assert.equal(start.y, .8);
  }
  const target = point(0, 1.6), char = actor(point(0, 5), target);
  walk(nav, char, .45);
  assert.equal(char.userData.targetPos.x, target.x); assert.equal(char.userData.targetPos.z, target.z);
  assertClear(char.position, .45);
});

test('changed or mutated destinations and off-route crowd pushes invalidate stale routes', () => {
  const nav = createLabNavigation(), char = actor(point(0, -3), point(0, 4));
  for (let i = 0; i < 25; i++) nav.step(char, .025);
  nav.displace(char.position, 6, 0);
  char.userData.targetPos.x = -6; char.userData.targetPos.z = 5;
  walk(nav, char, .45);
  assert.ok(distance(char.position, char.userData.targetPos) < 1e-8);
  char.userData.targetPos = point(7, -2);
  walk(nav, char, .45);
  assert.ok(distance(char.position, char.userData.targetPos) < 1e-8);
});

test('unreachable and invalid destinations do not report false arrival or produce NaN', () => {
  const nav = createLabNavigation({ obstacles: [{ xMin: -1, xMax: 1, zMin: -20, zMax: 20 }] });
  const char = actor(point(-5, 0), point(5, 0));
  assert.equal(nav.findPath(char.position, char.userData.targetPos), null);
  assert.equal(nav.step(char, .15).blocked, true);
  assert.equal(char.position.x, -5);
  char.userData.targetPos.x = NaN;
  assert.equal(nav.step(char, .15).arrived, false);
  nav.displace(char.position, Infinity, 0);
  assert.ok(Number.isFinite(char.position.x));
});

test('five characters retain FIFO toilet entry, use and exit while navigating from both sides of the table', () => {
  const nav = createLabNavigation(), finished = [];
  const queue = createToiletQueue({ usePosition: point(10, 7), entryPosition: point(8, 7.3),
    exitPosition: point(7.2, 7.8), waitPosition: point(7, 6.7), spacing: 1.3 });
  const chars = [point(0, -3.5), point(-7, -2), point(0, 4), point(-7, 1.6), point(7, -2)]
    .map((p, id) => Object.assign(actor(p, point(0, 4)), { id }));
  chars.forEach(char => queue.request(char));
  for (let frame = 0; frame < 5000 && finished.length < chars.length; frame++) {
    queue.update();
    for (const char of chars) {
      const ud = char.userData;
      if (ud.state === 'move' || ud.state === 'move_wait') {
        const before = char.position.clone(), result = nav.step(char, .15);
        assert.equal(result.blocked, false); assertTravel(before, char.position, .45);
        if (result.arrived && queue.arrive(char) === 'finished') { finished.push(char.id); ud.state = 'done'; }
      } else if (ud.state === 'action') queue.finish(char);
    }
  }
  assert.deepEqual(finished, [0, 1, 2, 3, 4]);
});

test('seeded random routes stay clear and arrive at both normal and low frame rates', () => {
  let seed = 20261030;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  for (const radius of [.45, .65]) {
    const nav = createLabNavigation({ radius });
    const randomPoint = () => {
      let p;
      do { p = point((random() - .5) * 20, (random() - .5) * 16 + 2); } while (!nav.isWalkable(p));
      return p;
    };
    for (let i = 0; i < 100; i++) {
      const char = actor(randomPoint(), randomPoint());
      walk(nav, char, radius);
    }
  }
});
