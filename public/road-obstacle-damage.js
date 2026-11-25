import {breakFrontage,shatterPane} from './frontage-glass.js';
import {noteGlass} from './pane-damage.js';
import {tipFurniture} from './shop-furniture.js';
import {damagePost,lampHP,postDown} from './street-lamps.js';
import {tankHull} from './tank-layout.js';
import {fellTree} from './tree-fall.js';
import {breakMilitaryFence} from './military-island.js';
import {noteWallBreak} from './tank-wall-cuts.js';

// Return the impact response only after the authoritative obstacle state changes.
// Tracks can push through from a standstill; wheeled vehicles need impact speed.
export function breakRoadObstacle(world,vehicle,object,vx,vz,incoming,team){
  const {doors}=world,tracks=vehicle.kind==='tank';
  if(!doors || incoming<=0 || !object)return;
  if(object.fenceId && (tracks || [world.rover,world.rover2,world.rover3].includes(vehicle) && incoming>2.5)){
    if(breakMilitaryFence(doors,object.fenceId))return 'fence';
  }
  if(tracks && object.treeId!=null && fellTree(doors,object,vx,vz,world.simTick))return 'tree';
  if((tracks || incoming>.12) && tipFurniture(doors,object.piece,vx,vz))return 'furniture';
  if((object.paneId || object.sillPaneId) && (tracks || incoming>2.3)){
    const sill=object.sillPaneId;
    const removedSill=sill && !doors.brokenSills?.[sill];
    if(removedSill)(doors.brokenSills??={})[sill]=true;
    const id=object.paneId??sill;
    const shattered=shatterPane(doors,{id,x:object.x,z:object.z,bottom:vehicle.y,top:vehicle.y+1.4});
    if(shattered)world.rules?.brokenPane(team,object,id);
    if(shattered || removedSill)return 'pane';
  }
  if((object.face || object.axis==='x') && (tracks || incoming>2.3)){
    const billed=world.rules && (id=>world.rules.brokenPane(team,vehicle,id));
    if(breakFrontage(doors,object,vehicle,billed,tracks?tankHull:undefined)){
      noteGlass(doors,{x:object.x,y:vehicle.y+.9,z:object.z});
      return 'frontage';
    }
  }
  const wood=object.woodId;
  if(wood!=null && !doors.beachWood?.[wood] && (tracks || incoming>(String(wood).startsWith('sign-')?1.1:2.5))){
    (doors.beachWood??={})[wood]=Math.round(Math.atan2(vx,vz)*1000)||1;
    noteWallBreak(doors,'wood',object.x,vehicle.y+.7,object.z);
    return 'wood';
  }
  if(object.net!=null && !doors.nets?.[object.net] && (tracks || incoming>.55)){
    (doors.nets??={})[object.net]=Math.sign(vz)||1;
    return 'net';
  }
  if((object.lamp!=null || object.postId!=null) && !postDown(doors,object) && (tracks || incoming>2.5)){
    damagePost(doors,object,lampHP);
    world.rules?.brokenPost(team,object);
    return 'post';
  }
  if(tracks && object.id && world.hp?.[object.id]>0){
    world.hp[object.id]=0;
    return 'supply';
  }
}
