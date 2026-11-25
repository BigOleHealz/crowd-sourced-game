import assert from 'node:assert/strict';
import * as THREE from 'three';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {Batch}=await import('../public/scene.js');
const {displayBays}=await import('../public/palma-site.js');
const {cityStreets}=await import('../public/brickell-scene.js');
const {resortExterior}=await import('../public/resort-exterior.js');
const {addPalms}=await import('../public/coconut-palms.js');
const {streetHydrants}=await import('../public/hydrant-view.js');
const {casinoView}=await import('../public/casino-view.js');
const {newCityTraffic,driveTrafficCar}=await import('../public/city-traffic.js');
const {clearRoadExit}=await import('../public/rover.js');
const {newExpedition}=await import('../public/expedition.js');

// Build the actual game geometry in Node. Only the unused label pixels,
// image loading and GPU are stubbed; all scene and instance transforms are real.
globalThis.document={createElement:()=>{
  const canvas={width:16,height:16};
  const ink=new Proxy({canvas,measureText:t=>({width:t.length*9}),
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},
    {get:(obj,key)=>obj[key]??(()=>({addColorStop(){}}))});
  canvas.getContext=()=>ink;return canvas;
}};
THREE.TextureLoader.prototype.load=function(name){const map=new THREE.Texture();map.name=name;return map;};
const scene=new THREE.Scene(),sky=new THREE.Texture(),eye={x:-57,y:2,z:63};
const renderer={capabilities:{getMaxAnisotropy:()=>1},shadowMap:{},getPixelRatio:()=>1};
cityStreets(scene,renderer,Batch,sky)({},.016,eye,[],0);
resortExterior(scene,Batch,sky)(.016,eye,{});
casinoView(scene,Batch);
streetHydrants(scene,Batch)({},.016);
addPalms(scene)({fov:55,position:new THREE.Vector3(eye.x,eye.y,eye.z)});
scene.updateMatrixWorld(true);

// Keep triangles around the forecourt. The per-bay test below uses the actual
// triangle, so a rotated planter, palm frond or kiosk roof counts as an obstruction.
const survey=new THREE.Box3();
for(const {x,z} of displayBays){
  survey.expandByPoint(new THREE.Vector3(x-16,.69,z-16));
  survey.expandByPoint(new THREE.Vector3(x+16,17,z+16));
}
const boxes=[],triangles=[],pavers=[],matrix=new THREE.Matrix4(),instance=new THREE.Matrix4();
scene.traverseVisible(mesh=>{
  if(!mesh.isMesh)return;
  if(mesh.material.map?.name==='./brickell-pavers.webp')pavers.push(mesh);
  const g=mesh.geometry,pos=g.attributes.position,indices=g.index?.array;
  if(!g.boundingBox)g.computeBoundingBox();
  for(let n=0;n<(mesh.isInstancedMesh?mesh.count:1);n++){
    matrix.copy(mesh.matrixWorld);
    if(mesh.isInstancedMesh){mesh.getMatrixAt(n,instance);matrix.multiply(instance);}
    if(!g.boundingBox.clone().applyMatrix4(matrix).intersectsBox(survey))continue;
    const t=new THREE.Triangle();
    for(let i=0;i<(indices?.length??pos.count);i+=3){
      t.a.fromBufferAttribute(pos,indices?indices[i]:i).applyMatrix4(matrix);
      t.b.fromBufferAttribute(pos,indices?indices[i+1]:i+1).applyMatrix4(matrix);
      t.c.fromBufferAttribute(pos,indices?indices[i+2]:i+2).applyMatrix4(matrix);
      if(!survey.intersectsTriangle(t))continue;
      triangles.push(t.clone());boxes.push(new THREE.Box3().setFromPoints([t.a,t.b,t.c]));
    }
  }
});
function blockedVolume(x,z,yaw,halfWidth,halfLength,low,high){
  const local=new THREE.Box3(new THREE.Vector3(-halfWidth,low,-halfLength),new THREE.Vector3(halfWidth,high,halfLength));
  const transform=new THREE.Matrix4().makeRotationY(-yaw).setPosition(x,0,z);
  const world=local.clone().applyMatrix4(transform),inverse=transform.invert(),t=new THREE.Triangle();
  return triangles.some((triangle,i)=>{
    if(!world.intersectsBox(boxes[i]))return false;
    t.copy(triangle);t.a.applyMatrix4(inverse);t.b.applyMatrix4(inverse);t.c.applyMatrix4(inverse);
    return local.intersectsTriangle(t);
  });
}
const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0),0,3);
for(const model of ['falco','veloce']){
  const world=newExpedition();world.traffic=newCityTraffic({resort:true});
  const car=world.traffic.find(c=>c.model===model),c=Math.cos(car.yaw),s=Math.sin(car.yaw);
  assert(!blockedVolume(car.x,car.z,car.yaw,1.52,2.72,car.y+.012,15),model+' clear across its whole marked space and overhead');
  for(const side of [-1.51,0,1.51])for(const front of [-2.7,-1.4,0,1.4,2.7]){
    ray.ray.origin.set(car.x+c*side+s*front,2,car.z+s*side-c*front);
    const [ground]=ray.intersectObjects(pavers,false);
    assert(ground && Math.abs(ground.point.y-car.y)<.001,model+' rendered pavement touches every end and edge');
  }
  const feet=clearRoadExit(world,car);
  assert(!blockedVolume(feet.x,feet.z,0,.32,.32,feet.y+.015,feet.y+1.8),'clear driver exit');
  car.driver=1;
  for(let i=0;i<100 && car.z>64.2;i++){
    driveTrafficCar(world,car,{throttle:.28,steer:model==='falco'?.83:-.83},1/30,new Map());
    assert(!blockedVolume(car.x,car.z,car.yaw,1.03,2.28,Math.max(.83,car.y+.03),car.y+1.3),'clear pull-out at step '+i);
  }
  assert(car.z<=64.2,'entered the traffic lane');
}
console.log('PASS both full tilted bays, overhead foliage, rendered paving, driver exits and low-speed routes into the lane.');
