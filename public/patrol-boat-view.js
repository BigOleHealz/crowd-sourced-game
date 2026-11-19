import * as THREE from 'three';
import { patrolFleet } from './patrol-boats.js';
import { turretView } from './mount-view.js';

const dark=0x2c3839, steel=0x84958e, bone=0xc7c9b6, orange=0xd47d42;
const tubePath=new THREE.CatmullRomCurve3([
  [ .85,.38,2.48],[ .86,.42,1.93],[ .86,.43,.57],[ .82,.47,-.85],
  [ .70,.54,-1.68],[ .44,.62,-2.26],[0,.66,-2.45],
  [-.44,.62,-2.26],[-.70,.54,-1.68],[-.82,.47,-.85],
  [-.86,.43,.57],[-.86,.42,1.93],[-.85,.38,2.48]
].map(p=>new THREE.Vector3(...p)));
const around=20,along=100;
function collarPoint(t,angle,extra=0) {
  const c=tubePath.getPointAt(t),d=tubePath.getTangentAt(t);
  const cap=THREE.MathUtils.smoothstep(Math.min(t,1-t),0,.042);
  const r=.218*(.13+.87*cap)+extra, horizontal=Math.hypot(d.x,d.z);
  return c.add(new THREE.Vector3(-d.z/horizontal*Math.cos(angle)*r,Math.sin(angle)*r,d.x/horizontal*Math.cos(angle)*r));
}
function collarGeometry() {
  const positions=[],colors=[],indices=[],color=new THREE.Color();
  for(let j=0;j<=along;j++) for(let k=0;k<=around;k++){
    const t=j/along,a=k/around*Math.PI*2;
    positions.push(...collarPoint(t,a).toArray());
    const seam=[.08,.22,.35,.46,.54,.65,.78,.92].some(v=>Math.abs(v-t)<.009);
    const rub=Math.cos(a)>.945;
    color.setHex(rub?0x2e3837:seam?0x54635e:0x68746c);
    color.multiplyScalar(.84+.16*Math.sin(a));colors.push(color.r,color.g,color.b);
    if(j<along&&k<around){
      const i=j*(around+1)+k;
      indices.push(i,i+around+1,i+1,i+1,i+around+1,i+around+2);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function hull(batch){
  // Transverse sections form the keel, two chines and a raised foredeck.
  const stations=[[-2.51,.012,.61,.15],[-2.25,.34,.55,-.11],[-1.76,.61,.48,-.26],
    [-1.10,.79,.44,-.34],[-.30,.83,.44,-.36],[.78,.85,.44,-.33],[2.03,.81,.44,-.27],[2.22,.73,.44,-.23]];
  function section([z,w,deck,keel]){
    return [[-w,deck,z],[-w*.96,.10,z],[-w*.73,keel+.11,z],[0,keel,z],
      [w*.73,keel+.11,z],[w*.96,.10,z],[w,deck,z]];
  }
  function plate(a,b,c,d,tint){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));
    g.computeVertexNormals();batch.add(g,tint,0,0,0);g.dispose();
  }
  const rings=stations.map(section);
  for(let j=1;j<rings.length;j++) {
    const a=rings[j-1],b=rings[j];
    for(let i=0;i<6;i++)plate(a[i],a[i+1],b[i+1],b[i],i===0||i===5?0x556767:0x324849);
    plate(a[6],a[0],b[0],b[6],0x878c7b);
  }
  const rear=rings.at(-1);
  for(let k=0;k<3;k++)plate(rear[k],rear[k+1],rear[5-k],rear[6-k],0x52615d);
}
function hullNumber(id) {
  const c=document.createElement('canvas');c.width=256;c.height=64;
  const ctx=c.getContext('2d');ctx.fillStyle='#e7e4ca';ctx.font='bold 48px sans-serif';
  ctx.textAlign='center';ctx.fillText(id==='bay-rhib'?'BAY  04':'KEY  07',128,50);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false});
}
function buildBoat(scene,Batch,material,id) {
  const root=new THREE.Group();scene.add(root);root.visible=false;
  const fittings=new Batch(),rubber=new Batch(), box=new THREE.BoxGeometry(),round=new THREE.SphereGeometry(1,14,10);
  const tube=new THREE.CylinderGeometry(1,1,1,14),ring=new THREE.TorusGeometry(1,.09,7,20);
  const geometry=collarGeometry();
  const collar=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.80,side:THREE.DoubleSide}));
  root.add(collar);Object.assign(collar.userData,{impactSurface:'solid',target:id});
  hull(fittings);
  function block(t,x,y,z,w,h,d,tilt=0){fittings.add(box,t,x,y,z,w,h,d,tilt);}
  // Non-slip floor, drainage strips, forepeak locker and coaming.
  block(0x656e64,0,.449,.54,1.42,.025,2.97);
  for(const x of [-.57,.57])block(0x485653,x,.464,.53,.036,.008,2.82);
  block(bone,0,.55,-1.64,.86,.19,.61);block(0x939f92,0,.658,-1.65,.74,.025,.53);
  block(dark,0,.679,-1.53,.16,.021,.04);
  for(const side of [-1,1]){
    for(const z of [-1.40,-.66,.18,.98,1.69]){
      const x=side*(Math.abs(z+1.4)<.01?.80:.88);
      fittings.beam(0x47534e,[x,.63,z-.18],[x,.70,z-.13],.028);
      fittings.beam(0x353f3d,[x,.70,z-.13],[x,.70,z+.13],.028);
      fittings.beam(0x47534e,[x,.70,z+.13],[x,.63,z+.18],.028);
    }
    block(orange,side*.856,.664,.71,.16,.015,.38);
    block(bone,side*.856,.675,.71,.17,.010,.095);
    fittings.add(round,steel,side*.72,.61,1.96,.083,.037,.07);
    fittings.add(round,side<0?0xac5142:0x75a990,side*.58,.68,-1.9,.06,.039,.068);
  }
  // Helm console and wheel ahead of the seated helm position.
  block(0x63746d,0,.75,-1.02,.71,.62,.42);block(bone,0,1.03,-1.07,.74,.18,.51,-.12);
  block(dark,0,1.126,-.97,.56,.036,.26,-.15);
  block(0x637e7b,-.06,1.152,-.972,.22,.022,.11,-.15);
  fittings.add(ring,dark,0,1.06,-.773,.130,.130,.13,-.48);
  for(const side of [-1,1])fittings.beam(steel,[0,1.055,-.779],[side*.105,1.075,-.775],.015);
  fittings.beam(dark,[0,1.05,-.78],[0,.952,-.74],.018);
  for(const x of [-.32,.32]) fittings.beam(steel,[x,1.09,-1.19],[x,1.49,-1.125],.026);
  fittings.beam(steel,[-.32,1.49,-1.125],[.32,1.49,-1.125],.026);
  const screen=new THREE.Mesh(new THREE.BoxGeometry(.60,.35,.023),new THREE.MeshStandardMaterial({
    color:0x88a5a2,transparent:true,opacity:.47,roughness:.22,depthWrite:false}));
  screen.position.set(0,1.305,-1.154);screen.rotation.x=.16;root.add(screen);
  screen.userData.impactSurface='solid';screen.userData.target=id;
  // Helm bolster, storage benches, grab rails and the aft gun station under its shared turret.
  block(dark,0,.70,-.37,.37,.43,.33);
  rubber.add(round,0x505b51,0,.919,-.32,.28,.099,.25);
  rubber.add(round,0x4e594e,0,1.075,-.143,.265,.207,.067,-.12);
  for(const side of [-1,1]){
    block(0x768479,side*.56,.616,.56,.32,.32,.78);
    rubber.add(round,0x48564e,side*.56,.799,.56,.18,.071,.416);
    fittings.beam(steel,[side*.67,.73,.20],[side*.67,.94,.20],.025);
    fittings.beam(steel,[side*.67,.94,.20],[side*.67,.94,.91],.025);
    fittings.beam(steel,[side*.67,.94,.91],[side*.67,.73,.91],.025);
  }
  fittings.add(tube,0x63726c,0,.473,1.12,.25,.047,.25);
  fittings.add(tube,dark,0,1.055,1.12,.086,1.16,.086);
  // Outboard cowling and lower leg project beyond the transom.
  block(0x384648,0,.39,2.24,.38,.39,.29);
  rubber.add(round,0x333f42,0,.595,2.44,.305,.40,.285);
  rubber.add(round,0x536263,0,.765,2.45,.296,.24,.277);
  for(const side of [-1,1]){
    block(0xced0b6,side*.282,.68,2.45,.024,.054,.28);
    block(orange,side*.295,.635,2.45,.015,.028,.23);
    for(let n=0;n<3;n++)block(dark,side*.264,.823,2.43+n*.045,.017,.036,.022);
  }
  block(0x455150,0,.11,2.47,.20,.61,.20,-.15);block(dark,0,-.19,2.53,.36,.04,.27);
  for(const side of [-1,1]){
    fittings.beam(steel,[side*.53,.47,1.75],[side*.53,1.39,1.97],.038);
    fittings.beam(steel,[side*.53,1.39,1.97],[side*.42,1.55,2.0],.038);
  }
  fittings.beam(steel,[-.42,1.55,2],[.42,1.55,2],.038);
  fittings.beam(dark,[.36,1.55,2],[.40,2.17,2.015],.018);
  fittings.add(round,bone,-.35,1.62,2,.049,.075,.049);
  const solid=fittings.mesh(root,material),soft=rubber.mesh(root,material);
  Object.assign(solid.userData,{impactSurface:'metal',target:id});Object.assign(soft.userData,{impactSurface:'solid',target:id});
  const decal=hullNumber(id);
  for(const sign of [-1,1]){
    const label=new THREE.Mesh(new THREE.PlaneGeometry(.65,.162),decal);
    label.rotation.y=sign*Math.PI/2;label.position.set(sign*1.084,.462,.13);root.add(label);
  }
  box.dispose();round.dispose();tube.dispose();ring.dispose();return root;
}

