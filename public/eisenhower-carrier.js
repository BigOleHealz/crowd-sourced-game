import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {eisenhowerCarrier,carrierRamp,carrierRampSegments} from './eisenhower-carrier-layout.js';
import {seabedHeight} from './reef-channel.js';

function addCarrierRamp(scene){
  const ramp=new THREE.Group();ramp.name='Carrier shore ramp';
  const deckMaterial=new THREE.MeshStandardMaterial({color:0x535f62,metalness:.32,roughness:.78,side:THREE.DoubleSide});
  const railMaterial=new THREE.MeshStandardMaterial({color:0xaab7b4,metalness:.58,roughness:.48});
  const trimMaterial=new THREE.MeshStandardMaterial({color:0x34464b,metalness:.38,roughness:.7});
  const landingMaterial=new THREE.MeshStandardMaterial({color:0xd2ac61,metalness:.35,roughness:.65});
  const beam=(a,b,radius,material)=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,direction.length(),8),material);
    mesh.position.copy(start).add(end).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    mesh.userData.impactSurface='metal';ramp.add(mesh);
  };
  for(const [segment,[a,b]] of carrierRampSegments.entries()){
    const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
    const sideX=-dz/length*carrierRamp.width/2,sideZ=dx/length*carrierRamp.width/2;
    const point=(t,side=0,lift=0)=>[a.x+dx*t+side*sideX,a.y+(b.y-a.y)*t+lift,a.z+dz*t+side*sideZ];
    // A closed, thick deck reads as a steel gangway from the shore and water.
    // Its upper face is exactly the height used by walking collision.
    const vertices=[
      a.x+sideX,a.y,a.z+sideZ,a.x-sideX,a.y,a.z-sideZ,
      b.x+sideX,b.y,b.z+sideZ,b.x-sideX,b.y,b.z-sideZ,
      a.x+sideX,a.y-.48,a.z+sideZ,a.x-sideX,a.y-.48,a.z-sideZ,
      b.x+sideX,b.y-.48,b.z+sideZ,b.x-sideX,b.y-.48,b.z-sideZ,
    ];
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.setIndex([0,1,2,1,3,2,4,6,5,5,6,7,
      0,2,4,2,6,4,1,5,3,3,5,7,0,4,1,1,4,5,2,3,6,3,7,6]);
    geometry.computeVertexNormals();
    const surface=new THREE.Mesh(geometry,deckMaterial);
    surface.receiveShadow=true;surface.userData.impactSurface='metal';ramp.add(surface);
    for(const side of [-1,1]){
      beam(point(0,side,-.42),point(1,side,-.42),.18,trimMaterial);
      // The corner opens for the turn; the final opening begins on the deck.
      const start=segment===0 ? 0 : 2/length;
      const end=segment===0 ? 1-2/length : 1-2/length;
      beam(point(start,side,1.07),point(end,side,1.07),.063,railMaterial);
      beam(point(start,side,.45),point(end,side,.45),.035,railMaterial);
      for(let t=start;t<=end+.001;t+=3/length)
        beam(point(t,side),point(t,side,1.07),.046,railMaterial);
      beam(point(end,side),point(end,side,1.07),.046,railMaterial);
    }
    for(let distance=4;distance<length-1;distance+=4)
      beam(point(distance/length,-.97,.014),point(distance/length,.97,.014),.012,trimMaterial);
    // Paired trestles and cross-braces connect the elevated route to the bed.
    // Stop before the hull so supports never pass through the carrier.
    for(let distance=8;distance<length-(segment?27:4);distance+=12){
      const t=distance/length;
      for(const side of [-.78,.78]){
        const top=point(t,side,-.5),floor=seabedHeight(top[0],top[2])-.45;
        beam([top[0],floor,top[2]],top,.26,trimMaterial);
        const brace=point((distance+5)/length,side,-.5);
        beam([top[0],floor+(top[1]-floor)*.55,top[2]],brace,.11,trimMaterial);
      }
      beam(point(t,-.82,-.53),point(t,.82,-.53),.16,trimMaterial);
    }
    // Mark each transition without adding a raised step or blocking the route.
    for(const t of segment?[1-1.2/length]:[.015])
      beam(point(t,-.94,.012),point(t,.94,.012),.045,landingMaterial);
  }
  scene.add(ramp);
}

export function addEisenhowerCarrier(scene,waterY){
  addCarrierRamp(scene);
  new GLTFLoader().load(new URL('./eisenhower-carrier.glb',import.meta.url).href,({scene:model})=>{
    // Sketchfab's GLB node already converts the source's Z-up frame to Y-up.
    model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model);
    const size=bounds.getSize(new THREE.Vector3());
    if(!Number.isFinite(size.z) || size.z<=0)return;
    const scale=eisenhowerCarrier.length/size.z;
    model.scale.setScalar(scale);
    model.position.set(
      eisenhowerCarrier.x-scale*(bounds.min.x+bounds.max.x)/2,
      waterY-scale*eisenhowerCarrier.waterlineModelY,
      eisenhowerCarrier.z-scale*(bounds.min.z+bounds.max.z)/2,
    );
    model.name='USS Dwight D. Eisenhower (static scenery)';
    model.traverse(part=>{
      if(!part.isMesh)return;
      part.castShadow=false;
      part.receiveShadow=false;
      part.userData.impactSurface='metal';
    });
    scene.add(model);
  },undefined,error=>console.warn('Could not load carrier model',error));
}
