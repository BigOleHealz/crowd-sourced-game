import {identifyPane} from './pane-damage.js';
import {casaRails} from './casa-luma.js';
import {clubSalon} from './lantern-buildings-layout.js';

const base=.8;
const pane=(x,z,w,d,bottom,h)=>identifyPane({x,z,w,d,bottom,h},base);

export function terracePanes(x,y,z,span,alongX){
  const n=Math.ceil(span/1.48),bay=span/n;
  return Array.from({length:n},(_,i)=>{
    const u=(i+.5)*bay-span/2;
    return pane(x+(alongX?u:0),z+(alongX?0:u),alongX?bay-.027:.045,alongX?.045:bay-.027,y+.05,y+.95);
  });
}
const palazzoRail={x:33.1,z:-439.85,w:5.4,d:.05,bottom:7.91,h:8.89};
export const estateRailBarriers=[...casaRails,palazzoRail].flatMap(r=>[
  {...r,bottom:r.h-.052},...terracePanes(r.x,r.bottom,r.z,Math.max(r.w,r.d),r.w>r.d),
]);
export const skylights=[-37,-31.2].map(x=>pane(x,-406,2.22,3.48,7.66,7.70));
export const clubPanes=[];
for(const side of [-1,1])for(const alongX of [true,false]){
  const {x,z,w,d}=clubSalon;
  const span=alongX?w:d,offset=(alongX?d:w)*side/2,n=Math.ceil(span/2.5),bay=span/n;
  for(let i=0;i<n;i++){
    const u=(i+.5)*bay-span/2;
    if(alongX && side===1 && i===5)continue;
    clubPanes.push({...pane(x+(alongX?u:offset),z+(alongX?offset:u),
      alongX?bay-.06:.065,alongX?.065:bay-.06,.18,3.81),alongX,side,bay,index:i});
  }
}
const {x,z,w,d}=clubSalon;
export const clubBarriers=[...clubPanes,{x:x-8.5,z,w:3.15,d:.75,bottom:.22,h:1.15},
  ...[-5,0,5].flatMap(u=>[{x:x+u,z:z-2.9,w:2.22,d:.82,h:1.27},{x:x+u,z:z-1.65,w:1.13,d:.58,h:.84}]),
  // Rounded table perimeter steps inward toward the player along the brass rail.
  {x:33.5,z:-394.71,w:2.96,d:.50,bottom:.80,h:1.22},
  {x:33.5,z:-394.29,w:2.62,d:.36,bottom:.80,h:1.22},
  {x:33.5,z:-393.99,w:1.84,d:.25,bottom:.80,h:1.22},
  {x:33.5,z:-399.63,w:5.20,d:.11,bottom:.37,h:3.19},
  {x,z,w:w+.30,d:d+.30,bottom:3.74,h:3.99}];
export const estateGlassBarriers=[...estateRailBarriers,...skylights,...clubBarriers];
