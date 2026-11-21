import {sandHeight} from './beach-layout.js';

export const basketballCourt={name:'Harbor Key Basketball',x:48.5,z:-258,width:14.6,length:14.8,y:.95};
const court=basketballCourt;
export const hoop={x:court.x,z:court.z-5.7,y:court.y+3.05,radius:.229,boardZ:court.z-6.20,postZ:court.z-7.05};
export const basketballRadius=.119;
export const basketballChargeRate=.66;
export const longShotDistance=5.8;
export const basketballTeams=[
  {name:'Tide',npc:'hoops-maya',player:'Maya',color:'#6edbd5'},
  {name:'Sunset',npc:'hoops-nico',player:'Nico',color:'#ffc17c'},
];
const west=court.x-court.width/2,north=court.z-7.66;
export const basketballBackstop=[
  [west,north,court.x+3.2,north],
  [west,north,west,north+2.76],
];
export const basketballBarriers=[
  {x:hoop.x,z:hoop.postZ,w:.24,d:.24,h:3.2},
  ...basketballBackstop.map(([x1,z1,x2,z2])=>({
    x:(x1+x2)/2,z:(z1+z2)/2,w:Math.abs(x2-x1)||.09,d:Math.abs(z2-z1)||.09,h:3.1,
  })),
  {x:court.x+8.05,z:court.z+1.65,w:.64,d:2.85,h:.82},
  {x:court.x-7.72,z:court.z+3.62,w:.22,d:1.82,h:2.48},
];

export function onBasketballCourt(feet,pad=0) {
  return !!feet && Math.abs(feet.x-court.x)<=court.width/2+pad &&
    Math.abs(feet.z-court.z)<=court.length/2+pad;
}
export function basketballFloor(x,z) {
  const d=Math.min(court.width/2-Math.abs(x-court.x),court.length/2-Math.abs(z-court.z));
  if(d<0)return undefined;
  const sand=sandHeight(x,z);
  return sand+(court.y-sand)*Math.min(1,d/.44);
}
export function hoopHeading(feet) {
  return Math.atan2(hoop.x-feet.x,feet.z-hoop.z);
}
export function shotWindow(feet) {
  const distance=Math.hypot(hoop.x-feet.x,hoop.z-feet.z);
  const center=Math.max(.28,Math.min(.81,.29+distance*.040));
  return {center,halfWidth:Math.max(.078,.12-distance*.0027)};
}
export function basketballUse(world,feet,id) {
  const game=world.basketball;
  if(!game)return null;
  if(game.players.includes(id))return {target:'basketball',role:'leave',label:'Leave basketball'};
  if(!game.players.includes(null) || feet.grounded!==true || feet.stance || feet.swimming ||
    feet.parachute || Math.abs(feet.y-court.y)>.52 || !onBasketballCourt(feet,1) ||
    world.volleyball?.some(v=>v.players.includes(id)))return null;
  return {target:'basketball',role:'join',label:'Join basketball'};
}
