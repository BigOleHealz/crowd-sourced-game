import {courts,sandHeight} from './public/beach-layout.js';
import {atVolleyballCourt,ballRadius,canReturnVolleyball,canServeVolleyball,courtHalfLength,courtHalfWidth,
  courtSide,nearbyVolleyballCourt,netTop,sampleVolleyball,sideSign,slotSide,volleyballMember,
  volleyballServiceSpot} from './public/volleyball-court.js';

const pointsToWin=11,pointPause=66,npcServeDelay=62,humanServeDelay=435;
const athleteNames=['Mina','Nico','Rafa','Camila','Lea','Sam','Cleo','Marcos'];
const slots=[0,1,2,3];
const teamSlots=side=>slots.slice(2*side,2*side+2);
const clamp=(n,low,high)=>Math.max(low,Math.min(high,n));
const restSpot=(court,slot)=>({x:court.x+(slot%2?1.93:-1.93),z:court.z+sideSign(slotSide(slot))*4.45});

export function createVolleyball(eligible,random=Math.random){
  const state=courts.map((court,index)=>({
    phase:'serve',score:[0,0],players:Array(4).fill(null),swings:Array(4).fill(null),
    athletes:slots.map(slot=>{
      const {x,z}=restSpot(court,slot);
      return {id:'volley-'+index+'-'+slot,name:athleteNames[4*index+slot],slot,
        x,z,y:sandHeight(x,z),yaw:slotSide(slot)?0:Math.PI,moving:false,sprint:false,grounded:true};
    }),
    server:index*2,flight:null,until:0,hits:0,
  }));
  const pending=new Map(),cooldown=new Map();

  function prepare(game,side,tick){
    const team=teamSlots(side);
    const humans=team.filter(slot=>game.players[slot]!=null);
    const choices=humans.length?humans:team;
    game.server=choices[(game.score[0]+game.score[1])%choices.length];
    game.phase='serve';game.flight=null;game.hits=0;game.reason=null;game.winner=null;
    game.drop=null;
    game.until=tick+(humans.length?humanServeDelay:npcServeDelay);
  }

  function point(game,winner,reason,tick,ball){
    game.score[winner]++;
    game.winner=winner;game.reason=reason;
    const high=game.score[winner],lead=high-game.score[1-winner];
    game.phase=high>=pointsToWin && (lead>=2 || high>=15)?'game':'point';
    game.until=tick+(game.phase==='game'?150:pointPause);
    game.flight=null;
    game.drop=ball?{x:ball.x,y:ball.y,z:ball.z,tick}:null;
  }

  function launch(court,game,slot,feet,tick,kind,npc,contact){
    const side=slotSide(slot),sign=sideSign(side),opponent=1-side;
    const rotation=2*random()-1;
    const opponents=teamSlots(opponent);
    const humanLane=opponents.find(s=>game.players[s]!=null);
    const xLane=humanLane!=null && random()<.82 ? (humanLane%2?1:-1) : (random()<.5?-1:1);
    let toX=court.x+xLane*(1.25+random()*2.25),toZ=court.z-sign*(2.2+random()*5.02);
    let lift=kind==='serve'?3.25:2.24;
    if(npc && game.hits>=5 && random()<(game.players.every(id=>id==null)?.59:.38)){
      if(rotation>-.40)toZ=court.z-sign*(courtHalfLength+.4+random()*1.4);
      else lift=.25;
    }
    const from=contact?[contact.x,contact.y,contact.z]:[feet.x,feet.y+1.91,feet.z-sign*.24];
    game.flight={tick,duration:kind==='serve'?52:44,
      from,to:[toX,sandHeight(toX,toZ)+ballRadius,toZ],lift,slot};
    game.swings[slot]={tick,kind,x:toX,z:toZ};
    game.phase='rally';game.hits++;
  }

  function receiveSlot(court,game){
    return 2*(1-slotSide(game.flight.slot))+Number(game.flight.to[0]>=court.x);
  }

  function moveAthlete(court,game,slot,tick,dt){
    const athlete=game.athletes[slot];
    const home=restSpot(court,slot);
    let target=home,watch={x:court.x,z:court.z};
    if(game.phase==='serve' && game.server===slot)target=volleyballServiceSpot(court,slot);
    if(game.phase==='rally'){
      const shot=game.flight;
      const ball=sampleVolleyball(shot,tick);
      watch=ball;
      if(slot===receiveSlot(court,game)){
        target={x:clamp(shot.to[0],court.x-4.12,court.x+4.12),z:clamp(shot.to[2],court.z-8.25,court.z+8.25)};
      }
    }
    const dx=target.x-athlete.x,dz=target.z-athlete.z,distance=Math.hypot(dx,dz);
    const travel=Math.min(distance,dt*(distance>1.6?5.9:3.6));
    if(distance>.004){
      athlete.x+=dx/distance*travel;
      athlete.z+=dz/distance*travel;
    }
    athlete.y=sandHeight(athlete.x,athlete.z);
    athlete.moving=distance>.045;athlete.sprint=distance>2;
    athlete.yaw=athlete.moving?Math.atan2(dx,-dz):Math.atan2(watch.x-athlete.x,athlete.z-watch.z);
  }

  function leave(id,tick){
    const member=volleyballMember(state,id);
    if(!member)return;
    const {state:game,slot,court}=member;
    game.players[slot]=null;game.swings[slot]=null;
    pending.delete(id);cooldown.delete(id);
    const {x,z}=restSpot(court,slot);
    Object.assign(game.athletes[slot],{x,y:sandHeight(x,z),z,moving:false,sprint:false});
    if(game.phase==='serve' && game.server===slot)game.until=tick+npcServeDelay;
  }

  function request(world,player,action,tick){
    const {id,state:feet}=player;
    const member=volleyballMember(state,id);
    if(action==='leave'){leave(id,tick);return;}
    if(!eligible(world,player))return;
    if(action==='join' && !member){
      const index=nearbyVolleyballCourt(state,feet);
      if(index<0 || world.doors.nets?.[index])return;
      const game=state[index],court=courts[index];
      const side=courtSide(court,feet.z);
      const preferred=side*2+Number(feet.x>=court.x);
      const slot=[preferred,preferred^1,preferred^2,preferred^3].find(i=>game.players[i]==null);
      if(slot==null)return;
      const first=game.players.every(id=>id==null);
      game.players[slot]=id;game.swings[slot]=null;
      if(first)prepare(game,slotSide(slot),tick);
      return;
    }
    if(action==='strike' && member && tick>=(cooldown.get(id)??0)){
      if(member.state.phase!=='serve' && member.state.phase!=='rally')return;
      cooldown.set(id,tick+10);
      pending.set(id,tick+7);
    }
  }

  function stepCourt(world,players,court,game,index,tick,dt){
    if(world.doors.nets?.[index]){
      for(const id of game.players)if(id!=null)leave(id,tick);
      game.phase='closed';game.flight=null;game.drop=null;
      return;
    }
    if(!game.until || game.phase==='closed')prepare(game,index,tick);
    for(const slot of slots){
      const id=game.players[slot],player=players.get(id);
      if(id!=null && (!player || !eligible(world,player) || !atVolleyballCourt(player.state,court,3.1)))leave(id,tick);
      if(game.players[slot]==null)moveAthlete(court,game,slot,tick,dt);
    }
    if(game.phase==='game' || game.phase==='point'){
      if(tick<game.until)return;
      if(game.phase==='game')game.score=[0,0];
      prepare(game,game.winner,tick);
      return;
    }
    if(game.phase==='serve'){
      const slot=game.server,id=game.players[slot],side=slotSide(slot);
      if(id==null){
        const athlete=game.athletes[slot],spot=volleyballServiceSpot(court,slot);
        if(tick>=game.until && Math.hypot(athlete.x-spot.x,athlete.z-spot.z)<.18)
          launch(court,game,slot,athlete,tick,'serve',true);
      }else if(pending.get(id)>=tick && canServeVolleyball(court,slot,players.get(id).state)){
        pending.delete(id);launch(court,game,slot,players.get(id).state,tick,'serve',false);
      }else if(tick>=game.until)point(game,1-side,'Time violation',tick);
      return;
    }
    const shot=game.flight,last=slotSide(shot.slot),ball=sampleVolleyball(shot,tick);
    const netFraction=(court.z-shot.from[2])/(shot.to[2]-shot.from[2]);
    const netTick=shot.tick+netFraction*shot.duration;
    if(netFraction>0 && netFraction<1 && tick>=netTick && tick-1<netTick){
      const crossing=sampleVolleyball(shot,netTick);
      if(Math.abs(crossing.x-court.x)<=4.28 && crossing.y-ballRadius<netTop(court,crossing.x)){
        point(game,1-last,'Into the net',tick,crossing);
        return;
      }
    }
    const receiver=1-last;
    for(const slot of teamSlots(receiver)){
      const id=game.players[slot];
      if(id==null || (pending.get(id)??-1)<tick)continue;
      if(canReturnVolleyball(court,receiver,players.get(id).state,ball)){
        pending.delete(id);launch(court,game,slot,players.get(id).state,tick,'return',false,ball);
        return;
      }
    }
    const slot=receiveSlot(court,game),athlete=game.athletes[slot];
    const landingIn=Math.abs(shot.to[0]-court.x)<=courtHalfWidth &&
      Math.abs(shot.to[2]-court.z)<=courtHalfLength;
    if(game.players[slot]==null && landingIn && ball.y-athlete.y<1.92 && canReturnVolleyball(court,receiver,athlete,ball)){
      launch(court,game,slot,athlete,tick,'return',true,ball);
    }else if(tick>=shot.tick+shot.duration){
      point(game,landingIn?last:receiver,landingIn?'Ball down':'Out',tick,ball);
    }
  }

  function step(world,players,tick,dt){
    for(const [index,court] of courts.entries())stepCourt(world,players,court,state[index],index,tick,dt);
  }
  return {state,request,leave,step,member:id=>volleyballMember(state,id)};
}
