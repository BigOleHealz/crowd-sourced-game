import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
if(!process.env.POST_TEST_MAP){
  for(const map of ['brickell','outpost']){
    const r=spawnSync(process.execPath,[process.argv[1]],{env:{...process.env,PINEWATCH_MAP:map,POST_TEST_MAP:map},stdio:'inherit'});
    assert.equal(r.status,0);
  }
}else{
  const {MAP,terrainHeight,buildingTopAt}=await import('../public/world.js');
  const {newExpedition,advanceRounds,advanceMissiles}=await import('../public/expedition.js');
  const {postContact}=await import('../public/rounds.js');
  const all=new Map(MAP.barriers.filter(p=>p.postId).map(p=>[p.postId,p]));
  assert(all.size>0);
  for(const p of all.values()){
    const w=newExpedition(),from={x:p.x,y:terrainHeight(p.x,p.z)+.95,z:p.z-.33};
    for(let i=0;i<3;i++){
      w.bullets.push({...from,id:1,weapon:1,shooter:1,age:0,vx:0,vy:0,vz:50,left:8});
      advanceRounds(w,new Map(),[],i);
    }
    assert.equal(w.doors.posts[p.postId],0,p.postId);
    assert.equal(postContact(w,from,{x:0,y:0,z:.8}).target,null);
    assert(buildingTopAt(p.x,p.z,0,from.y,w.doors)<from.y,p.postId+' clears movement');
    assert.equal(newExpedition().doors.posts,undefined);
  }
  const p=all.values().next().value,w=newExpedition();
  w.missiles=[{x:p.x,y:terrainHeight(p.x,p.z)+1.1,z:p.z+.35,source:'heli',yaw:0,pitch:0,remaining:8,shooter:71}];
  advanceMissiles(w,new Map(),[],0);
  assert.equal(w.doors.posts[p.postId],0);
  console.log('PASS',process.env.POST_TEST_MAP,all.size,'post assemblies, replicated damage, clearance, missile hit and reset');
}
