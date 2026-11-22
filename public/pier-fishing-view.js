import * as THREE from 'three';
import {activeCast} from './pier-fishing.js';
import {fishSpecies} from './reef-fish.js';
import {fishGeometry} from './reef-fish-view.js';

// Only anglers with a live line allocate a rig. All their geometry is shared.
export function pierFishingView(scene,waterY){
  const caughtShapes=new Map(),scales=new THREE.MeshLambertMaterial({side:THREE.DoubleSide,vertexColors:true});
  const rigs=new Map(),rodShape=new THREE.CylinderGeometry(.012,.025,1,6);
  const cork=new THREE.SphereGeometry(.105,10,8),tipShape=new THREE.CylinderGeometry(.019,.026,.12,6);
  const rodPaint=new THREE.MeshLambertMaterial({color:0x3d4843}),red=new THREE.MeshLambertMaterial({color:0xff572e});
  const white=new THREE.MeshLambertMaterial({color:0xffedcc}),string=new THREE.LineBasicMaterial({color:0xc0d5cf,transparent:true,opacity:.79});
  const ripples=new THREE.RingGeometry(.20,.22,28),rippleInk=new THREE.MeshBasicMaterial({color:0xc0eeee,transparent:true,opacity:.64,side:THREE.DoubleSide,depthWrite:false});
  const handle=new THREE.Vector3(),tip=new THREE.Vector3(),direction=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  function build(){
    const group=new THREE.Group(),rod=new THREE.Mesh(rodShape,rodPaint);
    const float=new THREE.Mesh(cork,red),cap=new THREE.Mesh(tipShape,white);
    cap.position.y=.13;float.scale.set(.72,1,.72);float.add(cap);
    const ring=new THREE.Mesh(ripples,rippleInk);ring.rotation.x=-Math.PI/2;
    const geometry=new THREE.BufferGeometry();
    const linePoints=new THREE.Float32BufferAttribute(new Float32Array(9*3),3);
    geometry.setAttribute('position',linePoints.setUsage(THREE.DynamicDrawUsage));
    const line=new THREE.Line(geometry,string);line.frustumCulled=false;
    group.add(rod,float,ring,line);scene.add(group);
    return {group,rod,float,ring,linePoints,geometry};
  }
  return (people,viewer,tick)=>{
    for(const rig of rigs.values())rig.seen=false;
    for(const p of people){
      const f=p.fishing;
      const landing=f?.phase==='landed' && tick-f.landed<42;
      if((!activeCast(f) && !landing) || (p.x-viewer.x)**2+(p.z-viewer.z)**2>38**2)continue;
      let rig=rigs.get(p.id);if(!rig){rig=build();rigs.set(p.id,rig);}
      rig.seen=true;
      if(landing){
        if(!rig.catch){
          if(!caughtShapes.has(f.species))caughtShapes.set(f.species,fishGeometry(f.species,fishSpecies[f.species]));
          rig.catch=new THREE.Mesh(caughtShapes.get(f.species),scales);rig.group.add(rig.catch);
        }
        const t=Math.min(1,Math.max(0,(tick-f.landed)/29));
        rig.catch.position.set(p.x+(f.x-p.x)*.50*(1-t)+.26,THREE.MathUtils.lerp(waterY,p.y+.14,t)+Math.sin(t*Math.PI)*1.18,p.z+(f.z-p.z)*.50*(1-t));
        rig.catch.rotation.set(0,t*2+.45,1.1*Math.sin(t*11));
        rig.rod.visible=rig.ring.visible=rig.float.visible=false;
        rig.linePoints.array.fill(0);rig.linePoints.needsUpdate=true;
        continue;
      }
      if(rig.catch){rig.group.remove(rig.catch);rig.catch=null;rig.rod.visible=rig.float.visible=true;}
      const elapsed=(tick-f.cast)/30,cast=Math.min(1,Math.max(0,elapsed/.5));
      const dx=f.x-p.x,dz=f.z-p.z,len=Math.hypot(dx,dz)||1;
      handle.set(p.x+.20*dx/len,p.y+1.05,p.z+.20*dz/len);
      tip.set(handle.x+1.12*dx/len,handle.y+.53+Math.sin(elapsed*4)*.04+(1-cast)*.60,handle.z+1.12*dz/len);
      direction.subVectors(tip,handle);rig.rod.position.copy(handle).lerp(tip,.5);
      rig.rod.scale.y=direction.length();rig.rod.quaternion.setFromUnitVectors(up,direction.normalize());
      const bite=f.phase==='bite',pullBack=1-.21*f.pulls;
      const x=THREE.MathUtils.lerp(tip.x,p.x+dx*pullBack,cast),z=THREE.MathUtils.lerp(tip.z,p.z+dz*pullBack,cast);
      const y=THREE.MathUtils.lerp(tip.y,waterY+(bite?-.03:.07)+Math.sin(elapsed*(bite?16:3))*(bite?.12:.035),cast)+Math.sin(cast*Math.PI)*1.4;
      rig.float.position.set(x,y,z);
      rig.ring.visible=cast>=1;rig.ring.position.set(x,waterY+.095,z);rig.ring.scale.setScalar(1+(bite?2.5:1)*(.5+.5*Math.sin(elapsed*(bite?9:3))));
      for(let j=0;j<9;j++){
        const t=j/8;
        rig.linePoints.setXYZ(j,THREE.MathUtils.lerp(tip.x,x,t),THREE.MathUtils.lerp(tip.y,y,t)-Math.sin(t*Math.PI)*.13,THREE.MathUtils.lerp(tip.z,z,t));
      }
      rig.linePoints.needsUpdate=true;
    }
    for(const [id,rig] of rigs)if(!rig.seen){scene.remove(rig.group);rig.geometry.dispose();rigs.delete(id);}
  };
}
