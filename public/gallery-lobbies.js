// Ground-floor north/south gallery entries occupy the strip between each
// building's independently furnished east and west commercial tenancies.
import {hotel,hotelDoorTop} from './maravela-hotel.js';
import {fallenTop} from './shop-furniture.js';
import {retailDepths} from './street-shop-layout.js';
import {brickellMap} from './brickell-map.js';

export const galleryFloor=.824, galleryCeiling=3.77, galleryDoorWidth=1.32;
export const galleryDoorHead=3.10, galleryStile=.07;
export const galleryLobbies=[], galleryPanes=[], galleryPlans=[];
const byBuilding=new WeakMap(), cells=new Map(), grid=20;
const cellKey=(x,z)=>(Math.floor(x/grid)+32)*128+Math.floor(z/grid)+32;
const rect=(x,z,w,d,top,bottom=galleryFloor)=>({x,z,w,d,bottom,h:top-bottom});
for(const [index,b] of brickellMap.buildings.entries()){
  const {east,west}=retailDepths(b);
  const w=b.w-east-west,x=b.x+(west-east)/2;
  const plan={index,b,w,x,east,west,hotel:b.x===hotel.x && b.z===hotel.z,ends:[],rooms:[],solids:[],panes:[]};
  galleryPlans.push(plan);byBuilding.set(b,plan);
  const shared=b.d<10;
  const depth=shared ? b.d/2 : Math.min(6.25,b.d/2-.48);
  for(const side of [-1,1]){
    const z=b.z+side*b.d/2;
    const wx=u=>x+side*u,wz=v=>z-side*v;
    const entry={side,z,x,w,depth};
    plan.ends.push(entry);
    const left=x-w/2+.10,right=x+w/2-.10;
    const rear=wz(depth),zmin=shared ? b.z-b.d/2 : Math.min(z,rear),zmax=shared ? b.z+b.d/2 : Math.max(z,rear);
    if(!shared || side<0){
      const room={name:plan.hotel?hotel.name:'Gallery Lobby',index,shared,x,left,right,zmin,zmax,entries:shared ? [b.z-b.d/2,b.z+b.d/2] : [z]};
      plan.rooms.push(room);galleryLobbies.push(room);
      for(let ix=Math.floor(left/grid);ix<=Math.floor(right/grid);ix++)for(let iz=Math.floor(zmin/grid);iz<=Math.floor(zmax/grid);iz++){
        const key=(ix+32)*128+iz+32;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(room);
      }
    }
    function block(kind,u,v,width,d,top,bottom=galleryFloor){
      const obstacle={kind,side,...rect(wx(u),wz(v),width,d,top,bottom)};
      plan.solids.push(obstacle);return obstacle;
    }
    for(const bay of [-1,1]){
      const far=w/2-.21,near=galleryDoorWidth/2+galleryStile;
      const paneWidth=far-near, paneX=x+bay*(near+far)/2;
      const pane={id:'gallery-'+index+'-'+(side<0?'north':'south')+'-'+(bay<0?'west':'east'),
        building:index,side,bay,axis:'x',normal:{x:0,z:side},x:paneX,z:wz(.09),w:paneWidth,d:.032,
        bottom:galleryFloor+.071,h:galleryDoorHead-galleryFloor-.071};
      galleryPanes.push(pane);plan.panes.push(pane);
      block('jamb',bay*(galleryDoorWidth/2+galleryStile/2),.095,galleryStile,.14,galleryCeiling);
      block('return',bay*(w/2-.093),depth/2,.186,depth,galleryCeiling);
      if(!plan.hotel)block('doorLeaf',bay*(galleryDoorWidth/2+.046),.45,.067,.80,galleryDoorHead);
    }
    if(!shared){
      block('rear',0,depth-.073,w,.146,galleryCeiling);
      for(const wing of [-1,1]){
        const width=(w-1.48)/2;
        block('portalReturn',wing*(.74+width/2),depth-.97,width,.21,galleryCeiling);
        block('credenza',wing*(w*.30),depth-1.36,.91,.49,galleryFloor+.75);
      }
    }
    const display=(w/2-.19+galleryDoorWidth/2+galleryStile)/2;
    const seatW=Math.min(1.65,w/2-galleryDoorWidth/2-.29);
    entry.sofa=block('sofa',-display,Math.min(2.06,depth*.57),seatW,.77,galleryFloor+.83);
    entry.table=block('lowTable',-display,.91,seatW*.64,.47,galleryFloor+.37);
    entry.console=block('console',display,1.45,seatW*.81,.57,galleryFloor+.87);
    for(const [part,height] of [[entry.sofa,.85],[entry.table,.408],[entry.console,1.142]]){
      const id='gallery-'+index+'-'+(side<0?'north':'south')+'-'+part.kind;
      part.piece={id,x:part.x,z:part.z,w:part.w,d:part.d,height,floor:galleryFloor,room:[left,right,zmin,zmax]};
    }
    entry.shelf=block('shelf',w/2-.245,Math.min(depth*.64,3.98),.35,Math.min(1.62,depth*.34),galleryFloor+1.91);
  }
  if(plan.hotel){
    for(const [k,p,h] of [['reception',hotel.desk,1.30],['luggage',hotel.cart,1.61]]){
      plan.solids.push({kind:k,...rect(p.x,p.z,p.w,p.d,galleryFloor+h)});
    }
  }
  if(!shared)plan.solids.push({kind:'core',...rect(x,b.z,w,b.d-2*depth,galleryCeiling)});
}

export function galleryRoomAt(x,y,z) {
  if(y<.50 || y>=galleryCeiling)return null;
  for(const room of cells.get(cellKey(x,z))??[])if(x>=room.left && x<=room.right && z>=room.zmin && z<=room.zmax)return room;
  return null;
}
export function galleryEntryDepth(room,z) {return Math.min(Math.abs(z-room.entries[0]),Math.abs(z-room.entries.at(-1)));}

export function galleryVehicleRects(building,doors) {
  const p=byBuilding.get(building);
  return p ? [...p.solids.filter(part=>!part.piece || !doors?.furniture?.[part.piece.id]),...p.panes.filter(pane=>!doors?.brokenPanes?.[pane.id])] : [];
}

// Undefined delegates unopened building areas to the existing tower or café collision.
export function galleryTopAt(b,x,z,padding,probe,roof,doors) {
  const plan=byBuilding.get(b);
  if(!plan || Math.abs(x-plan.x)>plan.w/2+.001 || probe>galleryCeiling+.002)return undefined;
  const room=plan.rooms.find(r=>z>=r.zmin-padding && z<=r.zmax+padding);
  if(!room)return undefined;
  const overlaps=o=>Math.abs(o.x-x)<=o.w/2+padding && Math.abs(o.z-z)<=o.d/2+padding;
  let top=plan.hotel ? hotelDoorTop(x,z,padding,doors,galleryDoorWidth) : -Infinity;
  for(const part of plan.solids){
    const down=part.piece && doors?.furniture?.[part.piece.id];
    if(down)top=Math.max(top,fallenTop(part.piece,down,x,z,padding));
    else if(overlaps(part))top=Math.max(top,part.bottom+part.h);
  }
  for(const pane of plan.panes)if(!doors?.brokenPanes?.[pane.id] && overlaps(pane))top=Math.max(top,pane.bottom+pane.h);
  for(const face of room.entries)if(Math.abs(z-face)<.15+padding && probe>galleryDoorHead)return roof;
  return top;
}
