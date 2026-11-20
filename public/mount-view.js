import * as THREE from 'three';
import { mounts, mountPosition } from './mounts.js';

// Game-space art shares one silhouette between the parked stores and the moving model.
function missileModel(batch,x,y,z,scale=1) {
  const tube=(profile,tint)=>{
    const geo=new THREE.LatheGeometry(profile.map(([r,along])=>new THREE.Vector2(r,-along)),16);
    geo.rotateX(-Math.PI/2);
    batch.add(geo,tint,x,y,z,scale);
    geo.dispose();
  };
  tube([[.125,.79],[.143,.67],[.143,-.46],[.126,-.60]],0xc4c5b1);
  tube([[.126,-.60],[.112,-.69],[.081,-.79],[.046,-.86],[.010,-.90],[0,-.902]],0x536561);
  tube([[.145,-.36],[.145,-.45]],0xd39746);
  tube([[.146,.48],[.146,.45]],0x586761);
  tube([[.146,.74],[.146,.65]],0x4b5853);
  tube([[.078,.797],[.126,.797],[.127,.78]],0x8d9487);
  tube([[0,.770],[.078,.770],[.078,.797]],0x333e3b);
  const fin=new THREE.Shape();
  fin.moveTo(.22,.105);fin.lineTo(.54,.31);fin.lineTo(.72,.31);fin.lineTo(.71,.105);fin.closePath();
  const plate=new THREE.ExtrudeGeometry(fin,{depth:.025,bevelEnabled:false});
  plate.translate(0,0,-.0125);plate.rotateY(-Math.PI/2);
  for(let i=0;i<4;i++) batch.add(plate,0x69786c,x,y,z,scale,scale,scale,0,0,Math.PI*(.25+i*.5));
  plate.dispose();
}

export function missileLaunchers(batch,kind) {
  const [side,y,z]=mounts[kind].launcher;
  const bracket=new THREE.BoxGeometry(1,1,1);
  if(kind==='heli'){
    for(const sign of [-1,1]){
      // A swept, bevelled shelf extends from the cabin skin. The lighter cap
      // and dark underslung shoe keep the wing and store distinct at flight distance.
      const outline=[[.76,-.90],[1.12,-.84],[2.30,-.40],[2.30,.24],[.79,.47]];
      const shape=new THREE.Shape(outline.map(([x,z])=>new THREE.Vector2(sign*x,-z)));
      const wing=new THREE.ExtrudeGeometry(shape,{depth:.095,bevelEnabled:true,bevelThickness:.023,bevelSize:.028,bevelSegments:1});
      wing.rotateX(-Math.PI/2);
      batch.add(wing,0x69725f,0,1.25,0);wing.dispose();
      batch.add(bracket,0x8b927e,sign*2.30,1.298,-.078,.050,.109,.65);
      batch.add(bracket,0x46534c,sign*side,1.17,-.12,.135,.22,.57);
      batch.add(bracket,0x7b8274,sign*side,1.035,-.18,.21,.067,1.04);
      missileModel(batch,sign*side,y,z);
    }
  } else {
    const sleeve=new THREE.CylinderGeometry(.098,.098,.75,10);
    const tip=new THREE.ConeGeometry(.073,.19,10);
    for(const x of [-side,side]) {
      batch.add(bracket,0x444d49,x*.88,y+.07,z+.33,.25,.09,.32);
      batch.add(sleeve,0x465952,x,y,z+.33,1,1,1,-Math.PI/2);
      batch.add(tip,0xc8ab6b,x,y,z-.096,1,1,1,-Math.PI/2);
    }
    tip.dispose();sleeve.dispose();
  }
  bracket.dispose();
}

