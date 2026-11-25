import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

if(process.env.GOY_THEFT_AUTO_MAP!=='brickell'){
  execFileSync(process.execPath,[fileURLToPath(import.meta.url)],{
    env:{...process.env,GOY_THEFT_AUTO_MAP:'brickell'},stdio:'inherit'});
}else{
  const {militaryFence,fenceDown,blastMilitaryFence}=await import('../public/military-island.js');
  const {newExpedition}=await import('../public/expedition.js');
  const {blocked}=await import('../public/world.js');
  const {roadContact}=await import('../public/road-contact.js');
  const {breakRoadObstacle}=await import('../public/road-obstacle-damage.js');
  const world=newExpedition();
  assert(militaryFence.length>100,'island perimeter has individual bays');
  assert.equal(new Set(militaryFence.map(b=>b.fenceId)).size,militaryFence.length);
  assert(!militaryFence.some(b=>b.x===-137 && b.z>-237 && b.z<-223),'bridge entrance remains open');
  const bay=militaryFence.find(b=>b.z===-301 && b.x>-230 && b.x<-220);
  const neighbor=militaryFence.find(b=>b.z===-301 && b.x>bay.x && b.x<bay.x+5);
  assert(bay && neighbor);
  assert(blocked(bay.x,.8,bay.z,world.hp,world.doors),'player cannot run through the fence');
  assert.equal(roadContact(world,bay.x,bay.z,0,bay.x,bay.z,world.rover)?.object.fenceId,bay.fenceId);
  assert.equal(breakRoadObstacle(world,world.rover,bay,0,-2,2,undefined),undefined,'slow truck cannot break through');
  assert.equal(breakRoadObstacle(world,world.rover,bay,0,-4,4,undefined),'fence');
  assert(fenceDown(world.doors,bay.fenceId));
  assert(!fenceDown(world.doors,neighbor.fenceId),'neighboring bay is intact');
  assert(!blocked(bay.x,.8,bay.z,world.hp,world.doors),'broken bay opens a player passage');
  assert(blocked(neighbor.x,.8,neighbor.z,world.hp,world.doors));
  assert.equal(breakRoadObstacle(world,world.tank,neighbor,0,-1,1,undefined),'fence','tank tracks crush a bay');
  const far=militaryFence.find(b=>b.z===-301 && b.x>bay.x+12);
  assert.equal(blastMilitaryFence(world.doors,{x:far.x,y:1.5,z:far.z},.4),1,'small blast breaks one bay');
  assert(!fenceDown(world.doors,bay.fenceId+'-other'));
  assert(!fenceDown(world.doors,militaryFence.at(-1).fenceId),'distant fence stays intact');
}
