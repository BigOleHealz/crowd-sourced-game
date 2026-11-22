import * as THREE from 'three';
import {GRAND_STEP,grandTop,grandShells,grandFurniture,grandStoryY,resortLevels,atrium,penthousePool,poolDepthAt,upperNorth,hallBounds,hotelPiers} from './grand-resort-layout.js';

const cream=0xd4bd99,brass=0xb39359,gold=0xffd99b,amber=0xffb657,jade=0x51e3c9,coral=0xff8195;
const deep=0x213a42,twilight=0x3b5056;


function crownLights(group){
  const beams=new THREE.Group();group.add(beams);
  const beam=new THREE.CylinderGeometry(2.7,.18,19,18,1,true).translate(0,9.5,0);
  const glass=new THREE.MeshBasicMaterial({color:0xffdfac,blending:THREE.AdditiveBlending,transparent:true,opacity:.060,depthWrite:false,side:THREE.FrontSide,toneMapped:false});
  const positions=[[-69.5,40],[-48.8,40],[-69.5,53.8],[-48.8,53.8]];
  const lamps=positions.map(([x,z],i)=>{
    const shaft=new THREE.Mesh(beam,glass);shaft.position.set(x,grandTop+.54,z);
    beams.add(shaft);return shaft;
  });
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let t=0;
  return (dt,local)=>{
    beams.visible=Math.hypot(local.x+59,local.z-47)<205;
    if(!beams.visible)return;
    if(!reduced?.matches)t=(t+dt)%(Math.PI*200);
    for(let i=0;i<lamps.length;i++){
      lamps[i].rotation.order='YXZ';
      lamps[i].rotation.y=i*Math.PI/2+.40*Math.sin(t*.22+i);
      lamps[i].rotation.x=.25+.15*Math.sin(t*.31+i*1.75);
    }
  };
}

