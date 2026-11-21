import * as THREE from 'three';
import {marinaModel} from './marina-fleet-layout.js';
import {wakeTrail} from './boat-wake-view.js';

const white=0xece9dd,cream=0xded7bf,polished=0xc7cfcb,wood=0xae805a,leather=0xd7c4a1;
const rubber=0x383e42,navy=0x233b44,keelPaint=0x4a493f;
const box=new THREE.BoxGeometry(),oval=new THREE.SphereGeometry(1,15,10);
const tube=new THREE.CylinderGeometry(1,1,1,15),ring=new THREE.TorusGeometry(1,.094,8,24);
const stations=[
  [-1,.018,.31],[-.91,.258,.27],[-.76,.53,.20],[-.58,.75,.13],[-.35,.92,.045],
  [0,1,0],[.43,.98,0],[.74,.89,0],[.83,.79,-.025],
];

function facets(rows,material){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(rows.flat(2),3));
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry,material);
}

function emissiveLens(root,x,y,z,color){
  const light=new THREE.Mesh(oval,new THREE.MeshBasicMaterial({color}));
  light.position.set(x,y,z);light.scale.set(.047,.032,.066);root.add(light);
}

function sign(scene,boat,model){
  const canvas=document.createElement('canvas');canvas.width=448;canvas.height=136;
  const context=canvas.getContext('2d');
  context.textAlign='center';context.fillStyle='#efdfad';
  context.font='600 72px Georgia,serif';context.fillText(boat.name.toUpperCase(),224,72,430);
  context.font='600 21px sans-serif';context.fillText('LANTERN POINT',224,108);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3});
  const plaque=new THREE.Mesh(new THREE.PlaneGeometry(model.beam*.55,.16),material);
  plaque.position.set(0,model.deck+.062,model.halfLength*.83+.048);scene.add(plaque);
}

