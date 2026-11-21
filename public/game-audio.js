import {civilianEngineLoop,civilianEngineMix} from './civilian-engine.js';
import {jetLoop,jetMix} from './jet-audio.js';
import {weaponSound,chainGunLoop} from './weapon-sound.js';
import {roadContactSound} from './road-contact-sound.js';

import {boatLoop,boatMix} from './boat-audio.js';
// Each voice is synthesized once per AudioContext and reused for playback.
const shapes={
  glass:[.68,0,1800,1], impact:[.13,270,3000,25], metal:[.27,470,3300,16],
  headPop:[.16,340,2600,30], explosion:[1.05,63,790,4.5], wreck:[1.55,47,1050,3.8],
};
function synth(context,name) {
  if(name.startsWith('civilian/'))return civilianEngineLoop(context,name.slice(9));
  if(name==='jetFan' || name==='jetExhaust')return jetLoop(context,name==='jetExhaust');
  if(name==='chainGun')return chainGunLoop(context);
  if(name.startsWith('bump-'))return roadContactSound(context,name.includes('hard'),name.endsWith('wood'));
  if(name==='outboard' || name==='wake')return boatLoop(context,name);
  const loop=name==='engine' || name==='rotor';
  const [length,bass,cutoff,decay]=shapes[name] ?? [1,0,0,0];
  const rate=context.sampleRate,buffer=context.createBuffer(1,Math.round(length*rate),rate);
  const samples=buffer.getChannelData(0);
  let seed=18791,low=0,phase=0;
  for(let i=0;i<samples.length;i++) {
    const t=i/rate;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1;
    low+=(noise-low)*(1-Math.exp(-2*Math.PI*(loop ? 700 : cutoff)*1/rate));
    if(loop) {
      const rotor=name==='rotor';
      const cycle=t*(rotor ? 18 : 32);
      const thump=Math.exp(-(cycle%1)*(rotor ? 6 : 4));
      const motor=Math.sin(2*Math.PI*t*(rotor ? 53 : 64))+.33*Math.sin(2*Math.PI*t*(rotor ? 106 : 96));
      samples[i]=rotor ? .30*motor+.57*thump*(.8*Math.sin(2*Math.PI*72*t)+.7*low)
        : .37*motor+.48*thump*(Math.sin(2*Math.PI*32*t)+low);
    } else if(name==='glass'){
      const crack=(noise-low)*Math.exp(-48*t);
      const chime=[.026,.079,.138,.217,.36].reduce((a,start,k)=>{
        const u=t-start;
        return u<0?a:a+Math.exp(-u*(18+k*2))*Math.sin(u*(12500+k*3480))*(.19-k*.02);
      },0);
      samples[i]=Math.min(1,t*2200)*(crack*.85+chime);
    } else if(name==='headPop') {
      phase+=2*Math.PI*bass*(1+2*Math.exp(-37*t))/rate;
      samples[i]=Math.min(1,t*950)*Math.exp(-decay*t)*(.83*Math.sin(phase)+.17*low);
    } else {
      phase+=2*Math.PI*bass*(.55+1.6*Math.exp(-22*t))/rate;
      const tail=Math.min(1,(length-t)*45);
      const body=Math.sin(phase)*Math.exp(-decay*t);
      const grit=low*Math.exp(-decay*t*.85);
      const ring=name==='metal' ? .27*Math.sin(2*Math.PI*1260*t)*Math.exp(-13*t) : 0;
      samples[i]=Math.min(1,t*1400)*tail*(.56*body+1.05*grit+ring);
    }
  }
  return buffer;
}

function placement(listener,yaw,point) {
  const x=point.x-listener.x,z=point.z-listener.z;
  const distance=Math.hypot(x,z,point.y-listener.y);
  return {gain:1/(1+(distance/12)**1.5),
    pan:Math.max(-.93,Math.min(.93,(x*Math.cos(yaw)+z*Math.sin(yaw))/Math.max(3,distance)))};
}

