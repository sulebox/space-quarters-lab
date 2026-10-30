// Shared by the scenery and walking code so the collision footprint follows
// the tabletop and stools, including the thin metal trim around the top.
export const SNACK_TABLE_TOP = Object.freeze({
  x: 0, y: 1.28, z: 1.6, width: 5.23, height: .1, depth: 2.77,
});
export const SNACK_STOOLS = Object.freeze([
  Object.freeze({ x: -2.96, z: 1.02, radius: .38 }),
  Object.freeze({ x: 3.04, z: 1.34, radius: .38 }),
  Object.freeze({ x: 2.98, z: 2.7, radius: .38 }),
]);
const top = SNACK_TABLE_TOP;
export const SNACK_OBSTACLES = Object.freeze([
  Object.freeze({
    xMin: top.x - top.width / 2 - .06, xMax: top.x + top.width / 2 + .06,
    zMin: top.z - top.depth / 2 - .06, zMax: top.z + top.depth / 2 + .06,
  }),
  ...SNACK_STOOLS.map(({ x, z, radius }) => Object.freeze({
    xMin: x - radius, xMax: x + radius, zMin: z - radius, zMax: z + radius,
  })),
]);

export const LAB_BOUNDS = Object.freeze({
  xMin: -11.5, xMax: 11.5, zMin: -7.5, zMax: 12,
});
