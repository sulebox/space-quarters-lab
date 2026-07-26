import * as THREE from 'three';

// The lab is deliberately built from a small, shared primitive set. This keeps
// the diorama readable without competing with the animated character models.
export function createLabEnvironment(scene) {
  const root = new THREE.Group();
  root.name = 'lab-environment';

  const colors = {
    floor: 0x697176,
    floorDark: 0x51595f,
    wall: 0x85898a,
    wallInset: 0x6d7274,
    metal: 0x59636a,
    metalLight: 0x9aa0a0,
    dark: 0x252d32,
    black: 0x151b20,
    cyan: 0x52d8ed,
    blue: 0x2585b5,
    orange: 0xf09338,
    yellow: 0xe3b341,
    green: 0x5fd18a,
    red: 0xd9574f,
    cream: 0xc7b48f,
    white: 0xdfe4e2,
  };

  const material = (color, options = {}) => new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.78,
    metalness: options.metalness ?? 0.05,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
  });

  const mats = {
    floor: material(colors.floor, { roughness: 0.92 }),
    floorDark: material(colors.floorDark, { roughness: 0.94 }),
    wall: material(colors.wall, { roughness: 0.9 }),
    wallInset: material(colors.wallInset, { roughness: 0.88 }),
    metal: material(colors.metal, { metalness: 0.48, roughness: 0.48 }),
    metalLight: material(colors.metalLight, { metalness: 0.4, roughness: 0.5 }),
    dark: material(colors.dark, { metalness: 0.18, roughness: 0.62 }),
    black: material(colors.black, { roughness: 0.8 }),
    orange: material(colors.orange, { roughness: 0.72 }),
    yellow: material(colors.yellow, { roughness: 0.78 }),
    green: material(colors.green, { roughness: 0.72 }),
    red: material(colors.red, { roughness: 0.72 }),
    cream: material(colors.cream, { roughness: 0.82 }),
    white: material(colors.white, { roughness: 0.8 }),
    cyanGlow: material(0x1b5965, { emissive: colors.cyan, emissiveIntensity: 1.65, roughness: 0.45 }),
    orangeGlow: material(0x67330d, { emissive: colors.orange, emissiveIntensity: 1.55, roughness: 0.5 }),
    greenGlow: material(0x16472c, { emissive: colors.green, emissiveIntensity: 1.5, roughness: 0.5 }),
    redGlow: material(0x5c1713, { emissive: colors.red, emissiveIntensity: 1.45, roughness: 0.5 }),
  };

  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const cyl8 = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  const cyl12 = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const cyl16 = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
  const sphere8 = new THREE.SphereGeometry(0.5, 8, 5);
  const torus12 = new THREE.TorusGeometry(0.5, 0.08, 6, 12);

  function box(parent, size, position, mat, castShadow = false) {
    const mesh = new THREE.Mesh(unitBox, mat);
    mesh.scale.set(...size);
    mesh.position.set(...position);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = size[0] > 1 || size[2] > 1;
    parent.add(mesh);
    return mesh;
  }

  function cylinder(parent, radius, height, position, mat, rotation = [0, 0, 0], geometry = cyl12, castShadow = false) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.scale.set(radius * 2, height, radius * 2);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.castShadow = castShadow;
    parent.add(mesh);
    return mesh;
  }

  function sphere(parent, diameter, position, mat) {
    const mesh = new THREE.Mesh(sphere8, mat);
    mesh.scale.setScalar(diameter);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }

  function torus(parent, radius, tube, position, mat, rotation = [0, 0, 0]) {
    const mesh = new THREE.Mesh(torus12, mat);
    mesh.scale.set(radius / 0.5, radius / 0.5, tube / 0.08);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
  }

  function instancedBoxes(parent, transforms, mat) {
    const mesh = new THREE.InstancedMesh(unitBox, mat, transforms.length);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    transforms.forEach((item, index) => {
      const [x, y, z, sx, sy, sz, ry = 0] = item;
      quaternion.setFromEuler(new THREE.Euler(0, ry, 0));
      matrix.compose(new THREE.Vector3(x, y, z), quaternion, new THREE.Vector3(sx, sy, sz));
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    parent.add(mesh);
    return mesh;
  }

  function areaGroup(name) {
    const group = new THREE.Group();
    group.name = name;
    root.add(group);
    return group;
  }

  // Floor slab, large panel seams and subtle work-zone pads.
  const architecture = areaGroup('architecture');
  box(architecture, [24, 0.32, 20], [0, -0.18, 2], mats.floor, false);
  const seams = [];
  for (let x = -9; x <= 9; x += 3) seams.push([x, 0.006, 2, 0.035, 0.012, 19.5]);
  for (let z = -5; z <= 11; z += 2) seams.push([0, 0.007, z, 23.5, 0.014, 0.035]);
  instancedBoxes(architecture, seams, mats.floorDark);
  box(architecture, [5.7, 0.025, 4.2], [-8.6, 0.02, -4.7], mats.floorDark);
  box(architecture, [6.2, 0.025, 4.2], [8.2, 0.02, -4.7], mats.floorDark);
  box(architecture, [4.4, 0.025, 3.1], [-9.5, 0.02, 7.3], mats.floorDark);

  // Two rear walls only: the open front preserves the miniature dollhouse view.
  box(architecture, [24.4, 6.4, 0.35], [0, 3.0, -8.15], mats.wall, false);
  box(architecture, [0.35, 6.4, 20.3], [-12.15, 3.0, 2], mats.wall, false);
  box(architecture, [24.7, 0.34, 0.55], [0, 6.1, -8.15], mats.dark);
  box(architecture, [0.55, 0.34, 20.5], [-12.15, 6.1, 2], mats.dark);
  const wallRibs = [];
  for (let x = -10; x <= 10; x += 4) wallRibs.push([x, 3.05, -7.94, 0.12, 5.6, 0.08]);
  for (let z = -6; z <= 10; z += 4) wallRibs.push([-11.94, 3.05, z, 0.08, 5.6, 0.12]);
  instancedBoxes(architecture, wallRibs, mats.wallInset);
  box(architecture, [19, 0.14, 0.14], [1.6, 5.45, -7.88], mats.dark);
  box(architecture, [0.14, 0.14, 15], [-11.88, 5.45, 1], mats.dark);
  const wallLamps = [
    [-8.5, 4.7, -7.72, 2.1, 0.16, 0.08],
    [1.5, 4.7, -7.72, 2.1, 0.16, 0.08],
    [9.0, 4.7, -7.72, 2.1, 0.16, 0.08],
    [-11.72, 4.7, 5.7, 0.08, 0.16, 2.1],
  ];
  instancedBoxes(architecture, wallLamps, mats.cyanGlow);

  // Yellow floor guides define zones without textures.
  const guides = [
    [-8.5, 0.035, -2.55, 5.7, 0.035, 0.12],
    [7.7, 0.035, -2.55, 6.7, 0.035, 0.12],
    [-6.6, 0.035, 8.9, 0.12, 0.035, 3.2],
    [7.7, 0.035, 9.9, 6.8, 0.035, 0.12],
  ];
  instancedBoxes(architecture, guides, mats.yellow);

  // Central snack/work table. Its open front lines up with SNACK_POS (0, 0, 4).
  const snack = areaGroup('snack-table');
  box(snack, [5.2, 0.28, 2.7], [0, 1.25, 1.75], mats.cream, true);
  instancedBoxes(snack, [
    [-2.1, 0.62, 0.8, 0.35, 1.25, 0.35], [2.1, 0.62, 0.8, 0.35, 1.25, 0.35],
    [-2.1, 0.62, 2.7, 0.35, 1.25, 0.35], [2.1, 0.62, 2.7, 0.35, 1.25, 0.35],
  ], mats.dark);
  // Snacks: boxes, cans and cups kept intentionally chunky.
  instancedBoxes(snack, [
    [-1.25, 1.62, 1.45, 0.7, 0.55, 0.36, -0.15],
    [-0.35, 1.58, 1.45, 0.65, 0.38, 0.48, 0.12],
    [0.65, 1.63, 1.5, 0.55, 0.55, 0.32, -0.1],
    [1.45, 1.55, 2.0, 0.55, 0.3, 0.45, 0.2],
  ], mats.orange);
  instancedBoxes(snack, [
    [-0.9, 1.57, 2.25, 0.55, 0.3, 0.4, 0.1],
    [0.05, 1.58, 2.2, 0.55, 0.34, 0.45, -0.15],
  ], mats.green);
  cylinder(snack, 0.14, 0.48, [1.55, 1.62, 1.1], mats.red, [0, 0, 0], cyl8);
  cylinder(snack, 0.14, 0.48, [0.95, 1.62, 2.25], mats.cyanGlow, [0, 0, 0], cyl8);
  cylinder(snack, 0.18, 0.32, [-1.65, 1.54, 2.15], mats.white, [0, 0, 0], cyl8);
  // Three small stools avoid the arrival point directly in front of the table.
  [[-2.8, 1.2], [2.8, 1.2], [2.75, 2.8]].forEach(([x, z]) => {
    cylinder(snack, 0.42, 0.18, [x, 0.65, z], mats.orange, [0, 0, 0], cyl12);
    cylinder(snack, 0.12, 0.6, [x, 0.31, z], mats.metal, [0, 0, 0], cyl8);
  });

  // Welding booth at the back-left; the warm panels imply light without a SpotLight.
  const welding = areaGroup('welding-area');
  box(welding, [5.4, 0.18, 0.22], [-8.7, 2.25, -6.85], mats.orangeGlow);
  box(welding, [0.2, 4.5, 3.9], [-11.25, 2.25, -4.8], mats.wallInset);
  box(welding, [5.3, 0.16, 0.2], [-8.65, 4.45, -6.8], mats.dark);
  box(welding, [3.0, 0.9, 1.25], [-8.5, 0.55, -4.25], mats.metal, true);
  box(welding, [1.1, 1.45, 0.8], [-10.35, 0.74, -3.6], mats.orange);
  box(welding, [0.65, 0.25, 0.08], [-9.79, 0.95, -3.18], mats.cyanGlow);
  cylinder(welding, 0.28, 1.65, [-10.8, 0.83, -5.3], mats.metalLight, [0, 0, 0], cyl12);
  cylinder(welding, 0.3, 1.75, [-10.05, 0.88, -5.45], mats.dark, [0, 0, 0], cyl12);
  // Minimal robotic jig: four low-poly joints and two links.
  cylinder(welding, 0.38, 0.35, [-7.65, 1.18, -4.55], mats.orange, [0, 0, 0], cyl12);
  sphere(welding, 0.48, [-7.65, 1.63, -4.55], mats.dark);
  const armA = box(welding, [0.28, 1.25, 0.28], [-7.65, 2.15, -4.55], mats.orange);
  armA.rotation.z = -0.45;
  sphere(welding, 0.42, [-7.38, 2.7, -4.55], mats.dark);
  const armB = box(welding, [0.25, 1.1, 0.25], [-7.08, 3.08, -4.55], mats.metalLight);
  armB.rotation.z = -0.75;
  sphere(welding, 0.18, [-6.72, 3.45, -4.55], mats.orangeGlow);

  // Industrial cabinet-style X-ray station, not a medical scanner.
  const xray = areaGroup('xray-area');
  box(xray, [3.9, 3.7, 2.4], [6.8, 1.86, -6.15], mats.metalLight, true);
  box(xray, [2.7, 2.55, 0.16], [6.8, 1.95, -4.91], mats.dark);
  box(xray, [2.1, 1.78, 0.08], [6.8, 2.0, -4.81], mats.wallInset);
  box(xray, [0.65, 1.2, 0.55], [9.25, 0.62, -5.7], mats.metal);
  box(xray, [0.47, 0.37, 0.05], [9.25, 0.84, -5.4], mats.cyanGlow);
  cylinder(xray, 0.13, 0.34, [8.2, 3.88, -5.55], mats.redGlow, [0, 0, 0], cyl8);
  cylinder(xray, 0.16, 0.12, [8.2, 4.06, -5.55], mats.yellow, [0, 0, 0], cyl8);
  box(xray, [1.5, 0.32, 0.06], [6.8, 3.35, -4.78], mats.orangeGlow);
  // Conveyor points toward the interaction point while leaving it clear.
  box(xray, [3.4, 0.18, 1.0], [6.65, 1.05, -3.75], mats.dark);
  instancedBoxes(xray, [
    [5.35, 0.86, -3.75, 0.22, 0.72, 0.85], [7.95, 0.86, -3.75, 0.22, 0.72, 0.85],
  ], mats.metal);

  // Horizontal vacuum chamber at the rear centre-right.
  const vacuum = areaGroup('vacuum-chamber');
  box(vacuum, [5.5, 0.45, 2.5], [1.0, 0.3, -6.0], mats.dark, true);
  cylinder(vacuum, 1.32, 3.8, [1.0, 2.0, -6.0], mats.metalLight, [0, 0, Math.PI / 2], cyl16, true);
  cylinder(vacuum, 1.5, 0.32, [-0.96, 2.0, -6.0], mats.metal, [0, 0, Math.PI / 2], cyl16);
  torus(vacuum, 1.12, 0.16, [-1.14, 2.0, -6.0], mats.dark, [0, Math.PI / 2, 0]);
  cylinder(vacuum, 0.7, 0.18, [-1.25, 2.0, -6.0], mats.black, [0, 0, Math.PI / 2], cyl16);
  // Pump, console and economical angular pipes.
  box(vacuum, [0.95, 1.05, 0.8], [3.4, 0.82, -5.3], mats.metal);
  cylinder(vacuum, 0.34, 0.85, [3.4, 1.55, -5.3], mats.dark, [0, 0, 0], cyl8);
  box(vacuum, [0.75, 1.15, 0.5], [3.7, 0.6, -7.05], mats.metal);
  box(vacuum, [0.52, 0.36, 0.05], [3.7, 0.83, -6.77], mats.greenGlow);
  cylinder(vacuum, 0.12, 2.0, [2.5, 3.12, -6], mats.dark, [0, 0, Math.PI / 2], cyl8);
  cylinder(vacuum, 0.12, 1.15, [3.5, 2.58, -6], mats.dark, [0, 0, 0], cyl8);

  // CAD desk against the left wall, facing the room and DRAWING_POS (-10, 0, 6).
  const cad = areaGroup('cad-station');
  box(cad, [1.25, 1.15, 3.1], [-11.0, 0.58, 5.1], mats.metal, true);
  box(cad, [0.18, 1.55, 2.0], [-10.28, 1.72, 5.1], mats.dark);
  box(cad, [0.06, 1.22, 1.66], [-10.16, 1.72, 5.1], mats.cyanGlow);
  // Screen wireframe, made with six thin boxes and no texture.
  instancedBoxes(cad, [
    [-10.11, 1.72, 4.65, 0.025, 0.035, 0.72, 0.35],
    [-10.11, 1.72, 5.55, 0.025, 0.035, 0.72, -0.35],
    [-10.1, 1.4, 5.1, 0.025, 0.035, 1.2, 0],
    [-10.1, 2.03, 5.1, 0.025, 0.035, 1.2, 0],
  ], mats.white);
  box(cad, [0.55, 0.08, 1.0], [-10.25, 1.22, 6.0], mats.dark);
  cylinder(cad, 0.18, 0.3, [-10.2, 1.37, 4.0], mats.white, [0, 0, Math.PI / 2], cyl8);
  box(cad, [0.7, 0.12, 0.8], [-9.65, 0.62, 6.2], mats.dark);
  box(cad, [0.12, 0.75, 0.12], [-9.65, 0.28, 6.2], mats.metal);

  // Workout corner: retain the original location and deliberately odd lab-life feel.
  const gym = areaGroup('workout-area');
  box(gym, [2.1, 0.045, 3.1], [-5.5, 0.035, 7.0], material(0x2e738e, { roughness: 0.94 }));
  cylinder(gym, 0.12, 0.8, [-6.65, 0.18, 8.1], mats.dark, [0, 0, Math.PI / 2], cyl8);
  cylinder(gym, 0.28, 0.16, [-7.05, 0.18, 8.1], mats.metal, [0, 0, Math.PI / 2], cyl8);
  cylinder(gym, 0.28, 0.16, [-6.25, 0.18, 8.1], mats.metal, [0, 0, Math.PI / 2], cyl8);
  cylinder(gym, 0.14, 0.62, [-4.25, 0.31, 7.9], mats.cyanGlow, [0, 0, 0], cyl8);

  // Toilet cubicle: its two walls sit away from the camera, leaving a true
  // dollhouse cutaway around TOILET_POS (10, 0, 7).
  const toilet = areaGroup('toilet');
  box(toilet, [0.22, 3.8, 4.2], [8.25, 1.9, 8.0], mats.wallInset);
  box(toilet, [3.5, 3.8, 0.22], [9.9, 1.9, 5.95], mats.wallInset);
  box(toilet, [1.45, 0.28, 0.08], [9.9, 3.42, 6.08], mats.cyanGlow);
  // Toilet bowl uses two very low-poly cylinders and a tank.
  cylinder(toilet, 0.52, 0.45, [9.0, 0.48, 7.0], mats.white, [0, 0, 0], cyl12);
  cylinder(toilet, 0.32, 0.5, [9.0, 0.24, 7.0], mats.white, [0, 0, 0], cyl8);
  box(toilet, [0.45, 1.1, 1.0], [8.55, 1.05, 7.0], mats.white);
  // Simple icon: blue plaque plus two white shapes, avoiding another texture.
  box(toilet, [1.55, 0.65, 0.08], [9.25, 2.9, 6.08], mats.dark);
  sphere(toilet, 0.18, [9.25, 3.08, 6.14], mats.white);
  box(toilet, [0.16, 0.27, 0.06], [9.25, 2.81, 6.14], mats.white);

  // A handful of props, concentrated at edges to avoid blocking navigation.
  const props = areaGroup('lab-props');
  instancedBoxes(props, [
    [-3.8, 0.35, 10.6, 0.9, 0.7, 0.9, 0.1],
    [-2.9, 0.24, 10.8, 0.65, 0.48, 0.65, -0.12],
    [6.2, 0.42, 10.7, 1.0, 0.84, 0.75, 0.05],
  ], mats.cream);
  instancedBoxes(props, [
    [-3.8, 0.72, 10.6, 0.95, 0.05, 0.95],
    [-2.9, 0.5, 10.8, 0.7, 0.05, 0.7],
    [6.2, 0.86, 10.7, 1.05, 0.06, 0.8],
  ], mats.dark);
  box(props, [1.2, 0.8, 0.55], [7.5, 0.42, 10.7], mats.orange);
  box(props, [0.9, 0.16, 0.08], [7.5, 0.58, 10.41], mats.dark);

  scene.add(root);
  return root;
}
