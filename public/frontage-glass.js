import {noteGlass} from './pane-damage.js';
import {supercarLayout} from './supercar-layout.js';
import {hotel,hotelGlass} from './maravela-hotel.js';
import {bankSite} from './bank-site.js';
import {galleryVehicleRects,galleryPlans,galleryDoorWidth,galleryFloor} from './gallery-lobbies.js';
import {fallenTop} from './shop-furniture.js';
import {tenants,retailDepths,retailFixtures,shopFloor,shopCeiling} from './street-shop-layout.js';
import {brickellMap,citySiteId} from './brickell-map.js';
import {paneSupportLost} from './glass-support.js';
import {doorX,hasStorefrontRooms,panelCenter,storefrontDoors,storefrontFloor,storefrontFurniture,storefrontLeafId} from './storefront-layout.js';

const roomGrid=new Map();
const gridKey=(x,z)=>Math.floor(x/12)*128+Math.floor(z/12);
export const storefrontFaces=[];
const buildings=new Map();
// Center the opening in the original door bay unless a street tree or signal
// occupies the approach. The small lateral adjustment preserves that bay.
function doorCenter(side,x,lo,hi,width){
  const center=(lo+hi)/2,room=(hi-lo-width)/2-.048;
  function clearance(z){
    let dist=Infinity;
    for(const reach of [.0,.4,.8,1.2,1.6]){
      const px=x+side*reach;
      for(const t of brickellMap.trees)dist=Math.min(dist,Math.hypot(px-t.x,z-t.z)-t.radius);
      for(const p of brickellMap.barriers){
        const dx=Math.max(0,Math.abs(px-p.x)-p.w/2),dz=Math.max(0,Math.abs(z-p.z)-p.d/2);
        dist=Math.min(dist,Math.hypot(dx,dz));
      }
    }
    return dist;
  }
  if(clearance(center)>.54)return center;
  return [center,center-room,center+room].reduce((a,b)=>clearance(b)>clearance(a)?b:a);
}
for(const [index,b] of brickellMap.buildings.entries()){
  if(b===bankSite)continue;
  const pair=[];
  for(const side of [-1,1]){
    const showcase=hasStorefrontRooms(b)&&side===1;
    const x=showcase?doorX:b.x+side*(b.w/2-.16);
    let spans;
    if(showcase){
      spans=[[-1.59,-.78],[-.78,1.12,'lobby'],[1.12,2.10],
        [2.61,5.04],[5.04,7.40],[7.40,9.76],[9.76,12.12],[12.12,13.52],[13.52,15.4,'cafe']];
    }else{
      const bays=Math.max(3,Math.round(b.d/2.8)),bay=(b.d-.44)/bays;
      spans=Array.from({length:bays},(_,i)=>[b.z-b.d/2+.22+i*bay,b.z-b.d/2+.22+(i+1)*bay]);
    }
    const face={id:(citySiteId(b))*2+(side+1)/2,buildingIndex:index,side,x,building:b,showcase,spans,depth:retailDepths(b)[side===1?'east':'west']};
    if(!showcase){
      const bayIndex=side===1?spans.length-1:0,[lo,hi]=spans[bayIndex];
      face.name=tenants[index][side===1?1:0][0];
      face.entry={bayIndex,z:doorCenter(side,x,lo,hi,1.30),width:1.30,head:3.04,travel:-side*1.35};
      face.fixtures=retailFixtures(index,face);
      face.fixtureRows=new Map();
      for(const p of face.fixtures){
        for(let row=Math.floor(p.z-p.d/2-.4);row<=Math.floor(p.z+p.d/2+.4);row++){
          if(!face.fixtureRows.has(row))face.fixtureRows.set(row,[]);
          face.fixtureRows.get(row).push(p);
        }
      }
      const rear=x-side*face.depth;
      for(let gx=Math.floor(Math.min(x,rear)/12);gx<=Math.floor(Math.max(x,rear)/12);gx++)
        for(let gz=Math.floor((b.z-b.d/2)/12);gz<=Math.floor((b.z+b.d/2)/12);gz++){
          const key=gx*128+gz;if(!roomGrid.has(key))roomGrid.set(key,[]);roomGrid.get(key).push(face);
        }
    }
    pair.push(face);storefrontFaces.push(face);
  }
  buildings.set(b.x+','+b.z,pair);
}
// A vehicle clears an entire bay and its mullion. A round can leave the
// neighboring sheets and moving door frame intact within that same bay.
function faceGlass(face) {
  const piece=(index,kind,x,lo,hi,bottom,top,slide)=>({
    ...(kind?{id:'retail-'+face.id+'-'+index+'-'+kind}:{}),
    face,index,x,z:(lo+hi)/2,width:hi-lo,bottom,top,widthAxis:'z',slide,
  });
  const bays=face.spans.map(([lo,hi,door],i)=>{
    const bottom=face.showcase?.89:.92,top=face.showcase?(lo<2.11?3.04:3.13):3.65;
    const all=piece(i,'',face.x,lo,hi,bottom,top);
    if(door)return {all,panes:[]};
    const e=face.entry;
    if(e?.bayIndex!==i)return {all,panes:[all]};
    const left=e.z-e.width/2,right=e.z+e.width/2;
    return {all,panes:[
      piece(i,'left',face.x,lo,left,bottom,top),
      piece(i,'right',face.x,right,hi,bottom,top),
      piece(i,'transom',face.x,left,right,e.head,top),
      piece(i,'leaf',face.x-.065*face.side,left+.032,right-.032,.892,e.head-.045,true),
    ]};
  });
  const extra=[];
  if(face.showcase){
    for(const door of storefrontDoors){
      const cafe=door.id==='cafe';
      const [lo,hi,top]=cafe?[2.61,15.52,3.62]:[-1.59,2.10,3.56];
      const index=face.spans.findIndex(s=>s[2]===door.id);
      extra.push(piece(null,door.id+'-transom',face.x,lo,hi,door.head,top));
      for(const side of [0,1]){
        const x=face.x-.046-.067*side,z=panelCenter(door,side,0),width=door.width/2-.052;
        extra.push({
          id:storefrontLeafId(door,side),face,index,x,z,width,widthAxis:'z',
          bottom:storefrontFloor+.054,top:door.head-.039,slide:{door,side},
        });
      }
    }
  }
  return {bays,extra};
}
for(const face of storefrontFaces)face.glass=faceGlass(face);

