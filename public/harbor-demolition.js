import {houseAtPoint} from './residential-sites.js';
import {houseSupportCells,houseLostSupport} from './house-support.js';
import {cutGrid,openTankWall,noteWallBreak} from './tank-wall-cuts.js';
import {ramHouse} from './residential-falls.js';

// Launcher impacts use the same lower-wall cells and support budget as tracks.
// Restrict the cut to the struck facade: the nearby opposite wall and upper
// storeys stay intact until later impacts remove their own support.
export function breachHarborHouse(doors,at,direction,radius=2.15){
  const home=houseAtPoint(at.x,at.z,.55);
  if(!home?.id.startsWith('harbor-') || doors.houseRuins?.[home.id] ||
    at.y<cutGrid.low-.45 || at.y>cutGrid.high+.45)return null;
  const radius2=radius*radius,removed=[];
  for(const cell of houseSupportCells(home.id)){
    const x=cutGrid.west+(cell%cutGrid.width+.5)*cutGrid.size;
    const z=cutGrid.north+(Math.floor(cell/cutGrid.width)+.5)*cutGrid.size;
    if((x-at.x)**2+(z-at.z)**2>radius2 || !openTankWall(doors,cell))continue;
    removed.push(cell);
  }
  if(!removed.length)return null;
  noteWallBreak(doors,home.parts[0].finish==='clapboard'||home.parts[0].finish==='batten'?'wood':'concrete',at.x,at.y,at.z);
  const collapsed=houseLostSupport(doors,home.id) &&
    ramHouse(doors,home.id,at.x,at.z,direction.x,direction.z);
  return {home:home.id,cells:removed,collapsed};
}
