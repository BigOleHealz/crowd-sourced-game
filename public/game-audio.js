// Each voice is synthesized once per AudioContext and reused for playback.
const shapes={
  carbine:[.24,135,2150,12], sidearm:[.18,175,2800,17], turret:[.30,98,1700,11],
  launch:[.46,112,1300,6], impact:[.13,270,3000,25], metal:[.27,470,3300,16],
  explosion:[1.05,63,790,4.5], wreck:[1.55,47,1050,3.8],
};
function synth(context,name) {
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
  const key='pinewatch.audio.v1';
  let settings={muted:false,volume:.6};
  try {
    const saved=JSON.parse(localStorage.getItem(key));
    if(saved && typeof saved.muted==='boolean' && Number.isFinite(saved.volume))
      settings={muted:saved.muted,volume:Math.max(0,Math.min(1,saved.volume))};
  } catch {}
  let context,master,limiter,lastId=0;
  let previousVehicles={};
  const buffers=new Map(),loops=new Map(),voices=new Set();
  function controls() {
    button.textContent=settings.muted ? 'Unmute' : 'Mute';
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
  button.onclick=()=>{settings.muted=!settings.muted;save();};
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
  function voice(name,loop=false) {
    if(!buffers.has(name))buffers.set(name,synth(context,name));
    const source=context.createBufferSource(),gain=context.createGain(),pan=context.createStereoPanner();
    source.buffer=buffers.get(name);source.loop=loop;
    source.connect(gain);gain.connect(pan);pan.connect(limiter);
    const v={source,gain,pan};voices.add(v);
    source.onended=()=>{voices.delete(v);source.disconnect();gain.disconnect();pan.disconnect();};
    return v;
  }
  const audible=()=>context?.state==='running' && !settings.muted && settings.volume>0 && !document.hidden;
  function burst(name,point,listener,yaw,volume) {
    if(!audible() || !point || voices.size>=32)return;
    const place=placement(listener,yaw,point);
    if(place.gain<.006)return;
    const v=voice(name);v.gain.gain.value=volume*place.gain;v.pan.pan.value=place.pan;
    v.source.start();
  }
  function reset(world) {
    for(const v of voices)v.source.stop();
    voices.clear();loops.clear();
    lastId=world?.shots.at(-1)?.id ?? 0;
    previousVehicles=world ? {rover:world.rover,heli:world.heli} : {};
  }
  function events(world,listener,yaw) {
    const impacts=[];
    for(const shot of world.shots) {
      if(shot.id<=lastId)continue;
      lastId=shot.id;
      if(shot.hit)impacts.push(shot);
      if(shot.weapon==='muzzle')burst(shot.firedWeapon==='turret' ? 'turret' : shot.firedWeapon===2 ? 'sidearm' : 'carbine',shot.from,listener,yaw,.75);
      else if(shot.weapon==='launch')burst('launch',shot.from,listener,yaw,.8);
      else if(shot.weapon==='missile')burst('explosion',shot.to,listener,yaw,1.2);
      else if(shot.hit)burst(['rover','heli','metal'].includes(shot.hitKind) ? 'metal' : 'impact',shot.to,listener,yaw,.45);
    }
    for(const kind of ['rover','heli']) {
      const vehicle=world[kind],prior=previousVehicles[kind];
      if(prior && vehicle.wrecked && !prior.wrecked)burst('wreck',vehicle,listener,yaw,1.3);
      else if(prior && vehicle.hp<prior.hp && !impacts.some(hit=>hit.hitKind===kind ||
        (hit.weapon==='missile' && Math.hypot(vehicle.x-hit.to.x,vehicle.y-hit.to.y,vehicle.z-hit.to.z)<5))) {
        burst('metal',vehicle,listener,yaw,.72);
      }
      previousVehicles[kind]=vehicle;
    }
  }
  function motor(name,v,active,rate,volume,listener,yaw) {
    let track=loops.get(name);
    if(!active || !audible()) {
      if(track) {
        const now=context.currentTime;
        track.gain.gain.setTargetAtTime(0,now,.04);
        track.source.stop(now+.18);loops.delete(name);
      }
      return;
    }
    if(!track) {
      track=voice(name,true);track.gain.gain.value=0;track.source.start();loops.set(name,track);
    }
    const now=context.currentTime,place=placement(listener,yaw,v);
    track.source.playbackRate.setTargetAtTime(rate,now,.13);
    track.gain.gain.setTargetAtTime(volume*place.gain,now,.08);
    track.pan.pan.setTargetAtTime(place.pan,now,.05);
  }
  function engines(listener,yaw,heli,rover) {
    motor('engine',rover,rover.driver!=null && !rover.wrecked,.8+Math.min(2.1,Math.abs(rover.speed)*.13),.28,listener,yaw);
    motor('rotor',heli,(heli.pilot!=null || heli.abandonedFor!=null) && !heli.wrecked,heli.grounded ? .83 : 1.12,.38,listener,yaw);
  }
  return {unlock,reset,events,engines};
}
