// Body length is in metres. The identifiers are shared by schools and fishing.
export const fishSpecies={
  'yellowtail-snapper':{name:'Yellowtail snapper',length:.58,height:.18,width:.106,habitat:'reef'},
  'atlantic-spadefish':{name:'Atlantic spadefish',length:.52,height:.37,width:.103,habitat:'marina'},
  'great-barracuda':{name:'Great barracuda',length:1.20,height:.18,width:.139,habitat:'offshore'},
};

// Keep each oval inside a known stretch of open water, clear of pilings and hulls.
export const fishSchools=[
  {species:'atlantic-spadefish',x:82,z:-426,depth:1.64,rx:3,rz:1.8,count:7},
  {species:'yellowtail-snapper',x:94,z:-411,depth:1.34,rx:3,rz:2,count:9},
  {species:'yellowtail-snapper',x:76,z:-377,depth:1.39,rx:3.5,rz:2.4,count:10},
  {species:'great-barracuda',x:96,z:-369,depth:1.83,rx:5.6,rz:3,count:3},
  {species:'atlantic-spadefish',x:8,z:-317,depth:1.56,rx:4.5,rz:2.4,count:6},
  {species:'yellowtail-snapper',x:-4,z:-315,depth:1.23,rx:3.4,rz:1.8,count:8},
  {species:'great-barracuda',x:89,z:-243,depth:1.71,rx:6.4,rz:3.2,count:3},
  {species:'yellowtail-snapper',x:80,z:-215,depth:1.12,rx:4.0,rz:2.3,count:8},
];

export function fishPose(school,index,seconds,out={}) {
  const phase=index*2.39996+school.z*.13;
  const t=seconds*(school.species==='great-barracuda'?.18:.26)+school.x*.18+index*.14;
  const rx=school.rx*(1+.19*Math.cos(phase)),rz=school.rz*(1+.22*Math.sin(phase));
  out.x=school.x+rx*Math.cos(t)+.36*Math.sin(phase);
  out.z=school.z+rz*Math.sin(t)+.30*Math.cos(phase);
  out.depth=school.depth+.29*Math.sin(phase)+.11*Math.sin(1.9*t+phase);
  out.yaw=Math.atan2(-rx*Math.sin(t),rz*Math.cos(t));
  out.roll=.08*Math.cos(t+phase);
  out.scale=.84+.24*(.5+.5*Math.sin(phase));
  return out;
}
