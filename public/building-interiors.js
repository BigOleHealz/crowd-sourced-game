// A floor is generated once for simulation. The renderer only needs the floor
// the camera occupies. Door bits are the only persistent per-room network data.
import {breachedFloor} from './tower-damage.js';
import {towerStories} from './tower-glass.js';
import {furnishingSupported} from './estate-damage.js';
import {bankSite,bankServiceParts,bankServiceDoors} from './bank-site.js';
import {stations,sandHeight} from './beach-layout.js';
import {galleryPlans} from './gallery-lobbies.js';

export const interiorPlans=[], interiorDoors=[];
const byBuilding=new WeakMap(), grid=new Map();
const floorY=4.70, corridor=1.34;
const key=(x,z)=>(Math.floor(x/15)+40)*256+Math.floor(z/15)+40;
const box=(x,z,w,d,bottom,h,kind,color)=>({x,z,w,d,bottom,h,kind,color});
const isInside=(p,x,z,margin=0)=>Math.abs(x-p.x)<=p.w/2+margin && Math.abs(z-p.z)<=p.d/2+margin;
const index=(plan)=>{for(let x=Math.floor((plan.x-plan.w/2-3)/15);x<=Math.floor((plan.x+plan.w/2+3)/15);x++)
  for(let z=Math.floor((plan.z-plan.d/2-4)/15);z<=Math.floor((plan.z+plan.d/2+4)/15);z++){
    const k=(x+40)*256+z+40;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(plan);
  }};
