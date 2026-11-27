import * as THREE from 'three';
import {outsideWell} from './residential-spirals.js';
import {paneBatch} from './pane-damage-view.js';
import {towerGlassIndex} from './tower-glass.js';
import {glassSupportKey} from './glass-support.js';
import {towerStride} from './tower-damage.js';

// Keep room volumes behind the glass when the detailed local floor is streamed out.
// Use the same floor plans and furniture positions as walking collision.
export function windowRoomView(scene,Batch,plans){
  const cube=new THREE.BoxGeometry(),material=new THREE.MeshLambertMaterial({vertexColors:true});
  const shade=new THREE.CylinderGeometry(.33,.5,1,8),foliage=new THREE.IcosahedronGeometry(.5);
  const floors=new Map(),opaqueBuildings=[];
  for(const p of plans){
    if(!p.levels.length || !(p.b.housing || p.b.finish))continue;
    const batch=new Batch(),ranges=paneBatch(batch);
    const box=(color,x,y,z,w,h,d,yaw=0)=>batch.add(cube,color,x,y,z,w,h,d,0,yaw);
    for(const l of p.levels)ranges.add(l.n,()=>{
      const {y,height,residential}=l,profile=residential?.profile;
      const footprint={x:p.x,z:p.z,w:p.w-.40,d:p.d-.40};
      for(const r of outsideWell(footprint,p.stair??p.shaft)){
        box(profile?.timber??0xb39875,r.x,y-.04,r.z,r.w,.08,r.d);
        box(0xe2d7c3,r.x,y-.10,r.z,r.w,.04,r.d);
      }
      // Every next slab also serves as the ceiling of the storey below.
      if(l===p.levels.at(-1))box(0xe4d9c4,p.x,y+height-.08,p.z,footprint.w,.14,footprint.d);
      for(const q of l.parts)box(q.color,q.x,q.bottom+q.h/2,q.z,q.w,q.h,q.d);
      if(!residential)for(const room of l.rooms){
        const finishRise=p.b.facade===0?.045:0;
        box(0xb39773,room.x,y+finishRise+.011,room.z,room.w*.73,.017,room.d*.69);
        box(0xf2deb1,room.x,y+height-.17,room.z,.55,.035,.30);
      }
      for(const f of residential?.furnishings??[]){
        const {kind,x,z,w,h,d,yaw}=f,c=Math.cos(yaw),s=Math.sin(yaw);
        const part=(color,u,dy,v,width,tall,depth)=>
          box(color,x+c*u+s*v,f.y+dy,z-s*u+c*v,width,tall,depth,yaw);
        const {timber,cloth,accent,stone,trim,rug}=profile;
        if(kind==='sofa' || kind==='chair'){
          part(timber,0,.20,0,w*.87,.27,d*.82);
          part(cloth,0,.42,0,w,.22,d);
          part(accent,0,(h+.47)/2,-d*.38,w,h-.47,d*.22);
        }else if(kind==='bed'){
          part(timber,0,.21,0,w,.29,d);
          part(cloth,0,.48,0,w,.25,d);
          part(accent,0,h/2,-d*.46,w,h,.12);
          part(accent,0,.62,d*.28,w,.04,d*.33);
          part(stone,0,.65,-d*.29,w*.78,.12,d*.21);
        }else if(['dining','coffee','desk'].includes(kind)){
          part(timber,0,h*.44,0,w*.42,h*.88,d*.48);
          part(stone,0,h-.045,0,w,.09,d);
          part(accent,w*.21,h+.055,0,w*.20,.11,d*.35);
        }else if(['nightstand','credenza','books'].includes(kind)){
          part(timber,0,h/2,0,w,h,d);
          for(const fraction of [.42,.81])part(trim,0,h*fraction,d*.49,w*.94,.034,.035);
        }else if(kind==='plant'){
          part(stone,0,h*.17,0,w*.72,h*.34,d*.72);
          batch.add(foliage,0x627c53,x,f.y+h*.67,z,w,h*.67,d);
        }else if(kind==='art'){
          part(trim,0,h*.50,0,w,h,d);
          part(accent,0,h*.51,d*.55,w*.85,h*.77,.016);
        }else if(kind==='pendant'){
          part(trim,0,h*.75,0,.035,h*.50,.035);
          batch.add(shade,stone,x,f.y+h*.32,z,w,h*.53,d);
        }else if(kind==='rug'){
          part(rug,0,h*.50,0,w,h,d);
        }
      }
    });
    // The two small gable panes look into the roof space above the upper flat.
    if(p.b.finish && p.b.rise){
      const y=p.b.base+p.b.eave,rise=p.b.rise;
      box(0xad8b65,p.x,y+.015,p.z,p.w-.25,.07,p.d-.36);
      for(const side of [-1,1]){
        box(0x8f7256,p.x+side*p.w*.18,y+rise*.31,p.z,.13,rise*.62,p.d*.32);
        box(0xac8761,p.x+side*p.w*.29,y+.24,p.z+.47,.79,.48,.64);
      }
    }
    const mesh=batch.mesh(scene,material,false);
    mesh.name=p.name+' · window rooms';mesh.userData.interiorFixtures=true;
    mesh.userData.breachInterior=true;
    const show=ranges.bind(mesh);
    for(const l of p.levels)floors.set(l,show);
    if(p.b.facade!==1){
      // Apartment and gable panes have an opaque finish. Draw their real
      // rooms only when a sheet or structural bay exposes them to the street.
      const [tower]=towerGlassIndex([p.b]);
      const panes=tower.levels.flat().filter(pane=>p.home || pane.facade);
      mesh.visible=false;
      opaqueBuildings.push({mesh,p,panes});
    }
  }
  cube.dispose();shade.dispose();foliage.dispose();
  let previous,damageKey;
  return (level,doors)=>{
    const key=(doors?.glassSeq??0)+'|'+glassSupportKey(doors);
    if(damageKey!==key){
      damageKey=key;
      for(const {mesh,p,panes} of opaqueBuildings){
        const breached=doors?.towerBreaches?.some(id=>Math.floor(id/towerStride)===p.b.towerId);
        const ruined=doors?.houseRuins?.[p.home] || doors?.collapsedTowers?.includes(p.b.towerId);
        mesh.visible=!ruined && !!(breached || doors?.brokenPanes && panes.some(pane=>doors.brokenPanes[pane.id]));
      }
    }
    if(level===previous)return;
    floors.get(previous)?.({});
    // The normal, higher-detail floor now draws at the exact same positions.
    floors.get(level)?.({[level.n]:true});
    previous=level;
  };
}
