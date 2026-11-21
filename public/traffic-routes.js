// The center of each traffic lane is in map metres. Round each survey corner
// with a tangent quadratic and tabulate arc length once for constant road speed.
function circuit(points,trim) {
  const samples=[];
  let length=0;
  function add(x,z,yaw) {
    const last=samples.at(-1);
    if(last)length+=Math.hypot(x-last.x,z-last.z);
    samples.push({x,z,yaw,at:length});
  }
  for(let i=0;i<points.length;i++){
    const [x,z]=points[i],[ax,az]=points[(i+points.length-1)%points.length],[bx,bz]=points[(i+1)%points.length];
    const before=Math.hypot(x-ax,z-az),after=Math.hypot(bx-x,bz-z);
    const cut=Math.min(trim,.42*before,.42*after);
    const ux=(x-ax)/before,uz=(z-az)/before,vx=(bx-x)/after,vz=(bz-z)/after;
    for(let n=0;n<=12;n++){
      const t=n/12,q=1-t;
      add(x+cut*(vx*t*t-ux*q*q),z+cut*(vz*t*t-uz*q*q),Math.atan2(q*ux+t*vx,-q*uz-t*vz));
    }
  }
  add(samples[0].x,samples[0].z,samples[0].yaw);
  return {length,pose(distance){
    const d=distance%length;
    let lo=0,hi=samples.length-1;
    while(hi-lo>1){const mid=(lo+hi)>>1;if(samples[mid].at<=d)lo=mid;else hi=mid;}
    const a=samples[lo],b=samples[hi],t=(d-a.at)/(b.at-a.at);
    return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,
      yaw:a.yaw+t*Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw))};
  }};
}

const shops=circuit([[4.18,59],[4.18,-7],[29.45,-7],[29.45,59]],3);
// Both causeways carry one lane in each direction. The long run turns
// around on the yacht-club block, then loops through western Brickell.
const interisland=circuit([[2.15,-43.15],[2.15,-417.15],[46.95,-417.15],[46.95,-371.85],
  [-2.15,-371.85],[-2.15,-10.85],[-35.95,-10.85],[-35.95,-43.15]],3.1);
const harbor=circuit([[-46.9,-207.1],[-46.9,-259.9],[29.9,-259.9],[29.9,-207.1]],3);
const marina=circuit([[-46.9,-421.1],[-46.9,-463.9],[-2.1,-463.9],[-2.1,-421.1]],3);
// The ford shuttle turns on the gravel landing at the water's edge.
const fordLane=[[14.5,3.65],[14.35,1.4],[14.6,-4.4],[11,-9],[7,-13],[9.6,-16.7],
  [14.5,-12],[17,-6],[17.7,-3],[18,2.8],[17.8,3.8],[15.6,3.95]];
const depotLane=[[-21,10.2],[-19,8.4],[-10.5,8.5],[-7.4,10.8],[-7.2,18.4],[-10,20.6],[-18.5,20.6],[-20.6,18]];
export const serviceTracks=[fordLane,depotLane].map(points=>[...points,points[0]]);
const creek=circuit(fordLane,1.55),depot=circuit(depotLane,1.65);
const ridge=circuit([[0,-39],[5,-47],[12,-55],[16,-65],[13,-74],[6,-76.2],[3,-76.6],[-4,-76.4],[-13,-69],
  [-16,-58],[-11,-50],[-4,-44]],2.6);

export const cityServices=[
  [shops,.19,'sedan','omar',[35.7,2]], [shops,.52,'hatchback','maia',[35.7,10]],
  [shops,.85,'van','diego',[35.7,18]],
  [interisland,.07,'sedan','ines',[-39.5,-28]], [interisland,.62,'hatchback','rafi',[3.9,-239]],
  [harbor,.60,'van','wes',[30,-245]], [marina,.16,'sedan','amir',[-47,-446]],
];
export const outpostServices=[
  [creek,.76,'hatchback','kit',[13.7,13.4],2.7], [ridge,.22,'van','cedar',[12,-54],3],
  [depot,.31,'sedan','alder',[-19.8,12],2.2],
];