// Each ribbon retains world-space samples, so its foam stays on the water through a turn.
function wakeTrail(scene) {
  const max=19, lanes=3,count=max*lanes*2;
  const geometry=new THREE.BufferGeometry(),pos=new THREE.Float32BufferAttribute(new Float32Array(count*3),3);
  const tint=new THREE.Float32BufferAttribute(new Float32Array(count*4),4),uv=new THREE.Float32BufferAttribute(new Float32Array(count*2),2),indices=[];
  pos.setUsage(THREE.DynamicDrawUsage);tint.setUsage(THREE.DynamicDrawUsage);
  uv.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position',pos);geometry.setAttribute('foamTint',tint);geometry.setAttribute('uv',uv);
  for(let k=0;k<lanes;k++)for(let i=0;i<max-1;i++){
    const n=2*(k*max+i);indices.push(n,n+1,n+2,n+1,n+3,n+2);
  }
  geometry.setIndex(indices);
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`attribute vec4 foamTint;varying vec4 tint;varying vec2 strip;
      void main(){tint=foamTint;strip=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec4 tint;varying vec2 strip;
      float hash(vec2 p){return fract(sin(dot(p,vec2(71.37,16.59)))*43758.5);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){float eddy=noise(vec2(strip.x*2.9,strip.y*3.7));
        float strand=1.-smoothstep(.03,.52,abs(strip.x-.50+.24*(eddy-.5)));
        float patches=smoothstep(.24,.73,.67*eddy+.33*noise(vec2(strip.x*7.,strip.y*9.)));
        gl_FragColor=vec4(tint.rgb,strand*patches*tint.a);
        #include <colorspace_fragment>
      }`
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.visible=false;mesh.renderOrder=1;scene.add(mesh);
  const samples=[];let time=0,stamp=-1;
  return (boat,dt)=>{
    time+=dt;const speed=Math.abs(boat.speed);
    if(speed>.9&&!boat.wrecked&&time-stamp>.075){
      const c=Math.cos(boat.yaw),s=Math.sin(boat.yaw),stern=boat.speed>0?2.05:-2.1;
      samples.unshift({x:boat.x-stern*s,y:boat.y+.034,z:boat.z+stern*c,c,s,time,power:Math.min(1,speed/8)});
      stamp=time;
    }
    while(samples.length && (samples.length>max || time-samples.at(-1).time>1.30)) samples.pop();
    mesh.visible=samples.length>1;
    if(!mesh.visible) return;
    for(let k=0;k<lanes;k++)for(let i=0;i<max;i++){
      const q=samples[Math.min(i,samples.length-1)],age=time-q.time,lane=k-1;
      const fade=Math.max(0,1-age/1.3);
      const spread=lane*(.70+age*(.68+.51*q.power));
      const chop=.75+.25*Math.sin(q.time*29+k*9.2);
      const width=(lane?.072+.15*age:.095+.20*age)*chop*q.power;
      for(let side=0;side<2;side++){
        const n=(k*max+i)*2+side,lateral=spread+(side?width:-width);
        pos.setXYZ(n,q.x+q.c*lateral,q.y,q.z+q.s*lateral);uv.setXY(n,side,q.time*2.5+k*5.31);
        tint.setXYZW(n,.64,.80,.75,(i<samples.length?fade:0)*chop*q.power*(lane?.65:.42));
      }
    }
    pos.needsUpdate=tint.needsUpdate=uv.needsUpdate=true;
  };
}
export function patrolBoatView(scene,Batch,material) {
  const views=patrolFleet().map(site=>({
    id:site.id,root:buildBoat(scene,Batch,material,site.id),
    turret:turretView(scene,'boat',Batch,material),wake:wakeTrail(scene),
  }));
  return (boats,dt)=>{
    for(const view of views){
      const boat=boats?.find(b=>b.id===view.id);
      view.root.visible=!!boat;
      if(!boat) continue;
      view.root.position.set(boat.x,boat.y,boat.z);
      view.root.rotation.set(boat.pitch,-boat.yaw,boat.roll,'YXZ');
      view.turret(boat);view.wake(boat,dt);
    }
  };
}
