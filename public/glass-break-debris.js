import * as THREE from 'three';
import {groundHeight} from './world.js';

const fragmentsPerPane=16, flightCapacity=256;

function shardGeometry() {
  const shape=new THREE.BufferGeometry();
  // The bright sliver along the long edge stays visible against both sky and pavement.
  shape.setAttribute('position',new THREE.Float32BufferAttribute([
    -.49,0,0, .50,0,0, -.16,1,0,
    -.49,0,.002, -.16,1,.002, -.27,.73,.002,
  ],3));
  shape.setAttribute('color',new THREE.Float32BufferAttribute([
    .38,.60,.62, .24,.43,.45, .32,.53,.55,
    .90,1,1, .89,1,1, .81,.95,.94,
  ],3));
  return shape;
}

export function glassBreakDebris(scene,paneCapacity) {
  const geometry=shardGeometry();
  const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.84,depthWrite:false,forceSinglePass:true});
  const remnants=new THREE.InstancedMesh(geometry,material,paneCapacity*fragmentsPerPane);
  const fragments=new THREE.InstancedMesh(geometry,material,flightCapacity);
  remnants.name='Broken glass edges and fragments';
  fragments.name='Flying glass fragments';
  for(const mesh of [remnants,fragments]){
    mesh.count=0;
    mesh.frustumCulled=false;
    mesh.userData.cosmetic=true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);
  }

  const broken=new Set(), airborne=[];
  const piece=new THREE.Object3D();
  piece.rotation.order='YXZ';
  let dirty=false;
  function setBroken(pane,hide,burst=false) {
    if(hide===broken.has(pane))return;
    dirty=true;
    if(!hide){
      broken.delete(pane);
      for(let i=airborne.length-1;i>=0;i--)if(airborne[i].pane===pane)airborne.splice(i,1);
      return;
    }
    broken.add(pane);
    if(!burst)return;
    const {x,z,width,bottom,top,widthAxis}=pane;
    for(let i=0;i<34;i++){
      if(airborne.length===flightCapacity)airborne.shift();
      const u=(Math.random()-.5)*width, across=(Math.random()-.5)*2.5;
      const out=(Math.random()-.5)*7.0;
      const px=x+(widthAxis==='x'?u:0), pz=z+(widthAxis==='x'?0:u);
      airborne.push({
        pane,x:px,z:pz,y:THREE.MathUtils.lerp(bottom,top,.06+.89*Math.random()),
        vx:widthAxis==='x'?across:out,vz:widthAxis==='x'?out:across,vy:.6+Math.random()*3,
        floor:groundHeight(px,pz)+.025,age:0,life:.77+.36*Math.random(),
        size:.055+Math.random()*.105,yaw:Math.random()*Math.PI*2,
      });
    }
  }

  function rebuildRemnants() {
    let count=0;
    for(const {widthAxis,x,z,width,top,edge=true} of broken){
      const isX=widthAxis==='x', yaw=isX?0:Math.PI/2;
      const seed=x*.457+z*.191;
      const unit=i=>{
        const noise=Math.sin(seed+i*12.9898)*43758.5453;
        return noise-Math.floor(noise);
      };
      function place(u,n,y,w,h,tilt,heading,roll=0){
        piece.position.set(x+(isX?u:n),y,z+(isX?n:u));
        piece.scale.set(w,h,1);
        piece.rotation.set(tilt,heading,roll);
        piece.updateMatrix();
        remnants.setMatrixAt(count++,piece.matrix);
      }
      const edgeWidth=Math.min(.245,width*.27);
      // Only hang from the lintel and sill. Adjacent missing bays share no mullion.
      for(let i=0;edge&&i<3;i++){
        const u=width*((i+.54)/3-.5)+(unit(i)-.5)*width*.08;
        place(u,.009,top-.012,edgeWidth*(.74+.4*unit(i+3)),.065+unit(i+6)*.128,0,yaw,Math.PI);
      }
      for(const side of edge?[-1,1]:[]){
        const u=side*(width/2-edgeWidth*.57);
        place(u,.012,groundHeight(x+(isX?u:0),z+(isX?0:u))+.015,edgeWidth,.043+unit(side+12)*.10,0,yaw,0);
      }
      for(let i=5;i<fragmentsPerPane;i++){
        const u=(unit(i*3)-.5)*width*.93, n=(unit(i*3+1)-.48)*1.20;
        const floor=groundHeight(x+(isX?u:n),z+(isX?n:u));
        const size=.054+unit(i*3+2)*.093;
        place(u,n,floor+.016,size,size*1.43,-Math.PI/2,unit(i+37)*Math.PI*2);
      }
    }
    remnants.count=count;
    remnants.instanceMatrix.needsUpdate=true;
    dirty=false;
  }

  function update(dt) {
    if(dirty)rebuildRemnants();
    if(!airborne.length && fragments.count===0)return;
    for(let i=airborne.length-1;i>=0;i--){
      const p=airborne[i];p.age+=dt;
      if(p.age>=p.life){airborne.splice(i,1);continue;}
      if(p.y>p.floor || p.vy>0){
        p.vy-=9.8*dt;p.y=Math.max(p.floor,p.y+p.vy*dt);
        p.x+=p.vx*dt;p.z+=p.vz*dt;
      }
    }
    fragments.count=airborne.length;
    airborne.forEach((p,i)=>{
      const falloff=1-THREE.MathUtils.smoothstep(p.age,p.life-.24,p.life);
      const size=p.size*falloff;
      piece.position.set(p.x,p.y,p.z);
      piece.scale.set(size,size*1.47,1);
      piece.rotation.set(p.age*8+i,p.yaw+p.age*5,p.age*8-i);
      piece.updateMatrix();fragments.setMatrixAt(i,piece.matrix);
    });
    fragments.instanceMatrix.needsUpdate=true;
  }

  return {setBroken,update};
}
