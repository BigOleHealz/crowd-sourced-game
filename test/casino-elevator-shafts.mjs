import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {blocked,stepPlayer}=await import('../public/world.js');
const {interiorPlans,buildingAction,ridingHotelShaft}=await import('../public/building-interiors.js');
const {advanceElevator,requestInterior}=await import('../interior-actions.js');
const {newExpedition}=await import('../public/expedition.js');
const world=newExpedition(),resorts=interiorPlans.filter(p=>p.shaft);
assert.deepEqual(resorts.map(p=>p.id),[25,141,143]);
const player={id:1,lastSeq:0,inputs:[],life:{hp:100}},players=new Map([[1,player]]);
let seq=0,tick=1,travel=0;
for(const resort of resorts){
  const {shaft,panels}=resort;
  const lobby=panels[0];
  for(const target of panels.slice(1)){
    for(const [from,to] of [[lobby,target],[target,lobby]]){
      for(const station of [from,to]){
        assert.deepEqual([station.x,station.z,station.angle],[shaft.frontX,shaft.frontZ,shaft.angle]);
        assert(blocked(station.x,station.y,station.z,world.hp,world.doors),'closed shaft face');
      }
      player.state={x:from.exitX,y:from.y,z:from.exitZ,grounded:true,vy:0};
      for(let i=0;i<20;i++)player.state=stepPlayer(player.state,{x:-shaft.nx,z:-shaft.nz},1/30,world.hp,world);
      assert((player.state.x-shaft.frontX)*shaft.nx+(player.state.z-shaft.frontZ)*shaft.nz>.12,'closed door stops capsule');
      assert.equal(buildingAction(player.state,world.doors)?.s,from);
      requestInterior(world,players,player,{seq:++seq,building:resort.id,floor:to.index},tick);
      const duration=player.trip.time;
      for(let elapsed=0;elapsed<duration;elapsed++){
        advanceElevator(world,player,tick+elapsed);
        assert.equal(ridingHotelShaft(player.state),shaft);
        if(elapsed>=9 && elapsed<=duration-9){
          assert.equal(player.state.x,shaft.x);assert.equal(player.state.z,shaft.z);
        }
      }
      tick+=duration;
      advanceElevator(world,player,tick);
      assert.equal(player.state.liftTravel,undefined);
      assert.deepEqual([player.state.x,player.state.y,player.state.z],[to.exitX,to.y,to.exitZ]);
      assert(!blocked(to.exitX,to.y,to.exitZ,world.hp,world.doors));
      travel++;
    }
  }
}
console.log('PASS',travel,'round-trip legs, closed door contacts, vertical cabin travel and correct landing on every casino and hotel storey');