export function paneCenter(pane,doors) {
  if(pane.slide===true)return pane.z+pane.face.entry.travel*(doors?.retail?.[pane.face.id]??0);
  if(pane.slide){
    const {door,side}=pane.slide;
    return panelCenter(door,side,doors?.[door.id]??0);
  }
  return pane.z;
}
export function paneShattered(pane,doors) {
  return Boolean((pane.id && doors?.brokenPanes?.[pane.id]) ||
    (pane.face && pane.index!==null && (doors?.broken?.[pane.face.id] & (1<<pane.index))));
}
export const paneUnavailable=(pane,doors,building)=>paneShattered(pane,doors) || paneSupportLost(pane,doors,building);
export function shatterPane(doors,pane) {
  if(!doors||paneUnavailable(pane,doors))return false;
  noteGlass(doors,{x:pane.x,y:(pane.bottom+pane.top)/2,z:paneCenter(pane,doors)});
  if(pane.id){
    (doors.brokenPanes??={})[pane.id]=pane.slide ? {z:paneCenter(pane,doors)} : pane.hotelSlider ? {x:pane.x} : true;
  }else{
    const masks=doors.broken??={};
    masks[pane.face.id]=(masks[pane.face.id]??0)|(1<<pane.index);
  }
  return true;
}

export function frontageOpenToRound(face,z,y,doors) {
  for(const {all} of face.glass.bays){
    const low=face.spans[all.index][2] || face.entry?.bayIndex===all.index ? .842 : all.bottom;
    if(Math.abs(z-all.z)>all.width/2 || y<low || y>all.top)continue;
    const start=all.z-all.width/2;
    const sill=face.spans[all.index][2] || face.entry?.bayIndex===all.index ? false : Math.abs(y-all.bottom)<.025;
    return paneUnavailable(all,doors) || (z>start+.028 && !sill);
  }
  return face.glass.extra.some(p=>!p.slide && Math.abs(z-p.z)<=p.width/2 && y>=p.bottom && y<=p.top);
}

export function frontageSupportOpening(face,z,y,pad,doors){
  if(!doors?.towerBreaches?.length)return false;
  const open=p=>Math.abs(z-paneCenter(p,doors))+pad<=p.width/2 && y>=p.bottom && y<=p.top && paneSupportLost(p,doors);
  return face.glass.bays.some(({panes})=>panes.some(open)) || face.glass.extra.some(open);
}

