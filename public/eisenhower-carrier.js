import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {eisenhowerCarrier,carrierRamp,carrierRampSegments} from './eisenhower-carrier-layout.js';

function addCarrierRamp(scene){
  const ramp=new THREE.Group();ramp.name='Carrier shore ramp';
  const deckMaterial=new THREE.MeshStandardMaterial({color:0x646d71,metalness:.45,roughness:.7,side:THREE.DoubleSide});
  const railMaterial=new THREE.MeshStandardMaterial({color:0xb6c0bd,metalness:.65,roughness:.4});
  const trimMaterial=new THREE.MeshStandardMaterial({color:0x333f43,metalness:.3,roughness:.8});
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
    const vertices=[
      a.x+sideX,a.y,a.z+sideZ,a.x-sideX,a.y,a.z-sideZ,
      b.x+sideX,b.y,b.z+sideZ,b.x-sideX,b.y,b.z-sideZ,
    ];
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.setIndex([0,1,2,1,3,2]);geometry.computeVertexNormals();
    const surface=new THREE.Mesh(geometry,deckMaterial);
    surface.receiveShadow=true;surface.userData.impactSurface='metal';ramp.add(surface);
    for(const side of [-1,1]){
      beam(point(0,side,-.13),point(1,side,-.13),.12,trimMaterial);
      // Open the corner for turning and stop the rails before the flight deck.
      const start=segment===0 ? 0 : 3/length;
      const end=segment===0 ? 1-3/length : 1-17/length;
      beam(point(start,side,1.05),point(end,side,1.05),.055,railMaterial);
      for(let t=start;t<=end+.001;t+=4/length)
        beam(point(t,side),point(t,side,1.05),.045,railMaterial);
      beam(point(end,side),point(end,side,1.05),.045,railMaterial);
    }
    for(let distance=4;distance<length-1;distance+=4)
      beam(point(distance/length,-.98,.012),point(distance/length,.98,.012),.014,trimMaterial);
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
