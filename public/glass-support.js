import {ruinedHouseAt} from './residential-sites.js';
import {towerCellBounds,towerCollapsed,towerStride} from './tower-damage.js';

export function glassSupportKey(doors){
  return (doors?.towerBreaches??[]).join(',')+'|'+(doors?.collapsedTowers??[]).join(',')+'|'+
    Object.keys(doors?.houseRuins??{}).join(',');
}

// A pane is one rigid sheet. If the structural cut intersects its opening,
// remove the sheet as a unit, even when a round enters outside the cut.
export function paneSupportLost(pane,doors,building=pane.owner??pane.face?.building){
  if(!building)return false;
  if(towerCollapsed(building,doors) || ruinedHouseAt(doors,building.x,building.z))return true;
  if(building.towerId==null || !doors?.towerBreaches?.length)return false;
  const x=pane.supportX??pane.x;
  const alongX=pane.yaw==null ? Number(pane.widthAxis==='x') : Math.cos(pane.yaw);
  const alongZ=pane.yaw==null ? Number(pane.widthAxis!=='x') : -Math.sin(pane.yaw);
  for(const id of doors.towerBreaches){
    if(Math.floor(id/towerStride)!==building.towerId)continue;
    const {x0,x1,y0,y1,z0,z1}=towerCellBounds(building,id);
    if(pane.top<=y0 || pane.bottom>=y1)continue;
    let lo=-pane.width/2+.002,hi=pane.width/2-.002;
    if(Math.abs(alongX)<1e-8){if(x<x0 || x>=x1)continue;}
    else{
      lo=Math.max(lo,((alongX>0?x0:x1)-x)/alongX);
      hi=Math.min(hi,((alongX>0?x1:x0)-x)/alongX);
    }
    if(Math.abs(alongZ)<1e-8){if(pane.z<z0 || pane.z>=z1)continue;}
    else{
      lo=Math.max(lo,((alongZ>0?z0:z1)-pane.z)/alongZ);
      hi=Math.min(hi,((alongZ>0?z1:z0)-pane.z)/alongZ);
    }
    if(lo<hi)return true;
  }
  return false;
}
