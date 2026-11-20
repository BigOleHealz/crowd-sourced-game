import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {blocked,stepPlayer,groundHeight}=await import('../public/world.js');
const {inPalazzoMare}=await import('../public/palazzo-mare.js');
const world=newExpedition();
let player={x:48,z:-441,y:groundHeight(48,-441),grounded:true};
function walk(x,z,expectedY){
  for(let tick=0;tick<200;tick++){
    const dx=x-player.x,dz=z-player.z,dist=Math.hypot(dx,dz);
    if(dist<.10)break;
    player=stepPlayer(player,{x:dx/dist,z:dz/dist},1/30,world.hp,world);
    assert(player.grounded,'lost footing at '+JSON.stringify(player));
  }
  assert(Math.hypot(x-player.x,z-player.z)<.15,'blocked en route to '+[x,z]+' at '+JSON.stringify(player));
  assert(Math.abs(player.y-expectedY)<.035,'unexpected floor at '+[player.x,player.y,player.z]);
}
walk(37,-441,.87);walk(15.45,-441,.87);walk(15.45,-446.8,.87);
walk(26.1,-446.8,4.90);walk(26.1,-449.25,4.90);
walk(15.45,-449.25,8.70);walk(15.45,-445,8.70);walk(29,-445,8.70);
walk(31.2,-445,8.70); // Walk out onto the belvedere.
walk(29,-445,8.70);walk(15.45,-445,8.70);walk(15.45,-449.25,8.70);
walk(26.1,-449.25,4.90);walk(26.1,-446.8,4.90);
walk(26.1,-443,4.90);walk(32.6,-443,4.90);walk(32.6,-434.7,4.92);
walk(32.6,-443,4.90);walk(26.1,-443,4.90);walk(26.1,-446.8,4.90);
walk(15.45,-446.8,.87);walk(15.4,-441,.87);walk(15.4,-436,.8);
walk(15.4,-425,.8);walk(15.4,-419,.70);
assert.equal(inPalazzoMare(20,8.7,-445),true);
assert.equal(inPalazzoMare(20,11.7,-445),false);
assert(blocked(39.5,.87,-447,world.hp),'ground floor window');
assert(blocked(33.4,.87,-443.12,world.hp),'dining table');
assert(blocked(26.96,8.70,-448.48,world.hp),'bed');
// Jumping under the low penthouse ceiling must return the player to the suite.
player={x:22,y:8.70,z:-445,grounded:true};
for(let tick=0;tick<60;tick++){
  player=stepPlayer(player,{jump:tick===0},1/30,world.hp,world);
  assert(player.y<=9.66001);
}
assert(player.grounded && Math.abs(player.y-8.70)<.001);
console.log('PASS Palazzo Mare street, three furnished floors, both stair flights in both directions, two elevated terraces and pool exit');
