export const towerBase=.7, bandHeight=4, baysAcross=4;
export const baysPerFloor=baysAcross*baysAcross, towerStride=256;
const overhang=1.55;

function divider(center,width,i){
  if(i===0)return center-width/2-overhang;
  if(i===baysAcross)return center+width/2+overhang;
  // Interior cuts align with the world-space render mask's metre grid.
  return Math.round(center+width*(i/baysAcross-.5));
}
function column(center,width,position){
  for(let i=1;i<baysAcross;i++)if(position<divider(center,width,i))return i-1;
  return baysAcross-1;
}
export function towerCell(b,x,y,z) {
  if(b.towerId==null || y<towerBase || y>b.base+b.eave+1.3 ||
    Math.abs(x-b.x)>b.w/2+overhang || Math.abs(z-b.z)>b.d/2+overhang)return -1;
  const row=Math.floor((y-towerBase)/bandHeight);
  return b.towerId*towerStride+row*baysPerFloor+column(b.x,b.w,x)+baysAcross*column(b.z,b.d,z);
}
export function towerCellBounds(b,id) {
  const i=id%baysAcross,j=Math.floor(id%baysPerFloor/baysAcross);
  const y0=towerBase+Math.floor(id%towerStride/baysPerFloor)*bandHeight;
  return {x0:divider(b.x,b.w,i),x1:divider(b.x,b.w,i+1),
    z0:divider(b.z,b.d,j),z1:divider(b.z,b.d,j+1),y0,y1:y0+bandHeight};
}
export function towerCollapsed(b,doors){
  return b.towerId!=null && !!doors?.collapsedTowers?.includes(b.towerId);
}
export function rubbleProgress(ticks){
  // The heap builds after the first concrete reaches the ground.
  const t=Math.max(0,Math.min(1,(ticks/30-.9)/1.65));
  return t*t*(3-2*t);
}
export function rubbleHeight(b,x,z,doors){
  const fall=doors?.structureFalls?.find(f=>f.tower===b.towerId);
  const u=Math.abs((x-b.x)/(b.w/2)),v=Math.abs((z-b.z)/(b.d/2));
  const taper=Math.max(0,1-Math.max(u,v));
  return b.base+(fall?rubbleProgress(fall.age):1)*taper*Math.min(4.5,b.eave*.12)*(.89+.11*Math.cos(x*1.3+z));
}
export function collapsedLot(buildings,doors,x,z,padding=0){
  if(!doors?.collapsedTowers?.length)return;
  return buildings.find(b=>towerCollapsed(b,doors) && Math.abs(x-b.x)<=b.w/2+padding && Math.abs(z-b.z)<=b.d/2+padding);
}
const breachSets=new WeakMap();
function lostCells(ids){
  let set=breachSets.get(ids);
  if(!set || set.size!==ids.length){set=new Set(ids);breachSets.set(ids,set);}
  return set;
}
export function breachTower(buildings,doors,point) {
  for(const b of buildings){
    const cell=towerCell(b,point.x,point.y,point.z);
    if(cell<0 || towerCollapsed(b,doors))continue;
    const lost=doors.towerBreaches??=[],set=lostCells(lost);
    if(set.has(cell))return null;
    lost.push(cell);set.add(cell);
    const floor=cell-cell%baysPerFloor;
    if(towerCellBounds(b,cell).y1 < b.base+b.eave){
      let i=0;
      while(i<baysPerFloor && set.has(floor+i))i++;
      if(i===baysPerFloor){
        (doors.structureFalls??=[]).push({key:'tower-'+b.towerId,tower:b.towerId,age:0,
          missing:lost.filter(id=>Math.floor(id/towerStride)===b.towerId)});
        (doors.collapsedTowers??=[]).push(b.towerId);
        doors.towerBreaches=lost.filter(id=>Math.floor(id/towerStride)!==b.towerId);
      }
    }
    return cell;
  }
  return null;
}
export function breachedFloor(b,x,z,y,doors) {
  const ids=doors?.towerBreaches;
  if(!ids?.length || !Number.isFinite(y))return null;
  let cell=towerCell(b,x,y,z);
  const lost=lostCells(ids);
  if(cell<0 || !lost.has(cell))return null;
  while(cell%towerStride>=baysPerFloor && lost.has(cell-baysPerFloor))cell-=baysPerFloor;
  return towerBase+Math.floor(cell%towerStride/baysPerFloor)*bandHeight;
}
export function inTowerBreach(buildings,doors,x,y,z){
  if(collapsedLot(buildings,doors,x,z,overhang) && y>=towerBase)return true;
  return !!doors?.towerBreaches?.length && buildings.some(b=>breachedFloor(b,x,z,y,doors)!=null);
}
