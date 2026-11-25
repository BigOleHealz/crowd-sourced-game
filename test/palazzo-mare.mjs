import {spiralRoute} from './fixtures/spiral-route.mjs';
import {mareSpiral} from '../public/residential-spirals.js';
import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {blocked,stepPlayer,groundHeight}=await import('../public/world.js');
const {inPalazzoMare}=await import('../public/palazzo-mare.js');
const world=newExpedition();
let player={x:48,z:-441,y:groundHeight(48,-441),grounded:true};
function walk(x,z,expectedY){
  for(let tick=0;tick<200;tick++){
    const dx=x-player.x,dz=z-player.z,dist=Math.hypot(dx,dz);
    if(dist<.060)break;
    player=stepPlayer(player,{x:dx/dist*Math.min(1,dist*4),z:dz/dist*Math.min(1,dist*4)},1/30,world.hp,world);
    assert(player.grounded,'lost footing at '+JSON.stringify(player));
  }
  assert(Math.hypot(x-player.x,z-player.z)<.15,'blocked en route to '+[x,z]+' at '+JSON.stringify(player));
  if(expectedY!==undefined)assert(Math.abs(player.y-expectedY)<.035,'unexpected floor at '+[player.x,player.y,player.z]);
}
const stairs=(up)=>{for(const [x,z] of spiralRoute(mareSpiral,up))walk(x,z);};
walk(37,-441,.87);walk(16.8,-441,.87);walk(16.8,-447.08,.87);
stairs(true);stairs(true);
walk(19,-444.0,8.70);walk(29,-444.0,8.70);walk(29,-445,8.70);walk(31.2,-445,8.70);
walk(29,-445,8.70);walk(29,-444.0,8.70);walk(19,-444.0,8.70);walk(19,-447.08,8.70);
stairs(false);
walk(18.6,-444.15,4.90);walk(26.1,-443,4.90);walk(32.6,-443,4.90);walk(32.6,-434.7,4.92);
walk(32.6,-443,4.90);walk(26.1,-443,4.90);walk(18.6,-444.15,4.90);walk(18.6,-447.08,4.90);
stairs(false);walk(16.8,-447.08,.87);walk(16.8,-441,.87);walk(15.4,-441,.87);walk(15.4,-436,.8);
walk(15.4,-425,.8);walk(15.4,-419,.70);
assert.equal(inPalazzoMare(20,8.7,-445),true);
assert.equal(inPalazzoMare(20,11.7,-445),false);
assert(blocked(39.5,.87,-447,world.hp),'ground floor window');
assert(blocked(33.4,.87,-443.12,world.hp),'dining table');
assert(blocked(26.96,8.70,-448.48,world.hp),'bed');
// Jumping under the low penthouse ceiling must return the player to the suite.
player={x:24.7,y:8.70,z:-444,grounded:true};
for(let tick=0;tick<60;tick++){
  player=stepPlayer(player,{jump:tick===0},1/30,world.hp,world);
  assert(player.y<=9.66001);
}
assert(player.grounded && Math.abs(player.y-8.70)<.001);
console.log('PASS Palazzo Mare street, three furnished floors, both stair flights in both directions, two elevated terraces and pool exit');
