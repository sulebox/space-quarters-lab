import * as THREE from 'three';

// Small, deterministic surface maps: no asset downloads or full-screen effects.
export function createLabSurfaces() {
  let seed = 81273;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const canvas = (w, h = w) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    return [c, c.getContext('2d')];
  };
  const texture = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 1;
    return t;
  };
  const surface = (size, scratches) => {
    const [c, ctx] = canvas(size);
    ctx.fillStyle = '#d2d4d0'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 3800; i++) {
      const shade = 150 + Math.floor(random() * 90);
      ctx.fillStyle = `rgba(${shade},${shade},${shade},${0.08 + random() * 0.16})`;
      const s = 0.5 + random() * 2.5;
      ctx.fillRect(random() * size, random() * size, s, s);
    }
    for (let i = 0; i < 26; i++) {
      const x = random() * size, y = random() * size, r = 7 + random() * 28;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(40,48,46,0.075)'); g.addColorStop(1, 'rgba(40,48,46,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    if (scratches) {
      for (let i = 0; i < 44; i++) {
        const x = random() * size, y = random() * size;
        ctx.strokeStyle = i % 3 ? 'rgba(30,40,40,0.19)' : 'rgba(255,255,235,0.25)';
        ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x + 4 + random() * 17, y + random() * 5); ctx.stroke();
      }
    }
    const t = texture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
  const concrete = surface(256, true); concrete.repeat.set(6, 5);
  const painted = surface(128, true);

  // Eight 256px panels share a single atlas (512 x 1024). These are technical
  // screens, physical labels and diagrams, rather than additional UI overlays.
  const [atlasCanvas, ctx] = canvas(512, 1024);
  const panel = (slot, title, ink, draw) => {
    const x = (slot % 2) * 256, y = Math.floor(slot / 2) * 256;
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#0b1d24'; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#284651'; ctx.lineWidth = 1;
    for (let i = 16; i < 256; i += 20) {
      ctx.beginPath(); ctx.moveTo(i, 38); ctx.lineTo(i, 232); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, i + 38); ctx.lineTo(244, i + 38); ctx.stroke();
    }
    ctx.fillStyle = ink; ctx.font = 'bold 16px monospace'; ctx.fillText(title, 14, 26);
    ctx.strokeStyle = ink; ctx.lineWidth = 2; draw(ctx);
    ctx.font = '10px monospace'; ctx.fillText('SQ / RESEARCH SYSTEMS', 14, 244);
    ctx.restore();
  };
  const ring = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); };
  panel(0, 'CAD  /  ASSEMBLY 04', '#70daeb', c => {
    [[62,105,85,82],[92,76,85,82]].forEach(v=>c.strokeRect(...v));
    [[62,105],[147,105],[62,187],[147,187]].forEach(([x,y])=>{
      c.beginPath(); c.moveTo(x,y); c.lineTo(x+30,y-29); c.stroke();
    });
    ring(c, 133, 116, 23); ring(c, 133, 116, 10);
    c.lineWidth=1; c.strokeRect(23,62,210,147);
    c.font='11px monospace'; c.fillText('REV 03    120.00 mm',35,224);
  });
  panel(1, 'X-RAY / NDT SCAN', '#92e8ed', c => {
    c.globalAlpha=.3; c.fillStyle='#62c5d9'; c.fillRect(85,67,85,122); c.globalAlpha=1;
    [36,26,12].forEach(r=>ring(c,128,131,r));
    c.strokeRect(78,74,100,116);
    for(let i=0;i<6;i++){c.beginPath();c.moveTo(89,85+i*19);c.lineTo(168,85+i*19);c.stroke();}
    c.font='12px monospace';c.fillText('PART 028 / PASS',38,217);
  });
  panel(2, 'VACUUM  /  V-01', '#72e0e3', c => {
    [58,47,35].forEach(r=>ring(c,128,118,r));
    c.font='bold 25px monospace';c.fillText('2.4e-6',75,128);
    c.font='12px monospace';c.fillText('mbar',111,148);
    c.beginPath(); c.moveTo(22,184);
    for(let x=22;x<234;x+=4)c.lineTo(x,213-28*Math.exp(-(x-22)/45));c.stroke();
    c.fillStyle='#7de59b';c.fillRect(202,23,27,6);
  });
  panel(3, 'WELD  /  CELL 01', '#efb465', c => {
    ring(c,128,125,56);ring(c,128,125,39);
    c.font='bold 32px monospace';c.fillText('085',98,133);
    c.font='12px monospace';c.fillText('AMP / ARGON READY',49,213);
    c.fillRect(39,229,120,3);
  });
  panel(4, 'SPACE QUARTERS', '#91dce2', c => {
    c.fillStyle='#0b1d24';c.fillRect(0,40,256,196);
    c.fillStyle='#91dce2';
    c.font='bold 47px sans-serif';c.fillText('LAB',26,133);
    c.font='12px monospace';c.fillText('ORBITAL ROBOTICS',27,166);
    c.fillStyle='#d0a963';c.fillRect(27,190,48,5);
    c.fillStyle='#68cad5';c.fillRect(84,190,146,5);
  });
  panel(5, 'TOILET', '#9adee3', c => {
    c.fillStyle='#0b1d24';c.fillRect(0,40,256,196);
    c.fillStyle='#cee4de';c.beginPath();c.arc(128,81,16,0,7);c.fill();
    c.fillRect(113,108,30,51);c.fillRect(113,152,11,43);c.fillRect(132,152,11,43);
    c.font='12px monospace';c.fillText('TAKE A LITTLE BREAK',22,227);
  });
  panel(6, 'X-RAY / INTERLOCK', '#edb467', c => {
    c.fillStyle='#152028';c.fillRect(0,40,256,196);
    c.fillStyle='#edb467';
    c.beginPath();c.moveTo(128,62);c.lineTo(203,188);c.lineTo(53,188);c.closePath();c.stroke();
    c.font='bold 68px sans-serif';c.fillText('!',116,170);
    c.font='12px monospace';c.fillText('SHIELDED INSPECTION',23,222);
  });
  panel(7, 'CREW SUPPLIES', '#e0c28b', c => {
    c.fillStyle='#333025';c.fillRect(0,40,256,196);
    c.fillStyle='#e0c28b';
    c.font='bold 27px monospace';c.fillText('COOKIES',23,114);
    c.font='16px monospace';c.fillText('CHOCOLATE / 12',24,153);
    for(let i=0;i<26;i++)c.fillRect(24+i*8,182,1+i%3,28);
  });
  const atlas = texture(atlasCanvas);

  const radial = () => {
    const [c, p] = canvas(64);
    const g = p.createRadialGradient(32,32,1,32,32,31);
    g.addColorStop(0,'rgba(255,255,255,0.8)');
    g.addColorStop(.35,'rgba(255,255,255,0.36)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    p.fillStyle=g;p.fillRect(0,0,64,64);return texture(c);
  };
  return { concrete, painted, atlas, radial:radial() };
}
