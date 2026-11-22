// Harbor Key Beach, between the volleyball sideline and the public shade pavilion.
export const clubDeck={x:48,z:-204.55,w:16,d:5.4,y:.99};
export const loungeDeck={x:54.5,z:-209.25,w:3,d:4,y:clubDeck.y};
export const beachDJ={x:47.2,z:-206.45,y:clubDeck.y+1.4};
export const beachTempo=112;
export const barMenu=[
  {id:'lime',label:'lime soda',z:-203.7,color:0xb8d477},
  {id:'punch',label:'house punch',z:-205.35,color:0xe48a75},
];
export const loungeSeats=[-208.15,-209.35,-210.55].map(z=>({x:54.05,z,y:clubDeck.y}));
export const pourTicks=48,glassTicks=165;
const within=(p,r)=>Math.abs(p.x-r.x)<=r.w/2 && Math.abs(p.z-r.z)<=r.d/2;
export const beachClubFloor=(x,z)=>within({x,z},clubDeck)||within({x,z},loungeDeck)?clubDeck.y:undefined;
export const atBeachClub=p=>p && beachClubFloor(p.x,p.z)!==undefined && Math.abs(p.y-clubDeck.y)<3;
export const beachClubFixtures=[
  {kind:'counter',x:43.35,z:-204.55,w:.68,d:3.45,h:1.04},
  ...[-206.02,-203.08].map(z=>({kind:'return',x:42.37,z,w:1.32,d:.51,h:1.04})),
  {kind:'shelf',x:40.58,z:-204.55,w:.55,d:3.34,h:1.16},
  ...[40.56,43.50].flatMap(x=>[-206.66,-202.44].map(z=>({kind:'post',x,z,w:.12,d:.12,h:2.85}))),
  {kind:'awning',x:42.03,z:-204.55,w:3.69,d:4.9,bottom:2.80,h:3.03},
  ...[-207.13,-201.99].map(z=>({kind:'lightPost',x:55.85,z,w:.11,d:.11,h:3.10})),
  {kind:'booth',x:47.85,z:-206.45,w:.70,d:1.48,h:1.00},
  ...[-205.32,-207].map(z=>({kind:'speaker',x:47.05,z,w:.48,d:.43,h:1.36})),
  {kind:'cabana',x:loungeDeck.x,z:loungeDeck.z,w:3.04,d:4.08,bottom:2.49,h:2.67},
  ...[[53.13,-207.41],[53.13,-211.09],[55.85,-211.09]].map(([x,z])=>({kind:'post',x,z,w:.11,d:.11,h:2.61})),
  ...[-208.75,-209.95].map(z=>({kind:'table',x:54.12,z,w:.35,d:.35,h:.54})),
  ...loungeSeats.map(s=>({...s,kind:'chair',w:.83,d:.76,h:.43})),
];
export function beachClubAction(p){
  if(!p?.grounded || p.swimming || p.ride || p.climb || p.dive || p.parachute || p.liftTravel || p.stance || Math.abs(p.y-clubDeck.y)>.35)return null;
  if(p.x>43.68 && p.x<45.02){
    const drink=barMenu.find(d=>Math.abs(p.z-d.z)<.78);
    if(drink)return drink.id;
  }
  const chair=loungeSeats.findIndex(s=>p.x>s.x+.38 && p.x<s.x+1.33 && Math.abs(p.z-s.z)<.56);
  if(chair>=0)return 'seat'+chair;
  if(p.x>=48.6 && p.x<55.7 && Math.abs(p.z-clubDeck.z)<=2.35)return 'dance';
  return null;
}
export function beachClubLabel(action){
  const drink=barMenu.find(d=>d.id===action);
  if(drink)return 'Order '+drink.label+' from Marisol';
  return action==='dance'?'Join the dance floor':'Sit facing the bay';
}
export function useBeachClub(player,action,tick,players){
  if(action!==beachClubAction(player.state) || !action)return;
  const drink=barMenu.find(d=>d.id===action);
  if(drink){
    const orders=Array.from(players.values(),p=>p.beachOrder).filter(Boolean);
    if(player.beachOrder || orders.some(o=>o.drink===action))return;
    const start=Math.max(tick,...orders.map(o=>o.tick+pourTicks));
    player.beachOrder={drink:action,tick:start};
  }else if(player.beachPose===action){
    delete player.beachPose;
  }else if(action==='dance' || ![...players.values()].some(p=>p.beachPose===action)){
    player.beachPose=action;
  }
}
export function updateBeachVisit(player,input,tick){
  if(player.beachOrder && (tick-player.beachOrder.tick>=glassTicks || !player.life.hp))delete player.beachOrder;
  if(player.beachPose && (!player.life.hp || player.life.fall || input?.x || input?.z || input?.jump || input?.fire ||
    beachClubAction(player.state)!==player.beachPose))delete player.beachPose;
}