function buildBoat(scene,Batch,boat,glass){
  const model=marinaModel(boat);
  const {halfWidth:w,halfLength:l,deck,keel,roof,helm}=model;
  const isLaunch=boat.boatModel==='launch',isYacht=boat.boatModel==='motorYacht';
  const root=new THREE.Group();root.name=boat.name+' · '+model.title;scene.add(root);
  const paint=new Batch(),trim=new Batch(),grain=new Batch(),glazed=[];
  const block=(batch,color,x,y,z,width,height,depth,rx=0,ry=0,rz=0)=>
    batch.add(box,color,x,y,z,width,height,depth,rx,ry,rz);
  function panel(batch,color,a,b,c,d){
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));
    geometry.computeVertexNormals();batch.add(geometry,color,0,0,0);geometry.dispose();
  }
  function window(a,b,c,d){
    const mesh=facets([[a,b,c],[a,c,d]],glass);
    root.add(mesh);glazed.push(mesh);
    for(const [u,v] of [[a,b],[b,c],[c,d],[d,a]])trim.beam(polished,u,v,.025);
  }

  const cross=stations.map(([z,width,lift])=>{
    const side=w*width,top=deck+lift,low=keel+(Math.abs(z)>.72?.20:0);
    return [[-side,top,z*l],[-side*.98,.124,z*l],[-side*.90,.075,z*l],[-side*.72,low*.48,z*l],
      [0,low,z*l],[side*.72,low*.48,z*l],[side*.90,.075,z*l],[side*.98,.124,z*l],[side,top,z*l]];
  });
  for(let i=0;i<cross.length-1;i++){
    const a=cross[i],b=cross[i+1];
    for(let j=0;j<8;j++){
      const color=j===0||j===7?boat.hull:j===1||j===6?white:keelPaint;
      panel(paint,color,a[j],b[j],b[j+1],a[j+1]);
    }
    panel(paint,white,a[8],b[8],b[0],a[0]);
    for(const j of [0,8])trim.beam(rubber,a[j],b[j],.043);
  }
  const aft=cross.at(-1),bow=cross[0],cap=(points,color)=>{
    const center=[0,.18,points[0][2]];
    for(let j=0;j<points.length-1;j++)panel(paint,color,points[j],points[j+1],center,center);
  };
  cap(aft,boat.hull);cap(bow,boat.hull);

  // Teak follows the aft cockpit and the step down to the boarding platform.
  const cockpitWidth=w*1.73;
  for(let i=0;i<13;i++){
    const width=cockpitWidth/13,x=(i-6)*width;
    block(grain,i%4===0?0xb38662:i%4===1?0xbb906a:wood,x,deck+.013,l*.37,width-.012,.025,l*.84);
    if(Math.abs(i-6)<6)block(grain,i%3?wood:0xbe916c,x,deck-.19,l*.915,width-.012,.105,l*.164);
  }
  block(paint,boat.hull,0,deck+.058,l*.83,w*1.43,.182,.091);
  block(trim,rubber,0,deck-.24,l*.913,w*1.37,.035,l*.17);
  for(const side of [-1,1]){
    const x=side*w*.68;
    trim.beam(polished,[x,deck-.12,l*.995],[x,deck+.22,l*.835],.028);
    trim.beam(polished,[x,deck+.22,l*.835],[x,deck+.26,l*.698],.028);
    // Cleats, handrails and topside vents sit off the rub rail.
    for(const z of [-l*.54,l*.64]){
      block(trim,polished,x,deck+.071,z,.095,.06,.12);
      block(trim,polished,x,deck+.112,z,.16,.033,.25);
    }
    for(const z of [-l*.48,-l*.18,l*.40]){
      const ext=w*(z<-l*.4?.79:.993);
      trim.add(oval,polished,side*ext,deck*.58,z,.047,.090,.205);
      trim.add(oval,navy,side*(ext+.022),deck*.58,z,.047,.066,.17);
    }
    for(const z of [.39,.62])trim.add(oval,rubber,side*w*.965,deck-.08,l*z,.076,.29,.079,0,0,-side*.22);
    for(const [station,width,lift] of stations.slice(1,5)){
      const x=side*w*width*.92,z=station*l,y=deck+lift;
      trim.beam(polished,[x,y,z],[x,y+.265,z],.023);
    }
    const rail=stations.slice(1,5).map(([z,width,lift])=>[side*w*width*.92,deck+lift+.265,z*l]);
    for(let i=0;i<rail.length-1;i++)trim.beam(polished,rail[i],rail[i+1],.023);
    emissiveLens(root,side*w*.79,deck+.205,-l*.49,side<0?0xba392b:0x7ace83);
  }
  block(trim,polished,0,deck+.31,-l*.899,.072,.092,.35);
  trim.add(oval,polished,0,deck+.16,-l*.981,.045,.060,.105);

  // Seat, console and rim share their measurements with the steering pose.
  const {cushion,wheel}=helm;
  block(paint,white,cushion.x,deck+.23,cushion.z,.48,.45,.40);
  paint.add(oval,leather,cushion.x,cushion.y-.086,cushion.z,.272,.086,.226);
  paint.add(oval,cream,cushion.x,cushion.y+.201,cushion.z+.208,.247,.259,.082,-.17);
  block(trim,navy,cushion.x,cushion.y+.02,cushion.z+.29,.28,.043,.031);
  block(paint,white,wheel.x,deck+.308,wheel.z-.25,.62,.61,.42,-.045);
  block(trim,navy,wheel.x,wheel.y+.005,wheel.z-.235,.59,.105,.39,-.20);
  block(trim,0x68928d,wheel.x-.064,wheel.y+.053,wheel.z-.165,.19,.019,.103,-.20);
  trim.beam(polished,[wheel.x,wheel.y-.11,wheel.z-.18],[wheel.x,wheel.y,wheel.z],.041);
  trim.add(ring,navy,wheel.x,wheel.y,wheel.z,wheel.radius,wheel.radius,wheel.radius,wheel.tilt);
  for(const a of [Math.PI/6,5*Math.PI/6,-Math.PI/2]){
    const spoke=wheel.radius*Math.sin(a);
    trim.beam(polished,[wheel.x,wheel.y,wheel.z],
      [wheel.x+wheel.radius*Math.cos(a),wheel.y+spoke*Math.cos(wheel.tilt),wheel.z+spoke*Math.sin(wheel.tilt)],.014);
  }
  trim.add(tube,polished,wheel.x+.23,wheel.y-.039,wheel.z,.021,.28,.021,0,0,-.34);
  trim.add(oval,rubber,wheel.x+.278,wheel.y+.086,wheel.z,.037,.052,.044);

  const benchZ=l*.53,benchW=w*(isLaunch?1.45:1.6);
  block(paint,white,0,deck+.16,benchZ,benchW,.30,.47);
  paint.add(oval,cream,0,deck+.318,benchZ,benchW*.49,.099,.27);
  paint.add(oval,leather,0,deck+.48,benchZ+.20,benchW*.49,.177,.081,-.12);
  for(const x of [-w*.42,w*.42])trim.beam(0xb59d7d,[x,deck+.404,benchZ-.18],[x,deck+.413,benchZ+.11],.009);
  if(!isLaunch){
    trim.add(tube,polished,-w*.46,deck+.245,l*.31,.052,.47,.052);
    paint.add(tube,wood,-w*.46,deck+.48,l*.31,.303,.075,.247);
  }else{
    for(const side of [-1,1])paint.add(oval,cream,side*w*.42,deck+.20,-l*.47,.23,.105,.43);
  }

  const windZ=isLaunch?-l*.31:-l*.38;
  const bottom=deck+(isLaunch?.41:.49),top=isLaunch?deck+.86:roof-.095;
  const left=-w*.73,right=w*.76,highLeft=left*.86,highRight=right*.87;
  const baseZ=windZ-.15,topZ=windZ+.24;
  window([left,bottom,baseZ],[.013,bottom,baseZ-.13],[.013,top,topZ-.10],[highLeft,top,topZ]);
  window([.013,bottom,baseZ-.13],[right,bottom,baseZ],[highRight,top,topZ],[.013,top,topZ-.10]);
  if(isLaunch){
    for(const [base,high] of [[left,highLeft],[right,highRight]])
      window([base,bottom,baseZ],[base,bottom,baseZ+.63],[high,top-.18,topZ+.34],[high,top,topZ]);
  }else{
    const roofRear=l*(isYacht?.34:.17),roofFront=topZ-.30;
    for(const [base,high] of [[left,highLeft],[right,highRight]]){
      window([base,bottom,baseZ],[base,bottom,l*.015],[high,top,l*.015],[high,top,topZ]);
      window([base,bottom,l*.042],[base,bottom,roofRear],[high*.92,top,roofRear],[high,top,l*.042]);
      block(paint,white,base,deck+.287,(baseZ+roofRear)/2,.135,.54,roofRear-baseZ);
      trim.beam(boat.hull,[base+.015,deck+.58,baseZ],[base+.01,deck+.58,roofRear],.041);
      trim.beam(polished,[high,top,l*.015],[high,deck+.57,l*.015],.040);
    }
    const roofLength=roofRear-roofFront,center=(roofRear+roofFront)/2;
    paint.add(oval,white,0,roof-.008,center,w*.88,.140,roofLength*.58);
    paint.add(oval,boat.hull,0,roof-.034,center,w*.903,.036,roofLength*.596);
    if(isYacht){
      block(paint,boat.hull,0,roof+.18,center+.23,.44,.28,.49,-.04);
      paint.add(oval,white,0,roof+.32,center+.23,.29,.092,.31);
      trim.beam(polished,[.03,roof+.27,center+.24],[.007,roof+.68,center+.30],.027);
      trim.add(oval,white,.007,roof+.684,center+.30,.24,.037,.051);
      trim.beam(rubber,[-w*.46,roof+.04,center+.26],[-w*.43,roof+.83,center+.37],.013);
    }else trim.beam(polished,[w*.48,roof-.012,center+.29],[w*.41,roof+.46,center+.46],.022);
  }

  sign(root,boat,model);
  const surface=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.34,metalness:.14,side:THREE.DoubleSide});
  const metal=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.27,metalness:.38});
  const planks=new THREE.MeshLambertMaterial({vertexColors:true});
  const finishes=[surface,metal,planks];
  const meshes=[paint.mesh(root,surface),trim.mesh(root,metal),grain.mesh(root,planks)],wake=wakeTrail(scene);
  const scorched=new THREE.MeshStandardMaterial({color:0x504944,vertexColors:true,roughness:.97,side:THREE.DoubleSide});
  for(const mesh of meshes)Object.assign(mesh.userData,{target:boat.id,impactSurface:'metal'});
  for(const mesh of glazed)Object.assign(mesh.userData,{target:boat.id,impactSurface:'solid'});
  let wrecked=false;
  return {root,wake,update(b,dt,local){
    const settle=b.wrecked?1-Math.exp(-1.2*(6-b.recoverySeconds)):0;
    root.position.set(b.x,b.y-(deck+.54)*settle,b.z);
    root.rotation.set(b.pitch+.10*settle,-b.yaw,b.roll-.32*settle,'YXZ');
    if(wrecked!==b.wrecked){
      wrecked=b.wrecked;
      meshes.forEach((mesh,i)=>{mesh.material=wrecked?scorched:finishes[i];});
      for(const pane of glazed)pane.visible=!wrecked;
    }
    wake(b,dt,local);
  }};
}

export function marinaFleetView(scene,Batch){
  const views=new Map();
  const glass=new THREE.MeshStandardMaterial({
    color:0xbbd3d6,transparent:true,opacity:.40,roughness:.21,metalness:.19,side:THREE.DoubleSide,depthWrite:false,
  });
  return (boats,dt,local)=>{
    const live=new Set();
    for(const boat of boats??[]){
      if(!boat.boatModel || Math.hypot(boat.x-local.x,boat.z-local.z)>190)continue;
      let view=views.get(boat.id);
      if(!view){view=buildBoat(scene,Batch,boat,glass);views.set(boat.id,view);}
      live.add(boat.id);view.root.visible=true;view.update(boat,dt,local);
    }
    for(const [id,view] of views)if(!live.has(id)){
      view.root.visible=false;view.wake(null,dt,local);
    }
  };
}