const near=(x,z)=>grid.get(key(x,z))??[];
function plan(id,b,type,name,home){
  const p={id,b,type,name,home,x:b.x,z:b.z,w:b.w,d:b.d,levels:[],panels:[],doors:[],entrances:[],shell:[]};
  interiorPlans.push(p);byBuilding.set(b,p);index(p);return p;
}
function door(p,x,y,z,axis,width,label,initial=true,level=-1){
  const d={id:interiorDoors.length,p,x,y,z,axis,width,label,initial,level};
  interiorDoors.push(d);p.doors.push(d);if(level<0)p.entrances.push(d);return d;
}
function panel(p,x,y,z,angle,exitX,exitZ){
  p.panels.push({x,y,z,angle,exitX,exitZ,index:p.panels.length,p});
}
function floorPlan(p,y,height,n){
  const {b}=p,level={p,n,y,height,parts:[],rooms:[],doors:[]};
  const add=(x,z,w,d,lo,h,kind,col)=>level.parts.push(box(x,z,w,d,y+lo,h,kind,col));
  const rows=b.d>=12?2:1,usable=b.d-.90,span=usable/rows;
  for(const side of [-1,1]){
    const line=b.x+side*corridor,roomW=b.w/2-corridor-.4;
    if(rows>1)add(line+side*roomW/2,b.z,roomW,.14,0,height,'wall',0xc7baa4);
    for(let row=0;row<rows;row++){
      const z=b.z-usable/2+span*(row+.5),gap=1.38;
      // Pocket door with a continuous header. Furnishings stay clear of the door path.
      const piece=(span-gap)/2;
      for(const dir of [-1,1])add(line,z+dir*(gap+piece)/2,.14,piece,0,height,'wall',0xd3c7b1);
      add(line,z,.15,gap,2.12,height-2.12,'wall',0xc4b298);
      const number=(n+2)*100+row*2+(side<0?1:2);
      const d=door(p,line,y,z,'z',gap,'Room '+number,false,n);
      level.doors.push(d);level.rooms.push({number,x:line+side*roomW/2,z,w:roomW,d:span});
      const far=b.x+side*(b.w/2-1.36);
      add(far,z+.28,1.55,Math.min(2.05,span*.56),0,.42,'bed',0x765b46);
      add(far,z+.28,1.55,Math.min(2.05,span*.56),.42,.13,'linen',0xe5dccd);
      add(far,z+.77,1.16,.35,.55,.12,'linen',0xf1eee4);
      add(far,z-.23,1.56,.48,.55,.025,'linen',n%2?0x537578:0x7b7264);
      add(line+side*1.0,z+span*.38,.8,.48,0,.76,'desk',0x8f7355);
    }
  }
  p.levels.push(level);
  panel(p,b.x,y,b.z-b.d/2+.48,0,b.x,b.z-b.d/2+1.48);
}
export function initializeBuildingInteriors(buildings,city,terrain){
  if(interiorPlans.length)return;
  for(const [i,b] of buildings.entries()){
    const p=plan(i,b,city?'city':'outpost',city?(b.name??(i===9?'Hotel Maravela':b.finish?'Harbor Key house '+(i-13):'Brickell building '+(i+1))):['Depot lodge','East garage','Motor pool','Ridge cabin'][i],b.finish?'harbor-'+(i-14):null);
    if(city){
      const gallery=galleryPlans[i];
      if(!gallery.hotel)for(const entry of gallery.ends)door(p,entry.x,.824,entry.z+.01*entry.side,'x',1.32,b.name?'Bank entrance':'Gallery entrance');
      if(b===bankSite){
        p.type='bank';
        for(const s of bankServiceDoors)door(p,s.x,.824,s.z,s.axis,s.width,s.label,false);
      }
      if(!b.housing && !b.finish)continue;
      const lobbyZ=b.z-b.d/2+Math.min(3.36,b.d*.48);
      panel(p,gallery.x-gallery.w/2+.23,.824,lobbyZ,Math.PI/2,gallery.x,lobbyZ);
      const {floors,story}=b.finish?{floors:1,story:Math.max(2.50,b.base+b.eave-floorY)}:towerStories(b,3.9);
      for(let n=0;n<floors;n++)floorPlan(p,floorY+n*story,story,n);
    }else{
      const front=b.z+b.d/2;
      p.ramp={front,length:2.3,outer:terrain(b.x,front+2.3),inner:b.base};
      const half=b.w/2,gap=1.66,wall=.15;
      for(const sign of [-1,1]){
        p.shell.push(box(b.x+sign*(half-wall/2),b.z,wall,b.d,b.base,b.eave,'wall'));
        p.shell.push(box(b.x+sign*(half+gap/2)/2,front-wall/2,half-gap/2,wall,b.base,b.eave,'wall'));
      }
      p.shell.push(box(b.x,b.z-b.d/2+wall/2,b.w,wall,b.base,b.eave,'wall'));
      p.shell.push(box(b.x,front-wall/2,gap,wall,b.base+2.24,b.eave-2.24,'lintel'));
      p.shell.push(box(b.x-b.w*.30,b.z-b.d*.26,1.44,.68,b.base,.83,'desk'));
      door(p,b.x,b.base,front+.025,'x',gap,p.name,true);
    }
  }
  if(!city){
    const c=plan(4,{x:0,z:-63.2,w:10.3,d:20.6},'existing','Meadow Church');
    door(c,0,10.48,-52.96,'x',2.99,'Nave doors');
    door(c,0,10.48,-66.0,'x',4.85,'Steeple doors');
    return;
  }
  for(const s of stations){
    const lookout=plan(30+Number(s.number),{x:s.x,z:s.z,w:3.5,d:3.1},'existing','Rescue '+s.number);
    lookout.wood=s.number;
    door(lookout,s.x-.94,sandHeight(s.x,s.z)+1.44,s.z+.14,'z',.97,'Lookout gate');
  }
  const c=plan(21,{x:-70.75,z:-54.4,w:8.8,d:9.8},'existing','Club Lucero');
  door(c,c.x,.8,-49.49,'x',1.98,'Club entrance');
  const salon=plan(22,{x:25,z:-395,w:24,d:10},'salon','Lantern Yacht Club');
  door(salon,26.2,.8,-389.98,'x',2.34,'Yacht club entrance');
  const casa=plan(23,{x:-25,z:-397,w:30,d:26},'existing','Casa de Luma','casa');
  for(const [x,z,axis,width,label] of [[-25,-401,'x',3.1,'Gallery'],[-36.45,-401,'x',2.4,'Bedroom wing'],[-13.75,-401,'x',2.4,'Dining wing'],
    ...[-397.25,-387.05].flatMap(z=>[[-32.6,z,'z',2.3,'Bedroom courtyard'],[-17.4,z,'z',2.3,'Dining courtyard']])])door(casa,x,1.07,z,axis,width,label);
  for(const x of [-36.45,-13.75])door(casa,x,4.77,-401.3,'x',2.4,'Roof terrace');
  for(const y of [1.07,4.77])panel(casa,-30.2,y,-402.20,Math.PI,-30.2,-403.10);
  const mare=plan(24,{x:25,z:-444,w:30,d:16},'existing','Palazzo Mare','mare');
  for(const [x,y,z,axis,w,label] of [[15.4,.87,-437,'x',2.6,'Palazzo entrance'],[28.2,.87,-437,'x',2.6,'Palazzo entrance'],
    [39.5,.87,-441,'z',2.6,'Dining entrance'],[32.6,4.9,-439.5,'x',2.6,'Library terrace'],[30.05,8.7,-444.9,'z',2.6,'Suite terrace'],
    [31.2,.87,-442.32,'z',3.1,'Kitchen'],[28.2,4.9,-444.6,'z',3.85,'Writing room'],[18.25,8.7,-445.25,'z',2.82,'Dressing room']])door(mare,x,y,z,axis,w,label);
  for(const [y,z] of [[.87,-437.61],[4.9,-440.12],[8.7,-442.45]])panel(mare,22,y,z,Math.PI,22,z-.95);
  // Append rear controls so existing saved door bits keep their original IDs.
  for(const g of galleryPlans)if(g.passage){
    const p=byBuilding.get(g.b);
    for(const e of g.ends)door(p,e.x,.824,e.z-e.side*(e.depth-.073),'x',1.48,'Gallery passage');
  }
}
export const doorIsOpen=(d,state)=>d.initial!==!!((state?.roomLeaves?.[d.id>>>5]??0)&(1<<(d.id%32)));
export function operableDoorAt(p,feet,range=1.57){
  let best,dist=range;
  for(const d of p.doors){
    if(Math.abs(d.y-feet.y)>.5)continue;
    const distance=Math.hypot(d.x-feet.x,d.z-feet.z);
    if(distance<dist){best=d;dist=distance;}
  }
  return best;
}
function intact(p,doors,x,y,z){
  return !doors?.beachWood?.[p.wood] && !(p.b.towerId!=null && doors?.collapsedTowers?.includes(p.b.towerId)) &&
    (!p.home || furnishingSupported(p.home,x,y,z,doors));
}
export function buildingAction(feet,state){
  if(!feet?.grounded)return null;
  let best,dist=1.57;
  for(const p of near(feet.x,feet.z)){
    if(!intact(p,state,feet.x,feet.y,feet.z))continue;
    const d=operableDoorAt(p,feet,dist);
    if(d){best={kind:'door',d,label:(doorIsOpen(d,state)?'Close ':'Open ')+d.label};dist=Math.hypot(feet.x-d.x,feet.z-d.z);}
    for(const s of p.panels){
      if(Math.abs(s.y-feet.y)>.5)continue;
      const distance=Math.min(Math.hypot(feet.x-s.x,feet.z-s.z), .5+Math.hypot(feet.x-s.exitX,feet.z-s.exitZ));
      if(distance<dist){best={kind:'lift',s,label:'Use elevator'};dist=distance;}
    }
  }
  return best;
}
export function landingValid(panel,state){return intact(panel.p,state,panel.exitX,panel.y,panel.exitZ) &&
  breachedFloor(panel.p.b,panel.exitX,panel.exitZ,panel.y-.01,state)==null;}
