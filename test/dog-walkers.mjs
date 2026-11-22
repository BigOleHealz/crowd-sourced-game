import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,advanceRounds}=await import('../public/expedition.js');
const {newRivals,newLife,updateRival}=await import('../public/rivals.js');
const {newDogs,stepDogs,nearDog,carriedDog,takeDog,throwDog,kickDog,damageDog,removeDog}=await import('../public/dog-walkers.js');
const world=newExpedition(),npcs=newRivals({resort:true}),players=new Map();
world.dogs=newDogs(npcs);
assert.equal(world.dogs.length,3);
const [pip,biscuit,mango]=world.dogs;
assert(pip.maxHp<mango.maxHp && mango.maxHp<biscuit.maxHp);
const fern=npcs.find(n=>n.id===pip.walker);
let tick=0,walked=0;
function step(){
  for(const d of world.dogs)updateRival(npcs.find(n=>n.id===d.walker),tick,1/30,world.hp,world);
  stepDogs(world,npcs,players,1/30,tick++);
}
for(let i=0;i<380;i++){
  const {x,z}=pip;step();walked+=Math.hypot(pip.x-x,pip.z-z);
  for(const d of world.dogs){
    assert.equal(d.mode,'leashed');
    const s=npcs.find(n=>n.id===d.walker).state;
    assert(Math.hypot(d.x-s.x,d.z-s.z)<2.16,'Leash must have a believable span');
  }
}
assert(walked>2);
const actor=(id,x,z)=>({id,yaw:0,life:newLife(0,false),inputs:[],state:{x,y:.7,z,grounded:true}});
const a=actor(21,pip.x,pip.z),b=actor(22,pip.x+.1,pip.z);
players.set(a.id,a);players.set(b.id,b);
assert.equal(nearDog(world,{id:a.id,state:a.state}),pip,'Client may query with a snapshot');
assert(takeDog(world,a,pip));assert(!takeDog(world,b,pip));assert.equal(carriedDog(world,a.id),pip);
a.state={x:82,y:-.86,z:14,swimming:true};step();
assert(throwDog(world,a,{yaw:Math.PI/2,pitch:.42}));
for(let i=0;i<43;i++)step();
assert.equal(pip.mode,'swimming');assert(pip.x>85);
assert(removeDog(world,pip));assert(!removeDog(world,pip));
for(let i=0;i<1060;i++)step();
assert.equal(pip.mode,'leashed');
a.state={x:pip.x,y:pip.y,z:pip.z,grounded:true};
assert(takeDog(world,a,pip));world.rover.driver=a.id;step();assert.notEqual(pip.mode,'carried');world.rover.driver=null;
for(let i=0;i<75;i++)step();
a.state={x:pip.x,y:pip.y,z:pip.z,grounded:true};
const prev=pip.hp;assert(kickDog(world,a,pip,tick));assert.equal(pip.hp,prev-12);assert.equal(pip.lastHurtTick,tick);assert.equal(pip.kicker,a.id);assert.equal(pip.lastKickTick,tick);
for(let i=0;i<90;i++)step();
function shot(target,height,actorList){
  world.bullets=[{id:1000,weapon:1,shooter:a.id,x:target.x,y:target.y+height,z:target.z+1.15,vx:0,vy:0,vz:-56,left:20,age:0}];
  advanceRounds(world,players,actorList,tick++);
}
a.state={x:pip.x+5,y:pip.y,z:pip.z,grounded:true};b.state={x:pip.x+6,y:pip.y,z:pip.z,grounded:true};
const hp=pip.hp;shot(pip,.4*pip.size,[]);assert.equal(pip.hp,hp-25);assert.equal(pip.lastHurtTick,tick-1);
a.state={x:fern.state.x+2.1,y:fern.state.y,z:fern.state.z,grounded:true};
b.state={x:fern.state.x-1.2,y:fern.state.y,z:fern.state.z,grounded:true};
shot(fern.state,1.09,[fern]);assert.equal(fern.life.hp,75);assert.equal(pip.attacker,a.id);
for(let i=0;i<52;i++)step();assert(a.life.hp<100);assert.equal(b.life.hp,100);
a.life=newLife(tick,false);step();assert.equal(pip.attacker,undefined,'A new life cannot inherit an old chase');
a.state.x=fern.state.x+112;
shot(fern.state,1.09,[fern]);assert.equal(pip.attacker,a.id,'Distant confirmed shots trigger the same defense');
step();assert.equal(pip.mode,'defending');
players.delete(a.id);step();assert.equal(pip.attacker,undefined);
damageDog(pip,500,tick);assert.equal(pip.hp,0);assert.equal(pip.mode,'down');assert(!takeDog(world,a,pip));assert(!damageDog(pip,10,tick+1));
for(let i=0;i<184;i++)step();
assert.equal(pip.mode,'removed');
console.log('Three dogs follow actual walking routes, carry/throw/kick respect ownership, swimming and recovery work. Ballistic hits update health; the dog pursues and bites the confirmed shooter, spares bystanders and disengages on respawn.');
