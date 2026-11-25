import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition,advanceRounds}=await import('../public/expedition.js');
const {newLife}=await import('../public/rivals.js');
const {civilianLooks}=await import('../public/civilian-style.js');
const {firearmSpecs}=await import('../public/rounds.js');
for(const [id,look] of [[2,{height:1}],...Object.entries(civilianLooks)]){
  for(const weapon of [1,2,3,'turret']){
    for(const [height,critical] of [[1.69,true],[1.795,true],[1.22,false]]){
      const w=newExpedition(),actor={id,yaw:0,state:{x:10,z:12,y:100},life:newLife(0,false)};
      // Increase the fixture HP to measure the full damage of overkill shots.
      actor.life.hp=300;
      w.bullets.push({id:1,shooter:1,x:10,y:100+height*look.height,z:13,vx:0,vy:0,vz:-60,left:12,age:0,weapon});
      advanceRounds(w,typeof id==='number'?new Map([[id,actor]]):new Map(),typeof id==='string'?[actor]:[],2);
      const spec=firearmSpecs[weapon];
      assert.equal(w.shots.at(-1)?.headshot,critical,String(id)+' '+height);
      assert.equal(300-actor.life.hp,critical?(spec.headshotDamage??3*spec.damage):spec.damage);
    }
  }
}
console.log('PASS player and all 20 scaled civilians receive identical per-weapon head and torso damage.');