export function missileView(scene,Batch,onMissileMove) {
  const model=new Batch();
  missileModel(model,0,0,0);
  const finish=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:.22});
  const template=model.mesh(new THREE.Group(),finish,false);
  const casing=new THREE.SphereGeometry(1,12,10);
  casing.scale(.27,.27,.66);
  const bombTemplate=new THREE.Mesh(casing,new THREE.MeshStandardMaterial({color:0x596347,roughness:.8}));
  const live=new Map(), target=new THREE.Vector3();
  return (missiles,dt)=>{
    const ids=new Set();
    for(const m of missiles) {
      ids.add(m.id);
      target.set(m.x,m.y,m.z);
      let mesh=live.get(m.id);
      if(!mesh) {
        mesh=(m.bomb?bombTemplate:template).clone();live.set(m.id,mesh);scene.add(mesh);
        mesh.position.copy(target);
        mesh.scale.setScalar(m.bomb || m.source==='heli' ? 1 : .65);
        mesh.rotation.set(m.pitch ?? 0,-m.yaw,0,'YXZ');
      }
      mesh.position.lerp(target,1-Math.exp(-dt*35));
      if(m.bomb)mesh.rotation.set(m.pitch,-m.yaw,0,'YXZ');
      else onMissileMove?.(m,mesh.position);
    }
    for(const [id,mesh] of live) if(!ids.has(id)){scene.remove(mesh);live.delete(id);}
  };
}

// A pedestal and a separate swivel keep the handles and barrel on the same axes.
export function turretView(scene,kind,Batch,material) {
  const base=new THREE.Group(), swivel=new THREE.Group(), cradle=new THREE.Group();
  scene.add(base);base.add(swivel);swivel.add(cradle);
  const metal=new Batch(), stand=new Batch(), box=new THREE.BoxGeometry(1,1,1);
  const cylinder=new THREE.CylinderGeometry(1,1,1,12);
  if(kind==='rover' || kind==='superyacht'){
    stand.add(cylinder,0x525b53,0,-.62,0,.093,1.24,.093);
    stand.add(cylinder,0x53574d,0,-1.22,0,.22,.052,.22);
  } else stand.add(cylinder,0x53574d,0,.085,0,.22,.18,.22);
  stand.add(cylinder,0x4c554c,0,-.014,0,.157,.13,.157);
  metal.add(box,0x49534e,0,.006,-.06,.212,.182,.37);
  metal.add(cylinder,0x444e4b,0,.026,-.36,.066,.33,.066,Math.PI/2);
  metal.add(cylinder,0x303b39,0,.026,-.55,.032,.29,.032,Math.PI/2);
  metal.add(box,0x82947b,-.153,-.012,-.012,.11,.13,.16);
  metal.add(box,0x626861,0,.112,-.071,.177,.045,.298);
  for(let j=0;j<5;j++){
    metal.add(box,0x535b55,0,.026,-.28-.042*j,.115,.110,.018);
    metal.add(box,0x999079,-.123,-.028,.038-.024*j,.036,.028,.015);
  }
  metal.add(cylinder,0x49504b,0,.026,-.673,.043,.064,.043,Math.PI/2);
  metal.add(box,0x434a42,-.167,.06,-.008,.125,.022,.18);
  for(const side of [-1,1]){
    metal.beam(0x49524d,[side*.073,0,.095],[side*.177,-.004,.19],.038);
    metal.add(cylinder,0x423c33,side*.177,-.062,.19,.032,.13,.032);
  }
  if(kind==='superyacht'){
    metal.add(box,0x455763,0,.15,-.04,.31,.22,.38);
    metal.add(cylinder,0x34434a,0,.04,-.80,.047,.54,.047,Math.PI/2);
    for(const side of [-1,1])metal.add(box,0x60727c,side*.29,.10,-.18,.30,.48,.075,0,side*.13);
  }
  stand.mesh(base,material,false);metal.mesh(cradle,material,false);
  box.dispose();cylinder.dispose();
  const offset=mounts[kind].turret;
  const aim=new THREE.Quaternion(),desired=new THREE.Euler(0,0,0,'YXZ');
  return v=>{
    const pivot=mountPosition(v,offset);
    base.position.set(pivot.x,pivot.y,pivot.z);
    base.visible=!v.wrecked;
    if(kind==='rover'||kind==='boat'||kind==='superyacht') {
      const deck=kind==='boat'?v:v.suspension;
      base.rotation.set(deck?.pitch ?? 0,-v.yaw,deck?.roll ?? 0,'YXZ');
      // Keep the pedestal on the deck and the occupied barrel on its world aim.
      if(v.gunner==null) swivel.quaternion.identity();
      else {
        aim.setFromEuler(desired.set(0,-v.turretYaw,0,'YXZ'));
        swivel.quaternion.copy(base.quaternion).invert().multiply(aim);
      }
    } else swivel.rotation.y=-(v.gunner==null ? v.yaw : v.turretYaw);
    cradle.rotation.x=v.gunner==null ? (v.pitch ?? 0) : v.turretPitch;
  };
}
