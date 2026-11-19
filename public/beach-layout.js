export const beach={west:38,east:76,north:-280,south:-152};
export const courts=[{x:45,z:-191},{x:45,z:-239}];
export const stations=[{x:53,z:-176,number:'01'},{x:54,z:-223,number:'02'}];
export const onBeach=(x,z)=>x>=beach.west && x<=beach.east && z>=beach.north && z<=beach.south;
export function sandHeight(x,z) {
  const swash=62+1.75*Math.sin(z*.112)+.8*Math.sin(z*.215);
  const dry=.80+.16*Math.sin((x-38)*.29)*Math.sin((z+154)*.13);
  return Math.max(-2.8,Math.min(dry,.78-.16*(x-swash+5.75)));
}
export const beachBarriers=[
  ...courts.flatMap(({x,z})=>[{x,z,w:8.5,d:.11,h:2.43}]),
  ...stations.map(({x,z})=>({x,z,w:2.76,d:3.00,h:3.94})),
];