export function createGameAudio(button,slider,level) {
  const action=button.querySelector('#sound-action');
  const key='pinewatch.audio.v1';
  let settings={muted:false,volume:.6};
  try {
    const saved=JSON.parse(localStorage.getItem(key));
    if(saved && typeof saved.muted==='boolean' && Number.isFinite(saved.volume))
      settings={muted:saved.muted,volume:Math.max(0,Math.min(1,saved.volume))};
  } catch {}
  let context,master,limiter;
  let previousVehicles={},lastGlass=0;
  const buffers=new Map(),loops=new Map(),voices=new Set();
  function controls() {
    action.textContent=settings.muted ? 'Unmute' : 'Mute';
    button.setAttribute('aria-label',settings.muted ? 'Unmute game sound' : 'Mute game sound');
    button.setAttribute('aria-pressed',String(settings.muted));
    slider.value=String(Math.round(settings.volume*100));level.value=slider.value+'%';
    if(master) master.gain.setTargetAtTime(settings.muted || document.hidden ? 0 : settings.volume,context.currentTime,.012);
  }
  function save() {
    try { localStorage.setItem(key,JSON.stringify(settings)); } catch {}
    controls();
  }
  controls();
  slider.oninput=()=>{settings.volume=Number(slider.value)/100;save();};
  document.addEventListener('visibilitychange',controls);
  function unlock(event) {
    if(!event.isTrusted || event.metaKey || event.altKey || event.ctrlKey) return;
    const Audio=window.AudioContext || window.webkitAudioContext;
    if(!Audio)return;
    if(!context) {
      context=new Audio();master=context.createGain();
      master.gain.value=settings.muted ? 0 : settings.volume;
      limiter=context.createDynamicsCompressor();
      limiter.threshold.value=-12;limiter.ratio.value=5;
      limiter.connect(master);master.connect(context.destination);
    }
    if(context.state!=='running')context.resume().catch(()=>{});
  }
  function voice(name,loop=false,variant=0) {
    const designed=['carbine','sidearm','turret','launch'].includes(name);
    const key=designed ? name+variant : name;
    if(!buffers.has(key))buffers.set(key,designed ? weaponSound(context,name,variant) : synth(context,name));
    const source=context.createBufferSource(),gain=context.createGain(),pan=context.createStereoPanner();
    source.buffer=buffers.get(key);source.loop=loop;
    source.connect(gain);gain.connect(pan);pan.connect(limiter);
    const v={source,gain,pan};voices.add(v);
    source.onended=()=>{voices.delete(v);source.disconnect();gain.disconnect();pan.disconnect();};
    return v;
  }
  const audible=()=>context?.state==='running' && !settings.muted && settings.volume>0 && !document.hidden;
  function burst(name,point,listener,yaw,volume,eventId=0) {
    if(!audible() || !point || voices.size>=32)return;
    const place=placement(listener,yaw,point);
    if(place.gain<.006)return;
    const v=voice(name,false,eventId%3);
    v.source.playbackRate.value=.985+(eventId%13)*.0025;v.gain.gain.value=volume*place.gain;v.pan.pan.value=place.pan;
    v.source.start();
  }
  function reset(world) {
    for(const v of voices)v.source.stop();
    voices.clear();loops.clear();lastJetRange=null;
    lastGlass=world?.doors?.glassSeq??0;
    previousVehicles=world ? {rover:world.rover,heli:world.heli} : {};
  }
  function events(world,listener,yaw,shots) {
    for(const e of world.doors?.glassSounds??[])if(e.seq>lastGlass)burst('glass',e,listener,yaw,.95,e.seq);
    lastGlass=world.doors?.glassSeq??0;
    const impacts=[];
    for(const shot of shots) {
      if(shot.hit)impacts.push(shot);
      if(shot.weapon==='vehicleWreck')burst('wreck',shot.to,listener,yaw,1.3,shot.id);
      else if(shot.weapon==='muzzle' && !(world.map==='brickell' && shot.source==='heli'))burst((shot.firedWeapon==='turret' || shot.firedWeapon==='yachtGun') ? 'turret' : shot.firedWeapon===2 ? 'sidearm' : 'carbine',shot.from,listener,yaw,.9,shot.id);
      else if(shot.weapon==='launch')burst('launch',shot.from,listener,yaw,.93,shot.id);
      else if(shot.weapon==='missile')burst('explosion',shot.to,listener,yaw,1.2);
      else if(shot.hit && shot.injury!=='headPop')burst(['rover','heli','metal'].includes(shot.hitKind) ? 'metal' : 'impact',shot.to,listener,yaw,.45);
      if(shot.injury==='headPop')burst('headPop',shot.injuryPoint ?? shot.to,listener,yaw,.84,shot.id);
    }
    for(const kind of ['rover','heli']) {
      const vehicle=world[kind],prior=previousVehicles[kind];
      const bump=kind==='rover' && vehicle.contactSound;
      const contact=prior && bump && bump.id!==prior.contactSound?.id;
      if(contact) {
        const name='bump-'+(bump.speed>3?'hard':'soft')+'-'+(bump.wood?'wood':'body');
        burst(name,bump,listener,yaw,Math.min(1.3,.27+.085*bump.speed));
      }
      if(kind==='heli' && prior && vehicle.wrecked && !prior.wrecked)burst('wreck',vehicle,listener,yaw,1.3);
      else if(prior && !vehicle.wrecked && !contact && vehicle.hp<prior.hp && !impacts.some(hit=>hit.hitKind===kind ||
        (hit.weapon==='missile' && Math.hypot(vehicle.x-hit.to.x,vehicle.y-hit.to.y,vehicle.z-hit.to.z)<5))) {
        burst('metal',vehicle,listener,yaw,.72);
      }
      previousVehicles[kind]=vehicle;
    }
  }
  function stopMotor(key) {
    const track=loops.get(key);
    if(!track)return;
    const now=context.currentTime;
    track.gain.gain.setTargetAtTime(0,now,.04);
    track.source.stop(now+.18);loops.delete(key);
  }
  function motor(name,v,active,rate,volume,listener,yaw,key=name) {
    if(!active || !audible()) {
      stopMotor(key);
      return;
    }
    let track=loops.get(key);
    if(!track) {
      track=voice(name,true);track.gain.gain.value=0;track.source.start();loops.set(key,track);
    }
    const now=context.currentTime,place=placement(listener,yaw,v);
    track.source.playbackRate.setTargetAtTime(rate,now,.13);
    track.gain.gain.setTargetAtTime(volume*place.gain,now,.08);
    track.pan.pan.setTargetAtTime(place.pan,now,.05);
  }
  function engines(listener,yaw,heli,rover,boats=[],chainFiring=false,supercar=null) {
    motor('chainGun',heli,chainFiring,1,.94,listener,yaw);
    motor('engine',rover,rover.driver!=null && !rover.wrecked,.8+Math.min(2.1,Math.abs(rover.speed)*.13),.28,listener,yaw);
    if(supercar)motor('engine',supercar,supercar.driver!=null && !supercar.wrecked,1.12+Math.abs(supercar.speed)*.064,.27,listener,yaw,'vesper-engine');
    motor('rotor',heli,(heli.pilot!=null || heli.abandonedFor!=null) && !heli.wrecked,heli.grounded ? .83 : 1.12,.38,listener,yaw);
    const present=new Set();
    for(const boat of boats) {
      if(boat.driver==null || boat.wrecked)continue;
      const mix=boatMix(boat), motorKey='boat/motor/'+boat.id, wakeKey='boat/wake/'+boat.id;
      present.add(motorKey);
      motor('outboard',boat,true,mix.motorRate,mix.motorVolume,listener,yaw,motorKey);
      if(mix.wakeVolume>.001) {
        present.add(wakeKey);
        motor('wake',boat,true,mix.wakeRate,mix.wakeVolume,listener,yaw,wakeKey);
      }
    }
    for(const key of loops.keys())if(key.startsWith('boat/') && !present.has(key))stopMotor(key);
  }
  function trafficEngines(listener,yaw,cars){
    const sounding=new Set();
    for(const car of cars){
      if(car.wrecked || (car.npcDriver==null && car.driver==null) ||
        Math.hypot(car.x-listener.x,car.y-listener.y,car.z-listener.z)>65)continue;
      const key='traffic/'+car.id;
      sounding.add(key);
      const mix=civilianEngineMix(car);
      motor('civilian/'+car.model,car,true,mix.rate,mix.gain,listener,yaw,key);
    }
    for(const key of loops.keys())if(key.startsWith('traffic/') && !sounding.has(key))stopMotor(key);
  }
  let lastJetRange=null;
  function jetEngine(listener,yaw,jet,dt){
    const range=jet?Math.hypot(jet.x-listener.x,jet.y-listener.y,jet.z-listener.z):Infinity;
    if(!jet || jet.wrecked || Math.abs(jet.speed)<.15 || range>225 || !audible()){
      lastJetRange=null;stopMotor('jetFan');stopMotor('jetExhaust');return;
    }
    const closing=lastJetRange==null?0:(lastJetRange-range)/Math.max(.001,dt);
    lastJetRange=range;
    const mix=jetMix(jet,listener,closing);
    motor('jetFan',jet,true,mix.fanRate,mix.fanGain,listener,yaw);
    motor('jetExhaust',jet,true,mix.exhaustRate,mix.exhaustGain,listener,yaw);
  }
  function yachtEngine(listener,yaw,yacht){
    const active=yacht?.driver!=null && !yacht.wrecked;
    const speed=Math.abs(yacht?.speed??0);
    motor('outboard',yacht,active,.57+speed*.034,.26,listener,yaw,'yacht-diesels');
    motor('wake',yacht,active && speed>.4,.72+speed*.035,Math.min(.24,speed*.042),listener,yaw,'yacht-wake');
  }
  function toggleMute() {
    settings.muted=!settings.muted;
    save();
  }
  return {unlock,reset,events,engines,trafficEngines,jetEngine,yachtEngine,toggleMute};
}
