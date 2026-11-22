import {courtContactAudio,courtContactBuffer} from './basketball-audio.js';
import {hoop} from './basketball-layout.js';
import {wheelContactSounds,wheelLandingBuffer} from './skate-touchdown.js';
import {beachDJ} from './beach-club.js';
import {dogWhimper,dogWhimpers} from './dog-whimper.js';
import {projectorRoar} from './projector-roar.js';
import {dogOwnerDialogue,ownerSpeech} from './dog-owner-dialogue.js';
import {marineBlastCalls,marineImpactSound} from './marine-float.js';
import {crowdPanicAudio,crowdVoices} from './crowd-panic-audio.js';
import {bankDesk} from './bank-rules.js';
import {clubSpeaker} from './club-lucero.js';
import {ambientScene,ambientBuffer} from './district-ambience.js';
import {doorBuffer,doorCue} from './car-door-sound.js';
import {roadHandle} from './road-cabin.js';
import {fallAudioTracker} from './collapse-sound-cues.js';
import {MAP} from './world.js';
import {signalingCruiser,sirenLoop} from './pursuit-signals.js';
import {tireMix,tireLoop} from './tire-road-sound.js';
import {acousticSpace,transmission} from './acoustic-space.js';
import {civilianEngineLoop,civilianEngineMix} from './civilian-engine.js';
import {jetLoop,jetMix} from './jet-audio.js';
import {weaponSound,chainGunLoop} from './weapon-sound.js';
import {roadContactSound,roadLandingSound} from './road-contact-sound.js';

import {fatalBiteCalls,sharkDefeatSound,sharkStrikeWaterSound} from './shark-defeat-audio.js';
import {dolphinCalls,dolphinSound} from './dolphin-audio.js';
import {boatLoop,boatMix} from './boat-audio.js';
// Each voice is synthesized once per AudioContext and reused for playback.
const shapes={
  'water-pop':[.23,92,1310,16],'ember-wash':[.20,48,820,11],masonry:[.61,57,850,7.8],settling:[.35,140,1810,15],
  glass:[.68,0,1800,1], impact:[.13,270,3000,25], metal:[.27,470,3300,16],
  headPop:[.16,340,2600,30], explosion:[1.05,63,790,4.5], wreck:[1.55,47,1050,3.8],
};
function synth(context,name) {
  if(name.startsWith('hoops/'))return courtContactBuffer(context,name.slice(6));
  if(name.startsWith('park-wheel/'))return wheelLandingBuffer(context,name==='park-wheel/bike');
  if(name.startsWith('dog-whimper-'))return dogWhimper(context,name==='dog-whimper-small');
  if(name==='projector-roar')return projectorRoar(context);
  if(name==='marine-impact')return marineImpactSound(context);
  if(name==='shark-strike-water')return sharkStrikeWaterSound(context);
  if(name==='shark-defeat')return sharkDefeatSound(context);
  if(name.startsWith('amb/'))return ambientBuffer(context,name.slice(4));
  if(name==='door-open' || name==='door-close')return doorBuffer(context,name==='door-close');
  if(name==='patrol-siren')return sirenLoop(context);
  if(name==='branch-alarm'){
    const rate=context.sampleRate,buffer=context.createBuffer(1,Math.round(rate*1.6),rate);
    const wave=buffer.getChannelData(0);
    // Two struck pitches and a rest distinguish the indoor bell from a passing siren.
    for(let i=0;i<wave.length;i++){
      const time=i/rate,second=time>=.34,t=second?time-.34:time;
      const angle=2*Math.PI*(second?622:784)*t;
      const envelope=Math.min(1,t*240)*Math.exp(-8*t)*Math.min(1,(1.6-time)*35);
      wave[i]=envelope*(.58*Math.sin(angle)+.23*Math.sin(2.71*angle)+.12*Math.sin(4.13*angle));
    }
    return buffer;
  }
  if(name.startsWith('tread/'))return tireLoop(context,name.slice(6));
  if(name==='district-fire'){
    const rate=context.sampleRate,buffer=context.createBuffer(1,rate*2,rate),samples=buffer.getChannelData(0);
    let seed=2447,brown=0,pop=0;
    for(let i=0;i<samples.length;i++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const n=seed/2147483648-1;
      brown+=(n-brown)*.041;pop*=.986;
      if(seed<3100000)pop=.15+Math.abs(n)*.35;
      const edge=Math.min(1,i/256,(samples.length-1-i)/256);
      samples[i]=edge*(brown*.68+n*pop);
    }
    return buffer;
  }
  if(name==='horn'){
    const rate=context.sampleRate,buffer=context.createBuffer(1,Math.ceil(rate*.43),rate),samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++){
      const t=i/rate,a=t*Math.PI*2;
      const tone=Math.sin(a*392)+.72*Math.sin(a*494)+.34*Math.sin(a*784)+.19*Math.sin(a*1176);
      samples[i]=.48*Math.tanh(tone)*Math.min(1,t*45,Math.max(0,.43-t)*13);
    }
    return buffer;
  }
  if(name.startsWith('civilian/'))return civilianEngineLoop(context,name.slice(9));
  if(name==='jetFan' || name==='jetExhaust')return jetLoop(context,name==='jetExhaust');
  if(name==='chainGun')return chainGunLoop(context);
  if(name.startsWith('landing-'))return roadLandingSound(context,name==='landing-hard');
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

