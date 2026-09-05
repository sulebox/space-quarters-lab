import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createToiletQueue } from '../public/toiletQueue.js';

class Vector {
  constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); }
  clone() { return new Vector(this.x, this.y, this.z); }
}
function setup() {
  const people = ['A', 'B', 'C', 'D'].map(name => ({
    position: new Vector(), userData: { name, state: 'idle' },
  }));
  const queue = createToiletQueue({
    usePosition: new Vector(10, 0, 7), entryPosition: new Vector(8, 0, 7.3),
    exitPosition: new Vector(7.2, 0, 7.8), waitPosition: new Vector(7, 0, 6.7),
  });
  const use = char => {
    assert.equal(queue.arrive(char), 'entering');
    assert.equal(queue.arrive(char), 'using');
  };
  const leave = char => {
    assert.ok(queue.finish(char));
    assert.equal(queue.arrive(char), 'finished');
    char.userData.state = 'idle';
    char.userData.actionType = 'IDLE';
  };
  const slots = () => people.filter(c => c.userData.actionType === 'TOILET_WAIT').map(c => c.userData.targetPos.x);
  return { queue, people, use, leave, slots };
}

test('turnover reflows the remaining line before a new arrival is added', () => {
  const { queue, people: [a,b,c], use, leave, slots } = setup();
  [a,b,c].forEach(queue.request);
  use(a); leave(a);
  queue.request(a);
  assert.equal(b.userData.toiletStage, 'enter');
  assert.equal(c.userData.targetPos.x, 7);
  assert.equal(a.userData.targetPos.x, 5.7);
  assert.equal(new Set(slots()).size, slots().length);
});

test('one owner and FIFO order persist through entry, use and exit', () => {
  const { queue, people, use, leave } = setup();
  people.forEach(queue.request);
  for (let i = 0; i < people.length; i++) {
    const char = people[i];
    assert.equal(char.userData.toiletStage, 'enter');
    use(char);
    assert.equal(people.filter(c => c.userData.toiletStage === 'use').length, 1);
    assert.ok(queue.finish(char));
    if (people[i + 1]) assert.equal(people[i + 1].userData.toiletStage, 'queue');
    assert.equal(queue.arrive(char), 'finished');
    char.userData.state = 'idle'; char.userData.actionType = 'IDLE';
  }
});

test('duplicate requests never create duplicate queue entries', () => {
  const { queue, people: [a,b,c], use, leave } = setup();
  queue.request(a); queue.request(b); queue.request(b); queue.request(a); queue.request(c);
  use(a); leave(a); use(b); leave(b);
  assert.equal(c.userData.toiletStage, 'enter');
  assert.equal(b.userData.toiletStage, undefined);
});

test('chat interruption releases the current reservation immediately', () => {
  const { queue, people: [a,b], use } = setup();
  queue.request(a); queue.request(b); use(a);
  queue.cancel(a); a.userData.state = 'speaking'; queue.update();
  assert.equal(a.userData.toiletStage, undefined);
  assert.equal(a.userData.state, 'speaking');
  assert.equal(b.userData.toiletStage, 'enter');
});

test('an interrupted queue member is removed and the next person moves forward', () => {
  const { queue, people: [a,b,c,d] } = setup();
  [a,b,c,d].forEach(queue.request);
  queue.cancel(c); c.userData.state = 'speaking';
  assert.equal(b.userData.targetPos.x, 7);
  assert.equal(d.userData.targetPos.x, 5.7);
  assert.equal(c.userData.toiletStage, undefined);
});

test('unexpected state changes cannot strand an owner or head of the line', () => {
  const { queue, people: [a,b,c] } = setup();
  [a,b,c].forEach(queue.request);
  a.userData.state = 'speaking'; b.userData.state = 'speaking'; queue.update();
  assert.equal(a.userData.toiletStage, undefined);
  assert.equal(b.userData.toiletStage, undefined);
  assert.equal(c.userData.toiletStage, 'enter');
});

test('hundreds of turnovers keep every waiting slot unique', () => {
  const { queue, people, use, leave, slots } = setup();
  people.forEach(queue.request);
  for (let turn = 0; turn < 300; turn++) {
    const char = people[turn % people.length];
    assert.equal(char.userData.toiletStage, 'enter');
    use(char); leave(char); queue.request(char); queue.update();
    assert.equal(new Set(slots()).size, 3);
    assert.equal(people.filter(c => c.userData.toiletStage === 'enter').length, 1);
  }
});
