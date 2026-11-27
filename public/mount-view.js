import {equipmentFinish,equipmentPlate} from './equipment-finish.js';
import * as THREE from 'three';
import { mounts, mountPosition } from './mounts.js';
import {isJetKind,isHelicopterKind} from './aircraft-fleet.js';

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
  if(isHelicopterKind(kind)){
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
  } else if(isJetKind(kind)){
    for(const sign of [-1,1]){
      const flank=side*sign;
      batch.add(bracket,0x63717a,flank,.80,-.04,.10,.20,.69,-.13);
      batch.add(bracket,0x424d51,flank,.68,-.19,.14,.067,.89);
      missileModel(batch,flank,.55,-.23,.73);
    }
  } else {
    const sleeve=new THREE.CylinderGeometry(.098,.098,.75,10);
    const tip=new THREE.ConeGeometry(.073,.19,10);
    for(const x of [-side,side]) {
      batch.add(bracket,0x444d49,x*.88,y+.07,z+.33,.25,.09,.32);
      batch.add(sleeve,0x465952,x,y,z+.33,1,1,1,-Math.PI/2);
      batch.add(tip,0x9b9d89,x,y,z-.096,1,1,1,-Math.PI/2);
      for(const dz of [.13,.51]){
        batch.add(bracket,0x747768,x,y+.061,z+dz,.22,.044,.067);
        batch.add(bracket,0x555f52,x,y-.065,z+dz,.20,.069,.079);
      }
      batch.add(bracket,0xb5b39c,x,y+.094,z+.24,.071,.009,.072);
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
        mesh.scale.setScalar(m.bomb || isHelicopterKind(m.source) ? 1 : .65);
        mesh.rotation.set(m.pitch ?? 0,-m.yaw,0,'YXZ');
      }
      mesh.position.lerp(target,1-Math.exp(-dt*35));
      if(m.bomb)mesh.rotation.set(m.pitch,-m.yaw,0,'YXZ');
      else onMissileMove?.(m,mesh.position);
    }
    for(const [id,mesh] of live) if(!ids.has(id)){scene.remove(mesh);live.delete(id);}
  };
}

function shroud(batch,color,rings){
  const verts=[],indices=[];
  for(const [z,y,w,h] of rings){
    for(const [x,dy] of [[-.74,-1],[.74,-1],[1,-.63],[1,.58],[.69,1],[-.69,1],[-1,.58],[-1,-.63]])
      verts.push(x*w,y+dy*h,z);
  }
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<8;i++){
    const a=8*r+i,b=8*r+(i+1)%8;
    indices.push(a,b,a+8,b,b+8,a+8);
  }
  const last=8*(rings.length-1);
  for(let i=1;i<7;i++)indices.push(0,i+1,i,last,last+i,last+i+1);
  const shape=new THREE.BufferGeometry();
  shape.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  shape.setIndex(indices);shape.computeVertexNormals();batch.add(shape,color,0,0,0);shape.dispose();
}

