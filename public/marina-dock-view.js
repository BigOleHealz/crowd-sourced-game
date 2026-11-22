import * as THREE from 'three';
import {addDivingTower} from './marina-platform-view.js';
import {berthDeckY,jettyY,jettySections,jettyRail,jettyBitts,jettyBeacon,marinaFingers,marinaRamp,marinaSpine} from './marina-docks.js';

// Fixed masonry below the tide line, dressed stone courses and a timber cap.
// Use the existing marina batch so the jetty adds no scene draw or light pass.
export function addMarinaJetty(block,post,timber){
  const masonry=[0xb2a58e,0xa79d8b,0xbeb19b,0xb9ad97],iron=0x3b4c4d;
  for(const r of jettySections){
    const w=r.east-r.west,d=r.south-r.north;
    block(0x62736b,r.x,-.60,r.z,w,1.5,d);
    block(masonry[0],r.x,.39,r.z,w,.50,d-.07);
    for(const side of [-1,1])for(let row=0;row<2;row++){
      const pitch=1.52,shift=row*pitch/2;
      for(let at=r.west-shift;at<r.east;at+=pitch){
        const from=Math.max(r.west,at),to=Math.min(at+pitch,r.east);
        if(to-from<.04)continue;
        const tint=masonry[(Math.floor((at-r.west+shift)/pitch+.01)+row)%masonry.length];
        block(tint,(from+to)/2,.27+row*.23,r.z+side*(d/2-.024),to-from-.025,.205,.048);
      }
    }
    block(0x978777,r.x,.665,r.z,w,.15,d);
    const boards=Math.ceil(w/.27),pitch=w/boards,edge=.20;
    for(let i=0;i<boards;i++)
      block(timber[(i+Math.floor(i/5))%timber.length],r.west+(i+.5)*pitch,jettyY-.032,r.z,pitch-.008,.064,d-edge*2);
    for(const side of [-1,1])block(0xc7bba2,r.x,jettyY-.032,r.z+side*(d-edge)/2,w,.064,edge);
  }
  const rail=jettyRail;
  for(let i=0;i<=10;i++)post(iron,rail.x+rail.w*(i/10-.5),jettyY+.45,rail.z,.074,.90);
  for(const h of [.47,rail.h-.04])block(iron,rail.x,jettyY+h,rail.z,rail.w,.075,rail.d);
  for(const {x,z,h,w} of jettyBitts){
    post(iron,x,jettyY+.028,z,w,.056);
    post(iron,x,jettyY+h/2,z,.20,h);
    post(iron,x,jettyY+h-.04,z,w,.08);
  }
  const {x,z,w,h}=jettyBeacon;
  block(0xc5bca4,x,jettyY+.15,z,w,.30,w);
  post(iron,x,jettyY+.88,z,.36,1.16);
  post(0xe4dbbf,x,jettyY+1.52,z,.29,.50);
  post(iron,x,jettyY+1.83,z,.48,.15);
  post(0xffd996,x,jettyY+2.09,z,.33,.40);
  for(const side of [-1,1])for(const end of [-1,1])
    post(iron,x+side*.135,jettyY+2.09,z+end*.135,.026,.43);
  post(iron,x,jettyY+2.34,z,.49,.12);
  post(0xbf9d68,x,jettyY+h-.08,z,.16,.16);
}

