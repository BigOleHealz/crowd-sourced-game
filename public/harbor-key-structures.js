import {paneKey} from './pane-damage.js';
import {sandHeight} from './beach-layout.js';

// Keep the original footprints and sequence. Their ground floors still hold the
// existing tenants and gallery entrances.
export const harborHouses = [
  {x:-28,z:-240,w:13,d:19,eave:6.68,rise:2.25, siding:0x84a8ac, trim:0xece2ce, roof:0x526e72, shutters:0x355d61, finish:'clapboard'},
  {x:-36,z:-184,w:15,d:18,eave:8.17,rise:1.48, siding:0xe3d3b2, trim:0xf4e8d2, roof:0x827368, shutters:0x756451, finish:'stucco'},
  {x:19,z:-246,w:10,d:17,eave:6.82,rise:2.75, siding:0xc9907c, trim:0xf3e1cb, roof:0x77716b, shutters:0x436862, finish:'batten'},
  {x:18,z:-177,w:12,d:15,eave:8.34,rise:2.03, siding:0xb2bda1, trim:0xf0e9d7, roof:0x576565, shutters:0x546955, finish:'clapboard'},
];

export function harborUpperWindows(house,podiumTop=4.7){
  const {x,z,w,d,base,eave,rise,finish}=house,top=base+eave,height=top-podiumTop;
  const windows=[];
  function add(tint,axis,side,across,y,width,h,withShutters=true){
    const px=x+(axis==='x'?side*(w/2+.071):across),pz=z+(axis==='z'?side*(d/2+.071):across);
    windows.push({x:px,z:pz,id:paneKey(px,y,pz),bottom:y-h/2,top:y+h/2,width,
      yaw:axis==='x'?Math.PI/2:0,at:{x:px,y:y-h/2,z:pz},axis,side,across,y,h,tint,withShutters});
  }
  const glaze=finish==='stucco' ? 0x5d6765 : 0x556d70;
  const rows=height>3.85 ? 2 : 1,spacing=height/rows;
  for(let row=0;row<rows;row++){
    const y=podiumTop+(row+.52)*spacing,h=Math.min(1.12,spacing*.52);
    for(const side of [-1,1]){
      for(const end of [-1,1]){
        add(glaze,'x',side,end*d*.29,y,1.20,h);
        add(glaze,'z',side,end*w*.27,y,1.16,h);
      }
      if(finish!=='batten')add(0x627678,'x',side,0,y,1.60,h,false);
    }
  }
  for(const side of [-1,1])add(0x606866,'x',side,0,top+rise*.34,finish==='batten'?.66:1.02,.58,false);
  return windows;
}

const hut = {x:49,z:-210,w:6.1,d:4.7};
const deckY = Math.max(...[-1,1].flatMap(side => [-1,1].map(end =>
  sandHeight(hut.x + side*hut.w/2, hut.z + end*hut.d/2)))) + .07;
const canopyY = deckY + 2.57;

export const beachHut = {
  ...hut, deckY,
  canopy: {x:hut.x,z:hut.z,w:6.44,d:5.06,bottom:canopyY,top:canopyY+.17},
  posts: [-1,1].flatMap(side=>[-1,1].map(end=>({
    x:hut.x+side*2.61,z:hut.z+end*1.96,w:.18,d:.18,top:canopyY,
  }))),
  benches: [-1,1].map(side=>({x:hut.x,z:hut.z+side*1.74,w:3.50,d:.50,top:deckY+.48})),
};

function sandBarrier({x,z,w,d,top,bottom}) {
  const base=sandHeight(x,z);
  return {x,z,w,d,h:top-base,...(bottom===undefined?{}:{bottom:bottom-base})};
}

export const coastalStructureBarriers = [
  sandBarrier(beachHut.canopy), ...beachHut.posts.map(sandBarrier), ...beachHut.benches.map(sandBarrier),
];

export function beachHutFloor(x,z,floor) {
  const h=beachHut;
  return Math.abs(x-h.x)<=h.w/2 && Math.abs(z-h.z)<=h.d/2 ? h.deckY : floor;
}
