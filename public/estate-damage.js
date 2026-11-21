import {damageDirection} from './collapse-direction.js';
// A missile opens one storey-high wall bay. Losing two distinct supports in a
// structural bay brings down its slabs, roof and fittings above the lost level.
import {casaWalls,casaFurniture} from './casa-luma.js';
import {mareParts,mareFurniture} from './palazzo-mare.js';
const quay=.80, span=3.6;
export const estates=[
  {x:-41.5,z:-410.45,width:33,depth:28,levels:[1.07,4.77],heads:[4.23,8.00]},
  {x:8.8,z:-452.75,width:32,depth:21,levels:[.87,4.9,8.7],heads:[4.65,8.45,11.45]},
];
const supportParts=[casaWalls,mareParts.filter(p=>['stone','glass','jamb','plaster','sill','lintel'].includes(p.kind))];
function houseAt(x,z){
  return estates.findIndex(e=>x>=e.x && x<=e.x+e.width && z>=e.z && z<=e.z+e.depth);
}
export const onEstate=(x,z)=>houseAt(x,z)>=0;
function covers(x,z,r){return x>=r.left && x<r.right && z>=r.north && z<r.south;}
const sourceCache=new WeakMap(), stateCache=new WeakMap();
const empty={key:'',cuts:[],falls:[]};
export function estateCondition(doors){
  const list=doors?.estateBreaches;
  if(!list?.length)return empty;
  let condition=stateCache.get(list);
  if(condition?.count===list.length)return condition;
  const groups=new Map(),cuts=[],falls=[];
  for(const id of list){
    const [index,x,z,level,axis,line]=id.split(':').map(Number),e=estates[index];
    const left=e.x+x*span,north=e.z+z*span;
    const cx=Math.floor(x/2),cz=Math.floor(z/2),group=[index,cx,cz,level].join(':');
    cuts.push({id,index,level,left:axis===0?left:line/100-.56,right:axis===0?left+span:line/100+.56,
      north:axis===0?line/100-.56:north,south:axis===0?line/100+.56:north+span,
      low:e.levels[level],high:e.heads[level]});
    const count=(groups.get(group)||0)+1;
    groups.set(group,count);
    if(count===2)falls.push({id:group,collapse:true,index,level,left:e.x+cx*span*2,right:e.x+(cx+1)*span*2,
      north:e.z+cz*span*2,south:e.z+(cz+1)*span*2,low:e.levels[level],high:20});
  }
  condition={key:list.join('|'),count:list.length,cuts:[...cuts,...falls],falls};
  stateCache.set(list,condition);
  return condition;
}
const collectedKinds=new Set(['sofa','chair','bed','table','dining','coffee','lowTable','island','nightstand','planter']);
export const collectionPiece=kind=>collectedKinds.has(kind);
const collectedFurniture=new Set([...casaFurniture,...mareFurniture].filter(p=>collectionPiece(p.kind)));
export function furnishingSupported(home,x,y,z,doors,cuts=estateCondition(doors).falls){
  if(doors?.houseRuins?.[home])return false;
  return !cuts.some(r=>y>=r.low-.015 && y<=r.high && covers(x,z,r));
}
export function breachEstate(doors,point){
  if(!doors || !point)return false;
  const {x,y,z}=point,index=houseAt(x,z);
  if(index<0)return false;
  const e=estates[index],level=e.levels.findLastIndex(h=>y>=h-.20);
  if(level<0 || y>e.heads[level]+.55)return false;
  if(estateCondition(doors).falls.some(r=>y>=r.low && covers(x,z,r)))return false;
  let nearest,best=.46;
  for(const p of supportParts[index]){
    const dx=Math.max(0,Math.abs(x-p.x)-p.w/2),dz=Math.max(0,Math.abs(z-p.z)-p.d/2);
    const dy=Math.max(0,p.bottom+quay-y,y-p.h-quay);
    const dist=Math.hypot(dx,dy,dz);
    if(dist<best){best=dist;nearest=p;}
  }
  if(!nearest)return false;
  const alongX=nearest.alongX??(nearest.w>=nearest.d);
  const bx=alongX?x:nearest.x,bz=alongX?nearest.z:z;
  const key=[index,Math.floor((bx-e.x)/span),Math.floor((bz-e.z)/span),level,alongX?0:1,Math.round((alongX?bz:bx)*100)].join(':');
  const hits=doors.estateBreaches??=[];
  if(hits.includes(key))return false;
  const before=estateCondition(doors).falls;
  hits.push(key);
  const fall=estateCondition(doors).falls.at(-1);
  if(fall && !before.some(other=>other.id===fall.id)){
    const cx=(fall.left+fall.right)/2,cz=(fall.north+fall.south)/2;
    const direction=damageDirection(estateCondition(doors).cuts.filter(c=>!c.collapse && c.index===fall.index && c.level===fall.level &&
      covers((c.left+c.right)/2,(c.north+c.south)/2,fall)).map(c=>({x:(c.left+c.right)/2-cx,z:(c.north+c.south)/2-cz})));
    const upper=before.filter(r=>r.left===fall.left && r.north===fall.north && r.low>fall.low);
    (doors.structureFalls??=[]).push({key:'estate-'+fall.id,age:0,index:fall.index,direction,
      left:fall.left,right:fall.right,north:fall.north,south:fall.south,low:fall.low,
      high:Math.min(fall.high,...upper.map(r=>r.low))});
  }
  return true;
}
export function estateSupportLimit(doors,x,z){
  if(!doors?.estateBreaches || houseAt(x,z)<0)return Infinity;
  let limit=Infinity;
  for(const r of estateCondition(doors).falls)if(covers(x,z,r))limit=Math.min(limit,r.low);
  return limit;
}
// Subtract an axis-aligned cut from the original simulation solid. Each of the
// six surviving pieces keeps its metadata (including any destructible pane).
function subtract(p,r){
  const x0=p.x-p.w/2,x1=p.x+p.w/2,z0=p.z-p.d/2,z1=p.z+p.d/2;
  const y0=p.bottom??0,y1=p.h, x=Math.max(x0,r.left),X=Math.min(x1,r.right);
  const z=Math.max(z0,r.north),Z=Math.min(z1,r.south),y=Math.max(y0,r.low-quay),Y=Math.min(y1,r.high-quay);
  if(x>=X || z>=Z || y>=Y)return [p];
  const parts=[];
  function keep(l,h,n,s,b,t){
    if(h-l>.0001 && s-n>.0001 && t-b>.0001)parts.push({...p,estateFragment:true,x:(l+h)/2,w:h-l,z:(n+s)/2,d:s-n,bottom:b,h:t});
  }
  keep(x0,x,z0,z1,y0,y1);keep(X,x1,z0,z1,y0,y1);
  keep(x,X,z0,z,y0,y1);keep(x,X,Z,z1,y0,y1);
  keep(x,X,z,Z,y0,y);keep(x,X,z,Z,Y,y1);
  return parts;
}
export function estateSolids(original,doors){
  const ruins=doors?.houseRuins;
  if(!doors?.estateBreaches?.length && !ruins?.casa && !ruins?.mare)return original;
  const condition=estateCondition(doors),last=sourceCache.get(original);
  const key=condition.key+(ruins?.casa?'C':'')+(ruins?.mare?'M':'');
  if(last?.key===key)return last.parts;
  const parts=[];
  for(const p of original){
    const index=houseAt(p.x,p.z);
    if(index<0){parts.push(p);continue;}
    if(collectedFurniture.has(p) && !furnishingSupported(index?'mare':'casa',p.x,quay+p.bottom,p.z,doors,condition.falls))continue;
    let pieces=[p];
    for(const r of condition.cuts)if(r.index===index)pieces=pieces.flatMap(piece=>subtract(piece,r));
    parts.push(...pieces);
  }
  sourceCache.set(original,{key,parts});
  return parts;
}
