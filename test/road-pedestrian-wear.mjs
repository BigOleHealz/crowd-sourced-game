import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {newLife,vehicleContacts}=await import('../public/rivals.js');
const {parkedTrafficCar}=await import('../public/city-traffic.js');
const {civilianProfiles}=await import('../public/civilian-fleet.js');

for(const kind of ['rover','supercar',...Object.keys(civilianProfiles)]){
  const w=newExpedition();
  const road=w[kind]??parkedTrafficCar('test-'+kind,kind,0,0);
  if(!w[kind])w.traffic=[road];
  Object.assign(road,{x:0,z:0,y:1,yaw:0,driver:1});
  const rear=(kind==='rover'?1.75:kind==='supercar'?2.32:civilianProfiles[kind].halfLength);
  const state={x:0,z:rear+.12,y:1,grounded:true};
  const actor=id=>({id,inputs:[],state:{...state},life:newLife(0,false)});
  const driver=actor(1),visitor=actor(2),ped=actor('rival-test'),players=new Map([[1,driver],[2,visitor]]);
  const actors=[driver,visitor,ped];
  ped.state.x=10;
  const contact=(speed,tick)=>vehicleContacts(w,road.kind??'rover',{x:0,z:-speed/30,y:1},actors,tick,1/30,players);
  const full=road.hp;
  contact(.7,10);assert.equal(road.hp,full);
  contact(5,11);assert.equal(road.hp,full-1);assert.ok(visitor.life.hp<100);
  contact(5,12);assert.equal(road.hp,full-1);
  ped.state.x=0;contact(15,13);assert.equal(road.hp,full-2);assert.equal(ped.life.hp,0);
  assert.equal(driver.life.hp,100);
}
console.log('Player and civilian collisions cost one hull point each, across all road car profiles.');
