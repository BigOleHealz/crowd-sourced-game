import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {damageActor,healthView}=await import('../public/rivals.js');
const {localWorldReactions}=await import('../public/pedestrian-reactions.js');
const {addClubResidents,stepClubResidents,clubAppearance,staffAtWork,canServeDrink}=await import('../club-residents.js');

for(const [venue,victim,source] of [['beach','beach-club-0',[45,-208]],['lucero','lucero-luz',[-71,15]]]){
  const world=newExpedition(),people=[],players=new Map();
  addClubResidents(world,people);
  const cast=people.filter(n=>n.venue===venue),target=cast.find(n=>n.id===victim);
  assert.equal(new Set(people.map(n=>n.id)).size,10);
  const starts=new Map(cast.map(n=>[n.id,{...n.state}]));
  const distance=n=>Math.hypot(n.state.x-starts.get(n.id).x,n.state.z-starts.get(n.id).z);
  const moved=new Set();
  damageActor(target,12,5);
  world.shots.push({id:'test',weapon:'muzzle',from:{x:source[0],y:1,z:source[1]}});
  localWorldReactions(world,people,5,players);
  for(const n of cast)assert.equal(n.reaction?.type,'gunfire');
  const guest={id:1,state:{},life:{hp:100}};
  players.set(guest.id,guest);
  if(venue==='beach')guest.beachOrder={tick:5,drink:'lime'};
  else guest.clubSince=5;
  if(venue==='beach')assert(!canServeDrink(world,'lime'));
  else assert(!staffAtWork(world,'lucero-daniel'));
  for(let tick=6;tick<1800;tick++){
    stepClubResidents(world,players,tick,1/30);
    for(const n of cast)if(n.reaction && distance(n)>.35){
      moved.add(n.id);
      const pose=clubAppearance(n);
      assert(!pose.beachRole && !pose.performer);
    }
  }
  assert(!guest.beachOrder && guest.clubSince==null,'interrupted bar and booth service ends');
  assert.equal(moved.size,cast.length,'all venue members flee the threat');
  assert(cast.every(n=>n.onDuty && !n.escapeTrail && !n.reaction));
  assert.equal(target.life.hp,88);
  assert(canServeDrink(world,'lime') && staffAtWork(world,'lucero-daniel'));
  damageActor(target,100,1800,{x:0,z:1});
  assert(healthView(target,1800).dead);
  assert(!staffAtWork(world,victim));
  for(let tick=1801;tick<1980;tick++)stepClubResidents(world,players,tick,1/30);
  assert.equal(target.life.hp,100);
  assert(staffAtWork(world,victim));
  assert(distance(target)<.01);
}
console.log('PASS all ten venue actors flee, return, resume work and use normal damage, defeat and respawn.');