export function visitRoundGlass(building,doors,visit) {
  const faces=buildings.get(building.x+','+building.z);
  if(!faces && building!==bankSite)return;
  for(const face of faces??[]){
    for(const {panes} of face.glass.bays)for(const pane of panes)if(!paneUnavailable(pane,doors))visit(pane);
    for(const pane of face.glass.extra)if(!paneUnavailable(pane,doors))visit(pane);
  }
  const plan=faces?galleryPlans[faces[0].buildingIndex]:galleryPlans.find(p=>p.b===bankSite);
  for(const pane of plan.panes)if(!paneUnavailable(pane,doors))visit(pane);
  for(const pane of plan.doorPanes)if(!paneUnavailable(pane,doors))visit(pane);
  if(plan.hotel)for(const front of hotel.fronts){
    for(const pane of hotelGlass(front,doors?.hotel?.[front.id]??0,galleryDoorWidth,galleryFloor)){
      if(!paneUnavailable(pane,doors,building))visit(pane);
    }
  }
}

export function faceAt(b,x){
  const pair=buildings.get(b.x+','+b.z);
  return pair?.[x>b.x?1:0];
}
export function brokenSpan(face,mask,z,pad){
  let lo=z-pad;
  for(const [i,[start,end]] of face.spans.entries()){
    if(end<lo)continue;
    if(start>lo+.002 || !(mask & (1<<i)))return false;
    if(end>=z+pad)return true;
    lo=end;
  }
  return false;
}
export function retailRoom(x,y,z){
  if(y<.5||y>=shopCeiling)return null;
  for(const face of roomGrid.get(gridKey(x,z))??[]){
    const depth=(face.x-x)*face.side;
    if(depth>=0&&depth<face.depth-.21&&Math.abs(z-face.building.z)<face.building.d/2-.15)return face;
  }
  return null;
}
export function retailHeadroom(x,z,pad){
  const face=retailRoom(x,shopFloor,z);
  if(!face)return Infinity;
  return Math.abs(x-face.x)<.13+pad && Math.abs(z-face.entry.z)<face.entry.width/2+pad ? face.entry.head : shopCeiling;
}

export function stepRetailDoors(doors,players,dt){
  for(const face of storefrontFaces){
    if(!face.entry)continue;
    const {z,width,bayIndex,head}=face.entry,old=doors.retail?.[face.id]??0;
    const active=!(doors.broken?.[face.id]&(1<<bayIndex)) &&
      players.some(p=>p.y>.4&&p.y<head && Math.abs(p.x-face.x)<2.35 && Math.abs(p.z-z)<width/2+.46);
    const fraction=active?Math.min(1,old+dt*3.4):Math.max(0,old-dt*1.45);
    if(old===fraction)continue;
    if(fraction)(doors.retail??={})[face.id]=fraction;
    else delete doors.retail[face.id];
  }
}

