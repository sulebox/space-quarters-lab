// Restrained, static cyber details. Every stroke shares one instanced box batch;
// the soft halos reuse the lab's existing 64px radial map. No lights or Bloom.
export function createCyberAccents(k) {
  const stroke = k.m.screen.clone();
  stroke.name = 'lab-cyber-trace';
  stroke.map = null;
  stroke.color.setHex(0x63e6b6);
  k.m.cyberTrace = stroke;
  const halo = k.m.pool.clone();
  halo.name = 'lab-cyber-halo';
  halo.color.setHex(0x39dca4);
  halo.opacity = .14;
  k.m.cyberHalo = halo;

  // Narrow solid strips stay legible on mobile without non-portable line widths.
  const segment = (a, b, width = .026) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const length = Math.hypot(dx, dy, dz);
    if (length < .0001) return;
    k.box('cyberTrace', a.map((v, i) => (v + b[i]) / 2), [width, width, length],
      [-Math.atan2(dy, dz), Math.asin(dx / length), 0]);
  };
  const path = (points, width) => {
    for (let i = 1; i < points.length; i++) segment(points[i - 1], points[i], width);
  };
  const polygon = (center, radius, plane, sides = 8, width = .022) => {
    const points = Array.from({ length: sides + 1 }, (_, i) => {
      const a = i * Math.PI * 2 / sides;
      const p = [...center];
      p[plane[0]] += Math.cos(a) * radius;
      p[plane[1]] += Math.sin(a) * radius;
      return p;
    });
    path(points, width);
  };

  // Circuit-like inlaid paths occupy two small side aisles, not the snack-table
  // apron or toilet queue. Raised clear of floor seams and wear to avoid flicker.
  const routes = [
    [[-11.2, .04, 1.6], [-8.4, .04, 1.6], [-7.8, .04, 1.0], [-5.5, .04, 1.0], [-4.7, .04, .2], [-4.7, .04, -1.1]],
    [[3.7, .04, -3.1], [3.7, .04, -2.65], [4.5, .04, -1.85], [8.6, .04, -1.85], [9.25, .04, -1.2], [10.7, .04, -1.2]],
  ];
  for (const route of routes) {
    path(route);
    path(route.map(([x, y, z]) => [x, y, z + .14]), .018);
    for (const point of [route[0], route[route.length - 1]]) {
      polygon(point, .105, [0, 2]);
      k.pad('cyberHalo', [point[0], .025, point[2]], [1.15, 1.15]);
    }
  }

  // Rear-wall data bus sits above the equipment and below the service pipes.
  const bus = [[-4.5, 3.44, -7.86], [-3.6, 3.44, -7.86], [-3.22, 3.82, -7.86],
    [-1.95, 3.82, -7.86], [-1.57, 3.44, -7.86], [1.7, 3.44, -7.86], [2.08, 3.82, -7.86]];
  path(bus);
  path(bus.map(([x, y, z]) => [x, y + .12, z]), .018);
  for (const point of [bus[0], bus[bus.length - 1]]) polygon(point, .09, [0, 1]);
  k.pad('cyberHalo', [-2.65, 3.62, -7.89], [3.5, .68], [0, 0, 0]);

  // A small wire-cube diagram on the unused left-wall panel, beyond the CAD desk.
  const wall = (u, y) => [-11.86, y, 7.65 + u];
  const center = wall(0, 2.53);
  const hex = [[-.52, 2.23], [0, 1.93], [.52, 2.23], [.52, 2.83], [0, 3.13], [-.52, 2.83]].map(([u, y]) => wall(u, y));
  path([...hex, hex[0]], .024);
  for (const i of [0, 2, 4]) segment(center, hex[i], .02);
  path([wall(-1.23, 1.65), wall(-1.23, 2.08), wall(-.87, 2.44), wall(-.87, 3.46), wall(-.2, 3.46)]);
  path([wall(1.32, 1.85), wall(1.32, 2.35), wall(.92, 2.75), wall(.92, 3.35)]);
  polygon(wall(-1.23, 1.65), .085, [1, 2]);
  polygon(wall(1.32, 1.85), .085, [1, 2]);
  k.pad('cyberHalo', [-11.89, 2.55, 7.65], [2.4, 2.4], [0, Math.PI / 2, 0]);

  // A tiny pressure-field hologram mounted above the vacuum console. Its static
  // open wireframe leaves equipment, characters and speech bubbles readable.
  const x = 2.55, z = -4.7;
  k.cyl('dark', [x, 2.17, z], .23, .07);
  k.box('cyberTrace', [x, 2.213, z], [.13, .014, .13]);
  k.pad('cyberHalo', [x, 2.216, z], [.9, .9]);
  polygon([x, 2.25, z], .25, [0, 2], 12, .018);
  const top = [x, 3.31, z], bottom = [x, 2.43, z];
  const equator = [[x + .36, 2.87, z], [x, 2.87, z + .36], [x - .36, 2.87, z], [x, 2.87, z - .36]];
  path([...equator, equator[0]], .018);
  for (const vertex of equator) { segment(top, vertex, .018); segment(bottom, vertex, .018); }
  for (const y of [2.28, 2.34, 2.4]) k.box('cyberTrace', [x, y, z], [.018, .026, .018]);

  // Two short illuminated arcs, not a fully neon vessel or a full-screen glow.
  for (const start of [15, 195]) {
    const arc = Array.from({ length: 7 }, (_, i) => {
      const a = (start + i * 9) * Math.PI / 180;
      // The existing torus rim protrudes to z=-4.404; stay just in front of it.
      return [.35 + Math.cos(a) * .66, 1.86 + Math.sin(a) * .66, -4.385];
    });
    path(arc, .024);
  }
  k.pad('cyberHalo', [.35, 1.86, -4.447], [1.45, 1.45], [0, 0, 0]);

  // The X-ray side console projects a small diagnostic readout, not another
  // opaque screen. Open corner brackets, a scan target and three data bars
  // keep the original instrument readable through this static wire display.
  const diagnostic = (u, v) => [9.6 + u, 2.78 + v, -5.225];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    path([diagnostic(sx * .39, sy * .44), diagnostic(sx * .64, sy * .44),
      diagnostic(sx * .64, sy * .23)], .02);
  }
  polygon(diagnostic(-.29, 0), .21, [0, 1], 8, .018);
  segment(diagnostic(-.57, 0), diagnostic(-.01, 0), .014);
  segment(diagnostic(-.29, -.28), diagnostic(-.29, .28), .014);
  for (const [v, length] of [[.18, .35], [0, .23], [-.18, .3]]) {
    segment(diagnostic(.12, v), diagnostic(.12 + length, v), .022);
    segment(diagnostic(.12, v - .055), diagnostic(.12, v + .055), .014);
  }
  for (const y of [2.13, 2.21, 2.29]) k.box('cyberTrace', [9.6, y, -5.225], [.018, .03, .018]);
  k.pad('cyberHalo', [9.6, 2.78, -5.255], [1.6, 1.2], [0, 0, 0]);

  // Small equipment-status strips add a second tier of detail without turning
  // the whole vessel neon. They sit on the plinth's exposed front fascia.
  for (let i = 0; i < 6; i++) {
    k.box('cyberTrace', [-1.03 + i * .52, .24, -4.316], [.3, .035, .018]);
  }

  // A tiny data bus is inset into the aisle-facing CAD desk edge. It stays
  // above the floor and outside walking/queue space; no extra objects or light.
  const desk = (y, z) => [-10.105, y, z];
  path([desk(1.155, 4.05), desk(1.155, 4.55), desk(1.205, 4.65), desk(1.205, 5.88)], .014);
  path([desk(1.155, 4.85), desk(1.155, 6.1)], .014);
  for (const z of [3.85, 6.28]) k.box('cyberTrace', [-10.105, 1.18, z], [.018, .045, .08]);
}