function intersectsDoor(d,x,z,pad){
  return Math.abs(x-d.x)<=(d.axis==='x'?d.width/2:.045)+pad && Math.abs(z-d.z)<=(d.axis==='z'?d.width/2:.045)+pad;
}
export function doorWouldHit(d,feet){return Math.abs(feet.y-d.y)<1.9 && intersectsDoor(d,feet.x,feet.z,.32);}
export function setDoorOpen(d,doors,open){
  const i=d.id>>>5,mask=1<<(d.id%32);
  const bits=doors.roomLeaves??={};
  const next=open===d.initial?(bits[i]??0)&~mask:(bits[i]??0)|mask;
  if(next)bits[i]=next;else delete bits[i];
  if(!Object.keys(bits).length)delete doors.roomLeaves;
}
export function roomDoorTop(x,z,pad,probe,doors){
  if(!doors?.roomLeaves && !Number.isFinite(probe))return -Infinity;
  let top=-Infinity;
  for(const p of near(x,z)){
    if(!intact(p,doors,x,probe,z))continue;
    for(const d of p.entrances){
      if(doorIsOpen(d,doors) || probe<d.y-.12 || probe>d.y+2.19)continue;
      if(intersectsDoor(d,x,z,pad))top=Math.max(top,d.y+2.18);
    }
  }
  return top;
}
function storyAt(p,y){if(!p?.levels.length || y<floorY-.001 || !Number.isFinite(y))return;return p.levels[Math.min(p.levels.length-1,Math.floor((y-floorY+.001)/p.levels[0].height))];}
export function furnishedFloorTop(b,x,z,pad,probe,doors,round=false){
  const p=byBuilding.get(b);
  if(!p || !Number.isFinite(probe) || !isInside(b,x,z,pad))return;
  if(p.type==='bank' && probe<3.77 && (Math.abs(x-b.x)>=2.66 || z>b.z+2.25)){
    let top=.824;
    for(const s of bankServiceParts)if(probe>=s.bottom-.001 && isInside(s,x,z,pad))top=Math.max(top,s.bottom+s.h);
    if(Math.abs(Math.abs(x-b.x)-2.57)<.11+pad && z<b.z+2.25+pad ||
      Math.abs(x-b.x)<2.66+pad && Math.abs(z-(b.z+2.25-.073))<.075+pad)return 3.77;
    return top;
  }
  if(p.type==='outpost'){
    if(probe>b.base+b.eave-.1)return;
    let top=isInside(b,x,z)?b.base:-Infinity;
    for(const s of p.shell)if(probe>=s.bottom-.001 && isInside(s,x,z,pad))top=Math.max(top,s.bottom+s.h);
    return top;
  }
  const level=storyAt(p,probe);
  if(!level || probe>=b.base+b.eave-.08)return;
  if(!round && (Math.abs(x-b.x)>b.w/2-.37-pad || Math.abs(z-b.z)>b.d/2-.37-pad))return b.base+b.eave;
  let top=level.y;
  for(const s of level.parts)if(probe>=s.bottom-.001 && isInside(s,x,z,pad))top=Math.max(top,s.bottom+s.h);
  for(const d of level.doors)if(!doorIsOpen(d,doors) && intersectsDoor(d,x,z,pad))top=Math.max(top,d.y+2.12);
  return top;
}
export function furnishedSupport(x,z,probe,doors){
  if(!Number.isFinite(probe))return;
  for(const p of near(x,z)){
    if(!isInside(p,x,z) || !intact(p,doors,x,probe,z))continue;
    if(p.type==='bank' && probe>=.80 && probe<3.77)return .824;
    if(p.type==='salon' && probe>=1.05 && probe<4.4)return 1.07;
    if(p.type==='outpost' && probe>=p.b.base-.04)return p.b.base;
    const floor=storyAt(p,probe);
    if(floor && probe<p.b.base+p.b.eave && breachedFloor(p.b,x,z,floor.y-.01,doors)==null)return floor.y;
  }
}
export function roomAtFeet(feet,doors){
  for(const p of near(feet.x,feet.z)){
    if(!isInside(p,feet.x,feet.z) || !intact(p,doors,feet.x,feet.y,feet.z))continue;
    const l=storyAt(p,feet.y+.03);
    if(l && feet.y<p.b.base+p.b.eave-.12)return {p,l,label:l.rooms.find(r=>isInside(r,feet.x,feet.z))?.number??'Hall'};
    if(p.type==='bank' && feet.y<3.77 && (Math.abs(feet.x-p.x)>2.66 || feet.z>p.z+2.25))return {p,label:'Biscayne Mutual · Offices'};
    if(p.type==='outpost' && feet.y>=p.b.base-.20 && feet.y<p.b.base+p.b.eave-.1 || p.type==='salon' && feet.y<4.4)return {p,label:p.name};
  }
}
export function approachRamp(x,z){
  for(const p of near(x,z)){
    const r=p.ramp;
    if(!r || Math.abs(x-p.x)>1.07 || z<r.front || z>r.front+r.length)continue;
    return r.inner+(r.outer-r.inner)*(z-r.front)/r.length;
  }
  return -Infinity;
}
export function interiorCeiling(feet,doors){
  const room=roomAtFeet(feet,doors);
  return room?.l ? room.l.y+room.l.height-.14 : room?.p.type==='bank' ? 3.77 : room?.p.type==='outpost' ? room.p.b.base+room.p.b.eave-.12 : Infinity;
}
