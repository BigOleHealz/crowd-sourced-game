import * as THREE from 'three';
import {militaryShore,onMilitaryRockShore,militaryRunway,militaryTaxiway,militaryHangar,militaryHelipads,militaryDock,militaryDecks} from './military-island.js';
import {coastalBedHeight} from './brickell-map.js';

function addRockShore(base){
  // Match the reef's two-metre grid so the exposed bank has no collision seam.
  const west=-234,east=-96,north=-320,south=-140,step=2;
  const columns=(east-west)/step+1,rows=(south-north)/step+1;
  const positions=[],uvs=[],colors=[],indices=[];
  const shade=new THREE.Color();
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
    const x=west+col*step,z=north+row*step,y=coastalBedHeight(x,z);
    positions.push(x,y+.008,z);uvs.push(x/4,z/4);
    const wet=1-THREE.MathUtils.smoothstep(y,-.5,.55);
    shade.setRGB(.93-.24*wet,.91-.18*wet,.85-.13*wet);
    colors.push(shade.r,shade.g,shade.b);
    if(col<columns-1 && row<rows-1 && onMilitaryRockShore(x+1,z+1)){
      const i=row*columns+col;
      indices.push(i,i+columns,i+1,i+1,i+columns,i+columns+1);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const texture=new THREE.TextureLoader().load('./granite.webp');
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  const bank=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({map:texture,vertexColors:true,side:THREE.DoubleSide}));
  bank.name='Military island rock shore';bank.receiveShadow=true;bank.userData.impactSurface='solid';base.add(bank);

  const sites=[];
  for(let i=0;i<militaryShore.length;i++){
    const [ax,az]=militaryShore[i],[bx,bz]=militaryShore[(i+1)%militaryShore.length];
    const dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz),nx=dz/length,nz=-dx/length;
    for(let along=2;along<length-1;along+=3.4)
      for(const offset of [1.8,5.2,8.2])sites.push([ax+dx*along/length+nx*offset,az+dz*along/length+nz*offset]);
  }
  const stones=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),
    new THREE.MeshStandardMaterial({roughness:1,flatShading:true}),sites.length);
  const dummy=new THREE.Object3D(),palette=[0x9d9b90,0xb2ab9b,0x858c87,0xa7a598];
  let count=0;
  for(const [x,z] of sites){
    const n=Math.sin(x*127.1+z*311.7)*43758.5453,random=n-Math.floor(n);
    const px=x+(random-.5)*.75,pz=z+Math.sin(n*1.37)*.3;
    if(!onMilitaryRockShore(px,pz))continue;
    const floor=coastalBedHeight(px,pz),radius=.85+random*.75,height=.38+random*.35;
    dummy.position.set(px,floor+height*.13,pz);
    dummy.rotation.set(random*.14,random*Math.PI*2,random*.17);
    dummy.scale.set(radius,height,radius*(.78+.2*random));dummy.updateMatrix();
    stones.setMatrixAt(count,dummy.matrix);
    const color=new THREE.Color(palette[count%palette.length]);
    if(floor<.15)color.multiplyScalar(.72);
    stones.setColorAt(count,color);count++;
  }
  stones.count=count;stones.instanceMatrix.needsUpdate=true;
  if(stones.instanceColor)stones.instanceColor.needsUpdate=true;
  stones.name='Military island shore boulders';stones.userData.impactSurface='solid';base.add(stones);
}

