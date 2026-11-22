import assert from 'node:assert/strict';
import {compactAmbientView} from '../ambient-snapshot.js';
const actor={id:'dog-pip',x:-6.987654321,z:3.20198765,y:1.23412,yaw:.5432198765,vy:0,
  size:.87654321,hp:40,phase:'feeding',tick:12345,event:{x:1.0987654321},carrier:null};
const boat={...actor,id:'boat',driver:null,gunner:null,pitch:-.01434897654,roll:.002134590};
const occupied={...boat,driver:7},gunner={...boat,gunner:4},copilot={...boat,pilot:3};
const world={npcs:[actor],dogs:[actor],traffic:[boat,occupied],boats:[boat,gunner,copilot],sharks:[actor],doors:{angles:[.129876]}};
const original=structuredClone(world),view=compactAmbientView(world);
assert.deepEqual(world,original);assert.deepEqual(Object.keys(view),Object.keys(world));
for(const p of [view.dogs[0],view.npcs[0],view.traffic[0],view.boats[0]]){
  assert.equal(p.x,-6.988);assert.equal(p.yaw,.5432);assert.equal(p.tick,12345);
  assert.equal(p.size,actor.size);assert.deepEqual(p.event,actor.event);
  assert.deepEqual(Object.keys(p),Object.keys(p.id==='boat'?boat:actor));
}
assert.equal(view.boats[0].pitch,-.0143);
assert.deepEqual(view.traffic[1],occupied);assert.deepEqual(view.boats.slice(1),[gunner,copilot]);
assert.deepEqual(view.sharks,world.sharks);assert.deepEqual(view.doors,world.doors);
const partial=compactAmbientView({npcs:[],boats:[],traffic:[]});
assert(!Object.hasOwn(partial,'dogs'));
console.log('Ambient poses stay within 0.5 mm and 0.00005 radians. World state, occupied vehicles, schema and event payloads retain original precision.');
