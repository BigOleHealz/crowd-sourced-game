import {sinkingHull} from './sinking-hull.js';
import {wakeTrail} from './boat-wake-view.js';
import {paneBatch} from './pane-damage-view.js';
import {yachtRoomDoors} from './yacht-room-doors.js';
import {cabinTop,lowerStair} from './solana-interior.js';
import {fitSolanaInterior} from './solana-interior-view.js';
import * as THREE from 'three';
import {alpineGlass} from './landscape.js';
import {yachtSections,yachtHalfBeam,yachtStairs,yachtPlatform,yachtLadder,yachtGangway,yachtPad,yachtDeckY,yachtRailRuns,yachtRailTop} from './yacht-layout.js';

const ivory=0xe7e5dc,cream=0xf6f1df,navy=0x17323f,steel=0x9eacac,teak=0xa57953;
const box=new THREE.BoxGeometry(),ball=new THREE.SphereGeometry(1,16,10);
const post=new THREE.CylinderGeometry(.5,.5,1,12),rim=new THREE.TorusGeometry(1,.065,8,28);

function teakMaterial(renderer){
  const c=document.createElement('canvas');c.width=256;c.height=512;
  const g=c.getContext('2d');
  for(let i=0;i<12;i++){
    const x=Math.round(i*256/12),end=Math.round((i+1)*256/12);
    g.fillStyle=['#ae8763','#be9773','#b8916b','#bf9872','#b58c66'][i%5];g.fillRect(x,0,end-x,512);
    g.fillStyle='#63574c';g.fillRect(x,0,1,512);g.fillRect(x,(i*137+71)%512,end-x,1);
    for(let j=1;j<end-x;j+=2){
      g.strokeStyle=j%3?'rgba(104,77,54,.12)':'rgba(242,215,173,.23)';
      g.beginPath();g.moveTo(x+j,0);g.bezierCurveTo(x+j-2,140,x+j+2,323,x+j,512);g.stroke();
    }
  }
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;
  map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  return new THREE.MeshStandardMaterial({map,roughness:.81,side:THREE.DoubleSide});
}

