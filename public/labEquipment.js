// Equipment keeps its established work-point zoning; no character data is used
// or altered here. Broad silhouettes come first, small details share batches.
export function createEquipment(k) {
  createWelding(k); createVacuum(k); createXray(k); createCad(k);
}

function createWelding(k) {
  const {box,cyl,ring,rod,bolt,hose,screen,consolePanel}=k;
  // Separate table top, lower shelf and four legs instead of a single block.
  box('steel',[-8.4,1.17,-4.35],[3.75,.16,1.95],[0,0,0],true);
  box('dark',[-8.4,.45,-4.35],[3.6,.12,1.8]);
  for(const x of [-10.04,-6.76])for(const z of [-5.12,-3.58]){
    box('edge',[x,.59,z],[.13,1.18,.13]);box('dark',[x,.055,z],[.33,.09,.31]);
  }
  for(let x=-9.9;x<-6.8;x+=.3)for(let z=-5;z<-3.65;z+=.3)cyl('rubber',[x,1.256,z],.018,.008);
  box('dark',[-8.55,1.31,-4.23],[1.32,.12,1.04]);
  box('panel',[-8.55,1.39,-4.23],[1.2,.055,.92]);
  cyl('steel',[-8.65,1.61,-4.3],.23,.74,[0,0,Math.PI/2],true);
  ring('dark',[-8.26,1.61,-4.3],.18,[0,Math.PI/2,0]);
  for(const x of [-9.01,-8.13])box('dark',[x,1.45,-4.3],[.12,.13,.62]);
  // Olive welding screens supported by thin poles (kept at the rear/side).
  for(const x of [-10.9,-6.1]){
    rod('edge',[x,.05,-6.25],[x,3.15,-6.25],.042);
    box('dark',[x,.055,-6.25],[.56,.08,.52]);
  }
  box('curtain',[-8.5,1.75,-6.25],[4.68,2.56,.065]);
  for(let x=-10.7;x<-6.2;x+=.3)box('edge',[x,1.75,-6.22],[.035,2.54,.035]);
  rod('steel',[-10.98,3.18,-6.25],[-6.05,3.18,-6.25],.035);
  box('curtain',[-11.02,1.55,-4.65],[.055,2.6,2.75]);
  for(let z=-5.9;z<-3.3;z+=.4)rod('dark',[-11.03,.24,z],[-11.03,2.91,z],.018);
  // Two articulated welding fixtures; cylindrical elbows and an actual tool.
  function arm(x,z,flip){
    cyl('dark',[x,1.32,z],.31,.22);
    cyl('ochre',[x,1.49,z],.24,.18);
    const a=[x,1.62,z],b=[x+flip*.14,2.4,z-.08],c=[x+flip*.97,2.29,z+.24],d=[x+flip*1.26,1.66,z+.42];
    rod('ochre',a,b,.135);rod('ochre',b,c,.115);rod('edge',c,d,.073);
    for(const p of [a,b,c]){cyl('dark',p,.18,.26,[Math.PI/2,0,0]);bolt([p[0],p[1],p[2]+.16]);}
    rod('dark',d,[d[0]+flip*.09,1.43,d[2]],.045);
    hose('rubber',[[x-.17,1.35,z], [x-.22,2.2,z-.08],[b[0],2.57,b[2]],[c[0],2.46,c[2]],d],.028);
  }
  arm(-9.8,-4.85,1);arm(-7.2,-4.93,-1);
  box('red',[-6.08,.65,-5],[.75,1.25,.8],[0,0,0],true);
  box('dark',[-6.08,1.35,-5],[.8,.13,.84]);
  consolePanel(-6.08,1.12,-4.55,3,.55,.49);
  for(const y of [.31,.42,.53])box('rubber',[-6.08,y,-4.585],[.51,.038,.02]);
  cyl('led',[-6.08,.77,-4.57],.045,.03,[Math.PI/2,0,0]);
  hose('rubber',[[-6.08,.6,-4.65],[-6.1,.06,-3.7],[-6.7,.04,-3.4],[-7.1,.05,-3.7],[-7.3,1.2,-4.0]],.045);
  for(const [x,z,mat] of [[-10.2,-7.12,'steel'],[-9.52,-7.12,'edge']]){
    cyl(mat,[x,.83,z],.25,1.55);k.ball(mat,[x,1.58,z],[.5,.3,.5]);
    rod('dark',[x,1.67,z],[x,1.85,z],.04);ring('ochre',[x,1.86,z],.1,[-Math.PI/2,0,0]);
    box('paper',[x,.95,z+.254],[.3,.34,.018]);
  }
  box('dark',[-8.5,3.21,-6.06],[3.6,.16,.25]);box('amber',[-8.5,3.18,-5.9],[3.36,.055,.03]);
  screen(3,[-6.5,3.65,-7.69],[1.04,.78]);
  // Hand tools and a small parts tray on the front edge.
  rod('steel',[-9.6,1.285,-3.69],[-9.27,1.285,-3.84],.027);
  ring('steel',[-9.62,1.285,-3.68],.07,[-Math.PI/2,0,0]);
  box('dark',[-7.25,1.29,-3.86],[.57,.06,.35]);
  for(let i=0;i<4;i++)bolt([-7.43+i*.12,1.35,-3.85],[0,0,0]);
}

