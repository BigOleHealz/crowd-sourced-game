import * as THREE from 'three';
import {arrivalArchitecture,arrivalDeck,arrivalGround,arrivalLoop,palaceFurnishings,palaceQuays,promenades} from './palace-arrival.js';

const travertine=0xe1caaa,limestone=0xf3dec3,vein=0xb39b83,onyx=0x293334,lapis=0x153e52;
const brass=0xa88048,gold=0xffda88;
export function addPalaceArrival(scene,Batch){
  const group=new THREE.Group();group.name='Imperial waterfront arrival court';scene.add(group);
  const stone=new Batch(),trim=new Batch(),light=new Batch(),windows=new Batch();
  const box=new THREE.BoxGeometry(),drum=new THREE.CylinderGeometry(.5,.5,1,28),ball=new THREE.SphereGeometry(.5,20,12);
  const fluted=new THREE.CylinderGeometry(.5,.5,1,48,1,true);
  const verts=fluted.attributes.position;
  for(let i=0;i<verts.count;i++){
    const x=verts.getX(i),z=verts.getZ(i);
    const taper=1-.055*Math.cos(12*Math.atan2(z,x));
    verts.setXYZ(i,x*taper,verts.getY(i),z*taper);
  }
  fluted.computeVertexNormals();
  const roofDome=new THREE.SphereGeometry(.5,32,12,0,2*Math.PI,0,Math.PI/2);
  const block=(b,col,x,y,z,w,h,d)=>b.add(box,col,x,y,z,w,h,d);
  const oval=(b,col,x,y,z,w,h,d)=>b.add(drum,col,x,y,z,w,h,d);
  const beam=(b,col,a,c,r)=>b.beam(col,a,c,r);
  function floorStrip(west,east,north,south,cols,rows,tint){
    const pos=[],idx=[],g=new THREE.BufferGeometry();
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const x=west+(east-west)*i/cols,z=north+(south-north)*j/rows;
      pos.push(x,(arrivalGround(x,z)??.80)+.013,z);
      if(j&&i){const n=j*(cols+1)+i;idx.push(n-cols-2,n-1,n,n-cols-2,n,n-cols-1);}
    }
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
    stone.add(g,tint,0,0,0);g.dispose();
  }
  for(const q of palaceQuays)floorStrip(q.west,q.east,q.north,q.south,18,24,0xc7b49c);
  floorStrip(-43.64,-32.36,67,72.55,4,10,0x817d73);
  // Face the reclaimed quay down to the tide line; the terrace rises well above it.
  for(const [ax,az,bx,bz] of [[-76,72.55,-76,99],[-76,99,-32.4,99],[-32.4,99,-32.4,80.25],
      [-32.4,80.25,-6.1,80.25],[-6.1,80.25,-6.1,73]]){
    const n=Math.ceil(Math.hypot(bx-ax,bz-az)/1.25);
    for(let i=0;i<n;i++){
      const t=(i+.5)/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
      const top=arrivalGround(x,z)??.8,w=Math.abs(bx-ax)/n+.25,d=Math.abs(bz-az)/n+.25;
      block(stone,vein,x,(top-.9)/2,z,w,top+.9,d);
      block(stone,limestone,x,top-.12,z,w+.16,.24,d+.16);
      if(i%4===0){
        block(stone,0x887e6c,x,(top-.9)/2,z,w*.20+.16,top+.86,d*.20+.16);
      }
    }
  }
  const drive=new THREE.Shape();
  drive.absellipse(0,0,16.7,10.35,0,2*Math.PI,false,0);
  const island=new THREE.Path();island.absellipse(0,0,9.55,5.0,0,2*Math.PI,true,0);drive.holes.push(island);
  const paving=new THREE.ShapeGeometry(drive,72).rotateX(-Math.PI/2);
  stone.add(paving,0x877f73,arrivalLoop.x,arrivalDeck+.031,arrivalLoop.z);paving.dispose();
  for(const [rx,rz,color,r] of [[16.7,10.35,0xd2bd91,.058],[9.55,5.0,0xe2cb9f,.080],[8.95,4.72,0x987e57,.052]]){
    let prev;
    for(let i=0;i<=100;i++){
      const a=i*2*Math.PI/100,p=[arrivalLoop.x+rx*Math.cos(a),arrivalDeck+.056,arrivalLoop.z+rz*Math.sin(a)];
      if(prev)beam(trim,color,prev,p,r);prev=p;
    }
  }
  function column(x,z,bottom,top,r){
    const h=top-bottom;
    oval(stone,vein,x,bottom+.12,z,r*2.05,.24,r*2.05);
    oval(stone,limestone,x,bottom+.32,z,r*1.72,.21,r*1.72);
    stone.add(fluted,travertine,x,bottom+h/2,z,r*1.36,h-.66,r*1.36);
    for(const [dy,diam] of [[.65,1.60],[.42,1.83],[.25,2.0]])oval(trim,brass,x,top-dy,z,r*diam,.085,r*diam);
    block(stone,limestone,x,top-.104,z,r*2.20,.20,r*2.20);
  }
  for(const a of arrivalArchitecture.walls){
    const horizontal=a.w>a.d,length=horizontal?a.w:a.d,n=Math.max(1,Math.ceil(length/3.80));
    const bottom=arrivalGround(a.x,a.z)??.80;
    block(stone,onyx,a.x,bottom+.34,a.z,a.w,.68,a.d);
    block(windows,0x98b8a8,a.x,(bottom+8.40)/2,a.z,a.w,8.4-bottom,a.d);
    for(let j=0;j<=n;j++){
      const d=length*(j/n-.5);column(a.x+(horizontal?d:0),a.z+(horizontal?0:d),bottom,8.48,.28);
    }
    for(const [y,col,h] of [[5.80,brass,.065],[7.88,lapis,.28],[8.10,gold,.06],[8.30,limestone,.23]]){
      block(y===8.10?light:trim,col,a.x,y,a.z,a.w+.21,h,a.d+.21);
    }
    for(let j=0;j<n;j++){
      const d=length*((j+.5)/n-.5),x=a.x+(horizontal?d:0),z=a.z+(horizontal?0:d),span=length/n;
      for(const side of [-1,1])beam(trim,brass,[x,6.47,z],[x+(horizontal?side*span*.40:0),7.84,z+(horizontal?0:side*span*.40)],.036);
    }
  }
  for(const r of arrivalArchitecture.roofs){
    block(stone,travertine,r.x,(r.base+r.top)/2,r.z,r.w,r.top-r.base,r.d);
    block(trim,brass,r.x,r.top+.10,r.z,r.w+.34,.20,r.d+.34);
  }
  for(const p of promenades){
    const x=(p.east+p.west)*.5,w=p.east-p.west;
    for(const z of [p.south,p.north]){
      block(stone,limestone,x,9.17,z,w+.55,.57,.71);
      block(trim,lapis,x,9.50,z,w+.80,.27,.83);
      block(light,gold,x,9.72,z,w+1.03,.085,.90);
      for(let i=0;i<Math.floor(w/.55);i++)block(stone,travertine,p.west+.32+i*.55,9.84,z,.26,.21,.78);
    }
    for(const [px,pz] of [[p.west+1.20,p.south-1.20],[p.east-1.20,p.south-1.20]]){
      block(stone,limestone,px,10.36,pz,3.65,2.16,3.55);
      block(trim,lapis,px,11.45,pz,3.86,.25,3.72);
      stone.add(roofDome,0xa58a59,px,11.61,pz,3.58,3.62,3.53);
      oval(light,gold,px,13.66,pz,.12,.68,.12);
    }
  }
  for(const p of arrivalArchitecture.piers)column(p.x,p.z,p.base,p.top,p.kind==='arcade'?.24:.63);
  // The main porte-cochère uses a coffered elliptical drum and copper cupola;
  // the entire north lane passes beneath the cantilever.
  for(const [y,rx,rz,h,color] of [[8.62,25.1,11.70,.37,travertine],[8.98,25.46,12.05,.36,lapis],
    [9.20,25.7,12.24,.095,gold],[9.40,25.78,12.28,.32,limestone]]){
    oval(color===gold?light:stone,color,-57,y,80.72,rx,h,rz);
  }
  oval(stone,lapis,-57,9.99,80.72,13.60,.89,5.7);
  stone.add(roofDome,0xab9166,-57,10.44,80.72,13.4,6.4,5.55);
  for(let k=0;k<32;k++){
    const a=k*Math.PI/16;
    light.add(ball,0xffdb8b,-57+12.05*Math.cos(a),8.43,80.72+4.18*Math.sin(a),.16,.085,.16);
  }
  // A colonnaded sky loggia spans the avenue, with a clear 7.45 m opening below.
  block(stone,limestone,-38,8.43,74.5,12.1,.55,5.8);
  block(windows,0x99b7a1,-38,10.08,74.5,11.5,3.28,5.15);
  for(const z of [71.80,77.20])for(let i=0;i<=6;i++)column(-43.65+i*1.88,z,8.71,12,.19);
  block(trim,lapis,-38,12.02,74.50,12.48,.46,6.12);block(light,gold,-38,12.27,74.50,12.6,.075,6.21);
  // Gold coffers throw a continuous fan of light over the drop lane.
  for(let j=0;j<52;j++){
    const a=j*Math.PI/26;
    beam(trim,brass,[-57+2.55*Math.cos(a),8.42,80.72+1.14*Math.sin(a)],
      [-57+11.72*Math.cos(a),8.42,80.72+5.31*Math.sin(a)],.067);
    light.add(ball,0xffdfa0,-57+7.65*Math.cos(a),8.41,80.72+3.39*Math.sin(a),.12,.062,.12);
  }
  oval(stone,lapis,-57,8.38,80.72,5.40,.12,2.55);
  oval(trim,brass,-57,8.30,80.72,3.53,.13,1.67);
  oval(light,0xffedbc,-57,8.22,80.72,2.92,.08,1.43);
  for(const p of arrivalArchitecture.piers){
    if(p.kind==='arcade')continue;
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      oval(light,0xffc976,p.x+.48*Math.cos(a),4.85,p.z+.48*Math.sin(a),.035,3.00,.035);
    }
  }
  // A carved fanlight over each south door picks up the heron-wing shape inside.
  for(const x of [-57,-18]){
    const z=78.91,y=5.67;
    for(let i=0;i<=14;i++){
      const a=Math.PI*i/14;
      beam(trim,brass,[x,y,z+.14],[x+3.42*Math.cos(a),y+2.36*Math.sin(a),z+.14],.085);
      if(i>0){
        const b=Math.PI*(i-1)/14;
        beam(light,gold,[x+3.42*Math.cos(b),y+2.36*Math.sin(b),z+.14],
          [x+3.42*Math.cos(a),y+2.36*Math.sin(a),z+.14],.08);
      }
    }
    for(const side of [-1,1]){
      column(x+side*2.78,z,arrivalDeck,7.85,.45);
      block(trim,0x403732,x+side*2.79,4.6,z+.40,.40,.80,.41);
      light.add(ball,0xffe5aa,x+side*2.79,5.14,z+.40,.44,.69,.44);
    }
  }
  // Floor runners lead across the two occupied galleries to the pedestrian crossing.
  for(const p of promenades){
    for(const side of [-1,1]){
      const z=75.65+side*.93;
      for(let x=p.west+.2;x<p.east-.12;x+=.70){
        const next=Math.min(p.east-.12,x+.70);
        beam(trim,0xb39d65,[x,(arrivalGround(x,z)??.8)+.068,z],[next,(arrivalGround(next,z)??.8)+.068,z],.047);
      }
    }
  }
  for(const p of palaceFurnishings){
    const y=arrivalGround(p.x,p.z)??.8,{x,z,w,d}=p;
    if(p.kind==='cypress'){
      oval(stone,limestone,x,y+.22,z,1.70,.44,1.70);oval(trim,brass,x,y+.47,z,1.60,.10,1.60);
      oval(stone,0x77533b,x,y+.48,z,1.42,.05,1.42);
      oval(stone,0x62462f,x,y+1.05,z,.23,1.24,.23);
      for(let j=0;j<9;j++){
        const k=1-j/10,a=j*2.40;
        stone.add(ball,j%2?0x3e5940:0x506d46,x+.075*Math.cos(a),y+1.52+j*.245,z+.08*Math.sin(a),.98*k,1.46*k+.32,.99*k);
      }
      for(const side of [-1,1])light.add(ball,0xffdc8a,x+side*.67,y+.52,z,.13,.08,.13);
    }else if(p.kind==='desk'){
      block(stone,lapis,x,y+.54,z,w*.95,1.05,d);
      block(stone,limestone,x,y+1.105,z,w,.13,d+.10);
      for(let j=0;j<11;j++)block(trim,brass,x-w*.43+j*w*.086,y+.54,z+d*.5,.032,.87,.04);
      block(trim,brass,x+w*.26,y+1.31,z,.09,.35,.09);
      light.add(ball,0xffe4ac,x+w*.26,y+1.57,z,.34,.29,.34);
    }else{
      block(trim,brass,x,y+.23,z,w*.85,.35,d*.78);
      block(stone,0x32615c,x,y+.51,z,w,.28,d);block(stone,0x325952,x,y+.77,z+d*.40,w,.57,d*.20);
    }
  }
  // Thin crossing strips carry the foot route through the loggia above the original southern head.
  for(let i=0;i<7;i++){
    const x=-41.9+i*1.30,z=75.62,y=arrivalGround(x,z);
    block(stone,0xe2d1ae,x,y+.044,z,.56,.028,1.86);
  }
  function lettering(text,x,y,z,w,h){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=144;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#172f33';ctx.fillRect(0,0,1024,144);
    ctx.strokeStyle='#ca9d57';ctx.lineWidth=6;ctx.strokeRect(8,8,1008,128);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 83px Georgia';ctx.fillStyle='#ffdfa0';ctx.shadowColor='#e9b14a';ctx.shadowBlur=5;
    ctx.fillText(text,512,74,944);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));mesh.position.set(x,y,z);group.add(mesh);
  }
  lettering('LANTERN CLUB  ·  CASINO',-57,9.02,86.82,12.0,1.12);
  lettering('OASIS  GALLERY',-18,8.76,78.99,10.0,.87);
  const marble=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.64});
  marble.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 palacePoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n palacePoint=position;');
    shader.fragmentShader='varying vec3 palacePoint;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec3 p=palacePoint;
      float strata=sin(2.6*p.x+1.1*p.z+.54*p.y+.56*sin(2.4*p.z+.6*p.x)+.18*sin(6.*p.x));
      float veins=smoothstep(.94,1.,strata);diffuseColor.rgb*=.98-.095*veins;
      if(p.y<2.64){
        vec2 tile=p.xz*vec2(.74,.92);
        tile.x+=.5*mod(floor(tile.y),2.);
        vec2 edge=abs(fract(tile)-.5);
        float seam=smoothstep(.474,.496,max(edge.x,edge.y));
        diffuseColor.rgb*=1.-.20*seam;
      }
    `);
  };
  for(const [batch,material] of [[stone,marble],
    [trim,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.37,metalness:.33})],
    [light,new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false})],
    [windows,new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,opacity:.41,depthWrite:false,roughness:.25,metalness:.2})]]){
    batch.mesh(group,material,false);
  }
  for(const g of [box,drum,ball,roofDome,fluted])g.dispose();
}
