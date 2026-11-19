export const beach={west:38,east:76,north:-280,south:-152};
export const courts=[{x:45,z:-191},{x:45,z:-239}];
export const stations=[{x:53,z:-176,number:'01'},{x:54,z:-223,number:'02'}];
export const onBeach=(x,z)=>x>=beach.west && x<=beach.east && z>=beach.north && z<=beach.south;
export function sandHeight(x,z) {
  const swash=62+1.75*Math.sin(z*.112)+.8*Math.sin(z*.215);
  const dry=.80+.16*Math.sin((x-38)*.29)*Math.sin((z+154)*.13);
  return Math.max(-2.8,Math.min(dry,.78-.16*(x-swash+5.75)));
}
export const lookoutSteps=Array.from({length:6},(_,i)=>({x:-2.53+i*.27,h:.20+i*.22}));
// Use the same six tread tops for foot placement and the rendered stair.
export function lookoutFloor(x,z,sand) {
  if(!onBeach(x,z)) return sand;
  for(const station of stations) {
    const dx=x-station.x,dz=Math.abs(z-station.z);
    if(dz>1.34 || dx< -2.676 || dx>1.48) continue;
    const height=sandHeight(station.x,station.z);
    if(dx>=-1.07) return height+1.44;
    if(dz<=.47) {
      const tread=lookoutSteps.findLast(step=>Math.abs(dx-step.x)<=.146);
      if(tread) return height+tread.h;
    }
  }
  return sand;
}
export const beachBarriers=[
  ...courts.flatMap(({x,z})=>[
    {x,z,w:8.56,d:.11,h:2.40},
    ...[-1,1].map(side=>({x:x+side*4.37,z,w:.112,d:.112,h:2.58})),
  ]),
  ...stations.flatMap(({x,z})=>[
    {x:x-.11,z,w:2.99,d:3.10,bottom:3.31,h:3.65},
    ...[-1,1].map(side=>({x:x-.12,z:z+side*1.12,w:1.73,d:.10,h:2.20})),
    ...[-1,1].flatMap(side=>[-.94,.69].map(dx=>({x:x+dx,z:z+side*1.12,w:.105,d:.105,h:3.40}))),
    {x:x+1.39,z,w:.075,d:2.59,h:2.38},
    {x:x-.10,z,w:.48,d:.60,h:2.40},
    {x:x-.94,z:z-.73,w:.08,d:.76,h:2.16},
    ...[-1,1].map(side=>({x:x+1.08,z:z+side*1.26,w:.72,d:.075,h:2.38})),
  ]),
];
