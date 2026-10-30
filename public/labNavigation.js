import { LAB_BOUNDS, SNACK_OBSTACLES } from './labLayout.js';

const EPS = .0001;
const CORNER_CLEARANCE = .08;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const inside = (p, r) => p.x >= r.xMin && p.x <= r.xMax && p.z >= r.zMin && p.z <= r.zMax;

// Swept segment / rectangle intersection, including tangency. Checking the
// entire segment prevents tunnelling on a slow frame or a strong crowd push.
function entryTime(a, b, box) {
  let enter = 0, leave = 1;
  for (const axis of ['x', 'z']) {
    const delta = b[axis] - a[axis], min = box[`${axis}Min`], max = box[`${axis}Max`];
    if (Math.abs(delta) < 1e-12) {
      if (a[axis] < min || a[axis] > max) return Infinity;
    } else {
      const t1 = (min - a[axis]) / delta, t2 = (max - a[axis]) / delta;
      enter = Math.max(enter, Math.min(t1, t2));
      leave = Math.min(leave, Math.max(t1, t2));
      if (enter > leave) return Infinity;
    }
  }
  return enter;
}

export function createLabNavigation({ radius = .45, obstacles = SNACK_OBSTACLES, bounds = LAB_BOUNDS } = {}) {
  // Minkowski expansion: route the character's centre around furniture plus
  // its body radius. The robot uses a wider footprint than the humans.
  const boxes = obstacles.map(r => ({
    xMin: r.xMin - radius, xMax: r.xMax + radius,
    zMin: r.zMin - radius, zMax: r.zMax + radius,
  }));
  const limits = {
    xMin: bounds.xMin + radius, xMax: bounds.xMax - radius,
    zMin: bounds.zMin + radius, zMax: bounds.zMax - radius,
  };
  const routes = new WeakMap();
  const finite = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
  const isWalkable = p => finite(p) && inside(p, limits) && !boxes.some(r => inside(p, r));
  const isSegmentClear = (a, b) => isWalkable(a) && isWalkable(b)
    && boxes.every(r => entryTime(a, b, r) === Infinity);
  const clampToRoom = p => ({ x: clamp(p.x, limits.xMin, limits.xMax), z: clamp(p.z, limits.zMin, limits.zMax) });
  const corners = (r, gap) => [
    { x: r.xMin - gap, z: r.zMin - gap }, { x: r.xMax + gap, z: r.zMin - gap },
    { x: r.xMax + gap, z: r.zMax + gap }, { x: r.xMin - gap, z: r.zMax + gap },
  ];

  function nearestWalkable(point) {
    if (!finite(point)) return null;
    const p = clampToRoom(point);
    if (isWalkable(p)) return p;
    const candidates = boxes.flatMap(r => [
      { x: r.xMin - EPS, z: p.z }, { x: r.xMax + EPS, z: p.z },
      { x: p.x, z: r.zMin - EPS }, { x: p.x, z: r.zMax + EPS },
      ...corners(r, EPS),
    ]).map(clampToRoom).filter(isWalkable);
    candidates.sort((a, b) => distance(a, p) - distance(b, p));
    return candidates[0] ?? null;
  }

  function constrain(position) {
    const safe = nearestWalkable(position);
    if (safe) { position.x = safe.x; position.z = safe.z; }
    return !!safe;
  }

  // Visibility graph over exterior corners of the (possibly overlapping)
  // footprints. Static edges are calculated once, not on every animation tick.
  const waypoints = boxes.flatMap(r => corners(r, CORNER_CLEARANCE)).filter(isWalkable);
  const links = waypoints.map((a, i) => waypoints.map((b, j) =>
    i !== j && isSegmentClear(a, b) ? distance(a, b) : Infinity));

  function findPath(start, destination) {
    const from = nearestWalkable(start), to = nearestWalkable(destination);
    if (!from || !to) return null;
    if (isSegmentClear(from, to)) return [to];
    const nodes = [from, to, ...waypoints];
    const costs = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set();
    costs[0] = 0;
    for (let step = 0; step < nodes.length; step++) {
      let current = -1;
      for (let i = 0; i < nodes.length; i++) {
        if (!visited.has(i) && (current < 0 || costs[i] < costs[current])) current = i;
      }
      if (current < 0 || !Number.isFinite(costs[current])) return null;
      if (current === 1) {
        const path = [];
        for (let i = 1; i !== 0; i = previous[i]) path.unshift(nodes[i]);
        return path;
      }
      visited.add(current);
      for (let next = 0; next < nodes.length; next++) {
        if (visited.has(next)) continue;
        const edge = current >= 2 && next >= 2 ? links[current - 2][next - 2]
          : isSegmentClear(nodes[current], nodes[next]) ? distance(nodes[current], nodes[next]) : Infinity;
        if (costs[current] + edge < costs[next]) {
          costs[next] = costs[current] + edge;
          previous[next] = current;
        }
      }
    }
    return null;
  }

  function sweep(position, dx, dz) {
    const end = clampToRoom({ x: position.x + dx, z: position.z + dz });
    const length = distance(position, end);
    if (length < EPS) return;
    let firstHit = Infinity;
    for (const box of boxes) firstHit = Math.min(firstHit, entryTime(position, end, box));
    const t = firstHit === Infinity ? 1 : Math.max(0, firstHit - EPS / length);
    position.x += (end.x - position.x) * t;
    position.z += (end.z - position.z) * t;
  }

  // Apply character separation with the same furniture collision constraints.
  // Slide along an edge after impact; never project a pushed character through it.
  function displace(position, dx, dz) {
    if (!Number.isFinite(dx) || !Number.isFinite(dz) || !constrain(position)) return;
    const x = position.x, z = position.z;
    sweep(position, dx, dz);
    const remainingX = dx - (position.x - x), remainingZ = dz - (position.z - z);
    sweep(position, remainingX, 0);
    sweep(position, 0, remainingZ);
  }

  function step(char, budget) {
    const position = char.position, target = char.userData.targetPos;
    const result = { arrived: false, blocked: false, dx: 0, dz: 0 };
    if (!finite(target) || !Number.isFinite(budget) || budget < 0 || !constrain(position)) {
      result.blocked = true;
      return result;
    }
    let route = routes.get(char);
    const next = route?.points[route.index];
    if (!route || route.x !== target.x || route.z !== target.z || !next || !isSegmentClear(position, next)) {
      const points = findPath(position, target);
      if (!points) { routes.delete(char); result.blocked = true; return result; }
      route = { x: target.x, z: target.z, points, index: 0 };
      routes.set(char, route);
    }
    // A crowd nudge may open a shorter route. Skip only genuinely visible
    // corners, rather than rounding the turn through the furniture.
    for (let i = route.points.length - 1; i > route.index; i--) {
      if (isSegmentClear(position, route.points[i])) { route.index = i; break; }
    }
    while (route.index < route.points.length) {
      const point = route.points[route.index], length = distance(position, point);
      if (length > budget) {
        if (budget > 0) {
          result.dx = (point.x - position.x) * budget / length;
          result.dz = (point.z - position.z) * budget / length;
          position.x += result.dx; position.z += result.dz;
        }
        break;
      }
      if (length > EPS) { result.dx = point.x - position.x; result.dz = point.z - position.z; }
      position.x = point.x; position.z = point.z;
      budget -= length;
      route.index++;
    }
    result.arrived = route.index === route.points.length;
    return result;
  }

  return { isWalkable, isSegmentClear, nearestWalkable, constrain, findPath, displace, step };
}
