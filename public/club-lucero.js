// Metre-scale layout shared by the walkable shell, rendered fixtures and booth.
export const club={x:-71,z:15,floor:.8,w:9.8,d:8.8,yaw:Math.PI/2};
export const clubPoint=(u,v)=>({x:club.x+v,z:club.z-u});
export const clubDoor=clubPoint(0,4.91);
export const clubSeat={...clubPoint(-3.29,1.06),y:club.floor,yaw:0};
export const clubAisle={...clubPoint(-2.11,1.06),y:club.floor};
export const clubSpeaker={...clubPoint(0,-3.8),y:2.7};
const parts=[];
function solid(role,u,v,w,d,bottom,h,color){
  parts.push({role,u,v,w,d,bottom,h,color});
}
for(const side of [-1,1]){
  solid('wall',side*4.32,0,.16,9.8,0,3.57,0x453837);
  solid('front',side*2.70,4.82,3.4,.16,0,3.57,0x5f6362);
}
solid('back',0,-4.82,8.8,.16,0,3.57,0x3b283c);
solid('lintel',0,4.82,2.04,.16,2.62,3.57,0x746963);
solid('roof',0,0,8.98,10.0,3.57,3.82,0x5c5551);
solid('stage',0,-3.43,6.85,2.7,0,.27,0x563747);
for(const side of [-1,1])for(const v of [-.94,1.06]){
  solid('bench',side*3.34,v,.83,1.88,0,.44,0x824b56);
  solid('backrest',side*3.74,v,.18,1.89,.32,1.12,0x663542);
}
export const clubFixtures=parts;
export const clubSolids=parts.map(p=>({...p,...clubPoint(p.u,p.v),w:p.d,d:p.w}));
export const inClub=p=>p && p.y>=.61 && p.y<4.32 && Math.abs(p.x-club.x)<4.85 && Math.abs(p.z-club.z)<4.32;
export const inBoothAisle=p=>inClub(p) && Math.hypot(p.x-clubAisle.x,p.z-clubAisle.z)<1.14;
export const nearClubDoor=p=>p && p.y<3.15 && Math.abs(p.z-clubDoor.z)<1.37 && Math.abs(p.x-clubDoor.x)<1.35;
export function leaveClubSeat(player){
  delete player.clubSince;
  Object.assign(player.state,clubAisle,{vy:0,grounded:true});
  player.moving=player.sprint=false;
}
export function seatAtClub(player,ticks,players){
  if(!player.life.hp || player.life.fall || !player.state.grounded || !inBoothAisle(player.state))return false;
  for(const other of players.values())if(other.clubSince!=null)return false;
  player.clubSince=ticks;Object.assign(player.state,clubSeat,{stance:null,vy:0,grounded:true});
  player.yaw=clubSeat.yaw;player.moving=player.sprint=false;return true;
}
export const clubCast=[
  {id:'lucero-luz',name:'Luz Rivera · 36',...clubPoint(.9,-3.36),y:1.07},
  {id:'lucero-daniel',name:'Daniel Sol · 41',...clubPoint(-1.2,-3.19),y:1.07},
];

export function cabaretCast(visitors,simTick){
  const guest=visitors.find(p=>p.clubSince!=null);
  // The host walks from the stage to the booth at the same point in the
  // performance for all observers, including a guest who joins mid-song.
  const travel=guest?Math.min(1,Math.max(0,(simTick-guest.clubSince)/72)):0;
  const fraction=travel*travel*(3-2*travel);
  const booth=clubPoint(-1.47,1.02);
  return clubCast.map((p,i)=>({...p,...(i===1 && guest?{
    x:p.x+(booth.x-p.x)*fraction,y:p.y-.27*Math.min(1,fraction*2),
    z:p.z+(booth.z-p.z)*fraction,moving:travel>0 && travel<1}:{}),
    yaw:(i===1 && guest?-Math.PI/2:Math.PI)-club.yaw,grounded:true,performer:i+1}));
}

export function poseCabaret(actor,state,t){
  const beat=t*(Math.PI*2*96/60),v=beat+(state.performer===2?1.3:0);
  for(const kit of actor.tools)kit.visible=false;
  if(state.clubSince!=null){
    actor.body.position.y=-.38;actor.spine.rotation.x=.06;
    for(const {leg,knee,arm,forearm,side} of actor.limbs){
      leg.rotation.set(1.39,0,side*.07);knee.rotation.set(-1.52,0,0);
      arm.rotation.set(.18,0,side*.09);forearm.rotation.set(.76,0,0);
    }
    return;
  }
  actor.body.position.y=.017*Math.cos(v*2);actor.spine.rotation.y=.12*Math.sin(v*.5);
  actor.head.rotation.z=.043*Math.sin(v*.5);
  for(const {side,leg,knee,arm,forearm} of actor.limbs){
    const phase=v+(side>0?Math.PI:0);
    leg.rotation.set(.07*Math.sin(phase),0,.032*side);knee.rotation.x=-.07*(1+Math.sin(phase));
    arm.rotation.set(.26+.23*Math.cos(phase*.5),side*.16,side*(.38+.28*Math.sin(v*.5)));
    forearm.rotation.set(.68+.32*Math.sin(phase*.5),side*.14,0);
  }
}