export function addMilitaryIsland(scene,Batch){
  const base=new THREE.Group();base.name='West Harbor military base';scene.add(base);
  const positions=[],colors=[],indices=[];
  const addVertex=(x,y,z,color)=>{
    const tint=new THREE.Color(color),index=positions.length/3;
    positions.push(x,y,z);colors.push(tint.r,tint.g,tint.b);return index;
  };
  const center=addVertex(-165.5,.8,-230,0x69766a);
  const rim=militaryShore.map(([x,z],i)=>addVertex(x,.8,z,i%2?0x788172:0x69776a));
  for(let i=0;i<rim.length;i++)indices.push(center,rim[(i+1)%rim.length],rim[i]);
  for(let i=0;i<rim.length;i++){
    const j=(i+1)%rim.length,[x,z]=militaryShore[i],[nx,nz]=militaryShore[j];
    const a=addVertex(x,-2.9,z,0x5b665b),b=addVertex(nx,-2.9,nz,0x5b665b);
    indices.push(rim[i],a,b,rim[i],b,rim[j]);
  }
  const land=new THREE.BufferGeometry();
  land.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  land.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  land.setIndex(indices);land.computeVertexNormals();
  const shore=new THREE.Mesh(land,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
  shore.receiveShadow=true;shore.userData.impactSurface='solid';base.add(shore);
  addRockShore(base);
  const blocks=new Batch(),box=new THREE.BoxGeometry();
  const block=(color,x,y,z,w,h,d)=>blocks.add(box,color,x,y,z,w,h,d);
  const rect=(r,color,y=.825)=>block(color,(r.west+r.east)/2,y,(r.north+r.south)/2,r.east-r.west,.05,r.south-r.north);
  rect(militaryRunway,0x343d3d);rect(militaryTaxiway,0x535b58);
  for(const x of [militaryRunway.west+.55,militaryRunway.east-.55])
    block(0xf2eee0,x,.859,-230,.18,.012,130);
  for(let z=militaryRunway.north+11;z<militaryRunway.south-6;z+=12)
    block(0xf4f1e6,-199,.861,z,.25,.014,4);
  for(const z of [militaryRunway.north+5,militaryRunway.south-5])for(const x of [-205,-202,-199,-196,-193])
    block(0xf4f1e6,x,.864,z,1.35,.014,2.8);
  const h=militaryHangar;
  block(0x354b48,h.x,.84,h.z,h.w,.08,h.d);
  for(const side of [-1,1])block(0x56645d,h.x,3.45,h.z+side*(h.d/2-.4),h.w,5.3,.8);
  block(0x56645d,h.x+h.w/2-.4,3.45,h.z,.8,5.3,h.d);
  block(0x384b49,h.x,6.08,h.z,h.w+1,.34,h.d+1);
  for(const side of [-1,1])block(0xd4be80,h.x-h.w/2+.35,3.55,h.z+side*(h.d/2-1.1),.12,4.5,.12);
  for(const pad of militaryHelipads){
    const circle=new THREE.Mesh(new THREE.CylinderGeometry(pad.r,pad.r,.06,40),new THREE.MeshLambertMaterial({color:0x374543}));
    circle.position.set(pad.x,.846,pad.z);circle.receiveShadow=true;base.add(circle);
    const ring=new THREE.Mesh(new THREE.RingGeometry(pad.r-1,pad.r-.5,48),new THREE.MeshBasicMaterial({color:0xe5d8ae,side:THREE.DoubleSide}));
    ring.rotation.x=-Math.PI/2;ring.position.set(pad.x,.882,pad.z);base.add(ring);
    block(0xe5d8ae,pad.x,.887,pad.z,5.4,.012,.53);
    for(const side of [-1,1])block(0xe5d8ae,pad.x+side*2.5,.887,pad.z,.53,.012,5.3);
  }
  for(const deck of militaryDecks.slice(1)){
    rect(deck,0x695e48,militaryDock.height-.026);
    for(let x=deck.west+.35;x<deck.east-.2;x+=.55)
      block(0x8d8064,x,militaryDock.height+.006,(deck.north+deck.south)/2,.045,.013,deck.south-deck.north-.18);
  }
  const ramp=militaryDock.ramp;
  const slope=new THREE.BufferGeometry();
  slope.setAttribute('position',new THREE.Float32BufferAttribute([
    ramp.west,.806,ramp.north,ramp.west,.806,ramp.south,
    ramp.east,militaryDock.height+.006,ramp.north,ramp.east,militaryDock.height+.006,ramp.south,
  ],3));
  slope.setIndex([0,1,2,1,3,2]);slope.computeVertexNormals();
  const rampMesh=new THREE.Mesh(slope,new THREE.MeshLambertMaterial({color:0x696454,side:THREE.DoubleSide}));
  rampMesh.receiveShadow=true;base.add(rampMesh);
  for(const z of [-268,-236]){
    block(0x2d3d3d,-84.5,.84,z,.38,.56,.38);
    block(0xd8b669,-84.5,1.14,z,.62,.08,.62);
  }
  const structures=blocks.mesh(base,new THREE.MeshLambertMaterial({vertexColors:true}));
  structures.userData.impactSurface='solid';
  box.dispose();
}
