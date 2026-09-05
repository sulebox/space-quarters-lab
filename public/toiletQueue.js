// FIFO ownership and queue spacing live together so an interrupted action or
// a new arrival cannot leave an abandoned reservation or overlapping slots.
// Positions use the same cloneable vectors as the existing movement system.
export function createToiletQueue({
  usePosition, entryPosition, exitPosition, waitPosition, spacing = 1.3,
  onMessage = () => {}, onIdle = () => {},
}) {
  const queue = [];
  let owner = null;

  function move(char, target, action, state = 'move') {
    char.userData.targetPos = target.clone();
    char.userData.actionType = action;
    char.userData.state = state;
    char.userData.timer = 0;
  }

  function reflow() {
    queue.forEach((char, index) => {
      const target = waitPosition.clone();
      target.x -= index * spacing;
      const previous = char.userData.targetPos;
      if (!previous || previous.x !== target.x || previous.z !== target.z) {
        move(char, target, 'TOILET_WAIT', 'move_wait');
      }
    });
  }

  function promote() {
    if (owner || queue.length === 0) return;
    owner = queue.shift();
    owner.userData.toiletStage = 'enter';
    move(owner, entryPosition, 'TOILET');
    onMessage(owner, 'トイレ行こっと');
    reflow();
  }

  function request(char) {
    if (owner === char || queue.includes(char)) return;
    char.position.y = 0;
    char.userData.actionType = 'TOILET_WAIT';
    char.userData.state = 'move_wait';
    char.userData.toiletStage = 'queue';
    // Force a fresh slot, even if the previous activity happened to end here.
    char.userData.targetPos = null;
    queue.push(char);
    reflow();
    onMessage(char, 'トイレ空くの待ってる...');
    promote();
  }

  function cancel(char) {
    let changed = false;
    if (owner === char) { owner = null; changed = true; }
    const index = queue.indexOf(char);
    if (index !== -1) { queue.splice(index, 1); changed = true; }
    if (!changed) return;
    delete char.userData.toiletStage;
    reflow();
    promote();
  }

  function update() {
    // Also recover if an activity is interrupted outside the chat handler.
    if (owner) {
      const { state, actionType } = owner.userData;
      const valid = (actionType === 'TOILET' && (state === 'move' || state === 'action'))
        || (actionType === 'TOILET_EXIT' && state === 'move');
      if (!valid) { delete owner.userData.toiletStage; owner = null; }
    }
    for (let i = queue.length - 1; i >= 0; i--) {
      const { state, actionType } = queue[i].userData;
      if (actionType !== 'TOILET_WAIT' || (state !== 'waiting' && state !== 'move_wait')) {
        delete queue[i].userData.toiletStage;
        queue.splice(i, 1);
      }
    }
    reflow();
    promote();
  }

  function arrive(char) {
    const ud = char.userData;
    if (owner === char) {
      if (ud.toiletStage === 'enter') {
        ud.toiletStage = 'use';
        move(char, usePosition, 'TOILET');
        return 'entering';
      }
      if (ud.toiletStage === 'use') {
        ud.state = 'action';
        ud.timer = 0;
        onIdle(char);
        onMessage(char, 'ふぅ...');
        return 'using';
      }
      if (ud.toiletStage === 'exit') {
        // Hold the reservation until the previous user has cleared the doorway.
        cancel(char);
        return 'finished';
      }
    } else if (queue.includes(char)) {
      ud.state = 'waiting';
      onIdle(char);
      onMessage(char, '順番待ち中...');
      return 'waiting';
    }
    return null;
  }

  function finish(char) {
    if (owner !== char || char.userData.toiletStage !== 'use') return false;
    char.userData.toiletStage = 'exit';
    move(char, exitPosition, 'TOILET_EXIT');
    onMessage(char, 'すっきり！');
    return true;
  }

  return { request, cancel, update, arrive, finish };
}
