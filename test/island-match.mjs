import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {assignTeam,createMatch,propertyTeam,teamSpawn}=await import('../island-match.js');
const {groundHeight,blocked}=await import('../public/world.js');
const {newExpedition,advanceRounds,fire}=await import('../public/expedition.js');
const {auction,teams,goal}=await import('../public/island-rules.js');
const {newLife}=await import('../public/rivals.js');
const players=new Map();
for(let id=1;id<=16;id++){
  const seat=assignTeam(players);
  const p={...seat,id,state:teamSpawn(seat.team,seat.slot),life:newLife(0,false),fireReady:0,weapon:1,score:{team:seat.team}};
  assert.equal(propertyTeam(p.state.x,p.state.z),p.team);
  assert(!blocked(p.state.x,p.state.y,p.state.z,{}));
  players.set(id,p);
}
assert.equal(assignTeam(players),null);
const first=n=>new Map([...players].slice(0,n));
const [a,b]=players.values();
for(const mode of ['total-loss','repo-wars','moving-day']){
  const match=createMatch(mode),{state}=match;
  const minimum=mode==='total-loss'?2:10;
  match.updateRoster(first(minimum-1));assert.equal(state.phase,'waiting');
  match.damageLot(b.team,state.lots[0],500);assert.equal(state.lots[0].hp,120);
  match.updateRoster(first(minimum));
  for(const lot of state.lots){assert.equal(propertyTeam(lot.x,lot.z),lot.owner);assert(!blocked(lot.x,lot.y,lot.z,{}));}
  if(mode==='moving-day'){
    const jewel=state.lots.find(l=>l.owner===a.team && l.jewel);
    a.state={...jewel};match.interact(a);assert.equal(jewel.carrier,a.id);
    a.state={...teamSpawn(a.team,2)};match.step(players);
    const x=jewel.x;match.updateRoster(first(minimum-1));assert.equal(state.phase,'paused');
    match.updateRoster(players);
    for(let i=0;i<1799;i++)match.step(players);
    assert.equal(jewel.x,x);assert.equal(jewel.carrier,null);
  }
  assert.equal(state.phase,'active');
  match.updateRoster(first(minimum-1));assert.equal(state.phase,'paused');
  match.updateRoster(players);assert.equal(state.phase,'active');
  assert(!match.damageProperty(a.team,teamSpawn(a.team,0),'own','Own',500));
  assert(!match.damageProperty(a.team,auction,'neutral','Neutral',500));
  const lot=state.lots.find(l=>l.owner===b.team);
  match.damageLot(b.team,lot,500);assert.equal(lot.hp,120);
  if(mode==='repo-wars'){
    a.state={x:lot.x,y:lot.y,z:lot.z};match.interact(a);assert.equal(lot.carrier,a.id);
    match.release(a);assert.equal(lot.carrier,null);match.interact(a);
    a.state={...auction,y:groundHeight(auction.x,auction.z)};match.step(players);
    assert.equal(state.scores[a.team],lot.value);
    const w=newExpedition();
    Object.assign(w.supercar,auction,{driver:a.id,speed:0});
    match.step(players,w);
    const delivered=state.scores[a.team];
    assert.equal(delivered,lot.value+650_000);
    match.wreckVehicle(a.team,'supercar');match.step(players,w);
    assert.equal(state.scores[a.team],delivered,'auctioning and then wrecking cannot double-pay');
  }else{
    const w=newExpedition();w.match=state;w.rules=match;
    a.state={x:lot.x,y:lot.y,z:lot.z+2.5};a.fireReady=0;
    for(let i=0;i<80 && lot.hp;i++){
      fire(w,a,{aimYaw:0,aimPitch:0},i,players,[]);
      advanceRounds(w,new Map([[a.id,a]]),[],i);
    }
    assert.equal(lot.hp,0,'ordinary weapon hits the visible insured case');
    assert.equal(state.scores[a.team],lot.value);
  }
  const score=state.scores[a.team];match.damageLot(a.team,lot,999);assert.equal(state.scores[a.team],score);
  match.damageProperty(a.team,teamSpawn(b.team,0),'window','Glass',45_000);
  const bill=state.scores[a.team];assert.equal(bill-score,mode==='repo-wars'?22500:45000);
  match.damageProperty(a.team,teamSpawn(b.team,0),'window','Glass',45_000);assert.equal(state.scores[a.team],bill);
  for(const other of state.lots.filter(l=>l.owner===b.team))match.damageLot(a.team,other,1000);
  assert.equal(state.winner,a.team);assert(state.scores[a.team]>=goal);
  const result={...state.scores};match.wreckVehicle(b.team,'rover');assert.deepEqual(state.scores,result);
  for(let i=0;i<449;i++)assert.equal(match.step(players),false);
  assert.equal(match.step(players),true);
}
console.log('PASS balanced 8v8, safe spawns, minimum roster, all three scoring rules, real projectile impacts, pauses, auction, setup, wins and rematch timing.');
