import assert from 'node:assert/strict';
import {newExpedition} from '../public/expedition.js';
import {newRivals,updateRival} from '../public/rivals.js';
import {MAP,blocked,groundHeight,spawn} from '../public/world.js';
import {vehicleContact} from '../public/vehicle-contact.js';

const world=newExpedition(),rangers=newRivals();
assert.equal(new Set(rangers.map(r=>r.id)).size,20);
assert.equal(new Set(rangers.map(r=>r.name)).size,20);
assert.equal(rangers.length,20);
assert.equal(rangers.filter(r=>r.state.z< -38).length,10);

// Flood the dry, traversable region from the actual trailhead spawn. Check
// narrow bridge rails and the parked vehicles when walking between grid cells.
function dry(x,z) {
  const y=groundHeight(x,z);
  return y>MAP.waterY+.15 && !blocked(x,y,z,world.hp) && !vehicleContact(x,y,z,world,false).depth;
}
const start=spawn(),queue=[[Math.round(start.x),Math.round(start.z)]],visited=new Set(queue.map(String));
for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const X=x+dx,Z=z+dz,key=[X,Z].toString();
    if(Math.abs(X)>MAP.bounds || Z>MAP.bounds || Z<MAP.northBound || visited.has(key))continue;
    if(!dry(X,Z) || !dry(x+dx*.5,z+dz*.5))continue;
    visited.add(key);queue.push([X,Z]);
  }
}
for(const actor of rangers){
  const legs=new Set();
  for(const [x,z] of actor.route.points){
    assert(visited.has([Math.round(x),Math.round(z)].toString()),actor.name+' reachable from spawn at '+[x,z]);
  }
  for(let tick=0;tick<720;tick++){
    updateRival(actor,tick,1/30,world.hp,world);
    assert(actor.state.grounded && !actor.state.swimming,actor.name+' stays on dry ground');
    legs.add(actor.next);
  }
  assert.equal(legs.size,actor.route.points.length,actor.name+' completes the circuit');
}
console.log('PASS 20 unique, reachable rural NPCs, 10 on each side of the former north edge, each completing a dry patrol.');
