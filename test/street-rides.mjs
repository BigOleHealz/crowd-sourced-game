import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {groundHeight,stepPlayer}=await import('../public/world.js');
const {boardRacks,takeRide,parkRide}=await import('../public/street-rides.js');
const {touchLayout}=await import('../public/touch-controls.js');
const world={rides:boardRacks(groundHeight)},board=world.rides[0];
const player={id:1,state:{...board,grounded:true}},second={id:2,state:{...board,grounded:true}};
takeRide(board,player);takeRide(board,second);assert.equal(board.rider,1);assert(!second.state.ride);
const step=(throttle,extra={})=>{player.state=stepPlayer(player.state,{throttle,...extra},1/30,undefined,undefined);};
for(let i=0;i<20;i++)step(1);
const speed=player.state.ride.speed;
assert(speed>2 && player.state.z<board.z);
step(0);assert(player.state.ride.speed<speed && player.state.ride.speed>.9*speed);
step(0,{jump:true});assert(!player.state.grounded && player.state.vy>0);
for(let i=0;i<35;i++)step(-1);
assert(player.state.grounded);assert.equal(player.state.ride.speed,0);
parkRide(world,player);assert.equal(board.rider,null);assert(!player.state.ride);

const dt=1/30,sim=(s,input={})=>stepPlayer(s,input,dt);
const close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} should equal ${b}`);
function ollie(start,steer){
  let s=start,apex=start.y;
  for(let i=0;i<17;i++){
    s=sim(s,{jump:i===0,steer:steer(i)});
    assert.equal(s.grounded,i===16);
    apex=Math.max(apex,s.y);
    close(s.x,start.x);
    close(s.z,start.z-(i+1)*dt*(start.ride.speed-.85*dt)*Math.cos(start.ride.yaw)*(start.ride.reverse?-1:1));
  }
  close(apex-start.y,.68);
  assert.equal(s.ride?.ollieTurn,undefined);
  return s;
}
for(const [x,z] of [[2,16],[43.5,-167]])for(const speed of [1.6,3.7,8.1])for(const yaw of [0,Math.PI]){
  const start={x,y:groundHeight(x,z),z,grounded:true,ride:{id:board.id,kind:'board',yaw,speed}};
  const straight=ollie(start,()=>0);
  assert(!straight.ride.reverse && !straight.skateBail);
  for(const side of [-1,1]){
    const halfTurn=ollie(start,()=>side);
    close(halfTurn.ride.yaw,yaw+side*Math.PI);
    assert(halfTurn.ride.reverse && !halfTurn.skateBail);
    close(halfTurn.ride.speed,straight.ride.speed);
    for(const steer of [i=>i>=5?side:0,i=>i>=4?side*.95:0]){
      const delayed=ollie(start,steer);
      close(delayed.ride.yaw,halfTurn.ride.yaw);
      assert(delayed.ride.reverse && !delayed.skateBail);
      close(delayed.ride.speed,straight.ride.speed);
    }
    const rolling=sim(halfTurn);
    assert(Math.sign(rolling.z-halfTurn.z)===Math.sign(straight.vz));
    const nextOllie=ollie(rolling,()=>-side);
    assert(!nextOllie.ride.reverse && !nextOllie.skateBail);
    for(const steer of [i=>i<6?side:0,i=>i>=5?side*.5:0]){
      const sideways=ollie(start,steer);
      if(speed<2.6){
        assert(sideways.ride && !sideways.skateBail);
        close(sideways.ride.speed,0);
      }else{
        close(sideways.skateBail.yaw,yaw+side*Math.PI/2);
        assert(!sideways.ride && sideways.skateBail.damage>=15);
        close(sideways.vz,straight.vz);
      }
    }
  }
}

const touch=touchLayout({role:'skateboard',active:true,jump:'Ollie'});
assert.equal(touch.axis,'Steer');assert(touch.quick.some(([code,label])=>code==='Space' && label==='Ollie'));
for(const [kind,x,z,expectedTicks,expectedHeight] of [['bike',43.5,-167,14,.5055555556],[null,2,16,22,1.21]]){
  const y=groundHeight(x,z);
  let s={x,y,z,grounded:true,...(kind && {ride:{kind,id:'bike',yaw:0,speed:3.7}})},apex=y;
  for(let i=0;i<expectedTicks;i++){
    s=sim(s,{jump:i===0});assert.equal(s.grounded,i===expectedTicks-1);apex=Math.max(apex,s.y);
  }
  close(apex-y,expectedHeight);
}
console.log('Higher street and park ollies, immediate and delayed full turns, touch steering, sideways wipeouts, and unchanged foot and bike jumps passed.');