// Share each waterline station along the hull so its highlights follow the
// bow flare and curved quarters. A split at each chine leaves a crisp edge.
function hullShell(stations){
  const vertices=[],colors=[],indices=[];
  const bands=[[-1.34,.12,0x243238],[-.85,.73,0x273d43],[-.13,.89,0x324c50],
    [.04,.903,0xc8c9bc],[.13,.911,0x56635d],[.20,.919,navy],[1.72,1,navy],
    [1.79,1.003,0xa79f89],[1.85,1.004,ivory],[2.50,1.008,ivory]];
  for(const side of [-1,1])for(let r=1;r<bands.length;r++){
    const first=vertices.length/3;
    for(const [z,w] of stations)for(const [y,width] of [bands[r-1],bands[r]]){
      vertices.push(side*w*width,y,z);
      const c=new THREE.Color(bands[r][2]);colors.push(c.r,c.g,c.b);
    }
    for(let i=1;i<stations.length;i++){
      const lo=first+(i-1)*2,hi=lo+2;
      if(side===1)indices.push(lo,lo+1,hi,hi,lo+1,hi+1);
      else indices.push(lo,hi,lo+1,hi,hi+1,lo+1);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
  return new THREE.Mesh(g,new THREE.MeshPhongMaterial({vertexColors:true,specular:0x41515c,shininess:62,side:THREE.DoubleSide}));
}

function deckSurface(stations,height,material,hole){
  const points=[],uv=[],indices=[];
  function strip(rows){
    const offset=points.length/3;
    for(const [z,left,right] of rows){
      const y=typeof height==='function'?height(z):height;
      for(const x of [left,right]){points.push(x,y,z);uv.push(x/2.8,z/5.8);}
    }
    for(let i=1;i<rows.length;i++){const a=offset+i*2-2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  if(hole){
    const zs=[...new Set([...stations.map(s=>s[0]),hole.fore,hole.aft])].sort((a,b)=>a-b);
    const rows=zs.map(z=>[z,-yachtHalfBeam(z),yachtHalfBeam(z)]);
    strip(rows.filter(([z])=>z<=hole.fore));
    const hatchRows=rows.filter(([z])=>z>=hole.fore && z<=hole.aft);
    strip(hatchRows.map(([z,left])=>[z,left,hole.left]));
    strip(hatchRows.map(([z,,right])=>[z,hole.right,right]));
    strip(rows.filter(([z])=>z>=hole.aft));
  }else strip(stations.map(([z,w])=>[z,-w,w]));
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;return mesh;
}

function nameplate(){
  const c=document.createElement('canvas');c.width=512;c.height=96;const g=c.getContext('2d');
  g.textAlign='center';g.fillStyle='#f2e8d1';g.font='44px Georgia';g.fillText('S O L A N A',256,49);
  g.font='15px sans-serif';g.fillText('M I A M I',256,78);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false});
}

export function superyachtView(scene,Batch,renderer,panorama){
  const root=new THREE.Group();root.name='Solana superyacht';root.visible=false;scene.add(root);
  const fittings=new Batch(),metal=new Batch(),glass=new Batch(),stripe=new Batch();
  const wood=teakMaterial(renderer);
  const solid=(c,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>fittings.add(box,c,x,y,z,w,h,d,rx,ry,rz);
  const tubing=(a,b,width=.052)=>metal.beam(steel,a,b,width);
  const ellipse=(c,x,y,z,w,h,d)=>fittings.add(ball,c,x,y,z,w,h,d);
  root.add(hullShell(yachtSections));
  const main=yachtSections.filter(([z])=>z<=yachtStairs.fore);
  root.add(deckSurface(main,yachtDeckY+.004,wood,lowerStair));
  const stern=yachtSections.at(-1);
  solid(navy,0,.10,stern[0]-.06,stern[1]*2,.34,.18);
  const st=yachtStairs,pl=yachtPlatform,l=yachtLadder;
  for(const side of [-1,1]){
    // The side terraces remain at deck level either side of the cut-out stair.
    const band=yachtSections.filter(([z])=>z>=st.fore).map(([z,w])=>[z,w-st.halfWidth]);
    const sideDeck=deckSurface(band,yachtDeckY,wood);
    const points=sideDeck.geometry.attributes.position;
    for(let i=0;i<points.count;i++){
      const x=points.getX(i),w=Math.abs(x);
      points.setX(i,side*(st.halfWidth+(w+x)/2));
    }
    sideDeck.geometry.computeVertexNormals();root.add(sideDeck);
    solid(ivory,side*(st.halfWidth+.055),1.54,17.0,.11,2.0,4.0);
    const width=stern[1]-st.halfWidth;
    solid(navy,side*(st.halfWidth+width*.5),.99,18.95,width,1.82,.14);
    solid(ivory,side*(st.halfWidth+width*.5),2.21,18.95,width,.64,.10);
  }
  const stepLength=(st.aft-st.fore)/st.steps,rise=(st.top-st.bottom)/st.steps;
  for(let i=0;i<st.steps;i++){
    const z=st.fore+(i+.5)*stepLength,y=st.top-i*rise;
    solid(ivory,0,y-rise*.55,z,2*st.halfWidth,rise*1.1,stepLength+.01);
    solid(teak,0,y-.003,z,2*st.halfWidth,.015,stepLength-.015);
  }
  root.add(deckSurface([[pl.fore,pl.halfWidth],[pl.aft,pl.halfWidth]],pl.y,wood));
  solid(ivory,0,pl.y-.135,(pl.fore+pl.aft)/2,2*pl.halfWidth,.25,pl.aft-pl.fore);
  for(const side of [-1,1]){
    for(const [z,h] of [[st.fore,st.top],[17,1.49],[st.aft,st.bottom]])tubing([st.halfWidth*side,h,z],[st.halfWidth*side,h+.72,z]);
    tubing([st.halfWidth*side,st.top+.72,st.fore],[st.halfWidth*side,st.bottom+.72,st.aft]);
    tubing([side*l.halfWidth,pl.y+.36,l.fore],[side*l.halfWidth,l.bottom,l.aft],.081);
  }
  for(let i=0;i<6;i++){
    const f=i/5,y=l.top+(l.bottom-l.top)*f,z=l.fore+(l.aft-l.fore)*f;
    tubing([-l.halfWidth,y,z],[l.halfWidth,y,z],.085);
  }
  const cabinGlass=paneBatch(glass);
  fitSolanaInterior(root,Batch,fittings,metal,glass,wood,cabinGlass);
  for(const side of [-1,1]){
    for(const z of [-14,-10,-6,-2,2,6,10,14]){
      const w=yachtHalfBeam(z)*.982;
      fittings.add(ball,0x0d2631,side*w,1.34,z,.09,.247,.53);
      metal.add(ball,steel,side*(w+.008),1.32,z-.46,.035,.034,.035);
    }
  }
  for(const side of [-1,1]){
    for(const z of [-13.3,2.8,13.4]){
      const w=yachtHalfBeam(z);
      solid(steel,side*(w-.36),2.62,z,.068,.095,.32);
      solid(steel,side*(w-.36),2.69,z,.079,.048,.50);
    }
    fittings.add(ball,0x213741,side*yachtHalfBeam(-15.8)*.98,1.54,-15.8,.075,.210,.40);
    metal.beam(steel,[side*yachtHalfBeam(-15.93)*.99,1.62,-15.93],[side*yachtHalfBeam(-15.53),1.35,-15.53],.074);
    for(const z of [1.8,5.4]){
      const w=yachtHalfBeam(z);
      metal.beam(0x646c60,[side*(w-.15),3.38,z],[side*(w+.12),2.13,z+.04],.034);
      ellipse(0xe2dfd1,side*(w+.13),1.89,z+.04,.148,.44,.139);
    }
  }
  // Radomes, navigation lights, mast cross-trees and VHF whips sit forward
  // of the clear aft landing zone.
  solid(ivory,0,cabinTop+.10,-5.5,2.22,.20,1.72);
  for(const side of [-1,1]){
    fittings.beam(ivory,[side*.99,cabinTop+.10,-4.85],[side*.54,8.11,-5.80],.25,.28);
    ellipse(ivory,side*1.60,cabinTop+.49,-6.55,.49,.49,.49);
    fittings.add(post,0x5c6b72,side*1.60,cabinTop+.10,-6.55,.67,.14,.67);
    tubing([side*.68,7.93,-5.6],[side*2.17,7.93,-5.6],.09);
    tubing([side*1.90,7.91,-5.6],[side*2.20,9.29,-5.56],.033);
    ellipse(side<0?0xcc4c39:0x68ac84,side*3.56,cabinTop-.08,-7,.078,.08,.11);
  }
  solid(0x39474a,0,8.16,-5.81,1.35,.22,.41);
  solid(ivory,0,8.51,-5.8,2.28,.16,.31);
  tubing([0,8.0,-5.8],[0,9.62,-5.86],.065);
  ellipse(cream,0,9.65,-5.86,.089,.094,.089);
  // Forward flybridge station, facing out over the bow.
  solid(ivory,0,2.99,-14.88,1.53,.80,.56);
  solid(0x27373a,0,3.52,-14.86,1.62,.18,.65,-.18);
  for(const x of [-.33,.34])solid(0x639597,x,3.625,-14.92,.49,.022,.27,-.18);
  metal.add(rim,0x646b64,0,3.62,-14.52,.26,.26,.26,-.28);
  for(const a of [.45,2.65,4.71])tubing([0,3.62,-14.52],[.25*Math.cos(a),3.62+.25*Math.sin(a),-14.52-.07*Math.sin(a)],.026);
  // Polished outer rails follow the sheer, with a break at the starboard gangway.
  for(const run of yachtRailRuns){
    let last;
    for(const [x,z] of run){
      if(last){
        tubing(last,[x,yachtRailTop,z],.057);
        tubing([last[0],3.02,last[2]],[x,3.02,z],.027);
      }
      tubing([x,yachtDeckY,z],[x,yachtRailTop,z],.047);
      last=[x,yachtRailTop,z];
    }
  }
  // Recessed rim lights remain flush with the working helipad.
  const pad=new THREE.Mesh(new THREE.CircleGeometry(4.93,72).rotateX(-Math.PI/2),
    new THREE.MeshStandardMaterial({color:0x56635c,roughness:.93}));
  pad.position.set(yachtPad.x,yachtPad.y+.02,yachtPad.z);root.add(pad);
  const circle=new THREE.RingGeometry(4.46,4.57,80).rotateX(-Math.PI/2);
  stripe.add(circle,0xeee2b6,0,2.582,9.3);
  for(const x of [-.92,.92])solid(0xf4e8be,x,2.588,9.3,.31,.014,3.10);
  solid(0xf4e8be,0,2.59,9.3,1.84,.013,.31);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    fittings.add(post,0xc6dac4,4.78*Math.sin(a),2.59,9.3+4.78*Math.cos(a),.10,.022,.10);
  }
  const name=new THREE.Mesh(new THREE.PlaneGeometry(2.0,.26),nameplate());
  name.position.set(0,4.81,1.016);root.add(name);
  const bodyMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.42,metalness:.08,side:THREE.DoubleSide});
  fittings.mesh(root,bodyMat,false);stripe.mesh(root,bodyMat,false);
  metal.mesh(root,new THREE.MeshPhongMaterial({vertexColors:true,shininess:98,specular:0xc1cbd1}),false);
  const updatePanes=cabinGlass.bind(glass.mesh(root,alpineGlass(panorama,{side:THREE.DoubleSide,shininess:100,transparent:true,opacity:.32,depthWrite:false}),false));
  const cabinLeaves=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:0xc0ae8b,roughness:.63}),yachtRoomDoors.length*2);
  const doorPose=new THREE.Object3D(),fractions=yachtRoomDoors.map(()=>0);
  cabinLeaves.count=0;cabinLeaves.frustumCulled=false;root.add(cabinLeaves);
  function updateCabinLeaves(mask,dt){
    let count=0;
    for(const d of yachtRoomDoors){
      const wanted=mask&(1<<d.id)?1:0,old=fractions[d.id];
      const f=fractions[d.id]=old+Math.sign(wanted-old)*Math.min(Math.abs(wanted-old),dt*4);
      if(f<.002)continue;
      const half=d.w*f/2;
      for(const s of [-1,1]){
        doorPose.position.set(d.x+s*(d.w-half)/2,d.y+d.h/2,d.z);
        doorPose.scale.set(half-.001,d.h,.059);doorPose.updateMatrix();cabinLeaves.setMatrixAt(count++,doorPose.matrix);
      }
    }
    cabinLeaves.count=count;cabinLeaves.instanceMatrix.needsUpdate=true;
  }
  const gangway=new THREE.Group();root.add(gangway);
  const ramp=new Batch();
  const end=yachtGangway.outer,start=yachtGangway.inner,drop=yachtGangway.top-yachtGangway.bottom;
  const span=end-start,angle=-Math.atan2(drop,span),length=Math.hypot(span,drop);
  ramp.add(box,0xaeb7b4,(start+end)/2,2.52-drop*.5,10.5,length,.09,1.76,0,0,angle);
  for(const side of [-1,1]){
    const z=10.5+.84*side;
    ramp.beam(steel,[start,3.39,z],[end,3.39-drop,z],.051);
    for(const f of [0,.5,1])ramp.beam(steel,[start+span*f,2.52-drop*f,z],[start+span*f,3.39-drop*f,z],.045);
  }
  ramp.mesh(gangway,bodyMat,false);
  const wake=wakeTrail(scene);
  return (yacht,dt,local)=>{
    root.visible=!!yacht;wake(yacht,dt,local);if(!yacht)return;
    updatePanes(yacht.brokenGlass);updateCabinLeaves(yacht.closedCabins??0,dt);
    const sink=sinkingHull(yacht,15.8,9);
    root.position.set(yacht.x,yacht.y-sink.drop,yacht.z);
    root.rotation.set(sink.trim,-yacht.yaw,(yacht.wakeRoll??0)+sink.list,'YXZ');
    gangway.visible=!!yacht.gangway;
    root.userData.target=yacht.id;
  };
}
