import {quaySegments} from './quay-masonry.js';
import {beach,sandHeight} from './beach-layout.js';

const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
let quayEdges;
function waterline(listener){
  const {x,z}=listener;
  let nearest=null,range=26;
  function consider(px,pz){
    const d=Math.hypot(x-px,z-pz);
    if(d<range){range=d;nearest={x:px,z:pz,y:-.14};}
  }
  for(const {alongX,cross,start,end} of quayEdges??=quaySegments()){
    const along=clamp(alongX?x:z,start,end);
    consider(alongX?along:cross,alongX?cross:along);
  }
  if(z>=beach.north-16 && z<=beach.south+16){
    const bz=clamp(z,beach.north,beach.south);
    // Past the flat dry beach the surveyed grade falls .16 m per metre.
    const bx=66+(sandHeight(66,bz)+.14)/.16;
    consider(bx,bz);
  }
  return nearest;
}

export function ambientScene(city,listener,light,room){
  const high=Math.max(0,listener.y-(city?3:15));
  const shelter=room?.id ? .12+.64*room.opening : 1;
  const far=1/(1+(high/23)**2),submerged=listener.swimming ? .72 : 1;
  const floor=city?'neighborhood':light==='night'?'night-woods':'pine-wind';
  const bed={name:floor,point:listener,gain:(city?.105:.16)*shelter*far*submerged};
  const x=clamp(listener.x,-36,36);
  const source=city?waterline(listener):{x,z:.7*Math.sin(x*.15),y:-1.2};
  if(!source)return {bed};
  const d=Math.hypot(source.x-listener.x,source.y-listener.y,source.z-listener.z);
  const range=city?24:18;
  const gain=(city?.31:.34)*shelter*submerged*Math.max(0,1-d/range)**1.4;
  return {bed,water:gain>.009?{name:city?'tidal-lap':'stream',point:source,gain}:null};
}

// Slowly changing air and water share the existing gain, direction and room
// filters. Loop at the same value and slope by crossfading the warm-up tail.
export function ambientBuffer(context,kind){
  const rate=16000,length=kind==='tidal-lap'?8:6,frames=length*rate,overlap=rate>>1;
  const buffer=context.createBuffer(1,frames,rate),out=buffer.getChannelData(0);
  const raw=new Float32Array(frames+overlap);
  let seed=13679,air=0,middle=0,rumble=0,prior=0;
  for(let i=0;i<raw.length;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const white=seed/2147483648-1,t=i/rate,a=t*2*Math.PI/length;
    air+=.026*(white-air);middle+=.23*(white-middle);rumble+=.0045*(white-rumble);
    let sound;
    if(kind==='stream'){
      const wash=.69+.18*Math.sin(a*2+.3)+.10*Math.cos(5*a);
      const ripple=(Math.max(0,Math.sin(23*a+1.2*Math.sin(a*9))))**6;
      sound=wash*(1.16*middle+air)+.09*ripple*Math.sin(2*Math.PI*720*t+2.3*Math.sin(a*71));
    }else if(kind==='tidal-lap'){
      const pulse=(.5+.5*Math.cos(3*a+.65*Math.sin(2*a)))**3;
      const retreat=(.5+.5*Math.cos(3*a-1.3+.65*Math.sin(2*a)))**5;
      sound=(.26+.94*pulse)*2.15*air+(.08+.79*retreat)*(middle-air);
    }else if(kind==='neighborhood'){
      const pass=(.5+.5*Math.sin(a+.70*Math.sin(2*a)))**3;
      sound=3.3*rumble+(.53+pass*1.3)*air+.055*pass*Math.sin(2*Math.PI*61*t+.8*Math.sin(a));
    }else{
      const breeze=.6+.23*Math.sin(a*2-.8)+.12*Math.sin(a*5);
      sound=breeze*(air*2.15+.48*(middle-air));
      if(kind==='night-woods'){
        const chorus=(.55+.45*Math.sin(2*a+1))*Math.max(0,Math.sin(a*238))**3;
        sound+=.15*chorus*(Math.sin(2*Math.PI*2810*t)+.28*Math.sin(2*Math.PI*3890*t+.7));
      }
    }
    prior+=.82*(sound-prior);raw[i]=prior;
  }
  for(let i=0;i<frames;i++){
    const mix=Math.min(1,i/overlap);
    out[i]=i<overlap ? raw[i]*mix+raw[i+frames]*(1-mix) : raw[i];
  }
  return buffer;
}
