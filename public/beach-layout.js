export const beachIsland={west:-61,east:38,north:-280,south:-152};
export const beach={west:beachIsland.east,east:76,north:beachIsland.north,south:beachIsland.south};
export const beachTerrain={west:beachIsland.west-13,east:beach.east+12,
  north:beachIsland.north-12,south:beachIsland.south+12};
export const courts=[{x:45,z:-191},{x:45,z:-239}];
export const stations=[{x:53,z:-176,number:'01'},{x:54,z:-223,number:'02'}];
// Canopy profiles in local (east, height) coordinates. Each panel and its clearance
// use the same section, including the lifted seaward lip and the butterfly eaves.
export const rescueCanopies={
  '01':[[-1.62,3.42],[-1.10,3.47],[-.42,3.51],[.25,3.57],[.85,3.70],[1.24,3.88],[1.47,4.08]],
  '02':[[-1.62,3.84],[-.42,3.36],[-.16,3.36],[1.47,4.04]],
};
export function canopyHeight(number,dx) {
  const profile=rescueCanopies[number];
  const i=profile.findIndex(([x],i)=>i>0 && x>=dx);
  const [ax,ay]=profile[i-1], [bx,by]=profile[i];
  return ay+(by-ay)*(dx-ax)/(bx-ax);
}
export const shadeSpots=[
  {x:49,z:-164,color:0xdd675a}, {x:52,z:-198,color:0x249b99},
  {x:53,z:-235,color:0xdf9272}, {x:48,z:-272,color:0x248da1},
];
export const onBeach=(x,z)=>x>=beach.west && x<=beach.east && z>=beach.north && z<=beach.south;
// The two bridge openings retain their surveyed underwater channels.
export const onBeachTerrain=(x,z)=>x>=beachTerrain.west && x<=beachTerrain.east &&
  z>=beachTerrain.north && z<=beachTerrain.south &&
  (x<beachIsland.west || x>=beachIsland.east || z<beachIsland.north || z>=beachIsland.south) &&
  !((z>=beachIsland.south || z<beachIsland.north) && x>=-10.4 && x<10.4);
export const onRockShore=(x,z)=>x<beachIsland.east && onBeachTerrain(x,z);
export const onSandShore=(x,z)=>x>=beachIsland.east && onBeachTerrain(x,z);
export function sandHeight(x,z) {
  const swash=62+1.75*Math.sin(z*.112)+.8*Math.sin(z*.215);
  const dry=.80+.16*Math.sin((x-38)*.29)*Math.sin((z+154)*.13);
  return Math.max(-2.8,Math.min(dry,.78-.16*(x-swash+5.75)));
}
export const lookoutSteps=Array.from({length:6},(_,i)=>({x:-2.53+i*.27,h:.20+i*.22}));
// Use the same six tread tops for foot placement and the rendered stair.
export function lookoutFloor(x,z,sand,doors) {
  if(!onBeach(x,z)) return sand;
  for(const station of stations) {
    if(doors?.beachWood?.[station.number])continue;
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
  ...courts.flatMap(({x,z},net)=>[
    {x,z,w:8.56,d:.11,h:2.40,net,netting:true},
    ...[-1,1].map(side=>({x:x+side*4.37,z,w:.112,d:.112,h:2.58,net})),
  ]),
  ...shadeSpots.flatMap(({x,z},i)=>[
    {x,z,w:.08,d:.08,h:2.12,woodId:'parasol-'+i},
    {x,z,w:2.44,d:2.44,bottom:1.99,h:2.56,woodId:'parasol-'+i},
    ...[-1,1].map(side=>({x:x+.85,z:z+side*.86,w:1.80,d:.58,h:.56,woodId:'lounger-'+i+'-'+side})),
  ]),
  ...stations.flatMap(({x,z,number})=>[
    ...rescueCanopies[number].slice(1).map(([bx,by],i)=>{
      const [ax,ay]=rescueCanopies[number][i];
      return {x:x+(ax+bx)/2,z,w:bx-ax,d:3.10,bottom:Math.min(ay,by)-.07,h:Math.max(ay,by)+.08};
    }),
    ...[-1,1].map(side=>({x:x-.12,z:z+side*1.12,w:1.73,d:.10,h:2.20})),
    ...[-1,1].flatMap(side=>[-.94,.69].map(dx=>({x:x+dx,z:z+side*1.12,w:.105,d:.105,h:3.40}))),
    {x:x+1.39,z,w:.075,d:2.59,h:2.38},
    {x:x-.10,z,w:.48,d:.60,h:2.40},
    {x:x-.94,z:z-.73,w:.08,d:.76,h:2.16},
    ...[-1,1].map(side=>({x:x+1.08,z:z+side*1.26,w:.72,d:.075,h:2.38})),
  ].map(rect=>({...rect,woodId:number}))),
];
