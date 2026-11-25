import {castActorShadow} from './actor-sun-shadow.js';
import * as THREE from 'three';
import {CITY,MAP,groundHeight} from './world.js';
import {wheelsFor,isFlat,flatWheelDrop} from './road-wheel-layout.js';
import {inTowerBreach} from './tower-damage.js';
import {furnitureShadowPieces} from './shop-furniture-view.js';
import {skyDarkness} from './road-lighting.js';

export function furnitureFootprint(p,f){
  if(!f)return {x:p.x,z:p.z,w:p.w,d:p.d};
  const t=f.phase,angle=t*(.65+1.25*t-.90*t*t)*Math.PI/2;
  const span=(f.dx?p.w:p.d)*Math.cos(angle)+p.height*Math.sin(angle);
  const slide=f.shift*t+p.height*.5*Math.sin(angle);
  return {x:p.x+f.dx*slide,z:p.z+f.dz*slide,w:f.dx?span:p.w,d:f.dz?span:p.d};
}

// One ground-only batch, independent of shadow-map size and moving lights.
// Nearby wheels and animated soles take priority over interior furnishings.
export function contactShadows(scene){
  const capacity=176,geometry=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
  const strengths=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1);
  strengths.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('contactWeight',strengths);
  const shadow=THREE.ShaderLib.shadow;
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,lights:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2,
    uniforms:{...THREE.UniformsUtils.clone(shadow.uniforms),skyDarkness},
    vertexShader:'attribute float contactWeight; varying float weight; varying vec2 point;\n'+
      shadow.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nweight=contactWeight;point=uv*2.-1.;'),
    fragmentShader:'varying float weight; varying vec2 point; uniform float skyDarkness;\n'+
      shadow.fragmentShader.replace('opacity * ( 1.0 - getShadowMask() )',
        '(1.-smoothstep(.02,1.,dot(point,point)))*abs(weight)*(weight<0.?getShadowMask()*(1.-skyDarkness):1.-.19*skyDarkness)')});
  material.uniforms.color.value.setRGB(.012,.016,.021);
  const mesh=new THREE.InstancedMesh(geometry,material,capacity),pose=new THREE.Object3D();
  mesh.receiveShadow=true;mesh.name='Ground contact shadows';mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count=0;scene.add(mesh);
  let n=0,actors=0,frameWorld;
  function blob(x,y,z,yaw,width,length,alpha,pitch=0){
    if(n>=capacity || Math.abs(alpha)<.025)return;
    pose.position.set(x,y+.012,z);pose.rotation.set(pitch,-yaw,0,'YXZ');pose.scale.set(width,1,length);pose.updateMatrix();
    mesh.setMatrixAt(n,pose.matrix);strengths.setX(n++,alpha);
  }
  function wheels(car,local,doors){
    if(!car || car.wrecked || car.bridgeFlight || Math.abs(car.y-local.y)>9 || Math.hypot(car.x-local.x,car.z-local.z)>30)return;
    const c=Math.cos(car.yaw),s=Math.sin(car.yaw),axles=wheelsFor(car);
    for(let i=0;i<4;i++){
      const [u,v]=axles[i],x=car.x+c*u-s*v,z=car.z+s*u+c*v;
      const floor=groundHeight(x,z,car.y+.7,doors);
      const gap=car.y+(car.suspension?.wheels[i]??0)+(isFlat(car,i)?flatWheelDrop:0)-floor;
      if(Math.abs(gap)>.32 || floor<=MAP.waterY+.04)continue;
      blob(x,floor,z,car.yaw,.39,.63,.65*Math.max(0,1-Math.max(0,gap)/.32));
    }
  }
  return {
    begin(world,local){
      n=0;actors=0;frameWorld=world;
      wheels(world.rover,local,world.doors);wheels(world.rover2,local,world.doors);wheels(world.rover3,local,world.doors);wheels(world.supercar,local,world.doors);
      for(const car of world.traffic??[])wheels(car,local,world.doors);
      for(const car of world.patrolCars??[])wheels(car,local,world.doors);
    },
    boots(a,state,local){
      if(!a.gait || !state.grounded || state.dead || state.swimming || state.climb || state.parachute || state.stance==='prone' ||
        Math.hypot(state.x-local.x,state.z-local.z)>18)return;
      if(a.root && skyDarkness.value<.94 && actors<6 && Math.abs(local.y-state.y)<4){
        castActorShadow(a,state,frameWorld,blob);actors++;
      }
      for(const {foot,side} of a.limbs){
        if(!Number.isFinite(foot.wx) || state.lostParts?.[side<0?'leftLeg':'rightLeg'])continue;
        const yaw=-a.gait.yaw,gap=Math.max(0,foot.lift??0);
        blob(foot.wx,state.y+(foot.floor??0),foot.wz,yaw,.20,.39,.50*(1-Math.min(1,gap/.21)),foot.floorPitch??0);
      }
    },
    end(world,local){
      if(CITY)for(const entry of furnitureShadowPieces(scene)){
        const {piece:p,mesh:owner}=entry;
        if(Math.abs(p.x-local.x)>17 || Math.abs(p.z-local.z)>17 || Math.abs(p.floor-local.y)>4 || !owner.parent)continue;
        let visible=true;for(let m=owner;m;m=m.parent)if(!m.visible){visible=false;break;}
        if(!visible || inTowerBreach(MAP.buildings,world.doors,p.x,p.floor+.15,p.z))continue;
        const f=furnitureFootprint(p,world.doors?.furniture?.[p.id]);
        blob(f.x,p.floor,f.z,0,f.w+.20,f.d+.19,.36);
      }
      mesh.count=n;mesh.visible=n>0;
      if(n){mesh.instanceMatrix.needsUpdate=true;strengths.needsUpdate=true;}
    }
  };
}
