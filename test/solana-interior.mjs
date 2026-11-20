import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {stepPlayer}=await import('../public/world.js');
const {stepYacht}=await import('../public/superyacht.js');
const {yachtPoint,yachtLocal,aboardYacht,yachtSolidAt}=await import('../public/yacht-layout.js');
const {mainSole,upperSole}=await import('../public/solana-interior.js');

const world=newExpedition(), yacht=world.yacht, dt=1/30;
const guest={id:2,state:{...yachtPoint(yacht,0,mainSole,9),grounded:true},yaw:0};
const people=new Map([[guest.id,guest]]);
const go=(input)=>guest.state=stepPlayer(guest.state,input,dt,world.hp,world);
function walk(x,z){
  const dest=yachtPoint(yacht,x,0,z);
  for(let i=0;i<240;i++){
    const dx=dest.x-guest.state.x,dz=dest.z-guest.state.z,d=Math.hypot(dx,dz);
    if(d<.13)return;
    go({x:dx/d,z:dz/d});
    assert(guest.state.onYacht && guest.state.grounded,'ordinary steps stay on deck');
  }
  assert.fail('blocked on way to '+[x,z]+' at '+JSON.stringify(yachtLocal(yacht,guest.state.x,guest.state.z)));
}
function onLevel(h){assert(Math.abs(guest.state.y-yacht.y-h)<.012);}
walk(0,-14.1);onLevel(mainSole); // helipad through both open doors to helm
walk(0,-5.2);
for(let i=0;i<45;i++){
  go({jump:i===0});assert(guest.state.y+1.8<=yacht.y+upperSole-.18+.001);
}
onLevel(mainSole);
walk(0,-1.2);walk(2.35,-1.2);walk(2.35,-7.55);onLevel(upperSole);
walk(0,-7.55);walk(0,.52);onLevel(upperSole); // aft upper terrace
walk(0,-7.55);walk(2.35,-7.55);walk(2.35,-1.2);onLevel(mainSole);
walk(0,-1.2);walk(0,-4);for(let i=0;i<12;i++)go({});
assert(aboardYacht(yacht,guest.state));
yacht.driver=1;
const start={...yacht},station=yachtLocal(yacht,guest.state.x,guest.state.z);
for(let i=0;i<220;i++){stepYacht(world,{throttle:1,steer:i>115?-.5:0},dt,people);go({});}
const moved=yachtLocal(yacht,guest.state.x,guest.state.z);
assert(Math.hypot(start.x-yacht.x,start.z-yacht.z)>20 && Math.abs(Math.sin(start.yaw-yacht.yaw))>.2);
assert(Math.hypot(moved.x-station.x,moved.z-station.z)<1e-7);
walk(0,-7.8);onLevel(mainSole);
const solid=(x,h,z)=>{const p=yachtPoint(yacht,x,h,z);return yachtSolidAt(yacht,p.x,p.y,p.z);};
assert(!solid(0,mainSole+1.5,-5));
assert(solid(-3.95,mainSole+1.5,-5));
assert(solid(-3.24,mainSole+.45,-3.65));
assert(solid(0,upperSole-.1,-5));
assert(!solid(0,mainSole+1.6,-11.85));
console.log('PASS main and upper deck doors, furnished salon, headroom, both directions on stairs, moving and turning cabin.');
