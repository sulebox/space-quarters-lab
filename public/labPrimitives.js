import * as THREE from 'three';
import { createLabSurfaces } from './labSurfaces.js';

// Author parts independently, then submit static parts as material/geometry
// batches. Hundreds of bolts/keys/vents do not become hundreds of draw calls.
export function createLabKit() {
  const surfaces = createLabSurfaces();
  const root = new THREE.Group(); root.name='lab-environment';
  const m = {};
  const standard = (name, color, metalness=.15, roughness=.75, map=null) => {
    m[name]=new THREE.MeshStandardMaterial({color,metalness,roughness,map});
    m[name].name=`lab-${name}`; return m[name];
  };
  standard('floor',0x9b9d95,.03,.94,surfaces.concrete);
  standard('wall',0x798686,.15,.86,surfaces.painted);
  standard('panel',0x9ba7a4,.25,.68,surfaces.painted);
  standard('steel',0xb6c4c5,.38,.42,surfaces.painted);
  standard('edge',0x687d80,.45,.53);
  standard('dark',0x253338,.32,.66);
  standard('rubber',0x131d20,.02,.9);
  standard('ochre',0xc19848,.25,.62,surfaces.painted);
  standard('curtain',0x62645b,.03,.93,surfaces.painted);
  standard('cloth',0x546973,.03,.94,surfaces.painted);
  standard('paper',0xdfd5bb,.02,.9,surfaces.painted);
  standard('cardboard',0xb49967,.03,.93,surfaces.painted);
  standard('tape',0xd3b981,.01,.92);
  standard('ceramic',0xc6d5cf,.1,.27);
  standard('red',0xb9684d,.1,.68);
  standard('green',0x60907b,.1,.75);
  standard('blue',0x416b83,.3,.65);
  const glow = (name,color,intensity) => {
    m[name]=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,roughness:.55});
  };
  glow('cyan',0x48c1d3,.8);glow('amber',0xf0a857,.85);glow('led',0x76cb9a,1);
  m.screen=new THREE.MeshBasicMaterial({map:surfaces.atlas,toneMapped:false});
  m.shadow=new THREE.MeshBasicMaterial({map:surfaces.radial,color:0x071214,transparent:true,opacity:.56,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  m.pool=new THREE.MeshBasicMaterial({map:surfaces.radial,color:0x39bbca,transparent:true,opacity:.28,depthWrite:false,blending:THREE.AdditiveBlending});
  m.warmPool=new THREE.MeshBasicMaterial({map:surfaces.radial,color:0xc79149,transparent:true,opacity:.24,depthWrite:false,blending:THREE.AdditiveBlending});
  const g={box:new THREE.BoxGeometry(1,1,1),plane:new THREE.PlaneGeometry(1,1),cylinder:new THREE.CylinderGeometry(.5,.5,1,12),round:new THREE.CylinderGeometry(.5,.5,1,24),ring:new THREE.TorusGeometry(.5,.045,6,24),ball:new THREE.SphereGeometry(.5,10,7)};
  const batches = new Map();
  const dummy = new THREE.Object3D();
  function part(geometry,material,position,scale=[1,1,1],rotation=[0,0,0],shadow=false) {
    const key=`${geometry.uuid}/${material.uuid}/${shadow}`;
    if(!batches.has(key))batches.set(key,{geometry,material,shadow,matrices:[]});
    dummy.position.set(...position);dummy.scale.set(...scale);dummy.rotation.set(...rotation);dummy.updateMatrix();
    batches.get(key).matrices.push(dummy.matrix.clone());
  }
  const box=(mat,p,s,r=[0,0,0],shadow=false)=>part(g.box,m[mat],p,s,r,shadow);
  const cyl=(mat,p,radius,height,r=[0,0,0],smooth=false,shadow=false)=>part(smooth?g.round:g.cylinder,m[mat],p,[radius*2,height,radius*2],r,shadow);
  const ring=(mat,p,radius,r=[0,0,0])=>part(g.ring,m[mat],p,[radius*2,radius*2,radius*2],r);
  const ball=(mat,p,s)=>part(g.ball,m[mat],p,s);
  const rod=(mat,a,b,width=.07)=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.sub(start);
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());
    const e=new THREE.Euler().setFromQuaternion(q);
    cyl(mat,start.addScaledVector(direction,.5).toArray(),width,direction.length(),[e.x,e.y,e.z]);
  };
  // Low-segment hoses are static and merged to a shared material at assembly.
  const curves=[];
  const hose=(mat,points,radius=.055)=>{
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');
    curves.push({mat,geometry:new THREE.TubeGeometry(curve,Math.max(12,points.length*4),radius,5,false)});
  };
  const screens = new Map();
  const screen=(slot,p,s,r=[0,0,0])=>{
    if(!screens.has(slot)) {
      const plane=new THREE.PlaneGeometry(1,1),uv=plane.attributes.uv;
      const column=slot%2,row=Math.floor(slot/2);
      for(let i=0;i<uv.count;i++)uv.setXY(i,(column+(4+uv.getX(i)*248)/256)/2,1-(row+(4+(1-uv.getY(i))*248)/256)/4);
      screens.set(slot,plane);
    }
    part(screens.get(slot),m.screen,p,[s[0],s[1],1],r);
  };
  const pad=(type,p,s,r=[-Math.PI/2,0,0])=>part(g.plane,m[type],p,[s[0],s[1],1],r);
  const bolt=(p,r=[Math.PI/2,0,0])=>cyl('steel',p,.045,.06,r);
  const crate=(x,y,z,w=.85,h=.65,d=.7)=>{
    box('cardboard',[x,y+h/2,z],[w,h,d]);
    box('tape',[x,y+h+.008,z],[.16,.018,d+.012]);
    box('tape',[x,y+h*.5,z+d/2+.01],[.16,h,.012]);
    box('dark',[x-w*.23,y+h*.5,z+d/2+.018],[.16,.11,.012]);
    box('edge',[x,y+h+.013,z],[w-.025,.012,.022]);
  };
  const cup=(x,y,z,mat='ceramic')=>{
    cyl(mat,[x,y+.15,z],.14,.3);cyl('rubber',[x,y+.303,z],.11,.008);
    ring(mat,[x+.15,y+.17,z],.095,[0,Math.PI/2,0]);
  };
  const consolePanel=(x,y,z,slot,w=1.2,h=.9)=>{
    box('dark',[x,y,z],[w+.16,h+.15,.16],[-.25,0,0]);
    screen(slot,[x,y+.012,z+.1],[w,h],[-.25,0,0]);
  };
  function finish() {
    for(const {geometry,material,shadow,matrices} of batches.values()){
      const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);
      matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
      mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=shadow;
      mesh.receiveShadow=!material.isMeshBasicMaterial;mesh.computeBoundingSphere();
      mesh.name=`${material.name||'lab-detail'}-${matrices.length}`;root.add(mesh);
    }
    // A few cable paths are merged by material, not submitted one-by-one.
    for(const mat of new Set(curves.map(c=>c.mat))){
      const geometries=curves.filter(c=>c.mat===mat).map(c=>c.geometry.toNonIndexed());
      const merged=new THREE.BufferGeometry();
      for(const name of ['position','normal','uv']){
        const size=geometries[0].attributes[name].itemSize;
        const count=geometries.reduce((n,g)=>n+g.attributes[name].array.length,0);
        const data=new Float32Array(count);let offset=0;
        for(const geo of geometries){data.set(geo.attributes[name].array,offset);offset+=geo.attributes[name].array.length;}
        merged.setAttribute(name,new THREE.BufferAttribute(data,size));
      }
      root.add(new THREE.Mesh(merged,m[mat]));geometries.forEach(g=>g.dispose());
    }
    curves.forEach(c=>c.geometry.dispose());
    root.userData.performance={staticBatches:root.children.length,addedLights:0,textureSizes:['256x256','128x128','512x1024','64x64']};
    return root;
  }
  return {root,m,g,box,cyl,ring,ball,rod,hose,screen,pad,bolt,crate,cup,consolePanel,finish};
}
