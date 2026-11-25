import {officeWindows} from './office-windows.js';
import {harborUpperWindows} from './harbor-key-structures.js';
import {paneKey} from './pane-damage.js';
import {paneSupportLost} from './glass-support.js';
export const hasApartmentBalconies=facade=>facade===0 || facade===3;
export const guardHeight=1.07;
// The north hotel's west and east rooms share a clear balcony doorway.
export function hotelBalconyDoor(b,side,along){
  return b.towerId===9 && (side===1 || side===3) && Math.abs(along-(side===1?2:-2))<1.67;
}
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
    if(b.housing && b.facade===1){
      const levels=[];
      for(const p of officeWindows(b)){
        (levels[p.floor]??=[]).push({...p,facade:true,office:true,axis:p.side%2?'x':'z',side:p.side<2?1:-1});
      }
      towers.push({b,start:4.70,story:levels[0][0].story,levels});
      continue;
    }
    if(!b.housing || !hasApartmentBalconies(b.facade))continue;
    const wrap=b.facade===0,start=4.7,{floors,story}=towerStories(b,3.9),levels=[];
    const outline=chamferedOutline(b.w/2+1.35,b.d/2+1.35,.60);
    for(let floor=0;floor<floors;floor++){
      const level=start+floor*story,panes=[];
      function add(x,z,width,bottom,top,yaw,push=0){
        const id=paneKey(x,(bottom+top)/2,z);
        const axis=Math.abs(Math.sin(yaw))>.5?'x':'z';
        panes.push({id,x,z,bottom,top,width,yaw,facade:push!==0,axis,side:Math.sign(axis==='x'?x-b.x:z-b.z),at:{x:x+push*Math.sin(yaw),y:bottom,z:z+push*Math.cos(yaw)}});
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
          if(hotelBalconyDoor(b,side,u))continue;
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
export function visitTowerGlass(towers,from,d,doors,box,visit){
  const lo=Math.min(from.y,from.y+d.y),hi=Math.max(from.y,from.y+d.y);
  if(hi<4.7)return;
  for(const {b,start,story,levels} of towers){
    if(Math.abs(from.x-b.x)>b.w/2+1.5+Math.abs(d.x) ||
       Math.abs(from.z-b.z)>b.d/2+1.5+Math.abs(d.z))continue;
    const last=Math.min(levels.length-1,Math.floor((hi-start)/story));
    for(let i=Math.max(0,Math.floor((lo-start)/story));i<=last;i++){
      for(const p of levels[i]){
        if(doors?.brokenPanes?.[p.id] || hi<p.bottom || lo>p.top || paneSupportLost(p,doors,b))continue;
        const t=box(from,d,p.at,p.width,p.top-p.bottom,.035,-p.yaw);
        if(t!==Infinity)visit(t,p);
      }
    }
  }
}

// Glazing is swept separately. Below the roof an empty upper room is air;
// the facade only stops a round on masonry, sills or surviving frame members.
const shellCache=new WeakMap();
export function upperShellTop(b,x,z,y,roof){
  if(y<4.7 || !(b.finish && b.rise || b.housing && (b.facade===1 || hasApartmentBalconies(b.facade))))return;
  if(y>=roof-.13)return roof;
  let tower=shellCache.get(b);
  if(!tower){[tower]=towerGlassIndex([b]);shellCache.set(b,tower);}
  const row=Math.floor((y-tower.start)/tower.story);
  const level=tower.start+row*tower.story;
  if(b.towerId===9 && Math.abs(Math.abs(x-b.x)-b.w/2)<.55 &&
    Math.abs(z-(b.z-2))<1.67 && y>level+.11 && y<level+Math.min(2.61,tower.story-.36))return -Infinity;
  if(y-level<.12 || (!b.finish && tower.story-(y-level)<.16))return roof;
  const dx=x-b.x,dz=z-b.z,nearX=b.w/2-Math.abs(dx),nearZ=b.d/2-Math.abs(dz);
  if(Math.min(nearX,nearZ)>(b.finish ? .22 : .43))return -Infinity;
  const axis=nearX<nearZ?'x':'z',side=Math.sign(axis==='x'?dx:dz);
  const panes=tower.levels[b.finish?0:row]??[];
  for(const p of panes){
    if(b.finish?(p.axis!==axis || p.side!==side):(!p.facade || p.axis!==axis || p.side!==side))continue;
    const along=Math.abs(axis==='x'?z-p.z:x-p.x);
    if(y<=p.bottom || y>=p.top || along>=p.width/2)continue;
    if(p.office)return -Infinity;
    const frame=b.finish ? .018 : .0345;
    if(along<frame || along>p.width/2-frame || y<p.bottom+frame || y>p.top-frame ||
      (b.finish && Math.abs(y-p.y)<.017))return roof;
    return -Infinity;
  }
  return roof;
}