export function grandResortTower(scene,Batch,parts,cube,materials){
  const {slab,trim,light,face}=parts;
  const shell=new Batch();
  // A continuous curb-to-crown series of bands, illuminated pilasters and
  // copper spandrels keeps the double-width suites wing legible from the bay.
  const glass=new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,opacity:.32,
    roughness:.31,metalness:.28,depthWrite:false,side:THREE.DoubleSide});
  for(const level of resortLevels.slice(1)){
    const {n,y}=level;
    for(const b of level.decks){
      if(n===19 && b.z>55)continue;
      slab(n<5?0xa67a61:0xccb393,b.x,y-.115,b.z,b.w,.23,b.d);
      trim(n<5?brass:0x765a46,b.x,y-.16,b.z,b.w+.09,.090,b.d+.09);
    }
    for(const b of grandShells[n]){
      const alongX=b.w>b.d,w=alongX?b.w:b.d;
      if(b.kind==='rail'){
        trim(brass,b.x,y+.99,b.z,b.w,.094,b.d);
        shell.add(cube,0x8bc3be,b.x,y+.50,b.z,b.w,.90,b.d);
        continue;
      }
      const accent=n%5===0?amber:(n%2?jade:gold);
      slab(n%5===0?deep:twilight,b.x,y+.27,b.z,b.w,.56,b.d);
      light(accent,b.x,y+.16,b.z,b.w+.05,n%5===0?.13:.046,b.d+.05);
      shell.add(cube,n<5?0xbbc9b9:0x7dadaf,b.x,y+1.93,b.z,b.w,2.78,b.d);
      trim(brass,b.x,y+3.42,b.z,b.w+.08,.12,b.d+.08);
      const count=Math.max(1,Math.round(w/3.0));
      for(let j=0;j<=count;j++){
        const k=w*(j/count-.5),x=b.x+(alongX?k:0),z=b.z+(alongX?0:k);
        trim(n%5===0?brass:0x867a69,x,y+1.99,z,alongX?.10:.24,2.88,alongX?.24:.10);
        if(n<5 || n%5===0){
          light(n<5?gold:jade,x,y+1.96,z,alongX?.036:.25,2.62,alongX?.25:.036);
        }
      }
    }
  }
  shell.mesh(scene,glass,false);
  // The penthouse pool recess has a dropped ceiling in the sitting room below it.
  slab(cream,penthousePool.x,grandStoryY(19)-1.54,penthousePool.z,penthousePool.w+.25,.18,penthousePool.d+.24);
  // Suites hang over the avenue on a three-storey-deep, gold-lined transfer truss.
  const bridgeY=grandStoryY(9);
  for(const x of [-61.92,-50.08]){
    for(let z=55;z<65;z+=2.5){
      parts.metal.beam(brass,[x,bridgeY-.14,z],[x,bridgeY-1.65,z+1.25],.20,.20);
      parts.metal.beam(brass,[x,bridgeY-1.65,z+1.25],[x,bridgeY-.14,z+2.5],.20,.20);
    }
    trim(brass,x,bridgeY-1.65,60,.26,.27,10.3);
    light(amber,x,bridgeY-1.80,60,.32,.08,10.3);
  }
  for(const {x,z,w,d,h} of hotelPiers){
    slab(deep,x,(h+.8)/2,z,w,h-.8,d);
    trim(brass,x,(h+.8)/2,z,w+.10,h-.8,.14);
    light(gold,x,(h+.8)/2,z,.13,h-.8,d+.04);
    slab(deep,(x-56)/2,bridgeY-.46,z,Math.abs(x+56)+w,.92,d+.12);
  }
  for(const x of [-72,-46])for(const z of [upperNorth,55]){
    slab(deep,x,grandTop*.53,z,.72,grandTop*.94,.75);
    for(const du of [-.25,0,.25]){
      light(du?jade:gold,x+du,grandTop*.535,z,.055,grandTop*.936,.83);
      if(du)light(jade,x,grandTop*.535,z+du,.81,grandTop*.936,.052);
    }
  }
  // Projecting lantern crown and an actual sign face on each approach.
  slab(deep,-59,grandTop-.03,hallBounds.z,26.40,.31,hallBounds.d+.40);
  for(const [dy,w,d] of [[.26,26.85,16.81],[.86,24.6,14.8],[1.96,21.8,12.0],[3.65,16.6,8.8],[5.06,11.6,6.10],[6.19,7.80,4.48]]){
    slab(deep,-59,grandTop+dy,47,w,dy<1?.53:1.71,d);
    trim(brass,-59,grandTop+dy+.32,47,w+.23,.17,d+.23);
    light(dy<1?jade:gold,-59,grandTop+dy+.45,47,w+.28,.10,d+.28);
  }
  for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    const width=Math.abs(Math.sin(yaw))>.5?12.5:18.2;
    const offset=Math.abs(Math.sin(yaw))>.5?11.7:6.76;
    const sign=face(-59+Math.sin(yaw)*offset,47+Math.cos(yaw)*offset,yaw);
    sign.slab(deep,0,grandTop+2.21,0,width+.48,3.25,.48);
    sign.panel(0,0,grandTop+2.21,.25,width,2.96);
    sign.light(coral,0,grandTop+.66,.30,width+.16,.095,.08);
    sign.light(gold,0,grandTop+3.80,.30,width+.16,.095,.08);
  }
  for(let i=-3;i<=3;i++){
    const height=5.83-Math.abs(i)*1.12;
    trim(brass,-59+i*1.08,grandTop+6.0+height/2,47,.25,height,.27);
    light(i%2?jade:gold,-59+i*1.08,grandTop+6.0+height/2,47,.105,height+.44,.32);
  }
  const bladeCanvas=document.createElement('canvas');bladeCanvas.width=192;bladeCanvas.height=1024;
  const pen=bladeCanvas.getContext('2d');
  pen.fillStyle='#153939';pen.fillRect(0,0,192,1024);
  pen.strokeStyle='#ffcc79';pen.lineWidth=5;pen.strokeRect(7,7,178,1010);
  pen.strokeStyle='#77eace';pen.lineWidth=2;pen.strokeRect(13,13,166,998);
  pen.font='900 140px Georgia,serif';pen.textAlign='center';pen.textBaseline='middle';
  pen.fillStyle='#fff4d4';pen.shadowColor='#ffa45a';pen.shadowBlur=11;
  [...'CASINO'].forEach((letter,i)=>pen.fillText(letter,96,96+i*163,155));
  const lettering=new THREE.CanvasTexture(bladeCanvas);lettering.colorSpace=THREE.SRGBColorSpace;
  const bladeMaterial=new THREE.MeshBasicMaterial({map:lettering,toneMapped:false});
  const bladeGeo=new THREE.PlaneGeometry(3.6,19.2);
  slab(deep,-45.03,23.5,52.50,3.77,19.46,.53);
  for(const side of [-1,1]){
    const sign=new THREE.Mesh(bladeGeo,bladeMaterial);sign.position.set(-45.03,23.51,52.50+side*.275);
    sign.rotation.y=side<0?Math.PI:0;scene.add(sign);
    trim(brass,-45.03+side*1.94,23.52,52.5,.13,19.85,.65);
    for(let i=0;i<29;i++)light(i%2?gold:coral,-45.03+side*1.96,14.03+i*.67,52.5,.105,.2,.70);
  }
  const entrance=face(-55,55.08,0);
  for(const s of [-1,1]){
    for(let i=0;i<4;i++){
      const h=16.6-i*1.39,x=s*(7.8+.39*i);
      entrance.trim(deep,x,h*.5+2,.06,.34,h,.66);
      entrance.light(i%2?coral:gold,x,h*.5+2,.405,.13,h-.20,.08);
    }
    for(let i=0;i<25;i++){
      const along=s*(7.36+.043*i);
      entrance.light(i%2===0?gold:amber,along,5.35+i*.39,.54,.15,.14,.075);
    }
  }
  return crownLights(scene);
}

