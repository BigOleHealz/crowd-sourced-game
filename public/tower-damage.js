// Each storey band has four independent structural bays.
export const towerBase = .7, bandHeight = 4;
export function towerCell(b,x,y,z) {
  if (b.towerId == null || y < towerBase || y > b.base+b.eave+1.3 ||
      Math.abs(x-b.x)>b.w/2+1.55 || Math.abs(z-b.z)>b.d/2+1.55) return -1;
  return b.towerId*64 + Math.floor((y-towerBase)/bandHeight)*4 + Number(x>=b.x) + 2*Number(z>=b.z);
}
export function breachTower(buildings,doors,point) {
  for (const b of buildings) {
    const cell=towerCell(b,point.x,point.y,point.z);
    if (cell<0) continue;
    const lost=doors.towerBreaches??=[];
    if (lost.includes(cell)) return null;
    lost.push(cell);
    return cell;
  }
  return null;
}
export function breachedFloor(b,x,z,y,doors) {
  const lost=doors?.towerBreaches;
  if (!lost?.length || !Number.isFinite(y)) return null;
  let cell=towerCell(b,x,y,z);
  if (cell<0 || !lost.includes(cell)) return null;
  while (cell%64>=4 && lost.includes(cell-4)) cell-=4;
  return towerBase+Math.floor(cell%64/4)*bandHeight;
}
export function towerCellBounds(b,id) {
  const east=id%2, south=(id>>1)%2;
  const low=towerBase+Math.floor(id%64/4)*bandHeight;
  return {x0:east?b.x:b.x-b.w/2-1.55,x1:east?b.x+b.w/2+1.55:b.x,
    z0:south?b.z:b.z-b.d/2-1.55,z1:south?b.z+b.d/2+1.55:b.z,y0:low,y1:low+bandHeight};
}

export function inTowerBreach(buildings,doors,x,y,z) {
  return !!doors?.towerBreaches?.length && buildings.some(b=>breachedFloor(b,x,z,y,doors)!=null);
}
