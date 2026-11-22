import {barMenu,beachDJ,beachTempo,clubDeck,loungeSeats,pourTicks} from './beach-club.js';

const lineup=[
  ['bar','Marisol','beach-marisol',42.70,-204.55,Math.PI/2],
  ['dj','DJ Sol','rafi',beachDJ.x,beachDJ.z,Math.PI/2],
  ['dance','Gia','maia',49.55,-204.27,1.12],
  ['dance','Theo','leo',51.15,-204.71,-1.37],
  ['dance','Luisa','elena',53.12,-205.68,2.32],
  ['dance','Nico','santi',52.19,-206.52,-.87],
  ['guest','Paz','mei',52.31,-203.21,-1.80],
  ['guest','Emil','wes',53.68,-203.18,-1.10],
];
export function beachClubCast(local,visitors,tick,evening=false){
  if(Math.hypot(local.x-clubDeck.x,local.z-clubDeck.z)>48)return [];
  const order=visitors.map(p=>p.beachOrder).find(o=>o && tick>=o.tick && tick-o.tick<pourTicks);
  return lineup.map(([role,name,look,x,z,yaw],i)=>{
    let moving=false,pouring=false;
    if(role==='bar' && order){
      const reach=Math.min(1,(tick-order.tick)/12,(pourTicks+5-tick+order.tick)/12);
      z+=(barMenu.find(d=>d.id===order.drink).z-z)*reach;pouring=true;
    }
    if(role==='guest'){
      // Offset arrivals: guests stop short of the two player service positions.
      const time=(tick/30+(i-6)*29)%68;
      const travel=Math.max(0,Math.min(1,(time-27)/7,(51-time)/7));
      if(!evening){
        x-=.55;z-=3.77;
      }
      x+=(45.75-x)*travel;z+=((-202.9-(i-6)*.82)-z)*travel;
      moving=(time>27 && time<34)||(time>44 && time<51);
      if(moving)yaw=time<34?-Math.PI/2:Math.PI/2;
      role=moving?'walking':travel>.99 || !evening?'chat':'dance';
    }
    return {id:'beach-club-'+i,name,lookId:role==='bar'?look:'rival-'+look,x,y:clubDeck.y,z,yaw,grounded:true,hp:100,
      beachRole:role,partyOffset:i*1.67,moving,pouring};
  });
}
export function poseBeachClub(actor,state,tick){
  const role=state.beachPose??state.beachRole;
  if(!role || role==='walking' || state.dead || state.fall)return;
  for(const tool of actor.tools)tool.visible=false;
  const beat=tick/30*beachTempo/60*Math.PI*2+(state.partyOffset??state.id*.8);
  if(actor.shaker)actor.shaker.visible=!!state.pouring;
  const seat=role.startsWith('seat')?loungeSeats[Number(role.slice(4))]:null;
  if(seat){
    actor.root.position.set(seat.x,seat.y,seat.z);actor.root.rotation.y=-Math.PI/2;
    actor.body.position.y=-.48;actor.spine.rotation.x=-.08;
  }else if(role==='dance'){
    actor.body.position.x=.085*Math.sin(beat*.5);
    actor.body.position.y=-.045+.045*Math.cos(beat);
    actor.spine.rotation.y=.21*Math.sin(beat*.5);actor.head.rotation.z=.075*Math.sin(beat*.5);
  }
  for(const {arm,forearm,leg,knee,side} of actor.limbs){
    const swing=Math.sin(beat*.5+side*1.15);
    if(seat){
      leg.rotation.set(1.46,0,side*.08);knee.rotation.set(-1.51,0,0);
      arm.rotation.set(.32,0,side*.12);forearm.rotation.set(.76,0,0);
    }else if(role==='dance'){
      leg.rotation.set(.11*swing,0,side*.07);knee.rotation.x=-.12*(1+swing);
      const lift=side>0 && (state.partyOffset??0)>4?.68:0;
      arm.rotation.set(.38+.3*swing+lift,0,side*(.54+.26*swing+lift));
      forearm.rotation.set(.82+.32*swing,side*.16,0);
    }else{
      const reach=role==='dj'?.89:state.pouring?1.03:.24;
      arm.rotation.set(reach+.09*swing,0,side*.18);
      forearm.rotation.set(.37+.16*swing,0,state.pouring?side*.28:0);
    }
  }
}
