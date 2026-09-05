// Two rear walls, a cutaway front and physical detailing. All parts are static.
export function createArchitecture(k) {
  const {box,cyl,rod,bolt,screen,pad}=k;
  box('dark',[0,-.26,2],[24.4,.48,20.4]);
  // A plane keeps the repeated concrete texture off the thin slab edges.
  k.pad('floor',[0,-.012,2],[24,20]);
  box('edge',[0,-.13,12.12],[24.4,.21,.09]);
  box('edge',[12.12,-.13,2],[.09,.21,20.4]);
  box('wall',[0,2.27,-8.13],[24.35,4.65,.28]);
  box('wall',[-12.13,2.27,2],[.28,4.65,20.25]);
  box('dark',[0,4.63,-8.1],[24.4,.2,.42]);
  box('dark',[-12.1,4.63,2],[.42,.2,20.4]);
  box('dark',[0,.22,-7.92],[24,.35,.13]);
  box('dark',[-11.92,.22,2],[.13,.35,20]);
  for(let x=-10.5;x<12;x+=3){
    box('panel',[x,2.25,-7.955],[2.8,3.82,.045]);
    box('dark',[x-1.44,2.28,-7.91],[.035,4.05,.035]);
    for(const y of [.5,4.0])for(const dx of [-1.2,1.2])bolt([x+dx,y,-7.91]);
  }
  for(let z=-6.5;z<12;z+=3){
    box('panel',[-11.955,2.25,z],[.045,3.82,2.8]);
    box('dark',[-11.91,2.28,z-1.44],[.035,4.05,.035]);
    for(const y of [.5,4.0])for(const dz of [-1.2,1.2])bolt([-11.91,y,z+dz],[0,0,Math.PI/2]);
  }
  // Main services, suspension brackets, cable ducts and a few junction boxes.
  for(const y of [4.12,4.42]){
    rod('edge',[-11.8,y,-7.72],[11.8,y,-7.72],.085);
    rod('edge',[-11.72,y,-7.7],[-11.72,y,11.7],.085);
    for(let x=-11;x<=11;x+=3) {cyl('dark',[x,y,-7.72],.12,.1,[0,0,Math.PI/2]);}
    for(let z=-7;z<=11;z+=3) {cyl('dark',[-11.72,y,z],.12,.1,[Math.PI/2,0,0]);}
  }
  for(const x of [-5.5,4.2,10.8]){
    rod('dark',[x,.45,-7.78],[x,3.9,-7.78],.037);
    box('edge',[x,2.9,-7.73],[.48,.4,.18]);
    box('rubber',[x,2.9,-7.63],[.3,.23,.028]);
  }
  // Large-panel floor seams plus sparse wear, never a high-resolution decal.
  for(let x=-9;x<=9;x+=3)box('edge',[x,.001,2],[.014,.008,19.9]);
  for(let z=-5;z<12;z+=3)box('edge',[0,.001,z],[23.9,.008,.014]);
  box('rubber',[-8.8,.006,-4.25],[5.35,.035,3.72]);
  box('dark',[-8.8,.028,-4.25],[5.13,.012,3.51]);
  for(let x=-11.2;x<-6.4;x+=.26)for(let z=-5.75;z<-2.6;z+=.32){
    box('edge',[x,.037,z],[.13,.009,.018],[0,.6,0]);
  }
  for(const [x,z,w] of [[-8.7,-2.3,5.6],[7.5,-2.85,6.2],[.8,-3.85,4.7]]){
    box('ochre',[x,.02,z],[w,.018,.085]);
    box('ochre',[x-w/2,.02,z-.4],[.085,.018,.8]);
    box('ochre',[x+w/2,.02,z-.4],[.085,.018,.8]);
  }
  // Sparse broken tape near equipment: small instances share a single batch.
  for(let i=0;i<9;i++)box('ochre',[-10.8+i*.46,.042,-2.12],[.23,.008,.15],[0,-.5,0]);
  for(let i=0;i<35;i++){
    const x=Math.sin(i*73.15)*10.8,z=2+Math.sin(i*24.37)*8.7;
    box('edge',[x,.012,z],[.06+(i%4)*.08,.006,.013],[0,i*.71,0]);
  }
  // Cyan wall fixtures with a subtle baked glow, no additional light source.
  for(const [x,y,z,w,rot] of [[-8.1,3.42,-7.68,3.8,0],[7.3,3.91,-7.66,3.1,0],[-11.71,3.32,4.65,2.9,Math.PI/2]]){
    box('dark',[x,y,z],[w+.17,.26,.14],[0,rot,0]);
    box('cyan',[x+Math.sin(rot)*.083,y,z+Math.cos(rot)*.083],[w,.085,.026],[0,rot,0]);
    pad('pool',[x+Math.sin(rot)*.09,y-.3,z+Math.cos(rot)*.09],[w*1.6,1.5],[0,rot,0]);
  }
  // Left-wall service hatch and lab identity, placed behind the welding area.
  box('dark',[-11.82,1.8,-3.5],[.18,2.95,2.55]);
  box('steel',[-11.7,1.8,-3.5],[.09,2.72,2.31]);
  rod('dark',[-11.59,1.5,-3.2],[-11.59,2.05,-3.2],.05);
  box('dark',[-11.73,2.55,1],[.14,1.63,2.06]);
  screen(4,[-11.64,2.55,1],[1.9,1.46],[0,Math.PI/2,0]);
  // Contact shadows ground the major objects without extra shadow casters.
  for(const [x,z,w,d] of [[0,1.7,6.3,3.9],[-8.5,-4.6,5.8,4.6],[.4,-5.8,5.7,4.4],[7.2,-5.3,6.6,4.7],[-10.7,5.2,3.3,4.8],[9.3,7.8,4.3,4.5]])pad('shadow',[x,.008,z],[w,d]);
  pad('pool',[.6,.022,-3.9],[4.8,3.4]);pad('pool',[7.2,.023,-3.8],[4.8,3.1]);
  pad('warmPool',[-8.1,.024,-4.25],[4.8,3.3]);
}
