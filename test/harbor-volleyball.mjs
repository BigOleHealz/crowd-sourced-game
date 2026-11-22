import assert from 'node:assert/strict';
import {createVolleyball} from '../harbor-volleyball.js';
import {courts,sandHeight} from '../public/beach-layout.js';
import {ballRadius,netTop,sampleVolleyball,spikeWindup,volleyballServiceSpot,volleyballStrikeKind} from '../public/volleyball-court.js';
import {volleyballHud} from '../public/volleyball-hud.js';
import {touchLayout} from '../public/touch-controls.js';

function fixture(){
  let now=0,seed=324;
  const game=createVolleyball((_,p)=>p.ready,()=>((seed=16807*seed%2147483647)/2147483647));
  const world={doors:{},volleyball:game.state};
  const players=new Map();
  const step=()=>{
    world.simTick=++now;
    game.step(world,players,now,1/30);
  };
  const until=(predicate,limit=720)=>{
    for(let i=0;i<limit && !predicate();i++)step();
    assert(predicate(),'expected state before tick '+now);
  };
  function player(id,court=0,slot=0){
    const player={id,ready:true};
    const move=({x,z})=>{player.state={x,y:sandHeight(x,z),z,grounded:true};};
    move(volleyballServiceSpot(courts[court],slot));
    players.set(id,player);
    return {player,move,request:action=>game.request(world,player,action,now)};
  }
  step();
  return {game,world,players,step,until,player};
}

{
  const {game,until}=fixture();
  let crossed=false;
  until(()=>{
    const [first,second]=game.state;
    crossed ||= first.hits>=4;
    return crossed && first.score.some(Boolean) && second.score.some(Boolean);
  });
}

{
  const {game,world,step,until,player}=fixture();
  const first=player(3),second=player(7,0,3),otherCourt=player(5,1,2);
  first.move({x:0,z:0});
  first.request('join');assert.equal(game.member(3),null,'cannot join from outside the court');
  first.move(volleyballServiceSpot(courts[0],0));
  first.request('strike');assert.equal(game.state[0].flight,null,'unseated clients cannot strike');
  first.request('join');second.request('join');otherCourt.request('join');
  const gameOne=world.volleyball[0];
  assert.deepEqual(gameOne.players,[3,null,null,7]);
  assert.equal(game.member(5).index,1);
  assert.equal(volleyballHud(world,first.player.state,3,true).action,'Serve');
  assert.deepEqual(touchLayout({role:'volleyball',active:true,use:'Leave volleyball',jump:'Serve'}).quick,
    [['KeyE','Leave volleyball'],['Space','Serve']]);
  second.request('strike');step();assert.equal(gameOne.phase,'serve','other team cannot serve');
  first.move({x:courts[0].x,z:courts[0].z-4});
  first.request('strike');step();assert.equal(gameOne.phase,'serve','serve requires back line');
  for(let i=0;i<12;i++)step();
  first.move(volleyballServiceSpot(courts[0],0));
  first.request('strike');step();assert.equal(gameOne.phase,'rally');
  const serve=gameOne.flight;
  const [x,,z]=serve.to;
  const fraction=(courts[0].z-serve.from[2])/(z-serve.from[2]);
  const crossing=sampleVolleyball(serve,serve.tick+serve.duration*fraction);
  assert(crossing.y>netTop(courts[0],crossing.x));
  assert.equal(volleyballHud(world,second.player.state,7,true).action,'Return');
  second.move({x,z});
  until(()=>volleyballHud(world,second.player.state,7,true).detail==='Return now');
  assert(!volleyballStrikeKind(courts[0],1,second.player.state,sampleVolleyball(serve,world.simTick)),'cue gives reaction time');
  second.request('strike');
  until(()=>gameOne.flight?.slot===3,10);
  assert.equal(gameOne.flight.slot,3,'human return');
  assert.equal(gameOne.swings[3].kind,'return');
  assert.equal(gameOne.score[0]+gameOne.score[1],0,'rally still active');
  until(()=>gameOne.phase==='point');
  assert.equal(gameOne.score[0]+gameOne.score[1],1);
  otherCourt.request('leave');assert.equal(game.member(5),null);
  first.move({x:54,z:courts[0].z-7});step();
  assert.equal(game.member(3),null,'walking away frees the slot');
  second.player.ready=false;step();
  assert.equal(game.member(7),null,'ineligible participants are replaced');
}

{
  const {game,world,step,player}=fixture();
  for(const slot of [0,1,2,3])player(slot+1,0,slot).request('join');
  assert.equal(world.volleyball[0].players.filter(Boolean).length,4);
  const extra=player(5);
  extra.request('join');assert.equal(game.member(5),null,'bounded roster');
  world.doors.nets=[1];
  step();
  assert.equal(world.volleyball[0].phase,'closed');
  assert.equal(world.volleyball[1].phase,'serve');
  assert(world.volleyball[0].players.every(id=>id==null));
  extra.request('join');assert.equal(game.member(5),null,'downed net prevents entry');
}

for(const kind of ['Dig','Spike']){
  const {game,world,step,until,player}=fixture();
  const server=player(1),receiver=player(2,0,2),court=courts[0],match=game.state[0];
  server.request('join');receiver.request('join');
  server.request('strike');step();
  const x=court.x-1,toZ=court.z+(kind==='Spike'?2.7:6.65),fromZ=court.z-3.0;
  const flight=match.flight={tick:world.simTick,duration:55,
    from:[x,sandHeight(x,fromZ)+2.92,fromZ],to:[x,sandHeight(x,toZ)+ballRadius,toZ],lift:2.6,slot:0};
  receiver.move({x,z:kind==='Spike'?court.z+1.4:toZ});
  const hud=()=>volleyballHud(world,receiver.player.state,2,true);
  until(()=>hud().detail===kind+' now',54);
  assert.equal(hud().action,kind);
  assert.deepEqual(touchLayout({role:'volleyball',active:true,jump:hud().action}).quick,[['Space',kind]]);
  receiver.request('strike');
  if(kind==='Spike'){
    assert.equal(match.flight,flight,'The jump winds up before contact');
    assert.equal(hud().detail,'Jumping for the spike');
    for(let i=1;i<spikeWindup;i++){step();assert.equal(match.flight,flight);}
  }
  until(()=>match.flight?.slot===2,10);
  const shot=match.flight;
  assert.equal(match.swings[2].kind,kind.toLowerCase());
  assert(kind==='Dig' ? shot.duration>flight.duration : shot.duration<flight.duration);
  const net=sampleVolleyball(shot,shot.tick+shot.duration*(court.z-shot.from[2])/(shot.to[2]-shot.from[2]));
  assert(net.y-ballRadius>netTop(court,net.x),'Both successful contacts clear the net');
  if(kind==='Dig')assert(shot.from[1]-sandHeight(shot.from[0],shot.from[2])<1.02);
  else assert(net.descending,'The spike comes down quickly across the net');
}

{
  const {game,world,until}=fixture(),moves=new Set();
  until(()=>{
    for(const match of game.state){
      if(match.flight?.tick===world.simTick)moves.add(match.swings[match.flight.slot]?.kind);
    }
    return moves.has('dig') && moves.has('spike');
  },5000);
}

console.log('PASS NPC rallies, independent courts, human serves, returns, digs and spikes, scoring, touch actions, roster limits, departures, and net failure.');
