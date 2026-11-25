import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {bankSite,bankRoadZ,bankFront}=await import('../public/bank-site.js');
const {MAP}=await import('../public/world.js');
const {destinations,landmarkGuide}=await import('../public/landmark-navigation.js');
const {storefrontFaces}=await import('../public/frontage-glass.js');
const {breachTower,towerStride}=await import('../public/tower-damage.js');
const {createBank}=await import('../bank-claim.js');
const {harborTrade,newWallet}=await import('../harbor-trade.js');
const {atBankDesk,inBankLobby,bankDesk,bankPayout,bankCooldownSeconds,bankAlarmSeconds,bankHandoffSeconds,bankPrompt}=await import('../public/bank-rules.js');
const {newExpedition,advanceMissiles}=await import('../public/expedition.js');
const {createWanted}=await import('../public/wanted.js');
const {stepPatrolCruisers}=await import('../public/patrol-cruisers.js');
const {newLife,newRivals}=await import('../public/rivals.js');
const {newCityTraffic,syncTrafficDrivers}=await import('../public/city-traffic.js');
const {blocked}=await import('../public/world.js');

function branch(){
  const world=newExpedition(),players=new Map(),receipts=[],npcs=newRivals(),bank=createBank();
  world.traffic=newCityTraffic();syncTrafficDrivers(world,npcs);
  world.bank=bank.state;world.wanted=createWanted(world,players,{stepCruisers:stepPatrolCruisers});
  world.trading=harborTrade(world,(p,t,msg)=>receipts.push([p.id,msg]));
  function join(id){
    const p={id,life:newLife(0,false),wallet:newWallet(),state:{...bankDesk,grounded:true},yaw:0,score:{kills:0,deaths:0}};
    players.set(id,p);return p;
  }
  function act(p,action,tick,other={}){
    bank.request(world,p,{seq:(p.bankSeq??0)+1,serial:bank.state.serial,action,...other},tick);
  }
  return {world,players,bank,npcs,receipts,join,act,step:t=>bank.step(world,players,t)};
}
{
  const {world,bank,join,act,step,receipts}=branch(),p=join(1),other=join(2);
  assert.equal(MAP.buildings.filter(b=>b===bankSite).length,1);
  assert(!MAP.buildings.some(b=>b.towerId===5),'retired tower shell and storefronts');
  assert(!MAP.barriers.some(b=>Math.abs(b.x+19)<8 && Math.abs(b.z-43)<9.5 && b.bottom>40),'retired tower roof housing');
  assert(!MAP.buildings.some(b=>Math.abs(b.x-18)<b.w/2 && Math.abs(b.z-1.4)<b.d/2),'old building footprint is clear');
  assert(!storefrontFaces.some(f=>f.building===bankSite),'retired shop fronts do not cover the bank');
  assert(storefrontFaces.some(f=>f.name==='Vela' && f.building.towerId===7),'neighboring shops retain their identities');
  assert.deepEqual(destinations.get(bankSite.name),[-19,27]);
  assert.equal(landmarkGuide(bankSite.name)(bankSite.x,bankRoadZ,0).cue,'Arrived');
  assert(!inBankLobby({x:18,y:.824,z:.7}),'former helipad branch is vacant');
  assert(!inBankLobby({x:-20,y:.824,z:-35.7}),'former gallery has no bank encounter');
  assert(MAP.buildings.every(b=>b===bankSite || Math.abs(b.x-bankSite.x)>(b.w+bankSite.w)/2+2 ||
    Math.abs(b.z-bankSite.z)>(b.d+bankSite.d)/2+2),'separate parcel with walking clearance');
  world.doors.collapsedTowers=[3];step(0);assert.equal(bank.state.phase,'ready','old tower is independent');
  delete world.doors.collapsedTowers;
  assert(inBankLobby(p.state));assert(atBankDesk(p.state));assert(!blocked(p.state.x,p.state.y,p.state.z,world.hp,world.doors));
  assert(!atBankDesk({...p.state,y:3}));assert(!atBankDesk({...p.state,z:p.state.z+1.1}));
  assert.equal(bankPrompt(bank.state,p.id).action,'talk');
  for(const command of ['talk','start','cancel','collect'])act(p,command,1);
  assert.equal(bank.state.phase,'ready','speaking or legacy floor trigger cannot start a robbery');
  act(p,'rob',2);act(other,'rob',2,{pursuit:true});
  assert.equal(bank.state.claimant,p.id);assert.equal(bank.state.phase,'alarm');assert(!bank.state.pursuit);
  assert(!world.wanted.session(other),'losing a concurrent request cannot enable pursuit');
  act(p,'collect',3);assert.equal(p.wallet.cash,0);
  const open=2+30*bankAlarmSeconds;step(open-1);assert.equal(bank.state.phase,'alarm');
  p.state.z-=1.2;step(open);assert.equal(bank.state.phase,'handoff','free to move around the lobby');
  const late=join(3);
  assert.equal(bankPrompt(bank.state,late.id).action,null);assert.equal(bankPrompt(bank.state,p.id).action,'collect');
  act(late,'collect',open);act(p,'collect',open);assert.equal(p.wallet.cash,0,'wrong person or out of reach');
  p.state.z=bankDesk.z;act(p,'collect',open,{serial:0});assert.equal(p.wallet.cash,0);
  const seq=p.bankSeq;act(p,'collect',open,{seq});assert.equal(p.wallet.cash,0,'duplicate seq');
  act(p,'collect',open);act(p,'collect',open+1);step(open+2);
  assert.deepEqual(receipts,[[1,'Bank payout +$150.']]);assert.equal(p.wallet.cash,bankPayout);
  assert.equal(bank.state.phase,'cooldown');assert.equal(bank.state.outcome,'collected');assert(!world.wanted.session(p));
  const reopen=open+30*bankCooldownSeconds;step(reopen-1);assert.equal(bank.state.seconds,1);
  act(other,'rob',reopen-1);assert.equal(bank.state.claimant,null);step(reopen);
  act(p,'rob',reopen,{serial:0});assert.equal(bank.state.phase,'ready','stale confirmation');
  act(other,'rob',reopen);assert.equal(bank.state.serial,2);assert.equal(bank.state.claimant,2);
}
{
  const {world,bank,join,act,step,players,receipts}=branch(),p=join(1);
  let tick=0;
  for(const cause of ['depart','defeat','disconnect','timeout','collapse']){
    act(p,'rob',tick);assert.equal(bank.state.phase,'alarm');
    if(cause==='depart')p.state.z=-45;
    if(cause==='defeat')p.life.hp=0;
    if(cause==='disconnect'){bank.leave(p,tick);players.delete(p.id);join(p.id);}
    if(cause==='timeout'){tick+=30*bankAlarmSeconds;step(tick);tick+=30*bankHandoffSeconds;}
    if(cause==='collapse'){
      for(let i=0;i<16;i++)breachTower(MAP.buildings,world.doors,{
        x:bankSite.x+bankSite.w*((i%4+.5)/4-.5),z:bankFront+bankSite.d*(Math.floor(i/4)+.5)/4,y:2});
      assert.deepEqual(world.doors.collapsedTowers,[bankSite.towerId]);
    }
    step(++tick);
    assert.equal(bank.state.phase,cause==='collapse'?'closed':'cooldown',cause);
    assert.equal(bank.state.outcome,'aborted');assert.equal(bank.state.claimant,null);assert.equal(receipts.length,0);
    p.state.z=bankDesk.z;p.life.hp=100;players.set(p.id,p);delete world.doors.collapsedTowers;
    tick+=30*12;step(tick);assert.equal(bank.state.phase,'ready');
  }
  world.jet.pilot=p.id;act(p,'rob',tick,{pursuit:true});assert.equal(bank.state.phase,'ready');assert(!world.wanted.session(p));
}
{
  const {world,bank,join,act,step,players,npcs}=branch(),p=join(1),observer=join(2);
  observer.state={...observer.state,x:-18,z:-40};
  act(p,'rob',0,{pursuit:true});assert.equal(world.wanted.view(p,0).stars,3);
  let approach,parked=false;
  for(let t=1;t<=bankAlarmSeconds*30;t++){
    world.wanted.step(npcs,t);step(t);
    const car=world.patrolCars?.[0];
    if(car){
      assert(car.patrol && car.targetId===p.id);
      approach??={x:car.x,z:car.z};
      if(!car.npcDriver && Math.hypot(car.x-bankDesk.x,car.z-bankRoadZ)<5){
        parked=true;
        assert(Math.hypot(car.x-approach.x,car.z-approach.z)>13);
      }
    }
  }
  assert(parked,'marked cruiser drives in and its officer dismounts in front before cash is ready');
  assert(npcs.some(n=>n.officer && n.targetId===p.id && !n.cruiserId));
  assert(!npcs.some(n=>n.officer && n.targetId===observer.id));
  assert.equal(observer.life.hp,100);assert.equal(world.wanted.view(observer,240).enabled,false);
  act(p,'collect',241);assert.equal(bank.state.outcome,'collected');
  p.state.z=bankFront-1;world.wanted.step(npcs,242);assert.equal(world.wanted.view(p,242).phase,'pursuit');
  assert(npcs.some(n=>n.officer && n.targetId===p.id));
  world.wanted.set(p,false);assert(!world.patrolCars);
  assert.equal(world.wanted.view(p,242).enabled,false);assert(!npcs.some(n=>n.officer));
  players.delete(p.id);
}
{
  const {world,bank,join,act,step}=branch(),p=join(1);
  world.wanted.set(p,true);act(p,'rob',0);
  assert(bank.state.pursuit,'prior opt-in is respected');
  world.wanted.set(p,false);step(1);assert(!bank.state.pursuit);
  world.wanted.set(p,true);step(2);assert(!bank.state.pursuit,'fresh opt-in cannot revive a recalled dispatch');
  assert.equal(world.wanted.view(p,2).stars,0);
}
{
  const {world}=branch();
  world.missiles.push({id:1,source:'rover',shooter:9,x:bankSite.x-bankSite.w/2-2.8,
    y:2,z:bankSite.z+1,yaw:Math.PI/2,pitch:0,remaining:30});
  for(let t=0;t<60 && world.missiles.length;t++)advanceMissiles(world,new Map(),[],t);
  assert.equal(Math.floor(world.doors.towerBreaches?.[0]/towerStride),bankSite.towerId,'street strike hits the independent bank shell');
}
console.log('PASS explicit teller choice, exclusive phased handoff, one wallet receipt, shared cooldown, aborts, late joins and marked patrol arrival with independent pursuit preferences');
