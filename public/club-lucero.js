// Metre-scale layout shared by the walkable shell, rendered fixtures and booth.
export const club={x:-71.55,z:-54.4,floor:.8,w:8.8,d:9.8};
export const clubSeat={x:club.x-3.29,y:.8,z:-53.34,yaw:Math.PI/2};
export const clubAisle={x:club.x-2.11,y:.8,z:-53.34};
export const clubSpeaker={x:club.x,y:2.7,z:-58.2};
const parts=[];
function solid(role,u,v,w,d,bottom,h,color){
  parts.push({role,x:club.x+u,z:club.z+v,w,d,bottom,h,color});
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
export const clubSolids=parts;
export const inClub=p=>p && p.y>=.61 && p.y<4.32 && Math.abs(p.x-club.x)<4.32 && Math.abs(p.z-club.z)<4.85;
export const inBoothAisle=p=>inClub(p) && Math.hypot(p.x-clubAisle.x,p.z-clubAisle.z)<1.14;
export const nearClubDoor=p=>p && p.y<3.15 && Math.abs(p.x-club.x)<1.37 && Math.abs(p.z-club.z-4.82)<1.35;
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
  {id:'lucero-luz',name:'Luz Rivera · 36',x:club.x+.9,z:-57.76,y:1.07},
  {id:'lucero-daniel',name:'Daniel Sol · 41',x:club.x-1.2,z:-57.59,y:1.07},
];
