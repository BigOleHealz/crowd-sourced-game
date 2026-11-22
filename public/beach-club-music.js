import {beachTempo} from './beach-club.js';

// Four bars of original house music. Render once at instrument bandwidth and
// let the district audio mixer handle distance, occlusion and master volume.
export function beachClubLoop(context){
  const rate=16000,beat=60/beachTempo,tau=2*Math.PI;
  const buffer=context.createBuffer(1,Math.round(rate*beat*16),rate);
  const samples=buffer.getChannelData(0),bass=[55,43.65,65.41,49],third=[1.189,1.26,1.26,1.189];
  let seed=19,previous=0;
  for(let i=0;i<samples.length;i++){
    const t=i/rate,b=t/beat,bar=Math.floor(b/4)%4,quarter=(b%1)*beat,eighth=(b%.5)*beat;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1,high=noise-previous;previous=noise;
    const kick=.46*Math.sin(tau*(50*quarter+2*(1-Math.exp(-quarter*42))))*Math.exp(-quarter*18);
    const clap=Math.floor(b)%2?.15*high*Math.exp(-quarter*28):0;
    const hat=(b%1>.5?.09:.038)*high*Math.exp(-eighth*65);
    const pulse=(b+.5)%1*beat,hz=bass[bar],phase=tau*hz*pulse;
    const sub=.26*Math.sin(phase)*Math.exp(-pulse*9)*Math.min(1,pulse*140);
    const keys=(Math.sin(phase*4)+Math.sin(phase*4*third[bar])+Math.sin(phase*6))*.052*Math.exp(-pulse*12)*Math.min(1,pulse*90);
    samples[i]=(kick+sub+clap+hat+keys)*Math.min(1,i/60,(samples.length-1-i)/60);
  }
  return buffer;
}
