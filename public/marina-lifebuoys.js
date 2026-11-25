import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {berthDeckY,jettyRail,jettyY,marinaSpine} from './marina-docks.js';

export function addMarinaLifebuoys(scene,batch){
  const spineX=marinaSpine.east+.11;
  const stations=[
    {x:spineX,y:berthDeckY+.79,z:-441,yaw:-Math.PI/2},
    {x:spineX,y:berthDeckY+.79,z:-415,yaw:-Math.PI/2},
    {x:jettyRail.x+jettyRail.w/10,y:jettyY+.68,z:jettyRail.z-.152,yaw:Math.PI,rail:true},
  ];
  const box=new THREE.BoxGeometry(),steel=0x677777,galvanized=0xabafa3;
  for(const s of stations){
    const sn=Math.sin(s.yaw),cs=Math.cos(s.yaw);
    // Positive local Z faces the person retrieving the ring.
    const part=(tint,x,y,z,w,h,d)=>batch.add(box,tint,s.x+cs*x+sn*z,s.y+y,
      s.z-sn*x+cs*z,w,h,d,0,s.yaw);
    if(!s.rail){
      // The upright bolts to the floating dock fascia, clear of its walking surface.
      part(steel,0,-.41,-.125,.085,1.34,.065);
      for(const y of [-.98,-.84])part(galvanized,0,y,0,.16,.054,.30);
    }
    // A backplate carries two J-hooks through the open center of the ring.
    part(steel,0,.203,-.112,.34,.075,.10);
    for(const side of [-1,1]){
      part(galvanized,side*.102,.203,-.007,.028,.029,.20);
      part(galvanized,side*.102,.241,.087,.028,.094,.026);
    }
  }
  box.dispose();

  const center=new THREE.Vector3(spineX,berthDeckY,-426),lod=new THREE.LOD();
  lod.position.copy(center);
  // This small ring covers the first visible frame and a failed asset request.
  const rings=new THREE.InstancedMesh(new THREE.TorusGeometry(.265,.076,6,24),
    new THREE.MeshLambertMaterial({color:0xaf412b}),stations.length);
  rings.name='East Quay lifebuoys';
  const pose=new THREE.Object3D();
  for(const [i,s] of stations.entries()){
    pose.position.set(s.x,s.y,s.z).sub(center);
    pose.rotation.y=s.yaw;pose.updateMatrix();rings.setMatrixAt(i,pose.matrix);
  }
  rings.computeBoundingSphere();
  rings.onBeforeRender=()=>{
    rings.onBeforeRender=()=>{};
    new GLTFLoader().loadAsync(new URL('./marina-lifebuoy.glb',import.meta.url).href).then(({scene:asset})=>{
      const ring=asset.children[0];
      rings.geometry.dispose();rings.material.dispose();
      rings.geometry=ring.geometry;rings.material=ring.material;
      rings.receiveShadow=true;rings.computeBoundingSphere();
    }).catch(()=>{ /* The dock stations retain the small ring if the scan is unavailable. */ });
  };
  lod.addLevel(rings,0);
  lod.addLevel(new THREE.Object3D(),90,.12);
  scene.add(lod);
}
