import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLabLife } from '../public/labLife.js';

test('espresso cover encloses the overlapping body faces with clearance and controls sit in front', () => {
  const boxes = [], cylinders = [];
  const noop = () => {};
  createLabLife({ box: (material, p, s) => boxes.push({ material, p, s }),
    cyl: (material, p, radius, height) => cylinders.push({ material, p, radius, height }),
    rod: noop, ring: noop, crate: noop, cup: noop, screen: noop, pad: noop, ball: noop, hose: noop });
  const body = boxes.find(b => b.material === 'dark' && b.p[0] === 1.31 && b.s[0] === .9);
  const cover = boxes.find(b => b.material === 'steel' && b.p[0] === 1.31 && b.s[0] === .95);
  assert.ok(body && cover);
  const front = b => b.p[2] + b.s[2] / 2;
  assert.ok(front(cover) - front(body) > .02, 'coplanar front panels cause z-fighting');
  assert.ok(cover.p[1] + cover.s[1] / 2 - (body.p[1] + body.s[1] / 2) > .05,
    'black body must not protrude through the metal top');
  for (const control of cylinders.filter(c => c.p[1] === 2.15)) {
    assert.ok(control.p[2] - control.height / 2 > front(cover), 'control must not be buried in the front panel');
  }
});
