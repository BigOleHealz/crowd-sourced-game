import {CITY,MAP,waterBlend} from './world.js';
import {roadSurfaceAt} from './road-surface.js';
import {coast,bayfrontLawns,within} from './brickell-map.js';
import {gardens,onMarketPier,onLantern} from './lantern-point.js';
import {acousticSpace} from './acoustic-space.js';

// A full gait cycle has one contact per side. Never replay the skipped phase
// when an actor teleports, boards, comes into range, or changes to a new gait.
export function contactingFoot(oldPhase,gait,state){
  if(oldPhase==null || !gait || gait.weight<.14 || gait.speed<.28 || !state.grounded ||
    state.stance==='prone' || state.swimming || state.climb || state.parachute || state.dead)return 0;
  if(gait.phase<oldPhase)return -1;
  return oldPhase<.5 && gait.phase>=.5?1:0;
}
export function bootSurface(state,world,onDeck=false){
  if(onDeck)return 'deck';
  if(state.y<MAP.waterY && waterBlend(state)>.08)return 'water';
  const {x,z}=state;
  if(acousticSpace(state,world).id)return 'hard';
  if(CITY){
    if(state.y>1.6)return 'hard';
    if(onMarketPier(x,z))return 'deck';
    if(bayfrontLawns.some(p=>within(p,x,z)) || gardens.some(p=>within(p,x,z)))return 'grass';
    if(within(coast,x,z) || onLantern(x,z))return 'hard';
  }
  const type=roadSurfaceAt(x,z);
  if(CITY && type==='deck')return 'hard';
  return type==='asphalt'?'hard':type;
}
const textures={
  // Resonance, brightness, tail, heel weight, loose-grain level.
  hard:[103,2300,.17,.51,.11],deck:[148,1320,.20,.60,.05],grass:[65,840,.19,.17,.52],
  gravel:[88,3200,.22,.23,.76],sand:[75,1100,.20,.15,.48],water:[182,1750,.26,.14,.66],
};
export function stepBuffer(context,surface,variant){
  const [hz,cut,tail,heel,grain]=textures[surface],rate=context.sampleRate;
  const buffer=context.createBuffer(1,Math.ceil(tail*rate),rate),wave=buffer.getChannelData(0);
  let seed=17311+variant*3547,low=0,high=0,slush=0;
  const tau=2*Math.PI,follow=1-Math.exp(-tau*cut/rate),body=1-Math.exp(-tau*330/rate);
  for(let i=0;i<wave.length;i++){
    const t=i/rate;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1;
    low+=(noise-low)*follow;high+=(low-high)*body;
    const offset=.042+.007*variant,toe=Math.max(0,t-offset);
    const envelope=Math.min(1,t*380)*Math.exp(-32*t);
    const scuff=Math.min(1,toe*110)*Math.exp(-toe*(surface==='water'?17:27));
    const knock=heel*Math.sin(tau*hz*(1+.018*variant)*t+1.5*(1-Math.exp(-t*49)))*envelope;
    slush+=(Math.abs(noise)-slush)*.047;
    const gritty=surface==='gravel'?low-high:low;
    const splash=surface==='water'?Math.sin(tau*(390*t+35*t*t))*.12*scuff*Math.sin(t*98+variant):0;
    wave[i]=Math.tanh(knock+high*1.45*envelope+grain*gritty*(.57*envelope+scuff)*(.47+slush)+splash)
      *Math.min(1,(tail-t)*140);
  }
  return buffer;
}
