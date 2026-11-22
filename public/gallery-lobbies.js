import {spiralForHouse,outsideWell} from './residential-spirals.js';
// Ground-floor north/south gallery entries occupy the strip between each
// building's independently furnished east and west commercial tenancies.
import {bankSite,bankFront,bankServiceParts} from './bank-site.js';
import {hotel,hotelDoorTop} from './maravela-hotel.js';
import {fallenTop} from './shop-furniture.js';
import {retailDepths} from './street-shop-layout.js';
import {brickellMap} from './brickell-map.js';

export const galleryFloor=.824, galleryCeiling=3.77, galleryDoorWidth=1.32;
export const galleryDoorHead=3.10, galleryStile=.07;
export const galleryLobbies=[], galleryPanes=[], galleryDoorPanes=[], galleryPlans=[];
const byBuilding=new WeakMap(), cells=new Map(), grid=20;
const cellKey=(x,z)=>(Math.floor(x/grid)+32)*128+Math.floor(z/grid)+32;
function indexRoom(room){
  for(let ix=Math.floor(room.left/grid);ix<=Math.floor(room.right/grid);ix++)for(let iz=Math.floor(room.zmin/grid);iz<=Math.floor(room.zmax/grid);iz++){
    const key=(ix+32)*128+iz+32;
    if(!cells.has(key))cells.set(key,[]);
    cells.get(key).push(room);
  }
}
const rect=(x,z,w,d,top,bottom=galleryFloor)=>({x,z,w,d,bottom,h:top-bottom});
for(const [index,b] of brickellMap.buildings.entries()){
  const {east,west}=retailDepths(b);
  const w=b.w-east-west,x=b.x+(west-east)/2;
  const plan={index,b,w,x,east,west,hotel:b.x===hotel.x && b.z===hotel.z,
    ends:[],rooms:[],solids:[],panes:[],doorPanes:[]};
  galleryPlans.push(plan);byBuilding.set(b,plan);
  const bank=b===bankSite;
  const shared=!bank && b.d<10;
  const depth=bank ? 6.25 : shared ? b.d/2 : Math.min(6.25,b.d/2-.48);
  for(const side of bank ? [-1] : [-1,1]){
    const z=b.z+side*b.d/2;
    const wx=u=>x+side*u,wz=v=>z-side*v;
    const entry={side,z,x,w,depth};
    plan.ends.push(entry);
    const left=x-w/2+.10,right=x+w/2-.10;
    const rear=wz(depth),zmin=shared ? b.z-b.d/2 : Math.min(z,rear),zmax=shared ? b.z+b.d/2 : Math.max(z,rear);
    if(!shared || side<0){
      const name=plan.hotel?hotel.name:bank?bankSite.name:(b.resortWing??'Gallery Lobby');
      const room={name,index,shared,x,left,right,zmin,zmax,entries:shared ? [b.z-b.d/2,b.z+b.d/2] : [z]};
      plan.rooms.push(room);galleryLobbies.push(room);
      indexRoom(room);
    }
    function block(kind,u,v,width,d,top,bottom=galleryFloor){
      const obstacle={kind,side,...rect(wx(u),wz(v),width,d,top,bottom)};
      plan.solids.push(obstacle);return obstacle;
    }
    for(const bay of [-1,1]){
      const id='gallery-'+index+'-'+(side<0?'north':'south')+'-'+(bay<0?'west':'east');
      const far=w/2-.21,near=galleryDoorWidth/2+galleryStile;
      const paneWidth=far-near, paneX=x+bay*(near+far)/2;
      const pane={id,widthAxis:'x',width:paneWidth,top:galleryDoorHead,
        building:index,side,bay,axis:'x',normal:{x:0,z:side},x:paneX,z:wz(.09),w:paneWidth,d:.032,
        bottom:galleryFloor+.071,h:galleryDoorHead-galleryFloor-.071};
      galleryPanes.push(pane);plan.panes.push(pane);
      block('jamb',bay*(galleryDoorWidth/2+galleryStile/2),.095,galleryStile,.14,galleryCeiling);
      block('return',bay*(w/2-.093),depth/2,.186,depth,galleryCeiling);
      if(!plan.hotel){
        const leaf=block('doorLeaf',bay*(galleryDoorWidth/2+.046),.455,.067,.80,galleryDoorHead);
        const glass={
          id:id+'-leaf',widthAxis:'z',x:leaf.x,z:leaf.z,width:.67,bottom:galleryFloor+.105,
          top:galleryDoorHead-.064,edge:false,
        };
        leaf.glass=glass;
        galleryDoorPanes.push(glass);plan.doorPanes.push(glass);
      }
    }
    if(!shared){
      if(bank)block('rear',0,depth-.073,w,.146,galleryCeiling);
      else block('passageHeader',0,depth-.073,1.48,.146,galleryCeiling,galleryFloor+2.155);
      for(const wing of bank ? [] : [-1,1]){
        const width=(w-1.48)/2;
        block('rear',wing*(.74+width/2),depth-.073,width,.146,galleryCeiling);
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
  if(bank){
    plan.solids.push(...bankServiceParts);
    plan.solids.push({kind:'bankCounter',...rect(x,bankFront+4.12,4.68,.63,1.84)});
    plan.solids.push({kind:'queueRail',...rect(x-.91,bankFront+2.77,.08,1.34,1.56)});
  }
  if(plan.hotel){
    for(const [k,p,h] of [['reception',hotel.desk,1.30],['luggage',hotel.cart,1.61]]){
      plan.solids.push({kind:k,...rect(p.x,p.z,p.w,p.d,galleryFloor+h)});
    }
  }
  if(!shared && !bank){
    const inner=b.d-2*depth,wing=(w-1.48)/2;
    for(const side of [-1,1])plan.solids.push(...outsideWell({kind:'core',...rect(x+side*(.74+wing/2),b.z,wing,inner,galleryCeiling)},spiralForHouse(b)));
    plan.passage={name:'Gallery passage',index,x,left:x-.74,right:x+.74,zmin:b.z-inner/2,zmax:b.z+inner/2,entries:plan.ends.map(e=>e.z)};
    indexRoom(plan.passage);
  }
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
export function galleryTopAt(b,x,z,padding,probe,roof,doors,round=false) {
  const plan=byBuilding.get(b);
  if(!plan || Math.abs(x-plan.x)>plan.w/2+.001 || probe>galleryCeiling+.002)return undefined;
  const room=plan.rooms.find(r=>z>=r.zmin-padding && z<=r.zmax+padding)??plan.passage;
  if(!room)return undefined;
  const overlaps=o=>Math.abs(o.x-x)<=o.w/2+padding && Math.abs(o.z-z)<=o.d/2+padding;
  let top=plan.hotel ? hotelDoorTop(x,z,padding,doors,galleryDoorWidth,galleryFloor,probe,round) : -Infinity;
  for(const part of plan.solids){
    const down=part.piece && doors?.furniture?.[part.piece.id];
    if(down){top=Math.max(top,fallenTop(part.piece,down,x,z,padding));continue;}
    if(!overlaps(part) || probe<part.bottom-.001)continue;
    if(part.glass && (round || doors?.brokenPanes?.[part.glass.id])){
      const glass=part.glass;
      const end=Math.abs(glass.z-z)>=glass.width/2-padding;
      const rail=Math.abs(probe-(galleryFloor+1.02))<.036;
      if(!end && !rail && probe>=glass.bottom && probe<=glass.top)continue;
    }
    top=Math.max(top,part.bottom+part.h);
  }
  for(const pane of plan.panes)if(!round && !doors?.brokenPanes?.[pane.id] && overlaps(pane))top=Math.max(top,pane.bottom+pane.h);
  for(const face of room.entries)if(Math.abs(z-face)<.15+padding && probe>galleryDoorHead)return roof;
  return top;
}
