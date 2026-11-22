import {fishSchools,fishSpecies} from './reef-fish.js';
import {berthDeckY,jettyY} from './marina-docks.js';

export const fishingSpots=[
  {name:'Pier A',x:87.5,z:-446,y:berthDeckY},
  {name:'Pier B',x:87.5,z:-433,y:berthDeckY},
  {name:'Pier C',x:87.5,z:-419,y:berthDeckY},
  {name:'South jetty',x:87.5,z:-407.8,y:jettyY},
];
export function fishingSpot(feet) {
  if(!feet?.grounded || feet.swimming || feet.ride || feet.fall || feet.dead)return;
  return fishingSpots.find(s=>Math.abs(s.x-feet.x)<1.65 && Math.abs(s.z-feet.z)<1.13 && Math.abs(s.y-feet.y)<.23);
}
export function activeCast(f){return f && f.phase!=='landed' && f.phase!=='lost';}
export function reelReady(f,tick){
  return f?.phase==='reel' && tick>=f.pull && tick<f.pull+31;
}
export function fishingLabel(f){
  if(!activeCast(f))return f?'Cast again':'Cast line';
  if(f.phase==='waiting')return 'Watch the float';
  if(f.phase==='bite')return 'Hook fish';
  return 'Reel in';
}
export function fishingDetail(f,tick){
  if(!f)return 'Cast from the end of this pier.';
  if(f.phase==='waiting')return 'Watch for the float to dive.';
  if(f.phase==='bite')return 'Bite! Set the hook now.';
  if(f.phase==='reel')return (reelReady(f,tick)?'Slack line · Reel now':'Line tight · Wait')+' · '+f.pulls+' / 3 pulls';
  return f.phase==='landed'?'Catch landed · '+fishSpecies[f.species].name+'!':f.reason;
}
function localSpecies(feet,rng){
  const nearby=fishSchools.map(s=>({id:s.species,d:Math.hypot(s.x-feet.x,s.z-feet.z)}))
    .filter(s=>s.d<95).sort((a,b)=>a.d-b.d);
  const weights=new Map();
  for(const s of nearby)if(!weights.has(s.id))weights.set(s.id,1/(8+s.d));
  let draw=rng()*[...weights.values()].reduce((sum,n)=>sum+n,0);
  for(const [id,w] of weights){draw-=w;if(draw<=0)return id;}
  return nearby[0].id;
}
export function stepFishing(player,tick,eligible){
  const f=player.fishing;
  if(!f)return;
  if(!eligible || !fishingSpot(player.state)){delete player.fishing;return;}
  if(f.phase==='waiting' && tick>=f.bite){f.phase='bite';f.until=f.bite+76;}
  if(f.phase==='bite' && tick>=f.until){
    f.phase='lost';f.reason='The float resurfaced. The fish got away.';
  }
  if(f.phase==='reel' && tick>=f.pull+31){f.phase='lost';f.reason='The line went slack. The fish got away.';}
}
export function fishingAction(player,action,tick,eligible,rng=Math.random){
  stepFishing(player,tick,eligible);
  if(!eligible || !fishingSpot(player.state))return;
  let f=player.fishing;
  if(action==='cast' && !activeCast(f)){
    player.fishing={phase:'waiting',cast:tick,bite:tick+65+Math.floor(rng()*90),
      x:player.state.x+4.0+rng()*2,z:player.state.z+(rng()-.5)*2.4,pulls:0};
  }else if(action==='hook' && f?.phase==='bite'){
    f.phase='reel';f.species=localSpecies(player.state,rng);
    f.pull=tick+18+Math.floor(rng()*12);
  }else if(action==='reel' && f?.phase==='reel'){
    if(!reelReady(f,tick)){f.phase='lost';f.reason='Too much tension. The line snapped.';return;}
    if(++f.pulls===3){f.phase='landed';f.landed=tick;return;}
    f.pull=tick+20+Math.floor(rng()*20);
  }
}