export function grandRooms(scene,Batch){
  const cube=new THREE.BoxGeometry(),drum=new THREE.CylinderGeometry(.5,.5,1,16);
  const stone=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72});
  const lightMat=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});
  const groups=new Map();
  function build(level){
    const group=new THREE.Group(),parts=new Batch(),glow=new Batch();
    group.name=level.name;scene.add(group);
    const box=(color,x,y,z,w,h,d)=>parts.add(cube,color,x,y,z,w,h,d);
    const lamp=(color,x,y,z,w,h,d)=>glow.add(cube,color,x,y,z,w,h,d);
    const circle=(batch,color,x,y,z,w,h,d=w)=>batch.add(drum,color,x,y,z,w,h,d);
    const y=level.y;
    for(const b of level.decks){
      if(level.n===19 && b.z>55)continue;
      const color=level.n<5?0x5c334e:0x776356;
      box(color,b.x,y+.015,b.z,b.w-.18,.025,b.d-.16);
      for(const side of [-1,1]){
        box(brass,b.x+side*(b.w/2-.31),y+.032,b.z,.065,.015,b.d-.38);
        box(brass,b.x,y+.032,b.z+side*(b.d/2-.31),b.w-.40,.015,.065);
      }
    }
    for(const p of grandFurniture[level.n]){
      const {x,z,w,d,h,color,kind}=p, v=p.bottom;
      if(kind==='wall'){
        box(color,x,y+v+h/2,z,w,h,d);
        box(0x92785b,x,y+v+.23,z,w+.023,.44,d+.023);
      }else if(kind==='rail'){
        box(brass,x,y+1.09,z,w,.068,d);
        const along=w>d,count=Math.ceil(Math.max(w,d)/.73);
        for(let i=0;i<=count;i++){
          const k=(i/count-.5)*Math.max(w,d);
          box(0xb59c70,x+(along?k:0),y+.55,z+(along?0:k),.045,1.04,.045);
        }
        lamp(amber,x,y+.98,z,w,.036,d);
      }else if(kind==='slot' || kind==='stool'){
        continue; // These use the same illustrated slot cabinets as the ground floor.
      }else if(kind==='nightstand'){
        circle(parts,brass,x,y+.08,z,w*.82,.15);circle(parts,0x645449,x,y+h/2,z,w*.34,h*.83);
        circle(parts,color,x,y+h-.07,z,w,.14,d);
        circle(parts,brass,x,y+h+.17,z,.045,.33);
        circle(glow,0xffe9c4,x,y+h+.48,z,.35,.32);
      }else if(kind==='chaise'){
        const frame=0x976b4e;
        for(const s of [-1,1]){
          box(frame,x+s*w*.43,y+.20,z,.065,.12,d);
          for(const side of [-1,1])box(brass,x+s*w*.39,y+.11,z+side*d*.37,.055,.22,.07);
        }
        box(0xf0e7ce,x,y+.32,z+.23,w,.13,d*.65);
        parts.add(cube,0xdeceb0,x,y+.49,z-.54,w,.13,.78,-.54);
        parts.add(cube,0xc0a78c,x,y+.66,z-.77,w*.83,.095,.16,-.54);
      }else if(kind==='sofa'){
        box(0x644d42,x,y+.16,z,w-.13,.24,d-.10);
        box(color,x,y+.35,z,w,.22,d);
        box(color,x,y+h*.71,z-d*.40,w,h*.54,.17);
        for(const s of [-1,1])box(color,x+s*(w/2-.075),y+.46,z,.15,.28,d);
      }else if(kind==='bed'){
        box(0x805b49,x,y+.15,z,w,.29,d);
        box(0xf1e3cd,x,y+.38,z,w,.24,d);
        box(color,x,y+.53,z+d*.26,w+.04,.08,d*.48);
        box(0xa07b5b,x,y+.74,z-d*.49,w+.18,1.39,.16);
        for(const s of [-1,1])box(0xe8dfcf,x+s*w*.24,y+.60,z-d*.31,w*.41,.18,.42);
      }else{
        box(0x6f5040,x,y+h*.45,z,w*.56,h*.82,d*.60);
        box(color,x,y+h-.05,z,w,.10,d);
      }
    }
    if(level.n===19){
      const pool=penthousePool,lo=pool.z-pool.d/2,hi=pool.z+pool.d/2;
      for(const [x,z,w,d] of [[-56,(55+lo)/2,12,lo-55],[-56,(72.30+hi)/2,12,72.30-hi],
        [(-62+pool.x-pool.w/2)/2,pool.z,pool.x-pool.w/2+62,pool.d],
        [(-50+pool.x+pool.w/2)/2,pool.z,-50-pool.x-pool.w/2,pool.d]]){
        box(0xc8b398,x,y-.12,z,w,.24,d);
      }
      for(let z=lo;z<hi-.001;z+=.46){
        const d=Math.min(.46,hi-z),height=poolDepthAt(z+d/2);
        box(0x4d9f9c,pool.x,y-height-.02,z+d/2,pool.w,.045,d);
        box(0x55958e,pool.x,y-height+.11,z,pool.w,.22,.04);
      }
      for(const s of [-1,1]){
        box(0x73aaa0,pool.x+s*pool.w/2,y-.75,pool.z,.13,1.51,pool.d);
        lamp(jade,pool.x+s*pool.w/2,y-.21,pool.z,.16,.05,pool.d);
      }
      box(0x73aaa0,pool.x,y-.73,hi,pool.w,1.43,.16);
      for(let x=-61.25;x<-50;x+=.78){
        for(const zz of [[55,lo],[hi,72.30]])box(0xaa9479,x,y+.005,(zz[0]+zz[1])/2,.012,.011,zz[1]-zz[0]);
      }
      for(const side of [-1,1]){
        const xx=pool.x+side*(pool.w/2+.075);
        box(0xede1c2,xx,y+.035,pool.z,.14,.07,pool.d+.30);
        box(0xede1c2,pool.x,y+.035,pool.z+side*(pool.d/2+.075),pool.w+.02,.07,.14);
        for(const z of [62.55,68.55]){
          const px=side<0?-61.03:-50.97;
          circle(parts,brass,px,y+.19,z,.50,.38);
          circle(parts,0x897254,px,y+.72,z,.12,1.05);
          for(let i=0;i<8;i++){
            const a=i*Math.PI/4,length=.72+(i%2)*.17;
            const end=[px+Math.sin(a)*length,y+1.02,z+Math.cos(a)*length];
            parts.beam(0x5b7250,[px,y+1.24,z],end,.065,.085);
            for(const offset of [-1,1])parts.add(cube,i%2?0x597c58:0x64865e,px+Math.sin(a)*length*.63,
              y+1.22,z+Math.cos(a)*length*.63,.16,.049,length*.66,.23,a+offset*.26);
          }
        }
      }
      for(let z=lo;z<hi;z+=.46)for(const s of [-1,1]){
        const x=pool.x+s*(pool.w/2+.47);
        box(0xb19a80,x,y+.009,z,.69,.015,.022);
      }
      for(const x of [-58.80,-58.27]){
        const z=hi-.49;
        parts.beam(brass,[x,y+.63,z+.65],[x,y+.63,z],.068,.068);
        parts.beam(brass,[x,y+.63,z],[x,y-1.20,z],.068,.068);
        parts.beam(brass,[x,y+.63,z+.65],[x,y+.02,z+.65],.068,.068);
      }
      for(const dy of [-.02,-.40,-.77])box(brass,-58.535,y+dy,hi-.49,.58,.052,.071);
      const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
      const ctx=canvas.getContext('2d'),im=ctx.createImageData(128,128);
      for(let j=0;j<128;j++)for(let i=0;i<128;i++){
        const a=i*Math.PI/64,b=j*Math.PI/64,k=(j*128+i)*4;
        const caustic=Math.pow(1-Math.min(1,Math.abs(Math.sin(2*a+Math.sin(b*3))+.62*Math.cos(3*b+Math.sin(a)))),6);
        im.data[k]=93+88*caustic;im.data[k+1]=181+53*caustic;im.data[k+2]=175+43*caustic;im.data[k+3]=255;
      }
      ctx.putImageData(im,0,0);
      const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(3,2.55);
      const water=new THREE.Mesh(new THREE.PlaneGeometry(pool.w,pool.d),new THREE.MeshStandardMaterial({
        map,color:0x8be1d6,roughness:.22,metalness:.12,transparent:true,opacity:.55,depthWrite:false,
      }));
      group.userData.poolWater=map;
      water.rotation.x=-Math.PI/2;water.position.set(pool.x,pool.water,pool.z);group.add(water);
    }
    parts.mesh(group,stone,false);glow.mesh(group,lightMat,false);
    groups.set(level.n,group);return group;
  }
  // Hotel floors outside the camera neighbourhood share facade geometry and do not
  // add draw calls. Only the atrium balconies are visible together from the lobby.
  return (local,dt)=>{
    const n=Math.floor((local.y-.80+.16)/GRAND_STEP);
    const near=Math.abs(local.x+59)<30 && local.z>22 && local.z<86;
    for(const l of resortLevels.slice(1)){
      const visible=near && ((n<5 && l.n<5) || Math.abs(l.n-n)<=1);
      const group=groups.get(l.n)??(visible?build(l):null);if(group){
        group.visible=visible;
        if(visible && group.userData.poolWater)group.userData.poolWater.offset.x=(group.userData.poolWater.offset.x+dt*.018)%1;
      }
    }
  };
}