export function retailSurface(face,x,z,pad,probe,roof,doors,round=false){
  const mask=doors?.broken?.[face.id]??0,reach=(face.x-x)*face.side;
  if(probe>shopCeiling || reach>face.depth-.30-pad ||
    Math.abs(z-face.building.z)>face.building.d/2-.18-pad)return roof;
  if(reach<.17+pad){
    if(round){
      if(!frontageOpenToRound(face,z,probe,doors))return roof;
    }else if(!brokenSpan(face,mask,z,pad) && !frontageSupportOpening(face,z,probe,pad,doors)){
      const entry=face.entry,opening=doors?.retail?.[face.id]??0;
      const leafZ=entry.z+entry.travel*opening;
      const individual=face.glass.bays[entry.bayIndex].panes;
      const leaf=individual.find(p=>p.slide);
      const wideEnough=individual.some(p=>!p.slide && paneUnavailable(p,doors) &&
        p.bottom<shopFloor+.12 && probe<=p.top && Math.abs(z-p.z)+pad<=p.width/2);
      if(!wideEnough && (probe>entry.head || Math.abs(z-entry.z)>entry.width/2-pad ||
          (!paneUnavailable(leaf,doors) && Math.abs(z-leafZ)<entry.width/2+pad+.018)))return roof;
    }
  }
  let top=-Infinity;
  const candidates=pad<=.4?(face.fixtureRows.get(Math.floor(z))??[]):face.fixtures;
  for(const p of face.pieces.values()){
    const f=doors?.furniture?.[p.id];
    if(f)top=Math.max(top,fallenTop(p,f,x,z,pad));
  }
  for(const p of candidates){
    if(p.piece && doors?.furniture?.[p.piece.id])continue;
    if(p.bottom<=probe && Math.abs(x-p.x)<p.w/2+pad && Math.abs(z-p.z)<p.d/2+pad)top=Math.max(top,p.top);
  }
  return top;
}
// Fixed references let the rover keep its resting-contact latch against a wall.
for(const face of storefrontFaces){
  const {building:b,side,x,depth}=face, rear=x-side*(depth-.30);
  face.solids=[{x:rear,z:b.z,w:.16,d:b.d}];
  for(const end of [-1,1])face.solids.push({x:(x+rear)/2,z:b.z+end*(b.d/2-.09),w:Math.abs(x-rear),d:.18});
  if(face.showcase){
    face.solids.push({x:(x+rear)/2,z:2.41,w:Math.abs(x-rear),d:.17});
    for(const p of storefrontFurniture)face.solids.push({x:p.x,z:p.z,w:2*(p.hw??p.r),d:2*(p.hd??p.r),piece:p.piece});
  }
  face.panes=face.spans.map(([lo,hi,door],i)=>({x,z:(lo+hi)/2,w:.09,d:hi-lo,face,index:i,door}));
  if(face.entry){
    const pane=face.panes[face.entry.bayIndex],entry=face.entry,half=entry.width/2;
    const [lo,hi]=face.spans[pane.index];
    const segment=(a,b)=>({...pane,z:(a+b)/2,d:b-a});
    entry.fixed=[segment(lo,entry.z-half),segment(entry.z+half,hi)];
    entry.leaf=segment(entry.z-half,entry.z+half);
  }
}
export function visitRoadPodium(b,x,z,doors,visit,reach=2.1){
  const pair=buildings.get(b.x+','+b.z);
  if(Math.abs(x-b.x)>b.w/2+reach || Math.abs(z-b.z)>b.d/2+reach)return;
  for(const rect of galleryVehicleRects(b,doors))visit(rect);
  if(!pair)return;
  // Only the near side of the central core can be reached from this face.
  const face=pair[x>b.x?1:0],mask=doors?.broken?.[face.id]??0;
  for(const box of face.solids)if(!box.piece || !doors?.furniture?.[box.piece.id])visit(box);
  if(face.fixtures)for(const p of face.fixtures){
    if(p.piece && doors?.furniture?.[p.piece.id])continue;
    if(p.bottom<2.43 && p.top>1.00 && Math.abs(p.x-x)<p.w/2+reach && Math.abs(p.z-z)<p.d/2+reach)visit(p);
  }
  for(const pane of face.panes){
    if(mask&(1<<pane.index))continue;
    if(face.entry?.bayIndex===pane.index){
      const [left,right,,glassLeaf]=face.glass.bays[pane.index].panes;
      if(!paneUnavailable(left,doors))visit(face.entry.fixed[0]);
      if(!paneUnavailable(right,doors))visit(face.entry.fixed[1]);
      const leaf=face.entry.leaf;
      if(!paneUnavailable(glassLeaf,doors)){
        leaf.z=face.entry.z+face.entry.travel*(doors?.retail?.[face.id]??0);
        visit(leaf);
      }
    }else if(!(pane.door && doors?.[pane.door]>.98) && !paneSupportLost(face.glass.bays[pane.index].all,doors))visit(pane);
  }
}
export function breakFrontage(doors,hit,rover,onBreak,hull){
  const sport=rover.kind==='supercar';
  const halfWidth=hull?.halfWidth??(sport?supercarLayout.halfWidth:.82);
  const halfLength=hull?.halfLength??(sport?supercarLayout.halfLength:1.69);
  if(hit.axis==='x' && doors){
    const extent=Math.abs(Math.cos(rover.yaw))*halfWidth+Math.abs(Math.sin(rover.yaw))*halfLength+.05;
    const broken=doors.brokenPanes??={};
    if(broken[hit.id])return false;
    for(const pane of galleryPlans[hit.building].panes){
      if(pane.side===hit.side && (pane.id===hit.id || Math.abs(pane.x-rover.x)<=pane.w/2+extent) && !broken[pane.id]){
        broken[pane.id]=true;onBreak?.(pane.id);
      }
    }
    return Boolean(broken[hit.id]);
  }
  const face=hit.face;
  if(!face||!doors)return false;
  const extent=Math.abs(Math.cos(rover.yaw))*halfLength+Math.abs(Math.sin(rover.yaw))*halfWidth+.05;
  const lo=rover.z-extent,hi=rover.z+extent;
  const initialMask=doors.broken?.[face.id]??0;
  let mask=initialMask;
  for(const [i,[start,end]] of face.spans.entries()){
    if((i===hit.index || (hi>=start && lo<=end)) && !(mask & (1<<i))){mask|=1<<i;onBreak?.(face.id+'-'+i);}
  }
  if(mask===initialMask)return false;
  (doors.broken??={})[face.id]=mask;
  return true;
}
