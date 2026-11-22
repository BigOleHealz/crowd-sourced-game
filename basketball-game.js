import {
  basketballCourt as court,basketballTeams,basketballUse,basketballRadius as radius,
  basketballChargeRate as chargeRate,hoop,hoopHeading,longShotDistance,onBasketballCourt,shotWindow,inDunkRange,
} from './public/basketball-layout.js';

import {dunkFrame,dunkRelease} from './public/basketball-dunk.js';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const gravity=11.8;
const npcSpots=[[-1.6,-1.3],[2.1,.6],[-2.9,2.6],[3.2,-1.6],[1,1.9],[-2.9,-.34]];

function ballInHand(ball,feet,yaw) {
  Object.assign(ball,{x:feet.x+.43*Math.sin(yaw),y:feet.y+1.34,z:feet.z-.43*Math.cos(yaw)});
}

export function createBasketball(world,players) {
  const npcs=basketballTeams.map((team,side)=>({
    id:team.npc,name:team.player,x:court.x+(side?2.7:-2.7),y:court.y,
    z:court.z+(side?3.8:.70),yaw:0,moving:false,grounded:true,hp:100,
  }));
  const ball={x:court.x,y:court.y+radius,z:court.z,spin:0,serial:0};
  const state={players:[null,null],scores:[0,0],turn:0,phase:'held',charge:0,npcs,ball,shot:null,result:null};
  let elapsed=0,attempt=0,holding=false,inputAge=0,inputDown=false,resolved=false,reachReady=1.15;
  let vx=0,vy=0,vz=0,shotPoints=0;
  const active=side=>players.get(state.players[side]);
  const actor=side=>active(side)?.state??npcs[side];

  function possession(side) {
    state.turn=side;state.phase='held';state.shot=null;state.charge=0;
    elapsed=0;holding=false;inputDown=false;inputAge=0;reachReady=1.15;
    delete state.reach;delete state.steal;
    ball.serial++;
    const feet=actor(side);
    ballInHand(ball,feet,hoopHeading(feet));
  }
  possession(0);

  function interact(player,role) {
    const side=state.players.indexOf(player.id);
    if(role==='leave' && side>=0){
      state.players[side]=null;
      if(state.phase==='held' && state.turn===side)possession(side);
      return;
    }
    if(role!=='join' || side>=0 || !basketballUse(world,player.state,player.id) ||
      !player.life.hp || player.life.fall || player.clubSince!=null)return;
    const slot=state.players.indexOf(null),first=state.players.every(id=>id==null);
    state.players[slot]=player.id;
    // Incoming shots finish before switching to the walk-up player's turn.
    if(state.phase==='held' && (first || state.turn===slot))possession(slot);
  }

  function input(player,cmd) {
    if(state.players[state.turn]!==player.id || state.phase!=='held')return;
    inputDown=cmd.hoopShot;
    inputAge=0;
  }

  function release(feet,yaw,power,assist=false) {
    attempt++;
    const {center,halfWidth}=shotWindow(feet);
    const error=power-center,rate=Math.abs(error)/halfWidth;
    const forward=hoopHeading(feet);
    const angle=assist?0:Math.atan2(Math.sin(yaw-forward),Math.cos(yaw-forward));
    const aimError=Math.max(0,Math.abs(angle)-.19)*Math.sign(angle);
    elapsed=0;holding=false;resolved=false;state.charge=0;
    state.phase='flight';state.shot={side:state.turn,age:0};
    if(inDunkRange(feet)){
      // Outside the gold window, the ball catches the side of the rim.
      const offset=rate<=1?error*.40:Math.sign(error)*Math.min(.32,.18+(rate-1)*.065);
      Object.assign(state.shot,{kind:'dunk',actorId:state.players[state.turn]??npcs[state.turn].id,
        x:feet.x,y:feet.y,z:feet.z,yaw:forward,offset,timing:rate<=1?'In gold':error<0?'Early':'Late'});
      Object.assign(ball,dunkFrame(state.shot,0).hand);
      vx=0;vy=-3.9;vz=0;shotPoints=2;return;
    }
    // This parabola crosses rim height on its way down.
    const dist=Math.hypot(hoop.x-feet.x,hoop.z-feet.z),flight=1.08+dist*.055;
    ballInHand(ball,feet,forward+angle);
    ball.y=feet.y+1.96;
    const longError=rate<=1?error*.50:Math.sign(error)*(.07+(rate-1)*.36);
    const missX=(hoop.x-feet.x)*longError/Math.max(.35,dist)+Math.cos(forward)*aimError*Math.max(1,dist);
    const missZ=(hoop.z-feet.z)*longError/Math.max(.35,dist)+Math.sin(forward)*aimError*Math.max(1,dist);
    vx=(hoop.x+missX-ball.x)/flight;
    vz=(hoop.z+missZ-ball.z)/flight;
    vy=(hoop.y-ball.y)/flight+gravity*flight*.5;
    shotPoints=dist>=longShotDistance?3:2;
  }

  function resolve(made) {
    resolved=true;
    const points=made?shotPoints:0;
    state.scores[state.turn]+=points;
    state.result={serial:attempt,side:state.turn,points};
    if(state.shot.kind==='dunk')Object.assign(state.result,{kind:'dunk',timing:state.shot.timing});
  }

  function stepBall(dt) {
    const shot=state.shot;
    shot.age=elapsed;
    if(shot.kind==='dunk' && elapsed-dt<dunkRelease){
      Object.assign(ball,dunkFrame(shot,Math.min(elapsed,dunkRelease)).hand);
      if(elapsed<=dunkRelease)return;
      dt=elapsed-dunkRelease;
    }
    const {x,y,z}=ball;
    ball.x+=vx*dt;ball.z+=vz*dt;
    ball.y+=vy*dt-gravity*dt*dt*.5;vy-=gravity*dt;
    ball.spin+=Math.hypot(vx,vz)*dt;
    const board=hoop.boardZ+radius;
    if(z>board && ball.z<=board && Math.abs(ball.x-hoop.x)<.92 &&
      ball.y>hoop.y-.19 && ball.y<hoop.y+1.06){
      ball.z=board;vz*=-.56;
    }
    if(!resolved && y>=hoop.y && ball.y<hoop.y){
      const t=(y-hoop.y)/(y-ball.y);
      const dx=x+(ball.x-x)*t-hoop.x,dz=z+(ball.z-z)*t-hoop.z;
      const crossing=Math.hypot(dx,dz);
      const made=crossing<=hoop.radius-radius+.024;
      resolve(made);
      if(made){vx*=.30;vz*=.30;vy*=.50;}
      else if(crossing<hoop.radius+radius){
        ball.y=hoop.y+.02;
        vx=-dx/crossing*1.45;vz=-dz/crossing*1.45;vy=2.35;
      }
    }
    if(ball.y<court.y+radius){
      ball.y=court.y+radius;
      if(vy<-1.1){vy*=-.58;vx*=.77;vz*=.77;}
      else {vy=0;vx*=Math.exp(-3*dt);vz*=Math.exp(-3*dt);}
    }
    if(!resolved && elapsed>2)resolve(false);
    if(elapsed>2.75 || !onBasketballCourt(ball,1.2) && elapsed>1.4){
      if(!resolved)resolve(false);
      possession(1-state.turn);
    }
  }

  function moveNpc(side,dt) {
    const npc=npcs[side],owns=side===state.turn;
    const [x,z]=npcSpots[(attempt+(side?2:0))%npcSpots.length];
    const holder=active(state.turn);
    const guarding=!owns && holder && state.phase==='held';
    // Close on the ball side, giving a moving player room to drive past.
    const targetX=guarding?clamp(holder.state.x+.95*Math.sin(holder.yaw),court.x-6.9,court.x+6.9):court.x+(owns?x:side?4.65:-4.65);
    const targetZ=guarding?clamp(holder.state.z-.95*Math.cos(holder.yaw),hoop.boardZ+.27,court.z+6.85):court.z+(owns?z:1.8);
    const dx=targetX-npc.x,dz=targetZ-npc.z;
    const dist=Math.hypot(dx,dz);
    // Plant for the reach so a well-timed drive can break contact.
    const travel=state.reach?.side===side?0:Math.min(dist,(owns?2.9:guarding?3.65:1.95)*dt);
    if(dist>.01){npc.x+=dx/dist*travel;npc.z+=dz/dist*travel;}
    npc.moving=travel>.02;
    const goal=npc.moving && (!guarding || dist>.48)?Math.atan2(dx,-dz):owns?hoopHeading(npc):
      Math.atan2(ball.x-npc.x,npc.z-ball.z);
    const delta=Math.atan2(Math.sin(goal-npc.yaw),Math.cos(goal-npc.yaw));
    npc.yaw+=clamp(delta,-dt*8,dt*8);
    return dist<.14;
  }

  function checkSteal(dt,holder){
    const side=1-state.turn,guard=npcs[side];
    if(state.players[side]!=null || !holder || state.phase!=='held'){
      delete state.reach;return;
    }
    const gap=Math.hypot(ball.x-guard.x,ball.z-guard.z);
    if(!state.reach){
      if(elapsed<reachReady || gap>.70 || Math.abs(guard.y-ball.y+1.34)>.45)return;
      state.reach={side,target:holder.id,age:0};
      reachReady=elapsed+2.25;
    }
    const reach=state.reach;
    reach.age+=dt;
    if(reach.age<.43)return;
    const toBall=Math.atan2(ball.x-guard.x,guard.z-ball.z);
    if(gap<=.75 && Math.cos(toBall-guard.yaw)>.60 && Math.abs(guard.y-ball.y+1.34)<=.45){
      possession(side);
      state.steal={side,from:holder.id};
    }else if(reach.age>.60)delete state.reach;
  }

  function step(dt) {
    for(const [side,id] of state.players.entries()){
      if(id==null)continue;
      const player=players.get(id),feet=player?.state;
      if(!player?.life.hp || player.life.fall || player.clubSince!=null ||
        feet.parachute || feet.swimming || !onBasketballCourt(feet,2) || Math.abs(feet.y-court.y)>1.7){
        state.players[side]=null;
        if(state.phase==='held' && state.turn===side)possession(side);
      }
    }
    elapsed+=dt;inputAge+=dt;
    const positioned=state.players.map((id,side)=>id==null && moveNpc(side,dt));
    if(state.phase==='flight'){delete state.reach;stepBall(dt);return;}
    const player=active(state.turn),feet=actor(state.turn);
    ballInHand(ball,feet,player?player.yaw:feet.yaw);
    if(!player){
      delete state.reach;
      if(elapsed>1.8)delete state.steal;
      const {center}=shotWindow(feet);
      if(positioned[state.turn] && elapsed>.65)state.charge=Math.min(center,state.charge+dt*chargeRate);
      if(state.charge>=center && elapsed>.9){
        const offsets=[.016,-.205,-.025,.045,.183,.012];
        release(feet,hoopHeading(feet),center+offsets[attempt%offsets.length],true);
      }
      return;
    }
    if(inputAge>.4){inputDown=false;holding=false;state.charge=0;}
    if(inputDown && !feet.stance){
      holding=true;state.charge=Math.min(1,state.charge+chargeRate*dt);
    }else if(holding){
      if(!feet.stance)release(feet,player.yaw,state.charge);
      else {holding=false;state.charge=0;}
    }else if(elapsed>15){possession(1-state.turn);return;}
    checkSteal(dt,player);
  }
  return {state,input,interact,step};
}
