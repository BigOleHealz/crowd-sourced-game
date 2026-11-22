export const marinaMode='marina-sprint';
// The northbound avenue joins both island bridges. The only turn is east
// at the yacht club, onto the road leading to the marina's east quay.
export const sprintStart={x:-2,z:15,name:'Mangle Café'};
export const sprintGates=[
  {x:0,z:-51,name:'North Causeway'},
  {x:0,z:-194,name:'Harbor Key'},
  {x:0,z:-271,name:'Lantern Bridge'},
  {x:0,z:-370,name:'Yacht Club · turn right'},
  {x:45,z:-370,name:'East Quay finish',east:true},
];
export const atGrid=car=>Math.abs(car.x-sprintStart.x)<=5 && Math.abs(car.z-sprintStart.z)<=4;
export function raceClock(ms){
  const cs=Math.floor(Math.max(0,ms)/10);
  return Math.floor(cs/6000)+':'+String(Math.floor(cs/100)%60).padStart(2,'0')+'.'+String(cs%100).padStart(2,'0');
}
export function createMarinaSprint(){
  const runs=new WeakMap(),drivers=new WeakMap(),bests=new WeakMap();
  let nextDriver=1,board=[];
  function start(player,car,now){
    if(!car || car.wrecked || car.bridgeFlight || !atGrid(car) || Math.abs(car.speed)>1 || !player.life.hp)return false;
    if(!drivers.has(player))drivers.set(player,nextDriver++);
    runs.set(player,{car,phase:'countdown',go:now+3000,next:0,elapsed:0});
    return true;
  }
  function update(player,car,now){
    const run=runs.get(player);
    if(!run)return;
    if(!car || run.car!==car || car.wrecked || !player.life.hp){runs.delete(player);return;}
    if(run.phase==='countdown'){
      if(!atGrid(car)){runs.delete(player);return;}
      run.elapsed=now-run.go;
      if(now<run.go)return;
      run.phase='racing';
    }
    if(run.phase!=='racing')return;
    run.elapsed=Math.round(now-run.go);
    const gate=sprintGates[run.next];
    if(Math.abs(car.x-gate.x)>(gate.east?3:5.5) || Math.abs(car.z-gate.z)>(gate.east?4.5:3))return;
    if(++run.next<sprintGates.length)return;
    run.phase='finished';
    const driver=drivers.get(player),previous=bests.get(player);
    if(previous===undefined || previous>run.elapsed){
      bests.set(player,run.elapsed);
      board=[...board.filter(row=>row.driver!==driver),{driver,time:run.elapsed}].sort((a,b)=>a.time-b.time || a.driver-b.driver).slice(0,10);
      return true;
    }
  }
  function state(player){
    const run=runs.get(player);
    return run && {phase:run.phase,next:run.next,elapsed:run.elapsed,driver:drivers.get(player),best:bests.get(player),message:run.message};
  }
  return {start,update,state,board:()=>board,run:player=>runs.get(player)};
}