export function createGameAudio(button,slider,level,caption) {
  const action=button.querySelector('#sound-action');
  const key='pinewatch.audio.v1';
  let settings={muted:false,volume:.6};
  try {
    const saved=JSON.parse(localStorage.getItem(key));
    if(saved && typeof saved.muted==='boolean' && Number.isFinite(saved.volume))
      settings={muted:saved.muted,volume:Math.max(0,Math.min(1,saved.volume))};
  } catch {}
  let context,master,limiter,reflection,environmentWorld;
  let listenerSpace=acousticSpace(null,null);
  let priorSharks,priorManatees;
  let previousDolphins,previousSharkDefeats;
  let previousVehicles={},lastGlass=0,nextEnvironment=0;
  const civilianVoices=crowdPanicAudio(),thefts=dogOwnerDialogue(),ownerLine=ownerSpeech();
  let captionTimer;
  const sprayLines=new Map();
  const collapse=fallAudioTracker(MAP.buildings);
  const musicLoading=new Set(),musicRetryAt=new Map();
  async function loadMusic(name,file){
    if(buffers.has(name) || musicLoading.has(name) || performance.now()<(musicRetryAt.get(name)??0))return;
    musicLoading.add(name);
    try{
      const response=await fetch('./audio/'+file);
      if(!response.ok)throw Error('Music unavailable');
      buffers.set(name,await context.decodeAudioData(await response.arrayBuffer()));
      musicRetryAt.delete(name);
    }catch{musicRetryAt.set(name,performance.now()+30000);}
    finally{musicLoading.delete(name);}
  }
  let recordingsStarted=false;
  async function loadRecordings(){
    if(recordingsStarted || !context)return;
    recordingsStarted=true;
    await Promise.all(Object.entries({'shark-defeat':'shark-defeat',glass:'plate-glass',rotor:'helicopter-rotor',masonry:'concrete-impact',settling:'concrete-settle','crowd-reactions':'crowd-reactions'}).map(async ([name,file])=>{
      try{
        const res=await fetch('./audio/'+file+'.ogg');
        if(!res.ok)return;
        // Decode the packed mono dialogue at its native bandwidth even on a 96 kHz output.
        const Offline=window.OfflineAudioContext || window.webkitOfflineAudioContext;
        const decoder=name==='crowd-reactions' && Offline ? new Offline(1,1,24000) : context;
        buffers.set(name,await decoder.decodeAudioData(await res.arrayBuffer()));
      }catch{/* Keep synthesized playback available on browsers without Opus. */}
    }));
  }
  const flameEmitters=new Map();
  const buffers=new Map(),loops=new Map(),voices=new Set();
  function controls() {
    if(settings.muted || settings.volume<=0 || document.hidden)ownerLine.stop();
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
      // A short filtered early reflection shares the same master mute and volume.
      const echo=context.createDelay(.12),damping=context.createBiquadFilter();
      echo.delayTime.value=.067;damping.type='lowpass';damping.frequency.value=2400;
      reflection=context.createGain();reflection.gain.value=0;
      limiter.connect(echo);echo.connect(damping);damping.connect(reflection);reflection.connect(master);
    }
    if(context.state!=='running')context.resume().catch(()=>{});
    if(!recordingsStarted)window.speechSynthesis?.getVoices();
    void loadRecordings();
  }
  function voice(name,loop=false,variant=0) {
    const designed=['carbine','sidearm','turret','launch'].includes(name);
    const dolphin=name.startsWith('dolphin/');
    const key=designed || dolphin ? name+variant : name;
    if(!buffers.has(key))buffers.set(key,dolphin ? dolphinSound(context,name.slice(8),variant) : designed ? weaponSound(context,name,variant) : synth(context,name));
    const source=context.createBufferSource(),gain=context.createGain(),pan=context.createStereoPanner();
    source.buffer=buffers.get(key);source.loop=loop;
    const tone=context.createBiquadFilter();tone.type='lowpass';tone.Q.value=.65;tone.frequency.value=20000;
    source.connect(gain);gain.connect(pan);pan.connect(tone);tone.connect(limiter);
    const v={source,gain,pan,tone,nextTone:0,transmission:1};voices.add(v);
    source.onended=()=>{voices.delete(v);source.disconnect();gain.disconnect();pan.disconnect();tone.disconnect();};
    return v;
  }
  const audible=()=>context?.state==='running' && !settings.muted && settings.volume>0 && !document.hidden;
  function passage(voice,point){
    const now=context.currentTime;
    if(now>=voice.nextTone){
      const amount=transmission(listenerSpace,acousticSpace(point,environmentWorld));
      if(amount!==voice.transmission){
        const hz=750+19250*amount*amount;
        if(!voice.nextTone)voice.tone.frequency.value=hz;
        else voice.tone.frequency.setTargetAtTime(hz,now,.045);
        voice.transmission=amount;
      }
      voice.nextTone=now+.085;
    }
    return .42+.58*voice.transmission;
  }
  function burst(name,point,listener,yaw,volume,eventId=0,segment=null) {
    if(!audible() || !point || voices.size>=32)return;
    const place=placement(listener,yaw,point);
    if(place.gain<.006)return;
    const v=voice(name,false,eventId%3);
    v.source.playbackRate.value=.985+(eventId%13)*.0025;v.gain.gain.value=volume*place.gain*passage(v,point);v.pan.pan.value=place.pan;
    if(segment)v.source.start(0,segment.start,segment.duration);
    else v.source.start();
  }
  let previousRides;
  let previousDogs;
  const courtSounds=courtContactAudio();
  function reset(world) {
    courtSounds.reset(world?.basketball);
    previousRides=world?.rides;
    previousDogs=world?.dogs;
    thefts.reset(world?.dogs);ownerLine.stop();clearTimeout(captionTimer);
    if(caption)caption.hidden=true;
    collapse.reset();flameEmitters.clear();
    priorSharks=world?.sharks;priorManatees=world?.manatees;
    previousDolphins=world?.dolphins;
    previousSharkDefeats=world?.sharkDefeats;
    environmentWorld=world;
    listenerSpace=acousticSpace(null,null);
    if(reflection)reflection.gain.setTargetAtTime(0,context.currentTime,.04);
    for(const v of voices)v.source.stop();
    voices.clear();loops.clear();nextEnvironment=0;lastJetRange=null;lastPatrol=null;
    lastGlass=world?.doors?.glassSeq??0;
    previousVehicles={};
    sprayLines.clear();
    civilianVoices.reset(world?.npcs);
    if(world)for(const [key,v] of roadAndAirVehicles(world))previousVehicles[key]=v;
  }
  function roadAndAirVehicles(world){
    return [['rover',world.rover],['heli',world.heli],['supercar',world.supercar],...[...(world.traffic??[]),...(world.patrolCars??[])].map(c=>[c.id,c])].filter(([,v])=>v);
  }
  function events(world,listener,yaw,shots,light='day') {
    environmentWorld=world;
    dogWhimpers(previousDogs,world.dogs,world.simTick,(dog,tick)=>burst(dog.size<.9?'dog-whimper-small':'dog-whimper-large',dog,listener,yaw,.89,tick));
    previousDogs=world.dogs;
    listenerSpace=acousticSpace(listener,world);
    courtSounds.step(world.basketball,cue=>{
      if(Math.hypot(listener.x-hoop.x,listener.z-hoop.z)<=38)
        burst('hoops/'+cue.kind,hoop,listener,yaw,cue.kind==='swish'?.66:.86,cue.id);
    });
    wheelContactSounds(previousRides,world.rides,world.simTick,(kind,event)=>{
      if(Math.hypot(listener.x-event.x,listener.z-event.z)<28)
        burst('park-wheel/'+kind,event,listener,yaw,.25+.48*event.impact,event.tick);
    });
    previousRides=world.rides;
    for(const npc of world.npcs??[]){
      const time=npc.drenchedAt;
      if(time==null || time===sprayLines.get(npc.id) || world.simTick-time>18 || npc.dead)continue;
      sprayLines.set(npc.id,time);
      const mouth={x:npc.x,y:npc.y+1.5,z:npc.z};
      if(Math.hypot(listener.x-mouth.x,listener.z-mouth.z)>30 || document.hidden)continue;
      const index=(time+npc.id.length)%3,clip=[3,6,11][index];
      if(caption){
        clearTimeout(captionTimer);caption.hidden=false;
        caption.textContent=npc.name+' · “'+['Stop it!','Go away!','What are you doing?'][index]+'”';
        captionTimer=setTimeout(()=>{caption.hidden=true;},2400);
      }
      if(audible() && buffers.has('crowd-reactions'))
        burst('crowd-reactions',mouth,listener,yaw,1.18,time,crowdVoices[5][clip]);
    }
    thefts.step(world,listener,(line,owner,mouth,fade,tick)=>{
      if(document.hidden)return;
      const show=text=>{
        if(!caption)return;
        clearTimeout(captionTimer);caption.hidden=false;caption.textContent=owner.name+' · “'+text+'”';
        captionTimer=setTimeout(()=>{caption.hidden=true;},2900);
      };
      show(line.say);
      if(!audible())return;
      const level=fade*placement(listener,yaw,mouth).gain;
      ownerLine.say(line,settings.volume*level,()=>{
        if(!audible() || !buffers.has('crowd-reactions'))return;
        show(line.fallback);
        burst('crowd-reactions',mouth,listener,yaw,1.28*fade,tick,line.clip);
      });
    });
    if(context && context.currentTime>=nextEnvironment){
      nextEnvironment=context.currentTime+.2;
      const {bed,water}=ambientScene(world.map==='brickell',listener,light,listenerSpace);
      const beachRange=world.map==='brickell'?Math.hypot(listener.x-beachDJ.x,listener.y-beachDJ.y,listener.z-beachDJ.z):Infinity;
      const inEarshot=world.map==='brickell' && Math.hypot(listener.x-clubSpeaker.x,listener.z-clubSpeaker.z)<19;
      let party=null,partyRange=36;
      for(const b of world.boats??[]){
        if(!b.partyYacht || b.wrecked)continue;
        const range=Math.hypot(listener.x-b.x,listener.y-b.y-2,listener.z-b.z);
        if(range<partyRange){party=b;partyRange=range;}
      }
      if(audible()){
        if(beachRange<32 || inEarshot)loadMusic('scoopin-dung','scoopin-dung.mp3');
        if(party)loadMusic('lucero','lucero-trio.ogg');
      }
      const songReady=buffers.has('scoopin-dung');
      motor('scoopin-dung',beachDJ,beachRange<32 && songReady,1,.72*Math.max(0,1-beachRange/32),listener,yaw,'beach-dj');
      motor('lucero',party,!!party && buffers.has('lucero'),1,.55*(1-partyRange/36),listener,yaw,'yacht-party-music');
      motor('scoopin-dung',clubSpeaker,inEarshot && songReady,1,.56,listener,yaw,'club-speakers');
      const bankAlarm=world.bank?.phase==='alarm' || world.bank?.phase==='handoff';
      const nearBank=bankAlarm && Math.hypot(listener.x-bankDesk.x,listener.y-bankDesk.y,listener.z-bankDesk.z)<45;
      motor('branch-alarm',bankDesk,nearBank,1,.84,listener,yaw);
      const local=new Set();
      for(const layer of [bed,water]){
        if(!layer || layer.gain<.009)continue;
        const key='amb/'+layer.name;local.add(key);
        motor(key,layer.point,true,1,layer.gain,listener,yaw);
      }
      for(const key of loops.keys())if(key.startsWith('amb/') && !local.has(key))stopMotor(key);
    }
    const impact=s=>burst('marine-impact',{x:s.hitX,y:s.hitY,z:s.hitZ},listener,yaw,.88,s.hitSeq);
    marineBlastCalls(previousDolphins,world.dolphins,impact);
    marineBlastCalls(priorSharks,world.sharks,impact);
    marineBlastCalls(priorManatees,world.manatees,impact);
    priorSharks=world.sharks;priorManatees=world.manatees;
    fatalBiteCalls(previousSharkDefeats,world.sharkDefeats,world.simTick,listener,
      event=>{
        const variant=event.tick+event.sharkIndex;
        burst('shark-defeat',event,listener,yaw,.86,variant);
        burst('shark-strike-water',event,listener,yaw,.51,variant);
      });
    previousSharkDefeats=world.sharkDefeats;
    dolphinCalls(previousDolphins,world.dolphins,listener,(kind,point,gain,id)=>
      burst('dolphin/'+kind,point,listener,yaw,gain,id));
    previousDolphins=world.dolphins;
    if(reflection)reflection.gain.setTargetAtTime(listenerSpace.reflection,context.currentTime,.11);
    for(const e of world.doors?.glassSounds??[])if(e.seq>lastGlass)burst('glass',e,listener,yaw,.95,e.seq);
    lastGlass=world.doors?.glassSeq??0;
    collapse.step(world.doors?.structureFalls??[],cue=>{
      if(voices.size>=24)return;
      burst(cue.settling?'settling':'masonry',cue,listener,yaw,cue.settling?.67:1.12,Math.round(cue.at*100));
    });
    let nearest,range=34;
    for(const f of Object.values(world.doors?.fires??{})){
      if(f.stage!=='burning')continue;
      const distance=Math.hypot(listener.x-f.x,listener.y-f.y,listener.z-f.z);
      if(distance<range){nearest=f;range=distance;}
    }
    motor('district-fire',nearest,!!nearest,1,.73,listener,yaw);
    civilianVoices.step(world.npcs,world.simTick,listener,(cue,mouth,gain,id)=>{
      if(buffers.has('crowd-reactions'))burst('crowd-reactions',mouth,listener,yaw,gain,id,cue);
    });
    const impacts=[];
    for(const shot of shots) {
      if(shot.hit)impacts.push(shot);
      if(shot.weapon==='molotov')burst(shot.water?'water-pop':'ember-wash',shot.to,listener,yaw,.55,shot.id);
      else if(shot.weapon==='ember'){
        if(audible())flameEmitters.set(shot.shooter,{point:shot.from,until:context.currentTime+.32});
      }
      else if(shot.weapon==='vehicleWreck')burst('wreck',shot.to,listener,yaw,1.3,shot.id);
      else if(shot.weapon==='muzzle' && !(world.map==='brickell' && shot.source==='heli'))burst((shot.firedWeapon==='turret' || shot.firedWeapon==='yachtGun') ? 'turret' : shot.firedWeapon===2 ? 'sidearm' : 'carbine',shot.from,listener,yaw,.9,shot.id);
      else if(shot.weapon==='launch')burst('launch',shot.from,listener,yaw,.93,shot.id);
      else if(shot.weapon==='missile')burst('explosion',shot.to,listener,yaw,1.2);
      else if(shot.hit && shot.injury!=='headPop')burst(['rover','heli','metal'].includes(shot.hitKind) ? 'metal' : 'impact',shot.to,listener,yaw,.45);
      if(shot.injury==='headPop')burst('headPop',shot.injuryPoint ?? shot.to,listener,yaw,.84,shot.id);
    }
    for(const [id,emitter] of flameEmitters){
      const active=audible() && context.currentTime<emitter.until;
      motor('projector-roar',emitter.point,active,1,.77,listener,yaw,'projector-'+id);
      if(!active)flameEmitters.delete(id);
    }
    const nextVehicles={};
    for(const [kind,vehicle] of roadAndAirVehicles(world)) {
      const prior=previousVehicles[kind],bump=vehicle.contactSound,landing=vehicle.landingSound;
      const cue=kind!=='heli' && doorCue(prior,vehicle);
      if(cue)burst(cue,roadHandle(vehicle,vehicle.takeover?.progress??vehicle.boarding?.progress??0),listener,yaw,cue==='door-close'?.61:.39);
      if(prior && landing && landing.id!==prior.landingSound?.id){
        burst(landing.speed>=5?'landing-hard':'landing-soft',landing,listener,yaw,Math.min(1.35,.28+.10*landing.speed),landing.id);
      }
      if(prior && vehicle.horn && prior.horn?.id!==vehicle.horn.id)burst('horn',vehicle.horn,listener,yaw,.94,vehicle.horn.id);
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
      nextVehicles[kind]=vehicle;
    }
    previousVehicles=nextVehicles;
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
    if(track && name==='rotor' && track.source.buffer!==buffers.get(name)){
      stopMotor(key);track=null;
    }
    if(!track) {
      track=voice(name,true);
      track.gain.gain.value=0;
      const clubMusic=key==='beach-dj' || key==='club-speakers';
      const offset=clubMusic ? Math.random()*track.source.buffer.duration : 0;
      track.source.start(0,offset);
      loops.set(key,track);
    }
    const now=context.currentTime,place=placement(listener,yaw,v);
    track.source.playbackRate.setTargetAtTime(rate,now,.13);
    track.gain.gain.setTargetAtTime(volume*place.gain*passage(track,v),now,.08);
    track.pan.pan.setTargetAtTime(place.pan,now,.05);
  }
  function engines(listener,yaw,heli,rover,boats=[],chainFiring=false,supercar=null) {
    motor('chainGun',heli,chainFiring,1,.94,listener,yaw);
    motor('engine',rover,rover.driver!=null && !rover.wrecked,.8+Math.min(2.1,Math.abs(rover.speed)*.13),.28,listener,yaw);
    if(supercar)motor('engine',supercar,supercar.driver!=null && !supercar.wrecked,1.12+Math.abs(supercar.speed)*.064,.27,listener,yaw,'vesper-engine');
    const airspeed=Math.hypot(heli.vx??0,heli.vz??0);
    const drive=(heli.pilot!=null || heli.abandonedFor!=null) && !heli.wrecked;
    const near=Math.hypot(heli.x-listener.x,heli.y-listener.y,heli.z-listener.z)<180;
    motor('rotor',heli,drive && near,heli.grounded?.88:1+Math.min(.085,airspeed*.002),heli.grounded?.41:.61,listener,yaw);
    const present=new Set();
    for(const boat of boats) {
      if((boat.driver==null && !boat.cruising) || boat.wrecked)continue;
      if(boat.cruising && Math.hypot(boat.x-listener.x,boat.z-listener.z)>45)continue;
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
      if(car.model==='engine' && car.water){
        const jetKey=key+'/water',end=car.water;
        const charged=Math.min(1,Math.max(0,((environmentWorld?.simTick??end.since)-end.since)/11));
        sounding.add(jetKey);
        motor('wake',car,true,1.6+.85*charged,.23+.26*charged,listener,yaw,jetKey);
        if(end.ny!=null){
          const splashKey=key+'/splash';sounding.add(splashKey);
          motor('wake',end,true,.90,.26,listener,yaw,splashKey);
        }
      }
    }
    for(const key of loops.keys())if(key.startsWith('traffic/') && !sounding.has(key))stopMotor(key);
  }
  function roadTires(listener,yaw,cars){
    const active=new Set();
    for(const car of cars){
      if(!car || !audible() || Math.hypot(car.x-listener.x,car.y-listener.y,car.z-listener.z)>32)continue;
      const mix=tireMix(car);
      if(!mix)continue;
      const key='tread/'+(car.id??car.kind??'rover')+'/';
      active.add(key+mix.surface);
      motor('tread/'+mix.surface,car,true,mix.rate,mix.volume,listener,yaw,key+mix.surface);
      if(mix.flat){
        active.add(key+'flat');
        motor('tread/flat',car,true,mix.rate,mix.volume*(1+.18*mix.flat),listener,yaw,key+'flat');
      }
    }
    for(const key of loops.keys())if(key.startsWith('tread/') && !active.has(key))stopMotor(key);
  }
  let lastJetRange=null,lastPatrol=null;
  function patrolSiren(listener,yaw,cars=[],dt=1/60){
    let nearest,range=120;
    for(const car of cars){
      if(!signalingCruiser(car))continue;
      const d=Math.hypot(car.x-listener.x,car.y-listener.y,car.z-listener.z);
      if(d<range){range=d;nearest=car;}
    }
    const closing=nearest && lastPatrol?.id===nearest.id?(lastPatrol.range-range)/Math.max(.001,dt):0;
    const rate=1+Math.max(-.085,Math.min(.085,closing/310));
    lastPatrol=nearest?{id:nearest.id,range}:null;
    motor('patrol-siren',nearest,!!nearest,rate,.68,listener,yaw);
  }
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
  return {unlock,reset,events,engines,trafficEngines,patrolSiren,roadTires,jetEngine,yachtEngine,toggleMute};
}