export function addMarinaDocks(scene,batch){
  const box=new THREE.BoxGeometry(),tube=new THREE.CylinderGeometry(.5,.5,1,10);
  const walnut=0x76523d,brass=0xc3a16d,navy=0x244451,cream=0xe8e0cc;
  const timber=[0xad8460,0xb98b63,0xba926e,0xbb916a,0xb78c65];
  const block=(c,x,y,z,w,h,d,rz=0)=>batch.add(box,c,x,y,z,w,h,d,0,0,rz);
  const post=(c,x,y,z,w,h)=>batch.add(tube,c,x,y,z,w,h,w);
  addMarinaJetty(block,post,timber);
  const grainVertices=[],grainUvs=[],grainColors=[];
  function woodFace(x,z,w,d,alongZ,seed){
    const tint=new THREE.Color(timber[seed%timber.length]).lerp(new THREE.Color(0xffffff),.39);
    const corners=[[-1,-1],[-1,1],[1,1],[-1,-1],[1,1],[1,-1]];
    for(const [i,j] of corners){
      const px=x+i*w/2,pz=z+j*d/2;
      grainVertices.push(px,berthDeckY+.001,pz);
      grainUvs.push((alongZ?px:pz)*.48+seed*.71,(alongZ?pz:px)*.89+seed*.36);
      grainColors.push(tint.r,tint.g,tint.b);
    }
  }
  function deck(r,alongZ){
    const w=r.east-r.west,d=r.south-r.north,x=(r.west+r.east)/2,z=(r.north+r.south)/2;
    block(navy,x,.35,z,w,.35,d);
    const length=alongZ?d:w,n=Math.ceil(length/.22),pitch=length/n;
    for(let i=0;i<n;i++){
      const offset=(i+.5)*pitch-length/2,c=timber[(i*7+Math.floor(i/4))%timber.length];
      const px=x+(alongZ?0:offset),pz=z+(alongZ?offset:0),width=alongZ?w:pitch-.01,depth=alongZ?pitch-.01:d;
      block(c,px,berthDeckY-.026,pz,width,.052,depth);
      woodFace(px,pz,width,depth,alongZ,i);
    }
    for(const side of [-1,1]){
      block(walnut,x+(alongZ?side*(w/2-.06):0),.555,z+(alongZ?0:side*(d/2-.06)),alongZ?.12:w,.023,alongZ?d:.12);
    }
  }
  deck(marinaSpine,true);for(const f of marinaFingers)deck(f,false);
  const grain=new THREE.BufferGeometry();
  grain.setAttribute('position',new THREE.Float32BufferAttribute(grainVertices,3));
  grain.setAttribute('uv',new THREE.Float32BufferAttribute(grainUvs,2));
  grain.setAttribute('color',new THREE.Float32BufferAttribute(grainColors,3));grain.computeVertexNormals();
  const oak=new THREE.TextureLoader().load('./storefront-oak.webp');
  oak.wrapS=oak.wrapT=THREE.RepeatWrapping;oak.colorSpace=THREE.SRGBColorSpace;oak.anisotropy=4;
  const teak=new THREE.Mesh(grain,new THREE.MeshLambertMaterial({map:oak,vertexColors:true}));
  teak.receiveShadow=true;scene.add(teak);
  const run=marinaRamp.east-marinaRamp.west,angle=Math.atan2(.24,run);
  block(navy,68.375,.555,-419,run,.24,2.9,-angle);
  for(let i=0;i<15;i++){
    const t=(i+.5)/15;block(timber[i%5],marinaRamp.west+t*run,.8-t*.24-.024,-419,run/15-.008,.048,2.9,-angle);
  }
  for(const z of [-448,-440,-428,-414]){
    post(navy,70.24,.91,z,.23,.7);post(cream,70.24,1.30,z,.17,.16);post(brass,70.24,1.40,z,.25,.05);
  }
  for(const f of marinaFingers){
    for(const x of [74.7,80.8,87.7])for(const d of [-1,1]){
      const z=f.z+d*.86;
      block(brass,x,.62,z,.26,.045,.11);
      post(brass,x,.68,z,.074,.09);block(brass,x,.735,z,.38,.07,.068);
      block(0x293e46,x,.28,f.z+d*1.105,.73,.195,.07);
    }
    for(const x of [74.4,87.95])post(0x445052,x,-.48,f.z,.25,1.65);
    block(cream,88.83,.44,f.z,.10,.07,1.93);
    for(const side of [-1,1]){
      block(0xb9a483,81.1,.48,f.z+side*1.105,15.65,.052,.045);
      for(const x of [76.5,84.8])block(0xffe3ac,x,.42,f.z+side*1.135,.38,.046,.014);
    }
  }
  // A paved waiting terrace and a pair of canvas-upholstered teak settees.
  block(0xcac4b4,63.25,.816,-428.9,6.6,.032,5.85);
  for(const z of [-427.6,-430.5]){
    const side=z<-429?-1:1;
    block(walnut,64.1,1.015,z,2.25,.32,.84);
    for(const dx of [-.54,.54])block(cream,64.1+dx,1.27,z,1.055,.21,.75);
    block(0x456269,64.1,1.49,z+side*.37,2.24,.38,.15);
    for(const dx of [-1.04,1.04])block(walnut,64.1+dx,1.35,z,.12,.26,.9);
  }
  post(brass,64.15,1.06,-429.1,.12,.45);post(0xe5d7bc,64.15,1.32,-429.1,.81,.075);
  // The lounge sail hangs between four masts. Its raised corners and low
  // stitched center read from a boat without casting a per-frame light.
  const shade=[],shadeUv=[];
  const cornerY=[3.10,3.62,3.16,3.70];
  const corners=[[60.4,-425.8],[66.3,-425.8],[66.3,-432],[60.4,-432]];
  for(let i=0;i<4;i++){
    const [x,z]=corners[i];post(0x75888a,x,(cornerY[i]+.8)/2,z,.073,cornerY[i]-.8);
    post(brass,x,cornerY[i]+.015,z,.103,.064);
    const j=(i+1)%4;
    const a=[x,cornerY[i]-.055,z],b=[...corners[j]];
    shade.push(...a,b[0],cornerY[j]-.055,b[1],63.3,2.88,-428.9);
    shadeUv.push(0,0,1,0,.5,1);batch.beam(0xf0deb5,a,[63.3,2.88,-428.9],.025);
  }
  const sail=new THREE.BufferGeometry();sail.setAttribute('position',new THREE.Float32BufferAttribute(shade,3));
  sail.setAttribute('uv',new THREE.Float32BufferAttribute(shadeUv,2));sail.computeVertexNormals();
  const canopy=new THREE.Mesh(sail,new THREE.MeshLambertMaterial({color:0xe2d2ac,side:THREE.DoubleSide}));canopy.castShadow=true;scene.add(canopy);
  const leaf=new THREE.SphereGeometry(1,8,5);
  for(const [x,z] of [[60.3,-424.8],[65.65,-432.7],[65.7,-416.4]]){
    post(navy,x,1.11,z,.7,.62);post(brass,x,1.42,z,.73,.055);
    for(let i=0;i<13;i++){
      const a=i*2.40,reach=.15+.17*(i%3)/2;
      batch.add(leaf,i%2?0x547769:0x42614e,x+reach*Math.cos(a),1.78+.09*(i%4),z+reach*Math.sin(a),.10,.53,.051,.72*Math.sin(a),0,-.72*Math.cos(a));
    }
  }
  leaf.dispose();
  // One sign atlas covers the entrance identity and berth plates.
  const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=512;
  const c=atlas.getContext('2d');c.fillStyle='#183940';c.fillRect(0,0,1024,512);
  c.strokeStyle='#bba276';c.lineWidth=4;c.strokeRect(12,12,1000,246);c.textAlign='center';
  c.fillStyle='#e8d5a4';c.font='25px sans-serif';c.fillText('L A N T E R N    P O I N T',512,67);
  c.fillStyle='#fff4d8';c.font='78px Georgia,serif';c.fillText('East Quay Marina',512,156);
  c.fillStyle='#d3bd8e';c.font='32px sans-serif';c.fillText('GUEST DOCKS   /   PIER FISHING   /   A · B · C',512,218);
  for(const [i,f] of marinaFingers.entries()){
    const x=i*336;c.strokeRect(x+9,290,314,197);c.font='bold 116px Georgia,serif';c.fillText(f.id,x+167,435);
  }
  const map=new THREE.CanvasTexture(atlas);map.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map});
  function face(w,h,x,y,z,yaw,u0,v0,u1,v1){
    const g=new THREE.PlaneGeometry(w,h),uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,u0+uv.getX(i)*(u1-u0),v0+uv.getY(i)*(v1-v0));
    const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.rotation.y=yaw;scene.add(m);
  }
  block(0xa49172,62.8,1.84,-422.2,.32,2.08,3.88);block(navy,62.8,2.05,-422.2,.35,1.20,3.80);
  for(const sign of [-1,1])face(3.72,1.14,62.8+sign*.181,2.05,-422.2,sign*Math.PI/2,0,.47,1,1);
  marinaFingers.forEach((f,i)=>{
    block(navy,73.7,.84,f.z-.92,.10,.54,.52);
    face(.48,.36,73.643,.87,f.z-.92,-Math.PI/2,i*336/1024,.04,(i*336+332)/1024,.45);
  });
  addDivingTower(scene,batch);
  box.dispose();tube.dispose();
}