// A pedestal and a separate swivel keep the handles and barrel on the same axes.
export function turretView(scene,kind,Batch,material) {
  const base=new THREE.Group(), swivel=new THREE.Group(), cradle=new THREE.Group();
  scene.add(base);base.add(swivel);swivel.add(cradle);
  const metal=new Batch(true), stand=new Batch(true), box=new THREE.BoxGeometry(1,1,1);
  const cylinder=new THREE.CylinderGeometry(1,1,1,12);
  const marine=kind==='boat'||kind==='superyacht',helicopter=isHelicopterKind(kind);
  const coating=marine?0x616b6a:helicopter?0x4c544e:0x595c4c;
  const rim=marine?0x929798:0x767970;
  if(['rover','rover2','rover3','superyacht'].includes(kind)){
    stand.add(cylinder,0x525b53,0,-.62,0,.093,1.24,.093);
    stand.add(cylinder,0x53574d,0,-1.22,0,.22,.052,.22);
  } else stand.add(cylinder,0x53574d,0,.085,0,.22,.18,.22);
  stand.add(cylinder,0x4c554c,0,-.014,0,.157,.13,.157);
  shroud(metal,coating,[[-.32,.048,.063,.052],[-.238,.043,.108,.086],[.071,.036,.113,.091],[.129,.023,.088,.065]]);
  metal.add(cylinder,0x444e4b,0,.026,-.36,.066,.33,.066,Math.PI/2);
  metal.add(cylinder,0x303b39,0,.026,-.55,.032,.29,.032,Math.PI/2);
  metal.add(box,0x82947b,-.153,-.012,-.012,.11,.13,.16);
  shroud(metal,marine?0x818984:0x797b6a,[[-.279,.083,.071,.029],[-.199,.108,.093,.040],[.049,.105,.100,.035],[.093,.088,.073,.014]]);
  const sights=new THREE.TorusGeometry(.033,.006,5,20);
  metal.add(sights,0x444b45,0,.184,.037);
  metal.add(box,0x5e6658,0,.150,.037,.022,.043,.031);
  metal.add(box,0x777c6e,0,.111,-.44,.009,.061,.014);
  sights.dispose();
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
  // All trim is baked into the existing pedestal and cradle draw calls.
  const cast=new THREE.SphereGeometry(1,16,10);
  for(const side of [-1,1]){
    stand.beam(coating,[side*.140,-.20,.055],[side*.139,.10,-.045],.059,.095);
    stand.add(cylinder,rim,side*.155,.005,.026,.055,.027,.055,0,0,Math.PI/2);
    metal.add(box,0x51564f,side*.101,.024,-.090,.035,.116,.262);
    metal.add(box,rim,side*.120,.080,-.070,.012,.017,.204);
    equipmentPlate(metal,marine?4:5,side,side*.123,.050,-.133,.136,.042);
    for(const z of [-.152,.019])metal.add(cylinder,0x77796d,side*.124,.013,z,.012,.009,.012,0,0,Math.PI/2);
    metal.add(box,0x343a38,side*.163,-.069,.197,.044,.128,.059,-.08);
  }
  if(['rover','rover2','rover3'].includes(kind)){
    stand.add(cylinder,0x5b5d50,0,-1.13,0,.245,.10,.245);
    for(const side of [-1,1])stand.beam(0x505747,[side*.235,-1.17,.13],[side*.062,-.78,.03],.044);
    shroud(metal,0x6e725a,[[-.211,-.025,.065,.059],[-.157,-.014,.087,.078],[.060,-.019,.085,.071]]);
    metal.add(cast,0x565d4a,-.183,-.060,-.02,.112,.11,.136);
    metal.add(box,0x636955,-.193,.057,-.017,.173,.034,.237);
    metal.add(box,0x373a34,-.267,.013,-.043,.032,.049,.047);
  }else if(helicopter){
    // A compact chin fairing moves with the visual gimbal below the airframe.
    stand.add(cast,coating,0,.09,-.035,.225,.184,.214);
    metal.add(cast,0x60665a,0,-.045,-.085,.173,.132,.239);
    metal.add(cylinder,0x353d38,.132,-.062,-.196,.066,.056,.066,Math.PI/2);
    metal.add(cast,0x627b74,.131,-.061,-.231,.043,.043,.011);
  }else if(kind==='boat'){
    stand.add(cylinder,0x8b9491,0,-.075,0,.156,.16,.156);
    metal.add(box,0x697470,-.18,-.062,-.005,.157,.148,.215);
    metal.add(box,0x85908b,-.18,.020,-.005,.174,.025,.23);
    for(const side of [-1,1])metal.beam(0x7e8885,[side*.116,.07,.046],[side*.14,.158,.025],.014);
  }else if(kind==='superyacht'){
    shroud(metal,0x5f6b6a,[[-.405,.119,.137,.088],[-.259,.148,.194,.130],[.085,.155,.179,.132],[.191,.122,.131,.084]]);
    metal.add(cylinder,0x414a4c,0,.04,-.80,.047,.54,.047,Math.PI/2);
    for(const side of [-1,1]){
      metal.add(box,0x738080,side*.255,.095,-.170,.255,.406,.068,-.16,side*.22,side*.04);
      metal.beam(0x949f9c,[side*.137,.242,-.218],[side*.356,.260,-.157],.027);
      metal.beam(0x505e5e,[side*.22,-.04,-.155],[side*.107,.032,.085],.029);
    }
    metal.add(box,0x536264,-.133,.286,-.087,.109,.072,.136);
    metal.add(box,0x293239,-.133,.285,-.164,.089,.049,.013);
    stand.add(cylinder,0x84908a,0,-1.15,0,.268,.11,.268);
    for(const side of [-1,1])stand.beam(0x727f79,[side*.212,-1.11,.062],[side*.060,-.78,.005],.05);
  }
  if(!helicopter){
    const lead=new THREE.CatmullRomCurve3([
      new THREE.Vector3(-.12,.110,-.09),new THREE.Vector3(-.23,.104,-.13),
      new THREE.Vector3(-.28,-.003,-.085),new THREE.Vector3(-.21,-.04,-.041)]);
    const sleeve=new THREE.TubeGeometry(lead,10,.027,6,false);
    metal.add(sleeve,marine?0x535e5c:0x66644e,0,0,0);sleeve.dispose();
    stand.add(cylinder,rim,0,-.226,.012,.134,.034,.134);
  }
  cast.dispose();
  stand.mesh(base,equipmentFinish(),false);metal.mesh(cradle,equipmentFinish(),false);
  box.dispose();cylinder.dispose();
  const offset=mounts[kind].turret;
  const aim=new THREE.Quaternion(),desired=new THREE.Euler(0,0,0,'YXZ');
  return (v,visible=true)=>{
    const pivot=mountPosition(v,offset);
    base.position.set(pivot.x,pivot.y,pivot.z);
    base.visible=visible && !v.wrecked;
    if(['rover','rover2','rover3','boat','superyacht'].includes(kind)) {
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
