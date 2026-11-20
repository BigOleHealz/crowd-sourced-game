import {harborUpperWindows} from './harbor-key-structures.js';
import {paneKey} from './pane-damage.js';
export const hasApartmentBalconies=facade=>facade===0 || facade===3;
export const guardHeight=1.07;
export function chamferedOutline(x,z,cut){
  return [[-x+cut,-z],[x-cut,-z],[x,-z+cut],[x,z-cut],[x-cut,z],[-x+cut,z],[-x,z-cut],[-x,-z+cut]];
}
export function towerStories(b,podium){
  const floors=Math.max(1,Math.round((b.eave-podium)/(b.facade===0?3.32:3.14)));
  return {floors,story:(b.eave-podium)/floors};
}
export function towerBays(length,wrap){
  const bays=Math.max(2,Math.round(length/(wrap?4.2:3.65)));
  return {bays,bay:length/bays,pier:wrap?.66:.98};
}
export function railGeometry(ax,az,bx,bz){
  const dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz);
  const bays=Math.ceil(length/1.55);
  return {dx,dz,length,yaw:Math.atan2(-dz,dx),bays,span:length/bays};
}
// Broad phase uses plan bounds and story bands so distant floors never enter
// a weapon sweep. A recessed pane claims its opening at the solid facade edge.
export function towerGlassIndex(buildings){
  const towers=[];
  for(const b of buildings){
    if(b.finish && b.rise){
      const start=4.7;
      towers.push({b,start,story:b.eave+b.rise,levels:[harborUpperWindows(b,start)]});
      continue;
    }
    if(!b.housing || !hasApartmentBalconies(b.facade))continue;
    const wrap=b.facade===0,start=4.7,{floors,story}=towerStories(b,3.9),levels=[];
    const outline=chamferedOutline(b.w/2+1.35,b.d/2+1.35,.60);
    for(let floor=0;floor<floors;floor++){
      const level=start+floor*story,panes=[];
      function add(x,z,width,bottom,top,yaw,push=0){
        const id=paneKey(x,(bottom+top)/2,z);
        panes.push({id,x,z,bottom,top,width,yaw,at:{x:x+push*Math.sin(yaw),y:bottom,z:z+push*Math.cos(yaw)}});
      }
      if(wrap)outline.forEach(([ax,az],i)=>{
        const [bx,bz]=outline[(i+1)%outline.length];
        const {dx,dz,yaw,bays,span}=railGeometry(ax,az,bx,bz);
        for(let n=0;n<bays;n++){
          const t=(n+.5)/bays;
          add(b.x+ax+t*dx,b.z+az+t*dz,span-.039,level+.04+.12,level+.04+guardHeight,yaw);
        }
      });
      for(let side=0;side<4;side++){
        const yaw=side*Math.PI/2,c=Math.cos(yaw),s=Math.sin(yaw);
        const length=side%2?b.d:b.w,edge=(side%2?b.w:b.d)/2;
        const {bays,bay,pier}=towerBays(length,wrap);
        for(let j=0;j<bays;j++){
          const u=-length/2+(j+.5)*bay;
          add(b.x+c*u+s*(edge-.375), b.z-s*u+c*(edge-.375),
            bay-pier,level+.12,level+Math.min(2.61,story-.36),yaw,.39);
        }
      }
      levels.push(panes);
    }
    towers.push({b,start,story,levels});
  }
  return towers;
}
export function visitTowerGlass(towers,from,d,broken,box,visit){
  const lo=Math.min(from.y,from.y+d.y),hi=Math.max(from.y,from.y+d.y);
  if(hi<4.7)return;
  for(const {b,start,story,levels} of towers){
    if(Math.abs(from.x-b.x)>b.w/2+1.5+Math.abs(d.x) ||
       Math.abs(from.z-b.z)>b.d/2+1.5+Math.abs(d.z))continue;
    const last=Math.min(levels.length-1,Math.floor((hi-start)/story));
    for(let i=Math.max(0,Math.floor((lo-start)/story));i<=last;i++){
      for(const p of levels[i]){
        if(broken?.[p.id] || hi<p.bottom || lo>p.top)continue;
        const t=box(from,d,p.at,p.width,p.top-p.bottom,.035,-p.yaw);
        if(t!==Infinity)visit(t,p);
      }
    }
  }
}