function createVacuum(k) {
  const {box,cyl,ring,rod,hose,bolt,consolePanel}=k;
  // The flange faces +Z, toward the camera and the original VACUUM work point.
  const x=.35,z=-6.25,y=1.86;
  box('dark',[x,.18,z],[3.68,.3,3.85],[0,0,0],true);
  box('edge',[x,.37,z],[3.4,.14,3.64]);
  for(const zz of [-7.31,-5.13]){
    box('dark',[x,.65,zz],[2.75,.6,.3]);
    box('steel',[x,.52,zz],[2.97,.12,.65]);
  }
  cyl('steel',[x,y,z],1.21,3.05,[Math.PI/2,0,0],true,true);
  cyl('edge',[x,y,-7.79],1.26,.18,[Math.PI/2,0,0],true);
  for(const zz of [-7.48,-5.18]){
    cyl('edge',[x,y,zz],1.27,.13,[Math.PI/2,0,0],true);
    ring('steel',[x,y,zz+.085],1.18);
  }
  cyl('steel',[x,y,-4.69],1.35,.26,[Math.PI/2,0,0],true);
  cyl('dark',[x,y,-4.532],1.105,.035,[Math.PI/2,0,0],true);
  cyl('edge',[x,y,-4.507],.91,.024,[Math.PI/2,0,0],true);
  cyl('rubber',[x,y,-4.489],.785,.014,[Math.PI/2,0,0],true);
  ring('steel',[x,y,-4.485],.925);ring('edge',[x,y,-4.47],.74);
  // Interior rim grooves, asymmetric hinge and handle make the door readable.
  ring('edge',[x,y,-4.463],.66);
  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2;bolt([x+Math.cos(a)*1.19,y+Math.sin(a)*1.19,-4.535]);
  }
  box('dark',[x+1.2,y,-4.62],[.3,.85,.43]);
  cyl('steel',[x+1.31,y,-4.56],.075,.8);
  rod('steel',[x-.91,y-.28,-4.27],[x-.91,y+.3,-4.27],.042);
  for(const yy of [y-.28,y+.3])rod('dark',[x-.91,yy,-4.27],[x-.91,yy,-4.51],.038);
  box('dark',[x,3.087,-6.28],[.66,.09,1.48]);
  box('panel',[x,3.15,-6.28],[.51,.075,1.29]);
  cyl('amber',[x,3.22,-5.98],.08,.06);
  for(const zz of [-6.9,-5.7])for(const xx of [x-.19,x+.19])bolt([xx,3.2,zz],[0,0,0]);
  box('ochre',[x+1.15,1.83,-6.2],[.04,.15,1.22]);
  for(const zz of [-6.75,-5.85])rod('dark',[x+1.22,1.2,zz],[x+1.22,2.1,zz],.03);
  // Pump and pressure console sit beside the vessel, clear of the arrival spot.
  box('dark',[2.7,.35,-6.35],[1.24,.28,1.55]);
  box('edge',[2.7,.77,-6.3],[.88,.65,1.17]);
  cyl('steel',[2.7,.92,-6.08],.33,.86,[Math.PI/2,0,0]);
  for(let zz=-6.55;zz<-5.8;zz+=.12)ring('dark',[2.7,.92,zz],.29);
  hose('dark',[[1.45,2.23,-6.72],[2.5,2.2,-6.72],[2.92,1.7,-6.4],[2.7,1.15,-6.3]],.095);
  hose('rubber',[[1.51,1.51,-5.66],[2.5,.2,-5.25],[2.92,.12,-6.55],[2.7,.66,-6.78]],.065);
  hose('edge',[[-1.0,.23,-7.82],[-1.56,.15,-7.82],[-1.63,.14,-4.86],[-.92,.14,-4.17],[1.7,.14,-4.17]],.07);
  box('dark',[2.55,.79,-4.8],[.18,1.45,.18]);
  box('edge',[2.55,.13,-4.8],[.91,.16,.65]);
  consolePanel(2.55,1.62,-4.8,2,1.1,.86);
  box('dark',[2.55,1.06,-4.57],[1.2,.12,.5],[-.15,0,0]);
  for(let i=0;i<5;i++)box('steel',[2.2+i*.13,1.14,-4.48],[.07,.014,.07]);
}

