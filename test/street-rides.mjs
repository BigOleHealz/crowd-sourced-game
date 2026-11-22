import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {groundHeight,stepPlayer}=await import('../public/world.js');
const {boardRacks,takeRide,parkRide}=await import('../public/street-rides.js');
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
  let s=start;
  for(let i=0;i<14;i++){
    s=sim(s,{jump:i===0,steer:steer(i)});
    assert.equal(s.grounded,i===13);
    close(s.x,start.x);
    close(s.z,start.z-(i+1)*dt*(start.ride.speed-.85*dt)*Math.cos(start.ride.yaw)*(start.ride.reverse?-1:1));
  }
  return s;
}
for(const speed of [1.6,3.7,8.1])for(const yaw of [0,Math.PI]){
  const start={x:2,y:groundHeight(2,16),z:16,grounded:true,ride:{id:board.id,kind:'board',yaw,speed}};
  const straight=ollie(start,()=>0);
  assert(!straight.ride.reverse && !straight.skateBail);
  for(const side of [-1,1]){
    const halfTurn=ollie(start,()=>side);
    close(halfTurn.ride.yaw,yaw+side*Math.PI);
    assert(halfTurn.ride.reverse && !halfTurn.skateBail);
    close(halfTurn.ride.speed,straight.ride.speed);
    const rolling=sim(halfTurn);
    assert(Math.sign(rolling.z-halfTurn.z)===Math.sign(straight.vz));
    const nextOllie=ollie(rolling,()=>-side);
    assert(!nextOllie.ride.reverse && !nextOllie.skateBail);
    for(const steer of [i=>i<7?side:0,()=>side*.5]){
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
console.log('Skateboard push, brakes, ownership, both spin directions, fakie rollouts, slow sideways slides and fast wipeouts passed.');
