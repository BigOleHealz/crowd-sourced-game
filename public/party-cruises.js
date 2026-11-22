// Each skipper follows an oval in its own stretch of navigable water.
// The bend and its tangent are continuous at the end of every circuit.
const circuits=[
  ['neon','Neon Palms',70,14,12,23,0],
  ['isla','Isla Bonita',66,-64,11,19,2],
  ['coral','Coral Room',82,-136,8,17,3],
  ['sol','Sol de Noche',86,-235,10,22,1],
  ['cielo','Cielo Azul',56,-310,12,16,2],
  ['luna','Luna Llena',74,-496,13,10,0],
];
function routePose(r,a){
  const [,,cx,cz,rx,rz]=r;
  return {x:cx+rx*Math.cos(a),z:cz+rz*Math.sin(a),yaw:Math.atan2(-rx*Math.sin(a),-rz*Math.cos(a))};
}
export const partySites=circuits.map((r,i)=>({id:'yacht-'+r[0],name:r[1],partyYacht:true,boatModel:'party',
  style:i%3,cruising:true,hull:[0xf0ece2,0x324858,0xd6ded6][i%3],...routePose(r,r[6])}));
const tracks=new WeakMap();
export function cruisePartyYacht(world,b,dt,canFloat){
  if(!b.partyYacht || !b.cruising || b.driver!=null || b.wrecked || b.sling)return false;
  const i=partySites.findIndex(p=>p.id===b.id),r=circuits[i];
  let track=tracks.get(b);
  if(!track){track={a:r[6],time:i};tracks.set(b,track);}
  // The skipper idles along the shore-facing side, where swimmers can board.
  const target=2.45+1.1*(1+Math.cos(track.a));
  const speed=Math.min(target,b.speed+.64*dt),arc=Math.hypot(r[4]*Math.sin(track.a),r[5]*Math.cos(track.a));
  const a=track.a+speed*dt/arc,pose=routePose(r,a);
  if(canFloat(world,b,pose.x,pose.z,pose.yaw)){
    const turn=Math.atan2(Math.sin(pose.yaw-b.yaw),Math.cos(pose.yaw-b.yaw));
    Object.assign(b,pose,{yawRate:turn/dt,speed,throttle:speed/6.2});
    track.a=a%(Math.PI*2);
  }else{b.speed=b.throttle=b.yawRate=0;}
  track.time+=dt;
  b.pitch=.011*Math.cos(track.time*1.04)+.014*b.throttle;
  b.roll=.020*Math.sin(track.time*.83)-.045*b.yawRate;
  b.y=world.waterY??-.14;
  b.y+=.035*Math.sin(track.time+b.z*.09);
  return true;
}
export function resetCruise(b){tracks.delete(b);}