function createXray(k){
  const {box,cyl,ring,rod,bolt,screen,consolePanel}=k;
  box('dark',[7.33,.18,-5.89],[4.65,.28,3.42],[0,0,0],true);
  box('panel',[7.15,1.87,-6.17],[3.55,3.42,2.47],[0,0,0],true);
  box('steel',[7.15,3.58,-6.17],[3.77,.19,2.64]);
  box('dark',[7.15,1.94,-4.897],[2.83,2.68,.11]);
  box('edge',[7.15,1.94,-4.817],[2.64,2.5,.05]);
  box('panel',[7.15,1.96,-4.766],[2.38,2.25,.035]);
  box('rubber',[7.12,2.2,-4.739],[1.78,1.41,.025]);
  screen(1,[7.12,2.2,-4.72],[1.65,1.27]);
  rod('steel',[8.17,1.17,-4.57],[8.17,2.18,-4.57],.045);
  for(const x of [6.08,8.22])for(const y of [.9,3.05])bolt([x,y,-4.7]);
  box('dark',[7.15,3.32,-4.867],[2.23,.34,.08]);
  screen(6,[7.15,3.34,-4.812],[1.85,.3]);
  // Conveyor rollers (twelve instances) and a restrained test component.
  box('edge',[7.05,1.05,-3.95],[3.34,.24,1.16]);
  box('dark',[7.05,1.19,-3.95],[3.05,.06,1.02]);
  for(let i=0;i<12;i++)cyl('steel',[5.63+i*.255,1.22,-3.95],.062,.94,[Math.PI/2,0,0]);
  for(const x of [5.63,8.43])for(const z of [-4.35,-3.57])box('dark',[x,.56,z],[.1,1.08,.1]);
  box('edge',[6.42,1.33,-3.95],[.64,.12,.48]);ring('steel',[6.42,1.45,-3.95],.19,[-Math.PI/2,0,0]);
  box('dark',[9.6,.84,-5.6],[.75,1.65,.72]);consolePanel(9.6,1.72,-5.52,1,.69,.61);
  for(let y=.35;y<1.1;y+=.13)box('edge',[9.6,y,-5.225],[.54,.042,.014]);
  cyl('dark',[8.5,3.87,-5.72],.095,.4);
  for(const [y,mat] of [[4.07,'red'],[3.96,'amber'],[3.85,'led']])cyl(mat,[8.5,y,-5.72],.1,.08);
  // Folded inspection curtain, behind the working face rather than in the aisle.
  rod('steel',[4.82,3.5,-7.65],[4.82,3.5,-5.24],.035);
  for(let i=0;i<13;i++){
    const z=-7.51+i*.168;
    box(i%2?'cloth':'edge',[4.82+Math.sin(i*Math.PI/2)*.08,1.93,z],[.065,2.98,.2]);
    k.ring('steel',[4.82,3.43,z],.058,[0,Math.PI/2,0]);
  }
  box('dark',[5.2,3.78,-7.63],[1.2,.9,.14]);screen(1,[5.2,3.78,-7.55],[1.04,.74]);
}

function createCad(k){
  const {box,cyl,rod,screen,cup}=k;
  box('steel',[-10.95,1.17,5.18],[1.66,.13,3.4],[0,0,0],true);
  for(const x of [-11.6,-10.32])for(const z of [3.7,6.64])box('dark',[x,.58,z],[.1,1.16,.1]);
  box('dark',[-11.11,.61,3.94],[1.04,1.03,.72]);
  for(const y of [.37,.64,.9]){
    box('edge',[-10.57,y,3.94],[.035,.23,.63]);rod('steel',[-10.53,y,3.78],[-10.53,y,4.1],.016);
  }
  box('dark',[-11.26,1.9,5.21],[.14,1.26,2.12]);
  screen(0,[-11.178,1.9,5.21],[1.96,1.1],[0,Math.PI/2,0]);
  box('edge',[-11.32,1.39,5.21],[.15,.46,.17]);box('dark',[-11.1,1.27,5.21],[.49,.055,.69]);
  box('dark',[-10.65,1.28,5.18],[.38,.06,1.15]);
  for(let z=4.7;z<5.7;z+=.12)for(let x=-10.8;x<-10.52;x+=.09)box('edge',[x,1.32,z],[.058,.018,.085]);
  k.ball('dark',[-10.65,1.31,6.09],[.2,.08,.28]);cup(-10.78,1.245,4.15);
  box('paper',[-10.8,1.249,6.57],[.74,.014,.38],[0,.16,0]);
  rod('ochre',[-10.78,1.28,6.34],[-10.42,1.28,6.36],.016);
  // Chair sits beside the interaction point, not over it.
  box('rubber',[-9.63,.67,4.36],[.68,.14,.66]);
  box('dark',[-9.21,1.08,4.36],[.1,.68,.64],[0,0,-.13]);
  cyl('steel',[-9.63,.35,4.36],.06,.62);
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5,x=-9.63+Math.cos(a)*.39,z=4.36+Math.sin(a)*.39;
    rod('dark',[-9.63,.15,4.36],[x,.12,z],.026);cyl('rubber',[x,.08,z],.075,.07,[Math.PI/2,0,0]);
  }
}
