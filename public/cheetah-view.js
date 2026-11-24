import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {frontWheelAngle} from './road-steering.js';
import {isFlat,flatWheelDrop} from './road-wheel-layout.js';
import {crushedScale} from './vehicle-wreck-view.js';
import {supercarLayout} from './supercar-layout.js';

// One download and one set of geometries/textures serve all three cars. The
// source model is 5.5 m long including its baked shadow; .89 puts the painted
// body at 4.85 m and its wheel centers at the matching physics stations.
const modelScale=.89;
const wheelNames=['Wheel_FL','Wheel_RL','Wheel_FR','Wheel_RR'];
const paint={falco:0x789725,veloce:0xa62d35,supercar:0x326b98};
let templatePromise;
function template(){
  return templatePromise??=new GLTFLoader().loadAsync('./cheetah-supercar.glb')
    .then(gltf=>gltf.scene)
    .catch(error=>{console.error('Cheetah model failed to load',error);return null;});
}

export function createCheetahView(scene,shadowMap,variant='supercar'){
  const root=new THREE.Group();root.name='Cheetah '+variant;scene.add(root);
  const body=new THREE.Group();root.add(body);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.7,5.15),new THREE.MeshBasicMaterial({
    map:shadowMap,color:0x252a2c,transparent:true,opacity:.36,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.016;root.add(shadow);
  const wheels=[];let bodyPaint;
  const brakeMaterial=new THREE.MeshBasicMaterial({color:0xff2530});
  const brakeLights=[-.68,.68].map(x=>{
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(.28,.055,.018),brakeMaterial);
    lamp.position.set(x,.65,2.38);lamp.visible=false;body.add(lamp);return lamp;
  });
  template().then(source=>{
    if(!source)return;
    const model=source.clone(true);
    model.scale.setScalar(modelScale);
    body.add(model);body.updateMatrixWorld(true);
    model.getObjectByName('Cheetah_Shadow')?.removeFromParent();
    model.traverse(node=>{
      if(!node.isMesh)return;
      node.castShadow=true;
      if(node.material?.name==='Cheetah_Body'){
        // The source's clearcoat relies on Sketchfab's studio environment.
        // Phong gives the paint a readable finish under the game's lights.
        node.material=new THREE.MeshPhongMaterial({name:'Cheetah_Body',color:paint[variant]??paint.supercar,
          specular:0x72787b,shininess:82,side:THREE.DoubleSide});
        bodyPaint=node.material;
      }
    });
    // Wheel assemblies include independent spinning rims and fixed calipers.
    // Move each assembly outside the sprung body while preserving its authored
    // transform, then spin only the Wh_* child below the steering pivot.
    for(const name of wheelNames){
      const assembly=model.getObjectByName(name);
      if(!assembly)continue;
      root.attach(assembly);
      const position=assembly.position.clone(),rotation=assembly.rotation.clone(),scale=assembly.scale.clone();
      wheels.push({assembly,position,rotation,scale,spin:assembly.getObjectByName(name.replace('Wheel_','Wh_')),
        front:name.endsWith('FL')||name.endsWith('FR')});
    }
  });
  const update=(car,dt=0)=>{
    root.visible=!!car;if(!car)return;
    root.position.set(car.x,car.y,car.z);
    root.rotation.set(car.bridgeFlight?car.suspension?.pitch??0:0,-car.yaw,0,'YXZ');
    root.scale.y=crushedScale(car);
    const pose=car.suspension;
    body.position.y=pose?.heave??0;
    body.rotation.set(car.bridgeFlight?0:pose?.pitch??0,0,pose?.roll??0);
    shadow.visible=!car.bridgeFlight;
    if(bodyPaint)bodyPaint.color.setHex(car.wrecked?0x493b36:paint[variant]??paint.supercar);
    for(const lamp of brakeLights)lamp.visible=!car.wrecked && !!car.braking;
    for(const [i,w] of wheels.entries()){
      const drop=isFlat(car,i)?flatWheelDrop:0;
      w.assembly.position.copy(w.position);
      w.assembly.position.y+=pose?.wheels?.[i]??-drop;
      w.assembly.rotation.copy(w.rotation);
      w.assembly.scale.copy(w.scale);if(drop)w.assembly.scale.y*=.76;
      if(w.front)w.assembly.rotation.y-=frontWheelAngle(car);
      if(w.spin)w.spin.rotation.x-=car.speed*dt/supercarLayout.tire;
    }
  };
  update.root=root;
  return update;
}
